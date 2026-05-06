import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";

import { PORCENTAJE_DUENOS, COMISION_TIENDA } from "@/lib/config";
import { calcularFechaCierre } from "@/lib/fechas";

// GET /api/bolsa — pública, sin auth
export async function GET() {
  // Primer partido de la jornada abierta via neon() directo.
  // PrismaNeonHTTP devuelve {} para DateTime en ORM y $queryRaw.
  // neon() retorna el valor como string ISO, que new Date() parsea correctamente.
  let primerPartidoFecha: Date | null = null;
  try {
    const rows = await sql`
      SELECT p."fechaHora"
      FROM "Partido" p
      JOIN "Jornada" j ON p."jornadaId" = j.id
      WHERE j.estado = 'abierta'
        AND p."fechaHora" IS NOT NULL
      ORDER BY p."fechaHora" ASC
      LIMIT 1
    `;
    const val = rows[0]?.fechaHora;
    if (val) {
      const d = val instanceof Date ? val : new Date(String(val));
      primerPartidoFecha = isNaN(d.getTime()) ? null : d;
    }
  } catch (e) {
    console.error("[/api/bolsa] fechaHora query failed:", e);
  }

  // Fallback: fechaInicio de la jornada (cuando ESPN aún no tiene horarios)
  if (!primerPartidoFecha) {
    try {
      const rows = await sql`
        SELECT "fechaInicio" FROM "Jornada"
        WHERE estado = 'abierta'
        ORDER BY numero DESC
        LIMIT 1
      `;
      const val = rows[0]?.fechaInicio;
      if (val) {
        const d = val instanceof Date ? val : new Date(String(val));
        if (!isNaN(d.getTime())) {
          primerPartidoFecha = new Date(d.getTime() + 18 * 3_600_000);
        }
      }
    } catch (e) {
      console.error("[/api/bolsa] fechaInicio fallback failed:", e);
    }
  }

  // Solo quinielas con pago confirmado cuentan para la bolsa
  const quinielas = await prisma.quiniela.findMany({
    where: { jornada: { estado: "abierta" }, estadoPago: "confirmado" },
    select: {
      monto: true,
      canal: true,
      jornada: { select: { id: true, nombre: true, numero: true, liga: true } },
    },
  });

  // Desglose por jornada
  const jornadasMap = new Map<string, {
    id: string; nombre: string | null; numero: number; liga: string;
    total: number; tienda: number; recaudado: number;
  }>();

  for (const q of quinielas) {
    const j = q.jornada;
    if (!jornadasMap.has(j.id)) {
      jornadasMap.set(j.id, { id: j.id, nombre: j.nombre, numero: j.numero, liga: j.liga, total: 0, tienda: 0, recaudado: 0 });
    }
    const entry = jornadasMap.get(j.id)!;
    entry.total++;
    entry.recaudado += q.monto;
    if (q.canal === "tienda") entry.tienda++;
  }

  const jornadas = [...jornadasMap.values()].map((j) => {
    const cutDuenos = j.recaudado * PORCENTAJE_DUENOS;
    const cutTienda = j.tienda * COMISION_TIENDA;
    const bolsa     = Math.max(j.recaudado - cutDuenos - cutTienda, 0);
    return { ...j, bolsa };
  });

  const totalRecaudado  = quinielas.reduce((s, q) => s + q.monto, 0);
  const quinielasTienda = quinielas.filter((q) => q.canal === "tienda").length;
  const cutDuenos       = totalRecaudado * PORCENTAJE_DUENOS;
  const cutTienda       = quinielasTienda * COMISION_TIENDA;
  const bolsa           = Math.max(totalRecaudado - cutDuenos - cutTienda, 0);

  const fechaCierre = primerPartidoFecha ? calcularFechaCierre(primerPartidoFecha) : null;

  return NextResponse.json({
    bolsa,
    totalRecaudado,
    totalQuinielas: quinielas.length,
    jornadas,
    primerPartidoFecha: fechaCierre,
  });
}
