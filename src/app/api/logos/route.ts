import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LIGA_ESPN: Record<string, string> = {
  "Liga MX":          "mex.1",
  "Champions League": "uefa.champions",
  "Premier League":   "eng.1",
  "La Liga":          "esp.1",
  "Serie A":          "ita.1",
};

// Quita acentos y pasa a minúsculas para comparación flexible
function slugify(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Mapeo ESPN displayName → nombre en nuestro sistema
// Incluye variantes con/sin acentos y artículos
const NOMBRE_MAP: Record<string, string> = {
  // Liga MX — nombres que ESPN usa distinto
  "Club América":                "América",
  "Chivas":                      "Guadalajara",
  "Guadalajara":                 "Guadalajara",
  "Tigres":                      "Tigres UANL",
  "Tigres UANL":                 "Tigres UANL",
  "Pumas":                       "Pumas UNAM",
  "Pumas UNAM":                  "Pumas UNAM",
  "FC Juarez":                   "FC Juárez",   // ESPN sin acento
  "FC Juárez":                   "FC Juárez",
  "Juarez":                      "FC Juárez",
  "Mazatlán FC":                 "Mazatlán",
  "Mazatlan FC":                 "Mazatlán",
  "Mazatlán":                    "Mazatlán",
  "Atlético de San Luis":        "Atlético San Luis",  // ESPN con "de"
  "Atletico de San Luis":        "Atlético San Luis",
  "Atl. San Luis":               "Atlético San Luis",
  "San Luis":                    "Atlético San Luis",
  // Champions / Europa
  "Paris Saint-Germain":         "PSG",
  "Atletico Madrid":             "Atlético Madrid",
  "Atletico de Madrid":          "Atlético Madrid",
  "Atlético de Madrid":          "Atlético Madrid",
  "Club Brugge KV":              "Club Brugge",
  "Sporting Clube de Portugal":  "Sporting CP",
  // Serie A
  "Milan":                       "AC Milan",
  "AC Milan":                    "AC Milan",
  "Internazionale":              "Inter",
  "Inter Milan":                 "Inter",
  "FC Internazionale Milano":    "Inter",
  // Liga MX
  "Santos":                      "Santos Laguna",
  "Santos Laguna":               "Santos Laguna",
  // Premier
  "West Ham United":             "West Ham",
  "Brighton & Hove Albion":      "Brighton",
  "Newcastle United":            "Newcastle",
  "Wolverhampton Wanderers":     "Wolverhampton",
  "AFC Bournemouth":             "Bournemouth",
  "Tottenham Hotspur":           "Tottenham",
  "Manchester United":           "Manchester United",
  "Manchester City":             "Manchester City",
  "Nottingham Forest":           "Nottingham Forest",
};

function normalizar(nombre: string): string {
  return NOMBRE_MAP[nombre] ?? nombre;
}

export async function GET(req: NextRequest) {
  const liga = req.nextUrl.searchParams.get("liga") ?? "Liga MX";
  const slug = LIGA_ESPN[liga];
  if (!slug) return NextResponse.json({});

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`;
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

      // Registrar con múltiples claves para máxima cobertura
      const candidatos = new Set<string>();
      for (const campo of ["displayName", "shortDisplayName", "name", "location"] as const) {
        const raw = team[campo] as string | undefined;
        if (!raw) continue;
        candidatos.add(raw);                    // original ESPN
        candidatos.add(normalizar(raw));         // mapeado a nuestro sistema
        candidatos.add(slugify(raw));            // sin acentos lowercase
        candidatos.add(slugify(normalizar(raw)));
      }
      for (const key of candidatos) {
        if (key) logoMap[key] = logoUrl;
      }
    }

    return NextResponse.json(logoMap, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({});
  }
}
