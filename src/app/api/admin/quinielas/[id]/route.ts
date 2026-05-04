import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/quinielas/[id] — eliminar quiniela y sus picks
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    // Borrar picks primero (relación FK)
    await prisma.pick.deleteMany({ where: { quinielaId: id } });
    await prisma.quiniela.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE quiniela]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
