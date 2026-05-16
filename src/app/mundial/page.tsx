"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, CalendarDays, Shield, MapPin } from "lucide-react";
import { SEDES, EQUIPOS_DESTACADOS, MUNDIAL_FECHAS, FORMATO, type EquipoDestacado } from "@/lib/mundial2026";

/* --- Countdown ----------------------------------------------------------- */
function useCuentaRegresiva() {
  const target = new Date(MUNDIAL_FECHAS.inicio).getTime();
  const calc = () => {
    const diff = target - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { d, h, m, s };
  };
  const [t, setT] = useState(calc);
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id); });
  return t;
}

/* --- Types --------------------------------------------------------------- */
type Equipo = { id: string; nombre: string; abrev: string; logo: string; pts: number; pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; dif: number };
type Grupo  = { nombre: string; equipos: Equipo[] };
type Partido = {
  id: string; fecha: string; estado: string; completado: boolean;
  local: { nombre: string; abrev: string; logo: string; goles: string | null };
  visita: { nombre: string; abrev: string; logo: string; goles: string | null };
};

const pad = (n: number) => String(n).padStart(2, "0");

/* --- Small components ---------------------------------------------------- */
function FlagImg({ src, alt, size = 28 }: { src: string; alt: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <span className="text-2xl">{alt.slice(0, 2)}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} onError={() => setErr(true)} style={{ width: size, height: size, objectFit: "contain" }} />;
}

