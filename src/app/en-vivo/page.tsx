"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Clock, ArrowLeft, BellOff } from "lucide-react";
import { PushButton } from "@/components/PushButton";

const ESTADO_BADGE: Record<string, string> = {
  in:   "bg-red-500 text-white",
  pre:  "bg-gray-700 text-gray-300",
  post: "bg-gray-800 text-gray-500",
};

const TIPO_COLOR: Record<string, string> = {
  gol:          "border-l-green-400",
  amarilla:     "border-l-yellow-400",
  roja:         "border-l-red-500",
  cambio:       "border-l-blue-400",
  medio_tiempo: "border-l-indigo-400",
  inicio:       "border-l-indigo-400",
  periodo:      "border-l-indigo-400",
  var:          "border-l-orange-400",
};

const TIPO_EMOJI: Record<string, string> = {
  gol:          "⚽",
  amarilla:     "🟡",
  roja:         "🟥",
  cambio:       "🔄",
  medio_tiempo: "⏸️",
  inicio:       "🏁",
  var:          "📺",
};

const TIPO_LABEL: Record<string, string> = {
  gol:          "Gol",
  amarilla:     "Amarilla",
  roja:         "Roja",
  cambio:       "Cambio",
  medio_tiempo: "Medio tiempo",
  inicio:       "Inicio",
  periodo:      "Fin",
  var:          "VAR",
};

// Texto legible para marcadores de periodo SofaScore
const PERIODO_TEXTO: Record<string, string> = {
  KO:  "🏁 Silbatazo inicial",
  HT:  "⏸️ Medio tiempo",
  FT:  "⏱️ Fin del partido",
  ET:  "⏳ Tiempo extra",
  PEN: "🥅 Penales",
};

type Evento = {
  id?: string;
  tipo: string;
  texto: string;
  minuto?: string;
  jugador?: string;
  asistente?: string;
  jugadorSale?: string;
  equipo?: string;
  esPenal?: boolean;
  esAutogol?: boolean;
};
type EquipoVivo = { nombre: string; logo: string; goles: string | null };
type PartidoVivo = {
  id: string;
  orden: number;
  fechaHora: string;
  estado: string;
  detalle: string;
  reloj: string;
  periodo: number;
  local: EquipoVivo;
  visita: EquipoVivo;
  resultadoDB: string | null;
  eventos: Evento[];
  tieneEspn: boolean;
  sofaId: number | null;
};
type JornadaViva = { id: string; nombre: string; liga: string; partidos: PartidoVivo[] };

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
  });
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short", timeZone: "America/Mexico_City",
  });
}

