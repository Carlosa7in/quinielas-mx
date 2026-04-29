import { NextRequest, NextResponse } from "next/server";

// Mapeo slug de liga → URL ESPN
const LIGA_ESPN: Record<string, { url: string; nombre: string }> = {
  "Liga MX":          { url: "mex.1",          nombre: "Liga MX" },
  "Champions League": { url: "uefa.champions",  nombre: "Champions League" },
  "Premier League":   { url: "eng.1",           nombre: "Premier League" },
  "La Liga":          { url: "esp.1",           nombre: "La Liga" },
};

// Normalizar nombres ESPN → nombres de nuestro sistema
const NOMBRE_MAP: Record<string, string> = {
  // Premier League
  "West Ham United":          "West Ham",
  "Brighton & Hove Albion":   "Brighton",
  "Newcastle United":         "Newcastle",
  "Wolverhampton Wanderers":  "Wolverhampton",
  "Nottingham Forest":        "Nottingham Forest",
  "Leicester City":           "Leicester City",
  "Ipswich Town":             "Ipswich Town",
  "Leeds United":             "Leeds United",
  // Champions
  "Paris Saint-Germain":      "PSG",
  "Bayern Munich":            "Bayern Munich",
  "Atletico Madrid":          "Atlético Madrid",
  "Atletico de Madrid":       "Atlético Madrid",
  "Borussia Dortmund":        "Borussia Dortmund",
  "Bayer Leverkusen":         "Bayer Leverkusen",
  "Club Brugge KV":           "Club Brugge",
  "Sporting Clube de Portugal": "Sporting CP",
  // Liga MX
  "Chivas":                   "Guadalajara",
  "Tigres":                   "Tigres UANL",
  "Pumas":                    "Pumas UNAM",
  "FC Juárez":                "FC Juárez",
  "Mazatlán FC":              "Mazatlán",
  "San Luis":                 "Atlético San Luis",
  "Atlético San Luis":        "Atlético San Luis",
};

function normalizarNombre(nombre: string): string {
  return NOMBRE_MAP[nombre] ?? nombre;
}

// Formatear fecha UTC → datetime-local (YYYY-MM-DDTHH:MM) en hora de México (UTC-6)
function toLocalMX(isoDate: string): string {
  const d = new Date(isoDate);
  // UTC-6
  const offset = -6 * 60;
  const local = new Date(d.getTime() + offset * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const liga = searchParams.get("liga") ?? "Liga MX";
  const desde = searchParams.get("desde"); // YYYYMMDD
  const hasta = searchParams.get("hasta"); // YYYYMMDD

  const config = LIGA_ESPN[liga];
  if (!config) {
    return NextResponse.json({ error: "Liga no válida" }, { status: 400 });
  }

  // Rango de fechas: por defecto hoy + 10 días
  const hoy = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const fechaDesde = desde ?? formatDate(hoy);
  const masdiez = new Date(hoy); masdiez.setDate(hoy.getDate() + 10);
  const fechaHasta = hasta ?? formatDate(masdiez);

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${config.url}/scoreboard?dates=${fechaDesde}-${fechaHasta}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();

    const events: Record<string, unknown>[] = data?.events ?? [];

    const partidos = events
      .filter((e) => {
        const comp = (e.competitions as Record<string, unknown>[])?.[0];
        const status = (comp?.status as Record<string, unknown>)?.type as Record<string, unknown>;
        // Solo partidos programados (no jugados aún)
        return status?.state === "pre" || status?.completed === false;
      })
      .map((e) => {
        const comp = (e.competitions as Record<string, unknown>[])[0];
        const competitors = comp.competitors as Record<string, unknown>[];
        const home = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
        const away = competitors.find((c) => c.homeAway === "away") ?? competitors[1];
        const homeTeam = home.team as Record<string, unknown>;
        const awayTeam = away.team as Record<string, unknown>;

        return {
          equipoLocal:  normalizarNombre(homeTeam.displayName as string),
          equipoVisita: normalizarNombre(awayTeam.displayName as string),
          fechaHora:    toLocalMX(e.date as string),
          liga,
        };
      });

    // Detectar nombre de la jornada desde ESPN
    const primeraTemporada = (events[0] as Record<string, unknown>)?.season as Record<string, unknown>;
    const nombreJornada = primeraTemporada?.slug
      ? String(primeraTemporada.slug)
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : null;

    return NextResponse.json({
      partidos,
      total: partidos.length,
      liga,
      nombreSugerido: nombreJornada,
      rango: `${fechaDesde} → ${fechaHasta}`,
    });
  } catch (err) {
    console.error("[ESPN-PARTIDOS]", err);
    return NextResponse.json({ error: "Error al conectar con ESPN" }, { status: 500 });
  }
}
