"use client";
import { useState, useEffect } from "react";

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

// Convierte Date ISO → "YYYY-MM-DDTHH:mm" para input datetime-local
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFecha(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Fecha inválida";
  return d.toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminJornadaPage() {
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
        // Auto-seleccionar la primera jornada abierta
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
    const fechaLocal = fechas[partidoId];
    if (!fechaLocal) {
      setError((prev) => ({ ...prev, [partidoId]: "Introduce una fecha" }));
      return;
    }
    setGuardando((prev) => ({ ...prev, [partidoId]: true }));
    setError((prev) => ({ ...prev, [partidoId]: "" }));
    setGuardado((prev) => ({ ...prev, [partidoId]: false }));

    const res = await fetch("/api/admin/jornada", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partidoId, fechaHora: new Date(fechaLocal).toISOString() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError((prev) => ({ ...prev, [partidoId]: data.error || "Error al guardar" }));
    } else {
      setGuardado((prev) => ({ ...prev, [partidoId]: true }));
    }
    setGuardando((prev) => ({ ...prev, [partidoId]: false }));
  };

  const guardarTodos = async () => {
    if (!jornada) return;
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {jornadas.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre ?? `Jornada ${j.numero}`} ({j.estado})
                </option>
              ))}
            </select>
          </div>
        )}

        {!jornada && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-700 text-sm">No hay jornadas abiertas o cerradas.</p>
          </div>
        )}

        {jornada && (
          <>
            {/* Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 text-sm font-medium">📅 ¿Para qué sirve esto?</p>
              <p className="text-amber-700 text-xs mt-1">
                La fecha del <strong>primer partido</strong> determina cuándo se cierra el registro de quinielas.
                Aparece en la pantalla de inicio como "Se cierra el…". Ajusta las horas a la hora real del partido.
              </p>
            </div>

            {/* Guardar todos */}
            <button
              onClick={guardarTodos}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              💾 Guardar todas las fechas
            </button>

            {/* Partidos */}
            {jornada.partidos.map((partido, i) => {
              const saved = guardado[partido.id];
              const saving = guardando[partido.id];
              const err = error[partido.id];
              const hasFecha = !!fechas[partido.id];

              return (
                <div
                  key={partido.id}
                  className={`bg-white rounded-xl p-4 border-2 transition-colors ${saved ? "border-green-300" : "border-transparent"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-gray-800">
                      <span className="text-gray-400 text-xs mr-1">#{i + 1}</span>
                      {partido.equipoLocal}{" "}
                      <span className="text-gray-400 font-normal text-xs">vs</span>{" "}
                      {partido.equipoVisita}
                    </p>
                    {saved && (
                      <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">
                        ✓ Guardado
                      </span>
                    )}
                    {partido.resultado && (
                      <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full ml-1">
                        {partido.resultado}
                      </span>
                    )}
                  </div>

                  {/* Fecha actual */}
                  <p className="text-xs text-gray-400 mb-2">
                    Actual: <span className="font-medium text-gray-600">{formatFecha(partido.fechaHora)}</span>
                  </p>

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
