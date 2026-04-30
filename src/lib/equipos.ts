// URLs de logos de ESPN CDN (públicos, sin API key)
const LOGOS: Record<string, string> = {
  // ── Liga MX ──────────────────────────────────────────────────────
  "América":               "https://a.espncdn.com/i/teamlogos/soccer/500/227.png",
  "Atlas":                 "https://a.espncdn.com/i/teamlogos/soccer/500/216.png",
  "Atlético San Luis":     "https://a.espncdn.com/i/teamlogos/soccer/500/15720.png",
  "Atlético de San Luis":  "https://a.espncdn.com/i/teamlogos/soccer/500/15720.png",
  "San Luis":              "https://a.espncdn.com/i/teamlogos/soccer/500/15720.png",
  "Cruz Azul":             "https://a.espncdn.com/i/teamlogos/soccer/500/218.png",
  "FC Juárez":             "https://a.espncdn.com/i/teamlogos/soccer/500/17851.png",
  "FC Juarez":             "https://a.espncdn.com/i/teamlogos/soccer/500/17851.png",
  "Guadalajara":           "https://a.espncdn.com/i/teamlogos/soccer/500/219.png",
  "León":                  "https://a.espncdn.com/i/teamlogos/soccer/500/228.png",
  "Mazatlán":              "https://a.espncdn.com/i/teamlogos/soccer/500/20702.png",
  "Mazatlán FC":           "https://a.espncdn.com/i/teamlogos/soccer/500/20702.png",
  "Monterrey":             "https://a.espncdn.com/i/teamlogos/soccer/500/220.png",
  "Necaxa":                "https://a.espncdn.com/i/teamlogos/soccer/500/229.png",
  "Pachuca":               "https://a.espncdn.com/i/teamlogos/soccer/500/234.png",
  "Puebla":                "https://a.espncdn.com/i/teamlogos/soccer/500/231.png",
  "Pumas UNAM":            "https://a.espncdn.com/i/teamlogos/soccer/500/233.png",
  "Pumas":                 "https://a.espncdn.com/i/teamlogos/soccer/500/233.png",
  "Querétaro":             "https://a.espncdn.com/i/teamlogos/soccer/500/222.png",
  "Santos Laguna":         "https://a.espncdn.com/i/teamlogos/soccer/500/225.png",
  "Santos":                "https://a.espncdn.com/i/teamlogos/soccer/500/225.png",
  "Tigres UANL":           "https://a.espncdn.com/i/teamlogos/soccer/500/232.png",
  "Tigres":                "https://a.espncdn.com/i/teamlogos/soccer/500/232.png",
  "Tijuana":               "https://a.espncdn.com/i/teamlogos/soccer/500/10125.png",
  "Toluca":                "https://a.espncdn.com/i/teamlogos/soccer/500/223.png",

  // ── Premier League ────────────────────────────────────────────────
  "Arsenal":               "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
  "Liverpool":             "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
  "Manchester City":       "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  "Chelsea":               "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
  "Aston Villa":           "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
  "Tottenham":             "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
  "Tottenham Hotspur":     "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
  "Manchester United":     "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  "Newcastle":             "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
  "West Ham":              "https://a.espncdn.com/i/teamlogos/soccer/500/371.png",
  "Brighton":              "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
  "Everton":               "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
  "Fulham":                "https://a.espncdn.com/i/teamlogos/soccer/500/370.png",
  "Nottingham Forest":     "https://a.espncdn.com/i/teamlogos/soccer/500/393.png",
  "Brentford":             "https://a.espncdn.com/i/teamlogos/soccer/500/337.png",
  "Wolverhampton":         "https://a.espncdn.com/i/teamlogos/soccer/500/380.png",
  "Crystal Palace":        "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
  "Leicester City":        "https://a.espncdn.com/i/teamlogos/soccer/500/375.png",
  "Ipswich Town":          "https://a.espncdn.com/i/teamlogos/soccer/500/373.png",
  "Southampton":           "https://a.espncdn.com/i/teamlogos/soccer/500/376.png",
  "Bournemouth":           "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",

  // ── La Liga ───────────────────────────────────────────────────────
  "Real Madrid":           "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
  "Barcelona":             "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
  "Atlético Madrid":       "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
  "Villarreal":            "https://a.espncdn.com/i/teamlogos/soccer/500/102.png",
  "Sevilla":               "https://a.espncdn.com/i/teamlogos/soccer/500/243.png",
  "Athletic Club":         "https://a.espncdn.com/i/teamlogos/soccer/500/93.png",
  "Real Sociedad":         "https://a.espncdn.com/i/teamlogos/soccer/500/89.png",
  "Real Betis":            "https://a.espncdn.com/i/teamlogos/soccer/500/244.png",
  "Valencia":              "https://a.espncdn.com/i/teamlogos/soccer/500/94.png",
  "Osasuna":               "https://a.espncdn.com/i/teamlogos/soccer/500/97.png",
  "Girona":                "https://a.espncdn.com/i/teamlogos/soccer/500/9812.png",
  "Celta Vigo":            "https://a.espncdn.com/i/teamlogos/soccer/500/85.png",
  "Rayo Vallecano":        "https://a.espncdn.com/i/teamlogos/soccer/500/101.png",
  "Getafe":                "https://a.espncdn.com/i/teamlogos/soccer/500/3842.png",
  "Deportivo Alavés":      "https://a.espncdn.com/i/teamlogos/soccer/500/3751.png",
  "Mallorca":              "https://a.espncdn.com/i/teamlogos/soccer/500/95.png",
  "Leganés":               "https://a.espncdn.com/i/teamlogos/soccer/500/17534.png",
  "Espanyol":              "https://a.espncdn.com/i/teamlogos/soccer/500/88.png",
  "Las Palmas":            "https://a.espncdn.com/i/teamlogos/soccer/500/5593.png",
  // Valladolid: sin logo verificado — muestra iniciales


  // ── UEFA Champions League ─────────────────────────────────────────
  "Bayern Munich":         "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
  "PSG":                   "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  "Paris Saint-Germain":   "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  "Juventus":              "https://a.espncdn.com/i/teamlogos/soccer/500/111.png",
  "Inter Milan":           "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
  "AC Milan":              "https://a.espncdn.com/i/teamlogos/soccer/500/103.png",
  "Borussia Dortmund":     "https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
  "Bayer Leverkusen":      "https://a.espncdn.com/i/teamlogos/soccer/500/131.png",
  "RB Leipzig":            "https://a.espncdn.com/i/teamlogos/soccer/500/3908.png",
  "Ajax":                  "https://a.espncdn.com/i/teamlogos/soccer/500/169.png",
  "Porto":                 "https://a.espncdn.com/i/teamlogos/soccer/500/235.png",
  "Benfica":               "https://a.espncdn.com/i/teamlogos/soccer/500/236.png",
  "Sporting CP":           "https://a.espncdn.com/i/teamlogos/soccer/500/2250.png",
  "PSV":                   "https://a.espncdn.com/i/teamlogos/soccer/500/167.png",
  "Feyenoord":             "https://a.espncdn.com/i/teamlogos/soccer/500/142.png",
  "Club Brugge":           "https://a.espncdn.com/i/teamlogos/soccer/500/570.png",
  "Napoli":                "https://a.espncdn.com/i/teamlogos/soccer/500/113.png",
  "Roma":                  "https://a.espncdn.com/i/teamlogos/soccer/500/104.png",
  "Lazio":                 "https://a.espncdn.com/i/teamlogos/soccer/500/112.png",
  "Celtic":                "https://a.espncdn.com/i/teamlogos/soccer/500/254.png",
  "Galatasaray":           "https://a.espncdn.com/i/teamlogos/soccer/500/2832.png",
  "Shakhtar Donetsk":      "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
  "Red Bull Salzburg":     "https://a.espncdn.com/i/teamlogos/soccer/500/2790.png",
  "Monaco":                "https://a.espncdn.com/i/teamlogos/soccer/500/174.png",
  "Atalanta":              "https://a.espncdn.com/i/teamlogos/soccer/500/105.png",
  "Lille":                 "https://a.espncdn.com/i/teamlogos/soccer/500/162.png",
  "Brest":                 "https://a.espncdn.com/i/teamlogos/soccer/500/6997.png",
};

