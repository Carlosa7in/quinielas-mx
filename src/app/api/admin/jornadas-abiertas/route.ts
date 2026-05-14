/**
 * GET /api/admin/jornadas-abiertas
 * Endpoint mínimo: devuelve las jornadas en estado "abierta".
 * Sin lógica compleja de comisiones ni filtros de cierre.
 */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/lib/prisma";
import { calcularFechaCierre } from "@/lib/fechas";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Usamos SQL directo para evitar problemas de serialización de DateTime con Prisma
  const rows = await sql`
    SELECT j.id, j.numero, j.nombre, j.liga, j.temporada,
           TO_CHAR(j."fechaFin", 'YYYY-MM-DD') AS "fechaFin",
           (SELECT p."fechaHora"
            FROM "Partido" p
            WHERE p."jornadaId" = j.id AND p."fechaHora" IS NOT NULL
            ORDER BY p."fechaHora" ASC
            LIMIT 1) AS "primerPartidoFecha"
    FROM "Jornada" j
    WHERE j.estado = 'abierta'
    ORDER BY j.numero DESC
  `;

  return NextResponse.json({
    jornadas: rows.map((r) => ({
      id:                 String(r.id),
      numero:             Number(r.numero),
      nombre:             r.nombre ? String(r.nombre) : null,
      liga:               String(r.liga),
      temporada:          String(r.temporada),
      fechaFin:           r.fechaFin ? String(r.fechaFin) : null,
      primerPartidoFecha: (() => {
        if (!r.primerPartidoFecha) return null;
        const d = r.primerPartidoFecha instanceof Date
          ? r.primerPartidoFecha
          : new Date(String(r.primerPartidoFecha));
        if (isNaN(d.getTime())) return null;
        // Igual que el homepage: cierre = día anterior a las 23:00 CDMX
        return calcularFechaCierre(d).toISOString();
      })(),
    })),
  });
}
