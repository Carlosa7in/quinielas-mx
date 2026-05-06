"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string | null;
  orden: number;
};

type Jornada = {
  id: string;
  numero: number;
  nombre: string | null;
  liga: string;
  temporada: string;
  partidos: Partido[];
};

type NuevaFecha = {
  partidoId: string;
  equipoLocal: string;
  equipoVisita: string;
  fechaActual: string | null;
  fechaNueva: string | null; // ISO — null si ESPN no encontró el partido
};

interface Props {
  jornada: Jornada;
  fechaCierre: Date;
  onBack: () => void;
  onReabrir: (jornadaActualizada: Jornada) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
function fmtFecha(iso: string | null) {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
  });
}

// datetime-local sin timezone → añadir offset México
function normalizarFechaLocal(fechaLocal: string): string {
  let fh = fechaLocal;
  if (!fh.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(fh)) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fh)) fh += ":00-06:00";
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(fh)) fh += "-06:00";
  }
  return fh;
}

export function RegistroCerrado({ jornada, fechaCierre, onBack, onReabrir }: Props) {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esAdmin = rol === "superadmin" || rol === "admin";

  const [fase, setFase] = useState<"cerrado" | "buscando" | "preview" | "guardando" | "error">("cerrado");
  const [nuevasFechas, setNuevasFechas] = useState<NuevaFecha[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [fechasEditadas, setFechasEditadas] = useState<Record<string, string>>({});

  // Buscar nuevas fechas desde ESPN
  const buscarDesdeEspn = async () => {
    setFase("buscando");
    setErrorMsg("");
    try {
      const hoy = new Date();
      const en3semanas = new Date(hoy.getTime() + 21 * 86_400_000);
      const fmt = (d: Date) =>
        `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
      const desde = fmt(hoy);
      const hasta = fmt(en3semanas);

      // Buscar en la liga de la jornada (o en ligas de los partidos si es Mixta)
      const ligas = jornada.liga === "Mixta"
        ? [...new Set(jornada.partidos.map((p) => {
            // heurística: partido con equipo de Liga MX → "Liga MX", etc.
            return jornada.liga;
          }))]
        : [jornada.liga];

      // Para Mixta necesitamos las ligas reales — usar la jornada.liga directamente por ahora
      const ligaEspn = jornada.liga === "Mixta" ? "Liga MX" : jornada.liga;

      const res = await fetch(
        `/api/espn-partidos?liga=${encodeURIComponent(ligaEspn)}&desde=${desde}&hasta=${hasta}`
      );
      const espnData = await res.json();
      const espnPartidos: { equipoLocal: string; equipoVisita: string; fechaHora: string }[] =
        espnData.partidos ?? [];

      // Cruzar partidos de la jornada con partidos ESPN por equipos
      const nuevas: NuevaFecha[] = jornada.partidos.map((p) => {
        const match = espnPartidos.find(
          (e) =>
            (e.equipoLocal.toLowerCase() === p.equipoLocal.toLowerCase() &&
              e.equipoVisita.toLowerCase() === p.equipoVisita.toLowerCase()) ||
            // Admite coincidencia parcial (nombres cortos)
            (p.equipoLocal.toLowerCase().includes(e.equipoLocal.toLowerCase().split(" ")[0]) &&
              p.equipoVisita.toLowerCase().includes(e.equipoVisita.toLowerCase().split(" ")[0]))
        );
        return {
          partidoId: p.id,
          equipoLocal: p.equipoLocal,
          equipoVisita: p.equipoVisita,
          fechaActual: p.fechaHora,
          fechaNueva: match ? normalizarFechaLocal(match.fechaHora) : null,
        };
      });

      setNuevasFechas(nuevas);
      // Pre-llenar el estado de edición con las fechas encontradas
      const edits: Record<string, string> = {};
      for (const n of nuevas) {
        if (n.fechaNueva) edits[n.partidoId] = n.fechaNueva;
      }
      setFechasEditadas(edits);
      setFase("preview");
    } catch {
      setErrorMsg("No se pudo conectar con ESPN. Intenta de nuevo.");
      setFase("error");
    }
  };

  // Guardar las nuevas fechas
  const confirmarFechas = async () => {
    setFase("guardando");
    const porGuardar = nuevasFechas.filter((n) => fechasEditadas[n.partidoId]);
    try {
      for (const n of porGuardar) {
        const fhStr = normalizarFechaLocal(fechasEditadas[n.partidoId]);
        const fecha = new Date(fhStr);
        if (isNaN(fecha.getTime())) continue;
        await fetch("/api/admin/jornada", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partidoId: n.partidoId, fechaHora: fecha.toISOString() }),
        });
      }
      // Recargar jornada con fechas actualizadas
      const res = await fetch(`/api/jornadas?id=${jornada.id}`);
      const jornadaActualizada = await res.json();
      if (!jornadaActualizada.error) {
        onReabrir(jornadaActualizada);
      } else {
        window.location.reload();
      }
    } catch {
      setErrorMsg("Error al guardar fechas. Verifica tu conexión.");
      setFase("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-5 px-4">
        <div className="max-w-lg mx-auto">
          <button onClick={onBack} className="text-amber-400 text-sm mb-1 inline-block">
            ← Cambiar jornada
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{jornada.nombre ?? `Jornada ${jornada.numero}`}</h1>
              <p className="text-amber-300/70 text-sm">{jornada.liga} · {jornada.temporada}</p>
            </div>
          </div>
          {/* Banner cerrado */}
          <div className="mt-3 bg-red-900/60 border border-red-500/40 rounded-xl px-4 py-2 flex items-center gap-2">
            <span>🔒</span>
            <p className="text-sm font-semibold text-red-200">
              Registro cerrado · cerró el{" "}
              {fechaCierre.toLocaleDateString("es-MX", {
                weekday: "long", day: "numeric", month: "long",
                hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Mensaje principal */}
        {(fase === "cerrado" || fase === "error") && (
          <div className="text-center space-y-4">
            <p className="text-6xl">🔒</p>
            <div>
              <h2 className="text-xl font-bold text-gray-800">El registro está cerrado</h2>
              <p className="text-gray-500 text-sm mt-1">
                No es posible registrar ni modificar quinielas para esta jornada.
              </p>
            </div>

            {fase === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{errorMsg}</p>
              </div>
            )}

            {esAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left space-y-3">
                <p className="font-bold text-amber-800">⚙️ Opciones de administrador</p>
                <p className="text-sm text-amber-700">
                  Si los partidos fueron pospuestos, puedes actualizar las fechas desde ESPN.
                  El registro se reabre automáticamente.
                </p>
                <button
                  onClick={buscarDesdeEspn}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  📅 Posponer fecha desde ESPN
                </button>
                <a
                  href="/admin/jornada"
                  className="block w-full text-center bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  ✏️ Editar fechas manualmente →
                </a>
              </div>
            )}

            <a href="/" className="inline-block text-amber-600 hover:text-amber-800 text-sm font-medium">
              ← Volver al inicio
            </a>
          </div>
        )}

        {/* Buscando */}
        {fase === "buscando" && (
          <div className="text-center space-y-4 py-8">
            <div className="text-4xl animate-spin">⚽</div>
            <p className="text-gray-500 font-medium">Consultando ESPN...</p>
          </div>
        )}

        {/* Preview de nuevas fechas */}
        {fase === "preview" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-bold text-blue-800 text-sm mb-1">📅 Nuevas fechas desde ESPN</p>
              <p className="text-blue-600 text-xs">
                Revisa las fechas antes de confirmar. Puedes ajustar manualmente cualquier campo.
              </p>
            </div>

            {nuevasFechas.map((n) => (
              <div key={n.partidoId} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
                <p className="font-semibold text-gray-800 text-sm">
                  {n.equipoLocal} vs {n.equipoVisita}
                </p>
                <p className="text-xs text-gray-400">
                  Fecha actual: <span className="font-medium text-gray-600">{fmtFecha(n.fechaActual)}</span>
                </p>
                {n.fechaNueva ? (
                  <div className="space-y-1">
                    <p className="text-xs text-green-600 font-medium">✅ Encontrado en ESPN:</p>
                    <input
                      type="datetime-local"
                      value={fechasEditadas[n.partidoId] ?? n.fechaNueva}
                      onChange={(e) =>
                        setFechasEditadas((prev) => ({ ...prev, [n.partidoId]: e.target.value }))
                      }
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-orange-500 font-medium">⚠️ No encontrado — introduce la fecha manualmente:</p>
                    <input
                      type="datetime-local"
                      value={fechasEditadas[n.partidoId] ?? ""}
                      onChange={(e) =>
                        setFechasEditadas((prev) => ({ ...prev, [n.partidoId]: e.target.value }))
                      }
                      className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-3">
              <button
                onClick={() => setFase("cerrado")}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarFechas}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                ✅ Confirmar y reabrir registro
              </button>
            </div>
          </div>
        )}

        {/* Guardando */}
        {fase === "guardando" && (
          <div className="text-center space-y-4 py-8">
            <div className="text-4xl animate-pulse">💾</div>
            <p className="text-gray-500 font-medium">Guardando fechas...</p>
          </div>
        )}
      </div>
    </div>
  );
}
