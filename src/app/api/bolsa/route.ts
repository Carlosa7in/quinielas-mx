import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { PORCENTAJE_DUENOS, COMISION_TIENDA } from "@/lib/config";
import { calcularFechaCierre } from "@/lib/fechas";

// Leer un campo DateTime de NeonDB via $queryRaw (el ORM devuelve {} para DateTime)
async function leerFechaRaw(sql: TemplateStringsArray, ...values: unknown[]): Promise<Date | null> {
  try {
    const rows = await (prisma.$queryRaw as (...args: unknown[]) => Promise<Record<string, unknown>[]>)(
      Object.assign(sql, { raw: sql }),
      ...values
    );
    const val = rows[0] ? Object.values(rows[0])[0] : null;
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(String(val));
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// GET /api/bolsa — pública, sin auth
export async function GET() {
  // Primer partido de la jornada abierta via $queryRaw (único modo confiable con NeonDB)
  let primerPartidoFecha: Date | null = null;
  try {
    const rows = await prisma.$queryRaw<{ fechaHora: unknown }[]>`
      SELECT p."fechaHora"
      FROM "Partido" p
      JOIN "Jornada" j ON p."jornadaId" = j.id
      WHERE j.estado = 'abierta'
        AND p."fechaHora" IS NOT NULL
      ORDER BY p."fechaHora" ASC
      LIMIT 1
    `;
    if (rows[0]?.fechaHora) {
      const d = rows[0].fechaHora instanceof Date
        ? rows[0].fechaHora
        : new Date(String(rows[0].fechaHora));
      primerPartidoFecha = isNaN(d.getTime()) ? null : d;
    }
  } catch (e) {
    console.error("[/api/bolsa] fechaHora raw query failed:", e);
  }

  // Fallback: fechaInicio de la jornada abierta (cuando ESPN aún no tiene horarios)
  if (!primerPartidoFecha) {
    try {
      const rows = await prisma.$queryRaw<{ fechaInicio: unknown }[]>`
        SELECT "fechaInicio" FROM "Jornada"
        WHERE estado = 'abierta'
        ORDER BY numero DESC
        LIMIT 1
      `;
      if (rows[0]?.fechaInicio) {
        const d = rows[0].fechaInicio instanceof Date
          ? rows[0].fechaInicio
          : new Date(String(rows[0].fechaInicio));
        if (!isNaN(d.getTime())) {
          // +18h sobre UTC-midnight para que calcularFechaCierre vea el día correcto en CDMX
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

  // La fecha de cierre es el día anterior al primer partido a las 23:00 CDMX
  const fechaCierre = primerPartidoFecha ? calcularFechaCierre(primerPartidoFecha) : null;

  return NextResponse.json({
    bolsa,
    totalRecaudado,
    totalQuinielas: quinielas.length,
    jornadas,
    primerPartidoFecha: fechaCierre,
  });
}
