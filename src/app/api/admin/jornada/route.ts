import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/jornada — devuelve jornadas abiertas con sus partidos
export async function GET() {
  const jornadas = await prisma.jornada.findMany({
    where: { estado: { in: ["abierta", "cerrada"] } },
    orderBy: { numero: "desc" },
    select: {
      id: true,
      numero: true,
      nombre: true,
      temporada: true,
      liga: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      partidos: {
        orderBy: { orden: "asc" },
        select: {
          id: true,
          equipoLocal: true,
          equipoVisita: true,
          fechaHora: true,
          resultado: true,
          orden: true,
        },
      },
    },
  });
  return NextResponse.json({ jornadas });
}

// PATCH /api/admin/jornada — actualiza fechaHora de un partido
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { partidoId, fechaHora } = body;

  if (!partidoId || !fechaHora) {
    return NextResponse.json({ error: "partidoId y fechaHora requeridos" }, { status: 400 });
  }

  const fecha = new Date(fechaHora);
  if (isNaN(fecha.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const partido = await prisma.partido.update({
    where: { id: partidoId },
    data: { fechaHora: fecha },
    select: { id: true, fechaHora: true, equipoLocal: true, equipoVisita: true },
  });

  return NextResponse.json({ ok: true, partido });
}
