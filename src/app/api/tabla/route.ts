import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible)",
  "Accept": "application/json",
};

// Liga MX Clausura = 11620, Apertura = 11621
const LIGAS_MX = [
  { id: 11620, nombre: "Liga MX – Clausura" },
  { id: 11621, nombre: "Liga MX – Apertura" },
];

type SofaRow = {
  position: number;
  team: { id: number; name: string; shortName?: string };
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  scoresFor: number;
  scoresAgainst: number;
  idiff: number;
  points: number;
};

type SofaDescription = {
  from: number;
  to: number;
  description: string;
  type: "positive" | "maybe" | "negative" | string;
};

async function fetchSeasonId(tournamentId: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/seasons`,
      { headers: HEADERS },
    );
    if (!res.ok) return null;
    const data = await res.json() as { seasons: { id: number; name: string }[] };
    return data.seasons?.[0]?.id ?? null;
  } catch { return null; }
}

async function fetchStandings(tournamentId: number, seasonId: number) {
  const res = await fetch(
    `https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/standings/total`,
    { headers: HEADERS },
  );
  if (!res.ok) return null;
  return await res.json() as {
    standings: {
      type: string;
      rows: SofaRow[];
      descriptions: SofaDescription[];
    }[];
  };
}

export async function GET() {
  try {
    // Intentar Clausura primero, luego Apertura (la que tenga temporada activa)
    for (const liga of LIGAS_MX) {
      const seasonId = await fetchSeasonId(liga.id);
      if (!seasonId) continue;

      const data = await fetchStandings(liga.id, seasonId);
      if (!data?.standings?.[0]) continue;

      const standing = data.standings[0];
      const descriptions: SofaDescription[] = standing.descriptions ?? [];

      const rows = standing.rows.map(row => {
        // Determinar zona: positive / maybe / negative
        const zona = descriptions.find(
          d => row.position >= d.from && row.position <= d.to,
        );

        return {
          posicion: row.position,
          equipo: {
            id: row.team.id,
            nombre: row.team.name,
            nombreCorto: row.team.shortName ?? row.team.name,
            logo: `https://api.sofascore.com/api/v1/team/${row.team.id}/image`,
          },
          pj:  row.matches,
          g:   row.wins,
          e:   row.draws,
          p:   row.losses,
          gf:  row.scoresFor,
          gc:  row.scoresAgainst,
          dg:  row.idiff,
          pts: row.points,
          zona: zona?.type ?? null,       // "positive" | "maybe" | "negative"
          zonaLabel: zona?.description ?? null,
        };
      });

      return NextResponse.json({
        liga: liga.nombre,
        tournamentId: liga.id,
        seasonId,
        zonas: descriptions,
        rows,
        actualizado: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "No se pudo obtener la tabla" }, { status: 503 });
  } catch (err) {
    console.error("[/api/tabla]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
