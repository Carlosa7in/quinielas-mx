"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

type Partido = {
  id: string;
  orden: number;
  equipoLocal: string;
  equipoVisita: string;
  resultado: string | null;
  golesLocal: number | null;
  golesVisita: number | null;
  fechaHora: string;
};

type PickItem = {
  prediccion: string;
  acertado: boolean | null;
  partidoId: string;
  orden: number;
};

type Quiniela = {
  id: string;
  folio: string;
  nombreCliente: string | null;
  aciertos: number | null;
  picks: PickItem[];
};

type Premios = {
  bolsa1: number;
  bolsa2: number;
  primeroCount: number;
  segundoCount: number;
  maxAciertos: number | null;
  segundoAciertos: number | null;
};

type Jornada = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  estado: string;
  bolsa2Acumulada: number;
  acumulaciones2: number;
};

type ResultadosData = {
  jornada: Jornada;
  partidos: Partido[];
  quinielas: Quiniela[];
  premios: Premios;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRED_LABEL: Record<string, string> = { "1": "L", "X": "E", "2": "V" };

function fmt(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Group picks for a quiniela by partidoId, returning one cell string per partido (sorted by orden). */
function picksForPartido(picks: PickItem[], partidoId: string): { label: string; acertado: boolean | null }[] {
  const filtered = picks.filter((p) => p.partidoId === partidoId);
  if (filtered.length === 0) return [];
  // For double/triple — join labels
  const label = filtered.map((p) => PRED_LABEL[p.prediccion] ?? p.prediccion).join("/");
  // acertado: true if any is true, false if all are false, null otherwise
  const acertado = filtered.some((p) => p.acertado === true)
    ? true
    : filtered.every((p) => p.acertado === false) && filtered.length > 0
    ? false
    : null;
  return [{ label, acertado }];
}

function pickCellClass(acertado: boolean | null, hasResult: boolean): string {
  if (hasResult && acertado === true) return "bg-green-500 text-white";
  if (hasResult && acertado === false) return "bg-red-400 text-white";
  return "bg-gray-100 text-gray-600";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResultadosPage() {
  const params = useParams();
  const jornadaId = params.jornadaId as string;

  const [data, setData] = useState<ResultadosData | null>(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch(`/api/resultados/${jornadaId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Error al cargar los resultados"));
  }, [jornadaId]);

  const hayAlgunResultado = useMemo(
    () => data?.partidos.some((p) => p.resultado !== null) ?? false,
    [data]
  );

  const quinielasFiltradas = useMemo(() => {
    if (!data) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return data.quinielas;
    return data.quinielas.filter((q2) =>
      (q2.nombreCliente ?? "").toLowerCase().includes(q)
    );
  }, [data, busqueda]);

  // ── Loading / Error states ──────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <a href="/" className="text-amber-700 underline text-sm">Volver al inicio</a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando resultados...</p>
      </div>
    );
  }

  const { jornada, partidos, premios } = data;
  const nombreJornada = jornada.nombre ?? `Jornada ${jornada.numero}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-brand text-white">
        <div className="max-w-screen-xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-tablitas.png"
              alt="Tablitas Quinielas"
              className="h-10 w-auto object-contain shrink-0"
            />
            <div>
              <p className="text-amber-300/70 text-xs">{jornada.liga} · {jornada.temporada}</p>
              <h1 className="text-xl font-bold leading-tight">{nombreJornada}</h1>
            </div>
          </div>

          {/* Prize info */}
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="bg-white/10 rounded-lg px-3 py-1.5">
              <span className="text-amber-300 font-bold">1° Lugar</span>
              <span className="ml-1.5 font-black text-yellow-300">${fmt(premios.bolsa1)}</span>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-1.5">
              <span className="text-amber-300 font-bold">2° Lugar</span>
              <span className="ml-1.5 font-black text-white">
                ${fmt(premios.bolsa2)}
                {jornada.bolsa2Acumulada > 0 && (
                  <span className="ml-1 text-xs text-amber-400">(acumulado)</span>
                )}
              </span>
            </div>
          </div>

          {/* Winner counts */}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-amber-300/80">
            <span>Total de primeros lugares: <strong className="text-white">{premios.primeroCount}</strong></span>
            <span>Total de segundos lugares: <strong className="text-white">{premios.segundoCount}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">

        {/* Search */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar Quiniela (por nombre)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white shadow-sm"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="text-gray-400 hover:text-gray-600 px-2 py-2"
            >
              ✕
            </button>
          )}
        </div>

        {/* Gate: show message if no results at all */}
        {!hayAlgunResultado && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 text-center">
            Los picks se revelan una vez que inicien los partidos.
          </div>
        )}

        {/* Results Grid */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${160 + partidos.length * 44 + 52}px` }}>

              {/* ── Header rows ── */}
              <thead>
                {/* Row 1: LOCAL */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th
                    className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-1.5 text-gray-400 font-semibold uppercase tracking-wide text-[10px] min-w-[140px] max-w-[160px]"
                  >
                    NOMBRE
                  </th>
                  {partidos.map((p) => (
                    <th
                      key={`local-${p.id}`}
                      className="px-1 py-1.5 text-center text-gray-700 font-medium w-[44px] max-w-[44px]"
                      title={p.equipoLocal}
                    >
                      <span className="block truncate" style={{ maxWidth: "40px" }}>
                        {p.equipoLocal.length > 6 ? p.equipoLocal.slice(0, 5) + "…" : p.equipoLocal}
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-center text-gray-400 font-semibold uppercase tracking-wide text-[10px] w-[52px]">
                    PTS
                  </th>
                </tr>

                {/* Row 2: MARCADOR */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-1 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px] min-w-[140px] max-w-[160px]">
                    MARCADOR
                  </th>
                  {partidos.map((p) => {
                    const score =
                      p.golesLocal !== null && p.golesVisita !== null
                        ? `${p.golesLocal}-${p.golesVisita}`
                        : "—";
                    const hasScore = score !== "—";
                    return (
                      <td
                        key={`score-${p.id}`}
                        className={`px-1 py-1 text-center font-bold w-[44px] ${
                          hasScore ? "text-green-600" : "text-gray-300"
                        }`}
                      >
                        {score}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1" />
                </tr>

                {/* Row 3: VISITA */}
                <tr className="border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-white px-3 py-1.5 text-left text-gray-400 font-semibold uppercase tracking-wide text-[10px] min-w-[140px] max-w-[160px]">
                    &nbsp;
                  </th>
                  {partidos.map((p, i) => (
                    <th
                      key={`visita-${p.id}`}
                      className="px-1 py-1.5 text-center text-gray-500 font-medium w-[44px]"
                      title={p.equipoVisita}
                    >
                      <span className="block text-[9px] text-gray-400 font-normal mb-0.5">P{i + 1}</span>
                      <span className="block truncate" style={{ maxWidth: "40px" }}>
                        {p.equipoVisita.length > 6 ? p.equipoVisita.slice(0, 5) + "…" : p.equipoVisita}
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>

              {/* ── Data rows ── */}
              <tbody className="divide-y divide-gray-50">
                {quinielasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={partidos.length + 2}
                      className="text-center py-8 text-gray-400"
                    >
                      {busqueda ? "Sin resultados para esa búsqueda" : "Sin quinielas confirmadas"}
                    </td>
                  </tr>
                )}

                {quinielasFiltradas.map((q) => {
                  const esPrimero =
                    premios.maxAciertos !== null && q.aciertos === premios.maxAciertos;
                  const esSegundo =
                    premios.segundoAciertos !== null && q.aciertos === premios.segundoAciertos;

                  const rowBg = esPrimero
                    ? "bg-yellow-50"
                    : esSegundo
                    ? "bg-gray-100"
                    : "bg-white hover:bg-gray-50";

                  return (
                    <tr key={q.id} className={`transition-colors ${rowBg}`}>
                      {/* Name column */}
                      <td className={`sticky left-0 z-10 px-3 py-2 font-medium text-gray-800 min-w-[140px] max-w-[160px] ${rowBg}`}>
                        <span className="block truncate" style={{ maxWidth: "150px" }}>
                          {esPrimero && (
                            <span className="inline-block mr-1 text-yellow-500 text-[10px] font-bold">1°</span>
                          )}
                          {esSegundo && (
                            <span className="inline-block mr-1 text-gray-500 text-[10px] font-bold">2°</span>
                          )}
                          {q.nombreCliente ?? q.folio}
                        </span>
                      </td>

                      {/* Pick columns */}
                      {partidos.map((p) => {
                        const cells = picksForPartido(q.picks, p.id);
                        const hasPartidoResult = p.resultado !== null;

                        if (cells.length === 0) {
                          // No pick for this partido
                          return (
                            <td key={`pick-${q.id}-${p.id}`} className="px-1 py-2 text-center w-[44px]">
                              <span className="text-gray-200">—</span>
                            </td>
                          );
                        }

                        // Only show picks if jornada has at least one result
                        if (!hayAlgunResultado) {
                          return (
                            <td key={`pick-${q.id}-${p.id}`} className="px-1 py-2 text-center w-[44px]">
                              <span className="inline-flex items-center justify-center w-7 h-6 rounded text-[10px] font-bold bg-gray-100 text-gray-300">
                                ?
                              </span>
                            </td>
                          );
                        }

                        const cell = cells[0];
                        return (
                          <td key={`pick-${q.id}-${p.id}`} className="px-1 py-2 text-center w-[44px]">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-6 rounded text-[10px] font-bold ${pickCellClass(cell.acertado, hasPartidoResult)}`}
                            >
                              {cell.label}
                            </span>
                          </td>
                        );
                      })}

                      {/* PTS column */}
                      <td className="px-2 py-2 text-center w-[52px]">
                        <span
                          className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-sm font-black ${
                            esPrimero
                              ? "bg-yellow-400 text-yellow-900"
                              : esSegundo
                              ? "bg-gray-300 text-gray-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {q.aciertos ?? "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-4 rounded bg-green-500" />
            Acertado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-4 rounded bg-red-400" />
            Fallado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-4 rounded bg-gray-100" />
            Pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-4 rounded bg-yellow-400" />
            1° Lugar
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-4 rounded bg-gray-300" />
            2° Lugar
          </span>
        </div>

        {/* Back link */}
        <div className="pt-2 pb-6 text-center">
          <a
            href="/consultar"
            className="text-amber-700 text-sm font-medium hover:underline"
          >
            ← Consultar mi quiniela
          </a>
        </div>
      </div>
    </div>
  );
}
