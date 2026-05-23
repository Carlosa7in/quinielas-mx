import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Asegura que la columna sofaId exista (idempotente)
async function ensureSofaIdColumn() {
  await sql`ALTER TABLE "Partido" ADD COLUMN IF NOT EXISTS "sofaId" TEXT`;
}

/** PATCH /api/admin/partido/:id  — guarda el sofaId de SofaScore */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json() as { sofaId?: string };

    // Extraer el número del embed code, URL o ID directo
    // Acepta: "14083731"
    //         "...?id=14083731&..."   (embed code)
    //         "https://...#id:14083731"  (URL compartida desde app)
    const raw = (body.sofaId ?? "").trim();
    const match = raw.match(/\bid[=:](\d+)/i) ?? raw.match(/^(\d+)$/);
    const sofaId = match ? match[1] : null;

    await ensureSofaIdColumn();

    await sql`UPDATE "Partido" SET "sofaId" = ${sofaId} WHERE id = ${id}`;

    return NextResponse.json({ ok: true, sofaId });
  } catch (err) {
    console.error("[PATCH /api/admin/partido]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
