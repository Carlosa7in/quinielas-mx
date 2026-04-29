import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const JORNADA_SELECT = {
  id: true,
  numero: true,
  nombre: true,
  temporada: true,
  liga: true,
  estado: true,
  partidos: {
    select: { id: true, equipoLocal: true, equipoVisita: true, orden: true, resultado: true, golesLocal: true, golesVisita: true },
    orderBy: { orden: "asc" } as const,
  },
  quinielas: { select: { id: true, estado: true } },
};

// GET /api/jornadas?id=xxx  — jornada específica
// GET /api/jornadas          — jornada activa más reciente
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const jornada = id
    ? await prisma.jornada.findUnique({ where: { id }, select: JORNADA_SELECT })
    : await prisma.jornada.findFirst({ where: { estado: "abierta" }, select: JORNADA_SELECT, orderBy: { numero: "desc" } });

  if (!jornada) {
    return NextResponse.json({ error: "Jornada no encontrada" }, { status: 404 });
  }

  return NextResponse.json(jornada);
}

// POST /api/jornadas - crear jornada (admin)
export async function POST(req: Request) {
  const body = await req.json();
  const { numero, nombre, temporada, liga, fechaInicio, fechaFin, partidos } = body;

  try {
    // Crear jornada sin partidos primero (NeonHTTP no soporta transacciones)
    const jornada = await prisma.jornada.create({
      data: {
        numero,
        nombre: nombre ?? null,
        temporada,
        liga: liga ?? "Liga MX",
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
      },
      select: { id: true, numero: true, nombre: true, temporada: true, liga: true, estado: true },
    });

    // Crear partidos uno a uno
    const partidosCreados = [];
    for (let i = 0; i < partidos.length; i++) {
      const p = partidos[i];
      const partido = await prisma.partido.create({
        data: {
          jornadaId: jornada.id,
          equipoLocal: p.equipoLocal,
          equipoVisita: p.equipoVisita,
          fechaHora: new Date(p.fechaHora),
          orden: p.orden ?? i + 1,
        },
        select: { id: true, equipoLocal: true, equipoVisita: true, orden: true },
      });
      partidosCreados.push(partido);
    }

    return NextResponse.json({ ...jornada, partidos: partidosCreados }, { status: 201 });
  } catch (err) {
    console.error("[JORNADAS] error:", err);
    return NextResponse.json({ error: "Error al crear jornada: " + String(err) }, { status: 500 });
  }
}
