import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Siempre dinamico - nunca cachear en build time
export const dynamic = "force-dynamic";

// Mapeo liga DB -> slug ESPN
const LIGA_ESPN: Record<string, string> = {
  "Liga MX":               "mex.1",
  "Liga MX Femenil":       "mex.w.1",
  "Champions League":      "uefa.champions",
  "UEFA Champions League": "uefa.champions",
  "UEFA Europa League":    "uefa.europa",
  "Premier League":        "eng.1",
  "La Liga":               "esp.1",
  "Serie A":               "ita.1",
  "Bundesliga":            "ger.1",
  "Ligue 1":               "fra.1",
  "MLS":                   "usa.1",
  "Mundial":               "fifa.world",
  "FIFA World Cup":        "fifa.world",
  "World Cup 2026":        "fifa.world",
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

// Cache 30 s
let cache: { data: unknown; ts: number } | null = null;
const TTL = 30_000;

// Goles ya notificados
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
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  // 1. Obtener jornadas activas con todos sus partidos
  // "abierta" = registro abierto | "cerrada" = registro cerrado pero partidos jugandose | "en_curso" = alias
  const jornadas = await prisma.jornada.findMany({
    where: { estado: { in: ["abierta", "cerrada", "en_curso"] } },
    include: {
      partidos: { orderBy: { orden: "asc" } },
    },
    orderBy: { fechaInicio: "asc" },
  });

  if (jornadas.length === 0) {
    const resultado = { jornadas: [], hayEnVivo: false, actualizado: new Date().toISOString() };
    cache = { data: resultado, ts: Date.now() };
    return NextResponse.json(resultado);
  }

  // 2. Cargar scoreboard ESPN por liga unica
  const ligasSlugs = [...new Set(
    jornadas.map(j => LIGA_ESPN[j.liga]).filter(Boolean)
  )] as string[];

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

  // 3. Para cada partido en DB, buscar su par en ESPN
  const nuevosGoles: { partido: string; jugador?: string; minuto?: string }[] = [];

  const jornadasResult = await Promise.all(
    jornadas.map(async (j) => {
      const slug = LIGA_ESPN[j.liga];
      const espnEvents = slug ? (espnEventosPorLiga[slug] ?? []) : [];

      const partidos = await Promise.all(
        j.partidos.map(async (p) => {
          // Buscar evento ESPN que coincida con los equipos
          const espnEv = espnEvents.find(ev => {
            const comps = ev.competitions?.[0]?.competitors ?? [];
            const home = comps.find(c => c.homeAway === "home");
            const away = comps.find(c => c.homeAway === "away");
            return (
              teamsMatch(p.equipoLocal, home?.team?.name ?? "") &&
              teamsMatch(p.equipoVisita, away?.team?.name ?? "")
            ) || (
              teamsMatch(p.equipoLocal, away?.team?.name ?? "") &&
              teamsMatch(p.equipoVisita, home?.team?.name ?? "")
            );
          });

          let estado = "pre";
          let detalle = "";
          let reloj = "";
          let periodo = 0;
          let golesLocal: string | null = p.golesLocal !== null ? String(p.golesLocal) : null;
          let golesVisita: string | null = p.golesVisita !== null ? String(p.golesVisita) : null;
          let logoLocal = "";
          let logoVisita = "";
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

            // Detectar si el orden ESPN coincide o esta invertido
            const ordenNormal = teamsMatch(p.equipoLocal, home?.team?.name ?? "");
            const localEspn = ordenNormal ? home : away;
            const visitaEspn = ordenNormal ? away : home;

            if (localEspn?.score != null) golesLocal = localEspn.score;
            if (visitaEspn?.score != null) golesVisita = visitaEspn.score;
            logoLocal = localEspn?.team?.logo ?? "";
            logoVisita = visitaEspn?.team?.logo ?? "";

            // Eventos solo si está en vivo
            if (estado === "in" && slug) {
              const kms = await fetchKeyMoments(slug, espnEv.id);
              eventos = kms.map(km => {
                const tipo = tipoEvento(km);
                const goalKey = `${espnEv.id}-${km.id ?? km.clock?.displayValue}`;
                if (tipo === "gol" && km.id && !notifiedGoals.has(goalKey)) {
                  notifiedGoals.add(goalKey);
                  nuevosGoles.push({
                    partido: `${p.equipoLocal} vs ${p.equipoVisita}`,
                    jugador: km.athletesInvolved?.[0]?.displayName,
                    minuto: km.clock?.displayValue,
                  });
                }
                return {
                  id: km.id,
                  tipo,
                  texto: km.text ?? km.type?.text ?? "",
                  minuto: km.clock?.displayValue,
                  jugador: km.athletesInvolved?.[0]?.displayName,
                  equipoId: km.team?.id,
                };
              });
            }

            // Si ESPN dice terminado, usar resultado de DB si ya está guardado
            if (estado === "post" && p.resultado) {
              detalle = p.resultado;
            }
          } else {
            // Sin ESPN: determinar estado por fecha
            const ahora = Date.now();
            const fechaMs = new Date(p.fechaHora).getTime();
            if (p.resultado) {
              estado = "post";
              detalle = p.resultado;
            } else if (fechaMs <= ahora && ahora - fechaMs < 2 * 60 * 60 * 1000) {
              estado = "in"; // probablemente en curso
            } else if (fechaMs > ahora) {
              estado = "pre";
            } else {
              estado = "post";
            }
          }

          return {
            id: p.id,
            orden: p.orden,
            fechaHora: p.fechaHora,
            estado,
            detalle,
            reloj,
            periodo,
            local: { nombre: p.equipoLocal, logo: logoLocal, goles: golesLocal },
            visita: { nombre: p.equipoVisita, logo: logoVisita, goles: golesVisita },
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
  const resultado = { jornadas: jornadasResult, hayEnVivo, actualizado: new Date().toISOString() };
  cache = { data: resultado, ts: Date.now() };
  return NextResponse.json(resultado);

  } catch (err) {
    console.error("[/api/live] error:", err);
    return NextResponse.json(
      { jornadas: [], hayEnVivo: false, actualizado: new Date().toISOString(), error: String(err) },
      { status: 200 }, // 200 para que el cliente no muestre "Error al cargar"
    );
  }
}
