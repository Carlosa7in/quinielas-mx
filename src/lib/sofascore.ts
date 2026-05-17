// Utilidades para la API no-oficial de SofaScore
// Documentación comunitaria: https://github.com/apdmatos/sofascore-api

export type SofaTeam = {
  id: number;
  name: string;
  shortName?: string;
};

export type SofaEvent = {
  id: number;
  homeTeam: SofaTeam;
  awayTeam: SofaTeam;
  tournament?: { uniqueTournament?: { id: number } };
};

export type SofaIncident = {
  id?: number;
  incidentType: "goal" | "substitution" | "card" | "varDecision" | "period" | "injuryTime" | string;
  time: number;
  addedTime?: number;
  isHome?: boolean;
  // goal
  incidentClass?: string; // "regular"|"ownGoal"|"penalty"|"yellow"|"red"|"yellowRed"
  player?: { id?: number; name: string; jerseyNumber?: number };
  playerAssist?: { id?: number; name: string };
  // substitution
  playerIn?: { id?: number; name: string };
  playerOut?: { id?: number; name: string };
  // scores after goal
  homeScore?: number;
  awayScore?: number;
  // period marker: "KO" | "HT" | "FT" | "ET" | "PEN"
  text?: string;
  // VAR
  description?: string;
  // injuryTime
  length?: number;
};

// ── Mapeo liga DB → SofaScore unique tournament IDs ─────────────────────────
// Incluye playoffs/liguilla porque están en el mismo torneo

const LIGA_SOFA: Record<string, number[]> = {
  "Liga MX":               [11620, 11621], // Clausura y Apertura (incluye Liguilla)
  "Liga MX Femenil":       [13596],
  "Clausura":              [11620],
  "Apertura":              [11621],
  "Mixta":                 [11620, 11621],
  "Brasileirao":           [325],
  "Brasileirão":           [325],
  "Brasileirao Serie A":   [325],
  "Brasileirão Serie A":   [325],
  "Serie A Brasil":        [325],
  "Copa Libertadores":     [384],
  "CONMEBOL Libertadores": [384],
  "Libertadores":          [384],
  "Copa Sudamericana":     [480],
  "CONMEBOL Sudamericana": [480],
  "Sudamericana":          [480],
  "Champions League":      [7],
  "UEFA Champions League": [7],
  "UEFA Europa League":    [679],
  "Premier League":        [17],
  "La Liga":               [8],
  "Serie A":               [23],
  "Bundesliga":            [35],
  "Ligue 1":               [34],
  "MLS":                   [242],
  "Mundial":               [16],
  "FIFA World Cup":        [16],
  "World Cup 2026":        [16],
};

// ── Normalización ─────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|cf|cd|sd|rc|sc|ac|as|atletico|athletic|deportivo|club|real|sporting|ciudad|city|se|cr)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(" ").filter(w => w.length >= 4);
  const wb = nb.split(" ").filter(w => w.length >= 4);
  return wa.some(w => wb.includes(w));
}

// ── Caches ────────────────────────────────────────────────────────────────────

const sofaIdCache      = new Map<string, number>();   // "local|visita" → sofaEventId
const seasonIdCache    = new Map<number, number>();   // tournamentId   → seasonId
// tournamentEvents: "tid/sid/page" → { events, ts }
const tournamentEventsCache = new Map<string, { events: SofaEvent[]; ts: number }>();
const EVENTS_TTL = 90_000; // 90 segundos — refrescamos en vivo

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible)",
  "Accept": "application/json",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getSeasonId(tournamentId: number): Promise<number | null> {
  if (seasonIdCache.has(tournamentId)) return seasonIdCache.get(tournamentId)!;
  try {
    const res = await fetch(
      `https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/seasons`,
      { headers: HEADERS },
    );
    if (!res.ok) return null;
    const data = await res.json() as { seasons: { id: number }[] };
    const id = data.seasons?.[0]?.id ?? null;
    if (id) seasonIdCache.set(tournamentId, id);
    return id;
  } catch { return null; }
}

async function fetchTournamentPage(
  tournamentId: number,
  seasonId: number,
  page: string,
): Promise<SofaEvent[]> {
  const key = `${tournamentId}/${seasonId}/${page}`;
  const cached = tournamentEventsCache.get(key);
  if (cached && Date.now() - cached.ts < EVENTS_TTL) return cached.events;
  try {
    const res = await fetch(
      `https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/events/${page}`,
      { headers: HEADERS },
    );
    if (!res.ok) return [];
    const data = await res.json() as { events?: SofaEvent[] };
    const events = data.events ?? [];
    tournamentEventsCache.set(key, { events, ts: Date.now() });
    return events;
  } catch { return []; }
}

// Busca entre los partidos recientes/próximos del torneo el que coincida con
// los equipos. Revisa last/0 (más reciente terminado), next/0 (próximo/en vivo)
// y last/1 (penúltima jornada) para cubrir toda la ventana de una jornada.
async function searchInTournament(
  tournamentId: number,
  equipoLocal: string,
  equipoVisita: string,
): Promise<number | null> {
  const seasonId = await getSeasonId(tournamentId);
  if (!seasonId) return null;

  for (const page of ["last/0", "next/0", "last/1", "next/1"]) {
    const events = await fetchTournamentPage(tournamentId, seasonId, page);
    const match = events.find(ev =>
      teamsMatch(equipoLocal, ev.homeTeam.name) &&
      teamsMatch(equipoVisita, ev.awayTeam.name),
    );
    if (match) return match.id;
  }
  return null;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Encuentra el ID de evento SofaScore para un partido.
 * Estrategia:
 *  1. Cache en memoria (evita búsquedas repetidas)
 *  2. Búsqueda por torneo específico (último/siguiente round)  ← más fiable
 *  3. Fallback: live endpoint de SofaScore                    ← para partidos en vivo sin liga mapeada
 */
export async function findSofaEventId(
  equipoLocal: string,
  equipoVisita: string,
  ligaDB: string,
): Promise<number | null> {
  const cacheKey = `${norm(equipoLocal)}|${norm(equipoVisita)}`;
  if (sofaIdCache.has(cacheKey)) return sofaIdCache.get(cacheKey)!;

  // Buscar en todos los torneos mapeados para esta liga
  const tournamentIds = LIGA_SOFA[ligaDB] ?? [];
  for (const tid of tournamentIds) {
    const id = await searchInTournament(tid, equipoLocal, equipoVisita);
    if (id) {
      sofaIdCache.set(cacheKey, id);
      return id;
    }
  }

  // Fallback: endpoint de partidos en vivo (cubre cualquier liga no mapeada)
  try {
    const res = await fetch(
      "https://api.sofascore.com/api/v1/sport/football/events/live",
      { headers: HEADERS },
    );
    if (res.ok) {
      const data = await res.json() as { events?: SofaEvent[] };
      const match = (data.events ?? []).find(ev =>
        teamsMatch(equipoLocal, ev.homeTeam.name) &&
        teamsMatch(equipoVisita, ev.awayTeam.name),
      );
      if (match) {
        sofaIdCache.set(cacheKey, match.id);
        return match.id;
      }
    }
  } catch { /* ignorar */ }

  return null;
}

// Devuelve todos los incidentes de un evento SofaScore.
export async function fetchSofaIncidents(eventId: number): Promise<SofaIncident[]> {
  try {
    const res = await fetch(
      `https://api.sofascore.com/api/v1/event/${eventId}/incidents`,
      { headers: HEADERS },
    );
    if (!res.ok) return [];
    const data = await res.json() as { incidents?: SofaIncident[] };
    return data.incidents ?? [];
  } catch { return []; }
}