function TeamLogo({ logo, nombre }: { logo: string; nombre: string }) {
  const initials = nombre.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (logo) {
    return (
      <img
        src={logo}
        alt={nombre}
        className="w-7 h-7 object-contain shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <span className="w-7 h-7 rounded-full bg-gray-700 shrink-0 flex items-center justify-center text-[9px] font-black text-gray-300">
      {initials}
    </span>
  );
}

function EventoItem({ ev }: { ev: Evento }) {
  // ── Eventos de período: banner ancho ─────────────────────────────────────
  if (ev.tipo === "inicio" || ev.tipo === "medio_tiempo" || ev.tipo === "periodo") {
    const textoLegible = PERIODO_TEXTO[ev.texto ?? ""] ?? ev.texto ?? TIPO_LABEL[ev.tipo];
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest px-2">{textoLegible}</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
    );
  }

  // ── Gol: máximo impacto ───────────────────────────────────────────────────
  if (ev.tipo === "gol") {
    const badge = ev.esAutogol ? "🤦 Autogol" : ev.esPenal ? "⚡ Penal" : null;
    return (
      <div className="rounded-lg bg-green-950/60 border border-green-500/30 px-3 py-2.5 my-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-green-300 text-[11px] font-black uppercase tracking-wide">¡Gooool!</span>
                {badge && (
                  <span className="text-[9px] bg-green-800/60 text-green-300 px-1.5 py-0.5 rounded-full font-bold">{badge}</span>
                )}
              </div>
              {ev.jugador && (
                <p className="text-white text-sm font-black leading-tight">{ev.jugador}</p>
              )}
              {(ev.asistente || (ev.texto && ev.texto !== "Gol" && ev.texto !== "Goal")) && (
                <p className="text-green-400/70 text-[10px] mt-0.5">
                  {ev.texto && ev.texto !== "Gol" && ev.texto !== "Goal" ? ev.texto : ""}
                  {ev.asistente ? `${ev.texto ? " · " : ""}Asist. ${ev.asistente}` : ""}
                </p>
              )}
              {ev.equipo && <p className="text-gray-500 text-[10px]">{ev.equipo}</p>}
            </div>
          </div>
          <span className="text-green-400/60 text-xs font-bold tabular-nums shrink-0">{ev.minuto}</span>
        </div>
      </div>
    );
  }

  // ── Tarjeta roja: impacto fuerte ──────────────────────────────────────────
  if (ev.tipo === "roja") {
    return (
      <div className="rounded-lg bg-red-950/60 border border-red-500/40 px-3 py-2 my-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🟥</span>
            <div>
              <span className="text-red-300 text-[11px] font-black uppercase tracking-wide">¡Expulsado!</span>
              {ev.jugador && <p className="text-white text-sm font-bold">{ev.jugador}</p>}
              {ev.equipo && <p className="text-gray-500 text-[10px]">{ev.equipo}</p>}
            </div>
          </div>
          <span className="text-red-400/60 text-xs font-bold tabular-nums shrink-0">{ev.minuto}</span>
        </div>
      </div>
    );
  }

  // ── Amarilla ──────────────────────────────────────────────────────────────
  if (ev.tipo === "amarilla") {
    return (
      <div className={`flex items-center gap-2 py-1.5 border-l-2 pl-3 border-l-yellow-400`}>
        <span className="text-gray-500 text-[10px] w-10 shrink-0 tabular-nums">{ev.minuto}</span>
        <span className="text-base shrink-0">🟡</span>
        <div className="flex-1">
          {ev.jugador
            ? <span className="text-yellow-200 text-xs font-semibold">{ev.jugador}</span>
            : <span className="text-gray-400 text-xs">Tarjeta amarilla</span>}
          {ev.equipo && <p className="text-gray-600 text-[10px]">{ev.equipo}</p>}
        </div>
      </div>
    );
  }

  // ── Cambio ────────────────────────────────────────────────────────────────
  if (ev.tipo === "cambio") {
    return (
      <div className="flex items-center gap-2 py-1.5 border-l-2 pl-3 border-l-blue-400">
        <span className="text-gray-500 text-[10px] w-10 shrink-0 tabular-nums">{ev.minuto}</span>
        <span className="text-base shrink-0">🔄</span>
        <div className="flex-1 text-xs">
          {ev.jugador && <span className="text-green-400 font-semibold">↑ {ev.jugador}</span>}
          {ev.jugador && ev.jugadorSale && <span className="text-gray-600">  </span>}
          {ev.jugadorSale && <span className="text-red-400 font-semibold">↓ {ev.jugadorSale}</span>}
        </div>
      </div>
    );
  }

  // ── VAR ───────────────────────────────────────────────────────────────────
  if (ev.tipo === "var") {
    return (
      <div className="rounded-lg bg-orange-950/40 border border-orange-500/20 px-3 py-2 my-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📺</span>
            <div>
              <span className="text-orange-300 text-[11px] font-black uppercase tracking-wide">Revisión VAR</span>
              {ev.texto && ev.texto !== "VAR" && (
                <p className="text-orange-200/70 text-xs mt-0.5">{ev.texto}</p>
              )}
              {ev.jugador && <p className="text-gray-400 text-[10px]">{ev.jugador}</p>}
            </div>
          </div>
          <span className="text-orange-400/60 text-xs font-bold tabular-nums shrink-0">{ev.minuto}</span>
        </div>
      </div>
    );
  }

  // ── Fallback genérico ─────────────────────────────────────────────────────
  return (
    <div className={`flex items-center gap-2 py-1.5 border-l-2 pl-3 ${TIPO_COLOR[ev.tipo] ?? "border-l-gray-600"}`}>
      <span className="text-gray-600 text-[10px] w-10 shrink-0 tabular-nums">{ev.minuto}</span>
      <span className="text-sm shrink-0">{TIPO_EMOJI[ev.tipo] ?? "•"}</span>
      <div className="flex-1 text-xs text-gray-400">
        {ev.jugador && <span className="text-white font-semibold">{ev.jugador} </span>}
        {ev.texto || TIPO_LABEL[ev.tipo] || ev.tipo}
      </div>
    </div>
  );
}

