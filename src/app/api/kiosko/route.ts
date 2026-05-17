/**
 * GET  /api/kiosko?vendedorId=xxx  — Jornada abierta + partidos para el kiosko del cliente
 * POST /api/kiosko                 — Guarda un PreRegistro (picks del cliente)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";

// ── GET — devuelve jornada abierta + partidos para el vendedor ───────────────
export async function GET(req: NextRequest) {
  const vendedorId = req.nextUrl.searchParams.get("vendedorId");
  if (!vendedorId) return NextResponse.json({ error: "vendedorId requerido" }, { status: 400 });

  // Verificar que el vendedor existe y tiene rol tienda/vendedor/admin/superadmin
  const vendedor = await prisma.usuario.findUnique({
    where: { id: vendedorId },
    select: { id: true, nombre: true, rol: true, puntoVenta: true },
  });
  if (!vendedor) return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });

  // Obtener TODAS las jornadas abiertas
  const jornadas = await prisma.jornada.findMany({
    where: { estado: "abierta" },
    orderBy: { numero: "desc" },
    select: {
      id: true, numero: true, nombre: true, liga: true, temporada: true,
      partidos: {
        orderBy: { orden: "asc" },
        select: { id: true, equipoLocal: true, equipoVisita: true, orden: true },
      },
    },
  });

  if (jornadas.length === 0) {
    return NextResponse.json({ error: "No hay jornada abierta en este momento" }, { status: 404 });
  }

  // fechaHora via SQL para ordenar por hora de juego
  const allPartidoIds = jornadas.flatMap((j) => j.partidos.map((p) => p.id));
  const fechaMap = new Map<string, string>();
  if (allPartidoIds.length > 0) {
    try {
      const rows = await sql`SELECT id, "fechaHora" FROM "Partido" WHERE id = ANY(${allPartidoIds}::text[])`;
      for (const r of rows) {
        if (r.fechaHora) {
          const d = r.fechaHora instanceof Date ? r.fechaHora : new Date(String(r.fechaHora));
          if (!isNaN(d.getTime())) fechaMap.set(String(r.id), d.toISOString());
        }
      }
    } catch { /* ignorar */ }
  }

  const jornadasMapped = jornadas.map((j) => ({
    id: j.id,
    nombre: j.nombre ?? `Jornada ${j.numero}`,
    liga: j.liga,
    temporada: j.temporada,
    partidos: j.partidos
      .map((p) => ({ ...p, fechaHora: fechaMap.get(p.id) ?? null }))
      .sort((a, b) => {
        if (!a.fechaHora && !b.fechaHora) return a.orden - b.orden;
        if (!a.fechaHora) return 1;
        if (!b.fechaHora) return -1;
        return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
      }),
  }));

  return NextResponse.json({
    vendedor: { nombre: vendedor.nombre, puntoVenta: vendedor.puntoVenta },
    // Si solo hay una, "jornada" mantiene compatibilidad con la página
    jornada: jornadasMapped[0],
    jornadas: jornadasMapped,   // siempre el listado completo
  });
}

// ── POST — crea un PreRegistro (picks del cliente desde el kiosko) ────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { vendedorId, jornadaId, nombre, telefono, picks } = body;

  if (!vendedorId || !jornadaId || !nombre || !telefono || !Array.isArray(picks)) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (picks.length === 0) {
    return NextResponse.json({ error: "Debes seleccionar al menos un pick" }, { status: 400 });
  }

  const picksJson = JSON.stringify(picks);

  try {
    // Usar SQL directo para evitar problemas de transacciones NeonHTTP
    const rows = await sql`
      INSERT INTO "PreRegistro" (id, "vendedorId", "jornadaId", nombre, telefono, picks, "createdAt", usado)
      VALUES (gen_random_uuid()::text, ${vendedorId}, ${jornadaId}, ${String(nombre).trim()}, ${String(telefono).trim()}, ${picksJson}, NOW(), false)
      RETURNING id
    `;
    return NextResponse.json({ ok: true, id: rows[0]?.id });
  } catch (err) {
    console.error("[POST /api/kiosko]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
