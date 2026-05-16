import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      update: { p256dh: body.keys.p256dh, auth: body.keys.auth },
      create: { endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/push/subscribe  -- elimina suscripcion
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json() as { endpoint: string };
    if (!endpoint) return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
