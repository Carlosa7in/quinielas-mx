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

function initVapid() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:carlosariasariza@gmail.com",
    process.env.VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? "",
  );
}

async function sendToRows(rows: SubRow[], payload: PushPayload): Promise<number> {
  initVapid();
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

/** Envía a TODOS los suscriptores (clientes y admins). Usar para eventos de partido. */
export async function sendPushToAll(payload: PushPayload): Promise<number> {
  const rows = (await sql`
    SELECT "endpoint", "p256dh", "auth" FROM "PushSubscription"
  `) as SubRow[];
  return sendToRows(rows, payload);
}

/** Envía SOLO a suscriptores admin. Usar para eventos operativos (cancelaciones, kiosko, etc.). */
export async function sendPushToAdmins(payload: PushPayload): Promise<number> {
  const rows = (await sql`
    SELECT "endpoint", "p256dh", "auth" FROM "PushSubscription"
    WHERE "tipo" = 'admin'
  `) as SubRow[];
  return sendToRows(rows, payload);
}
