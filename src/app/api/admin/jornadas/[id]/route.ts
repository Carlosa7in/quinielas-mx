import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/jornadas/:id — editar nombre y/o estado
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { nombre, estado } = body as { nombre?: string; estado?: string };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (nombre !== undefined) data.nombre = nombre.trim() || null;
    if (estado !== undefined) data.estado = estado;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    // Prisma update funciona bien para campos no-DateTime
    const updated = await prisma.jornada.update({
      where: { id },
      data,
      select: { id: true, nombre: true, estado: true },
    });

    return NextResponse.json({ ok: true, jornada: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/jornadas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

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
