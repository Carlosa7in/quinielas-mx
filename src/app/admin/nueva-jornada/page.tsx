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

// Formatear Date → YYYYMMDD
function toYYYYMMDD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
// Formatear Date → YYYY-MM-DD (para input type=date)
function toInputDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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

  // ── Estado del panel ESPN ──────────────────────────────────────────
  const hoy = new Date();
  const masdiez = new Date(hoy); masdiez.setDate(hoy.getDate() + 10);
  const [panelEspn, setPanelEspn] = useState(false);
  const [espnLiga, setEspnLiga] = useState("Liga MX");
  const [espnDesde, setEspnDesde] = useState(toInputDate(hoy));
  const [espnHasta, setEspnHasta] = useState(toInputDate(masdiez));
  const [espnCargando, setEspnCargando] = useState(false);
  const [espnMensaje, setEspnMensaje] = useState<{ tipo: "ok" | "error" | "warn"; texto: string } | null>(null);
  const [espnDesconocidos, setEspnDesconocidos] = useState<string[]>([]);

  const cargarDesdeEspn = async () => {
    // Partidos reales ya cargados (con al menos un campo)
    const existentes = partidos.filter((p) => p.equipoLocal || p.equipoVisita || p.fechaHora);
    const slotsLibres = MAX_PARTIDOS - existentes.length;

    if (slotsLibres <= 0) {
      setEspnMensaje({ tipo: "warn", texto: `Ya tienes ${MAX_PARTIDOS} partidos. Quita alguno para agregar más.` });
      return;
    }

    setEspnCargando(true);
    setEspnMensaje(null);
    setEspnDesconocidos([]);
    try {
      const desde = toYYYYMMDD(new Date(espnDesde));
      const hasta = toYYYYMMDD(new Date(espnHasta));
      const res = await fetch(
        `/api/espn-partidos?liga=${encodeURIComponent(espnLiga)}&desde=${desde}&hasta=${hasta}`
      );
      const data = await res.json();
      if (!res.ok) {
        setEspnMensaje({ tipo: "error", texto: data.error ?? "Error al consultar ESPN" });
        return;
      }

      const fetchedPartidos: PartidoForm[] = (data.partidos ?? []).map(
        (p: { equipoLocal: string; equipoVisita: string; fechaHora: string; liga: string }) => ({
          liga: p.liga,
          equipoLocal: p.equipoLocal,
          equipoVisita: p.equipoVisita,
          fechaHora: p.fechaHora,
        })
      );

      if (fetchedPartidos.length === 0) {
        setEspnMensaje({ tipo: "warn", texto: `No se encontraron partidos de ${espnLiga} en ese rango de fechas.` });
        return;
      }

      // Solo tomar los que caben en los slots libres
      const nuevos = fetchedPartidos.slice(0, slotsLibres);

      // Detectar equipos no reconocidos en nuestro sistema
      const equiposSistema = EQUIPOS_POR_LIGA[espnLiga] ?? [];
      const desconocidos = nuevos.flatMap((p) => {
        const d: string[] = [];
        if (p.equipoLocal  && !equiposSistema.includes(p.equipoLocal))  d.push(p.equipoLocal);
        if (p.equipoVisita && !equiposSistema.includes(p.equipoVisita)) d.push(p.equipoVisita);
        return d;
      });
      const uniqueDesc = [...new Set(desconocidos)];
      setEspnDesconocidos(uniqueDesc);

      // Fusionar: existentes reales + nuevos de ESPN
      const merged = [...existentes, ...nuevos];

      // Rellenar con filas vacías hasta MIN_PARTIDOS si hacen falta
      const conRelleno = merged.length < MIN_PARTIDOS
        ? [...merged, ...Array.from({ length: MIN_PARTIDOS - merged.length }, () => PARTIDO_VACIO(espnLiga))]
        : merged;

      setPartidos(conRelleno);

      // Auto-rellenar nombre y fechas solo si están vacíos
      if (data.nombreSugerido && !nombre.trim()) setNombre(data.nombreSugerido);
      if (!fechaInicio) setFechaInicio(espnDesde);
      if (!fechaFin)   setFechaFin(espnHasta);

      const recortado = fetchedPartidos.length > slotsLibres
        ? ` (solo cabían ${slotsLibres} de ${fetchedPartidos.length} encontrados)`
        : "";

      setEspnMensaje({
        tipo: uniqueDesc.length > 0 ? "warn" : "ok",
        texto: `✅ ${nuevos.length} partido${nuevos.length !== 1 ? "s" : ""} de ${espnLiga} agregado${nuevos.length !== 1 ? "s" : ""}${recortado}`,
      });
    } catch {
      setEspnMensaje({ tipo: "error", texto: "No se pudo conectar con ESPN" });
    } finally {
      setEspnCargando(false);
    }
  };

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
    // Validar duplicados por liga (en mixtas cada liga tiene su propio pool de equipos)
    const equiposPorLiga: Record<string, string[]> = {};
    for (const p of partidosValidos) {
      if (!equiposPorLiga[p.liga]) equiposPorLiga[p.liga] = [];
      const pool = equiposPorLiga[p.liga];
      if (pool.includes(p.equipoLocal) || pool.includes(p.equipoVisita)) {
        setError(`Un equipo de ${p.liga} aparece en más de un partido. Revísalos.`);
        return;
      }
      pool.push(p.equipoLocal, p.equipoVisita);
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
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href="/admin" className="text-amber-400 text-sm">← Admin</a>
            <h1 className="text-xl font-bold mt-1">Nueva Fecha / Jornada</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-4 space-y-4">

        {/* ── Panel ESPN ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => { setPanelEspn((v) => !v); setEspnMensaje(null); }}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📡</span>
              <div className="text-left">
                <p className="font-semibold text-gray-800 text-sm">Cargar partidos desde ESPN</p>
                <p className="text-xs text-gray-400">Importa el calendario automáticamente</p>
              </div>
            </div>
            <span className="text-gray-400 text-sm">{panelEspn ? "▲" : "▼"}</span>
          </button>

          {panelEspn && (
            <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">

              {/* Slots disponibles */}
              {(() => {
                const reales = partidos.filter((p) => p.equipoLocal || p.equipoVisita || p.fechaHora).length;
                const libres = MAX_PARTIDOS - reales;
                return (
                  <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
                    libres === 0 ? "bg-red-50 text-red-600" :
                    libres <= 3  ? "bg-yellow-50 text-yellow-700" :
                                   "bg-blue-50 text-blue-600"
                  }`}>
                    {reales === 0
                      ? `Cargará hasta ${MAX_PARTIDOS} partidos`
                      : libres === 0
                      ? `⛔ Lleno (${reales}/${MAX_PARTIDOS}) — quita partidos para agregar más`
                      : `➕ Se agregarán a los ${reales} existentes · quedan ${libres} slot${libres !== 1 ? "s" : ""} libres`}
                  </div>
                );
              })()}

              {/* Liga */}
              <div>
                <label className="text-xs text-gray-500">Liga a importar</label>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {LIGAS.map((liga) => (
                    <button
                      key={liga}
                      type="button"
                      onClick={() => setEspnLiga(liga)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        espnLiga === liga
                          ? "bg-blue-700 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {LIGA_ICONO[liga] ?? "⚽"} {liga}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rango de fechas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Desde</label>
                  <input
                    type="date"
                    value={espnDesde}
                    onChange={(e) => setEspnDesde(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Hasta</label>
                  <input
                    type="date"
                    value={espnHasta}
                    onChange={(e) => setEspnHasta(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Botón cargar */}
              <button
                type="button"
                onClick={cargarDesdeEspn}
                disabled={espnCargando}
                className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {espnCargando ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Consultando ESPN...
                  </>
                ) : (
                  <>📥 Cargar partidos</>
                )}
              </button>

              {/* Mensaje resultado */}
              {espnMensaje && (
                <div className={`rounded-lg p-3 text-sm ${
                  espnMensaje.tipo === "ok"    ? "bg-green-50 text-green-700" :
                  espnMensaje.tipo === "warn"  ? "bg-yellow-50 text-yellow-700" :
                                                 "bg-red-50 text-red-700"
                }`}>
                  {espnMensaje.texto}
                </div>
              )}

              {/* Equipos no reconocidos */}
              {espnDesconocidos.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-700">
                  <p className="font-semibold mb-1">⚠️ Equipos no reconocidos en el sistema:</p>
                  <p className="text-orange-600">{espnDesconocidos.join(", ")}</p>
                  <p className="mt-1 text-orange-500">Puedes seleccionarlos manualmente en los desplegables.</p>
                </div>
              )}
            </div>
          )}
        </div>

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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Fecha fin *</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            // Solo marcar duplicados dentro de la misma liga
            const usadosEnOtros = partidos
              .filter((_, idx) => idx !== i && partidos[idx].liga === partido.liga)
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
                          ? "bg-amber-700 text-white"
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
                    className={`border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      partido.equipoLocal && usadosEnOtros.includes(partido.equipoLocal)
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Local</option>
                    {/* Si el valor actual no está en la lista (p.ej. cargado de ESPN), mostrarlo igual */}
                    {partido.equipoLocal && !opcionesLocal.includes(partido.equipoLocal) && (
                      <option value={partido.equipoLocal}>{partido.equipoLocal} ⚠️</option>
                    )}
                    {opcionesLocal.map((eq) => (
                      <option key={eq} value={eq} disabled={usadosEnOtros.includes(eq)}>
                        {usadosEnOtros.includes(eq) ? `${eq} (ya asignado)` : eq}
                      </option>
                    ))}
                  </select>

                  <select
                    value={partido.equipoVisita}
                    onChange={(e) => updatePartido(i, "equipoVisita", e.target.value)}
                    className={`border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      partido.equipoVisita && usadosEnOtros.includes(partido.equipoVisita)
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200"
                    }`}
                  >
                    <option value="">Visita</option>
                    {/* Si el valor actual no está en la lista (p.ej. cargado de ESPN), mostrarlo igual */}
                    {partido.equipoVisita && !opcionesVisita.includes(partido.equipoVisita) && (
                      <option value={partido.equipoVisita}>{partido.equipoVisita} ⚠️</option>
                    )}
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            className="w-full border-2 border-dashed border-gray-300 hover:border-amber-400 text-gray-500 hover:text-amber-600 py-3 rounded-xl text-sm font-medium transition-colors"
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
          className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors"
        >
          {enviando
            ? "Creando..."
            : `Crear fecha (${partidosValidos.length} partidos · ${ligaJornada})`}
        </button>
      </form>
    </div>
  );
}
