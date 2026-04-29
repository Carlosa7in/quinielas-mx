import { NextResponse } from "next/server";

const ESPN_URL = "https://site.api.espn.com/apis/v2/sports/soccer/mex.1/standings";

export async function GET() {
  try {
    const res = await fetch(ESPN_URL, { next: { revalidate: 300 } }); // cache 5 min
    const data = await res.json();

    const entries: Record<string, string | number>[] =
      data?.children?.[0]?.standings?.entries ?? [];

    const tabla = entries.map((entry: Record<string, unknown>) => {
      const team = entry.team as Record<string, unknown>;
      const stats = entry.stats as { name: string; value: number; displayValue: string }[];
      const s = (name: string) => stats.find((x) => x.name === name)?.value ?? 0;

      return {
        id: team.id as string,
        nombre: team.displayName as string,
        abrev: team.abbreviation as string,
        logo: (team.logos as { href: string }[])?.[0]?.href ?? "",
        pos: s("rank"),
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

    // Ordenar por puntos desc, luego DG, luego GF
    tabla.sort((a, b) =>
      b.pts !== a.pts ? (b.pts as number) - (a.pts as number) :
      b.dg !== a.dg ? (b.dg as number) - (a.dg as number) :
      (b.gf as number) - (a.gf as number)
    );

    return NextResponse.json({ tabla, temporada: data?.children?.[0]?.name ?? "Liga MX" });
  } catch (err) {
    console.error("[CLASIFICACION]", err);
    return NextResponse.json({ error: "No se pudo obtener la clasificación" }, { status: 500 });
  }
}