function CountdownBox({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 rounded-xl px-3 py-2 min-w-[52px] text-center">
        <span className="text-3xl font-black tabular-nums">{pad(n)}</span>
      </div>
      <span className="text-[10px] text-amber-300/70 mt-1 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function TeamCard({ eq }: { eq: EquipoDestacado }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${eq.color} text-white text-left`}
      >
        <span className="text-3xl leading-none">{eq.bandera}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-lg leading-tight">{eq.pais}</p>
          <p className="text-xs text-white/60">DT: {eq.dt} · {eq.confederation}</p>
        </div>
        {eq.mundiales > 0 && (
          <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full shrink-0">
            🏆 ×{eq.mundiales}
          </span>
        )}
        <span className="text-white/40 ml-1 shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="bg-gray-900 px-4 py-3 space-y-2">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Jugadores clave</p>
          {eq.jugadores.slice(0, 4).map((j) => (
            <div key={j.nombre} className="flex items-center justify-between text-sm">
              <span className="text-white font-semibold">{j.nombre}</span>
              <span className="text-gray-400 text-xs">{j.posicion} · {j.club}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-amber-300/70 italic mb-3">💡 {eq.curiosidad}</p>
            <Link
              href={`/mundial/equipo/${eq.slug}`}
              className="flex items-center justify-center gap-2 w-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-sm py-2.5 rounded-xl transition-colors"
            >
              <Shield size={14} />
              Ver todo sobre {eq.pais}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function GrupoTable({ grupo }: { grupo: Grupo }) {
  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-amber-700/30 px-3 py-2">
        <p className="text-xs font-black text-amber-400 uppercase tracking-widest">{grupo.nombre}</p>
      </div>
      <div className="divide-y divide-white/5">
        {grupo.equipos.map((eq, i) => (
          <div key={eq.id} className="flex items-center gap-2 px-3 py-2">
            <span className={`text-xs font-bold w-4 ${i < 2 ? "text-green-400" : "text-gray-500"}`}>{i + 1}</span>
            <FlagImg src={eq.logo} alt={eq.abrev} size={20} />
            <span className="flex-1 text-white text-xs font-semibold truncate">{eq.nombre}</span>
            <div className="flex gap-2 text-[10px] text-gray-400 tabular-nums">
              <span className="w-4 text-center">{eq.pj}</span>
              <span className="w-4 text-center">{eq.pg}</span>
              <span className="w-4 text-center">{eq.pe}</span>
              <span className="w-4 text-center">{eq.pp}</span>
              <span className="w-6 text-center text-white font-bold">{eq.pts}</span>
            </div>
          </div>
        ))}
        <div className="flex gap-2 px-3 py-1 bg-white/3">
          <span className="w-4" />
          <span className="flex-1" />
          <div className="flex gap-2 text-[9px] text-gray-600 tabular-nums">
            <span className="w-4 text-center">PJ</span>
            <span className="w-4 text-center">G</span>
            <span className="w-4 text-center">E</span>
            <span className="w-4 text-center">P</span>
            <span className="w-6 text-center">Pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Page ---------------------------------------------------------------- */
export default function MundialPage() {
  const cuenta = useCuentaRegresiva();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"grupos" | "sedes" | "equipos" | "partidos">("grupos");

  useEffect(() => {
    fetch("/api/mundial")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.grupos)) setGrupos(d.grupos);
        if (Array.isArray(d.partidos)) setPartidos(d.partidos);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const sedePorPais = (pais: string) => SEDES.filter(s => s.pais === pais);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* -- HERO -- */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" }}>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
          backgroundSize: "20px 20px"
        }} />
        <div className="relative max-w-xl mx-auto px-4 pt-10 pb-8 text-center">
          <Link href="/" className="inline-block text-amber-400 text-sm mb-4">← Volver al inicio</Link>

          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-4xl">🇺🇸</span>
            <span className="text-4xl">🇲🇽</span>
            <span className="text-4xl">🇨🇦</span>
          </div>

          <div className="inline-block bg-amber-500 text-gray-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            FIFA World Cup 2026™
          </div>

          <h1 className="text-4xl font-black leading-tight mb-2" style={{ textShadow: "0 2px 20px rgba(251,191,36,0.3)" }}>
            El Mundial<br />
            <span className="text-amber-400">más grande</span><br />
            de la historia
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            48 selecciones · 3 países anfitriones · 16 estadios<br />
            11 de junio – 19 de julio de 2026
          </p>

          {/* Countdown */}
          {cuenta ? (
            <div className="mb-6">
              <p className="text-xs text-amber-300/60 uppercase tracking-widest mb-3">Faltan para el primer partido</p>
              <div className="flex items-center justify-center gap-3">
                <CountdownBox n={cuenta.d} label="días" />
                <span className="text-white/30 text-2xl font-thin">:</span>
                <CountdownBox n={cuenta.h} label="hrs" />
                <span className="text-white/30 text-2xl font-thin">:</span>
                <CountdownBox n={cuenta.m} label="min" />
                <span className="text-white/30 text-2xl font-thin">:</span>
                <CountdownBox n={cuenta.s} label="seg" />
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-green-500/20 border border-green-500/30 rounded-xl py-3">
              <p className="text-green-400 font-bold">🏆 El Mundial está en curso</p>
            </div>
          )}

          {/* CTA */}
          <Link
            href="/quiniela"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-lg px-8 py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-400/40 hover:scale-105"
          >
            ⚽ Hacer mi quiniela
          </Link>
          <p className="text-gray-500 text-xs mt-3">Quinielas disponibles para grupos y eliminación directa</p>
        </div>
      </div>

      {/* -- TABS -- */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-xl mx-auto flex overflow-x-auto">
          {([
            { key: "grupos",   label: "Grupos",   icon: <LayoutGrid  size={16} /> },
            { key: "partidos", label: "Partidos", icon: <CalendarDays size={16} /> },
            { key: "equipos",  label: "Equipos",  icon: <Shield       size={16} /> },
            { key: "sedes",    label: "Sedes",    icon: <MapPin       size={16} /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 whitespace-nowrap flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === key
                  ? "border-amber-500 text-amber-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* -- GRUPOS -- */}
        {tab === "grupos" && (
          <>
            {/* Formato visual */}
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">El nuevo formato</p>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-white/5 rounded-xl p-2">
                  <p className="text-2xl font-black text-amber-400">{FORMATO.equipos}</p>
                  <p className="text-[10px] text-gray-400">Selecciones</p>
                </div>
                <div className="bg-white/5 rounded-xl p-2">
                  <p className="text-2xl font-black text-amber-400">{FORMATO.grupos}</p>
                  <p className="text-[10px] text-gray-400">Grupos</p>
                </div>
                <div className="bg-white/5 rounded-xl p-2">
                  <p className="text-2xl font-black text-amber-400">104</p>
                  <p className="text-[10px] text-gray-400">Partidos</p>
                </div>
              </div>
              <div className="flex gap-1 items-center text-xs text-gray-400">
                <span className="bg-green-500/20 text-green-400 rounded px-1.5 py-0.5 font-bold">1º</span>
                <span className="bg-green-500/20 text-green-400 rounded px-1.5 py-0.5 font-bold">2º</span>
                <span className="text-gray-600 mx-1">+</span>
                <span className="text-gray-300 font-semibold">8 mejores 3eros</span>
                <span className="text-gray-600 mx-1">→</span>
                <span className="text-amber-400 font-semibold">Ronda de 32</span>
              </div>
            </div>

            {cargando ? (
              <div className="text-center py-10 text-gray-500 animate-pulse">Cargando grupos desde ESPN…</div>
            ) : grupos.length > 0 ? (
              <div className="space-y-3">
                {grupos.map(g => <GrupoTable key={g.nombre} grupo={g} />)}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-3">
                <p className="text-4xl">📋</p>
                <p className="text-gray-300 font-semibold">Grupos en preparación</p>
                <p className="text-gray-500 text-sm">
                  Las posiciones se mostrarán aquí en tiempo real una vez que arranque la fase de grupos el 11 de junio.
                </p>
                <a
                  href="https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026/groups"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-amber-400 text-sm underline"
                >
                  Ver grupos en FIFA.com →
                </a>
              </div>
            )}
          </>
        )}

        {/* -- PARTIDOS -- */}
        {tab === "partidos" && (
          <>
            {cargando ? (
              <div className="text-center py-10 text-gray-500 animate-pulse">Cargando partidos…</div>
            ) : partidos.length > 0 ? (
              <div className="space-y-2">
                {partidos.map(p => {
                  const fecha = new Date(p.fecha);
                  return (
                    <div key={p.id} className="bg-gray-900 rounded-2xl px-4 py-3">
                      <p className="text-[10px] text-gray-500 mb-2 text-center">
                        {fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Mexico_City" })}
                        {" · "}
                        {fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" })}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                          <span className="text-white text-sm font-bold truncate text-right">{p.local.abrev}</span>
                          <FlagImg src={p.local.logo} alt={p.local.abrev} size={24} />
                        </div>
                        <div className="shrink-0 text-center w-16">
                          {p.completado ? (
                            <p className="font-black text-xl text-white">{p.local.goles} – {p.visita.goles}</p>
                          ) : (
                            <p className="text-gray-500 font-bold text-sm">{p.estado || "vs"}</p>
                          )}
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <FlagImg src={p.visita.logo} alt={p.visita.abrev} size={24} />
                          <span className="text-white text-sm font-bold truncate">{p.visita.abrev}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-3">
                <p className="text-4xl">📅</p>
                <p className="text-gray-300 font-semibold">El fixture está por anunciarse</p>
                <p className="text-gray-500 text-sm">Los partidos aparecerán aquí en cuanto FIFA publique el calendario completo.</p>
                <a
                  href="https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026/schedule-results"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-amber-400 text-sm underline"
                >
                  Ver calendario en FIFA.com →
                </a>
              </div>
            )}
          </>
        )}

        {/* -- EQUIPOS -- */}
        {tab === "equipos" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 px-1">Toca un equipo para ver sus jugadores clave</p>
            {EQUIPOS_DESTACADOS.map(eq => (
              <TeamCard key={eq.pais} eq={eq} />
            ))}
            <div className="bg-gray-900 rounded-2xl p-4 text-center">
              <p className="text-gray-500 text-sm">
                Los 48 clasificados aparecerán en la sección de <button onClick={() => setTab("grupos")} className="text-amber-400 underline">Grupos</button> una vez que empiece el torneo.
              </p>
            </div>
          </div>
        )}

        {/* -- SEDES -- */}
        {tab === "sedes" && (
          <div className="space-y-4">
            {(["México", "USA", "Canadá"] as const).map(pais => (
              <div key={pais}>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider px-1 mb-2">
                  {pais === "México" ? "🇲🇽" : pais === "USA" ? "🇺🇸" : "🇨🇦"} {pais}
                </p>
                <div className="space-y-2">
                  {sedePorPais(pais).map(s => (
                    <div key={s.ciudad} className="bg-gray-900 rounded-2xl px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white">{s.ciudad}</p>
                          {s.nota && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              s.nota.includes("FINAL") ? "bg-amber-500 text-gray-950" : "bg-blue-500/20 text-blue-300"
                            }`}>
                              {s.nota}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mt-0.5">{s.estadio}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-amber-400 font-bold text-sm">{s.capacidad.toLocaleString("es-MX")}</p>
                        <p className="text-gray-600 text-[10px]">cap.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* -- CTA BOTTOM -- */}
        <div className="rounded-2xl overflow-hidden mt-4" style={{ background: "linear-gradient(135deg, #92400e, #78350f)" }}>
          <div className="px-5 py-6 text-center space-y-3">
            <p className="text-amber-300 font-black text-xl">¿Listo para el Mundial?</p>
            <p className="text-amber-100/70 text-sm">
              Regístrate en Tablitas y participa en las quinielas de grupos y eliminación directa
            </p>
            <Link
              href="/quiniela"
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black px-8 py-3 rounded-xl transition-colors text-lg"
            >
              ⚽ Quiero jugar
            </Link>
            <p className="text-amber-300/50 text-xs">$30 pesos · Fácil desde tu celular</p>
          </div>
        </div>

      </div>
    </div>
  );
}
