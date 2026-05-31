import { NextResponse } from "next/server";
import { sql } from "@/lib/prisma";
import { getLogoUrl } from "@/lib/equipos";

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
  "Brasileirão":              "bra.1",
  "Brasileirao Serie A":      "bra.1",
  "Brasileirão Serie A":      "bra.1",
  "Serie A Brasil":           "bra.1",
  "Copa Libertadores":        "conmebol.libertadores",
  "CONMEBOL Libertadores":    "conmebol.libertadores",
  "Libertadores":             "conmebol.libertadores",
  "Copa Sudamericana":        "conmebol.sudamericana",
  "CONMEBOL Sudamericana":    "conmebol.sudamericana",
  "Sudamericana":             "conmebol.sudamericana",
  "Liga Portuguesa":          "por.1",
  "Eredivisie":               "ned.1",
  "Liga Argentina":           "arg.1",
  "Apertura":                 "mex.1",
  "Clausura":                 "mex.1",
  "Mixta":                    "mex.1",
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

type EspnCompetitor = {
  homeAway: string;
  score?: string;
  team?: { id?: string; name?: string; abbreviation?: string; logo?: string };
};

type EspnDetail = {
  id?: string;
  type?: { id?: string; text?: string };
  text?: string;
  clock?: { value?: number; displayValue?: string };
  team?: { id?: string; displayName?: string; location?: string; name?: string };
  scoringPlay?: boolean;
  redCard?: boolean;
  yellowCard?: boolean;
  penaltyKick?: boolean;
  ownGoal?: boolean;
  shootout?: boolean;
  athletesInvolved?: { id?: string; displayName?: string }[];
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
  competitions?: { competitors?: EspnCompetitor[]; details?: EspnDetail[] }[];
};

type EspnKeyMoment = {
  id?: string;
  type?: { id?: string; text?: string };
  text?: string;
  clock?: { displayValue?: string };
  athletesInvolved?: { displayName?: string }[];
  team?: { id?: string };
};

// ── ESPN Lineups ──────────────────────────────────────────────────────────────
type EspnRosterPlayer = {
  starter?: boolean;
  jersey?: string;
  formationPlace?: number;
  athlete?: {
    displayName?: string;
    shortName?: string;
    position?: { abbreviation?: string };
  };
};
type EspnRosterTeam = {
  team?: { id?: string; displayName?: string };
  formation?: string;
  roster?: EspnRosterPlayer[];
};
export type LineupPlayer = { jersey: string; nombre: string; posicion: string; formationPlace?: number };
export type Alineacion   = {
  local: LineupPlayer[];
  visita: LineupPlayer[];
  formacionLocal?: string;
  formacionVisita?: string;
};

const POS_ORDER: Record<string, number> = {
  GK:0, G:0,
  CB:1, LB:1, RB:1, LWB:1, RWB:1, SW:1, D:1, DF:1,
  CDM:2, DM:2, CM:2, LM:2, RM:2, MF:2, M:2,
  CAM:3, AM:3,
  LW:4, RW:4, LF:4, RF:4,
  CF:5, ST:5, SS:5, F:5, FW:5,
};
const posOrd = (p: string) => POS_ORDER[p.toUpperCase()] ?? 9;

const lineupCache = new Map<string, { data: Alineacion | null; ts: number }>();
const LINEUP_TTL = 10 * 60_000; // 10 min

async function fetchEspnLineups(ligaSlug: string, eventId: string): Promise<Alineacion | null> {
  const key = `${ligaSlug}/${eventId}`;
  const cached = lineupCache.get(key);
  if (cached && Date.now() - cached.ts < LINEUP_TTL) return cached.data;

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${ligaSlug}/summary?event=${eventId}`,
    );
    if (!res.ok) { lineupCache.set(key, { data: null, ts: Date.now() }); return null; }
    const data = await res.json() as { rosters?: EspnRosterTeam[] };
    const rosters = data.rosters;
    if (!rosters || rosters.length < 2) { lineupCache.set(key, { data: null, ts: Date.now() }); return null; }

    const mapPlayers = (team: EspnRosterTeam): LineupPlayer[] =>
      (team.roster ?? [])
        .filter(p => p.starter)
        .map(p => ({
          jersey:        p.jersey ?? "",
          nombre:        p.athlete?.shortName ?? p.athlete?.displayName ?? "",
          posicion:      p.athlete?.position?.abbreviation ?? "",
          formationPlace: p.formationPlace,
        }))
        .sort((a, b) => posOrd(a.posicion) - posOrd(b.posicion));

    const local  = mapPlayers(rosters[0]);
    const visita = mapPlayers(rosters[1]);

    // Solo guardar si hay al menos un jugador titular
    if (local.length === 0 && visita.length === 0) {
      lineupCache.set(key, { data: null, ts: Date.now() });
      return null;
    }
    const result: Alineacion = {
      local,
      visita,
      formacionLocal:  rosters[0]?.formation,
      formacionVisita: rosters[1]?.formation,
    };
    lineupCache.set(key, { data: result, ts: Date.now() });
    return result;
  } catch {
    lineupCache.set(key, { data: null, ts: Date.now() });
    return null;
  }
}

// ── Notificaciones persistidas en DB ──────────────────────────────────────────
type CandidatoNotif = {
  clave: string;   // PK única en DB
  titulo: string;
  cuerpo: string;
  tag: string;
};

async function ensureNotifTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS "EventoNotificado" (
      "clave"    TEXT        NOT NULL,
      "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EventoNotificado_pkey" PRIMARY KEY ("clave")
    )
  `;
}

