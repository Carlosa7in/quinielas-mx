"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Wifi, WifiOff, Clock, ArrowLeft } from "lucide-react";
import { PushButton } from "@/components/PushButton";

const LIGA_NOMBRE: Record<string, string> = {
  "mex.1":           "Liga MX",
  "mex.w.1":         "Liga MX Femenil",
  "uefa.champions":  "Champions League",
  "uefa.europa":     "Europa League",
  "eng.1":           "Premier League",
  "esp.1":           "La Liga",
  "ita.1":           "Serie A",
  "ger.1":           "Bundesliga",
  "fra.1":           "Ligue 1",
  "usa.1":           "MLS",
  "fifa.world":      "Mundial 2026",
};

const ESTADO_COLOR: Record<string, string> = {
  in:   "bg-red-500 text-white animate-pulse",
  pre:  "bg-gray-700 text-gray-300",
  post: "bg-gray-800 text-gray-500",
};

const ESTADO_TEXTO: Record<string, string> = {
  in:   "EN VIVO",
  pre:  "Por jugar",
  post: "Terminado",
};

const TIPO_EMOJI: Record<string, string> = {
  gol:          "goal",
  amarilla:     "yellow",
  roja:         "red",
  cambio:       "sub",
  medio_tiempo: "ht",
};

type Evento = {
  id?: string;
  tipo: string;
  texto: string;
  minuto?: string;
  jugador?: string;
};

type Equipo = {
  nombre: string;
  abrev: string;
  logo: string;
  goles: string | null;
};

type Partido = {
  id: string;
  liga: string;
  nombre: string;
  fecha: string;
  estado: string;
  detalle: string;
  completado: boolean;
  reloj: string;
  periodo: number;
  local: Equipo;
  visita: Equipo;
  eventos: Evento[];
};

function EventoItem({ ev }: { ev: Evento }) {
  const tipo = TIPO_EMOJI[ev.tipo] ?? ev.tipo;
  const emoji =
    tipo === "goal"   ? "goal" :
    tipo === "yellow" ? "yellow" :
    tipo === "red"    ? "red" :
    tipo === "sub"    ? "sub" :
    tipo === "ht"     ? "ht" : "other";

  const emojiChar =
    emoji === "goal"   ? "goal" :
    emoji === "yellow" ? "amarilla" :
    emoji === "red"    ? "roja" :
    emoji === "sub"    ? "cambio" :
    emoji === "ht"     ? "medio tiempo" : ev.tipo;

  const bgColor =
    emoji === "goal"   ? "border-l-green-400" :
    emoji === "yellow" ? "border-l-yellow-400" :
    emoji === "red"    ? "border-l-red-400" : "border-l-gray-600";

  return (
    <div className={`flex items-start gap-2 py-1.5 border-l-2 pl-3 ${bgColor}`}>
      <span className="text-gray-500 text-xs w-10 shrink-0">{ev.minuto ?? ""}</span>
      <div className="flex-1">
        {ev.jugador && <span className="text-white text-xs font-semibold">{ev.jugador} </span>}
        <span className="text-gray-400 text-xs">{emojiChar}</span>
      </div>
    </div>
  );
}

