import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/prisma";

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
  "Tigres UANL":                  "Tigres",
  "Pumas UNAM":                   "Pumas",
  "FC Juárez":                    "FC Juárez",
  "Mazatlán FC":                  "Mazatlán",
  "Atlético San Luis":            "San Luis",
  "Mexico":                       "México",
  "México":                       "México",
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

export type EspnResultado = {
  partidoId?: string;          // cuando viene de lookup por espnId
  equipoLocal: string;
  equipoVisita: string;
  golesLocal: number;
  golesVisita: number;
  resultado: "1" | "X" | "2";
  liga: string;
};

// Busca el resultado de un partido via ESPN summary (funciona para juegos históricos)
async function fetchResultadoPorEspnId(
  espnId: string,
  ligaSlug: string,
  equipoLocal: string,  // nombre en nuestra DB (para detectar si ESPN tiene el orden inverso)
): Promise<{ golesLocal: number; golesVisita: number; resultado: "1" | "X" | "2"; completado: boolean } | null> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${ligaSlug}/summary?event=${espnId}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;

    const comps = (data?.header as Record<string, unknown>)?.competitions as Record<string, unknown>[];
    const comp = comps?.[0];
    if (!comp) return null;

    const status = (comp.status as Record<string, unknown>)?.type as Record<string, unknown>;
    const completado = status?.state === "post" || status?.completed === true;
    if (!completado) return null;

    const competitors = comp.competitors as Record<string, unknown>[];
    const home = competitors?.find((c: Record<string, unknown>) => c.homeAway === "home") ?? competitors?.[0];
    const away = competitors?.find((c: Record<string, unknown>) => c.homeAway === "away") ?? competitors?.[1];

    const homeTeam = (home?.team as Record<string, unknown>)?.displayName as string ?? "";
    const awayTeam = (away?.team as Record<string, unknown>)?.displayName as string ?? "";
    const homeScore = parseInt(String(home?.score ?? "0")) || 0;
    const awayScore = parseInt(String(away?.score ?? "0")) || 0;

    // Detectar si ESPN tiene el orden invertido respecto a nuestra DB.
    // Si el nombre del equipo "home" de ESPN se parece más al "visita" de nuestra DB → swap.
    const nlDB = norm(equipoLocal);
    const nlESPN = norm(homeTeam);
    const naESPN = norm(awayTeam);
    const localEsHome = nlESPN.includes(nlDB) || nlDB.includes(nlESPN) || nlDB === nlESPN;
    const localEsAway = naESPN.includes(nlDB) || nlDB.includes(naESPN) || nlDB === naESPN;

    let gl: number;
    let gv: number;
    if (!localEsHome && localEsAway) {
      // ESPN home = nuestro visita → invertir
      gl = awayScore;
      gv = homeScore;
    } else {
      // ESPN home = nuestro local (normal)
      gl = homeScore;
      gv = awayScore;
    }

    const resultado: "1" | "X" | "2" = gl > gv ? "1" : gl < gv ? "2" : "X";
    return { golesLocal: gl, golesVisita: gv, resultado, completado };
  } catch {
    return null;
  }
}

