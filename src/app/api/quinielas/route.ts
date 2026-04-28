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

  try {
    const jornada = await prisma.jornada.findUnique({
      where: { id: jornadaId },
      select: { id: true, numero: true, estado: true },
    });

    if (!jornada || jornada.estado !== "abierta") {
      return NextResponse.json({ error: "Jornada no disponible" }, { status: 400 });
    }

    const folio = generarFolio(jornada.numero);

    // Buscar o crear cliente por teléfono
    let clienteId: string | null = null;
    if (telefono) {
      const telefonoLimpio = telefono.replace(/\D/g, "");
      const clienteExistente = await prisma.cliente.findUnique({
        where: { telefono: telefonoLimpio },
        select: { id: true },
      });
      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else if (nombre) {
        const nuevoCliente = await prisma.cliente.create({
          data: {
            id: `cli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            telefono: telefonoLimpio,
            nombre,
          },
          select: { id: true },
        });
        clienteId = nuevoCliente.id;
      }
    }

    // Crear quiniela sin picks anidados (NeonHTTP no soporta transacciones)
    const quiniela = await prisma.quiniela.create({
      data: {
        folio,
        jornadaId,
        usuarioId: usuarioId || null,
        clienteId,
        nombreCliente: nombre || null,
        telefonoCliente: telefono || null,
        canal,
      },
      select: { id: true, folio: true },
    });

    // Crear picks uno a uno
    for (const p of picks as { partidoId: string; prediccion: string }[]) {
      await prisma.pick.create({
        data: {
          quinielaId: quiniela.id,
          partidoId: p.partidoId,
          prediccion: p.prediccion,
        },
        select: { id: true },
      });
    }

    return NextResponse.json({ folio: quiniela.folio }, { status: 201 });
  } catch (err) {
    console.error("[QUINIELAS POST] error:", err);
    return NextResponse.json({ error: "Error al registrar: " + String(err) }, { status: 500 });
  }
}

// GET /api/quinielas?folio=xxx - buscar por folio (para ticket)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folio = searchParams.get("folio");

  if (!folio) {
    return NextResponse.json({ error: "Folio requerido" }, { status: 400 });
  }

  try {
    const quiniela = await prisma.quiniela.findUnique({
      where: { folio },
      select: {
        folio: true,
        nombreCliente: true,
        telefonoCliente: true,
        canal: true,
        monto: true,
        estado: true,
        puntos: true,
        aciertos: true,
        jornada: { select: { numero: true, temporada: true } },
        picks: {
          select: {
            id: true,
            prediccion: true,
            acertado: true,
            partido: {
              select: {
                equipoLocal: true,
                equipoVisita: true,
                orden: true,
                resultado: true,
                golesLocal: true,
                golesVisita: true,
              },
            },
          },
        },
      },
    });

    if (!quiniela) {
      return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
    }

    return NextResponse.json(quiniela);
  } catch (err) {
    console.error("[QUINIELAS GET] error:", err);
    return NextResponse.json({ error: "Error al buscar: " + String(err) }, { status: 500 });
  }
}
