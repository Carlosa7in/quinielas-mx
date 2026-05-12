import { ImageResponse } from "next/og";
import { prisma, sql } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Constantes de premios ──────────────────────────────────────────────────────
const PORC_PRIMERO = 0.60;
const PORC_SEGUNDO = 0.25;

// ── Dimensiones ───────────────────────────────────────────────────────────────
const W       = 900;
const NAME_W  = 170;
const PTS_W   = 54;

const H_HEADER      = 56;
const H_TITLE       = 36;
const H_PRIZE       = 34;
const H_TOTALS      = 26;
const H_RES_BAR     = 22;
const H_LOGO_ROW    = 52;
const H_SCORE_ROW   = 28;
const H_NUM_ROW     = 26;
const H_DATA        = 26;
const H_FOOTER      = 8;

const FIXED_H = H_HEADER + H_TITLE + H_PRIZE + H_TOTALS + H_RES_BAR +
                H_LOGO_ROW * 2 + H_SCORE_ROW + H_NUM_ROW + H_FOOTER;

// ── Helpers ───────────────────────────────────────────────────────────────────
const PRED: Record<string, string> = { "1": "L", "X": "E", "2": "V" };

function fmt(n: number) {
  return n.toLocaleString("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jornadaId: string }> }
) {
  const { jornadaId } = await params;

  try {
    // Jornada (sql directo — evita bug DateTime de NeonHTTP)
    const jRows = await sql`
      SELECT id, numero, nombre, temporada, liga, "bolsa2Acumulada"
      FROM "Jornada" WHERE id = ${jornadaId}
    `;
    const jornada = jRows[0] as {
      id: string; numero: number; nombre: string | null;
      temporada: string; liga: string; bolsa2Acumulada: number;
    } | undefined;
    if (!jornada) return new Response("Not found", { status: 404 });

    // Partidos
    const partidos = await prisma.partido.findMany({
      where: { jornadaId },
      orderBy: { orden: "asc" },
      select: {
        id: true, orden: true, equipoLocal: true, equipoVisita: true,
        resultado: true, golesLocal: true, golesVisita: true,
      },
    });

    // Logos
    const teamNames = [...new Set(partidos.flatMap(p => [p.equipoLocal, p.equipoVisita]))];
    const equipos = await prisma.equipo.findMany({
      where: { nombre: { in: teamNames } },
      select: { nombre: true, logoUrl: true },
    });
    const logoMap: Record<string, string> = Object.fromEntries(
      equipos.map(e => [e.nombre, e.logoUrl])
    );
    const ps = partidos.map(p => ({
      ...p,
      logoLocal:  logoMap[p.equipoLocal]  ?? "",
      logoVisita: logoMap[p.equipoVisita] ?? "",
    }));

    // Quinielas en juego
    const quinielas = await prisma.quiniela.findMany({
      where: {
        jornadaId,
        OR: [{ canal: "tienda" }, { estadoPago: "confirmado" }],
        estadoPago: { not: "no_realizado" },
      },
      select: {
        id: true, folio: true, nombreCliente: true, aciertos: true, monto: true,
        picks: { select: { prediccion: true, acertado: true, partidoId: true } },
      },
    });

    // Ordenar: aciertos desc, folio asc
    const sorted = [...quinielas].sort((a, b) => {
      const aA = a.aciertos ?? -1, bA = b.aciertos ?? -1;
      if (bA !== aA) return bA - aA;
      return a.folio.localeCompare(b.folio);
    });

    // Premios
    const totalRecaudado = quinielas.reduce((s, q) => s + q.monto, 0);
    const bolsa1 = totalRecaudado * PORC_PRIMERO;
    const bolsa2 = totalRecaudado * PORC_SEGUNDO + (Number(jornada.bolsa2Acumulada) ?? 0);

    const aciertosUnicos = [
      ...new Set(quinielas.map(q => q.aciertos).filter((a): a is number => a !== null)),
    ].sort((a, b) => b - a);
    const maxAciertos     = aciertosUnicos[0] ?? null;
    const segundoAciertos = aciertosUnicos[1] ?? null;
    const primeroCount = maxAciertos     !== null ? quinielas.filter(q => q.aciertos === maxAciertos).length     : 0;
    const segundoCount = segundoAciertos !== null ? quinielas.filter(q => q.aciertos === segundoAciertos).length : 0;

    // Ancho de columna de juego (dinámico)
    const gameW = Math.max(28, Math.floor((W - NAME_W - PTS_W) / Math.max(1, ps.length)));
    const totalH = FIXED_H + sorted.length * H_DATA;

    // ── Paleta ───────────────────────────────────────────────────────────────
    const NAVY  = "#1e3a5f";
    const NAVY2 = "#162d4a";
    const WHITE = "#ffffff";
    const RED   = "#dc2626";
    const GREEN = "#16a34a";

    return new ImageResponse(
      (
        <div style={{ width: W, height: totalH, background: WHITE, display: "flex", flexDirection: "column", fontFamily: "Arial, sans-serif" }}>

          {/* ── Header ── */}
          <div style={{ height: H_HEADER, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <span style={{ color: "#fbbf24", fontSize: 10, fontWeight: 700, letterSpacing: 4 }}>TABLITAS QUINIELAS</span>
            <span style={{ color: WHITE, fontSize: 22, fontWeight: 900, marginTop: 2 }}>{jornada.liga} · {jornada.temporada}</span>
          </div>

          {/* ── Título jornada ── */}
          <div style={{ height: H_TITLE, background: RED, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: WHITE, fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>
              {(jornada.nombre ?? `JORNADA ${jornada.numero}`).toUpperCase()}
            </span>
          </div>

          {/* ── Premios ── */}
          <div style={{ height: H_PRIZE, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>1° LUGAR</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: RED, marginLeft: 6 }}>{fmt(bolsa1)}</span>
            <span style={{ fontSize: 16, color: "#94a3b8", marginLeft: 18, marginRight: 18 }}>/</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>2° LUGAR</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: RED, marginLeft: 6 }}>{fmt(bolsa2)}</span>
          </div>

          {/* ── Totales ── */}
          <div style={{ height: H_TOTALS, background: WHITE, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>Primeros lugares: {primeroCount}</span>
            <span style={{ width: 32 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>Segundos lugares: {segundoCount}</span>
          </div>

          {/* ── RESULTADOS bar ── */}
          <div style={{ height: H_RES_BAR, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: WHITE, fontSize: 11, fontWeight: 800, letterSpacing: 4 }}>RESULTADOS</span>
          </div>

          {/* ── LOCAL logos ── */}
          <div style={{ height: H_LOGO_ROW, background: "#e8edf2", display: "flex", alignItems: "center" }}>
            <div style={{ width: NAME_W, display: "flex", alignItems: "center", paddingLeft: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: NAVY, letterSpacing: 1 }}>LOCAL</span>
            </div>
            {ps.map(p => (
              <div key={`l-${p.id}`} style={{ width: gameW, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.logoLocal
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.logoLocal} width={38} height={38} style={{ objectFit: "contain" }} />
                  : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: WHITE, fontSize: 9, fontWeight: 800 }}>{p.equipoLocal.substring(0, 2).toUpperCase()}</span>
                    </div>
                }
              </div>
            ))}
            <div style={{ width: PTS_W }} />
          </div>

          {/* ── MARCADOR ── */}
          <div style={{ height: H_SCORE_ROW, background: NAVY2, display: "flex", alignItems: "center" }}>
            <div style={{ width: NAME_W, display: "flex", alignItems: "center", paddingLeft: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#93c5fd", letterSpacing: 1 }}>MARCADOR</span>
            </div>
            {ps.map(p => {
              const has = p.golesLocal !== null && p.golesVisita !== null;
              return (
                <div key={`m-${p.id}`} style={{ width: gameW, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: has ? WHITE : "#4b5563", fontSize: 11, fontWeight: 900 }}>
                    {has ? `${p.golesLocal}-${p.golesVisita}` : "·"}
                  </span>
                </div>
              );
            })}
            <div style={{ width: PTS_W }} />
          </div>

          {/* ── VISITA logos ── */}
          <div style={{ height: H_LOGO_ROW, background: "#e8edf2", display: "flex", alignItems: "center" }}>
            <div style={{ width: NAME_W, display: "flex", alignItems: "center", paddingLeft: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: NAVY, letterSpacing: 1 }}>VISITA</span>
            </div>
            {ps.map(p => (
              <div key={`v-${p.id}`} style={{ width: gameW, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.logoVisita
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.logoVisita} width={38} height={38} style={{ objectFit: "contain" }} />
                  : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: WHITE, fontSize: 9, fontWeight: 800 }}>{p.equipoVisita.substring(0, 2).toUpperCase()}</span>
                    </div>
                }
              </div>
            ))}
            <div style={{ width: PTS_W }} />
          </div>

          {/* ── Resultado por partido (NOMBRE) ── */}
          <div style={{ height: H_NUM_ROW, background: "#0a1e38", display: "flex", alignItems: "center" }}>
            <div style={{ width: NAME_W, display: "flex", alignItems: "center", paddingLeft: 14 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#93c5fd", letterSpacing: 1 }}>NOMBRE</span>
            </div>
            {ps.map(p => {
              const res = p.resultado ? (PRED[p.resultado] ?? p.resultado) : "·";
              const hasRes = !!p.resultado;
              return (
                <div key={`res-${p.id}`} style={{ width: gameW, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: hasRes ? "#fbbf24" : "#4b5563", fontSize: 11, fontWeight: 900 }}>{res}</span>
                </div>
              );
            })}
            <div style={{ width: PTS_W, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: WHITE, fontSize: 9, fontWeight: 800 }}>PTS</span>
            </div>
          </div>

          {/* ── Filas de datos ── */}
          {sorted.map((q, idx) => {
            const es1 = maxAciertos     !== null && q.aciertos === maxAciertos;
            const es2 = segundoAciertos !== null && q.aciertos === segundoAciertos;
            const rowBg = es1 ? "#fef9c3" : es2 ? "#f0fdf4" : idx % 2 === 0 ? WHITE : "#f9fafb";

            return (
              <div key={q.id} style={{ height: H_DATA, background: rowBg, display: "flex", alignItems: "center", borderBottom: "1px solid #f3f4f6" }}>
                {/* Nombre */}
                <div style={{ width: NAME_W, display: "flex", alignItems: "center", paddingLeft: 10, paddingRight: 6, overflow: "hidden" }}>
                  <span style={{ fontSize: 14, fontWeight: es1 || es2 ? 700 : 400, color: "#111827", whiteSpace: "nowrap" }}>
                    {es1 ? "🥇 " : es2 ? "🥈 " : ""}{q.nombreCliente ?? q.folio}
                  </span>
                </div>
                {/* Picks */}
                {ps.map(p => {
                  const arr = q.picks.filter(pk => pk.partidoId === p.id);
                  const label = arr.length > 0 ? arr.map(pk => PRED[pk.prediccion] ?? pk.prediccion).join("/") : "?";
                  const acertado = arr.some(pk => pk.acertado === true) ? true
                    : arr.every(pk => pk.acertado === false) && arr.length > 0 ? false : null;
                  const hasR = p.resultado !== null;
                  const bg = hasR && acertado === true  ? GREEN
                           : hasR && acertado === false ? RED
                           : "#d1d5db";
                  const tc = (hasR && acertado !== null) ? WHITE : "#374151";

                  return (
                    <div key={`${q.id}-${p.id}`} style={{ width: gameW, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ background: bg, borderRadius: 3, paddingLeft: 3, paddingRight: 3, paddingTop: 1, paddingBottom: 1, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 18 }}>
                        <span style={{ color: tc, fontSize: 13, fontWeight: 900, lineHeight: "16px" }}>{label}</span>
                      </div>
                    </div>
                  );
                })}
                {/* PTS */}
                <div style={{ width: PTS_W, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ background: es1 ? "#eab308" : es2 ? "#86efac" : "#e5e7eb", borderRadius: 3, paddingLeft: 4, paddingRight: 4, paddingTop: 1, paddingBottom: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: es1 ? "#78350f" : es2 ? "#14532d" : "#6b7280", lineHeight: "16px" }}>
                      {q.aciertos ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{ height: H_FOOTER, background: "#f1f5f9" }} />
        </div>
      ),
      { width: W, height: totalH }
    );

  } catch (err) {
    console.error("[IMAGEN] error:", err);
    return new Response("Error generando imagen: " + String(err), { status: 500 });
  }
}
