import webpush from "web-push";
import { prisma } from "@/lib/prisma";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:carlosariasariza@gmail.com",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? "",
);

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
};

export async function sendPushToAll(payload: PushPayload): Promise<number> {
  const subs = await prisma.pushSubscription.findMany();
  let enviados = 0;
  const caducos: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        enviados++;
      } catch (err: unknown) {
        // 410 Gone = suscripcion caducada, borrar
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          caducos.push(sub.endpoint);
        }
      }
    }),
  );

  if (caducos.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: caducos } },
    });
  }

  return enviados;
}
