import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/jornadas/todas — todas las jornadas con info básica
export async function GET() {
  const jornadas = await prisma.jornada.findMany({
    select: {
      id: true,
      numero: true,
      temporada: true,
      liga: true,
      estado: true,
      _count: { select: { quinielas: true, partidos: true } },
    },
    orderBy: [{ liga: "asc" }, { numero: "desc" }],
  });

  return NextResponse.json(jornadas);
}
