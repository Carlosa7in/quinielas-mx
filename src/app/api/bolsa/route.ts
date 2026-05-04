import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { PORCENTAJE_DUENOS, COMISION_TIENDA } from "@/lib/config";

// GET /api/bolsa — pública, sin auth
export async function GET() {
  // Primer partido de cualquier jornada abierta → fecha límite de registro
  // Usamos raw SQL para evitar crash si alguna fila tiene fechaHora = {} (dato corrupto)
  let primerPartidoFecha: Date | null = null;
  try {
    const rows = await prisma.$queryRaw<{ minFecha: Date }[]>`
      SELECT MIN(p."fechaHora") AS "minFecha"
      FROM "Partido" p
      INNER JOIN "Jornada" j ON j.id = p."jornadaId"
      WHERE j.estado = 'abierta'
        AND p."fechaHora" IS NOT NULL
    `;
    primerPartidoFecha = rows[0]?.minFecha ?? null;
  } catch (e) {
    console.error("[/api/bolsa] raw fechaHora query failed:", e);
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

  return NextResponse.json({
    bolsa,
    totalRecaudado,
    totalQuinielas: quinielas.length,
    jornadas,
    primerPartidoFecha,
  });
}