// GET /api/espn-resultados?jornadaId=xxx
// — usa espnId guardado en DB para lookup directo (funciona para juegos históricos)
// — fallback: scoreboard sin fecha para el matchday actual
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const jornadaId = searchParams.get("jornadaId");

  const todos: EspnResultado[] = [];

  // ── Estrategia 1: espnId directo desde DB ─────────────────────────────────
  if (jornadaId) {
    const rows = await sql`
      SELECT id, "espnId", liga, "equipoLocal", "equipoVisita"
      FROM "Partido"
      WHERE "jornadaId" = ${jornadaId}
        AND "espnId" IS NOT NULL
    ` as { id: string; espnId: string; liga: string; equipoLocal: string; equipoVisita: string }[];

    await Promise.all(rows.map(async (p) => {
      const slug = LIGA_ESPN[p.liga] ?? "mex.1";
      const r = await fetchResultadoPorEspnId(p.espnId, slug, p.equipoLocal);
      if (!r) return;
      todos.push({
        partidoId:   p.id,
        equipoLocal:  p.equipoLocal,
        equipoVisita: p.equipoVisita,
        golesLocal:   r.golesLocal,
        golesVisita:  r.golesVisita,
        resultado:    r.resultado,
        liga:         p.liga,
      });
    }));
  }

  // ── Estrategia 2: scoreboard actual (hoy) — para partidos sin espnId ──────
  // Solo si se pasa jornadaId: busca partidos de esa jornada sin espnId y cruza con scoreboard
  if (jornadaId) {
    const sinId = await sql`
      SELECT id, liga, "equipoLocal", "equipoVisita"
      FROM "Partido"
      WHERE "jornadaId" = ${jornadaId}
        AND "espnId" IS NULL
    ` as { id: string; liga: string; equipoLocal: string; equipoVisita: string }[];

    if (sinId.length > 0) {
      const ligasSlugs = [...new Set(sinId.map(p => LIGA_ESPN[p.liga]).filter(Boolean))];
      const scoreboardEvents: Record<string, unknown>[] = [];

      await Promise.all(ligasSlugs.map(async (slug) => {
        try {
          const res = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`,
            { cache: "no-store" },
          );
          if (!res.ok) return;
          const data = await res.json() as { events?: Record<string, unknown>[] };
          scoreboardEvents.push(...(data.events ?? []));
        } catch { /* ignorar */ }
      }));

      for (const p of sinId) {
        // Buscar en scoreboard por nombre
        const matched = scoreboardEvents.find(ev => {
          const comps = (ev.competitions as Record<string, unknown>[])?.[0]?.competitors as Record<string, unknown>[];
          const home = comps?.find((c: Record<string, unknown>) => c.homeAway === "home");
          const away = comps?.find((c: Record<string, unknown>) => c.homeAway === "away");
          const nl = norm(p.equipoLocal);
          const nv = norm(p.equipoVisita);
          const hl = norm(normalizarNombre((home?.team as Record<string, unknown>)?.displayName as string ?? ""));
          const al = norm(normalizarNombre((away?.team as Record<string, unknown>)?.displayName as string ?? ""));
          return (hl.includes(nl) || nl.includes(hl)) && (al.includes(nv) || nv.includes(al));
        });

        if (!matched) continue;
        const comp = (matched.competitions as Record<string, unknown>[])?.[0];
        const status = (comp?.status as Record<string, unknown>)?.type as Record<string, unknown>;
        if (status?.state !== "post" && status?.completed !== true) continue;

        const competitors = comp?.competitors as Record<string, unknown>[];
        const home = competitors?.find((c: Record<string, unknown>) => c.homeAway === "home") ?? competitors?.[0];
        const away = competitors?.find((c: Record<string, unknown>) => c.homeAway === "away") ?? competitors?.[1];
        const gl = parseInt(String(home?.score ?? "0")) || 0;
        const gv = parseInt(String(away?.score ?? "0")) || 0;

        todos.push({
          partidoId:   p.id,
          equipoLocal:  p.equipoLocal,
          equipoVisita: p.equipoVisita,
          golesLocal:   gl,
          golesVisita:  gv,
          resultado:    gl > gv ? "1" : gl < gv ? "2" : "X",
          liga:         p.liga,
        });
      }
    }
  }

  return NextResponse.json({ resultados: todos, total: todos.length });
}

// Matching helper — lo puede usar el cliente para cruzar por nombre como fallback
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
    const localMatch  = rl === nl || rl.includes(nl) || nl.includes(rl);
    const visitaMatch = rv === nv || rv.includes(nv) || nv.includes(rv);
    if (localMatch && visitaMatch) return r;
  }
  return null;
}
