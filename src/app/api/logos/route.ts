import { NextRequest, NextResponse } from "next/server";

const LIGA_ESPN: Record<string, string> = {
  "Liga MX":          "mex.1",
  "Champions League": "uefa.champions",
  "Premier League":   "eng.1",
  "La Liga":          "esp.1",
};

// Mismo mapa que en espn-partidos — para normalizar nombres ESPN → nuestro sistema
const NOMBRE_MAP: Record<string, string> = {
  "West Ham United":            "West Ham",
  "Brighton & Hove Albion":     "Brighton",
  "Newcastle United":           "Newcastle",
  "Wolverhampton Wanderers":    "Wolverhampton",
  "Nottingham Forest":          "Nottingham Forest",
  "AFC Bournemouth":            "Bournemouth",
  "Sunderland AFC":             "Sunderland",
  "Paris Saint-Germain":        "PSG",
  "Atletico Madrid":            "Atlético Madrid",
  "Atletico de Madrid":         "Atlético Madrid",
  "Club Brugge KV":             "Club Brugge",
  "Sporting Clube de Portugal": "Sporting CP",
  "Chivas":                     "Guadalajara",
  "Tigres":                     "Tigres UANL",
  "Pumas":                      "Pumas UNAM",
  "FC Juárez":                  "FC Juárez",
  "Mazatlán FC":                "Mazatlán",
  "San Luis":                   "Atlético San Luis",
  "Club América":               "América",
};

function normalizar(nombre: string): string {
  return NOMBRE_MAP[nombre] ?? nombre;
}

// GET /api/logos?liga=Liga MX
// Devuelve { [equipoNombre]: logoUrl } para todos los equipos de la liga
export async function GET(req: NextRequest) {
  const liga = req.nextUrl.searchParams.get("liga") ?? "Liga MX";
  const slug = LIGA_ESPN[liga];
  if (!slug) return NextResponse.json({});

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return NextResponse.json({});

    const data = await res.json();
    const teams: { team: Record<string, unknown> }[] =
      data?.sports?.[0]?.leagues?.[0]?.teams ?? [];

    const logoMap: Record<string, string> = {};
    for (const { team } of teams) {
      const displayName = String(team.displayName ?? "");
      const nombre = normalizar(displayName);
      const logos = team.logos as { href: string }[] | undefined;
      const logo = logos?.[0]?.href ?? null;
      if (nombre && logo) logoMap[nombre] = logo;
    }

    return NextResponse.json(logoMap, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({});
  }
}
