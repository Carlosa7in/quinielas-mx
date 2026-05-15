import { NextRequest, NextResponse } from "next/server";

const LIGAS: Record<string, { url: string; nombre: string; zonas: { limite: number; label: string; color: string }[] }> = {
  mx: {
    url: "https://site.api.espn.com/apis/v2/sports/soccer/mex.1/standings",
    nombre: "Liga MX",
    zonas: [
      { limite: 8,  label: "Liguilla",  color: "green" },
      { limite: 18, label: "Eliminado", color: "gray"  },
    ],
  },
  champions: {
    url: "https://site.api.espn.com/apis/v2/sports/soccer/uefa.champions/standings",
    nombre: "Champions League",
    zonas: [
      { limite: 8,  label: "Octavos directos", color: "green"  },
      { limite: 24, label: "Playoff",           color: "yellow" },
      { limite: 36, label: "Eliminado",         color: "gray"   },
    ],
  },
  premier: {
    url: "https://site.api.espn.com/apis/v2/sports/soccer/eng.1/standings",
    nombre: "Premier League",
    zonas: [
      { limite: 4,  label: "Champions League",   color: "green"  },
      { limite: 6,  label: "Europa / Conference", color: "yellow" },
      { limite: 17, label: "Permanencia",         color: "white"  },
      { limite: 20, label: "Descenso",            color: "gray"   },
    ],
  },
  laliga: {
    url: "https://site.api.espn.com/apis/v2/sports/soccer/esp.1/standings",
    nombre: "La Liga",
    zonas: [
      { limite: 4,  label: "Champions League",   color: "green"  },
      { limite: 6,  label: "Europa / Conference", color: "yellow" },
      { limite: 17, label: "Permanencia",         color: "white"  },
      { limite: 20, label: "Descenso",            color: "gray"   },
    ],
  },
  ligue1: {
    url: "https://site.api.espn.com/apis/v2/sports/soccer/fra.1/standings",
    nombre: "Ligue 1",
    zonas: [
      { limite: 3,  label: "Champions League",   color: "green"  },
      { limite: 5,  label: "Europa / Conference", color: "yellow" },
      { limite: 15, label: "Permanencia",         color: "white"  },
      { limite: 16, label: "Playoff",             color: "yellow" },
      { limite: 18, label: "Descenso",            color: "gray"   },
    ],
  },
  brasileirao: {
    url: "https://site.api.espn.com/apis/v2/sports/soccer/bra.1/standings",
    nombre: "Brasileirão",
    zonas: [
      { limite: 6,  label: "Libertadores",  color: "green"  },
      { limite: 8,  label: "Sudamericana",  color: "yellow" },
      { limite: 16, label: "Permanencia",   color: "white"  },
      { limite: 20, label: "Descenso",      color: "gray"   },
    ],
  },
  argentina: {
    url: "https://site.api.espn.com/apis/v2/sports/soccer/arg.1/standings",
    nombre: "Liga Argentina",
    zonas: [
      { limite: 4,  label: "Libertadores",  color: "green"  },
      { limite: 6,  label: "Sudamericana",  color: "yellow" },
      { limite: 24, label: "Permanencia",   color: "white"  },
      { limite: 28, label: "Descenso",      color: "gray"   },
    ],
  },
};

export async function GET(req: NextRequest) {
  const liga = req.nextUrl.searchParams.get("liga") ?? "mx";
  const config = LIGAS[liga];
  if (!config) return NextResponse.json({ error: "Liga no válida" }, { status: 400 });

  try {
    const res = await fetch(config.url, { next: { revalidate: 300 } });
    const data = await res.json();

    const entries: Record<string, unknown>[] =
      data?.children?.[0]?.standings?.entries ?? [];

    const tabla = entries.map((entry) => {
      const team = entry.team as Record<string, unknown>;
      const stats = entry.stats as { name: string; value: number }[];
      const s = (name: string) => stats.find((x) => x.name === name)?.value ?? 0;

      return {
        id: team.id as string,
        nombre: team.displayName as string,
        abrev: team.abbreviation as string,
        logo: (team.logos as { href: string }[])?.[0]?.href ?? "",
        pj: s("gamesPlayed"),
        g: s("wins"),
        e: s("ties"),
        p: s("losses"),
        gf: s("pointsFor"),
        gc: s("pointsAgainst"),
        dg: s("pointDifferential"),
        pts: s("points"),
      };
    });

    tabla.sort((a, b) =>
      b.pts !== a.pts ? b.pts - a.pts :
      b.dg  !== a.dg  ? b.dg - a.dg   :
      b.gf  - a.gf
    );

    return NextResponse.json({
      tabla,
      nombre: config.nombre,
      temporada: data?.children?.[0]?.name ?? config.nombre,
      zonas: config.zonas,
    });
  } catch (err) {
    console.error("[CLASIFICACION]", err);
    return NextResponse.json({ error: "No se pudo obtener la clasificación" }, { status: 500 });
  }
}
