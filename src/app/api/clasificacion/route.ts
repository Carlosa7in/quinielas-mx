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
