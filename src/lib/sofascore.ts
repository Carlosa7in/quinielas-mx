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

// ── Normalización de nombres ──────────────────────────────────────────────────

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(fc|cf|cd|sd|rc|sc|ac|as|atletico|athletic|deportivo|club|real|sporting|ciudad|city)\b/g, "")
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

// ── Caches (duran toda la vida de la instancia serverless) ────────────────────

const sofaEventsCache = new Map<string, SofaEvent[]>(); // "YYYY-MM-DD" → events
const sofaIdCache     = new Map<string, number>();       // "local|visita" → sofaEventId

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible)",
  "Accept": "application/json",
};

async function fetchSofaEvents(dateStr: string): Promise<SofaEvent[]> {
  if (sofaEventsCache.has(dateStr)) return sofaEventsCache.get(dateStr)!;
  try {
    const res = await fetch(
      `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}`,
      { headers: HEADERS },
    );
    if (!res.ok) return [];
    const data = await res.json() as { events?: SofaEvent[] };
    const events = data.events ?? [];
    sofaEventsCache.set(dateStr, events);
    return events;
  } catch { return []; }
}

// Busca el ID de SofaScore para un partido dado su local, visita y fecha.
// Intenta ±1 día para cubrir diferencias de zona horaria.
export async function findSofaEventId(
  equipoLocal: string,
  equipoVisita: string,
  fecha: Date,
): Promise<number | null> {
  const cacheKey = `${norm(equipoLocal)}|${norm(equipoVisita)}`;
  if (sofaIdCache.has(cacheKey)) return sofaIdCache.get(cacheKey)!;

  const dates = [-1, 0, 1].map(offset => {
    const d = new Date(fecha);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().split("T")[0];
  });

  for (const dateStr of dates) {
    const events = await fetchSofaEvents(dateStr);
    const match = events.find(ev =>
      teamsMatch(equipoLocal, ev.homeTeam.name) &&
      teamsMatch(equipoVisita, ev.awayTeam.name),
    );
    if (match) {
      sofaIdCache.set(cacheKey, match.id);
      return match.id;
    }
  }
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
