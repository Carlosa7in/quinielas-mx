import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularFechaCierre } from "@/lib/fechas";

// GET /api/jornadas/todas — todas las jornadas con stats básicas
export async function GET() {
  try {
    // Query 1: datos básicos de jornadas (incluye fechaInicio para fallback de cierre)
    const jornadas = await prisma.jornada.findMany({
      select: {
        id: true,
        numero: true,
        nombre: true,
        temporada: true,
        liga: true,
        estado: true,
        fechaInicio: true,
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

    // Query 4: todos los partidos con fechaHora — calculamos el mínimo por jornada en JS
    // (evita el problema de DISTINCT ON + ORDER BY en NeonDB que lanza error 500)
    const partidosFecha = await prisma.partido.findMany({
      where: { jornadaId: { in: ids } },
      orderBy: { fechaHora: "asc" },
      select: { jornadaId: true, fechaHora: true },
    });

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

    // Primer partido por jornada: como ya vienen ordenados asc, el primer registro de cada
    // jornadaId es el más próximo en el tiempo.
    const pMap = new Map<string, Date>();
    for (const row of partidosFecha) {
      if (pMap.has(row.jornadaId)) continue; // ya tenemos el primero
      if (!row.fechaHora) continue;
      const d = row.fechaHora instanceof Date ? row.fechaHora : new Date(String(row.fechaHora));
      if (!isNaN(d.getTime())) pMap.set(row.jornadaId, d);
    }

    const resultado = jornadas.map((j) => {
      const qs = qMap.get(j.id) ?? [];

      // Base para calcular cierre: primer partido si tiene fecha, si no fechaInicio + 18h
      // (18 h sobre UTC-midnight garantiza que calcularFechaCierre vea el día correcto en CDMX)
      let baseParaCierre: Date | null = pMap.get(j.id) ?? null;
      if (!baseParaCierre && j.fechaInicio) {
        const fi = j.fechaInicio instanceof Date ? j.fechaInicio : new Date(j.fechaInicio);
        if (!isNaN(fi.getTime())) baseParaCierre = new Date(fi.getTime() + 18 * 3_600_000);
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
        // Fecha de cierre = 11pm CDMX del día anterior al primer partido (o fechaInicio)
        primerPartidoFecha: baseParaCierre ? calcularFechaCierre(baseParaCierre) : null,
      };
    });

    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[/api/jornadas/todas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