// Inserta las claves nuevas (ON CONFLICT DO NOTHING) y devuelve solo las que
// se insertaron ahora (= nunca notificadas antes).
async function filtrarYMarcarNuevos(claves: string[]): Promise<Set<string>> {
  if (claves.length === 0) return new Set();
  try {
    await ensureNotifTable();
    const rows = (await sql`
      INSERT INTO "EventoNotificado" ("clave")
      SELECT unnest(${claves}::text[])
      ON CONFLICT ("clave") DO NOTHING
      RETURNING "clave"
    `) as { clave: string }[];
    return new Set(rows.map(r => r.clave));
  } catch {
    // Si falla la DB preferimos mandar duplicados antes que silencio
    return new Set(claves);
  }
}

// Normaliza nombre de equipo para comparar entre DB y ESPN
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    // Solo remover abreviaturas genéricas (2-3 letras), NO palabras que son parte del nombre
    // "athletic" y "atletico" se conservan — "Athletic Club" sin "athletic" queda "" → no matchea
    .replace(/\b(fc|cf|cd|sd|rc|sc|ac|as|afc|sfc|deportivo|club|real|sporting|ciudad|city)\b/g, "")
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

type EspnScoringPlay = {
  id?: string;
  type?: { id?: string; text?: string };
  text?: string;
  clock?: { displayValue?: string };
  athletesInvolved?: { displayName?: string }[];
  team?: { id?: string };
  scoringPlay?: boolean;
};

