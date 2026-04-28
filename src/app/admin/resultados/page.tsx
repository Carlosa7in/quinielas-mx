"use client";
import { useState, useEffect } from "react";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string;
  resultado: string | null;
};

type Jornada = {
  id: string;
  numero: number;
  temporada: string;
  estado: string;
  partidos: Partido[];
};

export default function ResultadosPage() {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [resultados, setResultados] = useState<Record<string, { resultado: string; golesLocal: string; golesVisita: string }>>({});
  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState<{ ganadoras: { folio: string; nombreCliente: string; aciertos: number }[]; totalQuinielas: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/jornadas")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setJornada(data);
          // Pre-llenar con resultados existentes
          const pre: typeof resultados = {};
          for (const p of data.partidos) {
            pre[p.id] = {
              resultado: p.resultado ?? "",
              golesLocal: p.golesLocal?.toString() ?? "",
              golesVisita: p.golesVisita?.toString() ?? "",
            };
          }
          setResultados(pre);
        }
      });
  }, []);

  const setResultado = (partidoId: string, campo: string, valor: string) => {
    setResultados((prev) => ({
      ...prev,
      [partidoId]: { ...(prev[partidoId] ?? {}), [campo]: valor } as typeof prev[string],
    }));
  };

  const todosCompletos = jornada?.partidos.every((p) => resultados[p.id]?.resultado) ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todosCompletos || !jornada) return;
    setEnviando(true);
    setError("");

    const payload = {
      jornadaId: jornada.id,
      resultados: jornada.partidos.map((p) => ({
        partidoId: p.id,
        resultado: resultados[p.id].resultado,
        golesLocal: parseInt(resultados[p.id].golesLocal) || 0,
        golesVisita: parseInt(resultados[p.id].golesVisita) || 0,
      })),
    };

    const res = await fetch("/api/admin/resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al guardar");
    } else {
      setRespuesta(data);
    }
    setEnviando(false);
  };

  if (respuesta) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-green-900 text-white py-4 px-4">
          <div className="max-w-xl mx-auto">
            <h1 className="text-xl font-bold">Resultados Registrados</h1>
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h2 className="text-green-800 font-bold text-lg">Jornada finalizada</h2>
            <p className="text-green-600 text-sm">
              {respuesta.totalQuinielas} quinielas calculadas
            </p>
          </div>

          {respuesta.ganadoras.length > 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-bold text-yellow-800 mb-3">
                Ganadores ({respuesta.ganadoras.length})
              </h3>
              {respuesta.ganadoras.map((g) => (
                <div key={g.folio} className="bg-white rounded-lg p-3 mb-2">
                  <p className="font-bold text-gray-800">{g.nombreCliente || "-"}</p>
                  <p className="text-xs font-mono text-gray-500">{g.folio}</p>
                  <p className="text-green-600 text-sm font-bold">
                    {g.aciertos} aciertos
                  </p>
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
          <a href="/admin" className="text-green-300 text-sm">
            ← Admin
          </a>
          <h1 className="text-xl font-bold mt-1">Registrar Resultados</h1>
          {jornada && (
            <p className="text-green-300 text-xs">
              Jornada {jornada.numero} · {jornada.temporada}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {jornada?.partidos.map((partido) => (
          <div key={partido.id} className="bg-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm text-gray-800">
                {partido.equipoLocal}{" "}
                <span className="text-gray-400 font-normal">vs</span>{" "}
                {partido.equipoVisita}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(partido.fechaHora).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>

            {/* Resultado */}
            <div className="flex gap-2 mb-3">
              {["1", "X", "2"].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setResultado(partido.id, "resultado", op)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                    resultados[partido.id]?.resultado === op
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {op === "1" ? "Local (1)" : op === "2" ? "Visita (2)" : "Empate (X)"}
                </button>
              ))}
            </div>

            {/* Marcador */}
            <div className="flex items-center gap-2 text-sm">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={resultados[partido.id]?.golesLocal ?? ""}
                onChange={(e) => setResultado(partido.id, "golesLocal", e.target.value)}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-gray-400 text-xs">{partido.equipoLocal} - {partido.equipoVisita}</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={resultados[partido.id]?.golesVisita ?? ""}
                onChange={(e) => setResultado(partido.id, "golesVisita", e.target.value)}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        ))}

        {error && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={!todosCompletos || enviando}
          className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors"
        >
          {enviando ? "Calculando..." : "Guardar Resultados y Calcular Ganadores"}
        </button>
      </form>
    </div>
  );
}
