import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PORCENTAJE_DUENOS = 0.15;   // 15% para los dueños
const COMISION_TIENDA   = 2;      // $2 por quiniela vendida en tienda

// GET /api/bolsa — pública, sin auth
export async function GET() {
  // Sumar todo lo recaudado en jornadas abiertas
  const quinielas = await prisma.quiniela.findMany({
    where: { jornada: { estado: "abierta" } },
    select: { monto: true, canal: true },
  });

  const totalRecaudado  = quinielas.reduce((s, q) => s + q.monto, 0);
  const totalQuinielas  = quinielas.length;
  const quinielasTienda = quinielas.filter((q) => q.canal === "tienda").length;

  const cutDuenos    = totalRecaudado * PORCENTAJE_DUENOS;
  const cutTienda    = quinielasTienda * COMISION_TIENDA;
  const bolsa        = totalRecaudado - cutDuenos - cutTienda;

  return NextResponse.json({
    totalRecaudado,
    totalQuinielas,
    quinielasTienda,
    cutDuenos,
    cutTienda,
    bolsa: Math.max(bolsa, 0),
  });
}
