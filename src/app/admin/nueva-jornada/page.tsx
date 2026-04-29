"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EQUIPOS_POR_LIGA, LIGAS } from "@/lib/equipos";

const MIN_PARTIDOS = 6;
const MAX_PARTIDOS = 9;

type PartidoForm = {
  liga: string;
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string;
};

const PARTIDO_VACIO = (liga = "Liga MX"): PartidoForm => ({
  liga,
  equipoLocal: "",
  equipoVisita: "",
  fechaHora: "",
});

const LIGA_ICONO: Record<string, string> = {
  "Liga MX": "🇲🇽",
  "Champions League": "⭐",
  "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "La Liga": "🇪🇸",
};

export default function NuevaJornadaPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [temporada, setTemporada] = useState("Clausura 2026");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [partidos, setPartidos] = useState<PartidoForm[]>(
    Array.from({ length: MIN_PARTIDOS }, () => PARTIDO_VACIO())
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const updatePartido = (i: number, campo: keyof PartidoForm, valor: string) => {
    setPartidos((prev) => {
      const nuevo = [...prev];
      const p = { ...nuevo[i], [campo]: valor };

      // Si cambia la liga, limpiar equipos
      if (campo === "liga") {
        p.equipoLocal = "";
        p.equipoVisita = "";
      }
      // Evitar mismo equipo en ambos lados
      if (campo === "equipoLocal" && valor === nuevo[i].equipoVisita) p.equipoVisita = "";
      if (campo === "equipoVisita" && valor === nuevo[i].equipoLocal) p.equipoLocal = "";

      nuevo[i] = p;
      return nuevo;
    });
  };

  const agregarPartido = () => {
    if (partidos.length >= MAX_PARTIDOS) return;
    // Nueva fila hereda la liga del último partido
    const ultimaLiga = partidos[partidos.length - 1]?.liga ?? "Liga MX";
    setPartidos((prev) => [...prev, PARTIDO_VACIO(ultimaLiga)]);
  };

  const quitarPartido = (i: number) => {
    if (partidos.length <= MIN_PARTIDOS) return;
    setPartidos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const partidosValidos = partidos.filter(
    (p) => p.equipoLocal && p.equipoVisita && p.fechaHora && p.equipoLocal !== p.equipoVisita
  );

  // Detectar la liga global de la jornada automáticamente
  const ligasUsadas = [...new Set(partidosValidos.map((p) => p.liga))];
  const ligaJornada = ligasUsadas.length === 1 ? ligasUsadas[0] : ligasUsadas.length > 1 ? "Mixta" : "Liga MX";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !temporada || !fechaInicio || !fechaFin) {
      setError("Completa todos los campos obligatorios");
      return;
    }
    if (partidosValidos.length < MIN_PARTIDOS) {
      setError(`Necesitas al menos ${MIN_PARTIDOS} partidos completos`);
      return;
    }
    // Validar equipos duplicados entre partidos
    const equiposUsados: string[] = [];
    for (const p of partidosValidos) {
      if (equiposUsados.includes(p.equipoLocal) || equiposUsados.includes(p.equipoVisita)) {
        setError("Un equipo aparece en más de un partido. Revísalos.");
        return;
      }
      equiposUsados.push(p.equipoLocal, p.equipoVisita);
    }

    setEnviando(true);
    setError("");

    const numMatch = nombre.match(/\d+/);
    const numero = numMatch ? parseInt(numMatch[0]) : Date.now() % 10000;

    const res = await fetch("/api/jornadas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero,
        nombre: nombre.trim(),
        temporada,
        liga: ligaJornada,
        fechaInicio,
        fechaFin,
        partidos: partidosValidos.map((p, i) => ({ ...p, orden: i + 1 })),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al crear");
      setEnviando(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-900 text-white py-4 px-4">
        <div className="max-w-xl mx-auto">
          <a href="/admin" className="text-green-300 text-sm">← Admin</a>
          <h1 className="text-xl font-bold mt-1">Nueva Fecha / Jornada</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-4 space-y-4">

        {/* Datos generales */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Datos generales</h2>

          <div>
            <label className="text-xs text-gray-500">Nombre de la fecha *</label>
            <input
              type="text"
              placeholder="Jornada 12 · Cuartos de Final - Ida · Semifinal Vuelta"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Temporada *</label>
              <input
                type="text"
                placeholder="Clausura 2026"
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-end pb-0.5">
              {/* Liga calculada automáticamente */}
              <div className="flex-1">
                <label className="text-xs text-gray-400">Liga (automática)</label>
                <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-500">
                  {LIGA_ICONO[ligaJornada] ?? "⚽"} {ligaJornada}
                </div>
              </div>
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

        {/* Contador de partidos */}
        <div className="flex items-center justify-between px-1">
          <h2 className="font-semibold text-gray-700">
            Partidos
            <span className={`ml-2 text-sm font-normal ${
              partidosValidos.length < MIN_PARTIDOS ? "text-red-500" : "text-green-600"
            }`}>
              {partidosValidos.length}/{MAX_PARTIDOS}
            </span>
          </h2>
          <span className="text-xs text-gray-400">mín {MIN_PARTIDOS} · máx {MAX_PARTIDOS}</span>
        </div>

        {/* Lista de partidos */}
        <div className="space-y-2">
          {partidos.map((partido, i) => {
            const equiposLiga = EQUIPOS_POR_LIGA[partido.liga] ?? [];
            const usadosEnOtros = partidos
              .filter((_, idx) => idx !== i)
              .flatMap((p) => [p.equipoLocal, p.equipoVisita])
              .filter(Boolean);

            const opcionesLocal  = equiposLiga.filter((eq) => eq !== partido.equipoVisita);
            const opcionesVisita = equiposLiga.filter((eq) => eq !== partido.equipoLocal);

            const esValido = partido.equipoLocal && partido.equipoVisita && partido.fechaHora;

            return (
              <div key={i} className={`bg-white rounded-xl p-3 space-y-2 border-l-4 ${
                esValido ? "border-green-400" : "border-gray-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Partido {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => quitarPartido(i)}
                    disabled={partidos.length <= MIN_PARTIDOS}
                    className="text-red-400 hover:text-red-600 text-xs disabled:text-gray-200 disabled:cursor-not-allowed"
                  >
                    Quitar
                  </button>
                </div>

                {/* Selector de liga del partido */}
                <div className="flex gap-1.5 flex-wrap">
                  {LIGAS.map((liga) => (
                    <button
                      key={liga}
                      type="button"
                      onClick={() => updatePartido(i, "liga", liga)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        partido.liga === liga
                          ? "bg-green-700 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {LIGA_ICONO[liga] ?? "⚽"} {liga}
                    </button>
                  ))}
                </div>

                {/* Equipos */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={partido.equipoLocal}
                    onChange={(e) => updatePartido(i, "equipoLocal", e.target.value)}
                    className={`border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      partido.equipoLocal && usadosEnOtros.includes(partido.equipoLocal)
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Local</option>
                    {opcionesLocal.map((eq) => (
                      <option key={eq} value={eq} disabled={usadosEnOtros.includes(eq)}>
                        {usadosEnOtros.includes(eq) ? `${eq} (ya asignado)` : eq}
                      </option>
                    ))}
                  </select>

                  <select
                    value={partido.equipoVisita}
                    onChange={(e) => updatePartido(i, "equipoVisita", e.target.value)}
                    className={`border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      partido.equipoVisita && usadosEnOtros.includes(partido.equipoVisita)
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Visita</option>
                    {opcionesVisita.map((eq) => (
                      <option key={eq} value={eq} disabled={usadosEnOtros.includes(eq)}>
                        {usadosEnOtros.includes(eq) ? `${eq} (ya asignado)` : eq}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha/hora */}
                <input
                  type="datetime-local"
                  value={partido.fechaHora}
                  onChange={(e) => updatePartido(i, "fechaHora", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            );
          })}
        </div>

        {/* Botón agregar */}
        {partidos.length < MAX_PARTIDOS && (
          <button
            type="button"
            onClick={agregarPartido}
            className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 text-gray-500 hover:text-green-600 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            + Agregar partido ({partidos.length}/{MAX_PARTIDOS})
          </button>
        )}

        {/* Resumen de ligas incluidas */}
        {ligasUsadas.length > 1 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
            <p className="font-semibold">⚽ Quiniela mixta</p>
            <p className="text-xs mt-1 text-blue-500">
              {ligasUsadas.map((l) => `${LIGA_ICONO[l] ?? "⚽"} ${l}`).join(" · ")}
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={enviando || partidosValidos.length < MIN_PARTIDOS}
          className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors"
        >
          {enviando
            ? "Creando..."
            : `Crear fecha (${partidosValidos.length} partidos · ${ligaJornada})`}
        </button>
      </form>
    </div>
  );
}
