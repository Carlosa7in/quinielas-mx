import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

async function verificarAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.role === "admin" || token?.role === "superadmin";
}

// GET /api/admin/participantes — lista todos los clientes con stats
export async function GET(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Jornadas abiertas actuales (para sobreventa por jornada)
  const jornadasAbiertas = await prisma.jornada.findMany({
    where: { estado: "abierta" },
    select: { id: true, nombre: true, numero: true, liga: true },
    orderBy: { numero: "asc" },
  });
  const idsAbiertas = new Set(jornadasAbiertas.map((j) => j.id));

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
          estadoPago: true,
          aciertos: true,
          jornadaId: true,
          jornada: { select: { id: true, numero: true, temporada: true, estado: true } },
        },
      },
    },
  });

  const resultado = clientes.map((c) => {
    const confirmadas        = c.quinielas.filter((q) => q.estadoPago === "confirmado");
    const pendientesAbiertos = c.quinielas.filter((q) => q.estadoPago === "pendiente" && q.jornada.estado === "abierta");
    const pendientesCerrados = c.quinielas.filter((q) => q.estadoPago === "pendiente" && q.jornada.estado !== "abierta");

    // IDs de jornadas abiertas donde ya compró (confirmado o pendiente)
    const jornadasAbiertasCompradas = c.quinielas
      .filter((q) => idsAbiertas.has(q.jornadaId) && (q.estadoPago === "confirmado" || q.estadoPago === "pendiente"))
      .map((q) => q.jornadaId);

    return {
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      totalQuinielas: confirmadas.length,
      pendientes: pendientesAbiertos.length,
      pendientesCerrados: pendientesCerrados.length,
      ganadoras: c.quinielas.filter((q) => q.estado === "ganadora").length,
      ultimaJornada: confirmadas.length > 0
        ? Math.max(...confirmadas.map((q) => q.jornada.numero))
        : c.quinielas.length > 0
          ? Math.max(...c.quinielas.map((q) => q.jornada.numero))
          : null,
      jornadasAbiertasCompradas,
    };
  });

  // Solo clientes reales (al menos 1 quiniela confirmada)
  const soloClientes = resultado.filter((c) => c.totalQuinielas > 0);
  soloClientes.sort((a, b) => b.totalQuinielas - a.totalQuinielas);

  return NextResponse.json({ clientes: soloClientes, jornadasAbiertas });
}

// PATCH /api/admin/participantes — editar nombre y/o teléfono
export async function PATCH(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, nombre, telefono } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const nombreVal = nombre !== undefined ? String(nombre).trim() : undefined;
  const telefonoVal = telefono !== undefined ? String(telefono).trim() : undefined;

  if (!nombreVal && !telefonoVal) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    // SQL directo: NeonHTTP no soporta transacciones implícitas de Prisma
    if (nombreVal && telefonoVal) {
      await sql`UPDATE "Cliente" SET nombre = ${nombreVal}, telefono = ${telefonoVal} WHERE id = ${id}`;
    } else if (nombreVal) {
      await sql`UPDATE "Cliente" SET nombre = ${nombreVal} WHERE id = ${id}`;
    } else if (telefonoVal) {
      await sql`UPDATE "Cliente" SET telefono = ${telefonoVal} WHERE id = ${id}`;
    }
    return NextResponse.json({ ok: true, id, nombre: nombreVal, telefono: telefonoVal });
  } catch (err) {
    console.error("PATCH /api/admin/participantes error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/participantes — eliminar cliente (desvincula sus quinielas)
export async function DELETE(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let id: string | undefined;
  try {
    const body = await req.json();
    id = body.id;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    // SQL directo: NeonHTTP no soporta transacciones implícitas de Prisma
    // 1. Desvincular quinielas (clienteId → null)
    await sql`UPDATE "Quiniela" SET "clienteId" = NULL WHERE "clienteId" = ${id}`;
    // 2. Eliminar el cliente
    await sql`DELETE FROM "Cliente" WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/participantes error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}
