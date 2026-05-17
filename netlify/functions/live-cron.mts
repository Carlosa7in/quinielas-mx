/**
 * Función programada de Netlify — corre cada minuto.
 * Llama a /api/live para disparar notificaciones push de goles,
 * tarjetas, cambios y eventos del partido aunque nadie tenga la app abierta.
 */
import type { Config } from "@netlify/functions";

export default async function handler() {
  const siteUrl = process.env.URL ?? process.env.DEPLOY_URL ?? "";
  if (!siteUrl) {
    console.warn("[live-cron] URL no definida, saltando");
    return new Response("no URL", { status: 200 });
  }

  try {
    const res = await fetch(`${siteUrl}/api/live`, {
      headers: { "x-cron": "1" }, // para distinguir en logs
    });
    const data = await res.json() as { hayEnVivo?: boolean; jornadas?: unknown[] };
    console.log(
      `[live-cron] ok — hayEnVivo=${data.hayEnVivo} jornadas=${(data.jornadas as unknown[])?.length ?? 0}`
    );
  } catch (err) {
    console.error("[live-cron] error:", err);
  }

  return new Response("ok");
}

export const config: Config = {
  schedule: "* * * * *", // cada minuto
};
