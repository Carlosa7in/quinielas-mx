import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Query 4: primer partido por jornada usando findFirst por jornada
    // (findFirst con DateTime funciona en NeonDB; findMany con DateTime crashea devolviendo {})
    const pMap = new Map<string, Date>();
    for (const id of ids) {
      try {
        const p = await prisma.partido.findFirst({
          where: { jornadaId: id },
          orderBy: { fechaHora: "asc" },
          select: { fechaHora: true },
        });
        if (p?.fechaHora) {
          const d = p.fechaHora instanceof Date ? p.fechaHora : new Date(String(p.fechaHora));
          if (!isNaN(d.getTime())) pMap.set(id, d);
        }
      } catch { /* silencioso por jornada */ }
    }

    // Query 5: fechaInicio de cada jornada como fallback (también con findFirst)
    const fiMap = new Map<string, Date>();
    for (const id of ids) {
      try {
        const j = await prisma.jornada.findUnique({
          where: { id },
          select: { fechaInicio: true },
        });
        if (j?.fechaInicio) {
          const d = j.fechaInicio instanceof Date ? j.fechaInicio : new Date(String(j.fechaInicio));
          if (!isNaN(d.getTime())) fiMap.set(id, d);
        }
      } catch { /* silencioso por jornada */ }
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
      // (+18h sobre UTC-midnight garantiza que calcularFechaCierre vea el día correcto en CDMX)
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
