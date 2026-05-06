import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/lib/prisma";

// POST /api/admin/migrate — crea tablas nuevas. Solo superadmin. Uso único.
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const results: string[] = [];

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "PagoComision" (
        "id"         TEXT NOT NULL,
        "usuarioId"  TEXT NOT NULL,
        "jornadaId"  TEXT NOT NULL,
        "monto"      DOUBLE PRECISION NOT NULL DEFAULT 0,
        "pagadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "pagadoPor"  TEXT,
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PagoComision_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PagoComision_usuarioId_jornadaId_key" UNIQUE ("usuarioId", "jornadaId")
      )
    `;
    results.push("✅ Tabla PagoComision creada (o ya existía)");
  } catch (e) {
    results.push("❌ PagoComision: " + String(e));
  }

  return NextResponse.json({ ok: true, results });
}
