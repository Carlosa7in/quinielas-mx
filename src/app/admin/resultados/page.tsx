"use client";
import { useState, useEffect } from "react";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  resultado: string | null;
  golesLocal: number | null;
  golesVisita: number | null;
};

type Jornada = {
  id: string;
  numero: number;
  temporada: string;
  estado: string;
  partidos: Partido[];
};

type EstadoPartido = {
  resultado: string;
  golesLocal: string;
  golesVisita: string;
  guardando: boolean;
  guardado: boolean;
  error: string;
};

export default function ResultadosPage() {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [estados, setEstados] = useState<Record<string, EstadoPartido>>({});
  const [finalizada, setFinalizada] = useState(false);
  const [ganadoras, setGanadoras] = useState<{ folio: string; nombreCliente: string | null; aciertos: number | null }[]>([]);

  useEffect(() => {
    fetch("/api/jornadas")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setJornada(data);
        if (data.estado === "finalizada") setFinalizada(true);

        const init: Record<string, EstadoPartido> = {};
        for (const p of data.partidos) {
          init[p.id] = {
            resultado: p.resultado ?? "",
            golesLocal: p.golesLocal?.toString() ?? "",
            golesVisita: p.golesVisita?.toString() ?? "",
            guardando: false,
            guardado: !!p.resultado,
            error: "",
          };
        }
        setEstados(init);
      });
  }, []);

  const set = (partidoId: string, campo: keyof EstadoPartido, valor: string | boolean) => {
    setEstados((prev) => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [campo]: valor },
    }));
  };

  const guardar = async (partidoId: string) => {
    if (!jornada) return;
    const e = estados[partidoId];
    if (!e?.resultado) return;

    set(partidoId, "guardando", true);
    set(partidoId, "error", "");

    const res = await fetch("/api/admin/resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jornadaId: jornada.id,
        partidoId,
        resultado: e.resultado,
        golesLocal: parseInt(e.golesLocal) || 0,
        golesVisita: parseInt(e.golesVisita) || 0,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      set(partidoId, "error", data.error || "Error al guardar");
    } else {
      set(partidoId, "guardado", true);
      if (data.finalizada) {
        setFinalizada(true);
        setGanadoras(data.ganadoras ?? []);
      }
    }
    set(partidoId, "guardando", false);
  };

  const resueltos = Object.values(estados).filter((e) => e.guardado).length;
  const total = jornada?.partidos.length ?? 0;

  if (finalizada && ganadoras.length >= 0 && resueltos === total && total > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-green-900 text-white py-4 px-4">
          <div className="max-w-xl mx-auto">
            <h1 className="text-xl font-bold">Jornada Finalizada</h1>
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h2 className="text-green-800 font-bold text-lg">Todos los resultados registrados</h2>
            <p className="text-green-600 text-sm">{total} partidos resueltos</p>
          </div>

          {ganadoras.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-bold text-yellow-800 mb-3">Ganadores ({ganadoras.length})</h3>
              {ganadoras.map((g) => (
                <div key={g.folio} className="bg-white rounded-lg p-3 mb-2">
                  <p className="font-bold text-gray-800">{g.nombreCliente || "-"}</p>
                  <p className="text-xs font-mono text-gray-500">{g.folio}</p>
                  <p className="text-green-600 text-sm font-bold">{g.aciertos} aciertos</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-gray-600">No hubo ganadores esta jornada</p>
            </div>
          )}

          <a
            href="/admin"
            className="block w-full text-center bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Volver al admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-900 text-white py-4 px-4">
        <div className="max-w-xl mx-auto">
          <a href="/admin" className="text-green-300 text-sm">← Admin</a>
          <h1 className="text-xl font-bold mt-1">Registrar Resultados</h1>
          {jornada && (
            <p className="text-green-300 text-xs">
              Jornada {jornada.numero} · {jornada.temporada}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {/* Progreso */}
        {total > 0 && (
          <div className="bg-white rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Partidos resueltos</span>
              <span className="font-bold text-green-700">{resueltos} / {total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${(resueltos / total) * 100}%` }}
              />
            </div>
            {resueltos > 0 && resueltos < total && (
              <p className="text-xs text-yellow-600 mt-2 text-center">
                Los aciertos parciales ya son visibles para los participantes
              </p>
            )}
          </div>
        )}

        {/* Partidos */}
        {jornada?.partidos.map((partido) => {
          const e = estados[partido.id];
          if (!e) return null;

          return (
            <div
              key={partido.id}
              className={`bg-white rounded-xl p-4 border-2 transition-colors ${
                e.guardado ? "border-green-200" : "border-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm text-gray-800">
                  {partido.equipoLocal}{" "}
                  <span className="text-gray-400 font-normal">vs</span>{" "}
                  {partido.equipoVisita}
                </p>
                {e.guardado && (
                  <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full">
                    ✓ Guardado
                  </span>
                )}
              </div>

              {/* Botones resultado */}
              <div className="flex gap-2 mb-3">
                {[
                  { val: "1", label: "Local (1)" },
                  { val: "X", label: "Empate (X)" },
                  { val: "2", label: "Visita (2)" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      set(partido.id, "resultado", val);
                      set(partido.id, "guardado", false);
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      e.resultado === val
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Marcador */}
              <div className="flex items-center gap-2 text-sm mb-3">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={e.golesLocal}
                  onChange={(ev) => { set(partido.id, "golesLocal", ev.target.value); set(partido.id, "guardado", false); }}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-400 text-xs flex-1 text-center">
                  {partido.equipoLocal} — {partido.equipoVisita}
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={e.golesVisita}
                  onChange={(ev) => { set(partido.id, "golesVisita", ev.target.value); set(partido.id, "guardado", false); }}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {e.error && (
                <p className="text-red-600 text-xs mb-2">{e.error}</p>
              )}

              <button
                onClick={() => guardar(partido.id)}
                disabled={!e.resultado || e.guardando}
                className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm transition-colors"
              >
                {e.guardando ? "Guardando..." : e.guardado ? "Actualizar resultado" : "Guardar resultado"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
