import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

async function verificarAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.role === "admin" || token?.role === "superadmin";
}

// GET /api/admin/participantes — lista todos los clientes con stats
export async function GET(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const clientes = await prisma.cliente.findMany({
    select: {
      id: true,
      nombre: true,
      telefono: true,
      quinielas: {
        select: {
          id: true,
          folio: true,
          estado: true,
          aciertos: true,
          jornada: { select: { numero: true, temporada: true } },
        },
      },
    },
  });

  const resultado = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    totalQuinielas: c.quinielas.length,
    ganadoras: c.quinielas.filter((q) => q.estado === "ganadora").length,
    ultimaJornada: c.quinielas.length > 0
      ? Math.max(...c.quinielas.map((q) => q.jornada.numero))
      : null,
  }));

  resultado.sort((a, b) => b.totalQuinielas - a.totalQuinielas);

  return NextResponse.json(resultado);
}

// PATCH /api/admin/participantes — editar nombre y/o teléfono
export async function PATCH(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, nombre, telefono } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const data: { nombre?: string; telefono?: string } = {};
  if (nombre !== undefined) data.nombre = String(nombre).trim();
  if (telefono !== undefined) data.telefono = String(telefono).trim();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const actualizado = await prisma.cliente.update({
    where: { id },
    data,
    select: { id: true, nombre: true, telefono: true },
  });

  return NextResponse.json(actualizado);
}

// DELETE /api/admin/participantes — eliminar cliente (y sus quinielas en cascada)
export async function DELETE(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  // Desvincular quinielas (poner clienteId en null) antes de eliminar el cliente
  await prisma.quiniela.updateMany({
    where: { clienteId: id },
    data: { clienteId: null },
  });

  await prisma.cliente.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
