import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Asegurar que la tabla existe (por si migrate deploy no corrió)
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS "PushSubscription" (
      "id"        TEXT        NOT NULL DEFAULT gen_random_uuid(),
      "endpoint"  TEXT        NOT NULL,
      "p256dh"    TEXT        NOT NULL,
      "auth"      TEXT        NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
    ON "PushSubscription"("endpoint")
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

    await ensureTable();

    await sql`
      INSERT INTO "PushSubscription" ("id", "endpoint", "p256dh", "auth")
      VALUES (gen_random_uuid(), ${body.endpoint}, ${body.keys.p256dh}, ${body.keys.auth})
      ON CONFLICT ("endpoint")
      DO UPDATE SET "p256dh" = EXCLUDED."p256dh", "auth" = EXCLUDED."auth"
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
