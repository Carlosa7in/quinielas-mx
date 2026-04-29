import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/preliminares — resultados de partidos de jornadas activas
export async function GET() {
  try {
    const jornadas = await prisma.jornada.findMany({
      where: { estado: "abierta" },
      select: {
        id: true,
        numero: true,
        temporada: true,
        liga: true,
        partidos: {
          select: {
            id: true,
            orden: true,
            equipoLocal: true,
            equipoVisita: true,
            resultado: true,
            golesLocal: true,
            golesVisita: true,
          },
          orderBy: { orden: "asc" },
        },
      },
      orderBy: { numero: "desc" },
    });

    return NextResponse.json(jornadas);
  } catch (err) {
    console.error("[PRELIMINARES]", err);
    return NextResponse.json({ error: "Error al cargar" }, { status: 500 });
  }
}
