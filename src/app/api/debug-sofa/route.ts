import { NextResponse } from "next/server";
import { findSofaEventId, fetchSofaIncidents } from "@/lib/sofascore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const local  = searchParams.get("local")  ?? "Guadalajara";
  const visita = searchParams.get("visita") ?? "Cruz Azul";
  const liga   = searchParams.get("liga")   ?? "Liga MX";

  const sofaId = await findSofaEventId(local, visita, liga);
  const incs   = sofaId ? await fetchSofaIncidents(sofaId) : [];

  return NextResponse.json({ local, visita, liga, sofaId, incidentes: incs.length, primeros3: incs.slice(0, 3) });
}
