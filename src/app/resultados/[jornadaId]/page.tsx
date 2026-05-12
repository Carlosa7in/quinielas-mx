"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";

type Partido = {
  id: string;
  orden: number;
  equipoLocal: string;
  equipoVisita: string;
  resultado: string | null;
  golesLocal: number | null;
  golesVisita: number | null;
  logoLocal: string;
  logoVisita: string;
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
};

type ResultadosData = {
  jornada: Jornada;
  partidos: Partido[];
  quinielas: Quiniela[];
  premios: Premios;
};

const PRED_LABEL: Record<string, string> = { "1": "L", "X": "E", "2": "V" };

function fmt(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Shows ESPN logo URL; fallback to initials circle if missing/broken */
function TeamLogo({ logoUrl, team, size = 32 }: { logoUrl: string; team: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "#334155", display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ color: "#fff", fontSize: size * 0.32, fontWeight: 800, lineHeight: 1 }}>
          {initials(team)}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={team}
      onError={() => setFailed(true)}
      crossOrigin="anonymous"
      style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }}
    />
  );
}

function picksForPartido(picks: PickItem[], partidoId: string) {
  const filtered = picks.filter((p) => p.partidoId === partidoId);
  if (filtered.length === 0) return null;
  const label = filtered.map((p) => PRED_LABEL[p.prediccion] ?? p.prediccion).join("/");
  const acertado = filtered.some((p) => p.acertado === true)
    ? true
    : filtered.every((p) => p.acertado === false)
    ? false
    : null;
  return { label, acertado };
}

function pickStyle(acertado: boolean | null, hasResult: boolean): { bg: string; color: string } {
  if (hasResult && acertado === true)  return { bg: "#16a34a", color: "#fff" };
  if (hasResult && acertado === false) return { bg: "#dc2626", color: "#fff" };
  return { bg: "#d1d5db", color: "#374151" };
}

// ─── Styles (inline for html2canvas) ──────────────────────────────────────────
const NAVY   = "#1e3a5f";
const NAVY2  = "#162d4a";
const WHITE  = "#ffffff";
const LGRAY  = "#f3f4f6";
const LGRAY2 = "#e5e7eb";
const COL_W  = 50;   // px per partido column
const NAME_W = 140;  // px for name column
const PTS_W  = 44;   // px for pts column

