import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Query 3: primer partido por jornada
    const partidos = await prisma.partido.findMany({
      where: { jornadaId: { in: ids } },
      select: { jornadaId: true, fechaHora: true },
    });

    // Construir mapas
    const qMap = new Map<string, { monto: number; estado: string }[]>();
    for (const q of quinielas) {
      if (!qMap.has(q.jornadaId)) qMap.set(q.jornadaId, []);
      qMap.get(q.jornadaId)!.push({ monto: q.monto, estado: q.estado });
    }

    const pMap = new Map<string, Date>();
    for (const p of partidos) {
      const curr = pMap.get(p.jornadaId);
      if (!curr || p.fechaHora < curr) pMap.set(p.jornadaId, p.fechaHora);
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
        totalPartidos: partidos.filter((p) => p.jornadaId === j.id).length,
        recaudado: qs.reduce((s, q) => s + q.monto, 0),
        ganadoras: qs.filter((q) => q.estado === "ganadora").length,
        primerPartidoFecha: pMap.get(j.id) ?? null,
      };
    });

    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[/api/jornadas/todas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
