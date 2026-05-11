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

function abrev(nombre: string, n = 4): string {
  return nombre.length > n ? nombre.slice(0, n) : nombre;
}

function fmt(n: number): string {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

function pickBg(acertado: boolean | null, hasResult: boolean) {
  if (hasResult && acertado === true)  return { bg: "#22c55e", text: "#fff" };
  if (hasResult && acertado === false) return { bg: "#f87171", text: "#fff" };
  return { bg: "#f3f4f6", text: "#6b7280" };
}

export default function ResultadosPage() {
  const params = useParams();
  const jornadaId = params.jornadaId as string;

  const [data, setData]       = useState<ResultadosData | null>(null);
  const [error, setError]     = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [generando, setGenerando] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/resultados/${jornadaId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Error al cargar los resultados"));
  }, [jornadaId]);

  const hayAlgunResultado = useMemo(
    () => data?.partidos.some((p) => p.resultado !== null) ?? false,
    [data]
  );

  const quinielasFiltradas = useMemo(() => {
    if (!data) return [];
    const q = busqueda.trim().toLowerCase();
    return q ? data.quinielas.filter((q2) => (q2.nombreCliente ?? "").toLowerCase().includes(q)) : data.quinielas;
  }, [data, busqueda]);

  const generarImagen = async () => {
    if (!gridRef.current) return;
    setGenerando(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: "#1c1917",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
      const file = new File([blob], "resultados.png", { type: "image/png" });
      const url  = URL.createObjectURL(blob);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Resultados Quiniela", url: window.location.href });
      } else {
        const a = document.createElement("a");
        a.href = url; a.download = "resultados.png"; a.click();
      }
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
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
  const COL_W = 38; // px por columna de partido
  const NAME_W = 130;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-brand text-white px-4 py-4">
        <div className="max-w-screen-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas" className="h-10 w-auto object-contain shrink-0" />
            <div>
              <p className="text-amber-300/70 text-xs">{jornada.liga} · {jornada.temporada}</p>
              <h1 className="text-lg font-bold leading-tight">{nombreJornada}</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm mb-2">
            <div className="bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-yellow-300 font-bold">1° ${fmt(premios.bolsa1)}</span>
              {premios.primeroCount > 0 && <span className="text-amber-300/60 text-xs">({premios.primeroCount} ganador{premios.primeroCount !== 1 ? "es" : ""})</span>}
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-white font-bold">2° ${fmt(premios.bolsa2)}</span>
              {premios.segundoCount > 0 && <span className="text-white/50 text-xs">({premios.segundoCount})</span>}
              {jornada.bolsa2Acumulada > 0 && <span className="text-amber-400 text-xs">acumulado</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto px-3 py-3 space-y-3">

        {/* Búsqueda + botón imagen */}
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
            disabled={generando || !hayAlgunResultado}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold px-3 py-2 rounded-xl text-sm transition-colors shrink-0 flex items-center gap-1.5"
          >
            {generando ? "⏳" : "📸"} {generando ? "..." : "Imagen"}
          </button>
        </div>

        {!hayAlgunResultado && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800 text-center">
            Los picks se revelan una vez que inicien los partidos.
          </div>
        )}

        {/* ── Grid ── */}
        <div ref={gridRef} style={{ background: "#1c1917", borderRadius: 16, overflow: "hidden", padding: "12px 8px" }}>

          {/* Título dentro de la imagen */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingLeft: 4 }}>
            <div>
              <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>TABLITAS QUINIELAS</div>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{nombreJornada}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              {premios.primeroCount > 0 && (
                <div style={{ color: "#fde047", fontSize: 11, fontWeight: 700 }}>
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

          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", minWidth: NAME_W + partidos.length * COL_W + 44, width: "100%" }}>

              {/* ─── Cabecera: LOCAL / MARCADOR / VISITA por columna ─── */}
              <thead>
                <tr>
                  {/* Nombre col header */}
                  <th style={{ width: NAME_W, minWidth: NAME_W, textAlign: "left", verticalAlign: "bottom", paddingBottom: 4, paddingLeft: 4 }}>
                    <span style={{ color: "#6b7280", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>NOMBRE</span>
                  </th>

                  {/* Partido columns */}
                  {partidos.map((p) => {
                    const score = p.golesLocal !== null && p.golesVisita !== null
                      ? `${p.golesLocal}-${p.golesVisita}`
                      : "—";
                    const hasScore = score !== "—";
                    return (
                      <th key={p.id} style={{ width: COL_W, minWidth: COL_W, textAlign: "center", padding: "0 1px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          {/* LOCAL */}
                          <div style={{ background: "#292524", borderRadius: 4, padding: "2px 3px", width: "100%", textAlign: "center" }}>
                            <span style={{ color: "#e7e5e4", fontSize: 9, fontWeight: 700, display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                              {abrev(p.equipoLocal, 5)}
                            </span>
                          </div>
                          {/* MARCADOR */}
                          <div style={{ background: hasScore ? "#16a34a" : "#292524", borderRadius: 4, padding: "2px 3px", width: "100%", textAlign: "center" }}>
                            <span style={{ color: hasScore ? "#fff" : "#6b7280", fontSize: 10, fontWeight: 800, display: "block" }}>
                              {score}
                            </span>
                          </div>
                          {/* VISITA */}
                          <div style={{ background: "#292524", borderRadius: 4, padding: "2px 3px", width: "100%", textAlign: "center" }}>
                            <span style={{ color: "#a8a29e", fontSize: 9, fontWeight: 700, display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                              {abrev(p.equipoVisita, 5)}
                            </span>
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* PTS col */}
                  <th style={{ width: 44, textAlign: "center", verticalAlign: "bottom", paddingBottom: 4 }}>
                    <span style={{ color: "#6b7280", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>PTS</span>
                  </th>
                </tr>
              </thead>

              {/* ─── Filas de participantes ─── */}
              <tbody>
                {quinielasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={partidos.length + 2} style={{ textAlign: "center", padding: "24px 0", color: "#6b7280", fontSize: 12 }}>
                      {busqueda ? "Sin resultados" : "Sin quinielas"}
                    </td>
                  </tr>
                )}

                {quinielasFiltradas.map((q, idx) => {
                  const esPrimero  = premios.maxAciertos    !== null && q.aciertos === premios.maxAciertos;
                  const esSegundo  = premios.segundoAciertos !== null && q.aciertos === premios.segundoAciertos;
                  const rowBg      = esPrimero ? "#422006" : esSegundo ? "#292524" : idx % 2 === 0 ? "#1c1917" : "#211f1e";

                  return (
                    <tr key={q.id} style={{ background: rowBg }}>
                      {/* Nombre */}
                      <td style={{ padding: "3px 4px", width: NAME_W, minWidth: NAME_W }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {esPrimero && <span style={{ color: "#fbbf24", fontSize: 9, fontWeight: 800 }}>1°</span>}
                          {esSegundo && <span style={{ color: "#9ca3af", fontSize: 9, fontWeight: 800 }}>2°</span>}
                          <span style={{ color: "#e7e5e4", fontSize: 11, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: NAME_W - 24 }}>
                            {q.nombreCliente ?? q.folio}
                          </span>
                        </div>
                      </td>

                      {/* Picks */}
                      {partidos.map((p) => {
                        const cell = picksForPartido(q.picks, p.id);
                        const hasResult = p.resultado !== null;
                        if (!hayAlgunResultado || !cell) {
                          return (
                            <td key={`${q.id}-${p.id}`} style={{ width: COL_W, minWidth: COL_W, textAlign: "center", padding: "3px 1px" }}>
                              <div style={{ background: "#292524", borderRadius: 4, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ color: "#57534e", fontSize: 10, fontWeight: 700 }}>?</span>
                              </div>
                            </td>
                          );
                        }
                        const { bg, text } = pickBg(cell.acertado, hasResult);
                        return (
                          <td key={`${q.id}-${p.id}`} style={{ width: COL_W, minWidth: COL_W, textAlign: "center", padding: "3px 1px" }}>
                            <div style={{ background: bg, borderRadius: 4, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ color: text, fontSize: 10, fontWeight: 700 }}>{cell.label}</span>
                            </div>
                          </td>
                        );
                      })}

                      {/* PTS */}
                      <td style={{ width: 44, textAlign: "center", padding: "3px 2px" }}>
                        <div style={{
                          background: esPrimero ? "#fbbf24" : esSegundo ? "#9ca3af" : "#292524",
                          borderRadius: 6,
                          height: 24,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          margin: "0 auto",
                          width: 36,
                        }}>
                          <span style={{ color: esPrimero ? "#7c2d12" : esSegundo ? "#1c1917" : "#a8a29e", fontSize: 12, fontWeight: 800 }}>
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

          {/* Footer en imagen */}
          <div style={{ textAlign: "center", marginTop: 10, color: "#57534e", fontSize: 9 }}>
            tablitasquinielas.com · Ver resultados completos: {typeof window !== "undefined" ? window.location.href : ""}
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 px-1">
          {[
            { bg: "bg-green-500", label: "Acertado" },
            { bg: "bg-red-400",   label: "Fallado" },
            { bg: "bg-gray-200",  label: "Pendiente" },
            { bg: "bg-yellow-400",label: "1° Lugar" },
            { bg: "bg-gray-400",  label: "2° Lugar" },
          ].map(({ bg, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`inline-block w-4 h-3.5 rounded ${bg}`} />
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
