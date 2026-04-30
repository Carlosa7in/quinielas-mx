"use client";
import { useState, useEffect } from "react";

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
};

const LIGA_ICON: Record<string, string> = {
  "Liga MX": "🇲🇽",
  "Champions League": "⭐",
  "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "La Liga": "🇪🇸",
  "Mixta": "⚽",
};

interface Props {
  onSelect: (jornada: JornadaResumen) => void;
  titulo?: string;
  backHref?: string;
  soloActivas?: boolean;
}

export function JornadaSelector({ onSelect, titulo = "Seleccionar Jornada", backHref = "/admin", soloActivas = false }: Props) {
  const [jornadas, setJornadas] = useState<JornadaResumen[]>([]);
  const [ligaActiva, setLigaActiva] = useState<string>("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data: JornadaResumen[]) => {
        setJornadas(data);
        // Seleccionar la primera liga de las jornadas visibles
        const visibles = soloActivas ? data.filter((j) => j.estado === "abierta") : data;
        if (visibles.length > 0) {
          const ligas = [...new Set(visibles.map((j) => j.liga))];
          setLigaActiva(ligas[0]);
        }
        setCargando(false);
      });
  }, []);

  const LIGA_ORDEN: Record<string, number> = { "Liga MX": 0, "Champions League": 1, "Premier League": 2, "La Liga": 3, "Mixta": 4 };
  const jornadasVisibles = soloActivas ? jornadas.filter((j) => j.estado === "abierta") : jornadas;
  const ligas = [...new Set(jornadasVisibles.map((j) => j.liga))]
    .sort((a, b) => (LIGA_ORDEN[a] ?? 9) - (LIGA_ORDEN[b] ?? 9));
  const jornadasFiltradas = jornadasVisibles.filter((j) => j.liga === ligaActiva);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-amber-950 text-white py-4 px-4">
        <div className="max-w-xl mx-auto">
          <a href={backHref} className="text-amber-400 text-sm">← Admin</a>
          <h1 className="text-xl font-bold mt-1">{titulo}</h1>
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
              <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
                {ligas.map((liga) => (
                  <button
                    key={liga}
                    onClick={() => setLigaActiva(liga)}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                      ligaActiva === liga
                        ? "bg-amber-700 text-white"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {LIGA_ICON[liga] ?? "⚽"} {liga}
                  </button>
                ))}
              </div>
            )}

            {/* Lista de jornadas */}
            <div className="space-y-2">
              {jornadasFiltradas.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No hay jornadas en esta liga</p>
              ) : (
                jornadasFiltradas.map((j) => (
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
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