// Equipos activos por liga en la temporada actual.
// Actualizar aquí cuando un equipo sea eliminado/relegado.
export const EQUIPOS_POR_LIGA: Record<string, string[]> = {
  "Liga MX": [
    // Clausura 2026 — 17 equipos (León descendió a Liga de Expansión)
    "América", "Guadalajara", "Cruz Azul", "Pumas UNAM", "Tigres UANL",
    "Monterrey", "Santos Laguna", "Toluca", "Atlas",
    "Pachuca", "Necaxa", "Querétaro", "FC Juárez", "Mazatlán",
    "Tijuana", "Atlético San Luis", "Puebla",
  ],
  "Champions League": [
    // Octavos de final 2024-25
    "Real Madrid", "Barcelona", "Bayern Munich", "Liverpool",
    "Arsenal", "Inter Milan", "Atlético Madrid", "Borussia Dortmund",
    "Bayer Leverkusen", "Manchester City", "PSG", "Aston Villa",
    "Benfica", "Monaco", "Club Brugge", "Atalanta",
    "Feyenoord", "PSV", "AC Milan", "Juventus",
    "Lille", "Sporting CP", "Celtic", "Brest",
  ],
  "Premier League": [
    // Temporada 2024-25
    "Arsenal", "Liverpool", "Manchester City", "Chelsea", "Aston Villa",
    "Tottenham", "Manchester United", "Newcastle", "West Ham", "Brighton",
    "Wolverhampton", "Fulham", "Bournemouth", "Crystal Palace", "Brentford",
    "Nottingham Forest", "Everton", "Leicester City", "Ipswich Town", "Southampton",
  ],
  "La Liga": [
    // Temporada 2024-25
    "Real Madrid", "Barcelona", "Atlético Madrid", "Athletic Club", "Real Sociedad",
    "Villarreal", "Real Betis", "Sevilla", "Valencia", "Osasuna",
    "Girona", "Celta Vigo", "Rayo Vallecano", "Getafe", "Deportivo Alavés",
    "Mallorca", "Leganés", "Espanyol", "Las Palmas", "Valladolid",
  ],
};

export const LIGAS = Object.keys(EQUIPOS_POR_LIGA);

export function getLogoUrl(equipo: string): string {
  return LOGOS[equipo] ?? "";
}

// Mantener compatibilidad async
export async function getLogoUrlAsync(equipo: string): Promise<string> {
  return getLogoUrl(equipo);
}
