/**
 * Limpieza mensual de EventoNotificado.
 * Borra registros con más de 2 meses de antigüedad para no inflar la BD.
 * Corre el día 1 de cada mes a las 3 AM UTC.
 */
import type { Config } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";

export default async function handler() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[notif-cleanup] DATABASE_URL no definida");
    return new Response("no db", { status: 200 });
  }

  const sql = neon(dbUrl);

  try {
    const result = await sql`
      DELETE FROM "EventoNotificado"
      WHERE "creadoAt" < NOW() - INTERVAL '2 months'
    `;
    console.log(`[notif-cleanup] Eliminados: ${result.length ?? 0} registros`);
  } catch (err) {
    console.error("[notif-cleanup] Error:", err);
  }

  return new Response("ok");
}

export const config: Config = {
  schedule: "0 3 1 * *", // día 1 de cada mes a las 3 AM UTC
};
