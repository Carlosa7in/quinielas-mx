import { NextResponse } from "next/server";
import { sql } from "@/lib/prisma";

// Siempre dinamico - nunca cachear en build time
export const dynamic = "force-dynamic";

// Mapeo liga DB -> slug ESPN
const LIGA_ESPN: Record<string, string> = {
  "Liga MX":                  "mex.1",
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
  "Mundial":                  "fifa.world",
  "FIFA World Cup":           "fifa.world",
  "World Cup 2026":           "fifa.world",
  "Brasileirao":              "bra.1",
  "Brasileirao Serie A":      "bra.1",
  "Serie A Brasil":           "bra.1",
  "Liga Portuguesa":          "por.1",
  "Eredivisie":               "ned.1",
  "Liga Argentina":           "arg.1",
  "Apertura":                 "mex.1",
  "Clausura":                 "mex.1",
  "Mixta":                    "mex.1",
};

type EspnCompetitor = {
  homeAway: string;
  score?: string;
  team?: { id?: string; name?: string; abbreviation?: string; logo?: string };
};

type EspnEvent = {
  id: string;
  name?: string;
  date?: string;
  status?: {
    type?: { state?: string; completed?: boolean; detail?: string; shortDetail?: string };
    displayClock?: string;
    period?: number;
  };
  competitions?: { competitors?: EspnCompetitor[] }[];
};

type EspnKeyMoment = {
  id?: string;
  type?: { id?: string; text?: string };
  text?: string;
  clock?: { displayValue?: string };
  athletesInvolved?: { displayName?: string }[];
  team?: { id?: string };
};

// Goles ya notificados (best-effort, se resetea entre instancias serverless)
const notifiedGoals = new Set<string>();

// Normaliza nombre de equipo para comparar entre DB y ESPN
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|cf|cd|sd|rc|sc|ac|as|atletico|athletic|deportivo|club|real|sporting|ciudad|city)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Cache de logos por liga (dura toda la instancia serverless)
const logoCache: Record<string, Map<string, string>> = {};

async function getLogoMap(ligaSlug: string): Promise<Map<string, string>> {
  if (logoCache[ligaSlug]) return logoCache[ligaSlug];
  const map = new Map<string, string>();
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${ligaSlug}/teams?limit=100`,
    );
    if (!res.ok) return map;
    // ESPN puede devolver la lista en varias estructuras
    const data = await res.json() as Record<string, unknown>;

    type RawTeam = {
      name?: string; displayName?: string; shortDisplayName?: string;
      abbreviation?: string; location?: string;
      logo?: string; logos?: { href?: string; url?: string }[];
    };

    // Estructura 1: { sports: [{ leagues: [{ teams: [{ team: {...} }] }] }] }
    // Estructura 2: { teams: [{ team: {...} }] }
    // Estructura 3: { items: [{...}] }
    const rawTeams: RawTeam[] = [];
    const sports = (data.sports as { leagues?: { teams?: { team: RawTeam }[] }[] }[])?.[0];
    const leagueTeams = sports?.leagues?.[0]?.teams;
    if (leagueTeams) {
      for (const t of leagueTeams) rawTeams.push(t.team);
    } else {
      const direct = (data.teams as { team?: RawTeam }[]) ?? (data.items as RawTeam[]) ?? [];
      for (const t of direct) rawTeams.push((t as { team?: RawTeam }).team ?? (t as RawTeam));
    }

    for (const t of rawTeams) {
      // Logo: puede estar en logo (string) o logos[0].href / logos[0].url
      const logo =
        t.logo ??
        t.logos?.find(l => l.href)?.href ??
        t.logos?.find(l => l.url)?.url ??
        "";
      if (!logo) continue;
      for (const name of [t.displayName, t.name, t.shortDisplayName, t.abbreviation, t.location]) {
        if (name) map.set(norm(name), logo);
      }
    }
    logoCache[ligaSlug] = map;
  } catch { /* ignorar */ }
  return map;
}

function findLogo(logoMap: Map<string, string>, nombre: string): string {
  const n = norm(nombre);
  if (logoMap.has(n)) return logoMap.get(n)!;
  for (const [key, logo] of logoMap) {
    if (!key || !n) continue;
    if (key.includes(n) || n.includes(key)) return logo;
    const wa = n.split(" ").filter(w => w.length >= 4);
    const wb = key.split(" ").filter(w => w.length >= 4);
    if (wa.some(w => wb.includes(w))) return logo;
  }
  return "";
}

function teamsMatch(dbName: string, espnName: string): boolean {
  const a = norm(dbName);
  const b = norm(espnName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Comparar palabra por palabra (min 4 letras)
  const wordsA = a.split(" ").filter(w => w.length >= 4);
  const wordsB = b.split(" ").filter(w => w.length >= 4);
  return wordsA.some(w => wordsB.includes(w));
}

async function fetchKeyMoments(ligaSlug: string, eventId: string): Promise<EspnKeyMoment[]> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${ligaSlug}/summary?event=${eventId}`,
    );
    if (!res.ok) return [];
    const data = await res.json() as { keyMoments?: EspnKeyMoment[] };
    return data.keyMoments ?? [];
  } catch { return []; }
}

