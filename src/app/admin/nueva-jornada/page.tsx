"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EQUIPOS_POR_LIGA, LIGAS } from "@/lib/equipos";

type PartidoForm = {
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string;
};

const PARTIDO_VACIO = { equipoLocal: "", equipoVisita: "", fechaHora: "" };

// Ejemplos de nombres por liga para el placeholder
const NOMBRE_PLACEHOLDER: Record<string, string> = {
  "Liga MX": "Jornada 12",
  "Champions League": "Cuartos de Final - Ida",
};

export default function NuevaJornadaPage() {
  const router = useRouter();
  const [liga, setLiga] = useState("Liga MX");
  const [nombre, setNombre] = useState("");
  const [temporada, setTemporada] = useState("Clausura 2026");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [partidos, setPartidos] = useState<PartidoForm[]>(
    Array.from({ length: 9 }, () => ({ ...PARTIDO_VACIO }))
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const equiposLiga = EQUIPOS_POR_LIGA[liga] ?? [];

  const updatePartido = (i: number, campo: keyof PartidoForm, valor: string) => {
    setPartidos((prev) => {
      const nuevo = [...prev];
      // Si cambia el local y coincide con el visita actual, limpiar visita
      if (campo === "equipoLocal" && valor === nuevo[i].equipoVisita) {
        nuevo[i] = { ...nuevo[i], equipoLocal: valor, equipoVisita: "" };
      } else if (campo === "equipoVisita" && valor === nuevo[i].equipoLocal) {
        nuevo[i] = { ...nuevo[i], equipoVisita: valor, equipoLocal: "" };
      } else {
        nuevo[i] = { ...nuevo[i], [campo]: valor };
      }
      return nuevo;
    });
  };

  const agregarPartido = () => {
    setPartidos((prev) => [...prev, { ...PARTIDO_VACIO }]);
  };

  const quitarPartido = (i: number) => {
    setPartidos((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Equipos ya usados como local en OTROS partidos (para destacar duplicados)
  const equiposEnUso = partidos.flatMap((p) => [p.equipoLocal, p.equipoVisita]).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !temporada || !fechaInicio || !fechaFin) {
      setError("Completa todos los campos obligatorios");
      return;
    }

    const partidosValidos = partidos.filter(
      (p) => p.equipoLocal && p.equipoVisita && p.fechaHora && p.equipoLocal !== p.equipoVisita
    );
    if (partidosValidos.length < 1) {
      setError("Agrega al menos un partido válido");
      return;
    }

    // Detectar equipo repetido en varios partidos
    const equiposUsados: string[] = [];
    for (const p of partidosValidos) {
      if (equiposUsados.includes(p.equipoLocal) || equiposUsados.includes(p.equipoVisita)) {
        setError(`Un equipo aparece en más de un partido. Revisa los partidos.`);
        return;
      }
      equiposUsados.push(p.equipoLocal, p.equipoVisita);
    }

    setEnviando(true);
    setError("");

    // numero lo derivamos del nombre si contiene un número, si no usamos timestamp
    const numMatch = nombre.match(/\d+/);
    const numero = numMatch ? parseInt(numMatch[0]) : Date.now() % 10000;

    const res = await fetch("/api/jornadas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero,
        nombre: nombre.trim(),
        temporada,
        liga,
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
          <a href="/admin" className="text-green-300 text-sm">← Admin</a>
          <h1 className="text-xl font-bold mt-1">Nueva Fecha / Jornada</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Info jornada */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Datos generales</h2>

          {/* Liga */}
          <div>
            <label className="text-xs text-gray-500">Liga *</label>
            <div className="flex gap-2 mt-1">
              {LIGAS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setLiga(l);
                    setPartidos(Array.from({ length: l === "Liga MX" ? 9 : 8 }, () => ({ ...PARTIDO_VACIO })));
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    liga === l
                      ? "bg-green-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {l === "Liga MX" ? "🇲🇽 Liga MX" : "⭐ Champions"}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre de la fecha */}
          <div>
            <label className="text-xs text-gray-500">Nombre de la fecha *</label>
            <input
              type="text"
              placeholder={NOMBRE_PLACEHOLDER[liga] ?? "Jornada 1"}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Ejemplos: "Jornada 12", "Cuartos de Final - Ida", "Semifinal Vuelta"
            </p>
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
            <div />
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

          {partidos.map((partido, i) => {
            // Equipos disponibles: todos excepto el seleccionado en el otro lado,
            // y marcar los ya usados en otros partidos
            const usadosEnOtros = partidos
              .filter((_, idx) => idx !== i)
              .flatMap((p) => [p.equipoLocal, p.equipoVisita])
              .filter(Boolean);

            const opcionesLocal = equiposLiga.filter((eq) => eq !== partido.equipoVisita);
            const opcionesVisita = equiposLiga.filter((eq) => eq !== partido.equipoLocal);

            return (
              <div key={i} className="bg-white rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Partido {i + 1}</span>
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
                  {/* Local */}
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
                      <option
                        key={eq}
                        value={eq}
                        disabled={usadosEnOtros.includes(eq)}
                        style={usadosEnOtros.includes(eq) ? { color: "#bbb" } : {}}
                      >
                        {usadosEnOtros.includes(eq) ? `${eq} (ya asignado)` : eq}
                      </option>
                    ))}
                  </select>

                  {/* Visita */}
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
                      <option
                        key={eq}
                        value={eq}
                        disabled={usadosEnOtros.includes(eq)}
                        style={usadosEnOtros.includes(eq) ? { color: "#bbb" } : {}}
                      >
                        {usadosEnOtros.includes(eq) ? `${eq} (ya asignado)` : eq}
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
            );
          })}

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
          {enviando ? "Creando..." : "Crear Fecha"}
        </button>
      </form>
    </div>
  );
}
