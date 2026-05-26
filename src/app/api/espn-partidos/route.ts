import { NextRequest, NextResponse } from "next/server";

// Mapeo slug de liga → URL ESPN
const LIGA_ESPN: Record<string, { url: string; nombre: string }> = {
  "Liga MX":          { url: "mex.1",          nombre: "Liga MX" },
  "Champions League": { url: "uefa.champions",  nombre: "Champions League" },
  "Premier League":   { url: "eng.1",           nombre: "Premier League" },
  "La Liga":          { url: "esp.1",           nombre: "La Liga" },
  "Ligue 1":          { url: "fra.1",           nombre: "Ligue 1" },
  "Brasileirão":      { url: "bra.1",           nombre: "Brasileirão" },
  "Liga Argentina":   { url: "arg.1",           nombre: "Liga Argentina" },
  "Serie A":          { url: "ita.1",           nombre: "Serie A" },
  "Bundesliga":       { url: "ger.1",           nombre: "Bundesliga" },
  "Copa Libertadores":{ url: "conmebol.libertadores", nombre: "Copa Libertadores" },
  "Mundial":          { url: "fifa.world",      nombre: "Mundial" },
};

// Normalizar nombres ESPN → nombres de nuestro sistema
const NOMBRE_MAP: Record<string, string> = {
  // Premier League
  "West Ham United":          "West Ham",
  "Brighton & Hove Albion":   "Brighton",
  "Newcastle United":         "Newcastle",
  "Wolverhampton Wanderers":  "Wolverhampton",
  "Nottingham Forest":        "Nottingham Forest",
  "Leicester City":           "Leicester City",
  "Ipswich Town":             "Ipswich Town",
  "Leeds United":             "Leeds United",
  "AFC Bournemouth":          "Bournemouth",
  "Sunderland AFC":           "Sunderland",
  // Champions
  "Paris Saint-Germain":      "PSG",
  "Bayern Munich":            "Bayern Munich",
  "Atletico Madrid":          "Atlético Madrid",
  "Atletico de Madrid":       "Atlético Madrid",
  "Borussia Dortmund":        "Borussia Dortmund",
  "Bayer Leverkusen":         "Bayer Leverkusen",
  "Club Brugge KV":           "Club Brugge",
  "Sporting Clube de Portugal": "Sporting CP",
  // Serie A
  "FC Internazionale Milano":  "Inter Milan",
  "Internazionale":            "Inter Milan",
  "Inter":                     "Inter Milan",
  "Milan":                     "AC Milan",
  "AS Roma":                   "Roma",
  "SS Lazio":                  "Lazio",
  "ACF Fiorentina":            "Fiorentina",
  "Hellas Verona FC":          "Hellas Verona",
  "Genoa CFC":                 "Genoa",
  "Parma Calcio 1913":         "Parma",
  "US Lecce":                  "Lecce",
  "Cagliari Calcio":           "Cagliari",
  "FC Empoli":                 "Empoli",
  "AC Monza":                  "Monza",
  "Venezia FC":                "Venezia",
  "Torino FC":                 "Torino",
  "Bologna FC 1909":           "Bologna",
  "Udinese Calcio":            "Udinese",
  "Juventus FC":               "Juventus",
  "SSC Napoli":                "Napoli",
  "US Cremonese":              "Cremonese",
  // Bundesliga
  "FC Bayern München":         "Bayern Munich",
  "FC Bayern Munich":          "Bayern Munich",
  "Bayer 04 Leverkusen":       "Bayer Leverkusen",
  "RasenBallsport Leipzig":    "RB Leipzig",
  "1. FC Union Berlin":        "Union Berlin",
  "1. FC Heidenheim 1846":     "Heidenheim",
  "1. FSV Mainz 05":           "Mainz 05",
  "FC Augsburg":               "Augsburg",
  "TSG 1899 Hoffenheim":       "Hoffenheim",
  "SV Werder Bremen":          "Werder Bremen",
  "Sport-Club Freiburg":       "SC Freiburg",
  "VfB Stuttgart":             "Stuttgart",
  "VfL Wolfsburg":             "Wolfsburg",
  "Borussia Mönchengladbach":  "Borussia Mönchengladbach",
  "FC St. Pauli":              "St. Pauli",
  "FC Cologne":                "Köln",
  "1. FC Köln":                "Köln",
  "Holstein Kiel":             "Holstein Kiel",
  // Copa Libertadores
  "Club Nacional de Football":  "Nacional",
  "Club Atlético Peñarol":      "Peñarol",
  "Club Social y Deportivo Colo-Colo": "Colo Colo",
  "Liga Deportiva Universitaria": "LDU Quito",
  "Liga de Quito":              "LDU Quito",
  "Club Olimpia":               "Olimpia",
  "Club Cerro Porteño":         "Cerro Porteño",
  "Club Libertad":              "Libertad",
  "Club Bolívar":               "Bolívar",
  "Universitario de Deportes":  "Universitario",
  "Sociedade Esportiva Palmeiras": "Palmeiras",
  "Clube de Regatas do Flamengo": "Flamengo",
  "Fluminense FC":              "Fluminense",
  "Club Athletico Paranaense":  "Athletico Paranaense",
  "Clube Atlético Mineiro":     "Atlético Mineiro",
  "Botafogo de Futebol e Regatas": "Botafogo",
  "São Paulo FC":               "São Paulo",
  "SC Internacional":           "Internacional",
  "Grêmio FBPA":                "Grêmio",
  "Club Atlético Boca Juniors": "Boca Juniors",
  "Club Atlético River Plate":  "River Plate",
  "Club Atlético Independiente": "Independiente",
  "Estudiantes de La Plata":    "Estudiantes LP",
  "Talleres de Córdoba":        "Talleres",
  "Atlético Junior":            "Junior",
  "Atlético Nacional":          "Atlético Nacional",
  // Liga MX
  "Chivas":                   "Guadalajara",
  "Tigres":                   "Tigres UANL",
  "Pumas":                    "Pumas UNAM",
  "FC Juárez":                "FC Juárez",
  "Mazatlán FC":              "Mazatlán",
  "San Luis":                 "Atlético San Luis",
  "Atlético San Luis":        "Atlético San Luis",
  // ── Mundial 2026 — inglés → español ─────────────────────────────────
  "Mexico":                   "México",
  "United States":            "Estados Unidos",
  "Canada":                   "Canadá",
  "Brazil":                   "Brasil",
  "Germany":                  "Alemania",
  "France":                   "Francia",
  "Spain":                    "España",
  "England":                  "Inglaterra",
  "Netherlands":              "Países Bajos",
  "Japan":                    "Japón",
  "South Korea":              "Corea del Sur",
  "Saudi Arabia":             "Arabia Saudita",
  "Australia":                "Australia",
  "Morocco":                  "Marruecos",
  "Senegal":                  "Senegal",
  "Italy":                    "Italia",
  "Belgium":                  "Bélgica",
  "Croatia":                  "Croacia",
  "Switzerland":              "Suiza",
  "Denmark":                  "Dinamarca",
  "Austria":                  "Austria",
  "Sweden":                   "Suecia",
  "Serbia":                   "Serbia",
  "Scotland":                 "Escocia",
  "Czechia":                  "Rep. Checa",
  "Czech Republic":           "Rep. Checa",
  "Romania":                  "Rumania",
  "Greece":                   "Grecia",
  "Hungary":                  "Hungría",
  "Ukraine":                  "Ucrania",
  "Georgia":                  "Georgia",
  "Turkey":                   "Türkiye",
  "Türkiye":                  "Türkiye",
  "Slovakia":                 "Eslovaquia",
  "Slovenia":                 "Eslovenia",
  "Wales":                    "Gales",
  "Norway":                   "Noruega",
  "Iceland":                  "Islandia",
  "Finland":                  "Finlandia",
  "Luxembourg":               "Luxemburgo",
  "Poland":                   "Polonia",
  "Nigeria":                  "Nigeria",
  "Egypt":                    "Egipto",
  "South Africa":             "Sudáfrica",
  "Cameroon":                 "Camerún",
  "Ivory Coast":              "Costa de Marfil",
  "Côte d'Ivoire":            "Costa de Marfil",
  "Algeria":                  "Argelia",
  "Tunisia":                  "Túnez",
  "DR Congo":                 "R.D. Congo",
  "Congo":                    "R.D. Congo",
  "Mali":                     "Mali",
  "Guinea":                   "Guinea",
  "Iran":                     "Irán",
  "Iraq":                     "Irak",
  "Uzbekistan":               "Uzbekistán",
  "Jordan":                   "Jordania",
  "Oman":                     "Omán",
  "Indonesia":                "Indonesia",
  "Palestine":                "Palestina",
  "Qatar":                    "Qatar",
  "Panama":                   "Panamá",
  "Honduras":                 "Honduras",
  "Jamaica":                  "Jamaica",
  "Bosnia-Herzegovina":       "Bosnia-Herzegovina",
  "Bosnia and Herzegovina":   "Bosnia-Herzegovina",
  "Albania":                  "Albania",
  "Ecuador":                  "Ecuador",
  "Peru":                     "Perú",
  "Chile":                    "Chile",
  "Colombia":                 "Colombia",
  "Uruguay":                  "Uruguay",
  "Argentina":                "Argentina",
  "Bolivia":                  "Bolivia",
  "Venezuela":                "Venezuela",
  "El Salvador":              "El Salvador",
  "Cuba":                     "Cuba",
  "Suriname":                 "Surinam",
  "Portugal":                 "Portugal",
  "New Zealand":              "Nueva Zelanda",
};

