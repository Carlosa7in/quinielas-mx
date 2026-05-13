"use client";
import { useState } from "react";
import { EQUIPOS_POR_LIGA, LIGA_ICON, getLogoUrl } from "@/lib/equipos";

export default function LogosCheckPage() {
  const [ligaActiva, setLigaActiva] = useState(Object.keys(EQUIPOS_POR_LIGA)[0]);
  const [rotos, setRotos] = useState<Set<string>>(new Set());

  const ligas = Object.keys(EQUIPOS_POR_LIGA);
  const equipos = EQUIPOS_POR_LIGA[ligaActiva] ?? [];

  const marcarRoto = (nombre: string) =>
    setRotos((prev) => new Set([...prev, nombre]));

  const totalRotos = equipos.filter((e) => rotos.has(e)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <a href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</a>
          <h1 className="text-lg font-bold">Revisión de Logos</h1>
          {totalRotos > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
              {totalRotos} roto{totalRotos !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Tabs de ligas */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="max-w-3xl mx-auto flex gap-1 px-4 py-2">
          {ligas.map((liga) => {
            const equiposLiga = EQUIPOS_POR_LIGA[liga] ?? [];
            const rotosLiga = equiposLiga.filter((e) => rotos.has(e)).length;
            return (
              <button
                key={liga}
                onClick={() => setLigaActiva(liga)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  ligaActiva === liga
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span>{LIGA_ICON[liga] ?? "⚽"}</span>
                <span className="hidden sm:inline">{liga}</span>
                {rotosLiga > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {rotosLiga}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de equipos */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-xs text-gray-400 mb-4">
          {LIGA_ICON[ligaActiva]} <strong>{ligaActiva}</strong> — {equipos.length} equipos.
          Los logos rotos aparecen en rojo.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {equipos.map((nombre) => {
            const url = getLogoUrl(nombre);
            const estaRoto = rotos.has(nombre);
            const sinUrl = !url;

            return (
              <div
                key={nombre}
                className={`bg-white rounded-xl p-3 flex flex-col items-center gap-2 shadow-sm border-2 transition-colors ${
                  estaRoto || sinUrl
                    ? "border-red-300 bg-red-50"
                    : "border-transparent"
                }`}
              >
                {sinUrl ? (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs font-bold">?</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={nombre}
                    width={48}
                    height={48}
                    className="object-contain"
                    onError={() => marcarRoto(nombre)}
                  />
                )}
                <p className={`text-center text-[11px] leading-tight font-medium ${
                  estaRoto || sinUrl ? "text-red-600" : "text-gray-700"
                }`}>
                  {nombre}
                </p>
                {sinUrl && (
                  <span className="text-[9px] text-red-500 font-bold">SIN URL</span>
                )}
                {estaRoto && !sinUrl && (
                  <span className="text-[9px] text-red-500 font-bold">ROTO</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
