import { NextRequest, NextResponse } from "next/server";

const LIGA_ESPN: Record<string, string> = {
  "Liga MX":                  "mex.1",
  "Apertura":                 "mex.1",
  "Clausura":                 "mex.1",
  "Mixta":                    "mex.1",
  "Liga MX Femenil":          "mex.w.1",
  "Champions League":         "uefa.champions",
  "UEFA Champions League":    "uefa.champions",
  "UEFA Europa League":       "uefa.europa",
  "Premier League":           "eng.1",
  "La Liga":                  "esp.1",
  "Serie A":                  "ita.1",
  "Bundesliga":               "ger.1",
  "Ligue 1":                  "fra.1",
  "MLS":                      "usa.1",
  "Brasileirão":              "bra.1",
  "Brasileirao":              "bra.1",
  "Copa Libertadores":        "conmebol.libertadores",
  "CONMEBOL Libertadores":    "conmebol.libertadores",
  "Libertadores":             "conmebol.libertadores",
  "Copa Sudamericana":        "conmebol.sudamericana",
  "Liga Argentina":           "arg.1",
  "Liga Portuguesa":          "por.1",
  "Eredivisie":               "ned.1",
  "Mundial":                  "fifa.world",
  "FIFA World Cup":           "fifa.world",
  "World Cup 2026":           "fifa.world",
  "Amistoso":                 "int.friendly",
  "Amistosos":                "int.friendly",
  "Amistoso Internacional":   "int.friendly",
  "Amistosos Internacional":  "int.friendly",
  "Amistoso Mundial":         "int.friendly",
  "Amistosos Mundial":        "int.friendly",
  "Internacional":            "int.friendly",
  "Friendly":                 "int.friendly",
  "FIFA Friendly":            "int.friendly",
};

const NOMBRE_MAP: Record<string, string> = {
  "West Ham United":              "West Ham",
  "Brighton & Hove Albion":       "Brighton",
  "Newcastle United":             "Newcastle",
  "Wolverhampton Wanderers":      "Wolverhampton",
  "AFC Bournemouth":              "Bournemouth",
  "Sunderland AFC":               "Sunderland",
  "Paris Saint-Germain":          "PSG",
  "Atletico Madrid":              "Atlético Madrid",
  "Atletico de Madrid":           "Atlético Madrid",
  "Sporting Clube de Portugal":   "Sporting CP",
  "Club Brugge KV":               "Club Brugge",
  "Chivas":                       "Guadalajara",
  "Tigres":                       "Tigres UANL",
  "Pumas":                        "Pumas UNAM",
  "FC Juárez":                    "FC Juárez",
  "Mazatlán FC":                  "Mazatlán",
  "San Luis":                     "Atlético San Luis",
};

function norm(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function normalizarNombre(nombre: string): string {
  return NOMBRE_MAP[nombre] ?? nombre;
}

const pad = (n: number) => String(n).padStart(2, "0");

export type EspnResultado = {
  equipoLocal: string;
  equipoVisita: string;
  golesLocal: number;
  golesVisita: number;
  resultado: "1" | "X" | "2";
  liga: string;
};

// GET /api/espn-resultados?ligas=Liga MX,Champions League&desde=20260501&hasta=20260510
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ligasParam = searchParams.get("ligas") ?? searchParams.get("liga") ?? "Liga MX";
  const ligas = ligasParam.split(",").map((l) => l.trim()).filter(Boolean);

  // Rango de fechas: por defecto últimos 14 días
  const hoy = new Date();
  const hace14 = new Date(hoy); hace14.setDate(hoy.getDate() - 14);
  const formatDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const desde = searchParams.get("desde") ?? formatDate(hace14);
  const hasta = searchParams.get("hasta") ?? formatDate(hoy);

  const todos: EspnResultado[] = [];

  for (const liga of ligas) {
    const slug = LIGA_ESPN[liga];
    if (!slug) continue;

    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${desde}-${hasta}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      const events: Record<string, unknown>[] = data?.events ?? [];

      for (const e of events) {
        const comp = (e.competitions as Record<string, unknown>[])?.[0];
        if (!comp) continue;

        const status = (comp.status as Record<string, unknown>)?.type as Record<string, unknown>;
        // Solo partidos terminados
        if (status?.state !== "post" && status?.completed !== true) continue;

        const competitors = comp.competitors as Record<string, unknown>[];
        const home = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
        const away = competitors.find((c) => c.homeAway === "away") ?? competitors[1];

        const homeTeam = home?.team as Record<string, unknown>;
        const awayTeam = away?.team as Record<string, unknown>;

        const gl = parseInt(String(home?.score ?? "0")) || 0;
        const gv = parseInt(String(away?.score ?? "0")) || 0;
        const resultado: "1" | "X" | "2" = gl > gv ? "1" : gl < gv ? "2" : "X";

        todos.push({
          equipoLocal:  normalizarNombre(homeTeam?.displayName as string ?? ""),
          equipoVisita: normalizarNombre(awayTeam?.displayName as string ?? ""),
          golesLocal: gl,
          golesVisita: gv,
          resultado,
          liga,
        });
      }
    } catch (err) {
      console.error(`[ESPN-RESULTADOS] liga=${liga}:`, err);
    }
  }

  return NextResponse.json({ resultados: todos, total: todos.length });
}

// Matching helper exportado — lo usa el cliente para cruzar nuestros partidos con ESPN
export function matchPartido(
  equipoLocal: string,
  equipoVisita: string,
  resultados: EspnResultado[]
): EspnResultado | null {
  const nl = norm(equipoLocal);
  const nv = norm(equipoVisita);

  for (const r of resultados) {
    const rl = norm(r.equipoLocal);
    const rv = norm(r.equipoVisita);
    // Match exacto o parcial (uno contiene al otro)
    const localMatch  = rl === nl || rl.includes(nl) || nl.includes(rl);
    const visitaMatch = rv === nv || rv.includes(nv) || nv.includes(rv);
    if (localMatch && visitaMatch) return r;
  }
  return null;
}
