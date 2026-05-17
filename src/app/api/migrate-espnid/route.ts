import { NextResponse } from "next/server";
import { sql } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sql`ALTER TABLE "Partido" ADD COLUMN IF NOT EXISTS "espnId" TEXT`;
    return NextResponse.json({ ok: true, msg: "Columna espnId añadida (o ya existía)" });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
