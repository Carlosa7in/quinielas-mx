import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LIGA_ESPN: Record<string, string> = {
  "Liga MX":          "mex.1",
  "Champions League": "uefa.champions",
  "Premier League":   "eng.1",
  "La Liga":          "esp.1",
  "Serie A":          "ita.1",
  "Ligue 1":          "fra.1",
  "Brasileirão":      "bra.1",
  "Liga Argentina":   "arg.1",
  "Bundesliga":       "ger.1",
  "Eredivisie":       "ned.1",
  "Liga Portugal":    "por.1",
  "Copa Libertadores": "conmebol.libertadores",
  "MLS":        "usa.1",
  "Amistosos":  "fifa.friendly",
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
  "Internazionale":              "Inter Milan",
  "Inter Milan":                 "Inter Milan",
  "FC Internazionale Milano":    "Inter Milan",
  "Inter":                       "Inter Milan",
  "AS Roma":                     "Roma",
  "SS Lazio":                    "Lazio",
  "ACF Fiorentina":              "Fiorentina",
  "Hellas Verona FC":            "Hellas Verona",
  "Genoa CFC":                   "Genoa",
  "Parma Calcio 1913":           "Parma",
  "US Lecce":                    "Lecce",
  "Cagliari Calcio":             "Cagliari",
  "FC Empoli":                   "Empoli",
  "AC Monza":                    "Monza",
  "Venezia FC":                  "Venezia",
  "Torino FC":                   "Torino",
  "Bologna FC 1909":             "Bologna",
  "Udinese Calcio":              "Udinese",
  "Juventus FC":                 "Juventus",
  "SSC Napoli":                  "Napoli",
  // Liga MX
  "Santos Laguna":               "Santos Laguna",
  // Brasileirão — Santos FC aparece como "Santos" en ESPN
  "Santos FC":                   "Santos",
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
  // Ligue 1
  "Olympique Lyonnais":          "Lyon",
  "RC Lens":                     "Lens",
  "Stade Rennais FC":            "Rennes",
  "Stade Brestois 29":           "Brest",
  "Stade de Reims":              "Reims",
  "Montpellier HSC":             "Montpellier",
  "FC Nantes":                   "Nantes",
  "Toulouse FC":                 "Toulouse",
  "Le Havre AC":                 "Le Havre",
  "Olympique de Marseille":      "Olympique de Marseille",
  "AS Monaco":                   "Monaco",
  "Paris FC":                    "Paris FC",
  // Brasileirão
  "SC Internacional":            "Internacional",
  "Club de Regatas Vasco da Gama": "Vasco da Gama",
  "Fluminense FC":               "Fluminense",
  "São Paulo FC":                "São Paulo",
  "Sport Club Corinthians Paulista": "Corinthians",
  "Grêmio FBPA":                 "Grêmio",
  "Club Athletico Paranaense":   "Athletico Paranaense",
  "Clube Atlético Mineiro":      "Atlético Mineiro",
  "Botafogo de Futebol e Regatas": "Botafogo",
  "Sociedade Esportiva Palmeiras": "Palmeiras",
  "Clube de Regatas do Flamengo": "Flamengo",

  // Bundesliga — variantes ESPN
  "FC Bayern München":           "Bayern Munich",
  "FC Bayern Munich":            "Bayern Munich",
  "Bayer 04 Leverkusen":         "Bayer Leverkusen",
  "RasenBallsport Leipzig":      "RB Leipzig",
  "Eintracht Frankfurt":         "Eintracht Frankfurt",
  "VfL Wolfsburg":               "Wolfsburg",
  "VfB Stuttgart":               "Stuttgart",
  "Borussia Mönchengladbach":    "Borussia Mönchengladbach",
  "Borussia Monchengladbach":    "Borussia Mönchengladbach",
  "SV Werder Bremen":            "Werder Bremen",
  "Sport-Club Freiburg":         "SC Freiburg",
  "TSG 1899 Hoffenheim":         "Hoffenheim",
  "FC Augsburg":                 "Augsburg",
  "1. FSV Mainz 05":             "Mainz 05",
  "1. FC Union Berlin":          "Union Berlin",
  "FC St. Pauli":                "St. Pauli",
  "1. FC Heidenheim 1846":       "Heidenheim",
  "Holstein Kiel":               "Holstein Kiel",
  "1. FC Köln":                  "Köln",

  // Copa Libertadores — variantes ESPN
  "Club Nacional de Football":   "Nacional",
  "Club Atlético Peñarol":       "Peñarol",
  "Club Social y Deportivo Colo-Colo": "Colo Colo",
  "Club Universidad de Chile":   "Universidad de Chile",
  "Liga Deportiva Universitaria": "LDU Quito",
  "Club Olimpia":                "Olimpia",
  "Club Cerro Porteño":          "Cerro Porteño",
  "Club Libertad":               "Libertad",
  "Club Bolívar":                "Bolívar",
  "Club Atlético Nacional":      "Atlético Nacional",
  "Millonarios FC":              "Millonarios",
  "Caracas FC":                  "Caracas FC",
  "Universitario de Deportes":   "Universitario",
  "Independiente del Valle":     "Independiente del Valle",

  // Liga Argentina — nombres ESPN
  "Club Atlético Boca Juniors":  "Boca Juniors",
  "Club Atlético River Plate":   "River Plate",
  "Racing Club":                 "Racing Club",
  "San Lorenzo de Almagro":      "San Lorenzo",
  "Club Atlético Independiente": "Independiente",
  "Estudiantes de La Plata":     "Estudiantes",
  "Vélez Sársfield":             "Vélez Sársfield",
  "Club Atlético Lanús":         "Lanús",
  "Talleres de Córdoba":         "Talleres",
  "Talleres (Córdoba)":          "Talleres",
  "Club Atlético Huracán":       "Huracán",
  "Club Atlético Belgrano":      "Belgrano",
  "Belgrano":                    "Belgrano",
  "Belgrano (Córdoba)":          "Belgrano",
  "Godoy Cruz Antonio Tomba":    "Godoy Cruz",
  "Club Atlético Tucumán":       "Atlético Tucumán",
  "Atlético Tucumán":            "Atlético Tucumán",
  "Barracas Central":            "Barracas Central",
  "Club Atlético Platense":      "Platense",
  "Club Atlético Tigre":         "Tigre",
  "Newell's Old Boys":           "Newell's Old Boys",
  "Club Atlético Rosario Central": "Rosario Central",
  "Argentinos Juniors":          "Argentinos Juniors",
  "Instituto (Córdoba)":         "Instituto",
  "Unión (Santa Fe)":            "Unión Santa Fe",
  "Sarmiento (Junín)":           "Sarmiento",
  "Gimnasia La Plata":           "Gimnasia LP",
  "Deportivo Riestra":           "Riestra",
  "Vélez Sarsfield":             "Vélez Sársfield",
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

// Endpoint adicional: /api/logos/db?liga=... — logos guardados en la tabla Equipo
// El flyer lo usa como fuente primaria (más confiable que ESPN)
export async function POST(req: NextRequest) {
  const liga = req.nextUrl.searchParams.get("liga") ?? "";
  if (!liga) return NextResponse.json({});
  try {
    const rows = await sql`
      SELECT nombre, "logoUrl" FROM "Equipo"
      WHERE liga = ${liga} AND "logoUrl" IS NOT NULL
    `;
    const logoMap: Record<string, string> = {};
    for (const r of rows) {
      if (!r.nombre || !r.logoUrl) continue;
      const nombre = String(r.nombre);
      const url = String(r.logoUrl);
      logoMap[nombre] = url;
      logoMap[slugify(nombre)] = url;
    }
    return NextResponse.json(logoMap);
  } catch {
    return NextResponse.json({});
  }
}
