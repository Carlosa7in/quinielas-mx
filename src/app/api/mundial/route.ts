import { NextResponse } from "next/server";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const ESPN_V2   = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world";

// Cache simple en memoria (1 hora)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

type EspnTeamEntry = {
  team: { id: string; name: string; abbreviation: string; logo: string; flag?: string; logos?: { href: string }[] };
  stats?: { name: string; value: number }[];
};

type EspnGroup = {
  name?: string;
  shortName?: string;
  header?: string;
  standings?: { entries?: EspnTeamEntry[] };
  entries?: EspnTeamEntry[];
};

function parseGrupos(data: unknown): GrupoInfo[] {
  try {
    const d = data as Record<string, unknown>;
    // Estructura v2 standings
    const children = (d?.standings as Record<string, unknown>)?.groups as EspnGroup[]
      ?? (d?.children as EspnGroup[])
      ?? [];
    return children.map((g) => {
      const nombre = g.name ?? g.shortName ?? g.header ?? "Grupo";
      const entries: EspnTeamEntry[] = g.standings?.entries ?? g.entries ?? [];
      const equipos = entries.map((e) => {
        const logoUrl = e.team.logo ?? e.team.logos?.[0]?.href ?? "";
        const stats = e.stats ?? [];
        const getStat = (n: string) => stats.find((s) => s.name === n)?.value ?? 0;
        return {
          id: e.team.id,
          nombre: e.team.name,
          abrev: e.team.abbreviation,
          logo: logoUrl,
          pts: getStat("points"),
          pj: getStat("gamesPlayed"),
          pg: getStat("wins"),
          pe: getStat("ties"),
          pp: getStat("losses"),
          gf: getStat("pointsFor"),
          gc: getStat("pointsAgainst"),
          dif: getStat("pointDifferential"),
        };
      });
      return { nombre, equipos };
    });
  } catch {
    return [];
  }
}

type GrupoInfo = {
  nombre: string;
  equipos: {
    id: string; nombre: string; abrev: string; logo: string;
    pts: number; pj: number; pg: number; pe: number; pp: number;
    gf: number; gc: number; dif: number;
  }[];
};

async function fetchProximosPartidos() {
  try {
    const r = await fetch(`${ESPN_BASE}/scoreboard`, { next: { revalidate: 300 } });
    if (!r.ok) return [];
    const data = await r.json() as Record<string, unknown>;
    const events = (data.events as Record<string, unknown>[]) ?? [];
    return events.slice(0, 16).map((ev) => {
      const comps = (ev.competitions as Record<string, unknown>[])?.[0];
      const competitors = (comps?.competitors as Record<string, unknown>[]) ?? [];
      const home = competitors.find((c) => (c as Record<string, string>).homeAway === "home");
      const away = competitors.find((c) => (c as Record<string, string>).homeAway === "away");
      const status = (ev.status as Record<string, unknown>)?.type as Record<string, unknown>;
      return {
        id: ev.id,
        fecha: ev.date,
        estado: status?.shortDetail ?? status?.description ?? "",
        completado: status?.completed ?? false,
        local: {
          nombre: (home?.team as Record<string, string>)?.name ?? "",
          abrev: (home?.team as Record<string, string>)?.abbreviation ?? "",
          logo: ((home?.team as Record<string, unknown>)?.logo as string) ?? "",
          goles: (home as Record<string, unknown>)?.score ?? null,
        },
        visita: {
          nombre: (away?.team as Record<string, string>)?.name ?? "",
          abrev: (away?.team as Record<string, string>)?.abbreviation ?? "",
          logo: ((away?.team as Record<string, unknown>)?.logo as string) ?? "",
          goles: (away as Record<string, unknown>)?.score ?? null,
        },
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  // Serve cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch standings (grupos) and scoreboard in parallel
    const [standRes, partRes] = await Promise.allSettled([
      fetch(`${ESPN_V2}/standings`, { next: { revalidate: 3600 } }),
      fetchProximosPartidos(),
    ]);

    let grupos: GrupoInfo[] = [];
    if (standRes.status === "fulfilled" && standRes.value.ok) {
      const raw = await standRes.value.json();
      grupos = parseGrupos(raw);
    }

    const partidos = partRes.status === "fulfilled" ? partRes.value : [];

    const resultado = {
      grupos,
      partidos,
      fuente: "ESPN",
      actualizado: new Date().toISOString(),
    };

    cache = { data: resultado, ts: Date.now() };
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json({ error: String(err), grupos: [], partidos: [] }, { status: 500 });
  }
}
