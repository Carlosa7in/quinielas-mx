"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Equipo = {
  id: string; nombre: string; abrev: string; logo: string;
  pj: number; g: number; e: number; p: number;
  gf: number; gc: number; dg: number; pts: number;
};

type Zona = { limite: number; label: string; color: string };

type Datos = {
  tabla: Equipo[];
  nombre: string;
  temporada: string;
  zonas: Zona[];
};

const LIGAS = [
  { id: "mx",        label: "🇲🇽 Liga MX"   },
  { id: "champions", label: "⭐ Champions"   },
];

function zonaDePos(pos: number, zonas: Zona[]): Zona {
  return zonas.find((z) => pos <= z.limite) ?? zonas[zonas.length - 1];
}

function colorClase(color: string, elemento: "fila" | "pos" | "pts"): string {
  const map: Record<string, Record<string, string>> = {
    green:  { fila: "bg-green-50",  pos: "text-green-700",  pts: "text-green-700"  },
    yellow: { fila: "bg-yellow-50", pos: "text-yellow-600", pts: "text-yellow-600" },
    gray:   { fila: "bg-red-50",     pos: "text-red-400",    pts: "text-red-500"    },
  };
  return map[color]?.[elemento] ?? "";
}

function CrucesMX({ tabla }: { tabla: Equipo[] }) {
  const top = tabla.slice(0, 8);
  if (top.length < 8 || tabla[0].pj < 17) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="bg-yellow-400 px-4 py-2">
        <p className="font-bold text-yellow-900 text-sm">🏆 Cruces de Liguilla</p>
      </div>
      <div className="divide-y divide-gray-50">
        {[0, 1, 2, 3].map((i) => {
          const a = top[i], b = top[7 - i];
          return (
            <div key={i} className="flex items-center px-4 py-2.5 gap-2">
              <span className="text-xs text-gray-400 w-5">{i + 1}°</span>
              <div className="flex items-center gap-1.5 flex-1">
                {a.logo && <img src={a.logo} className="w-5 h-5 object-contain" alt={a.abrev} />}
                <span className="text-sm font-semibold text-gray-800 truncate">{a.nombre}</span>
              </div>
              <span className="text-xs text-gray-400 font-bold shrink-0">vs</span>
              <div className="flex items-center gap-1.5 flex-1 justify-end">
                <span className="text-sm font-semibold text-gray-800 truncate text-right">{b.nombre}</span>
                {b.logo && <img src={b.logo} className="w-5 h-5 object-contain" alt={b.abrev} />}
              </div>
              <span className="text-xs text-gray-400 w-5 text-right">{8 - i}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TablaEquipos({ datos, expandido, setExpandido }: {
  datos: Datos;
  expandido: string | null;
  setExpandido: (id: string | null) => void;
}) {
  const { tabla, zonas } = datos;
  const limites = zonas.map((z) => z.limite);

  return (
    <>
      {/* Leyenda */}
      <div className="flex gap-3 text-xs flex-wrap">
        {zonas.map((z) => (
          <span key={z.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm inline-block ${
              z.color === "green" ? "bg-green-500" : z.color === "yellow" ? "bg-yellow-400" : "bg-red-300"
            }`} />
            {z.label}
          </span>
        ))}
        <span className="ml-auto text-gray-400 hidden sm:block">Toca para ver detalle</span>
      </div>

      {/* Cabecera */}
      <div
        className="bg-green-800 text-white rounded-t-xl px-3 py-2 grid text-xs font-bold"
        style={{ gridTemplateColumns: "28px 1fr 30px 26px 26px 26px 26px 26px 32px" }}
      >
        <span className="text-center">#</span>
        <span>Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">G</span>
        <span className="text-center">E</span>
        <span className="text-center">P</span>
        <span className="text-center">GF</span>
        <span className="text-center">GC</span>
        <span className="text-center font-black">Pts</span>
      </div>

      {/* Filas */}
      <div className="rounded-b-xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-100">
        {tabla.map((eq, i) => {
          const pos = i + 1;
          const zona = zonaDePos(pos, zonas);
          const esBorde = limites.includes(pos);
          const isExpanded = expandido === eq.id;

          return (
            <div key={eq.id}>
              <button
                onClick={() => setExpandido(isExpanded ? null : eq.id)}
                className={`w-full text-left grid items-center px-3 py-2.5 transition-colors hover:brightness-95 ${colorClase(zona.color, "fila")} ${esBorde ? "border-b-2 border-dashed border-gray-400" : ""}`}
                style={{ gridTemplateColumns: "28px 1fr 30px 26px 26px 26px 26px 26px 32px" }}
              >
                <span className={`text-center text-sm font-black ${pos === 1 ? "text-yellow-600" : colorClase(zona.color, "pos")}`}>
                  {pos}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  {eq.logo
                    ? <img src={eq.logo} alt={eq.abrev} className="w-6 h-6 object-contain shrink-0" />
                    : <div className="w-6 h-6 bg-gray-200 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-gray-500">{eq.abrev[0]}</div>
                  }
                  <span className="text-sm font-semibold text-gray-800 truncate">{eq.nombre}</span>
                </div>
                <span className="text-center text-xs text-gray-500">{eq.pj}</span>
                <span className="text-center text-xs text-green-700 font-medium">{eq.g}</span>
                <span className="text-center text-xs text-gray-500">{eq.e}</span>
                <span className="text-center text-xs text-red-500 font-medium">{eq.p}</span>
                <span className="text-center text-xs text-gray-500">{eq.gf}</span>
                <span className="text-center text-xs text-gray-500">{eq.gc}</span>
                <span className={`text-center text-sm font-black ${colorClase(zona.color, "pts")}`}>{eq.pts}</span>
              </button>

              {isExpanded && (
                <div className={`px-4 py-3 text-sm space-y-2 ${colorClase(zona.color, "fila")}`}>
                  <div className="flex items-center gap-3">
                    {eq.logo && <img src={eq.logo} alt={eq.nombre} className="w-10 h-10 object-contain" />}
                    <div>
                      <p className="font-bold text-gray-800">{eq.nombre}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        zona.color === "green" ? "bg-green-100 text-green-700" :
                        zona.color === "yellow" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-500"
                      }`}>{zona.label}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { val: eq.g,  label: "Victorias", color: "text-green-700"  },
                      { val: eq.e,  label: "Empates",   color: "text-yellow-600" },
                      { val: eq.p,  label: "Derrotas",  color: "text-red-500"    },
                      { val: eq.dg, label: "Dif. goles",color: eq.dg >= 0 ? "text-green-700" : "text-red-500", prefix: eq.dg > 0 ? "+" : "" },
                    ].map(({ val, label, color, prefix = "" }) => (
                      <div key={label} className="bg-white rounded-lg p-2 shadow-sm">
                        <p className={`text-lg font-bold ${color}`}>{prefix}{val}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center">{eq.gf} goles a favor · {eq.gc} en contra</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function ClasificacionPage() {
  const [ligaActiva, setLigaActiva] = useState("mx");
  const [cache, setCache] = useState<Record<string, Datos>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    if (cache[ligaActiva]) return;
    setCargando(true); setError(""); setExpandido(null);
    fetch(`/api/clasificacion?liga=${ligaActiva}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setCache((prev) => ({ ...prev, [ligaActiva]: data }));
      })
      .catch(() => setError("Error al cargar"))
      .finally(() => setCargando(false));
  }, [ligaActiva, cache]);

  const datos = cache[ligaActiva];

  const NOTA: Record<string, { title: string; text: string; sub?: string }> = {
    mx: {
      title: "📋 Clausura 2026 — Formato especial",
      text: "Sin Play-In. Los primeros 8 equipos clasifican directamente a Liguilla (Cuartos de Final).",
      sub: "Cuartos: 1° vs 8° · 2° vs 7° · 3° vs 6° · 4° vs 5°",
    },
    champions: {
      title: "📋 Champions League — Liga Phase",
      text: "36 equipos juegan 8 partidos. Top 8 pasan directo a Octavos. Del 9° al 24° juegan un Playoff. Del 25° al 36° quedan eliminados.",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-amber-950 text-white py-5 px-4">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="text-amber-400 text-sm mb-2 inline-block">← Inicio</Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", marginBottom: "4px" }} />
          <h1 className="text-2xl font-bold">Clasificación</h1>
          <p className="text-amber-300/70 text-sm">{datos?.temporada || "Cargando..."}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Tabs de liga */}
        <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
          {LIGAS.map((l) => (
            <button
              key={l.id}
              onClick={() => { setLigaActiva(l.id); setExpandido(null); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                ligaActiva === l.id ? "bg-amber-700 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {cargando && (
          <div className="text-center py-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" className="mx-auto mb-3 animate-pulse" style={{ height: "80px", objectFit: "contain" }} />
            <p className="text-gray-400 text-sm">Cargando clasificación...</p>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 rounded-xl p-4 text-center text-sm">{error}</div>}

        {datos && !cargando && (
          <>
            <TablaEquipos datos={datos} expandido={expandido} setExpandido={setExpandido} />

            {/* Cruces Liguilla (solo Liga MX) */}
            {ligaActiva === "mx" && <CrucesMX tabla={datos.tabla} />}

            {/* Nota de formato */}
            {NOTA[ligaActiva] && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 space-y-1">
                <p className="font-bold">{NOTA[ligaActiva].title}</p>
                <p>{NOTA[ligaActiva].text}</p>
                {NOTA[ligaActiva].sub && <p className="text-xs text-blue-500">{NOTA[ligaActiva].sub}</p>}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center pb-4">
              Datos en tiempo real · ESPN · Actualización cada 5 min
            </p>
          </>
        )}
      </div>
    </div>
  );
}
