"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
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
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function TeamLogo({ logoUrl, team, size = 32 }: { logoUrl: string; team: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontSize: size * 0.32, fontWeight: 800, lineHeight: 1 }}>{initials(team)}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={team} onError={() => setFailed(true)} crossOrigin="anonymous"
      style={{ width: size, height: size, objectFit: "contain", display: "block", flexShrink: 0 }} />
  );
}

function picksForPartido(picks: PickItem[], partidoId: string) {
  const filtered = picks.filter((p) => p.partidoId === partidoId);
  if (filtered.length === 0) return null;
  const label = filtered.map((p) => PRED_LABEL[p.prediccion] ?? p.prediccion).join("/");
  const acertado = filtered.some((p) => p.acertado === true) ? true
    : filtered.every((p) => p.acertado === false) ? false : null;
  return { label, acertado };
}
function pickStyle(acertado: boolean | null, hasResult: boolean): { bg: string; color: string } {
  if (hasResult && acertado === true)  return { bg: "#16a34a", color: "#fff" };
  if (hasResult && acertado === false) return { bg: "#dc2626", color: "#fff" };
  return { bg: "#d1d5db", color: "#374151" };
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const NAVY   = "#1e3a5f";
const NAVY2  = "#162d4a";
const WHITE  = "#ffffff";
const LGRAY  = "#f3f4f6";
const LGRAY2 = "#e5e7eb";
const COL_W  = 50;
const NAME_W = 140;
const PTS_W  = 44;


// ─── Preview modal ─────────────────────────────────────────────────────────────
function PreviewModal({ blobUrl, blob, onClose }: { blobUrl: string; blob: Blob; onClose: () => void }) {
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  const compartirNativo = async () => {
    const file = new File([blob], "quiniela-resultados.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Resultados Quiniela", url: pageUrl }); }
      catch { /* cancelado */ }
    } else { descargar(); }
  };

  const compartirWhatsApp = () => {
    const texto = `🏆 Resultados de la quiniela\n\n🔗 ${pageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const compartirFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, "_blank");
  };

  const compartirTwitter = () => {
    const texto = `🏆 Resultados de la quiniela — ¡mira quién ganó!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(pageUrl)}`, "_blank");
  };

  const descargar = () => {
    const a = document.createElement("a");
    a.href = blobUrl; a.download = "quiniela-resultados.png"; a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-w-md p-4 space-y-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-gray-800">Vista previa · Compartir</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Preview */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm max-h-[55vh] overflow-y-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blobUrl} alt="Flyer resultados" className="w-full" />
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={compartirNativo}
            className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            📤 Compartir
          </button>
          <button onClick={compartirWhatsApp}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            💬 WhatsApp
          </button>
          <button onClick={compartirFacebook}
            className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            📘 Facebook
          </button>
          <button onClick={compartirTwitter}
            className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            🐦 X / Twitter
          </button>
        </div>

        <button onClick={descargar}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
          ⬇️ Descargar PNG
        </button>

        <button onClick={onClose} className="w-full text-xs text-gray-400 py-1">Cerrar</button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ResultadosPage() {
  const params = useParams();
  const jornadaId = params.jornadaId as string;

  const [data, setData]           = useState<ResultadosData | null>(null);
  const [error, setError]         = useState("");
  const [busqueda, setBusqueda]   = useState("");
  const [estadoImg, setEstadoImg] = useState<"idle" | "generando" | "lista">("idle");
  const [blobUrl, setBlobUrl]     = useState<string>("");
  const [blob, setBlob]           = useState<Blob | null>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 800
  );
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    return q ? data.quinielas.filter((q2) => (q2.nombreCliente ?? "").toLowerCase().includes(q)) : data.quinielas;
  }, [data, busqueda]);

  const generarImagen = useCallback(async () => {
    setEstadoImg("generando");
    try {
      // Satori genera la imagen en el servidor — solo hay que pedirla
      const res = await fetch(`/api/resultados/${jornadaId}/imagen`);
      if (!res.ok) throw new Error(await res.text());
      const b = await res.blob();
      const url = URL.createObjectURL(b);
      setBlob(b);
      setBlobUrl(url);
      setEstadoImg("lista");
    } catch (e) {
      console.error(e);
      setEstadoImg("idle");
    }
  }, [jornadaId]);

  const cerrarPreview = useCallback(() => {
    URL.revokeObjectURL(blobUrl);
    setBlobUrl("");
    setBlob(null);
    setEstadoImg("idle");
  }, [blobUrl]);

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
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  // Dimensiones responsive — sin scroll horizontal en mobile
  const isMobile = windowWidth < 640;
  const availW   = windowWidth - 12; // px-3 = 6px c/lado
  const rPtsW    = isMobile ? 30 : 44;
  const rNameW   = isMobile ? 80 : 140;
  const rColW    = isMobile
    ? Math.max(24, Math.floor((availW - rNameW - rPtsW) / (partidos.length || 1)))
    : 50;
  const rLogoSz  = isMobile ? 22 : 34;
  const rCellH   = isMobile ? 22 : 28;
  const rFontXS  = isMobile ? 8 : 10;
  const rFontSM  = isMobile ? 9 : 11;
  const rFontNm  = isMobile ? 10 : 12;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Preview modal */}
      {estadoImg === "lista" && blobUrl && blob && (
        <PreviewModal blobUrl={blobUrl} blob={blob} onClose={cerrarPreview} />
      )}

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
              <p className="text-yellow-300 font-bold">🥇 {fmt(premios.bolsa1)} · {premios.primeroCount} gana{premios.primeroCount !== 1 ? "dores" : "dor"}</p>
            )}
            {premios.segundoCount > 0 && (
              <p className="text-white/70 font-semibold text-xs">🥈 {fmt(premios.bolsa2)} · {premios.segundoCount}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto px-3 py-3 space-y-3">

        {/* Search + generate button */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 Buscar participante"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white shadow-sm"
          />
          <button
            onClick={estadoImg === "idle" ? generarImagen : cerrarPreview}
            disabled={estadoImg === "generando" || !hayResultados}
            className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shrink-0 flex items-center gap-1.5 whitespace-nowrap"
          >
            {estadoImg === "generando" ? "⏳ Generando..." : "🖼️ Generar imagen"}
          </button>
        </div>

        {!hayResultados && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800 text-center">
            Los picks se revelan una vez que inicien los partidos.
          </div>
        )}

        {/* ── Results grid ── */}
        <div style={{ background: WHITE, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.10)" }}>
          {/* Grid header */}
          <div style={{ background: NAVY, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>TABLITAS QUINIELAS</div>
              <div style={{ color: WHITE, fontSize: 16, fontWeight: 800 }}>{nombreJornada}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {premios.primeroCount > 0 && (
                <div style={{ color: "#fde047", fontSize: 12, fontWeight: 800 }}>1° {fmt(premios.bolsa1)} · {premios.primeroCount} ganador{premios.primeroCount !== 1 ? "es" : ""}</div>
              )}
              {premios.segundoCount > 0 && (
                <div style={{ color: "#d1d5db", fontSize: 11, fontWeight: 700 }}>2° {fmt(premios.bolsa2)} · {premios.segundoCount} ganador{premios.segundoCount !== 1 ? "es" : ""}</div>
              )}
            </div>
          </div>
          <div style={{ background: NAVY2, padding: "5px 14px", textAlign: "center" }}>
            <span style={{ color: WHITE, fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>RESULTADOS</span>
          </div>

          <div>
            <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
              <thead>
                {/* LOCAL */}
                <tr style={{ background: "#e8edf2" }}>
                  <td style={{ width: rNameW, padding: "6px 10px" }}>
                    <span style={{ color: NAVY, fontSize: rFontSM, fontWeight: 800, letterSpacing: 1 }}>LOCAL</span>
                  </td>
                  {partidos.map((p) => (
                    <td key={`local-${p.id}`} style={{ width: rColW, textAlign: "center", padding: "4px 1px" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <TeamLogo logoUrl={p.logoLocal} team={p.equipoLocal} size={rLogoSz} />
                      </div>
                    </td>
                  ))}
                  <td style={{ width: rPtsW }} />
                </tr>
                {/* MARCADOR — plain score, no green box */}
                <tr style={{ background: "#0f2a47" }}>
                  <td style={{ padding: "4px 10px" }}>
                    <span style={{ color: "#93c5fd", fontSize: rFontXS, fontWeight: 800, letterSpacing: 1 }}>MARCADOR</span>
                  </td>
                  {partidos.map((p) => {
                    const has = p.golesLocal !== null && p.golesVisita !== null;
                    return (
                      <td key={`marc-${p.id}`} style={{ textAlign: "center", padding: "4px 1px" }}>
                        <span style={{ color: has ? WHITE : "#4b5563", fontSize: rFontSM + 2, fontWeight: 900 }}>
                          {has ? `${p.golesLocal}-${p.golesVisita}` : "·"}
                        </span>
                      </td>
                    );
                  })}
                  <td />
                </tr>
                {/* VISITA */}
                <tr style={{ background: "#e8edf2" }}>
                  <td style={{ padding: "4px 10px" }}>
                    <span style={{ color: NAVY, fontSize: rFontSM, fontWeight: 800, letterSpacing: 1 }}>VISITA</span>
                  </td>
                  {partidos.map((p) => (
                    <td key={`visit-${p.id}`} style={{ width: rColW, textAlign: "center", padding: "4px 1px" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <TeamLogo logoUrl={p.logoVisita} team={p.equipoVisita} size={rLogoSz} />
                      </div>
                    </td>
                  ))}
                  <td />
                </tr>
                {/* Column numbers */}
                <tr style={{ background: NAVY2 }}>
                  <td style={{ padding: "4px 10px" }}>
                    <span style={{ color: WHITE, fontSize: rFontXS, fontWeight: 800, letterSpacing: 1 }}>NOMBRE</span>
                  </td>
                  {partidos.map((p, i) => (
                    <td key={`num-${p.id}`} style={{ textAlign: "center", padding: "4px 1px" }}>
                      <span style={{ color: "#93c5fd", fontSize: rFontXS, fontWeight: 800 }}>{i + 1}</span>
                    </td>
                  ))}
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: WHITE, fontSize: rFontXS, fontWeight: 800, letterSpacing: 1 }}>PTS</span>
                  </td>
                </tr>
              </thead>
              <tbody>
                {quinielasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={partidos.length + 2} style={{ textAlign: "center", padding: "28px 0", color: "#9ca3af", fontSize: 13 }}>
                      {busqueda ? "Sin resultados" : "Sin quinielas"}
                    </td>
                  </tr>
                )}
                {quinielasFiltradas.map((q, idx) => {
                  const esPrimero = premios.maxAciertos    !== null && q.aciertos === premios.maxAciertos;
                  const esSegundo = premios.segundoAciertos !== null && q.aciertos === premios.segundoAciertos;
                  const rowBg     = esPrimero ? "#fef9c3" : esSegundo ? "#f0fdf4" : idx % 2 === 0 ? WHITE : LGRAY;
                  return (
                    <tr key={q.id} style={{ background: rowBg, borderBottom: `1px solid ${LGRAY2}` }}>
                      <td style={{ padding: "4px 6px", width: rNameW, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          {esPrimero && <span style={{ fontSize: rFontNm, flexShrink: 0 }}>🥇</span>}
                          {esSegundo && <span style={{ fontSize: rFontNm, flexShrink: 0 }}>🥈</span>}
                          <span style={{ color: "#111827", fontSize: rFontNm, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {q.nombreCliente ?? q.folio}
                          </span>
                        </div>
                      </td>
                      {partidos.map((p) => {
                        const cell  = picksForPartido(q.picks, p.id);
                        const hasR  = p.resultado !== null;
                        const s     = cell && hayResultados ? pickStyle(cell.acertado, hasR) : { bg: "#d1d5db", color: "#6b7280" };
                        const label = cell && hayResultados ? cell.label : "?";
                        return (
                          <td key={`${q.id}-${p.id}`} style={{ width: rColW, textAlign: "center", padding: "3px 1px" }}>
                            <div style={{ background: s.bg, borderRadius: 4, height: rCellH, width: rColW - 4, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ color: s.color, fontSize: rFontSM, fontWeight: 800 }}>{label}</span>
                            </div>
                          </td>
                        );
                      })}
                      <td style={{ width: rPtsW, textAlign: "center", padding: "3px 2px" }}>
                        <div style={{ background: esPrimero ? "#fbbf24" : esSegundo ? "#86efac" : LGRAY2, borderRadius: 4, height: rCellH, width: rPtsW - 6, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: esPrimero ? "#78350f" : esSegundo ? "#14532d" : "#6b7280", fontSize: rFontSM + 2, fontWeight: 900 }}>
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
          <div style={{ padding: "8px 14px", borderTop: `1px solid ${LGRAY2}`, textAlign: "center", background: LGRAY }}>
            <span style={{ color: "#9ca3af", fontSize: 9 }}>tablitasquinielas.com · {pageUrl}</span>
          </div>
        </div>

        {/* Legend */}
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
          <a href="/consultar" className="text-amber-700 text-sm font-medium hover:underline">← Consultar mi quiniela</a>
        </div>
      </div>
    </div>
  );
}
