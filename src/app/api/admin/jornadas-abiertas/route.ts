/**
 * GET /api/admin/jornadas-abiertas
 * Endpoint mínimo: devuelve las jornadas en estado "abierta".
 * Sin lógica compleja de comisiones ni filtros de cierre.
 */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const jornadas = await prisma.jornada.findMany({
    where: { estado: "abierta" },
    select: {
      id: true,
      numero: true,
      nombre: true,
      liga: true,
      temporada: true,
      fechaFin: true,
    },
    orderBy: { numero: "desc" },
  });

  return NextResponse.json({
    jornadas: jornadas.map((j) => ({
      ...j,
      fechaFin: j.fechaFin ? j.fechaFin.toISOString().slice(0, 10) : null,
    })),
  });
}
