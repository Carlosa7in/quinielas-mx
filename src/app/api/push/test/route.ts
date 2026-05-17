import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { sendPushToAll } = await import("@/lib/push");
    const { prisma } = await import("@/lib/prisma");

    const totalSubs = await prisma.pushSubscription.count();

    if (totalSubs === 0) {
      return NextResponse.json({ ok: false, error: "No hay suscriptores. Activa las notificaciones primero." });
    }

    const enviados = await sendPushToAll({
      title: "⚽ Notificaciones activas",
      body: "Las notificaciones de Tablitas Quinielas funcionan correctamente.",
      icon: "/logo-tablitas.png",
      url: "/en-vivo",
      tag: "test-push",
    });

    return NextResponse.json({ ok: true, enviados, totalSubs });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