function normalizarNombre(nombre: string): string {
  return NOMBRE_MAP[nombre] ?? nombre;
}

// Formatear fecha UTC → datetime-local (YYYY-MM-DDTHH:MM) en hora de México.
// IMPORTANTE: input type=datetime-local no acepta timezone en el value, así que
// retornamos solo "YYYY-MM-DDTHH:MM". El servidor normaliza agregando "-06:00" al parsear.
function toLocalMX(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "";
  // Detectar DST de México: horario de verano abarca aprox. de marzo a octubre (CDT = UTC-5)
  const monthUTC = d.getUTCMonth(); // 0=ene … 11=dic
  const offsetHours = (monthUTC >= 3 && monthUTC <= 9) ? -5 : -6;
  const local = new Date(d.getTime() + offsetHours * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`
  );
}

// Traduce términos en inglés que ESPN usa en los slugs de temporada
const TRADUCCION_ESPN: [RegExp, string][] = [
  [/\bQuarterfinals\b/gi,    "Cuartos de Final"],
  [/\bQuarterfinal\b/gi,     "Cuarto de Final"],
  [/\bSemifinals\b/gi,       "Semifinales"],
  [/\bSemifinal\b/gi,        "Semifinal"],
  [/\bRound Of 16\b/gi,      "Octavos de Final"],
  [/\bRound Of 32\b/gi,      "Dieciseisavos de Final"],
  [/\bGroup Stage\b/gi,      "Fase de Grupos"],
  [/\bGroup ([A-Z])\b/g,     "Grupo $1"],
  [/\bRegular Season\b/gi,   "Temporada Regular"],
  [/\bPlayoffs\b/gi,         "Playoffs"],
  [/\bPlayoff\b/gi,          "Playoff"],
  [/\bFinal\b/gi,            "Final"],
];

function traducirNombreEspn(nombre: string): string {
  let r = nombre;
  for (const [patron, reemplazo] of TRADUCCION_ESPN) {
    r = r.replace(patron, reemplazo);
  }
  return r;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const liga = searchParams.get("liga") ?? "Liga MX";
  const desde = searchParams.get("desde"); // YYYYMMDD
  const hasta = searchParams.get("hasta"); // YYYYMMDD

  const config = LIGA_ESPN[liga];
  if (!config) {
    return NextResponse.json({ error: "Liga no válida" }, { status: 400 });
  }

  // Rango de fechas: por defecto hoy + 10 días
  const hoy = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const fechaDesde = desde ?? formatDate(hoy);
  const masdiez = new Date(hoy); masdiez.setDate(hoy.getDate() + 10);
  const fechaHasta = hasta ?? formatDate(masdiez);

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${config.url}/scoreboard?dates=${fechaDesde}-${fechaHasta}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    const events: Record<string, unknown>[] = data?.events ?? [];

    const partidos = events
      .filter((e) => {
        const comp = (e.competitions as Record<string, unknown>[])?.[0];
        const status = (comp?.status as Record<string, unknown>)?.type as Record<string, unknown>;
        // Solo partidos programados (no jugados aún)
        return status?.state === "pre" || status?.completed === false;
      })
      .map((e) => {
        const comp = (e.competitions as Record<string, unknown>[])[0];
        const competitors = comp.competitors as Record<string, unknown>[];
        const home = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
        const away = competitors.find((c) => c.homeAway === "away") ?? competitors[1];
        const homeTeam = home.team as Record<string, unknown>;
        const awayTeam = away.team as Record<string, unknown>;

        return {
          equipoLocal:  normalizarNombre(homeTeam.displayName as string),
          equipoVisita: normalizarNombre(awayTeam.displayName as string),
          fechaHora:    toLocalMX(e.date as string),
          liga,
        };
      });

    // Detectar nombre de la jornada desde ESPN y traducir al español
    const primeraTemporada = (events[0] as Record<string, unknown>)?.season as Record<string, unknown>;
    const nombreJornada = primeraTemporada?.slug
      ? traducirNombreEspn(
          String(primeraTemporada.slug)
            .replace(/-+/g, " ")           // uno o más guiones → un espacio
            .trim()
            .replace(/  +/g, " ")          // espacios múltiples → uno
            .replace(/\b\w/g, (c) => c.toUpperCase())
        )
      : null;

    return NextResponse.json({
      partidos,
      total: partidos.length,
      liga,
      nombreSugerido: nombreJornada,
      rango: `${fechaDesde} → ${fechaHasta}`,
    });
  } catch (err) {
    console.error("[ESPN-PARTIDOS]", err);
    return NextResponse.json({ error: "Error al conectar con ESPN" }, { status: 500 });
  }
}