function tipoEvento(km: EspnKeyMoment): string {
  const id = (km.type?.id ?? "").toLowerCase();
  const txt = (km.text ?? "").toLowerCase();
  if (id.includes("goal") || id === "score" || txt.includes("goal") || txt.includes("gol")) return "gol";
  if (id.includes("yellow")) return "amarilla";
  if (id.includes("red")) return "roja";
  if (id.includes("substitut")) return "cambio";
  if (id.includes("half")) return "medio_tiempo";
  return id || "evento";
}

export async function GET() {
  try {
  // 1. Obtener jornadas activas con sus partidos usando SQL directo
  // (el adaptador NeonDB HTTP no convierte DateTime correctamente en el ORM)
  type RawRow = {
    jornada_id: string; jornada_numero: number; jornada_nombre: string | null;
    jornada_liga: string; jornada_estado: string;
    partido_id: string; equipo_local: string; equipo_visita: string;
    partido_liga: string;
    fecha_hora: string | null; fecha_epoch: string; resultado: string | null;
    goles_local: number | null; goles_visita: number | null; orden: number;
    logo_local: string | null; logo_visita: string | null;
  };

  const rows = (await sql`
    SELECT
      j.id              AS jornada_id,
      j.numero          AS jornada_numero,
      j.nombre          AS jornada_nombre,
      j.liga            AS jornada_liga,
      j.estado          AS jornada_estado,
      p.id              AS partido_id,
      p."equipoLocal"   AS equipo_local,
      p."equipoVisita"  AS equipo_visita,
      p.liga            AS partido_liga,
      to_char(p."fechaHora" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS fecha_hora,
      (EXTRACT(EPOCH FROM p."fechaHora") * 1000)::bigint AS fecha_epoch,
      p.resultado,
      p."golesLocal"    AS goles_local,
      p."golesVisita"   AS goles_visita,
      p.orden,
      el."logoUrl"      AS logo_local,
      ev."logoUrl"      AS logo_visita
    FROM "Jornada" j
    LEFT JOIN "Partido" p ON p."jornadaId" = j.id
    LEFT JOIN "Equipo" el ON el.nombre = p."equipoLocal"  AND el.liga = j.liga
    LEFT JOIN "Equipo" ev ON ev.nombre = p."equipoVisita" AND ev.liga = j.liga
    WHERE j.estado IN ('abierta', 'cerrada', 'en_curso')
    ORDER BY j."fechaInicio", p.orden
  `) as RawRow[];

  // Agrupar filas por jornada
  const jornadaMap = new Map<string, {
    id: string; numero: number; nombre: string | null; liga: string; estado: string;
    partidos: RawRow[];
  }>();
  for (const row of rows) {
    if (!jornadaMap.has(row.jornada_id)) {
      jornadaMap.set(row.jornada_id, {
        id: row.jornada_id, numero: row.jornada_numero,
        nombre: row.jornada_nombre, liga: row.jornada_liga,
        estado: row.jornada_estado, partidos: [],
      });
    }
    if (row.partido_id) jornadaMap.get(row.jornada_id)!.partidos.push(row);
  }
  const jornadas = [...jornadaMap.values()];

  if (jornadas.length === 0) {
    return NextResponse.json({ jornadas: [], hayEnVivo: false, actualizado: new Date().toISOString() });
  }

  // 2. Cargar scoreboard ESPN por liga unica
  // Incluir ligas de jornada + ligas individuales de cada partido (para jornadas Mixtas)
  const allRows = jornadas.flatMap(j => j.partidos);
  const ligasSlugs = [...new Set([
    ...jornadas.map(j => LIGA_ESPN[j.liga]),
    ...allRows.map(p => LIGA_ESPN[p.partido_liga]),
  ].filter(Boolean))] as string[];

  const espnEventosPorLiga: Record<string, EspnEvent[]> = {};
  await Promise.all(
    ligasSlugs.map(async (slug) => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`,
        );
        if (!res.ok) return;
        const data = await res.json() as { events?: EspnEvent[] };
        espnEventosPorLiga[slug] = data.events ?? [];
      } catch { /* ignorar si falla ESPN */ }
    }),
  );

  // Cargar mapas de logos en paralelo para cada liga
  const logoMapPorLiga: Record<string, Map<string, string>> = {};
  await Promise.all(
    ligasSlugs.map(async (slug) => {
      logoMapPorLiga[slug] = await getLogoMap(slug);
    }),
  );

  // 3. Para cada partido en DB, buscar su par en ESPN
  const nuevosGoles: { partido: string; jugador?: string; minuto?: string }[] = [];

  const jornadasResult = await Promise.all(
    jornadas.map(async (j) => {
      const slug = LIGA_ESPN[j.liga];
      const espnEvents = slug ? (espnEventosPorLiga[slug] ?? []) : [];
      const logoMap = slug ? (logoMapPorLiga[slug] ?? new Map()) : new Map();

      const partidos = await Promise.all(
        j.partidos.map(async (p) => {
          // Liga del partido (puede diferir de la jornada en jornadas Mixtas)
          const slugPartido = LIGA_ESPN[p.partido_liga] ?? slug;
          const espnEventsPartido = slugPartido
            ? [...(espnEventosPorLiga[slugPartido] ?? []), ...(slug ? espnEventosPorLiga[slug] ?? [] : [])]
            : espnEvents;
          const logoMapPartido = slugPartido
            ? new Map([...(logoMapPorLiga[slugPartido] ?? new Map()), ...logoMap])
            : logoMap;

          // Buscar evento ESPN que coincida con los equipos
          const espnEv = espnEventsPartido.find(ev => {
            const comps = ev.competitions?.[0]?.competitors ?? [];
            const home = comps.find(c => c.homeAway === "home");
            const away = comps.find(c => c.homeAway === "away");
            return (
              teamsMatch(p.equipo_local, home?.team?.name ?? "") &&
              teamsMatch(p.equipo_visita, away?.team?.name ?? "")
            ) || (
              teamsMatch(p.equipo_local, away?.team?.name ?? "") &&
              teamsMatch(p.equipo_visita, home?.team?.name ?? "")
            );
          });

          let estado = "pre";
          let detalle = "";
          let reloj = "";
          let periodo = 0;
          let golesLocal: string | null = p.goles_local !== null ? String(p.goles_local) : null;
          let golesVisita: string | null = p.goles_visita !== null ? String(p.goles_visita) : null;
          // Logos: BD > ESPN teams endpoint > vacío
          let logoLocal  = p.logo_local  ?? findLogo(logoMapPartido, p.equipo_local);
          let logoVisita = p.logo_visita ?? findLogo(logoMapPartido, p.equipo_visita);
          let eventos: unknown[] = [];

          if (espnEv) {
            const status = espnEv.status?.type;
            estado = status?.state ?? "pre";
            detalle = status?.detail ?? status?.shortDetail ?? "";
            reloj = espnEv.status?.displayClock ?? "";
            periodo = espnEv.status?.period ?? 0;

            const comps = espnEv.competitions?.[0]?.competitors ?? [];
            const home = comps.find(c => c.homeAway === "home");
            const away = comps.find(c => c.homeAway === "away");

            const ordenNormal = teamsMatch(p.equipo_local, home?.team?.name ?? "");
            const localEspn = ordenNormal ? home : away;
            const visitaEspn = ordenNormal ? away : home;

            if (localEspn?.score != null) golesLocal = localEspn.score;
            if (visitaEspn?.score != null) golesVisita = visitaEspn.score;
            if (localEspn?.team?.logo)  logoLocal  = localEspn.team.logo;
            if (visitaEspn?.team?.logo) logoVisita = visitaEspn.team.logo;

            if (estado === "in" && (slugPartido || slug)) {
              const kms = await fetchKeyMoments(slugPartido ?? slug ?? "", espnEv.id);
              eventos = kms.map(km => {
                const tipo = tipoEvento(km);
                const goalKey = `${espnEv.id}-${km.id ?? km.clock?.displayValue}`;
                if (tipo === "gol" && km.id && !notifiedGoals.has(goalKey)) {
                  notifiedGoals.add(goalKey);
                  nuevosGoles.push({
                    partido: `${p.equipo_local} vs ${p.equipo_visita}`,
                    jugador: km.athletesInvolved?.[0]?.displayName,
                    minuto: km.clock?.displayValue,
                  });
                }
                return {
                  id: km.id, tipo,
                  texto: km.text ?? km.type?.text ?? "",
                  minuto: km.clock?.displayValue,
                  jugador: km.athletesInvolved?.[0]?.displayName,
                  equipoId: km.team?.id,
                };
              });
            }

            if (estado === "post" && p.resultado) detalle = p.resultado;
          } else {
            // Sin ESPN: estado por fecha
            const ahora = Date.now();
            const fechaMs = Number(p.fecha_epoch);
            if (p.resultado) {
              estado = "post";
              detalle = p.resultado;
            } else if (fechaMs <= ahora && ahora - fechaMs < 2 * 60 * 60 * 1000) {
              estado = "in";
            } else if (fechaMs > ahora) {
              estado = "pre";
            } else {
              estado = "post";
            }
          }

          return {
            id: p.partido_id,
            orden: p.orden,
            fechaHora: new Date(Number(p.fecha_epoch)).toISOString(),
            estado, detalle, reloj, periodo,
            local:  { nombre: p.equipo_local,  logo: logoLocal,  goles: golesLocal  },
            visita: { nombre: p.equipo_visita, logo: logoVisita, goles: golesVisita },
            resultadoDB: p.resultado ?? null,
            eventos,
            tieneEspn: !!espnEv,
          };
        }),
      );

      // Ordenar: en vivo > pre (por fecha) > post
      const orden: Record<string, number> = { in: 0, pre: 1, post: 2 };
      partidos.sort((a, b) => {
        const d = (orden[a.estado] ?? 3) - (orden[b.estado] ?? 3);
        if (d !== 0) return d;
        return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
      });

      return {
        id: j.id,
        nombre: j.nombre ?? `Jornada ${j.numero}`,
        numero: j.numero,
        liga: j.liga,
        partidos,
      };
    }),
  );

  // Enviar push por goles nuevos (import dinamico para aislar errores de web-push)
  if (nuevosGoles.length > 0) {
    import("@/lib/push").then(({ sendPushToAll }) => {
      for (const g of nuevosGoles) {
        const titulo = g.jugador
          ? `Gol de ${g.jugador}${g.minuto ? ` (${g.minuto})` : ""}`
          : `Gol!${g.minuto ? ` ${g.minuto}` : ""}`;
        sendPushToAll({ title: titulo, body: g.partido, icon: "/logo-tablitas.png", url: "/en-vivo", tag: `gol-${g.partido}-${g.minuto}` }).catch(() => {});
      }
    }).catch(() => {});
  }

  const hayEnVivo = jornadasResult.some(j => j.partidos.some(p => p.estado === "in"));
  return NextResponse.json({ jornadas: jornadasResult, hayEnVivo, actualizado: new Date().toISOString() });

  } catch (err) {
    console.error("[/api/live] error:", err);
    return NextResponse.json(
      { jornadas: [], hayEnVivo: false, actualizado: new Date().toISOString(), error: String(err) },
      { status: 200 }, // 200 para que el cliente no muestre "Error al cargar"
    );
  }
}
