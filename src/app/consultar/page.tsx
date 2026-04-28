"use client";
import { useState } from "react";

type Pick = {
  id: string;
  prediccion: string;
  acertado: boolean | null;
  partido: {
    equipoLocal: string;
    equipoVisita: string;
    resultado: string | null;
  };
};

type Quiniela = {
  folio: string;
  nombreCliente: string | null;
  estado: string;
  aciertos: number | null;
  canal: string;
  createdAt: string;
  jornada: { numero: number; temporada: string };
  picks: Pick[];
};

export default function ConsultarPage() {
  const [folio, setFolio] = useState("");
  const [quiniela, setQuiniela] = useState<Quiniela | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folio.trim()) return;
    setCargando(true);
    setError("");
    setQuiniela(null);

    const res = await fetch(`/api/quinielas?folio=${folio.trim().toUpperCase()}`);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "No encontrada");
    } else {
      setQuiniela(data);
    }
    setCargando(false);
  };

  const estadoColor = (estado: string) => {
    if (estado === "ganadora") return "text-green-600 bg-green-50";
    if (estado === "perdedora") return "text-red-600 bg-red-50";
    return "text-yellow-600 bg-yellow-50";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <a href="/" className="text-green-300 text-sm mb-2 inline-block">
            ← Inicio
          </a>
          <h1 className="text-2xl font-bold">Consultar Quiniela</h1>
          <p className="text-green-200 text-sm">Ingresa tu folio para ver los resultados</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <form onSubmit={buscar} className="bg-white rounded-xl shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Folio de quiniela
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="QMX-J1-20250125-ABC123"
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
            />
            <button
              type="submit"
              disabled={cargando}
              className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {cargando ? "..." : "Buscar"}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm text-center">
            {error}
          </div>
        )}

        {quiniela && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Encabezado */}
            <div className="bg-green-800 text-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-200 text-xs">Folio</p>
                  <p className="font-mono font-bold text-sm">{quiniela.folio}</p>
                  <p className="text-green-200 text-xs mt-1">
                    {quiniela.nombreCliente} · Jornada {quiniela.jornada.numero}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${estadoColor(quiniela.estado)}`}
                >
                  {quiniela.estado}
                </span>
              </div>
              {quiniela.aciertos !== null && (
                <div className="mt-3 text-center bg-white/10 rounded-lg py-2">
                  <span className="text-2xl font-bold text-yellow-300">
                    {quiniela.aciertos}
                  </span>
                  <span className="text-green-200 text-sm">
                    /{quiniela.picks.length} aciertos
                  </span>
                </div>
              )}
            </div>

            {/* Picks */}
            <div className="divide-y divide-gray-100">
              {quiniela.picks.map((pick) => (
                <div key={pick.id} className="p-3 flex items-center justify-between">
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{pick.partido.equipoLocal}</span>
                    <span className="text-gray-400 mx-1 text-xs">vs</span>
                    <span className="font-medium">{pick.partido.equipoVisita}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                      {pick.prediccion}
                    </span>
                    {pick.partido.resultado && (
                      <>
                        <span className="text-gray-400 text-xs">→</span>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
                          {pick.partido.resultado}
                        </span>
                        {pick.acertado !== null && (
                          <span>{pick.acertado ? "✅" : "❌"}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {quiniela.estado === "pendiente" && (
              <div className="p-4 bg-yellow-50 text-yellow-700 text-sm text-center">
                Los resultados se publicarán al terminar la jornada
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
