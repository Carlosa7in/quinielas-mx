import { NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push";

// Mapeo de nombres de liga (DB) -> slug ESPN
const LIGA_ESPN: Record<string, string> = {
  "Liga MX":              "mex.1",
  "Liga MX Femenil":      "mex.w.1",
  "Champions League":     "uefa.champions",
  "UEFA Champions League":"uefa.champions",
  "UEFA Europa League":   "uefa.europa",
  "Premier League":       "eng.1",
  "La Liga":              "esp.1",
  "Serie A":              "ita.1",
  "Bundesliga":           "ger.1",
  "Ligue 1":              "fra.1",
  "MLS":                  "usa.1",
  "Mundial":              "fifa.world",
  "FIFA World Cup":       "fifa.world",
  "World Cup 2026":       "fifa.world",
};

// Ligas que siempre se monitorean (aunque no haya jornada activa)
const LIGAS_DEFAULT = ["mex.1", "fifa.world"];

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
  competitions?: {
    competitors?: EspnCompetitor[];
  }[];
  league?: { slug?: string };
};

type EspnKeyMoment = {
  id?: string;
  type?: { id?: string; text?: string };
  text?: string;
  clock?: { displayValue?: string };
  period?: { number?: number };
  athletesInvolved?: { displayName?: string }[];
  team?: { id?: string; name?: string };
  scoreValue?: number;
};

// Cache 30 segundos
let cache: { data: unknown; ts: number } | null = null;
const TTL = 30 * 1000;

// Goals ya notificados (evita enviar push duplicados)
const notifiedGoals = new Set<string>();

async function fetchEventos(ligaSlug: string, eventId: string): Promise<EspnKeyMoment[]> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${ligaSlug}/summary?event=${eventId}`,
    );
    if (!res.ok) return [];
    const data = await res.json() as { keyMoments?: EspnKeyMoment[] };
    return data.keyMoments ?? [];
  } catch {
    return [];
  }
}

function tipoEvento(km: EspnKeyMoment): string {
  const id = km.type?.id?.toLowerCase() ?? "";
  const texto = (km.text ?? "").toLowerCase();
  if (id === "goal" || id === "score" || texto.includes("goal") || texto.includes("gol")) return "gol";
  if (id === "yellowcard" || texto.includes("yellow")) return "amarilla";
  if (id === "redcard" || texto.includes("red card") || texto.includes("roja")) return "roja";
  if (id === "substitution" || texto.includes("substitut")) return "cambio";
  if (id === "halftime" || texto.includes("half")) return "medio_tiempo";
  return km.type?.id ?? "evento";
}

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  const ligasSet = new Set<string>(LIGAS_DEFAULT);

  // Agregar ligas de jornadas activas
  try {
    const { prisma } = await import("@/lib/prisma");
    const jornadas = await prisma.jornada.findMany({
      where: { estado: { in: ["abierta", "en_curso"] } },
      select: { liga: true },
    });
    for (const j of jornadas) {
      const slug = LIGA_ESPN[j.liga];
      if (slug) ligasSet.add(slug);
    }
  } catch { /* no bloquear */ }

  const partidos: unknown[] = [];
  const nuevosGoles: { partido: string; jugador?: string; minuto?: string; equipo?: string }[] = [];

  for (const ligaSlug of ligasSet) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${ligaSlug}/scoreboard`,
      );
      if (!res.ok) continue;
      const data = await res.json() as { events?: EspnEvent[] };

      for (const ev of data.events ?? []) {
        const status = ev.status?.type;
        const estado = status?.state ?? "pre"; // "pre" | "in" | "post"
        const comps = ev.competitions?.[0];
        const competitors = comps?.competitors ?? [];
        const home = competitors.find(c => c.homeAway === "home");
        const away = competitors.find(c => c.homeAway === "away");

        let eventos: unknown[] = [];

        if (estado === "in") {
          const kms = await fetchEventos(ligaSlug, ev.id);
          eventos = kms.map(km => {
            const tipo = tipoEvento(km);
            const goalKey = `${ev.id}-${km.id ?? km.clock?.displayValue ?? ""}`;

            // Notificar gol nuevo
            if (tipo === "gol" && km.id && !notifiedGoals.has(goalKey)) {
              notifiedGoals.add(goalKey);
              nuevosGoles.push({
                partido: ev.name ?? "",
                jugador: km.athletesInvolved?.[0]?.displayName,
                minuto: km.clock?.displayValue,
                equipo: km.team?.name,
              });
            }

            return {
              id: km.id,
              tipo,
              texto: km.text ?? km.type?.text ?? "",
              minuto: km.clock?.displayValue,
              jugador: km.athletesInvolved?.[0]?.displayName,
              equipo: km.team?.id,
            };
          });
        }

        partidos.push({
          id: ev.id,
          liga: ligaSlug,
          nombre: ev.name ?? "",
          fecha: ev.date ?? "",
          estado,
          detalle: status?.detail ?? status?.shortDetail ?? "",
          completado: status?.completed ?? false,
          reloj: ev.status?.displayClock ?? "",
          periodo: ev.status?.period ?? 0,
          local: {
            nombre: home?.team?.name ?? "",
            abrev: home?.team?.abbreviation ?? "",
            logo: home?.team?.logo ?? "",
            goles: home?.score ?? null,
          },
          visita: {
            nombre: away?.team?.name ?? "",
            abrev: away?.team?.abbreviation ?? "",
            logo: away?.team?.logo ?? "",
            goles: away?.score ?? null,
          },
          eventos,
        });
      }
    } catch { continue; }
  }

  // Ordenar: en vivo > por jugar > terminados
  const orden: Record<string, number> = { in: 0, pre: 1, post: 2 };
  partidos.sort((a, b) => {
    const aa = a as { estado: string; fecha: string };
    const bb = b as { estado: string; fecha: string };
    const diff = (orden[aa.estado] ?? 3) - (orden[bb.estado] ?? 3);
    if (diff !== 0) return diff;
    return new Date(aa.fecha).getTime() - new Date(bb.fecha).getTime();
  });

  // Enviar push por cada gol nuevo (fuera del lock)
  if (nuevosGoles.length > 0) {
    for (const g of nuevosGoles) {
      const titulo = g.jugador
        ? `Gol de ${g.jugador} ${g.minuto ? `(${g.minuto})` : ""}`
        : `Gol! ${g.minuto ? g.minuto : ""}`;
      sendPushToAll({
        title: titulo,
        body: g.partido,
        icon: "/logo-tablitas.png",
        url: "/en-vivo",
        tag: `gol-${g.partido}-${g.minuto}`,
      }).catch(() => {});
    }
  }

  const hayEnVivo = partidos.some(p => (p as { estado: string }).estado === "in");
  const resultado = { partidos, hayEnVivo, actualizado: new Date().toISOString() };
  cache = { data: resultado, ts: Date.now() };
  return NextResponse.json(resultado);
}
