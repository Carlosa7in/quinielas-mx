import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularFechaCierre } from "@/lib/fechas";

// GET /api/jornadas/todas — todas las jornadas con stats básicas
export async function GET() {
  try {
    // Query 1: datos básicos de jornadas
    const jornadas = await prisma.jornada.findMany({
      select: {
        id: true,
        numero: true,
        nombre: true,
        temporada: true,
        liga: true,
        estado: true,
      },
      orderBy: [{ liga: "desc" }, { numero: "desc" }],
    });

    if (jornadas.length === 0) return NextResponse.json([]);

    const ids = jornadas.map((j) => j.id);

    // Query 2: quinielas de esas jornadas
    const quinielas = await prisma.quiniela.findMany({
      where: { jornadaId: { in: ids } },
      select: { jornadaId: true, monto: true, estado: true },
    });

    // Query 3: count of partidos per jornada (no fechaHora to avoid {} corruption crash)
    const partidosCount = await prisma.partido.findMany({
      where: { jornadaId: { in: ids } },
      select: { jornadaId: true },
    });

    // Query 4: min fechaHora per jornada via raw SQL (bypasses Prisma type coercion)
    let minFechas: { jornadaId: string; minFecha: Date }[] = [];
    try {
      minFechas = await prisma.$queryRaw<{ jornadaId: string; minFecha: Date }[]>`
        SELECT "jornadaId", MIN("fechaHora") AS "minFecha"
        FROM "Partido"
        WHERE "jornadaId" = ANY(${ids}::text[])
          AND "fechaHora" IS NOT NULL
        GROUP BY "jornadaId"
      `;
    } catch (e) {
      console.error("[/api/jornadas/todas] raw fechaHora query failed:", e);
      // Non-fatal: primerPartidoFecha will be null for all jornadas
    }

    // Construir mapas
    const qMap = new Map<string, { monto: number; estado: string }[]>();
    for (const q of quinielas) {
      if (!qMap.has(q.jornadaId)) qMap.set(q.jornadaId, []);
      qMap.get(q.jornadaId)!.push({ monto: q.monto, estado: q.estado });
    }

    const pCountMap = new Map<string, number>();
    for (const p of partidosCount) {
      pCountMap.set(p.jornadaId, (pCountMap.get(p.jornadaId) ?? 0) + 1);
    }

    const pMap = new Map<string, Date>();
    for (const row of minFechas) {
      pMap.set(row.jornadaId, row.minFecha);
    }

    const resultado = jornadas.map((j) => {
      const qs = qMap.get(j.id) ?? [];
      return {
        id: j.id,
        numero: j.numero,
        nombre: j.nombre ?? null,
        temporada: j.temporada,
        liga: j.liga,
        estado: j.estado,
        totalQuinielas: qs.length,
        totalPartidos: pCountMap.get(j.id) ?? 0,
        recaudado: qs.reduce((s, q) => s + q.monto, 0),
        ganadoras: qs.filter((q) => q.estado === "ganadora").length,
        // Fecha de cierre = día anterior al primer partido a las 23:00 CDMX
        primerPartidoFecha: pMap.has(j.id) ? calcularFechaCierre(pMap.get(j.id)!) : null,
      };
    });

    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[/api/jornadas/todas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
