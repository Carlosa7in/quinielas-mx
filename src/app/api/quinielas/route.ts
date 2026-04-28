import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarFolio } from "@/lib/folio";

// POST /api/quinielas - registrar quiniela
export async function POST(req: Request) {
  const body = await req.json();
  const { jornadaId, picks, nombre, telefono, canal = "online", usuarioId } = body;

  if (!jornadaId || !picks || picks.length === 0) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const jornada = await prisma.jornada.findUnique({
    where: { id: jornadaId },
  });

  if (!jornada || jornada.estado !== "abierta") {
    return NextResponse.json({ error: "Jornada no disponible" }, { status: 400 });
  }

  const folio = generarFolio(jornada.numero);

  const quiniela = await prisma.quiniela.create({
    data: {
      folio,
      jornadaId,
      usuarioId: usuarioId || null,
      nombreCliente: nombre || null,
      telefonoCliente: telefono || null,
      canal,
      picks: {
        create: picks.map((p: { partidoId: string; prediccion: string }) => ({
          partidoId: p.partidoId,
          prediccion: p.prediccion,
        })),
      },
    },
    include: {
      picks: { include: { partido: true } },
      jornada: true,
    },
  });

  return NextResponse.json(quiniela, { status: 201 });
}

// GET /api/quinielas?folio=xxx - buscar por folio
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folio = searchParams.get("folio");

  if (!folio) {
    return NextResponse.json({ error: "Folio requerido" }, { status: 400 });
  }

  const quiniela = await prisma.quiniela.findUnique({
    where: { folio },
    include: {
      picks: { include: { partido: true } },
      jornada: true,
    },
  });

  if (!quiniela) {
    return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
  }

  return NextResponse.json(quiniela);
}
