"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

type PartidoVivo = {
  id: string;
  fechaHora: string;
  estado: string;
  reloj: string;
  local: { nombre: string; logo: string; goles: string | null };
  visita: { nombre: string; logo: string; goles: string | null };
};
type JornadaViva = { id: string; nombre: string; partidos: PartidoVivo[] };

function pad(n: number) { return String(n).padStart(2, "0"); }

function Countdown({ fechaISO }: { fechaISO: string }) {
  const calc = () => {
    // fechaHora es UTC real (con Z) — comparar directamente contra Date.now()
    const diff = new Date(fechaISO).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0 };
    return {
      h: Math.floor(diff / 3_600_000),
      m: Math.floor((diff % 3_600_000) / 60_000),
      s: Math.floor((diff % 60_000) / 1_000),
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaISO]);

  return (
    <div className="flex items-center gap-1 justify-center">
      {[
        { n: t.h, label: "h"  },
        { n: t.m, label: "m"  },
        { n: t.s, label: "s"  },
      ].map(({ n, label }) => (
        <div key={label} className="flex items-baseline gap-0.5">
          <span className="font-black text-white tabular-nums text-lg leading-none">{pad(n)}</span>
          <span className="text-amber-400/50 text-[10px]">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function LiveBadge() {
  const [jornadas, setJornadas] = useState<JornadaViva[] | null>(null);

  useEffect(() => {
    fetch("/api/live")
      .then(r => r.json())
      .then((d: { jornadas?: JornadaViva[] }) => setJornadas(d.jornadas ?? []))
      .catch(() => setJornadas([]));
    // Re-chequear cada 60s para detectar partidos que arrancan
    const id = setInterval(() => {
      fetch("/api/live")
        .then(r => r.json())
        .then((d: { jornadas?: JornadaViva[] }) => setJornadas(d.jornadas ?? []))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Aun cargando
  if (jornadas === null) {
    return <div className="rounded-2xl h-[88px] animate-pulse bg-white/5" />;
  }

  // Sin jornadas activas
  if (jornadas.length === 0) return null;

  const todosLosPartidos = jornadas.flatMap(j => j.partidos);

  // Partidos en vivo ahora
  const enVivo = todosLosPartidos.filter(p => p.estado === "in");

  // Siguiente partido programado
  const proximos = todosLosPartidos
    .filter(p => p.estado === "pre")
    .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
  const proximo = proximos[0] ?? null;

  // Mostrar si hay algo en vivo O hay partidos próximos
  if (enVivo.length === 0 && proximos.length === 0) return null;

  // --- Estado 1: HAY PARTIDOS EN VIVO ---
  if (enVivo.length > 0) {
    return (
      <Link
        href="/en-vivo"
        className="block w-full rounded-2xl overflow-hidden relative group"
        style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)" }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 12px)", backgroundSize: "17px 17px" }}
        />
        <div className="relative px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-300 animate-pulse" />
            <span className="text-red-200 text-xs font-black uppercase tracking-widest">En Vivo — {enVivo.length} partido{enVivo.length > 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-2">
            {enVivo.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                {/* Local */}
                <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                  <span className="text-white text-sm font-bold truncate text-right">{p.local.nombre}</span>
                  {p.local.logo
                    ? <img src={p.local.logo} alt="" className="w-6 h-6 object-contain shrink-0" />
                    : <span className="w-6 h-6 rounded-full bg-red-900/50 shrink-0 flex items-center justify-center text-[8px] font-black text-red-200">{p.local.nombre.slice(0,2).toUpperCase()}</span>}
                </div>
                {/* Score */}
                <div className="flex items-center gap-1 shrink-0 min-w-[56px] justify-center">
                  {p.local.goles !== null && p.visita.goles !== null ? (
                    <span className="text-white font-black text-base tabular-nums">{p.local.goles} - {p.visita.goles}</span>
                  ) : (
                    <span className="text-red-300/60 text-sm font-bold">{p.reloj || "vs"}</span>
                  )}
                </div>
                {/* Visita */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {p.visita.logo
                    ? <img src={p.visita.logo} alt="" className="w-6 h-6 object-contain shrink-0" />
                    : <span className="w-6 h-6 rounded-full bg-red-900/50 shrink-0 flex items-center justify-center text-[8px] font-black text-red-200">{p.visita.nombre.slice(0,2).toUpperCase()}</span>}
                  <span className="text-white text-sm font-bold truncate">{p.visita.nombre}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-red-800/50 text-red-200 text-xs font-bold group-hover:gap-2.5 transition-all">
            <span>Ver en tiempo real</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>
      </Link>
    );
  }

  // --- Estado 2: HAY PARTIDO PRÓXIMO ---
  if (proximo) {
    const jornada = jornadas.find(j => j.partidos.some(p => p.id === proximo.id));

    // fechaHora es UTC real (con Z) — convertir siempre a hora México
    const TZ = "America/Mexico_City";
    const fechaD = new Date(proximo.fechaHora);
    const hora = fechaD.toLocaleTimeString("es-MX", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ,
    });
    // Comparar fecha en CDMX con hoy en CDMX
    const fechaISOStr = fechaD.toLocaleDateString("en-CA", { timeZone: TZ }); // "YYYY-MM-DD"
    const hoyISOStr   = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const esHoy = fechaISOStr === hoyISOStr;
    const fechaLabel = esHoy
      ? `Hoy a las ${hora}`
      : fechaD.toLocaleDateString("es-MX", {
          weekday: "short", day: "numeric", month: "short", timeZone: TZ,
        }) + ` · ${hora}`;

    return (
      <Link
        href="/en-vivo"
        className="block w-full rounded-2xl overflow-hidden relative group"
        style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="relative px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-xs font-black uppercase tracking-widest">
              {esHoy ? "Partidos hoy" : "Próximos partidos"}
            </span>
            {jornada && <span className="text-gray-600 text-[10px] font-semibold">{jornada.nombre}</span>}
          </div>

          {/* Partido principal con logos */}
          <div className="flex items-center gap-3">
            {proximo.local.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proximo.local.logo} alt={proximo.local.nombre} className="w-7 h-7 object-contain shrink-0" />
            )}
            <p className="text-gray-300 font-bold text-base leading-tight flex-1 text-center">
              {proximo.local.nombre} <span className="text-gray-600 font-light">vs</span> {proximo.visita.nombre}
            </p>
            {proximo.visita.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proximo.visita.logo} alt={proximo.visita.nombre} className="w-7 h-7 object-contain shrink-0" />
            )}
          </div>

          {proximos.length > 1 && (
            <p className="text-gray-600 text-xs mt-1 text-center">+{proximos.length - 1} partido{proximos.length > 2 ? "s" : ""} más</p>
          )}

          <div className="flex items-center justify-between mt-3">
            <p className="text-gray-600 text-xs"><span className="text-amber-400/70 font-bold">{fechaLabel}</span></p>
            {esHoy
              ? <Countdown fechaISO={proximo.fechaHora} />
              : <span className="text-gray-600 text-xs font-bold group-hover:text-gray-400 transition-colors">Ver →</span>
            }
          </div>
        </div>
      </Link>
    );
  }

  return null;
}
