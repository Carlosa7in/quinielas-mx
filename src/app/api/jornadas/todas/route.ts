import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calcularFechaCierre } from "@/lib/fechas";

// GET /api/jornadas/todas — todas las jornadas con stats básicas
export async function GET() {
  try {
    // Query 1: datos básicos sin campos DateTime (NeonDB devuelve {} para DateTime en findMany)
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
    const idList = Prisma.join(ids);

    // Query 2: quinielas de esas jornadas
    const quinielas = await prisma.quiniela.findMany({
      where: { jornadaId: { in: ids } },
      select: { jornadaId: true, monto: true, estado: true },
    });

    // Query 3: count de partidos por jornada (sin DateTime para evitar crash en NeonDB)
    const partidosCount = await prisma.partido.findMany({
      where: { jornadaId: { in: ids } },
      select: { jornadaId: true },
    });

    // Query 4: primer partido por jornada via raw SQL con DISTINCT ON
    // (Prisma findMany con DateTime en select crashea en NeonDB devolviendo {})
    const pMap = new Map<string, Date>();
    try {
      const rows = await prisma.$queryRaw<{ jornadaId: string; fechaHora: unknown }[]>`
        SELECT DISTINCT ON ("jornadaId") "jornadaId", "fechaHora"
        FROM "Partido"
        WHERE "jornadaId" IN (${idList})
          AND "fechaHora" IS NOT NULL
        ORDER BY "jornadaId", "fechaHora" ASC
      `;
      for (const r of rows) {
        if (!r.fechaHora) continue;
        const d = r.fechaHora instanceof Date ? r.fechaHora : new Date(String(r.fechaHora));
        if (!isNaN(d.getTime())) pMap.set(r.jornadaId, d);
      }
    } catch (e) {
      console.error("[/api/jornadas/todas] fechaHora raw query failed:", e);
    }

    // Query 5: fechaInicio via raw SQL (fallback cuando no hay fechaHora en partidos)
    const fiMap = new Map<string, Date>();
    try {
      const rows = await prisma.$queryRaw<{ id: string; fechaInicio: unknown }[]>`
        SELECT id, "fechaInicio" FROM "Jornada"
        WHERE id IN (${idList})
          AND "fechaInicio" IS NOT NULL
      `;
      for (const r of rows) {
        if (!r.fechaInicio) continue;
        const d = r.fechaInicio instanceof Date ? r.fechaInicio : new Date(String(r.fechaInicio));
        if (!isNaN(d.getTime())) fiMap.set(r.id, d);
      }
    } catch (e) {
      console.error("[/api/jornadas/todas] fechaInicio raw query failed:", e);
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

    const resultado = jornadas.map((j) => {
      const qs = qMap.get(j.id) ?? [];

      // Base para cierre: primer partido si tiene fecha, si no fechaInicio + 18h
      // (+18h sobre UTC-midnight para que calcularFechaCierre vea el día correcto en CDMX)
      let baseParaCierre: Date | null = pMap.get(j.id) ?? null;
      if (!baseParaCierre) {
        const fi = fiMap.get(j.id);
        if (fi) baseParaCierre = new Date(fi.getTime() + 18 * 3_600_000);
      }

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
        primerPartidoFecha: baseParaCierre ? calcularFechaCierre(baseParaCierre) : null,
      };
    });

    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[/api/jornadas/todas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
