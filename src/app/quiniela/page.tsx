"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogoEquipo } from "@/components/LogoEquipo";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string;
  orden: number;
};

type Jornada = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  estado: string;
  partidos: Partido[];
  totalQuinielas?: number;
  totalPartidos?: number;
  recaudado?: number;
  ganadoras?: number;
};

const LIGA_ICON: Record<string, string> = {
  "Liga MX": "🇲🇽",
  "Champions League": "⭐",
};

/* ─── Pantalla de selección de jornada ─── */
function SelectorJornada({ onSelect }: { onSelect: (j: Jornada) => void }) {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [ligaActiva, setLigaActiva] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data: Jornada[]) => {
        const activas = data.filter((j) => j.estado === "abierta");
        setJornadas(activas);
        if (activas.length > 0) {
          const ligas = [...new Set(activas.map((j) => j.liga))];
          setLigaActiva(ligas[0]);
        }
        // Si solo hay una jornada, saltar directo
        if (activas.length === 1) {
          cargarJornada(activas[0], onSelect);
        }
        setCargando(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarJornada = async (j: Jornada, cb: (jornada: Jornada) => void) => {
    const res = await fetch(`/api/jornadas?id=${j.id}`);
    const data = await res.json();
    if (!data.error) cb(data);
  };

  const LIGA_ORDEN: Record<string, number> = { "Liga MX": 0, "Champions League": 1 };
  const ligas = [...new Set(jornadas.map((j) => j.liga))]
    .sort((a, b) => (LIGA_ORDEN[a] ?? 9) - (LIGA_ORDEN[b] ?? 9));
  const filtradas = jornadas.filter((j) => j.liga === ligaActiva);

  if (cargando) {
    return (
      <div className="min-h-screen bg-green-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚽</div>
          <p>Cargando jornadas...</p>
        </div>
      </div>
    );
  }

  if (jornadas.length === 0) {
    return (
      <div className="min-h-screen bg-green-900 flex items-center justify-center text-white px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">No hay jornadas abiertas</h2>
          <p className="text-green-300 text-sm">Vuelve pronto, pronto habrá una nueva jornada.</p>
          <a href="/" className="mt-6 inline-block text-yellow-300 underline">← Inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <a href="/" className="text-green-300 text-sm mb-2 inline-block">← Inicio</a>
          <h1 className="text-2xl font-bold">Registrar Quiniela</h1>
          <p className="text-green-200 text-sm">Elige la jornada en la que quieres participar</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Selector de liga */}
        {ligas.length > 1 && (
          <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
            {ligas.map((liga) => (
              <button
                key={liga}
                onClick={() => setLigaActiva(liga)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  ligaActiva === liga ? "bg-green-700 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {LIGA_ICON[liga] ?? "⚽"} {liga}
              </button>
            ))}
          </div>
        )}

        {/* Tarjetas de jornadas */}
        <div className="space-y-3">
          {filtradas.map((j) => (
            <button
              key={j.id}
              onClick={() => cargarJornada(j, onSelect)}
              className="w-full bg-white rounded-2xl shadow-sm p-5 text-left hover:shadow-md hover:border-green-300 border-2 border-transparent transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{LIGA_ICON[j.liga] ?? "⚽"}</span>
                  <div>
                    <p className="font-bold text-gray-800">
                      {j.liga} · {j.nombre ?? `Jornada ${j.numero}`}
                    </p>
                    <p className="text-xs text-gray-400">{j.temporada}</p>
                  </div>
                </div>
                <span className="text-green-600 font-bold text-xl">→</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>⚽ {j.totalPartidos ?? "?"} partidos</span>
                  <span>🎯 {j.totalQuinielas ?? 0} inscritos</span>
                </div>
                <span className="text-yellow-600 font-bold text-sm">$20 MXN</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Formulario de picks ─── */
export default function QuinielaPage() {
  const router = useRouter();
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const seleccionar = (partidoId: string, valor: string) => {
    setPicks((prev) => ({ ...prev, [partidoId]: valor }));
  };

  const picksCompletos = jornada
    ? jornada.partidos.every((p) => picks[p.id])
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picksCompletos) return;
    setEnviando(true);
    setError("");

    const res = await fetch("/api/quinielas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jornadaId: jornada!.id,
        picks: Object.entries(picks).map(([partidoId, prediccion]) => ({
          partidoId,
          prediccion,
        })),
        nombre,
        telefono,
        canal: "online",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al registrar");
      setEnviando(false);
      return;
    }

    router.push(`/ticket/${data.folio}`);
  };

  // Mostrar selector si no hay jornada elegida
  if (!jornada) {
    return <SelectorJornada onSelect={setJornada} />;
  }

  const partidosOrdenados = [...jornada.partidos].sort((a, b) => a.orden - b.orden);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => { setJornada(null); setPicks({}); }}
            className="text-green-300 text-sm mb-2 inline-block"
          >
            ← Cambiar jornada
          </button>
          <h1 className="text-2xl font-bold">Registrar Quiniela</h1>
          <p className="text-green-200 text-sm">
            {LIGA_ICON[jornada.liga] ?? "⚽"} {jornada.liga} · {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada} · $20 MXN
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Datos del jugador */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Tus datos</h2>
          <input
            type="text"
            placeholder="Nombre *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="tel"
            placeholder="Teléfono (opcional, para consultar después)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-400">
            Con tu teléfono podrás consultar tus quinielas fácilmente
          </p>
        </div>

        {/* Partidos */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700 px-1">
            Selecciona tus pronósticos{" "}
            <span className="text-green-600 font-normal text-sm">
              ({Object.keys(picks).length}/{partidosOrdenados.length})
            </span>
          </h2>

          {partidosOrdenados.map((partido) => (
            <div key={partido.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="text-xs text-gray-400 mb-3">
                {new Date(partido.fechaHora).toLocaleDateString("es-MX", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* Equipos con logos */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="font-semibold text-gray-800 text-sm text-right">{partido.equipoLocal}</span>
                  <LogoEquipo equipo={partido.equipoLocal} size={28} />
                </div>
                <span className="text-gray-400 text-xs mx-3 font-bold">VS</span>
                <div className="flex items-center gap-2 flex-1">
                  <LogoEquipo equipo={partido.equipoVisita} size={28} />
                  <span className="font-semibold text-gray-800 text-sm">{partido.equipoVisita}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {(["1", "X", "2"] as const).map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => seleccionar(partido.id, opcion)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      picks[partido.id] === opcion
                        ? "bg-green-600 text-white shadow"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {opcion === "1" ? "L · Local" : opcion === "2" ? "V · Visita" : "E · Empate"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg p-3">{error}</p>
        )}

        {/* Resumen y envío */}
        <div className="bg-green-800 text-white rounded-xl p-4">
          <div className="flex justify-between mb-3 text-sm">
            <span>Pronósticos:</span>
            <span>{Object.keys(picks).length}/{partidosOrdenados.length} seleccionados</span>
          </div>
          <div className="flex justify-between mb-4 text-sm">
            <span>Costo:</span>
            <span className="font-bold text-yellow-300">$20 MXN</span>
          </div>
          <button
            type="submit"
            disabled={!picksCompletos || !nombre || enviando}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-green-900 font-bold py-3 rounded-xl transition-colors"
          >
            {enviando ? "Registrando..." : "Registrar Quiniela ($20)"}
          </button>
          {!picksCompletos && (
            <p className="text-green-300 text-xs text-center mt-2">
              Selecciona todos los partidos para continuar
            </p>
          )}
        </div>

        <div className="pb-6" />
      </form>
    </div>
  );
}
