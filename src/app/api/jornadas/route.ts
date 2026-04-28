import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/jornadas - jornada activa con sus partidos
export async function GET() {
  const jornada = await prisma.jornada.findFirst({
    where: { estado: "abierta" },
    include: {
      partidos: { orderBy: { orden: "asc" } },
      quinielas: { select: { id: true, estado: true } },
    },
    orderBy: { numero: "desc" },
  });

  if (!jornada) {
    return NextResponse.json({ error: "No hay jornada abierta" }, { status: 404 });
  }

  return NextResponse.json(jornada);
}

// POST /api/jornadas - crear jornada (admin)
export async function POST(req: Request) {
  const body = await req.json();
  const { numero, temporada, fechaInicio, fechaFin, partidos } = body;

  const jornada = await prisma.jornada.create({
    data: {
      numero,
      temporada,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      partidos: {
        create: partidos.map(
          (
            p: { equipoLocal: string; equipoVisita: string; fechaHora: string; orden: number },
            i: number
          ) => ({
            equipoLocal: p.equipoLocal,
            equipoVisita: p.equipoVisita,
            fechaHora: new Date(p.fechaHora),
            orden: p.orden ?? i,
          })
        ),
      },
    },
    include: { partidos: true },
  });

  return NextResponse.json(jornada, { status: 201 });
}