async function fetchKeyMoments(ligaSlug: string, eventId: string): Promise<EspnKeyMoment[]> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${ligaSlug}/summary?event=${eventId}`,
    );
    if (!res.ok) return [];
    const data = await res.json() as {
      keyMoments?: EspnKeyMoment[];
      scoringPlays?: EspnScoringPlay[];
      plays?: { items?: EspnScoringPlay[] };
      header?: unknown;
    };
    // Log para debug (quitar después)
    console.log(`[fetchKeyMoments] ${ligaSlug}/${eventId} keys:`, Object.keys(data),
      "km:", data.keyMoments?.length ?? 0,
      "sp:", data.scoringPlays?.length ?? 0,
      "plays:", data.plays?.items?.length ?? 0);

    // keyMoments es el campo principal; si está vacío, intentar scoringPlays
    if (data.keyMoments && data.keyMoments.length > 0) return data.keyMoments;

    // Algunos endpoints de ESPN brasileño/CONMEBOL usan scoringPlays
    if (data.scoringPlays && data.scoringPlays.length > 0) {
      return data.scoringPlays as EspnKeyMoment[];
    }

    // Fallback: plays con scoringPlay=true (goles únicamente)
    const items = data.plays?.items ?? [];
    const goals = items.filter(p => p.scoringPlay);
    if (goals.length > 0) return goals as EspnKeyMoment[];

    return [];
  } catch { return []; }
}

// Genera el título de push según el tipo de evento
function tituloNotif(tipo: string, jugador: string | undefined, min: string | undefined): string {
  const m = min ? ` (${min})` : "";
  const j = jugador ? ` ${jugador}` : "";
  switch (tipo) {
    case "gol":      return `⚽ ¡Gooool!${j}${m}`;
    case "roja":     return `🟥 Expulsión${j ? ` –${j}` : ""}${m}`;
    case "amarilla": return `🟨 Amarilla${j ? ` –${j}` : ""}${m}`;
    case "cambio":   return `🔄 Cambio${m}`;
    case "var":      return `📺 VAR${m}`;
    default:         return `🔔 Evento${m}`;
  }
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
    espn_id: string | null;
    sofa_id: string | null;
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
      p."espnId"        AS espn_id,
      p."sofaId"        AS sofa_id,
      el."logoUrl"      AS logo_local,
      ev."logoUrl"      AS logo_visita
    FROM "Jornada" j
    LEFT JOIN "Partido" p ON p."jornadaId" = j.id
    LEFT JOIN "Equipo" el ON el.nombre = p."equipoLocal"  AND el.liga = p.liga
    LEFT JOIN "Equipo" ev ON ev.nombre = p."equipoVisita" AND ev.liga = p.liga
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
  const candidatos: CandidatoNotif[] = [];

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

          // Buscar evento ESPN: primero por espnId guardado (más fiable), luego por nombre
          const espnEv = espnEventsPartido.find(ev => {
            // Match directo por ID — funciona aunque el nombre esté abreviado (PSG, UNAM, etc.)
            if (p.espn_id && ev.id === p.espn_id) return true;
            // Fallback: comparar nombres de equipos
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
          // Solo notificar eventos de partidos que empezaron hace menos de 3h
          const fechaMs = Number(p.fecha_epoch);
          const ahora = Date.now();
          const minutosDesdeInicio = (ahora - fechaMs) / 60_000;
          const esReciente = minutosDesdeInicio < 180; // últimas 3 horas
          // Para "partido terminado": solo notificar si el partido terminó hace menos de 30min
          // (evita notificaciones al abrir en-vivo horas después de un partido)
          const esRecienTerminado = minutosDesdeInicio < 120 + 30; // ~30min después del 90'
          let golesLocal: string | null = p.goles_local !== null ? String(p.goles_local) : null;
          let golesVisita: string | null = p.goles_visita !== null ? String(p.goles_visita) : null;
          // Logos: BD > ESPN teams endpoint > estático equipos.ts > vacío
          // Usar || en lugar de ?? para que string vacío también haga fallback
          let logoLocal  = p.logo_local  || findLogo(logoMapPartido, p.equipo_local)  || getLogoUrl(p.equipo_local);
          let logoVisita = p.logo_visita || findLogo(logoMapPartido, p.equipo_visita) || getLogoUrl(p.equipo_visita);
          let eventos: unknown[] = [];
          let alineacion: Alineacion | null = null;

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

            if (estado === "post" && p.resultado) detalle = p.resultado;

            // Guardar espnId en BD si aún no lo tiene (para poder usarlo cuando caiga del scoreboard)
            if (!p.espn_id) {
              sql`UPDATE "Partido" SET "espnId" = ${espnEv.id} WHERE id = ${p.partido_id}`.catch(() => {});
            }
          } else {
            // Sin ESPN: estado por fecha/DB
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

          // ── Para partidos pre: buscar alineaciones vía ESPN summary ──────────
          if (estado === "pre") {
            const espnIdPre = p.espn_id ?? espnEv?.id;
            const slugPre   = slugPartido ?? slug;
            if (espnIdPre && slugPre) {
              alineacion = await fetchEspnLineups(slugPre, espnIdPre);
              // Push si se confirman alineaciones por primera vez
              if (alineacion && alineacion.local.length > 0) {
                candidatos.push({
                  clave: `lineups-espn-${espnIdPre}`,
                  titulo: `📋 Alineaciones confirmadas`,
                  cuerpo: `${p.equipo_local} vs ${p.equipo_visita} — Ya están los onces`,
                  tag: `lineups-espn-${espnIdPre}`,
                });
              }
            }
          }

          // ── Eventos: ESPN (details → keyMoments) ─────────────────────────────
          if (estado === "in" || estado === "post") {

              // Para post sin espnEv: intentar con espnId guardado en BD via summary
              const savedEspnId = p.espn_id;
              if (!espnEv && savedEspnId && (slugPartido || slug) && estado === "post") {
                const kms = await fetchKeyMoments(slugPartido ?? slug ?? "", savedEspnId);
                if (kms.length > 0) {
                  eventos = kms.map(km => ({
                    id: km.id, tipo: tipoEvento(km),
                    texto: km.text ?? km.type?.text ?? "",
                    minuto: km.clock?.displayValue,
                    jugador: km.athletesInvolved?.[0]?.displayName,
                  }));
                }
              }

              if (espnEv) {
                // ── ESPN details del scoreboard ──────────────────────────────────────
                const details = espnEv.competitions?.[0]?.details ?? [];

                if (details.length > 0) {
                  eventos = details
                    .filter(d => d.scoringPlay || d.yellowCard || d.redCard || d.type?.text)
                    .map(d => {
                      let tipo: string;
                      if (d.redCard)          tipo = "roja";
                      else if (d.yellowCard)  tipo = "amarilla";
                      else if (d.scoringPlay) tipo = "gol";
                      else {
                        const t = (d.type?.text ?? "").toLowerCase();
                        if (t.includes("substitut") || t.includes("cambio")) tipo = "cambio";
                        else if (t.includes("var"))                           tipo = "var";
                        else tipo = t || "evento";
                      }

                      // Clave estable: usa d.id si existe, si no construye una desde tiempo+jugador
                      const detailKey = d.id
                        ?? [
                          d.clock?.value ?? d.clock?.displayValue ?? "t",
                          d.athletesInvolved?.[0]?.id ?? d.athletesInvolved?.[0]?.displayName ?? "p",
                        ].join("-");

                      if (estado === "in" && esReciente) {
                        const jugador = d.athletesInvolved?.[0]?.displayName;
                        const min = d.clock?.displayValue;
                        const clave = `${tipo}-${espnEv.id}-${detailKey}`;
                        candidatos.push({
                          clave,
                          titulo: tituloNotif(tipo, jugador, min),
                          cuerpo: `${p.equipo_local} vs ${p.equipo_visita}`,
                          tag: clave,
                        });
                      }
                      return {
                        id: d.id, tipo,
                        texto: d.text ?? d.type?.text ?? "",
                        minuto: d.clock?.displayValue,
                        jugador: d.athletesInvolved?.[0]?.displayName,
                        equipo: d.team?.displayName ?? d.team?.location ?? d.team?.name,
                        esPenal: d.penaltyKick ?? false,
                        esAutogol: d.ownGoal ?? false,
                      };
                    });
                } else if (slugPartido || slug) {
                  // ── Estrategia 3: summary ESPN (UCL/CONMEBOL con keyMoments) ────────
                  const kms = await fetchKeyMoments(slugPartido ?? slug ?? "", espnEv.id);
                  eventos = kms.map(km => {
                    const tipo = tipoEvento(km);
                    const kmKey = km.id
                      ?? [
                        km.clock?.displayValue ?? "t",
                        km.athletesInvolved?.[0]?.displayName ?? "p",
                      ].join("-");
                    if (estado === "in" && esReciente) {
                      const jugador = km.athletesInvolved?.[0]?.displayName;
                      const min = km.clock?.displayValue;
                      const clave = `${tipo}-${espnEv.id}-${kmKey}`;
                      candidatos.push({
                        clave,
                        titulo: tituloNotif(tipo, jugador, min),
                        cuerpo: `${p.equipo_local} vs ${p.equipo_visita}`,
                        tag: clave,
                      });
                    }
                    return {
                      id: km.id, tipo,
                      texto: km.text ?? km.type?.text ?? "",
                      minuto: km.clock?.displayValue,
                      jugador: km.athletesInvolved?.[0]?.displayName,
                      equipo: (km as { team?: { displayName?: string } }).team?.displayName,
                    };
                  });
                }
              }

              // Notificación de partido terminado — solo si terminó hace menos de ~30min
              const matchKey = espnEv?.id ?? p.partido_id;
              if (estado === "post" && golesLocal !== null && golesVisita !== null && esRecienTerminado) {
                candidatos.push({
                  clave: `final-${matchKey}`,
                  titulo: "⏱️ Partido terminado",
                  cuerpo: `${p.equipo_local} ${golesLocal} – ${golesVisita} ${p.equipo_visita}`,
                  tag: `final-${matchKey}`,
                });
              }

              // ── Push notifications de período (solo al ocurrir, una vez) ──────
              if (estado === "in" && espnEv && esReciente) {
                const mins = reloj ? parseInt(reloj) : 99;
                if (periodo === 1 && mins <= 3)
                  candidatos.push({ clave: `kickoff-${espnEv.id}`, titulo: "🏁 ¡Arranca el partido!", cuerpo: `${p.equipo_local} vs ${p.equipo_visita}`, tag: `kickoff-${espnEv.id}` });
                if (periodo === 2 && mins <= 3)
                  candidatos.push({ clave: `secondhalf-${espnEv.id}`, titulo: "▶️ ¡Empieza el 2° tiempo!", cuerpo: `${p.equipo_local} ${golesLocal ?? 0} – ${golesVisita ?? 0} ${p.equipo_visita}`, tag: `secondhalf-${espnEv.id}` });
                if (detalle && /half.?time|HT\b/i.test(detalle))
                  candidatos.push({ clave: `halftime-${espnEv.id}`, titulo: "⏸️ Medio tiempo", cuerpo: `${p.equipo_local} ${golesLocal ?? 0} – ${golesVisita ?? 0} ${p.equipo_visita}`, tag: `halftime-${espnEv.id}` });
              }

              // ── Marcadores de período en el timeline (SIEMPRE, basado en estado) ─
              // El array eventos se construye en orden CRONOLÓGICO (más antiguo primero).
              // La UI hace [...eventos].reverse() para mostrar el más reciente arriba.
              if ((estado === "in" || estado === "post") && espnEv) {
                const evId  = espnEv.id;
                const score = `${golesLocal ?? 0}–${golesVisita ?? 0}`;
                type Ev = { id?: string; minuto?: string; tipo?: string; texto?: string };
                const realEvs = eventos as Ev[];
                const merged: Ev[] = [];

                // 🏁 Kickoff — siempre el PRIMERO (más antiguo → queda al fondo tras .reverse())
                merged.push({ id: `syn-kickoff-${evId}`, tipo: "inicio", texto: "¡Arranca el partido!", minuto: "1'" });

                if (periodo >= 2 || estado === "post") {
                  // Encontrar dónde termina la primera parte (último evento ≤ 45')
                  let htInsert = 0; // default: insertar marcadores justo después del kickoff
                  for (let i = 0; i < realEvs.length; i++) {
                    const m = parseInt(realEvs[i].minuto ?? "999");
                    if (!isNaN(m) && m <= 45) htInsert = i + 1;
                  }
                  // [kickoff, ...1ªParte, HALFTIME, SECOND_HALF, ...2ªParte]
                  merged.push(...realEvs.slice(0, htInsert));
                  merged.push({ id: `syn-ht-${evId}`,  tipo: "medio_tiempo", texto: `Medio tiempo · ${score}`, minuto: "45'" });
                  merged.push({ id: `syn-sh-${evId}`,  tipo: "periodo",      texto: "2° Tiempo",                minuto: "46'" });
                  merged.push(...realEvs.slice(htInsert));
                } else {
                  // Solo primer tiempo todavía
                  merged.push(...realEvs);
                }

                // ⏱️ Silbato final — siempre el ÚLTIMO (más reciente → queda arriba tras .reverse())
                if (estado === "post") {
                  merged.push({ id: `syn-final-${evId}`, tipo: "periodo", texto: `Partido terminado · ${score}`, minuto: "90'" });
                }

                eventos = merged;
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
            alineacion,
            sofaId: p.sofa_id ?? null,
            tieneEspn: !!espnEv,
            _debug: {
              ligaDB: p.partido_liga ?? j.liga,
              local: p.equipo_local,
              visita: p.equipo_visita,
              espnId: espnEv?.id ?? p.espn_id ?? null,
              estado,
            },
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

  // Enviar push: filtrar en DB los ya notificados, marcar los nuevos, enviar
  if (candidatos.length > 0) {
    filtrarYMarcarNuevos(candidatos.map(c => c.clave)).then(nuevasClaves => {
      const aEnviar = candidatos.filter(c => nuevasClaves.has(c.clave));
      if (aEnviar.length === 0) return;
      import("@/lib/push").then(({ sendPushToAll }) => {
        for (const n of aEnviar) {
          sendPushToAll({
            title: n.titulo,
            body: n.cuerpo,
            icon: "/logo-tablitas.png",
            url: "/en-vivo",
            tag: n.tag,
          }).catch(() => {});
        }
      }).catch(() => {});
    }).catch(() => {});
  }

  const hayEnVivo = jornadasResult.some(j => j.partidos.some(p => p.estado === "in"));
  return NextResponse.json({ jornadas: jornadasResult, hayEnVivo, actualizado: new Date().toISOString(), _v: "v6-reversed-order" });

  } catch (err) {
    console.error("[/api/live] error:", err);
    return NextResponse.json(
      { jornadas: [], hayEnVivo: false, actualizado: new Date().toISOString(), error: String(err) },
      { status: 200 }, // 200 para que el cliente no muestre "Error al cargar"
    );
  }
}