export default function ResultadosPage() {
  const params = useParams();
  const jornadaId = params.jornadaId as string;

  const [data, setData]           = useState<ResultadosData | null>(null);
  const [error, setError]         = useState("");
  const [busqueda, setBusqueda]   = useState("");
  const [generando, setGenerando] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/resultados/${jornadaId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Error al cargar los resultados"));
  }, [jornadaId]);

  const hayResultados = useMemo(
    () => data?.partidos.some((p) => p.resultado !== null) ?? false,
    [data]
  );

  const quinielasFiltradas = useMemo(() => {
    if (!data) return [];
    const q = busqueda.trim().toLowerCase();
    return q
      ? data.quinielas.filter((q2) => (q2.nombreCliente ?? "").toLowerCase().includes(q))
      : data.quinielas;
  }, [data, busqueda]);

  const generarImagen = async () => {
    if (!gridRef.current) return;
    setGenerando(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: WHITE,
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
      const file = new File([blob], "resultados.png", { type: "image/png" });
      const url  = URL.createObjectURL(blob);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Resultados Quiniela", url: window.location.href });
      } else {
        const a = document.createElement("a"); a.href = url; a.download = "resultados.png"; a.click();
      }
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    setGenerando(false);
  };

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">{error}</p>
        <a href="/" className="text-amber-700 underline text-sm">Volver al inicio</a>
      </div>
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Cargando resultados...</p>
    </div>
  );

  const { jornada, partidos, premios } = data;
  const nombreJornada = jornada.nombre ?? `Jornada ${jornada.numero}`;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Top header ── */}
      <div className="bg-brand text-white px-4 py-4">
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas" className="h-10 w-auto object-contain shrink-0" />
          <div className="flex-1">
            <p className="text-amber-300/70 text-xs">{jornada.liga} · {jornada.temporada}</p>
            <h1 className="text-lg font-bold leading-tight">{nombreJornada}</h1>
          </div>
          <div className="text-right text-sm space-y-1 shrink-0">
            {premios.primeroCount > 0 && (
              <p className="text-yellow-300 font-bold">🥇 ${fmt(premios.bolsa1)} · {premios.primeroCount} gana{premios.primeroCount !== 1 ? "dores" : "dor"}</p>
            )}
            {premios.segundoCount > 0 && (
              <p className="text-white/70 font-semibold text-xs">🥈 ${fmt(premios.bolsa2)} · {premios.segundoCount}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto px-3 py-3 space-y-3">

        {/* Búsqueda + imagen */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 Buscar participante"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white shadow-sm"
          />
          <button
            onClick={generarImagen}
            disabled={generando || !hayResultados}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-3 py-2 rounded-xl text-sm transition-colors shrink-0 flex items-center gap-1.5"
          >
            {generando ? "⏳" : "📸"} {generando ? "..." : "Imagen"}
          </button>
        </div>

        {!hayResultados && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800 text-center">
            Los picks se revelan una vez que inicien los partidos.
          </div>
        )}

        {/* ── GRID (capturado por html2canvas) ── */}
        <div
          ref={gridRef}
          style={{ background: WHITE, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.10)" }}
        >

          {/* Marca dentro de la imagen */}
          <div style={{ background: NAVY, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>TABLITAS QUINIELAS</div>
              <div style={{ color: WHITE, fontSize: 16, fontWeight: 800 }}>{nombreJornada}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {premios.primeroCount > 0 && (
                <div style={{ color: "#fde047", fontSize: 12, fontWeight: 800 }}>
                  1° ${fmt(premios.bolsa1)} · {premios.primeroCount} ganador{premios.primeroCount !== 1 ? "es" : ""}
                </div>
              )}
              {premios.segundoCount > 0 && (
                <div style={{ color: "#d1d5db", fontSize: 11, fontWeight: 700 }}>
                  2° ${fmt(premios.bolsa2)} · {premios.segundoCount} ganador{premios.segundoCount !== 1 ? "es" : ""}
                </div>
              )}
            </div>
          </div>

          {/* "RESULTADOS" bar */}
          <div style={{ background: NAVY2, padding: "5px 14px", textAlign: "center" }}>
            <span style={{ color: WHITE, fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>RESULTADOS</span>
          </div>

          {/* Scrollable table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: NAME_W + partidos.length * COL_W + PTS_W }}>

              {/* ─── Header: 3 fixed rows (LOCAL, MARCADOR, VISITA) + col headers ─── */}
              <thead>

                {/* LOCAL logos row */}
                <tr style={{ background: "#e8edf2" }}>
                  <td style={{ width: NAME_W, minWidth: NAME_W, padding: "6px 10px" }}>
                    <span style={{ color: NAVY, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>LOCAL</span>
                  </td>
                  {partidos.map((p) => (
                    <td key={`local-${p.id}`} style={{ width: COL_W, minWidth: COL_W, textAlign: "center", padding: "6px 2px" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <TeamLogo logoUrl={p.logoLocal} team={p.equipoLocal} size={34} />
                      </div>
                    </td>
                  ))}
                  <td style={{ width: PTS_W }} />
                </tr>

                {/* MARCADOR row */}
                <tr style={{ background: "#0f2a47" }}>
                  <td style={{ padding: "5px 10px" }}>
                    <span style={{ color: "#93c5fd", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>MARCADOR</span>
                  </td>
                  {partidos.map((p) => {
                    const hasScore = p.golesLocal !== null && p.golesVisita !== null;
                    const score    = hasScore ? `${p.golesLocal}-${p.golesVisita}` : "·";
                    return (
                      <td key={`marc-${p.id}`} style={{ textAlign: "center", padding: "5px 2px" }}>
                        <div style={{
                          background: hasScore ? "#16a34a" : "#1e3a5f",
                          borderRadius: 6, padding: "3px 4px", margin: "0 auto", display: "inline-block", minWidth: 32,
                        }}>
                          <span style={{ color: WHITE, fontSize: 11, fontWeight: 900 }}>{score}</span>
                        </div>
                      </td>
                    );
                  })}
                  <td />
                </tr>

                {/* VISITA logos row */}
                <tr style={{ background: "#e8edf2" }}>
                  <td style={{ padding: "6px 10px" }}>
                    <span style={{ color: NAVY, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>VISITA</span>
                  </td>
                  {partidos.map((p) => (
                    <td key={`visit-${p.id}`} style={{ width: COL_W, minWidth: COL_W, textAlign: "center", padding: "6px 2px" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <TeamLogo logoUrl={p.logoVisita} team={p.equipoVisita} size={34} />
                      </div>
                    </td>
                  ))}
                  <td />
                </tr>

                {/* Column labels row (NOMBRE / 1,2,3… / PTS) */}
                <tr style={{ background: NAVY2, borderBottom: `2px solid ${LGRAY2}` }}>
                  <td style={{ padding: "5px 10px" }}>
                    <span style={{ color: WHITE, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>NOMBRE</span>
                  </td>
                  {partidos.map((p, i) => (
                    <td key={`num-${p.id}`} style={{ textAlign: "center", padding: "5px 2px" }}>
                      <span style={{ color: "#93c5fd", fontSize: 10, fontWeight: 800 }}>{i + 1}</span>
                    </td>
                  ))}
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: WHITE, fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>PTS</span>
                  </td>
                </tr>
              </thead>

              {/* ─── Participant rows ─── */}
              <tbody>
                {quinielasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={partidos.length + 2} style={{ textAlign: "center", padding: "28px 0", color: "#9ca3af", fontSize: 13 }}>
                      {busqueda ? "Sin resultados para esa búsqueda" : "Sin quinielas"}
                    </td>
                  </tr>
                )}

                {quinielasFiltradas.map((q, idx) => {
                  const esPrimero  = premios.maxAciertos    !== null && q.aciertos === premios.maxAciertos;
                  const esSegundo  = premios.segundoAciertos !== null && q.aciertos === premios.segundoAciertos;
                  const rowBg      = esPrimero ? "#fef9c3" : esSegundo ? "#f0fdf4" : idx % 2 === 0 ? WHITE : LGRAY;

                  return (
                    <tr key={q.id} style={{ background: rowBg, borderBottom: `1px solid ${LGRAY2}` }}>

                      {/* Nombre */}
                      <td style={{ padding: "5px 10px", width: NAME_W, minWidth: NAME_W }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {esPrimero && <span style={{ fontSize: 12 }}>🥇</span>}
                          {esSegundo && <span style={{ fontSize: 12 }}>🥈</span>}
                          <span style={{
                            color: "#111827", fontSize: 12, fontWeight: 600,
                            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                            maxWidth: NAME_W - 36,
                          }}>
                            {q.nombreCliente ?? q.folio}
                          </span>
                        </div>
                      </td>

                      {/* Picks */}
                      {partidos.map((p) => {
                        const cell      = picksForPartido(q.picks, p.id);
                        const hasResult = p.resultado !== null;
                        const style     = cell && hayResultados
                          ? pickStyle(cell.acertado, hasResult)
                          : { bg: "#d1d5db", color: "#6b7280" };
                        const label     = cell && hayResultados ? cell.label : "?";

                        return (
                          <td key={`${q.id}-${p.id}`} style={{ width: COL_W, minWidth: COL_W, textAlign: "center", padding: "5px 2px" }}>
                            <div style={{
                              background: style.bg, borderRadius: 6,
                              height: 28, width: COL_W - 6, margin: "0 auto",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <span style={{ color: style.color, fontSize: 11, fontWeight: 800 }}>{label}</span>
                            </div>
                          </td>
                        );
                      })}

                      {/* PTS */}
                      <td style={{ width: PTS_W, textAlign: "center", padding: "5px 3px" }}>
                        <div style={{
                          background: esPrimero ? "#fbbf24" : esSegundo ? "#86efac" : LGRAY2,
                          borderRadius: 6, height: 28, width: PTS_W - 8, margin: "0 auto",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ color: esPrimero ? "#78350f" : esSegundo ? "#14532d" : "#6b7280", fontSize: 13, fontWeight: 900 }}>
                            {q.aciertos ?? "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ padding: "8px 14px", borderTop: `1px solid ${LGRAY2}`, textAlign: "center", background: LGRAY }}>
            <span style={{ color: "#9ca3af", fontSize: 9 }}>
              tablitasquinielas.com · {typeof window !== "undefined" ? window.location.href : ""}
            </span>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
          {[
            { bg: "#16a34a", label: "Acertado" },
            { bg: "#dc2626", label: "Fallado" },
            { bg: "#d1d5db", label: "Pendiente" },
            { bg: "#fbbf24", label: "1° Lugar" },
            { bg: "#86efac", label: "2° Lugar" },
          ].map(({ bg, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span style={{ background: bg, width: 16, height: 13, borderRadius: 3, display: "inline-block" }} />
              {label}
            </span>
          ))}
        </div>

        <div className="pb-6 text-center">
          <a href="/consultar" className="text-amber-700 text-sm font-medium hover:underline">
            ← Consultar mi quiniela
          </a>
        </div>
      </div>
    </div>
  );
}
