import { NextRequest, NextResponse } from "next/server";

// Debug temporal — visita /api/logos-debug?liga=Liga MX para ver la respuesta cruda de ESPN
export async function GET(req: NextRequest) {
  const liga = req.nextUrl.searchParams.get("liga") ?? "Liga MX";

  const LIGA_ESPN: Record<string, string> = {
    "Liga MX":          "mex.1",
    "Champions League": "uefa.champions",
    "Premier League":   "eng.1",
    "La Liga":          "esp.1",
  };

  const slug = LIGA_ESPN[liga];
  if (!slug) return NextResponse.json({ error: "Liga no válida" });

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  // Muestra las primeras 5 entradas de cada ruta posible
  return NextResponse.json({
    url,
    keys_root: Object.keys(data),
    via_sports: data?.sports?.[0]?.leagues?.[0]?.teams?.slice(0, 5) ?? "NO DATA",
    via_leagues: data?.leagues?.[0]?.teams?.slice(0, 5) ?? "NO DATA",
    via_teams:   data?.teams?.slice(0, 5) ?? "NO DATA",
  });
}
