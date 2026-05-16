import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// GET /api/admin/cuentas — lista todas las cuentas (solo admin/superadmin)
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !["admin", "superadmin"].includes(token.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const cuentas = await db.cuentaBancaria.findMany({
    include: { usuario: { select: { id: true, nombre: true, rol: true } } },
    orderBy: [{ orden: "asc" }, { banco: "asc" }],
  });

  return NextResponse.json(cuentas);
}

// POST /api/admin/cuentas — crear nueva cuenta
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !["admin", "superadmin"].includes(token.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { usuarioId, banco, titular, clabe, numero, tipo, orden } = body;

  if (!usuarioId || !banco || !titular) {
    return NextResponse.json({ error: "usuarioId, banco y titular son requeridos" }, { status: 400 });
  }

  try {
    const cuenta = await db.cuentaBancaria.create({
      data: {
        usuarioId,
        banco,
        titular,
        clabe: clabe || null,
        numero: numero || null,
        tipo: tipo || "transferencia",
        orden: orden ?? 0,
      },
      include: { usuario: { select: { id: true, nombre: true, rol: true } } },
    });

    return NextResponse.json(cuenta, { status: 201 });
  } catch (err) {
    console.error("[CUENTAS POST]", err);
    return NextResponse.json({ error: "Error al crear: " + String(err) }, { status: 500 });
  }
}

// PATCH /api/admin/cuentas — editar cuenta
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !["admin", "superadmin"].includes(token.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...campos } = body;

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  // Solo permitir campos editables
  const permitidos = ["banco", "titular", "clabe", "numero", "tipo", "activa", "orden", "usuarioId"];
  const data: Record<string, unknown> = {};
  for (const k of permitidos) {
    if (k in campos) data[k] = campos[k];
  }

  try {
    const cuenta = await db.cuentaBancaria.update({
      where: { id },
      data,
      include: { usuario: { select: { id: true, nombre: true, rol: true } } },
    });
    return NextResponse.json(cuenta);
  } catch (err) {
    console.error("[CUENTAS PATCH]", err);
    return NextResponse.json({ error: "Error al actualizar: " + String(err) }, { status: 500 });
  }
}

// DELETE /api/admin/cuentas — borrar cuenta
export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !["admin", "superadmin"].includes(token.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  try {
    await db.cuentaBancaria.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[CUENTAS DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar: " + String(err) }, { status: 500 });
  }
}
