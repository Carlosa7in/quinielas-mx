import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";

const JORNADA_SELECT = {
  id: true,
  numero: true,
  nombre: true,
  temporada: true,
  liga: true,
  estado: true,
  partidos: {
    select: { id: true, liga: true, equipoLocal: true, equipoVisita: true, orden: true, resultado: true, golesLocal: true, golesVisita: true },
    orderBy: { orden: "asc" } as const,
  },
  quinielas: { select: { id: true, estado: true } },
};

// GET /api/jornadas?id=xxx  — jornada específica
// GET /api/jornadas          — jornada activa más reciente
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const jornada = id
    ? await prisma.jornada.findUnique({ where: { id }, select: JORNADA_SELECT })
    : await prisma.jornada.findFirst({ where: { estado: "abierta" }, select: JORNADA_SELECT, orderBy: { numero: "desc" } });

  if (!jornada) {
    return NextResponse.json({ error: "Jornada no encontrada" }, { status: 404 });
  }

  // Leer fechaHora via neon() directo — PrismaNeonHTTP devuelve {} para DateTime
  let fechaHorasMap: Record<string, string> = {};
  try {
    const rows = await sql`
      SELECT id, "fechaHora" FROM "Partido"
      WHERE "jornadaId" = ${jornada.id}
        AND "fechaHora" IS NOT NULL
    `;
    for (const r of rows) {
      const val = r.fechaHora;
      if (val) fechaHorasMap[r.id] = val instanceof Date ? val.toISOString() : String(val);
    }
  } catch (e) {
    console.error("[/api/jornadas] fechaHora query failed:", e);
  }

  const partidosConFecha = jornada.partidos
    .map((p) => ({ ...p, fechaHora: fechaHorasMap[p.id] ?? null }))
    .sort((a, b) => {
      if (!a.fechaHora && !b.fechaHora) return a.orden - b.orden;
      if (!a.fechaHora) return 1;
      if (!b.fechaHora) return -1;
      return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
    });

  return NextResponse.json({ ...jornada, partidos: partidosConFecha });
}

// POST /api/jornadas - crear jornada (admin)
export async function POST(req: Request) {
  const body = await req.json();
  const { numero, nombre, temporada, liga, fechaInicio, fechaFin, partidos } = body;

  try {
    // Crear jornada sin partidos primero (NeonHTTP no soporta transacciones)
    const jornada = await prisma.jornada.create({
      data: {
        numero,
        nombre: nombre ?? null,
        temporada,
        liga: liga ?? "Liga MX",
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
      },
      select: { id: true, numero: true, nombre: true, temporada: true, liga: true, estado: true },
    });

    // Crear partidos uno a uno
    const partidosCreados = [];
    const partidosOmitidos: string[] = [];

    for (let i = 0; i < partidos.length; i++) {
      const p = partidos[i];

      // Normalizar fechaHora: si llega como datetime-local sin timezone (ej. "2026-05-08T19:30"
      // o "2026-05-08T19:30:00"), añadirle "-06:00" para que new Date() nunca falle en el servidor.
      let fhStr: string = String(p.fechaHora ?? "").trim();

      if (!fhStr) {
        console.warn(`[JORNADAS] Partido ${i + 1} sin fechaHora — omitido`);
        partidosOmitidos.push(`Partido ${i + 1}: sin fecha`);
        continue;
      }

      // Si la cadena YA trae offset o 'Z', usarla directamente.
      // Si no, agregarle el offset de México City (CST -06:00) para evitar ambigüedad UTC.
      if (!fhStr.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(fhStr)) {
        // "2026-05-08T19:30"  → "2026-05-08T19:30:00-06:00"
        // "2026-05-08T19:30:00" → "2026-05-08T19:30:00-06:00"
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fhStr)) {
          fhStr += ":00-06:00";
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(fhStr)) {
          fhStr += "-06:00";
        }
      }

      const fechaHora = new Date(fhStr);
      if (isNaN(fechaHora.getTime())) {
        console.error(`[JORNADAS] Partido ${i + 1} fechaHora inválida: "${p.fechaHora}" (normalizada: "${fhStr}")`);
        partidosOmitidos.push(`Partido ${i + 1}: fecha inválida (${p.fechaHora})`);
        continue;
      }

      const partido = await prisma.partido.create({
        data: {
          jornadaId: jornada.id,
          liga: p.liga ?? "Liga MX",
          equipoLocal: p.equipoLocal,
          equipoVisita: p.equipoVisita,
          fechaHora,
          orden: p.orden ?? i + 1,
          ...(p.espnId ? { espnId: String(p.espnId) } : {}),
        },
        select: { id: true, equipoLocal: true, equipoVisita: true, orden: true },
      });
      partidosCreados.push(partido);
    }

    if (partidosOmitidos.length > 0) {
      console.warn(`[JORNADAS] ${partidosOmitidos.length} partido(s) omitido(s):`, partidosOmitidos);
    }

    return NextResponse.json(
      { ...jornada, partidos: partidosCreados, omitidos: partidosOmitidos },
      { status: 201 },
    );
  } catch (err) {
    console.error("[JORNADAS] error:", err);
    return NextResponse.json({ error: "Error al crear jornada: " + String(err) }, { status: 500 });
  }
}
