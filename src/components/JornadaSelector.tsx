"use client";
import { useState, useEffect } from "react";
import { LIGA_ICON } from "@/lib/equipos";

export type JornadaResumen = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  estado: string;
  totalQuinielas: number;
  totalPartidos: number;
  recaudado: number;
  ganadoras: number;
  primerPartidoFecha: string | null;
};

// Jornada visible para vender: estado abierta Y registro aún no cerrado
function estaAbierta(j: JornadaResumen): boolean {
  if (j.estado !== "abierta") return false;
  if (!j.primerPartidoFecha) return true; // sin fecha → mostrar
  return new Date() < new Date(j.primerPartidoFecha);
}

interface Props {
  onSelect: (jornada: JornadaResumen) => void;
  titulo?: string;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;   // si se pasa, el botón ← usa callback en vez de href
  soloActivas?: boolean;
  onSignOut?: () => void;
  perfilHref?: string;   // si se pasa, muestra botón "Mi Panel" en el header
}

export function JornadaSelector({ onSelect, titulo = "Seleccionar Jornada", backHref = "/admin", backLabel = "Admin", onBack, soloActivas = false, onSignOut, perfilHref }: Props) {
  const [jornadas, setJornadas] = useState<JornadaResumen[]>([]);
  const [ligaActiva, setLigaActiva] = useState<string>("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data: JornadaResumen[]) => {
        setJornadas(data);
        const visibles = soloActivas ? data.filter(estaAbierta) : data;
        if (visibles.length > 0) {
          const ligas = [...new Set(visibles.map((j) => j.liga))];
          setLigaActiva(ligas[0]);
        }
      })
      .catch(() => {/* sin jornadas */})
      .finally(() => setCargando(false));
  }, [soloActivas]);

  const LIGA_ORDEN: Record<string, number> = { "Mundial": -1, "Liga MX": 0, "Champions League": 1, "Premier League": 2, "La Liga": 3, "Mixta": 4 };
  const jornadasVisibles = soloActivas ? jornadas.filter(estaAbierta) : jornadas;
  const ligas = [...new Set(jornadasVisibles.map((j) => j.liga))]
    .sort((a, b) => (LIGA_ORDEN[a] ?? 9) - (LIGA_ORDEN[b] ?? 9));
  const jornadasFiltradas = jornadasVisibles.filter((j) => j.liga === ligaActiva);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            {onBack ? (
              <button onClick={onBack} className="text-amber-400 text-sm">← {backLabel}</button>
            ) : (
              <a href={backHref} className="text-amber-400 text-sm">← {backLabel}</a>
            )}
            <h1 className="text-xl font-bold mt-1">{titulo}</h1>
          </div>
          <div className="flex items-center gap-2">
            {perfilHref && (
              <a
                href={perfilHref}
                className="text-amber-300 hover:text-white text-sm border border-amber-800 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                👤 Mi Panel
              </a>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-amber-300 hover:text-white text-sm border border-amber-800 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {cargando ? (
          <p className="text-center text-gray-400 py-12">Cargando jornadas...</p>
        ) : jornadasVisibles.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p>{soloActivas ? "No hay jornadas abiertas" : "No hay jornadas creadas"}</p>
            {!soloActivas && (
              <a href="/admin/nueva-jornada" className="text-amber-700 underline text-sm mt-2 inline-block">
                Crear primera jornada →
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Selector de liga */}
            {ligas.length > 1 && (
              <div className="flex rounded-xl shadow-sm overflow-hidden">
                {ligas.map((liga) => {
                  const esMundialTab = liga === "Mundial";
                  const activo = ligaActiva === liga;
                  return (
                    <button
                      key={liga}
                      onClick={() => setLigaActiva(liga)}
                      className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                        esMundialTab
                          ? activo
                            ? "text-yellow-300 font-black"
                            : "text-yellow-700 bg-[#0f1e3d] hover:bg-[#162b50]"
                          : activo
                            ? "bg-amber-700 text-white"
                            : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                      style={esMundialTab && activo ? { background: "linear-gradient(135deg, #0f1e3d, #1a3a6b)" } : undefined}
                    >
                      {LIGA_ICON[liga] ?? "⚽"} {liga}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lista de jornadas */}
            <div className="space-y-2">
              {jornadasFiltradas.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No hay jornadas en esta liga</p>
              ) : (
                jornadasFiltradas.map((j) => {
                  const esMundial = j.liga === "Mundial";

                  // ── Tarjeta especial para el Mundial ──
                  if (esMundial) return (
                    <button
                      key={j.id}
                      onClick={() => onSelect(j)}
                      className="w-full rounded-xl text-left border-2 border-yellow-500/40 overflow-hidden transition-all shadow-md hover:shadow-xl hover:scale-[1.01]"
                      style={{ background: "linear-gradient(135deg, #0d1b38 0%, #1a3a6b 55%, #0d2545 100%)" }}
                    >
                      <div className="px-4 pt-3 pb-2.5"
                        style={{ background: "linear-gradient(90deg, rgba(234,179,8,0.14) 0%, transparent 80%)" }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl leading-none">🏆</span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-yellow-400 font-black text-sm tracking-wider uppercase">
                                  Mundial 2026
                                </span>
                                <span className="bg-yellow-400 text-blue-950 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                  Especial
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                  j.estado === "abierta"
                                    ? "bg-green-400/20 text-green-300"
                                    : "bg-white/10 text-white/50"
                                }`}>
                                  {j.estado}
                                </span>
                              </div>
                              <p className="text-yellow-200/60 text-xs mt-0.5">
                                {j.nombre ?? `Jornada ${j.numero}`} · {j.temporada}
                              </p>
                            </div>
                          </div>
                          <span className="text-yellow-400 text-xl shrink-0">→</span>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 flex gap-4 text-xs text-blue-200/60 border-t border-yellow-500/10">
                        <span>⚽ {j.totalPartidos} partidos</span>
                        <span>🎯 {j.totalQuinielas} quinielas</span>
                      </div>
                    </button>
                  );

                  // ── Tarjeta normal ──
                  return (
                    <button
                      key={j.id}
                      onClick={() => onSelect(j)}
                      className="w-full bg-white rounded-xl p-4 flex items-center justify-between hover:bg-amber-50 hover:border-amber-300 border-2 border-transparent transition-all text-left shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">
                            {j.nombre ?? `Jornada ${j.numero}`}
                          </span>
                          <span className="text-gray-500 text-sm">· {j.temporada}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            j.estado === "abierta"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {j.estado}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          <span>⚽ {j.totalPartidos} partidos</span>
                          <span>🎯 {j.totalQuinielas} quinielas</span>
                        </div>
                      </div>
                      <span className="text-amber-600 text-xl">→</span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
