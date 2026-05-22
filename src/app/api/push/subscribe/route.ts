import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Asegurar que la tabla existe y tiene la columna tipo
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS "PushSubscription" (
      "id"        TEXT        NOT NULL DEFAULT gen_random_uuid(),
      "endpoint"  TEXT        NOT NULL,
      "p256dh"    TEXT        NOT NULL,
      "auth"      TEXT        NOT NULL,
      "tipo"      TEXT        NOT NULL DEFAULT 'cliente',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
    ON "PushSubscription"("endpoint")
  `;
  // Migración: agregar columna si ya existe la tabla sin ella
  await sql`
    ALTER TABLE "PushSubscription"
    ADD COLUMN IF NOT EXISTS "tipo" TEXT NOT NULL DEFAULT 'cliente'
  `;
}

// POST /api/push/subscribe  -- guarda una nueva suscripcion
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // tipo viene como query param: ?tipo=admin  (default: cliente)
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo") === "admin" ? "admin" : "cliente";

    await ensureTable();

    // Si el suscriptor ya era admin, no lo degradamos a cliente
    await sql`
      INSERT INTO "PushSubscription" ("id", "endpoint", "p256dh", "auth", "tipo")
      VALUES (gen_random_uuid(), ${body.endpoint}, ${body.keys.p256dh}, ${body.keys.auth}, ${tipo})
      ON CONFLICT ("endpoint")
      DO UPDATE SET
        "p256dh" = EXCLUDED."p256dh",
        "auth"   = EXCLUDED."auth",
        "tipo"   = CASE
          WHEN EXCLUDED."tipo" = 'admin' THEN 'admin'
          ELSE "PushSubscription"."tipo"
        END
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/push/subscribe  -- elimina suscripcion
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json() as { endpoint: string };
    if (!endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });

    await ensureTable();
    await sql`DELETE FROM "PushSubscription" WHERE "endpoint" = ${endpoint}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] DELETE error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
