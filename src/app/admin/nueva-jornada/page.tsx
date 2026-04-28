"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type PartidoForm = {
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string;
};

const EQUIPOS_LMX = [
  "América", "Guadalajara", "Cruz Azul", "Pumas UNAM", "Tigres UANL",
  "Monterrey", "León", "Santos Laguna", "Toluca", "Atlas",
  "Pachuca", "Necaxa", "Querétaro", "FC Juárez", "Mazatlán",
  "Tijuana", "Atlético San Luis", "Puebla", "Atlético Morelia",
];

const EQUIPOS_VACIO = { equipoLocal: "", equipoVisita: "", fechaHora: "" };

export default function NuevaJornadaPage() {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [temporada, setTemporada] = useState("2025-C");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [partidos, setPartidos] = useState<PartidoForm[]>(
    Array.from({ length: 9 }, () => ({ ...EQUIPOS_VACIO }))
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const updatePartido = (i: number, campo: keyof PartidoForm, valor: string) => {
    setPartidos((prev) => {
      const nuevo = [...prev];
      nuevo[i] = { ...nuevo[i], [campo]: valor };
      return nuevo;
    });
  };

  const agregarPartido = () => {
    setPartidos((prev) => [...prev, { ...EQUIPOS_VACIO }]);
  };

  const quitarPartido = (i: number) => {
    setPartidos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero || !temporada || !fechaInicio || !fechaFin) {
      setError("Completa todos los campos obligatorios");
      return;
    }
    const partidosValidos = partidos.filter(
      (p) => p.equipoLocal && p.equipoVisita && p.fechaHora
    );
    if (partidosValidos.length < 1) {
      setError("Agrega al menos un partido");
      return;
    }

    setEnviando(true);
    setError("");

    const res = await fetch("/api/jornadas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero: parseInt(numero),
        temporada,
        fechaInicio,
        fechaFin,
        partidos: partidosValidos.map((p, i) => ({ ...p, orden: i + 1 })),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al crear jornada");
      setEnviando(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-900 text-white py-4 px-4">
        <div className="max-w-xl mx-auto">
          <a href="/admin" className="text-green-300 text-sm">
            ← Admin
          </a>
          <h1 className="text-xl font-bold mt-1">Nueva Jornada</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Info jornada */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Datos de la jornada</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Número *</label>
              <input
                type="number"
                placeholder="1"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Temporada *</label>
              <input
                type="text"
                placeholder="2025-C"
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Fecha inicio *</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Fecha fin *</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Partidos */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 px-1">
            Partidos ({partidos.filter((p) => p.equipoLocal && p.equipoVisita).length})
          </h2>

          {partidos.map((partido, i) => (
            <div key={i} className="bg-white rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400">
                  Partido {i + 1}
                </span>
                {partidos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarPartido(i)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={partido.equipoLocal}
                  onChange={(e) => updatePartido(i, "equipoLocal", e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Local</option>
                  {EQUIPOS_LMX.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
                <select
                  value={partido.equipoVisita}
                  onChange={(e) => updatePartido(i, "equipoVisita", e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Visita</option>
                  {EQUIPOS_LMX.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="datetime-local"
                value={partido.fechaHora}
                onChange={(e) => updatePartido(i, "fechaHora", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={agregarPartido}
            className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 text-gray-500 hover:text-green-600 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            + Agregar partido
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl transition-colors"
        >
          {enviando ? "Creando..." : "Crear Jornada"}
        </button>
      </form>
    </div>
  );
}
