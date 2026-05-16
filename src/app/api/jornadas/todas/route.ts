import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";
import { calcularFechaCierre } from "@/lib/fechas";

// GET /api/jornadas/todas — todas las jornadas con stats básicas
export async function GET() {
  try {
    const jornadas = await prisma.jornada.findMany({
      select: { id: true, numero: true, nombre: true, temporada: true, liga: true, estado: true },
      orderBy: [{ liga: "desc" }, { numero: "desc" }],
    });

    if (jornadas.length === 0) return NextResponse.json([]);

    const ids = jornadas.map((j) => j.id);

    const quinielas = await prisma.quiniela.findMany({
      where: { jornadaId: { in: ids } },
      select: { jornadaId: true, monto: true, estado: true, estadoPago: true },
    });

    // Sin DateTime en select — NeonDB devuelve {} para DateTime en ORM
    const partidosCount = await prisma.partido.findMany({
      where: { jornadaId: { in: ids } },
      select: { jornadaId: true },
    });

    // Primer partido por jornada via neon() directo (único modo confiable con NeonDB)
    const pMap = new Map<string, Date>();
    for (const id of ids) {
      try {
        const rows = await sql`
          SELECT "fechaHora" FROM "Partido"
          WHERE "jornadaId" = ${id}
            AND "fechaHora" IS NOT NULL
          ORDER BY "fechaHora" ASC
          LIMIT 1
        `;
        const val = rows[0]?.fechaHora;
        if (val) {
          const d = val instanceof Date ? val : new Date(String(val));
          if (!isNaN(d.getTime())) pMap.set(id, d);
        }
      } catch (e) {
        console.error(`[/api/jornadas/todas] fechaHora failed for ${id}:`, e);
      }
    }

    const qMap = new Map<string, { monto: number; estado: string; estadoPago: string }[]>();
    for (const q of quinielas) {
      if (!qMap.has(q.jornadaId)) qMap.set(q.jornadaId, []);
      qMap.get(q.jornadaId)!.push({ monto: q.monto, estado: q.estado, estadoPago: q.estadoPago });
    }

    const pCountMap = new Map<string, number>();
    for (const p of partidosCount) {
      pCountMap.set(p.jornadaId, (pCountMap.get(p.jornadaId) ?? 0) + 1);
    }

    const resultado = jornadas.map((j) => {
      const qs = qMap.get(j.id) ?? [];
      const confirmadas = qs.filter((q) => q.estadoPago === "confirmado");
      const baseParaCierre: Date | null = pMap.get(j.id) ?? null;
      return {
        id: j.id,
        numero: j.numero,
        nombre: j.nombre ?? null,
        temporada: j.temporada,
        liga: j.liga,
        estado: j.estado,
        totalQuinielas: confirmadas.length,
        totalPartidos: pCountMap.get(j.id) ?? 0,
        recaudado: confirmadas.reduce((s, q) => s + q.monto, 0),
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