function PartidoRow({ p }: { p: PartidoVivo }) {
  // Auto-expandir solo si hay eventos; pre siempre colapsado
  const [expanded, setExpanded] = useState(p.estado === "in" || (p.estado === "post" && p.eventos.length > 0));

  const hayScore = p.local.goles !== null && p.visita.goles !== null;
  const estadoLabel =
    p.estado === "in"   ? (p.reloj || "EN VIVO") :
    p.estado === "post" ? "Final" :
    fmtHora(p.fechaHora);

  return (
    <div className={`rounded-xl overflow-hidden ${
      p.estado === "in" ? "ring-1 ring-red-500/40 bg-gray-900" :
      p.estado === "post" ? "bg-gray-900/40" : "bg-gray-900"
    }`}>
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3 px-4 py-3">

          {/* Estado / reloj */}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
            ESTADO_BADGE[p.estado] ?? ESTADO_BADGE.pre
          } ${p.estado === "in" ? "animate-pulse" : ""}`}>
            {estadoLabel}
          </span>

          {/* Local */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className={`text-sm font-bold truncate text-right ${p.estado === "post" ? "text-gray-400" : "text-white"}`}>
              {p.local.nombre}
            </span>
            <TeamLogo logo={p.local.logo} nombre={p.local.nombre} />
          </div>

          {/* Marcador */}
          <div className="flex items-center gap-1 shrink-0 min-w-[52px] justify-center">
            {hayScore ? (
              <>
                <span className="text-xl font-black text-white tabular-nums">{p.local.goles}</span>
                <span className="text-gray-600">-</span>
                <span className="text-xl font-black text-white tabular-nums">{p.visita.goles}</span>
              </>
            ) : (
              <span className="text-gray-600 text-sm font-bold">vs</span>
            )}
          </div>

          {/* Visita */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <TeamLogo logo={p.visita.logo} nombre={p.visita.nombre} />
            <span className={`text-sm font-bold truncate ${p.estado === "post" ? "text-gray-400" : "text-white"}`}>
              {p.visita.nombre}
            </span>
          </div>
        </div>

        {/* Fecha */}
        {p.estado === "pre" && (
          <p className="text-gray-600 text-[10px] text-center pb-2 -mt-1">
            {fmtFecha(p.fechaHora)}
          </p>
        )}
      </button>

      {/* Alineaciones — link a SofaScore */}
      {p.estado === "pre" && (
        <div className="border-t border-white/5 px-4 py-2">
          <a
            href={`https://www.sofascore.com/search#q=${encodeURIComponent(p.local.nombre + " " + p.visita.nombre)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full text-[11px] font-semibold text-indigo-400/80 hover:text-indigo-300 transition-colors py-1"
          >
            <span>📋</span> Ver alineaciones en SofaScore
          </a>
        </div>
      )}

      {/* Eventos */}
      {expanded && (
        <div className="border-t border-white/5 px-4 py-2 space-y-0.5">
          {p.eventos.length > 0
            ? [...p.eventos].reverse().map((ev, i) => <EventoItem key={ev.id ?? i} ev={ev} />)
            : <p className="text-gray-600 text-xs text-center py-2">Sin incidentes disponibles</p>
          }
        </div>
      )}

      {/* Comparar con mi quiniela */}
      <div className="border-t border-white/5 px-4 py-2">
        <Link
          href="/consultar"
          className="flex items-center justify-center gap-1.5 w-full text-[11px] font-semibold text-amber-400/80 hover:text-amber-300 transition-colors py-1"
        >
          <span>📋</span> Comparar con mi quiniela
        </Link>
      </div>
    </div>
  );
}

function TestPushButton() {
  const [estado, setEstado] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [msg, setMsg] = useState("");

  async function probar() {
    setEstado("loading");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const d = await res.json() as { ok: boolean; enviados?: number; error?: string };
      if (d.ok) { setEstado("ok"); setMsg(`Enviada a ${d.enviados} dispositivo${d.enviados !== 1 ? "s" : ""}`); }
      else { setEstado("error"); setMsg(d.error ?? "Error"); }
    } catch { setEstado("error"); setMsg("Error de red"); }
    setTimeout(() => { setEstado("idle"); setMsg(""); }, 4000);
  }

  if (estado === "ok")    return <span className="text-green-400 text-xs">{msg}</span>;
  if (estado === "error") return <span className="text-red-400 text-xs">{msg}</span>;

  return (
    <button
      onClick={probar}
      disabled={estado === "loading"}
      className="text-gray-600 hover:text-gray-400 text-xs transition-colors disabled:opacity-50"
      title="Enviar notificación de prueba"
    >
      {estado === "loading" ? "..." : "Probar"}
    </button>
  );
}

