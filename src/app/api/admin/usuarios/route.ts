import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const ROLES_VALIDOS = ["superadmin", "admin", "tienda", "vendedor"];

async function verificarSuperadmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.role === "superadmin";
}

// GET /api/admin/usuarios
export async function GET(req: NextRequest) {
  if (!(await verificarSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const usuarios = await prisma.usuario.findMany({
    where: { rol: { in: ROLES_VALIDOS } },
    select: { id: true, nombre: true, username: true, email: true, rol: true, puntoVenta: true, codigoRef: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(usuarios);
}

// POST /api/admin/usuarios — crear usuario
export async function POST(req: NextRequest) {
  if (!(await verificarSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { nombre, username, email, password, rol = "vendedor", puntoVenta } = await req.json();
  if (!nombre || !email || !password) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  const existe = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (existe) {
    return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
  }
  const hash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: { nombre, username: username || null, email, password: hash, rol, puntoVenta: puntoVenta || null },
    select: { id: true, nombre: true, username: true, email: true, rol: true, puntoVenta: true },
  });
  return NextResponse.json(usuario, { status: 201 });
}

// PATCH /api/admin/usuarios — actualizar puntoVenta, rol o codigoRef
export async function PATCH(req: NextRequest) {
  if (!(await verificarSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id, puntoVenta, rol, codigoRef } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  if (rol && !ROLES_VALIDOS.includes(rol)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: {
        ...(puntoVenta !== undefined ? { puntoVenta: puntoVenta || null } : {}),
        ...(rol ? { rol } : {}),
        ...(codigoRef !== undefined ? { codigoRef: codigoRef ? codigoRef.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "") || null : null } : {}),
      },
      select: { id: true, nombre: true, username: true, email: true, rol: true, puntoVenta: true, codigoRef: true },
    });
    return NextResponse.json(usuario);
  } catch {
    return NextResponse.json({ error: "El código ya está en uso" }, { status: 409 });
  }
}

// DELETE /api/admin/usuarios?id=xxx
export async function DELETE(req: NextRequest) {
  if (!(await verificarSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: { id: true, rol: true } });

  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (usuario.rol === "superadmin") {
    return NextResponse.json({ error: "No se puede eliminar al superadmin" }, { status: 400 });
  }
  await prisma.usuario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
