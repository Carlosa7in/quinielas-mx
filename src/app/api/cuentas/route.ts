import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// GET /api/cuentas — cuentas activas para mostrar al cliente (público)
export async function GET() {
  const cuentas = await db.cuentaBancaria.findMany({
    where: { activa: true },
    select: {
      id: true,
      banco: true,
      titular: true,
      clabe: true,
      numero: true,
      tipo: true,
      usuarioId: true,
    },
    orderBy: [{ orden: "asc" }, { banco: "asc" }],
  });

  return NextResponse.json(cuentas);
}
