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
    partidos: j.partidos
      .map((p) => ({ ...p, fechaHora: fechaMap.get(p.id) ?? null }))
      .sort((a, b) => {
        if (!a.fechaHora && !b.fechaHora) return a.orden - b.orden;
        if (!a.fechaHora) return 1;
        if (!b.fechaHora) return -1;
        return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
      }),
  }));

  return NextResponse.json({ jornadas: jornadasConFecha });
}

// PATCH /api/admin/jornada — actualiza fechaHora de un partido (solo superadmin)
// También acepta { jornadaId, shiftDias } para posponer todos los partidos N días
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin") {
    return NextResponse.json({ error: "Solo el superadmin puede modificar fechas de partidos" }, { status: 403 });
  }

  const body = await req.json();
  const { partidoId, fechaHora, jornadaId, shiftDias } = body;

  // ── Modo posponer: mover todos los partidos de la jornada N días ──
  if (jornadaId && shiftDias) {
    const dias = Number(shiftDias);
    if (!Number.isInteger(dias) || dias < 1 || dias > 30) {
      return NextResponse.json({ error: "shiftDias debe ser entre 1 y 30" }, { status: 400 });
    }
    await sql`
      UPDATE "Partido"
      SET "fechaHora" = "fechaHora" + (${dias} || ' days')::INTERVAL
      WHERE "jornadaId" = ${jornadaId}
        AND "fechaHora" IS NOT NULL
    `;
    return NextResponse.json({ ok: true, shiftDias: dias });
  }

  // ── Modo normal: actualizar un partido individual ──
  if (!partidoId || !fechaHora) {
    return NextResponse.json({ error: "partidoId y fechaHora requeridos" }, { status: 400 });
  }

  // Normalizar: si llega como datetime-local sin timezone (ej. "2025-05-31T18:00")
  // agregar offset México (-06:00) para que se guarde como UTC real.
  let fhStr = String(fechaHora).trim();
  if (fhStr && !fhStr.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(fhStr)) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fhStr))       fhStr += ":00-06:00";
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(fhStr)) fhStr += "-06:00";
  }
  const fecha = new Date(fhStr);
  if (isNaN(fecha.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  await sql`UPDATE "Partido" SET "fechaHora" = ${fecha.toISOString()} WHERE id = ${partidoId}`;

  return NextResponse.json({ ok: true, fechaHora: fecha.toISOString() });
}
