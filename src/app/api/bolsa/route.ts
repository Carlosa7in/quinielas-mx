import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";

import { PORCENTAJE_DUENOS, COMISION_TIENDA } from "@/lib/config";
import { calcularFechaCierre } from "@/lib/fechas";

// GET /api/bolsa — pública, sin auth
export async function GET() {
  // 1. Todas las jornadas abiertas (incluyendo las que aún no tienen quinielas)
  const jornadasAbiertas = await prisma.jornada.findMany({
    where: { estado: "abierta" },
    select: { id: true, nombre: true, numero: true, liga: true },
    orderBy: { numero: "desc" },
  });

  // 2. Ligas de los partidos por jornada (para Mixta — sin DateTime, Prisma funciona ok)
  const ids = jornadasAbiertas.map((j) => j.id);
  const partidosLigaRows = ids.length > 0
    ? await prisma.partido.findMany({
        where: { jornadaId: { in: ids } },
        select: { jornadaId: true, liga: true },
      })
    : [];
  const ligasDetalleMap = new Map<string, string[]>();
  for (const p of partidosLigaRows) {
    if (!ligasDetalleMap.has(p.jornadaId)) ligasDetalleMap.set(p.jornadaId, []);
    const arr = ligasDetalleMap.get(p.jornadaId)!;
    if (!arr.includes(p.liga)) arr.push(p.liga);
  }

  // 4. Quinielas confirmadas de esas jornadas
  const quinielas = ids.length > 0
    ? await prisma.quiniela.findMany({
        where: { jornadaId: { in: ids }, estadoPago: "confirmado" },
        select: { jornadaId: true, monto: true, canal: true },
      })
    : [];

  // 5. Primer partido por jornada via neon() directo (PrismaNeonHTTP devuelve {} para DateTime)
  const primerPartidoPorJornada = new Map<string, Date>();
  for (const jornada of jornadasAbiertas) {
    try {
      const rows = await sql`
        SELECT "fechaHora" FROM "Partido"
        WHERE "jornadaId" = ${jornada.id}
          AND "fechaHora" IS NOT NULL
        ORDER BY "fechaHora" ASC
        LIMIT 1
      `;
      const val = rows[0]?.fechaHora;
      if (val) {
        const d = val instanceof Date ? val : new Date(String(val));
        if (!isNaN(d.getTime())) primerPartidoPorJornada.set(jornada.id, d);
      }
    } catch { /* silencioso */ }

    // Fallback: fechaInicio de la jornada si no hay partido con fecha
    if (!primerPartidoPorJornada.has(jornada.id)) {
      try {
        const rows = await sql`
          SELECT "fechaInicio" FROM "Jornada" WHERE id = ${jornada.id}
        `;
        const val = rows[0]?.fechaInicio;
        if (val) {
          const d = val instanceof Date ? val : new Date(String(val));
          if (!isNaN(d.getTime())) {
            primerPartidoPorJornada.set(jornada.id, new Date(d.getTime() + 18 * 3_600_000));
          }
        }
      } catch { /* silencioso */ }
    }
  }

  // 6. Calcular bolsa por jornada
  type JornadaBolsa = {
    id: string; nombre: string | null; numero: number; liga: string;
    ligasDetalle: string[];
    totalQuinielas: number; recaudado: number;
    bolsa: number;
    primerPartidoFecha: string | null;
  };

  const jornadasResult: JornadaBolsa[] = jornadasAbiertas.map((j) => {
    const qs = quinielas.filter((q) => q.jornadaId === j.id);
    const recaudado = qs.reduce((s, q) => s + q.monto, 0);
    const tienda = qs.filter((q) => q.canal === "tienda").length;
    const cutDuenos = recaudado * PORCENTAJE_DUENOS;
    const cutTienda = tienda * COMISION_TIENDA;
    const bolsa = Math.max(recaudado - cutDuenos - cutTienda, 0);

    const base = primerPartidoPorJornada.get(j.id) ?? null;
    const fechaCierre = base ? calcularFechaCierre(base) : null;

    return {
      id: j.id,
      nombre: j.nombre,
      numero: j.numero,
      liga: j.liga,
      ligasDetalle: ligasDetalleMap.get(j.id) ?? [],
      totalQuinielas: qs.length,
      recaudado,
      bolsa,
      primerPartidoFecha: fechaCierre ? fechaCierre.toISOString() : null,
    };
  });

  // 5. Totales globales
  const totalRecaudado = quinielas.reduce((s, q) => s + q.monto, 0);
  const quinielasTienda = quinielas.filter((q) => q.canal === "tienda").length;
  const cutDuenosTotal = totalRecaudado * PORCENTAJE_DUENOS;
  const cutTiendaTotal = quinielasTienda * COMISION_TIENDA;
  const bolsaTotal = Math.max(totalRecaudado - cutDuenosTotal - cutTiendaTotal, 0);

  // primerPartidoFecha global (el más próximo entre todas las jornadas) — mantener por compat.
  const todasLasFechas = jornadasResult
    .map((j) => j.primerPartidoFecha)
    .filter(Boolean)
    .sort() as string[];
  const primerPartidoFechaGlobal = todasLasFechas[0] ?? null;

  return NextResponse.json({
    bolsa: bolsaTotal,
    totalRecaudado,
    totalQuinielas: quinielas.length,
    jornadas: jornadasResult,
    primerPartidoFecha: primerPartidoFechaGlobal, // compat. con código existente
  });
}
