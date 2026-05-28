import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/lib/prisma";

// GET /api/admin/migrate — agrega columnas nuevas a la DB (idempotente)
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin" && token?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const resultados: string[] = [];

  try {
    await sql`ALTER TABLE "Quiniela" ADD COLUMN IF NOT EXISTS "confirmadoPor" TEXT`;
    resultados.push("✅ confirmadoPor agregado");
  } catch (e) { resultados.push(`⚠️ confirmadoPor: ${e}`); }

  try {
    await sql`ALTER TABLE "Quiniela" ADD COLUMN IF NOT EXISTS "confirmadoEn" TIMESTAMPTZ`;
    resultados.push("✅ confirmadoEn agregado");
  } catch (e) { resultados.push(`⚠️ confirmadoEn: ${e}`); }

  return NextResponse.json({ ok: true, resultados });
}
