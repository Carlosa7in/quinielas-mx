"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { calcularFechaCierre } from "@/lib/fechas";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string | null;
  resultado: string | null;
  orden: number;
};

type Jornada = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  estado: string;
  partidos: Partido[];
};

// ISO → "YYYY-MM-DDTHH:mm" en hora local del navegador (México)
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  // Usar offset local del navegador (asumimos que el usuario está en CDMX)
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function formatFecha(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Fecha inválida";
  return d.toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
  });
}

function estadoRegistro(partidos: Partido[]): { cerrado: boolean; fechaCierre: Date | null } {
  const fechas = partidos
    .map((p) => p.fechaHora ? new Date(p.fechaHora) : null)
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
  if (fechas.length === 0) return { cerrado: false, fechaCierre: null };
  const primera = new Date(Math.min(...fechas.map((d) => d.getTime())));
  const fechaCierre = calcularFechaCierre(primera);
  return { cerrado: new Date() >= fechaCierre, fechaCierre };
}

export default function AdminJornadaPage() {
  const { data: session } = useSession();
  const esSuperadmin = (session?.user as { role?: string })?.role === "superadmin";

  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [jornadaId, setJornadaId] = useState<string | null>(null);
  const [fechas, setFechas] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<Record<string, boolean>>({});
  const [guardado, setGuardado] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/jornada")
      .then((r) => r.json())
      .then((d) => {
        setJornadas(d.jornadas ?? []);
        const abierta = (d.jornadas ?? []).find((j: Jornada) => j.estado === "abierta");
        if (abierta) setJornadaId(abierta.id);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  const jornada = jornadas.find((j) => j.id === jornadaId) ?? null;

  useEffect(() => {
    if (!jornada) return;
    const init: Record<string, string> = {};
    for (const p of jornada.partidos) {
      init[p.id] = toDatetimeLocal(p.fechaHora);
    }
    setFechas(init);
    setGuardado({});
    setError({});
  }, [jornadaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async (partidoId: string) => {
    if (!esSuperadmin) return;
    const fechaLocal = fechas[partidoId];
    if (!fechaLocal) {
      setError((prev) => ({ ...prev, [partidoId]: "Introduce una fecha" }));
      return;
    }
    setGuardando((prev) => ({ ...prev, [partidoId]: true }));
    setError((prev) => ({ ...prev, [partidoId]: "" }));
    setGuardado((prev) => ({ ...prev, [partidoId]: false }));

    // datetime-local no tiene timezone → agregar offset México manualmente
    let fhStr = fechaLocal;
    if (!fhStr.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(fhStr)) {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fhStr)) fhStr += ":00-06:00";
      else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(fhStr)) fhStr += "-06:00";
    }
    const fecha = new Date(fhStr);
    if (isNaN(fecha.getTime())) {
      setError((prev) => ({ ...prev, [partidoId]: "Fecha inválida" }));
      setGuardando((prev) => ({ ...prev, [partidoId]: false }));
      return;
    }

    const res = await fetch("/api/admin/jornada", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partidoId, fechaHora: fecha.toISOString() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError((prev) => ({ ...prev, [partidoId]: data.error || "Error al guardar" }));
    } else {
      setGuardado((prev) => ({ ...prev, [partidoId]: true }));
      // Actualizar la fecha mostrada en el partido
      setJornadas((prev) => prev.map((j) => ({
        ...j,
        partidos: j.partidos.map((p) =>
          p.id === partidoId ? { ...p, fechaHora: fecha.toISOString() } : p
        ),
      })));
    }
    setGuardando((prev) => ({ ...prev, [partidoId]: false }));
  };

  const guardarTodos = async () => {
    if (!jornada || !esSuperadmin) return;
    for (const p of jornada.partidos) {
      if (fechas[p.id]) await guardar(p.id);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Cargando...</p>
      </div>
    );
  }

  const { cerrado, fechaCierre } = jornada ? estadoRegistro(jornada.partidos) : { cerrado: false, fechaCierre: null };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href="/admin" className="text-amber-400 text-sm">← Admin</a>
            <h1 className="text-xl font-bold mt-1">Fechas de Partidos</h1>
            {jornada && (
              <p className="text-amber-400 text-xs">
                {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
              </p>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">

        {/* Selector de jornada */}
        {jornadas.length > 1 && (
          <div className="bg-white rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Jornada</label>
            <select
              value={jornadaId ?? ""}
              onChange={(e) => setJornadaId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {jornadas.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre ?? `Jornada ${j.numero}`} ({j.estado})
                </option>
              ))}
            </select>
          </div>
        )}

        {!jornada ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-700 text-sm">No hay jornadas abiertas o cerradas.</p>
          </div>
        ) : (
          <>
            {/* Estado del registro */}
            <div className={`rounded-xl p-4 border ${cerrado ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{cerrado ? "🔒" : "🟢"}</span>
                <div>
                  <p className={`font-bold text-sm ${cerrado ? "text-red-700" : "text-green-700"}`}>
                    {cerrado ? "Registro CERRADO" : "Registro ABIERTO"}
                  </p>
                  {fechaCierre && (
                    <p className={`text-xs ${cerrado ? "text-red-600" : "text-green-600"}`}>
                      {cerrado ? "Cerró el" : "Cierra el"}{" "}
                      {fechaCierre.toLocaleDateString("es-MX", {
                        weekday: "long", day: "numeric", month: "long",
                        hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
                      })}
                    </p>
                  )}
                  {cerrado && esSuperadmin && (
                    <p className="text-xs text-red-500 mt-0.5 font-medium">
                      ⚠️ Pospón la fecha del primer partido para reabrir el registro
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Aviso solo lectura para no-superadmin */}
            {!esSuperadmin && (
              <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-sm">
                  🔒 Solo el superadmin puede modificar las fechas de los partidos.
                </p>
              </div>
            )}

            {/* Info */}
            {esSuperadmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm font-medium">📅 ¿Para qué sirve esto?</p>
                <p className="text-amber-700 text-xs mt-1">
                  La fecha del <strong>primer partido</strong> determina el cierre de registro (11:00 pm del día anterior).
                  Si un partido se pospone por clima u otro motivo, actualiza aquí su fecha — el sistema recalcula el cierre automáticamente y reabre el registro.
                </p>
              </div>
            )}

            {/* Guardar todos — solo superadmin */}
            {esSuperadmin && (
              <button
                onClick={guardarTodos}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                💾 Guardar todas las fechas
              </button>
            )}

            {/* Partidos */}
            {jornada.partidos.map((partido, i) => {
              const saved = guardado[partido.id];
              const saving = guardando[partido.id];
              const err = error[partido.id];
              const hasFecha = !!fechas[partido.id];

              return (
                <div
                  key={partido.id}
                  className={`bg-white rounded-xl p-4 border-2 transition-colors ${
                    saved ? "border-green-300" : "border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-gray-800">
                      <span className="text-gray-400 text-xs mr-1">#{i + 1}</span>
                      {partido.equipoLocal}{" "}
                      <span className="text-gray-400 font-normal text-xs">vs</span>{" "}
                      {partido.equipoVisita}
                    </p>
                    <div className="flex gap-1 items-center">
                      {saved && (
                        <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">
                          ✓ Guardado
                        </span>
                      )}
                      {partido.resultado && (
                        <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                          {partido.resultado}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mb-2">
                    Fecha actual:{" "}
                    <span className="font-medium text-gray-600">{formatFecha(partido.fechaHora)}</span>
                  </p>

                  {esSuperadmin ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="datetime-local"
                        value={fechas[partido.id] ?? ""}
                        onChange={(e) => {
                          setFechas((prev) => ({ ...prev, [partido.id]: e.target.value }));
                          setGuardado((prev) => ({ ...prev, [partido.id]: false }));
                        }}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        onClick={() => guardar(partido.id)}
                        disabled={!hasFecha || saving}
                        className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors whitespace-nowrap"
                      >
                        {saving ? "..." : "Guardar"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      {partido.fechaHora ? formatFecha(partido.fechaHora) : "Sin fecha asignada"}
                    </p>
                  )}

                  {err && <p className="text-red-600 text-xs mt-1">{err}</p>}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