function NotifBloqueadasBanner() {
  const [bloqueadas, setBloqueadas] = useState(false);
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "denied") {
      setBloqueadas(true);
    }
  }, []);
  if (!bloqueadas) return null;

  return (
    <button
      className="w-full flex items-center justify-between bg-gray-900 rounded-2xl px-4 py-3 border border-amber-700/30 hover:border-amber-500/50 transition-colors"
      onClick={() => {
        // Abrir ajustes del navegador (funciona en Android Chrome)
        if ("permissions" in navigator) {
          alert("Ve a Ajustes del navegador > Permisos del sitio > Notificaciones y activa este sitio.");
        }
      }}
    >
      <div className="flex items-center gap-2">
        <BellOff size={15} className="text-amber-400 shrink-0" />
        <span className="text-amber-300 text-sm font-semibold">Reactivar notificaciones</span>
      </div>
      <span className="text-amber-400/50 text-xs">→ Ajustes</span>
    </button>
  );
}

export default function EnVivoPage() {
  const [jornadas, setJornadas] = useState<JornadaViva[]>([]);
  const [hayEnVivo, setHayEnVivo] = useState(false);
  const [ultimaActual, setUltimaActual] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      const data = await res.json() as { jornadas?: JornadaViva[]; hayEnVivo?: boolean; actualizado?: string; error?: string };
      if (data.error) console.warn("[en-vivo] API error:", data.error);
      setJornadas(data.jornadas ?? []);
      setHayEnVivo(data.hayEnVivo ?? false);
      setUltimaActual(data.actualizado ?? null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 15_000); // 15 s — más rápido para partidos en vivo
    return () => clearInterval(id);
  }, [cargar]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hayEnVivo ? "bg-red-500 animate-pulse" : "bg-gray-600"}`} />
              <h1 className="font-black text-base">En Vivo</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ultimaActual && (
              <span className="text-gray-600 text-[10px] flex items-center gap-1">
                <Clock size={10} />
                {new Date(ultimaActual).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button onClick={cargar} className={`text-gray-400 hover:text-white ${cargando ? "animate-spin" : ""}`}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-5">

        {/* Notificaciones */}
        <NotifBloqueadasBanner />
        <div className="bg-gray-900 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Notificaciones en vivo</p>
            <p className="text-xs text-gray-500">Avisos aunque no tengas la app abierta</p>
          </div>
          <PushButton />
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3">
            Error al cargar. Reintentando en 30 s...
          </div>
        )}

        {cargando && !jornadas.length && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="bg-gray-900 rounded-xl h-16 animate-pulse" />)}
          </div>
        )}

        {/* Jornadas */}
        {jornadas.map(j => (
          <section key={j.id}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-amber-400 uppercase tracking-wider">{j.nombre}</h2>
              <span className="text-[10px] text-gray-600 font-semibold uppercase">{j.liga}</span>
            </div>

            {/* En vivo primero */}
            {j.partidos.some(p => p.estado === "in") && (
              <div className="space-y-2 mb-3">
                {j.partidos.filter(p => p.estado === "in").map(p => <PartidoRow key={p.id} p={p} />)}
              </div>
            )}

            {/* Por jugar */}
            {j.partidos.some(p => p.estado === "pre") && (
              <div className="space-y-2 mb-3">
                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-1">Por jugar</p>
                {j.partidos.filter(p => p.estado === "pre").map(p => <PartidoRow key={p.id} p={p} />)}
              </div>
            )}

            {/* Terminados */}
            {j.partidos.some(p => p.estado === "post") && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-1">Terminados</p>
                {j.partidos.filter(p => p.estado === "post").map(p => <PartidoRow key={p.id} p={p} />)}
              </div>
            )}
          </section>
        ))}

        {!cargando && jornadas.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">😴</p>
            <p className="text-gray-400 font-semibold">No hay jornadas activas</p>
            <p className="text-gray-600 text-sm mt-1">Cuando haya una jornada abierta aparecera aqui</p>
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] pb-4">Actualiza cada 15 segundos</p>
      </div>
    </div>
  );
}
