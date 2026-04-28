// URLs de logos de ESPN CDN (públicos, sin API key)
const LOGOS: Record<string, string> = {
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
};

export async function getLogoUrl(equipo: string): Promise<string> {
  return LOGOS[equipo] ?? "";
}
