"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

type PartidoVivo = {
  id: string;
  fechaHora: string;
  estado: string;
  reloj: string;
  local: { nombre: string };
  visita: { nombre: string };
};
type JornadaViva = { id: string; nombre: string; partidos: PartidoVivo[] };

function pad(n: number) { return String(n).padStart(2, "0"); }

function Countdown({ fechaISO }: { fechaISO: string }) {
  const calc = () => {
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
    const partido = enVivo[0];
    const jornada = jornadas.find(j => j.partidos.some(p => p.id === partido.id));
    return (
      <Link
        href="/en-vivo"
        className="block w-full rounded-2xl overflow-hidden relative group"
        style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)" }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 12px)", backgroundSize: "17px 17px" }}
        />
        <div className="relative px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300 animate-pulse" />
              <span className="text-red-200 text-xs font-black uppercase tracking-widest">En Vivo</span>
            </div>
            {jornada && <span className="text-red-300/60 text-[10px] font-semibold">{jornada.nombre}</span>}
          </div>

          <p className="text-white font-black text-lg leading-tight text-left">
            {partido.local.nombre} <span className="text-red-300/70 font-light">vs</span> {partido.visita.nombre}
          </p>
          {partido.reloj && (
            <p className="text-red-200/70 text-xs mt-0.5 text-left">{partido.reloj}</p>
          )}
          {enVivo.length > 1 && (
            <p className="text-red-300/60 text-xs mt-1 text-left">+{enVivo.length - 1} partido{enVivo.length > 2 ? "s" : ""} mas en vivo</p>
          )}

          <div className="flex items-center gap-1.5 mt-3 text-red-200 text-xs font-bold group-hover:gap-2.5 transition-all">
            <span>Ver resultados en tiempo real</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>
      </Link>
    );
  }

  // --- Estado 2: HAY PARTIDO PRÓXIMO ---
  if (proximo) {
    const jornada = jornadas.find(j => j.partidos.some(p => p.id === proximo.id));
    const esHoy = new Date(proximo.fechaHora).toDateString() === new Date().toDateString();
    const hora = new Date(proximo.fechaHora).toLocaleTimeString("es-MX", {
      hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
    });
    const fechaLabel = esHoy
      ? `Hoy a las ${hora}`
      : new Date(proximo.fechaHora).toLocaleDateString("es-MX", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
        });

    return (
      <div
        className="w-full rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="relative px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock size={11} className="text-gray-500" />
              <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Partidos hoy</span>
            </div>
            {jornada && <span className="text-gray-600 text-[10px] font-semibold">{jornada.nombre}</span>}
          </div>

          <p className="text-gray-300 font-bold text-base leading-tight text-left">
            {proximo.local.nombre} <span className="text-gray-600 font-light">vs</span> {proximo.visita.nombre}
          </p>
          {proximos.length > 1 && (
            <p className="text-gray-600 text-xs mt-0.5 text-left">+{proximos.length - 1} partido{proximos.length > 2 ? "s" : ""} mas</p>
          )}

          <div className="flex items-center justify-between mt-3">
            <p className="text-gray-600 text-xs"><span className="text-amber-400/70 font-bold">{fechaLabel}</span></p>
            {esHoy && <Countdown fechaISO={proximo.fechaHora} />}
          </div>

          <div className="mt-3 flex items-center gap-2 text-gray-600 text-xs">
            <Lock size={10} />
            <span>Se desbloquea cuando empiece el partido</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
