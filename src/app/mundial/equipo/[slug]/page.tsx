"use client";
import { use, useState } from "react";
import Link from "next/link";
import { EQUIPOS_DESTACADOS } from "@/lib/mundial2026";
import { ArrowLeft, Trophy, Users, Star, MapPin, ChevronDown, ChevronUp } from "lucide-react";

const POSICION_ORDEN: Record<string, number> = {
  "Portero": 1,
  "Lateral Der.": 2, "Lateral Izq.": 2, "Defensa Central": 2,
  "Pivote": 3, "Mediocampista": 3, "Mediocampista D.": 3, "Mediocampista O.": 3,
  "Extremo Der.": 4, "Extremo Izq.": 4, "Extremo": 4,
  "Delantero": 5,
};

const POSICION_COLOR: Record<string, string> = {
  "Portero":        "bg-yellow-500/20 text-yellow-300",
  "Defensa Central":"bg-blue-500/20 text-blue-300",
  "Lateral Der.":   "bg-blue-400/20 text-blue-200",
  "Lateral Izq.":   "bg-blue-400/20 text-blue-200",
  "Pivote":         "bg-green-500/20 text-green-300",
  "Mediocampista":  "bg-green-400/20 text-green-200",
  "Extremo":        "bg-orange-500/20 text-orange-300",
  "Extremo Der.":   "bg-orange-400/20 text-orange-200",
  "Extremo Izq.":   "bg-orange-400/20 text-orange-200",
  "Delantero":      "bg-red-500/20 text-red-300",
};

export default function EquipoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const equipo = EQUIPOS_DESTACADOS.find(e => e.slug === slug);
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  if (!equipo) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white px-4">
        <p className="text-5xl">🤔</p>
        <p className="text-xl font-bold">Equipo no encontrado</p>
        <Link href="/mundial" className="text-amber-400 underline">← Volver al Mundial</Link>
      </div>
    );
  }

  const jugadoresOrdenados = [...equipo.jugadores].sort((a, b) => {
    const oa = POSICION_ORDEN[a.posicion] ?? 9;
    const ob = POSICION_ORDEN[b.posicion] ?? 9;
    return oa - ob || (a.dorsal ?? 99) - (b.dorsal ?? 99);
  });

  const jugadoresMostrados = showAllPlayers ? jugadoresOrdenados : jugadoresOrdenados.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* -- HERO -- */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${equipo.colorHex}cc 0%, #0f172a 60%)` }}
      >
        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "repeating-linear-gradient(60deg, #fff 0, #fff 1px, transparent 0, transparent 20px)",
          backgroundSize: "23px 40px",
        }} />

        <div className="relative max-w-xl mx-auto px-4 pt-6 pb-8">
          <Link href="/mundial?tab=equipos" className="inline-flex items-center gap-1.5 text-amber-400 text-sm mb-5">
            <ArrowLeft size={15} />
            Todos los equipos
          </Link>

          <div className="flex items-start gap-4">
            <span className="text-7xl leading-none">{equipo.bandera}</span>
            <div className="flex-1 min-w-0">
              {equipo.esAnfitrion && (
                <span className="inline-block bg-amber-500 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest mb-2">
                  🏠 Anfitrión
                </span>
              )}
              <h1 className="text-3xl font-black leading-tight">{equipo.pais}</h1>
              <p className="text-gray-400 text-sm mt-1">{equipo.confederation}</p>
              {equipo.rankingFIFA && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-amber-400 text-sm font-bold">#{equipo.rankingFIFA} FIFA</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-white/8 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-400">{equipo.mundiales}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Títulos</p>
            </div>
            <div className="bg-white/8 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-400">{equipo.apariciones}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Mundiales</p>
            </div>
            <div className="bg-white/8 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-amber-400 leading-tight">{equipo.mejorResultado.split("(")[0].trim()}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Mejor resultado</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">

        {/* -- DT -- */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-amber-400" />
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Director Técnico</p>
          </div>
          <p className="text-white font-black text-xl">{equipo.dt}</p>
          {equipo.dtNacionalidad && (
            <p className="text-gray-400 text-sm">{equipo.dtNacionalidad}</p>
          )}
        </div>

        {/* -- JUGADORES -- */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <Users size={14} className="text-amber-400" />
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Jugadores clave</p>
          </div>

          <div className="divide-y divide-white/5">
            {jugadoresMostrados.map((j) => (
              <div key={j.nombre} className="flex items-center gap-3 px-4 py-3">
                {j.dorsal !== undefined && (
                  <span className="text-xs text-gray-600 font-bold w-5 text-center shrink-0">{j.dorsal}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{j.nombre}</p>
                  <p className="text-gray-500 text-xs truncate">{j.club}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {j.edad !== undefined && (
                    <span className="text-gray-600 text-xs">{j.edad} años</span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    POSICION_COLOR[j.posicion] ?? "bg-gray-700 text-gray-300"
                  }`}>
                    {j.posicion}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {equipo.jugadores.length > 5 && (
            <button
              onClick={() => setShowAllPlayers(!showAllPlayers)}
              className="w-full flex items-center justify-center gap-2 py-3 text-amber-400 text-sm font-semibold border-t border-white/5 hover:bg-white/5 transition-colors"
            >
              {showAllPlayers ? (
                <><ChevronUp size={16} /> Ver menos</>
              ) : (
                <><ChevronDown size={16} /> Ver los {equipo.jugadores.length - 5} restantes</>
              )}
            </button>
          )}
        </div>

        {/* -- HISTORIA -- */}
        <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-400" />
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Historia</p>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{equipo.historia}</p>
        </div>

        {/* -- CURIOSIDAD -- */}
        <div className="bg-amber-900/30 border border-amber-700/30 rounded-2xl p-4">
          <p className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">💡 Dato curioso</p>
          <p className="text-amber-100 text-sm leading-relaxed">{equipo.curiosidad}</p>
        </div>

        {/* -- TÍTULOS -- */}
        {equipo.titulos.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-amber-400" />
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {equipo.titulos.length} {equipo.titulos.length === 1 ? "Título Mundial" : "Títulos Mundiales"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {equipo.titulos.map(t => (
                <span key={t} className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                  🏆 {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* -- CTA -- */}
        <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${equipo.colorHex}99, #78350f)` }}>
          <div className="px-5 py-5 text-center space-y-3">
            <p className="text-white font-black text-lg">
              ¿Crees que {equipo.pais} llegará lejos?
            </p>
            <p className="text-white/60 text-sm">Apuesta en la quiniela del Mundial</p>
            <Link
              href="/quiniela"
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black px-7 py-3 rounded-xl transition-colors"
            >
              ⚽ Hacer mi quiniela
            </Link>
          </div>
        </div>

        {/* -- NAVEGACIÓN ENTRE EQUIPOS -- */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mb-3">Otros equipos</p>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPOS_DESTACADOS.filter(e => e.slug !== slug).slice(0, 6).map(e => (
              <Link
                key={e.slug}
                href={`/mundial/equipo/${e.slug}`}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl px-3 py-2.5 flex items-center gap-2 transition-colors"
              >
                <span className="text-2xl">{e.bandera}</span>
                <span className="text-white text-sm font-semibold truncate">{e.pais}</span>
              </Link>
            ))}
          </div>
          <Link href="/mundial" className="flex items-center justify-center gap-2 mt-3 text-amber-400 text-sm">
            <MapPin size={13} />
            Ver todos en la página del Mundial
          </Link>
        </div>

      </div>
    </div>
  );
}
