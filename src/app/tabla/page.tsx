"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

type Equipo = { id: number; nombre: string; nombreCorto: string; logo: string };
type FilaTabla = {
  posicion: number;
  equipo: Equipo;
  pj: number; g: number; e: number; p: number;
  gf: number; gc: number; dg: number; pts: number;
  zona: "positive" | "maybe" | "negative" | null;
  zonaLabel: string | null;
};
type Zona = { from: number; to: number; description: string; type: string };
type TablaData = {
  liga: string;
  zonas: Zona[];
  rows: FilaTabla[];
  actualizado: string;
};

// Color del indicador de posición según zona
const ZONA_DOT: Record<string, string> = {
  positive: "bg-green-400",
  maybe:    "bg-amber-400",
  negative: "bg-gray-600",
};
const ZONA_LEFT: Record<string, string> = {
  positive: "border-l-green-500",
  maybe:    "border-l-amber-500",
  negative: "border-l-transparent",
};
const ZONA_PTS: Record<string, string> = {
  positive: "text-green-400",
  maybe:    "text-amber-400",
  negative: "text-gray-400",
};

function LogoEquipo({ equipo }: { equipo: Equipo }) {
  const [error, setError] = useState(false);
  const initials = equipo.nombreCorto.slice(0, 2).toUpperCase();

  if (error) {
    return (
      <span className="w-7 h-7 rounded-full bg-gray-700 shrink-0 flex items-center justify-center text-[9px] font-black text-gray-300">
        {initials}
      </span>
    );
  }
  return (
    <img
      src={equipo.logo}
      alt={equipo.nombre}
      className="w-7 h-7 object-contain shrink-0"
      onError={() => setError(true)}
    />
  );
}

function FilaZona({ zona, desde, hasta }: { zona: Zona; desde: number; hasta: number }) {
  if (!zona.description) return null;
  const dot = ZONA_DOT[zona.type] ?? "bg-gray-600";
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/40">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
        {zona.description} <span className="text-gray-700">({desde}–{hasta})</span>
      </span>
    </div>
  );
}

export default function TablaPage() {
  const [data, setData] = useState<TablaData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/tabla");
      const d = await res.json() as TablaData & { error?: string };
      if (d.error) throw new Error(d.error);
      setData(d);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Agrupar filas por zona para insertar separadores
  const grupos: { zona: Zona | null; filas: FilaTabla[] }[] = [];
  if (data) {
    let zonaActual: Zona | null = null;
    let grupo: FilaTabla[] = [];
    for (const fila of data.rows) {
      const zona = data.zonas.find(z => fila.posicion >= z.from && fila.posicion <= z.to) ?? null;
      const zonaKey = zona?.type ?? null;
      const prevKey = zonaActual?.type ?? null;
      if (zonaKey !== prevKey) {
        if (grupo.length > 0) grupos.push({ zona: zonaActual, filas: grupo });
        zonaActual = zona;
        grupo = [];
      }
      grupo.push(fila);
    }
    if (grupo.length > 0) grupos.push({ zona: zonaActual, filas: grupo });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-white/5">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-black text-base leading-none">Tabla</h1>
              {data && (
                <p className="text-amber-400/70 text-[10px] font-semibold leading-none mt-0.5">
                  {data.liga}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={cargar}
            className={`text-gray-400 hover:text-white ${cargando ? "animate-spin" : ""}`}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3 mb-4">
            No se pudo cargar la tabla. Intenta de nuevo.
          </div>
        )}

        {/* Skeleton */}
        {cargando && !data && (
          <div className="space-y-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Tabla */}
        {data && (
          <div className="rounded-2xl overflow-hidden border border-white/5">

            {/* Encabezado columnas */}
            <div className="grid grid-cols-[28px_1fr_32px_32px_32px_32px_36px] gap-x-1 px-3 py-2 bg-gray-900 border-b border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <span>#</span>
              <span>Equipo</span>
              <span className="text-center">PJ</span>
              <span className="text-center">G</span>
              <span className="text-center">E</span>
              <span className="text-center">P</span>
              <span className="text-center font-black text-gray-400">Pts</span>
            </div>

            {/* Filas agrupadas por zona */}
            {grupos.map(({ zona, filas }, gi) => (
              <div key={gi}>
                {/* Separador de zona */}
                {zona && (
                  <FilaZona
                    zona={zona}
                    desde={filas[0].posicion}
                    hasta={filas[filas.length - 1].posicion}
                  />
                )}

                {filas.map((fila, fi) => {
                  const leftColor = ZONA_LEFT[fila.zona ?? ""] ?? "border-l-transparent";
                  const ptsColor  = ZONA_PTS[fila.zona ?? ""]  ?? "text-white";
                  return (
                    <div
                      key={fila.posicion}
                      className={`grid grid-cols-[28px_1fr_32px_32px_32px_32px_36px] gap-x-1 items-center px-3 py-2.5 border-l-2 ${leftColor} ${fi > 0 || gi > 0 ? "border-t border-white/[0.04]" : ""} hover:bg-white/[0.03] transition-colors`}
                    >
                      {/* Posición */}
                      <span className={`text-xs font-black tabular-nums ${
                        fila.posicion <= 3 ? "text-white" : "text-gray-500"
                      }`}>
                        {fila.posicion}
                      </span>

                      {/* Equipo */}
                      <div className="flex items-center gap-2 min-w-0">
                        <LogoEquipo equipo={fila.equipo} />
                        <div className="min-w-0">
                          <p className="text-white text-xs font-bold truncate leading-tight">
                            {fila.equipo.nombreCorto}
                          </p>
                          <p className={`text-[9px] tabular-nums ${
                            fila.dg > 0 ? "text-green-500/70" : fila.dg < 0 ? "text-red-500/70" : "text-gray-600"
                          }`}>
                            {fila.dg > 0 ? "+" : ""}{fila.dg} DG
                          </p>
                        </div>
                      </div>

                      {/* PJ */}
                      <span className="text-center text-gray-400 text-xs tabular-nums">{fila.pj}</span>
                      {/* G */}
                      <span className="text-center text-gray-400 text-xs tabular-nums">{fila.g}</span>
                      {/* E */}
                      <span className="text-center text-gray-400 text-xs tabular-nums">{fila.e}</span>
                      {/* P */}
                      <span className="text-center text-gray-400 text-xs tabular-nums">{fila.p}</span>
                      {/* Pts */}
                      <span className={`text-center text-sm font-black tabular-nums ${ptsColor}`}>
                        {fila.pts}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Leyenda zonas */}
        {data?.zonas && data.zonas.filter(z => z.description).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 px-1">
            {data.zonas.filter(z => z.description).map((z, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${ZONA_DOT[z.type] ?? "bg-gray-600"}`} />
                <span className="text-[10px] text-gray-500">{z.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fuente y actualización */}
        {data && (
          <p className="text-center text-gray-700 text-[10px] mt-4 pb-4">
            Datos: SofaScore · {new Date(data.actualizado).toLocaleTimeString("es-MX", {
              hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
