import webpush from "web-push";
import { sql } from "@/lib/prisma";

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
};

type SubRow = { endpoint: string; p256dh: string; auth: string };

export async function sendPushToAll(payload: PushPayload): Promise<number> {
  // Inicializar VAPID en runtime (no en build time) para evitar error de llave faltante
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:carlosariasariza@gmail.com",
    process.env.VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? "",
  );

  const rows = (await sql`
    SELECT "endpoint", "p256dh", "auth" FROM "PushSubscription"
  `) as SubRow[];

  let enviados = 0;
  const caducos: string[] = [];

  await Promise.all(
    rows.map(async (sub) => {
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
    await sql`
      DELETE FROM "PushSubscription"
      WHERE "endpoint" = ANY(${caducos}::text[])
    `;
  }

  return enviados;
}
