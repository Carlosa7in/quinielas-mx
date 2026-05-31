import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/lib/prisma";

// Mapeo liga DB → slug ESPN (igual que en /api/live)
const LIGA_ESPN: Record<string, string> = {
  "Liga MX":                  "mex.1",
  "Liga MX Femenil":          "mex.w.1",
  "Champions League":         "uefa.champions",
  "UEFA Champions League":    "uefa.champions",
  "UEFA Europa League":       "uefa.europa",
  "Premier League":           "eng.1",
  "La Liga":                  "esp.1",
  "Serie A":                  "ita.1",
  "Bundesliga":               "ger.1",
  "Ligue 1":                  "fra.1",
  "MLS":                      "usa.1",
  "Mundial":                  "fifa.world",
  "FIFA World Cup":           "fifa.world",
  "World Cup 2026":           "fifa.world",
  "Copa Libertadores":        "conmebol.libertadores",
  "Liga Portuguesa":          "por.1",
  "Eredivisie":               "ned.1",
  "Liga Argentina":           "arg.1",
  "Apertura":                 "mex.1",
  "Clausura":                 "mex.1",
  "Mixta":                    "mex.1",
  "Amistoso":                       "fifa.friendly",
  "Amistosos":                      "fifa.friendly",
  "Amistoso Internacional":         "fifa.friendly",
  "Amistosos Internacional":        "fifa.friendly",
  "Amistoso Mundial":               "fifa.friendly",
  "Amistosos Mundial":              "fifa.friendly",
  "Internacional":                  "fifa.friendly",
  "Friendly":                       "fifa.friendly",
  "FIFA Friendly":                  "fifa.friendly",
  "CONCACAF":                       "concacaf.champions",
  "CONCACAF Champions":             "concacaf.champions",
  "CONCACAF Champions Cup":         "concacaf.champions",
  "CONCACAF Champions League":      "concacaf.champions",
  "Concacaf Champions Cup":         "concacaf.champions",
  "Concacaf Champions League":      "concacaf.champions",
  "Concacaf Champions":             "concacaf.champions",
  "CONCACAF League":                "concacaf.leagues",
  "Concacaf League":                "concacaf.leagues",
};

// GET /api/admin/fix-horas-espn?jornadaId=xxx&dry=true
// dry=true  → solo reporta diferencias sin guardar
// dry=false → corrige en DB
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "admin" && token?.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const jornadaId = searchParams.get("jornadaId");
  const dry = searchParams.get("dry") !== "false"; // default: solo reporte

  // 1. Obtener partidos con espnId de la jornada (o todas las abiertas si no se especifica)
  const rows = jornadaId
    ? await sql`
        SELECT p.id, p."espnId", p.liga,
          to_char(p."fechaHora", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "fechaHoraUTC"
        FROM "Partido" p
        WHERE p."jornadaId" = ${jornadaId}
          AND p."espnId" IS NOT NULL
          AND p."fechaHora" IS NOT NULL
        ORDER BY p."fechaHora" ASC
      `
    : await sql`
        SELECT p.id, p."espnId", p.liga,
          to_char(p."fechaHora", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "fechaHoraUTC"
        FROM "Partido" p
        JOIN "Jornada" j ON j.id = p."jornadaId"
        WHERE j.estado = 'abierta'
          AND p."espnId" IS NOT NULL
          AND p."fechaHora" IS NOT NULL
        ORDER BY p."fechaHora" ASC
      `;

  const resultados: {
    id: string; espnId: string; liga: string;
    horaDB: string; horaESPN: string | null;
    difMin: number | null; corregido: boolean; error?: string;
  }[] = [];

  for (const row of rows) {
    const espnId  = String(row.espnId);
    const liga    = String(row.liga);
    const horaDB  = String(row.fechaHoraUTC);
    const slug    = LIGA_ESPN[liga] ?? "mex.1";

    let horaESPN: string | null = null;
    let difMin: number | null = null;
    let corregido = false;
    let error: string | undefined;

    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${espnId}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
      const data = await res.json();
      const dateStr: string | undefined =
        data?.header?.competitions?.[0]?.date ??
        data?.gameInfo?.venue?.date ??
        undefined;

      if (!dateStr) throw new Error("ESPN no devolvió fecha");

      horaESPN = new Date(dateStr).toISOString().replace(".000Z", "Z");

      // Diferencia en minutos
      difMin = Math.round(
        (new Date(horaDB).getTime() - new Date(horaESPN).getTime()) / 60_000
      );

      // Corregir si hay diferencia (> 2 min para evitar ruido de segundos)
      if (!dry && Math.abs(difMin) > 2) {
        await sql`
          UPDATE "Partido"
          SET "fechaHora" = ${horaESPN}::timestamptz
          WHERE id = ${String(row.id)}
        `;
        corregido = true;
      }
    } catch (e) {
      error = String(e);
    }

    resultados.push({
      id: String(row.id), espnId, liga,
      horaDB, horaESPN, difMin, corregido,
      ...(error ? { error } : {}),
    });
  }

  const conDif    = resultados.filter((r) => r.difMin !== null && Math.abs(r.difMin) > 2);
  const corregidos = resultados.filter((r) => r.corregido);
  const errores   = resultados.filter((r) => r.error);

  return NextResponse.json({
    dry,
    total: resultados.length,
    conDiferencia: conDif.length,
    corregidos: corregidos.length,
    errores: errores.length,
    detalle: resultados,
  });
}
