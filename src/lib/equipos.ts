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

  // ── UEFA Champions League ────────────────────────────────────────
  "Real Madrid":           "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
  "Barcelona":             "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
  "Bayern Munich":         "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
  "Manchester City":       "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  "PSG":                   "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  "Paris Saint-Germain":   "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  "Liverpool":             "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
  "Chelsea":               "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
  "Arsenal":               "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
  "Manchester United":     "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  "Tottenham":             "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
  "Juventus":              "https://a.espncdn.com/i/teamlogos/soccer/500/111.png",
  "Inter Milan":           "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
  "AC Milan":              "https://a.espncdn.com/i/teamlogos/soccer/500/103.png",
  "Atlético Madrid":       "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
  "Borussia Dortmund":     "https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
  "Bayer Leverkusen":      "https://a.espncdn.com/i/teamlogos/soccer/500/123.png",
  "RB Leipzig":            "https://a.espncdn.com/i/teamlogos/soccer/500/3908.png",
  "Ajax":                  "https://a.espncdn.com/i/teamlogos/soccer/500/169.png",
  "Porto":                 "https://a.espncdn.com/i/teamlogos/soccer/500/235.png",
  "Benfica":               "https://a.espncdn.com/i/teamlogos/soccer/500/236.png",
  "Sporting CP":           "https://a.espncdn.com/i/teamlogos/soccer/500/744.png",
  "PSV":                   "https://a.espncdn.com/i/teamlogos/soccer/500/167.png",
  "Feyenoord":             "https://a.espncdn.com/i/teamlogos/soccer/500/168.png",
  "Club Brugge":           "https://a.espncdn.com/i/teamlogos/soccer/500/1872.png",
  "Napoli":                "https://a.espncdn.com/i/teamlogos/soccer/500/113.png",
  "Roma":                  "https://a.espncdn.com/i/teamlogos/soccer/500/104.png",
  "Lazio":                 "https://a.espncdn.com/i/teamlogos/soccer/500/112.png",
  "Sevilla":               "https://a.espncdn.com/i/teamlogos/soccer/500/243.png",
  "Villarreal":            "https://a.espncdn.com/i/teamlogos/soccer/500/449.png",
  "Aston Villa":           "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
  "Celtic":                "https://a.espncdn.com/i/teamlogos/soccer/500/254.png",
  "Galatasaray":           "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
  "Shakhtar Donetsk":      "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
  "Red Bull Salzburg":     "https://a.espncdn.com/i/teamlogos/soccer/500/2820.png",
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
    // Fase de liga 2024-25 — 36 equipos
    // Octavos de final clasificados (actualizar conforme avance el torneo)
    "Real Madrid", "Barcelona", "Bayern Munich", "Liverpool",
    "Arsenal", "Inter Milan", "Atlético Madrid", "Borussia Dortmund",
    "Bayer Leverkusen", "Manchester City", "PSG", "Aston Villa",
    "Benfica", "Monaco", "Club Brugge", "Atalanta",
    "Feyenoord", "PSV", "Milan", "Juventus",
    "Lille", "Sporting CP", "Celtic", "Brest",
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
