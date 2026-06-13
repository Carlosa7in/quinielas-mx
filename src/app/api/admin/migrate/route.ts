import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/lib/prisma";

// GET /api/admin/migrate — agrega columnas nuevas a la DB (idempotente)
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin" && token?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const resultados: string[] = [];

  try {
    await sql`ALTER TABLE "Quiniela" ADD COLUMN IF NOT EXISTS "confirmadoPor" TEXT`;
    resultados.push("✅ confirmadoPor agregado");
  } catch (e) { resultados.push(`⚠️ confirmadoPor: ${e}`); }

  try {
    await sql`ALTER TABLE "Quiniela" ADD COLUMN IF NOT EXISTS "confirmadoEn" TIMESTAMPTZ`;
    resultados.push("✅ confirmadoEn agregado");
  } catch (e) { resultados.push(`⚠️ confirmadoEn: ${e}`); }

  // ── Corrección de horas UEFA Champions League Final 2026 ──────────────────
  // PSG vs Arsenal: ESPN ID 401862897, hora correcta 2026-05-30T16:00:00Z (10am CDMX)
  try {
    const r = await sql`
      UPDATE "Partido"
      SET "espnId"    = '401862897',
          "fechaHora" = '2026-05-30T16:00:00Z'::timestamptz
      WHERE liga ILIKE '%champion%'
        AND "fechaHora" BETWEEN '2026-05-30T00:00:00Z'::timestamptz
                            AND '2026-05-31T23:59:59Z'::timestamptz
        AND ("espnId" IS NULL OR "espnId" != '401862897')
    `;
    resultados.push(`✅ PSG vs Arsenal corregido (${Array.isArray(r) ? r.length : "?"} fila(s))`);
  } catch (e) { resultados.push(`⚠️ PSG vs Arsenal: ${e}`); }

  // ── Guardar espnId para Toluca vs Tigres (Final CONCACAF Champions Cup, 31 may 2026) ──
  try {
    const r = await sql`
      UPDATE "Partido"
      SET "espnId" = '401871783'
      WHERE "espnId" IS NULL
        AND (
          ("equipoLocal" ILIKE '%tigres%' AND "equipoVisita" ILIKE '%toluca%')
          OR
          ("equipoLocal" ILIKE '%toluca%' AND "equipoVisita" ILIKE '%tigres%')
        )
        AND liga ILIKE '%concacaf%'
    `;
    resultados.push(`✅ espnId Toluca vs Tigres CONCACAF Final (${Array.isArray(r) ? r.length : "?"} fila(s))`);
  } catch (e) { resultados.push(`⚠️ espnId Toluca vs Tigres CONCACAF: ${e}`); }

  // ── Guardar espnId para México vs Australia (31 may 2026, 1-0) ───────────
  try {
    const r = await sql`
      UPDATE "Partido"
      SET "espnId" = '401861775'
      WHERE "espnId" IS NULL
        AND (
          ("equipoLocal" ILIKE '%m_xico%' OR "equipoLocal" ILIKE '%mexico%' OR "equipoLocal" ILIKE '%méxico%')
          AND ("equipoVisita" ILIKE '%australia%')
        )
    `;
    resultados.push(`✅ espnId México vs Australia (${Array.isArray(r) ? r.length : "?"} fila(s))`);
  } catch (e) { resultados.push(`⚠️ espnId México vs Australia: ${e}`); }

  // ── espnIds Mundial 2026 (jornada inicio mundial, jun 11-14) ─────────────
  const mundialIds: { local: string; visita: string; espnId: string }[] = [
    { local: "México",         visita: "Sudáfrica",          espnId: "760415" },
    { local: "Corea del Sur",  visita: "Rep. Checa",         espnId: "760414" },
    { local: "Canadá",         visita: "Bosnia-Herzegovina", espnId: "760416" },
    { local: "Estados Unidos", visita: "Paraguay",           espnId: "760417" },
    { local: "Qatar",          visita: "Suiza",              espnId: "760420" },
    { local: "Brasil",         visita: "Marruecos",          espnId: "760419" },
    { local: "Australia",      visita: "Türkiye",            espnId: "760421" },
    { local: "Alemania",       visita: "Curacao",            espnId: "760422" },
    { local: "Alemania",       visita: "Curazao",            espnId: "760422" },
    { local: "Alemania",       visita: "Curaçao",            espnId: "760422" },
    { local: "Países Bajos",   visita: "Japón",              espnId: "760425" },
  ];
  for (const m of mundialIds) {
    try {
      await sql`
        UPDATE "Partido" SET "espnId" = ${m.espnId}
        WHERE "espnId" IS NULL
          AND "equipoLocal"  ILIKE ${m.local}
          AND "equipoVisita" ILIKE ${m.visita}
      `;
    } catch (e) { resultados.push(`⚠️ Mundial espnId ${m.espnId}: ${e}`); }
  }
  resultados.push("✅ espnIds Mundial 2026 aplicados");

  // ── Corrección automática de horas via ESPN para partidos con espnId ─────
  // Llama internamente al endpoint fix-horas-espn con dry=false
  try {
    const fixUrl = new URL("/api/admin/fix-horas-espn?dry=false", req.url);
    const fixRes = await fetch(fixUrl.toString(), {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    const fixData = await fixRes.json();
    resultados.push(`✅ fix-horas-espn: ${fixData.corregidos} corregidos, ${fixData.conDiferencia} con diferencia`);
  } catch (e) { resultados.push(`⚠️ fix-horas-espn: ${e}`); }

  return NextResponse.json({ ok: true, resultados });
}
