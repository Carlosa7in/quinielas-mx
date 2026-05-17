"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";

type ResultadoRow = { folio: string; nombre: string; aciertos: number; puntos: number; estado: string };

type Data = {
  nombre: string | null;
  numero: number;
  partidos: { length: number }[];
  tablaResultados: ResultadoRow[];
};

function colorPorAciertos(ac: number, total: number) {
  if (ac === total)   return { bg: "bg-amber-50",   text: "text-amber-800",  badge: "bg-amber-500 text-white",  label: "🥇 Todo correcto" };
  if (ac >= total - 1) return { bg: "bg-green-50",  text: "text-green-800",  badge: "bg-green-500 text-white",  label: "🟢 Excelente" };
  if (ac >= 5)        return { bg: "bg-teal-50",    text: "text-teal-800",   badge: "bg-teal-500 text-white",   label: "💪 Muy bien" };
  if (ac === 4)       return { bg: "bg-blue-50",    text: "text-blue-800",   badge: "bg-blue-500 text-white",   label: "👍 Bien" };
  if (ac === 3)       return { bg: "bg-indigo-50",  text: "text-indigo-700", badge: "bg-indigo-400 text-white", label: "🙂 Regular" };
  if (ac === 2)       return { bg: "bg-gray-50",    text: "text-gray-600",   badge: "bg-gray-400 text-white",   label: "😐 Poco" };
  if (ac === 1)       return { bg: "bg-orange-50",  text: "text-orange-700", badge: "bg-orange-400 text-white", label: "😬 Casi nada" };
  return               { bg: "bg-red-50",    text: "text-red-600",    badge: "bg-red-400 text-white",    label: "💀 Sin aciertos" };
}

export default function TablaResultadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/jornadas/${id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) return <LoadingScreen texto="Cargando resultados..." />;
  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">No encontrado</p>
    </div>
  );

  const titulo = data.nombre ?? `Jornada ${data.numero}`;
  const total = data.partidos.length;
  const tabla = data.tablaResultados ?? [];

  // Agrupar por aciertos para mostrar secciones
  const grupos = new Map<number, ResultadoRow[]>();
  for (const r of tabla) {
    const ac = r.aciertos ?? 0;
    if (!grupos.has(ac)) grupos.set(ac, []);
    grupos.get(ac)!.push(r);
  }
  const nivelesDesc = [...grupos.keys()].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white px-4 pt-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Link href={`/admin/jornadas/${id}`} className="text-amber-400 text-sm">← {titulo}</Link>
          </div>
          <h1 className="text-xl font-black">🏆 Tabla de Resultados</h1>
          <p className="text-amber-300/70 text-sm mt-1">{tabla.length} quinielas · {total} partidos</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {tabla.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold">Sin resultados aún</p>
            <p className="text-sm mt-1">Los aciertos se calculan al procesar resultados</p>
          </div>
        )}

        {nivelesDesc.map(ac => {
          const filas = grupos.get(ac)!;
          const { bg, text, badge, label } = colorPorAciertos(ac, total);
          return (
            <div key={ac}>
              {/* Encabezado del grupo */}
              <div className="flex items-center gap-2 px-1 mb-2">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${badge}`}>{ac}/{total}</span>
                <span className="text-xs font-semibold text-gray-500">{label} · {filas.length} quiniela{filas.length !== 1 ? "s" : ""}</span>
              </div>

              <div className={`rounded-2xl overflow-hidden shadow-sm ${bg}`}>
                <table className="w-full">
                  <tbody>
                    {filas.map((r, i) => (
                      <tr key={r.folio} className={`border-b border-white/60 last:border-0`}>
                        <td className={`px-4 py-3 text-xs font-mono ${text} w-20`}>{r.folio}</td>
                        <td className={`px-4 py-3 text-sm font-semibold ${text} flex-1`}>{r.nombre}</td>
                        {r.estado === "ganadora" && (
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-bold">🏆 Ganadora</span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
