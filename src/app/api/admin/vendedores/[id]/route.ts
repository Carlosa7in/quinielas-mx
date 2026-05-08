import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH — toggle activo o cambiar nombre
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const v = await prisma.vendedor.update({
    where: { id },
    data: {
      ...(body.nombre !== undefined ? { nombre: body.nombre } : {}),
      ...(body.activo !== undefined ? { activo: body.activo } : {}),
    },
  });
  return NextResponse.json(v);
}

// DELETE
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.vendedor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
