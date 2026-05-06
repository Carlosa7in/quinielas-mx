import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/jornadas/:id — borra jornada y sus partidos (solo si no tiene quinielas)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verificar que no tenga quinielas registradas
    const quinielas = await prisma.quiniela.count({ where: { jornadaId: id } });
    if (quinielas > 0) {
      return NextResponse.json(
        { error: `No se puede borrar: tiene ${quinielas} quiniela(s) registrada(s)` },
        { status: 400 }
      );
    }

    // Borrar picks de partidos de esta jornada (si hubiera)
    const partidos = await prisma.partido.findMany({
      where: { jornadaId: id },
      select: { id: true },
    });
    const partidoIds = partidos.map((p) => p.id);
    if (partidoIds.length > 0) {
      await prisma.pick.deleteMany({ where: { partidoId: { in: partidoIds } } });
    }

    // Usar raw SQL para evitar el bug de NeonDB con campos DateTime en Prisma ORM
    await prisma.$executeRaw`DELETE FROM "Partido" WHERE "jornadaId" = ${id}`;
    await prisma.$executeRaw`DELETE FROM "Jornada" WHERE id = ${id}`;

    return NextResponse.json({ ok: true, partidosBorrados: partidoIds.length });
  } catch (err) {
    console.error("[DELETE /api/admin/jornadas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
