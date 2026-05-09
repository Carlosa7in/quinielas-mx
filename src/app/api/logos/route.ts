import { NextRequest, NextResponse } from "next/server";

const LIGA_ESPN: Record<string, string> = {
  "Liga MX":          "mex.1",
  "Champions League": "uefa.champions",
  "Premier League":   "eng.1",
  "La Liga":          "esp.1",
};

// ESPN puede devolver nombres distintos a los nuestros — normalizamos
// tanto displayName como shortDisplayName para maximizar coincidencias.
const NOMBRE_MAP: Record<string, string> = {
  // Liga MX
  "Club América":               "América",
  "Chivas":                     "Guadalajara",
  "Guadalajara":                "Guadalajara",
  "Tigres":                     "Tigres UANL",
  "Tigres UANL":                "Tigres UANL",
  "Pumas":                      "Pumas UNAM",
  "Pumas UNAM":                 "Pumas UNAM",
  "FC Juárez":                  "FC Juárez",
  "Juárez":                     "FC Juárez",
  "Mazatlán FC":                "Mazatlán",
  "Mazatlán":                   "Mazatlán",
  "San Luis":                   "Atlético San Luis",
  "Atlético San Luis":          "Atlético San Luis",
  "Cruz Azul":                  "Cruz Azul",
  "Monterrey":                  "Monterrey",
  "Atlas":                      "Atlas",
  "León":                       "León",
  "Santos Laguna":              "Santos Laguna",
  "Toluca":                     "Toluca",
  "Necaxa":                     "Necaxa",
  "Querétaro":                  "Querétaro",
  "Tijuana":                    "Tijuana",
  "Pachuca":                    "Pachuca",
  // Champions / Europa
  "Paris Saint-Germain":        "PSG",
  "Atletico Madrid":            "Atlético Madrid",
  "Atletico de Madrid":         "Atlético Madrid",
  "Atlético de Madrid":         "Atlético Madrid",
  "Club Brugge KV":             "Club Brugge",
  "Club Brugge":                "Club Brugge",
  "Sporting Clube de Portugal": "Sporting CP",
  "Sporting CP":                "Sporting CP",
  "Bayern Munich":              "Bayern Munich",
  "Borussia Dortmund":          "Borussia Dortmund",
  "Bayer Leverkusen":           "Bayer Leverkusen",
  // Premier
  "West Ham United":            "West Ham",
  "Brighton & Hove Albion":     "Brighton",
  "Newcastle United":           "Newcastle",
  "Wolverhampton Wanderers":    "Wolverhampton",
  "Nottingham Forest":          "Nottingham Forest",
  "AFC Bournemouth":            "Bournemouth",
  "Sunderland AFC":             "Sunderland",
  "Manchester United":          "Manchester United",
  "Manchester City":            "Manchester City",
  "Tottenham Hotspur":          "Tottenham",
  // La Liga
  "Athletic Club":              "Athletic Club",
  "Real Betis":                 "Real Betis",
  "Celta Vigo":                 "Celta Vigo",
  "Real Sociedad":              "Real Sociedad",
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
    // cache: "no-store" para evitar el bug de Next.js que devuelve la misma
    // respuesta cacheada para diferentes ligas.
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({});

    const data = await res.json();
    const teams: { team: Record<string, unknown> }[] =
      data?.sports?.[0]?.leagues?.[0]?.teams ?? [];

    const logoMap: Record<string, string> = {};

    for (const { team } of teams) {
      const logos = team.logos as { href: string }[] | undefined;
      const logoUrl = logos?.[0]?.href;
      if (!logoUrl) continue;

      // Registrar por displayName Y shortDisplayName para máxima cobertura
      for (const campo of ["displayName", "shortDisplayName", "name"] as const) {
        const rawNombre = team[campo] as string | undefined;
        if (!rawNombre) continue;
        const nombre = normalizar(rawNombre);
        if (nombre) logoMap[nombre] = logoUrl;
        // También guardar el nombre sin normalizar por si coincide exacto
        if (rawNombre !== nombre) logoMap[rawNombre] = logoUrl;
      }
    }

    return NextResponse.json(logoMap, {
      headers: {
        // Cachear en el navegador 1 hora, pero NO en Next.js server cache
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({});
  }
}
