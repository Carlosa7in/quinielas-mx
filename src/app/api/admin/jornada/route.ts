import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

// GET /api/admin/jornada — jornadas abiertas/cerradas con partidos y fechas
export async function GET() {
  // Jornadas sin DateTime en el select (NeonDB bug)
  const jornadas = await prisma.jornada.findMany({
    where: { estado: { in: ["abierta", "cerrada"] } },
    orderBy: { numero: "desc" },
    select: {
      id: true, numero: true, nombre: true, temporada: true, liga: true, estado: true,
      partidos: {
        orderBy: { orden: "asc" },
        select: { id: true, equipoLocal: true, equipoVisita: true, resultado: true, orden: true },
      },
    },
  });

  if (jornadas.length === 0) return NextResponse.json({ jornadas: [] });

  // Obtener fechaHora via sql directo (única forma confiable con NeonDB)
  const jornadaIds = jornadas.map((j) => j.id);
  const fechaRows: { id: string; fechaHora: unknown }[] = [];
  for (const id of jornadaIds) {
    try {
      const rows = await sql`
        SELECT id, "fechaHora" FROM "Partido"
        WHERE "jornadaId" = ${id} AND "fechaHora" IS NOT NULL
      `;
      for (const r of rows) fechaRows.push({ id: String(r.id), fechaHora: r.fechaHora });
    } catch { /* silencioso */ }
  }

  const fechaMap = new Map<string, string>();
  for (const r of fechaRows) {
    const val = r.fechaHora;
    if (val) {
      const d = val instanceof Date ? val : new Date(String(val));
      if (!isNaN(d.getTime())) fechaMap.set(r.id, d.toISOString());
    }
  }

  const jornadasConFecha = jornadas.map((j) => ({
    ...j,
    partidos: j.partidos.map((p) => ({ ...p, fechaHora: fechaMap.get(p.id) ?? null })),
  }));

  return NextResponse.json({ jornadas: jornadasConFecha });
}

// PATCH /api/admin/jornada — actualiza fechaHora de un partido (solo superadmin)
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin") {
    return NextResponse.json({ error: "Solo el superadmin puede modificar fechas de partidos" }, { status: 403 });
  }

  const body = await req.json();
  const { partidoId, fechaHora } = body;

  if (!partidoId || !fechaHora) {
    return NextResponse.json({ error: "partidoId y fechaHora requeridos" }, { status: 400 });
  }

  const fecha = new Date(fechaHora);
  if (isNaN(fecha.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  // Usar raw SQL para evitar el bug de NeonDB con DateTime en Prisma ORM
  await sql`UPDATE "Partido" SET "fechaHora" = ${fecha.toISOString()} WHERE id = ${partidoId}`;

  return NextResponse.json({ ok: true, fechaHora: fecha.toISOString() });
}