function PartidoCard({ p }: { p: Partido }) {
  const [expanded, setExpanded] = useState(p.estado === "in");
  const ligaNombre = LIGA_NOMBRE[p.liga] ?? p.liga;

  return (
    <div className={`rounded-2xl overflow-hidden ${
      p.estado === "in" ? "ring-1 ring-red-500/50 bg-gray-900" :
      p.estado === "post" ? "bg-gray-900/50" : "bg-gray-900"
    }`}>
      <button className="w-full text-left" onClick={() => setExpanded(e => !e)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">{ligaNombre}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
            ESTADO_COLOR[p.estado] ?? ESTADO_COLOR.pre
          }`}>
            {p.estado === "in" ? (p.reloj || ESTADO_TEXTO.in) : (ESTADO_TEXTO[p.estado] ?? p.detalle)}
          </span>
        </div>

        {/* Score row */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-1">
          {/* Local */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {p.local.logo
              ? <img src={p.local.logo} alt="" className="w-7 h-7 object-contain shrink-0" />
              : <span className="w-7 h-7 bg-gray-700 rounded-full shrink-0" />
            }
            <span className={`text-sm font-bold truncate ${p.estado === "post" ? "text-gray-400" : "text-white"}`}>
              {p.local.nombre}
            </span>
          </div>

          {/* Marcador */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-2xl font-black text-white w-7 text-center">
              {p.local.goles ?? "-"}
            </span>
            <span className="text-gray-500 text-lg font-light">-</span>
            <span className="text-2xl font-black text-white w-7 text-center">
              {p.visita.goles ?? "-"}
            </span>
          </div>

          {/* Visita */}
          <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
            <span className={`text-sm font-bold truncate text-right ${p.estado === "post" ? "text-gray-400" : "text-white"}`}>
              {p.visita.nombre}
            </span>
            {p.visita.logo
              ? <img src={p.visita.logo} alt="" className="w-7 h-7 object-contain shrink-0" />
              : <span className="w-7 h-7 bg-gray-700 rounded-full shrink-0" />
            }
          </div>
        </div>
      </button>

      {/* Eventos (colapsable) */}
      {expanded && p.eventos.length > 0 && (
        <div className="border-t border-white/5 px-4 py-2 space-y-0.5">
          {[...p.eventos].reverse().map((ev, i) => (
            <EventoItem key={ev.id ?? i} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EnVivoPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [hayEnVivo, setHayEnVivo] = useState(false);
  const [ultimaActual, setUltimaActual] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      if (!res.ok) throw new Error("error");
      const data = await res.json() as { partidos: Partido[]; hayEnVivo: boolean; actualizado: string };
      setPartidos(data.partidos ?? []);
      setHayEnVivo(data.hayEnVivo ?? false);
      setUltimaActual(data.actualizado ?? null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  // Primera carga y polling cada 30 s
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 30_000);
    return () => clearInterval(id);
  }, [cargar]);

  const enVivo = partidos.filter(p => p.estado === "in");
  const porJugar = partidos.filter(p => p.estado === "pre");
  const terminados = partidos.filter(p => p.estado === "post");

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
              {hayEnVivo
                ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                : <span className="w-2 h-2 rounded-full bg-gray-600" />
              }
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

        {/* Push notifications */}
        <div className="bg-gray-900 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Notificaciones de goles</p>
            <p className="text-xs text-gray-500">Recibe avisos aunque no tengas la app abierta</p>
          </div>
          <PushButton />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3">
            <WifiOff size={16} />
            <span>Error al cargar. Reintentando...</span>
          </div>
        )}

        {cargando && !partidos.length && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-900 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        )}

        {/* EN VIVO */}
        {enVivo.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-xs font-black text-red-400 uppercase tracking-wider">En Vivo ({enVivo.length})</h2>
            </div>
            <div className="space-y-3">
              {enVivo.map(p => <PartidoCard key={p.id} p={p} />)}
            </div>
          </section>
        )}

        {/* POR JUGAR */}
        {porJugar.length > 0 && (
          <section>
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wifi size={12} />
              Hoy ({porJugar.length})
            </h2>
            <div className="space-y-3">
              {porJugar.map(p => <PartidoCard key={p.id} p={p} />)}
            </div>
          </section>
        )}

        {/* TERMINADOS */}
        {terminados.length > 0 && (
          <section>
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
              Terminados ({terminados.length})
            </h2>
            <div className="space-y-2">
              {terminados.map(p => <PartidoCard key={p.id} p={p} />)}
            </div>
          </section>
        )}

        {!cargando && partidos.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">😴</p>
            <p className="text-gray-400 font-semibold">No hay partidos hoy</p>
            <p className="text-gray-600 text-sm mt-1">Vuelve cuando haya accion</p>
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] pb-4">
          Se actualiza cada 30 segundos automaticamente
        </p>
      </div>
    </div>
  );
}
