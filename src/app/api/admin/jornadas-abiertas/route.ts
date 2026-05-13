/**
 * GET /api/admin/jornadas-abiertas
 * Endpoint mínimo: devuelve las jornadas en estado "abierta".
 * Sin lógica compleja de comisiones ni filtros de cierre.
 */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Usamos SQL directo para evitar problemas de serialización de DateTime con Prisma
  const rows = await sql`
    SELECT id, numero, nombre, liga, temporada,
           TO_CHAR("fechaFin", 'YYYY-MM-DD') AS "fechaFin"
    FROM "Jornada"
    WHERE estado = 'abierta'
    ORDER BY numero DESC
  `;

  return NextResponse.json({
    jornadas: rows.map((r) => ({
      id:        String(r.id),
      numero:    Number(r.numero),
      nombre:    r.nombre ? String(r.nombre) : null,
      liga:      String(r.liga),
      temporada: String(r.temporada),
      fechaFin:  r.fechaFin ? String(r.fechaFin) : null,
    })),
  });
}
