"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Equipo = {
  id: string;
  nombre: string;
  abrev: string;
  logo: string;
  pos: number;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

// Clausura 2026: top 8 clasifican directo a Liguilla (sin play-in)
const LIGUILLA = 8;
const TOTAL_EQUIPOS = 18;

function zona(pos: number) {
  if (pos <= LIGUILLA) return "liguilla";
  return "eliminado";
}

function ZonaBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">Líder</span>;
  if (pos <= LIGUILLA) return <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Liguilla</span>;
  if (pos === LIGUILLA + 1) return <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Fuera</span>;
  return null;
}

export default function ClasificacionPage() {
  const [tabla, setTabla] = useState<Equipo[]>([]);
  const [temporada, setTemporada] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clasificacion")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setTabla(data.tabla);
        setTemporada(data.temporada);
      })
      .catch(() => setError("Error al cargar la clasificación"))
      .finally(() => setCargando(false));
  }, []);

  const liguilla = tabla.slice(0, LIGUILLA);
  const eliminados = tabla.slice(LIGUILLA);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white py-5 px-4">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="text-green-300 text-sm mb-1 inline-block">← Inicio</Link>
          <h1 className="text-2xl font-bold">Tabla General</h1>
          <p className="text-green-200 text-sm">{temporada || "Liga MX · Clausura 2026"}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {cargando && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2 animate-pulse">⚽</p>
            <p>Cargando clasificación...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 text-center text-sm">{error}</div>
        )}

        {!cargando && !error && tabla.length > 0 && (
          <>
            {/* Leyenda */}
            <div className="flex gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
                Liguilla (Top {LIGUILLA})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gray-300 inline-block" />
                Eliminados
              </span>
              <span className="ml-auto text-gray-400">Toca un equipo para ver detalle</span>
            </div>

            {/* Cabecera tabla */}
            <div className="bg-green-800 text-white rounded-t-xl px-3 py-2 grid text-xs font-bold"
              style={{ gridTemplateColumns: "28px 1fr 32px 28px 28px 28px 28px 28px 32px" }}>
              <span className="text-center">#</span>
              <span>Equipo</span>
              <span className="text-center">PJ</span>
              <span className="text-center">G</span>
              <span className="text-center">E</span>
              <span className="text-center">P</span>
              <span className="text-center">GF</span>
              <span className="text-center">GC</span>
              <span className="text-center font-black">Pts</span>
            </div>

            {/* Filas */}
            <div className="rounded-b-xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
              {tabla.map((eq, i) => {
                const pos = i + 1;
                const z = zona(pos);
                const isExpanded = expandido === eq.id;
                const esBorde = pos === LIGUILLA; // línea de corte

                return (
                  <div key={eq.id}>
                    <button
                      onClick={() => setExpandido(isExpanded ? null : eq.id)}
                      className={`w-full text-left grid items-center px-3 py-2.5 transition-colors ${
                        z === "liguilla"
                          ? pos === 1 ? "bg-yellow-50 hover:bg-yellow-100" : "bg-green-50 hover:bg-green-100"
                          : "bg-white hover:bg-gray-50"
                      } ${esBorde ? "border-b-2 border-red-400" : ""}`}
                      style={{ gridTemplateColumns: "28px 1fr 32px 28px 28px 28px 28px 28px 32px" }}
                    >
                      {/* Posición */}
                      <span className={`text-center text-sm font-black ${
                        pos === 1 ? "text-yellow-600" : pos <= LIGUILLA ? "text-green-700" : "text-gray-400"
                      }`}>
                        {pos}
                      </span>

                      {/* Equipo */}
                      <div className="flex items-center gap-2 min-w-0">
                        {eq.logo
                          ? <img src={eq.logo} alt={eq.abrev} className="w-6 h-6 object-contain shrink-0" />
                          : <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-gray-500">{eq.abrev[0]}</div>
                        }
                        <span className="text-sm font-semibold text-gray-800 truncate">{eq.nombre}</span>
                      </div>

                      <span className="text-center text-xs text-gray-500">{eq.pj}</span>
                      <span className="text-center text-xs text-green-700 font-medium">{eq.g}</span>
                      <span className="text-center text-xs text-gray-500">{eq.e}</span>
                      <span className="text-center text-xs text-red-500 font-medium">{eq.p}</span>
                      <span className="text-center text-xs text-gray-500">{eq.gf}</span>
                      <span className="text-center text-xs text-gray-500">{eq.gc}</span>
                      <span className={`text-center text-sm font-black ${
                        pos <= LIGUILLA ? "text-green-700" : "text-gray-600"
                      }`}>{eq.pts}</span>
                    </button>

                    {/* Detalle expandido */}
                    {isExpanded && (
                      <div className={`px-4 py-3 text-sm space-y-2 ${z === "liguilla" ? "bg-green-50" : "bg-gray-50"}`}>
                        <div className="flex items-center gap-3">
                          {eq.logo && <img src={eq.logo} alt={eq.nombre} className="w-10 h-10 object-contain" />}
                          <div>
                            <p className="font-bold text-gray-800">{eq.nombre}</p>
                            <ZonaBadge pos={pos} />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="bg-white rounded-lg p-2 shadow-sm">
                            <p className="text-lg font-bold text-green-700">{eq.g}</p>
                            <p className="text-xs text-gray-500">Victorias</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 shadow-sm">
                            <p className="text-lg font-bold text-yellow-600">{eq.e}</p>
                            <p className="text-xs text-gray-500">Empates</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 shadow-sm">
                            <p className="text-lg font-bold text-red-500">{eq.p}</p>
                            <p className="text-xs text-gray-500">Derrotas</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 shadow-sm">
                            <p className={`text-lg font-bold ${(eq.dg as number) >= 0 ? "text-green-700" : "text-red-500"}`}>
                              {(eq.dg as number) > 0 ? "+" : ""}{eq.dg}
                            </p>
                            <p className="text-xs text-gray-500">Dif. goles</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                          {eq.gf} goles a favor · {eq.gc} en contra
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nota Clausura 2026 */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
              <p className="font-bold">📋 Clausura 2026 — Formato especial</p>
              <p>Sin Play-In. Los primeros <strong>8 equipos</strong> clasifican directamente a Liguilla (Cuartos de Final).</p>
              <p className="text-xs text-blue-500 mt-1">Cuartos: 1° vs 8° · 2° vs 7° · 3° vs 6° · 4° vs 5°</p>
            </div>

            {/* Cruces Liguilla si hay 8 clasificados con jornada completa */}
            {liguilla.length === LIGUILLA && liguilla[0].pj === 17 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-yellow-400 px-4 py-2">
                  <p className="font-bold text-yellow-900 text-sm">🏆 Cruces de Liguilla</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {[0, 1, 2, 3].map((i) => {
                    const a = liguilla[i];
                    const b = liguilla[LIGUILLA - 1 - i];
                    return (
                      <div key={i} className="flex items-center px-4 py-2.5 gap-3">
                        <span className="text-xs text-gray-400 w-4">{i + 1}°</span>
                        <div className="flex items-center gap-1.5 flex-1">
                          {a.logo && <img src={a.logo} className="w-5 h-5 object-contain" alt={a.abrev} />}
                          <span className="text-sm font-semibold text-gray-800 truncate">{a.nombre}</span>
                        </div>
                        <span className="text-xs text-gray-400 font-bold">vs</span>
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          <span className="text-sm font-semibold text-gray-800 truncate text-right">{b.nombre}</span>
                          {b.logo && <img src={b.logo} className="w-5 h-5 object-contain" alt={b.abrev} />}
                        </div>
                        <span className="text-xs text-gray-400 w-4 text-right">{LIGUILLA - i}°</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center pb-4">
              Datos en tiempo real · ESPN · Actualización cada 5 min
            </p>
          </>
        )}
      </div>
    </div>
  );
}
