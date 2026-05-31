import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Asegura que la columna sofaId exista (idempotente)
async function ensureSofaIdColumn() {
  await sql`ALTER TABLE "Partido" ADD COLUMN IF NOT EXISTS "sofaId" TEXT`;
}

/** PATCH /api/admin/partido/:id  — guarda sofaId y/o espnId */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json() as { sofaId?: string; espnId?: string };

    await ensureSofaIdColumn();

    // ── sofaId ──────────────────────────────────────────────────────────────
    if (body.sofaId !== undefined) {
      const raw = (body.sofaId ?? "").trim();
      const match = raw.match(/\bid[=:](\d+)/i) ?? raw.match(/^(\d+)$/);
      const sofaId = match ? match[1] : null;
      await sql`UPDATE "Partido" SET "sofaId" = ${sofaId} WHERE id = ${id}`;
      return NextResponse.json({ ok: true, sofaId });
    }

    // ── espnId ──────────────────────────────────────────────────────────────
    if (body.espnId !== undefined) {
      const espnId = (body.espnId ?? "").trim() || null;
      await sql`UPDATE "Partido" SET "espnId" = ${espnId} WHERE id = ${id}`;
      return NextResponse.json({ ok: true, espnId });
    }

    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /api/admin/partido]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
