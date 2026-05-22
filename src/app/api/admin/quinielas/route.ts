import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";
import { calcularFechaCierre } from "@/lib/fechas";

// GET /api/admin/quinielas — jornadas con sus quinielas
export async function GET() {
  try {
    const jornadas = await prisma.jornada.findMany({
      select: {
        id: true,
        numero: true,
        nombre: true,
        temporada: true,
        liga: true,
        estado: true,
        quinielas: {
          select: {
            id: true,
            folio: true,
            usuarioId: true,
            vendedorId: true,
            nombreCliente: true,
            telefonoCliente: true,
            canal: true,
            monto: true,
            estado: true,
            estadoPago: true,
            aciertos: true,
            referenciaPago: true,
            usuario: { select: { nombre: true } },
            vendedor: { select: { nombre: true, codigo: true } },
            picks: {
              select: { prediccion: true, acertado: true, partidoId: true, partido: { select: { orden: true } } },
              orderBy: { partido: { orden: "asc" } },
            },
          },
          orderBy: { folio: "desc" },
        },
      },
      orderBy: { numero: "desc" },
    });

    // createdAt vía neon() directo — Prisma/NeonDB devuelve {} para DateTime
    const createdAtMap = new Map<string, string>();
    try {
      const rows = await sql`
        SELECT id, to_char("createdAt" AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD"T"HH24:MI:SS') AS created
        FROM "Quiniela"
      `;
      for (const r of rows) {
        if (r.id && r.created) createdAtMap.set(r.id as string, r.created as string);
      }
    } catch { /* si falla, createdAt queda null */ }

    // Fecha del primer partido por jornada (para calcular cierre)
    const fechaCierreMap = new Map<string, string>();
    try {
      const rows = await sql`
        SELECT "jornadaId", MIN("fechaHora") AS primer_partido
        FROM "Partido"
        WHERE "fechaHora" IS NOT NULL
        GROUP BY "jornadaId"
      `;
      for (const r of rows) {
        if (r.jornadaId && r.primer_partido) {
          const d = r.primer_partido instanceof Date ? r.primer_partido : new Date(String(r.primer_partido));
          if (!isNaN(d.getTime())) {
            const cierre = calcularFechaCierre(d);
            fechaCierreMap.set(String(r.jornadaId), cierre.toISOString());
          }
        }
      }
    } catch { /* si falla, fechaCierre queda null */ }

    // Inyectar createdAt en cada quiniela y reordenar por fecha desc
    const resultado = jornadas.map((j) => ({
      ...j,
      fechaCierre: fechaCierreMap.get(j.id) ?? null,
      quinielas: j.quinielas
        .map((q) => ({ ...q, createdAt: createdAtMap.get(q.id) ?? null }))
        .sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    }));

    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[/api/admin/quinielas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
