/**
 * GET   /api/admin/preregistros?vendedorId=xxx  — PreRegistros pendientes del vendedor
 * PATCH /api/admin/preregistros                 — Marcar como usado
 */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { sql } from "@/lib/prisma";

async function verificar(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.id ? String(token.id) : null;
}

// GET — pendientes de los últimos 60 min, no usados
export async function GET(req: NextRequest) {
  const userId = await verificar(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const vendedorId = req.nextUrl.searchParams.get("vendedorId") ?? userId;

  try {
    const rows = await sql`
      SELECT pr.id, pr.nombre, pr.telefono, pr.picks, pr."createdAt", pr."jornadaId"
      FROM "PreRegistro" pr
      WHERE pr."vendedorId" = ${vendedorId}
        AND pr.usado = false
        AND pr."createdAt" > NOW() - INTERVAL '60 minutes'
      ORDER BY pr."createdAt" DESC
    `;

    return NextResponse.json(
      rows.map((r) => ({
        id:        String(r.id),
        nombre:    String(r.nombre),
        telefono:  String(r.telefono),
        picks:     JSON.parse(String(r.picks)),
        jornadaId: String(r.jornadaId),
        createdAt: r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt),
      }))
    );
  } catch (err) {
    console.error("[GET /api/admin/preregistros]", err);
    return NextResponse.json([], { status: 200 }); // tabla puede no existir aún
  }
}

// PATCH — marcar como usado
export async function PATCH(req: NextRequest) {
  const userId = await verificar(req);
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    await sql`UPDATE "PreRegistro" SET usado = true WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/admin/preregistros]", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
