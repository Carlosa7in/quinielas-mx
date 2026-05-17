// Utilidades para la API no-oficial de SofaScore

export type SofaTeam = { id: number; name: string; shortName?: string };
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
  incidentClass?: string;
  player?: { id?: number; name: string; jerseyNumber?: number };
  playerAssist?: { id?: number; name: string };
  playerIn?: { id?: number; name: string };
  playerOut?: { id?: number; name: string };
  homeScore?: number;
  awayScore?: number;
  text?: string;
  description?: string;
  length?: number;
};

// ── Liga DB → SofaScore unique tournament ID ─────────────────────────────────
const LIGA_SOFA: Record<string, number> = {
  "Liga MX":               11620,
  "Liga MX Femenil":       13596,
  "Clausura":              11620,
  "Apertura":              11621,
  "Brasileirao":           325,
  "Brasileirão":           325,
  "Brasileirao Serie A":   325,
  "Brasileirão Serie A":   325,
  "Serie A Brasil":        325,
  "Copa Libertadores":     384,
  "CONMEBOL Libertadores": 384,
  "Libertadores":          384,
  "Copa Sudamericana":     480,
  "CONMEBOL Sudamericana": 480,
  "Sudamericana":          480,
  "Champions League":      7,
  "UEFA Champions League": 7,
  "UEFA Europa League":    679,
  "Premier League":        17,
  "La Liga":               8,
  "Serie A":               23,
  "Bundesliga":            35,
  "Ligue 1":               34,
  "MLS":                   242,
  "Mundial":               16,
  "FIFA World Cup":        16,
  "World Cup 2026":        16,
};

// ── Normalización ─────────────────────────────────────────────────────────────
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|cf|cd|sd|rc|sc|ac|as|se|cr|atletico|athletic|deportivo|club|real|sporting|ciudad|city)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Lookup normalizado: acepta cualquier encoding de tildes/ñ
const LIGA_SOFA_NORM: Record<string, number> = Object.fromEntries(
  Object.entries(LIGA_SOFA).map(([k, v]) => [norm(k), v])
);

function teamsMatch(a: string, b: string): boolean {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(" ").filter(w => w.length >= 4);
  const wb = nb.split(" ").filter(w => w.length >= 4);
  return wa.some(w => wb.includes(w));
}

// ── Caches ────────────────────────────────────────────────────────────────────
const sofaIdCache   = new Map<string, number>();   // "local|visita" → eventId
const seasonCache   = new Map<number, number>();   // tournamentId   → seasonId
// tourney page cache: "tid/sid/page" → { events, ts }
const pageCache     = new Map<string, { events: SofaEvent[]; ts: number }>();
const PAGE_TTL      = 3 * 60_000; // 3 minutos

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible)", "Accept": "application/json" };

async function getSeasonId(tid: number): Promise<number | null> {
  if (seasonCache.has(tid)) return seasonCache.get(tid)!;
  try {
    const r = await fetch(`https://api.sofascore.com/api/v1/unique-tournament/${tid}/seasons`, { headers: HEADERS });
    if (!r.ok) return null;
    const d = await r.json() as { seasons?: { id: number }[] };
    const id = d.seasons?.[0]?.id ?? null;
    if (id) seasonCache.set(tid, id);
    return id;
  } catch { return null; }
}

async function fetchPage(tid: number, sid: number, page: string): Promise<SofaEvent[]> {
  const key = `${tid}/${sid}/${page}`;
  const cached = pageCache.get(key);
  if (cached && Date.now() - cached.ts < PAGE_TTL) return cached.events;
  try {
    const r = await fetch(
      `https://api.sofascore.com/api/v1/unique-tournament/${tid}/season/${sid}/events/${page}`,
      { headers: HEADERS },
    );
    if (!r.ok) return [];
    const d = await r.json() as { events?: SofaEvent[] };
    const events = d.events ?? [];
    pageCache.set(key, { events, ts: Date.now() });
    return events;
  } catch { return []; }
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Busca el ID de evento SofaScore para un partido dado su liga, local y visita.
 * Fetch en paralelo (last/0 y next/0) del torneo específico para evitar timeout.
 */
export async function findSofaEventId(
  equipoLocal: string,
  equipoVisita: string,
  ligaDB: string,
): Promise<number | null> {
  const cacheKey = `${norm(equipoLocal)}|${norm(equipoVisita)}`;
  if (sofaIdCache.has(cacheKey)) return sofaIdCache.get(cacheKey)!;

  const tid = LIGA_SOFA[ligaDB] ?? LIGA_SOFA_NORM[norm(ligaDB)];
  if (!tid) return null; // liga no mapeada

  const sid = await getSeasonId(tid);
  if (!sid) return null;

  // Solo jornada en curso y la anterior + próxima — partidos en vivo siempre están aquí
  const pages = await Promise.all([
    fetchPage(tid, sid, "last/0"),
    fetchPage(tid, sid, "last/1"),
    fetchPage(tid, sid, "next/0"),
  ]);

  const all = pages.flat();
  // Busca en ambos órdenes: la DB puede tener local/visita invertidos vs SofaScore
  const match = all.find(ev =>
    (teamsMatch(equipoLocal, ev.homeTeam.name) && teamsMatch(equipoVisita, ev.awayTeam.name)) ||
    (teamsMatch(equipoLocal, ev.awayTeam.name) && teamsMatch(equipoVisita, ev.homeTeam.name)),
  );

  if (match) {
    sofaIdCache.set(cacheKey, match.id);
    return match.id;
  }
  return null;
}

export async function fetchSofaIncidents(eventId: number): Promise<SofaIncident[]> {
  try {
    const r = await fetch(`https://api.sofascore.com/api/v1/event/${eventId}/incidents`, { headers: HEADERS });
    if (!r.ok) return [];
    const d = await r.json() as { incidents?: SofaIncident[] };
    return d.incidents ?? [];
  } catch { return []; }
}
