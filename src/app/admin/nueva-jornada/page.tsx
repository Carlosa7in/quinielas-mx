"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LIGAS, LIGA_ICON } from "@/lib/equipos";

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


// Formatear Date → YYYYMMDD usando métodos UTC (input type=date siempre manda YYYY-MM-DD
// que new Date() interpreta como UTC midnight, así que usamos getUTCxxx para evitar
// que el offset de México adelante o atrase el día).
function toYYYYMMDD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
// Formatear Date → YYYY-MM-DD (para input type=date)
function toInputDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function NuevaJornadaPage() {
  const router = useRouter();

  // ── Catálogo de equipos desde la DB ───────────────────────────────
  const [equiposPorLiga, setEquiposPorLiga] = useState<Record<string, string[]>>({});
  const [agregandoEquipo, setAgregandoEquipo] = useState<string | null>(null); // nombre del equipo en proceso

  const cargarEquipos = () =>
    fetch("/api/admin/equipos")
      .then((r) => r.json())
      .then((data) => {
        const mapa: Record<string, string[]> = {};
        for (const eq of data.equipos ?? []) {
          if (!mapa[eq.liga]) mapa[eq.liga] = [];
          mapa[eq.liga].push(eq.nombre);
        }
        setEquiposPorLiga(mapa);
      });

  useEffect(() => { cargarEquipos(); }, []);

  const agregarEquipoAlSistema = async (nombre: string, liga: string) => {
    setAgregandoEquipo(nombre);
    await fetch("/api/admin/equipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, liga }),
    });
    await cargarEquipos();
    setAgregandoEquipo(null);
    // Quitar de la lista de desconocidos
    setEspnDesconocidos((prev) => prev.filter((e) => e !== nombre));
  };

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
    // Leer estado actual con snapshot (evita stale closure)
    const snapshot = partidos;
    const existentesSnap = snapshot.filter((p) => p.equipoLocal || p.equipoVisita || p.fechaHora);
    const slotsLibres = MAX_PARTIDOS - existentesSnap.length;

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

      // Detectar equipos no reconocidos
      const equiposSistema = equiposPorLiga[espnLiga] ?? [];
      const desconocidos = fetchedPartidos.flatMap((p) => {
        const d: string[] = [];
        if (p.equipoLocal  && !equiposSistema.includes(p.equipoLocal))  d.push(p.equipoLocal);
        if (p.equipoVisita && !equiposSistema.includes(p.equipoVisita)) d.push(p.equipoVisita);
        return d;
      });
      setEspnDesconocidos([...new Set(desconocidos)]);

      // Fusionar usando el estado MÁS RECIENTE (prev) — evita stale closure
      const ligaActual = espnLiga;
      const fetchedCopy = [...fetchedPartidos];
      let agregados = 0;
      let totalEncontrados = fetchedCopy.length;

      setPartidos((prev) => {
        const existentes = prev.filter((p) => p.equipoLocal || p.equipoVisita || p.fechaHora);
        const libres = MAX_PARTIDOS - existentes.length;
        const nuevos = fetchedCopy.slice(0, libres);
        agregados = nuevos.length;
        const merged = [...existentes, ...nuevos];
        return merged.length < MIN_PARTIDOS
          ? [...merged, ...Array.from({ length: MIN_PARTIDOS - merged.length }, () => PARTIDO_VACIO(ligaActual))]
          : merged;
      });

      // Auto-rellenar nombre y fechas solo si están vacíos
      if (data.nombreSugerido && !nombre.trim()) setNombre(data.nombreSugerido);

      // fechaInicio = fecha del primer partido real (no el inicio del rango de búsqueda)
      // fechaFin    = fecha del último partido real
      const fechasPartidos = fetchedPartidos
        .map((p) => p.fechaHora)
        .filter(Boolean)
        .sort();
      const primeraFecha = fechasPartidos[0]?.slice(0, 10); // "YYYY-MM-DD"
      const ultimaFecha  = fechasPartidos[fechasPartidos.length - 1]?.slice(0, 10);

      if (!fechaInicio) setFechaInicio(primeraFecha ?? espnDesde);
      if (!fechaFin)    setFechaFin(ultimaFecha ?? espnHasta);

      const recortado = totalEncontrados > slotsLibres
        ? ` (solo cabían ${slotsLibres} de ${totalEncontrados} encontrados)`
        : "";

      setEspnMensaje({
        tipo: desconocidos.length > 0 ? "warn" : "ok",
        texto: `✅ ${agregados} partido${agregados !== 1 ? "s" : ""} de ${espnLiga} agregado${agregados !== 1 ? "s" : ""}${recortado}`,
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
    // Validar duplicados por liga — se permiten partidos de vuelta (mismo par, roles invertidos)
    // Reglas: (1) el partido exacto (local|visita) no puede repetirse; (2) un equipo solo puede
    // aparecer con un mismo rival (máx. 2 veces: ida + vuelta).
    const porLiga: Record<string, { paresOrdenados: string[]; rivalPorEquipo: Record<string, string> }> = {};
    for (const p of partidosValidos) {
      if (!porLiga[p.liga]) porLiga[p.liga] = { paresOrdenados: [], rivalPorEquipo: {} };
      const { paresOrdenados, rivalPorEquipo } = porLiga[p.liga];

      // Rechazar partido exactamente duplicado
      const parOrdenado = `${p.equipoLocal}|${p.equipoVisita}`;
      if (paresOrdenados.includes(parOrdenado)) {
        setError(`El partido ${p.equipoLocal} vs ${p.equipoVisita} está duplicado en ${p.liga}.`);
        return;
      }
      paresOrdenados.push(parOrdenado);

      // Cada equipo solo puede tener un rival único (puede repetirse como ida+vuelta)
      for (const [equipo, rival] of [[p.equipoLocal, p.equipoVisita], [p.equipoVisita, p.equipoLocal]] as [string, string][]) {
        if (rivalPorEquipo[equipo] !== undefined && rivalPorEquipo[equipo] !== rival) {
          setError(`${equipo} aparece con dos rivales distintos en ${p.liga}. Revísalos.`);
          return;
        }
        rivalPorEquipo[equipo] = rival;
      }
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
      if (data.omitidos?.length) {
        console.warn("[nueva-jornada] Partidos omitidos:", data.omitidos);
        // Aun así redirige, pero el admin verá 0 partidos y podrá investigar
      }
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
                      {LIGA_ICON[liga] ?? "⚽"} {liga}
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

              {/* Equipos no reconocidos — se pueden agregar al catálogo con un clic */}
              {espnDesconocidos.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-700 space-y-2">
                  <p className="font-semibold">⚠️ Equipos nuevos — no están en el catálogo aún:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {espnDesconocidos.map((eq) => (
                      <button
                        key={eq}
                        type="button"
                        disabled={agregandoEquipo === eq}
                        onClick={() => agregarEquipoAlSistema(eq, espnLiga)}
                        className="flex items-center gap-1 bg-orange-100 hover:bg-amber-100 disabled:opacity-50 border border-orange-300 text-orange-800 px-2 py-1 rounded-full transition-colors"
                      >
                        {agregandoEquipo === eq ? "Agregando…" : `+ ${eq}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-orange-500">Toca un equipo para agregarlo al catálogo de {espnLiga}.</p>
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
                  {LIGA_ICON[ligaJornada] ?? "⚽"} {ligaJornada}
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
            const equiposLiga = equiposPorLiga[partido.liga] ?? [];
            // Marcar equipos conflictivos: usados en otro partido de la misma liga,
            // EXCEPTO si ese partido es la vuelta del actual (mismos equipos, roles invertidos).
            const usadosEnOtros = partidos
              .filter((_, idx) => {
                if (idx === i) return false;
                if (partidos[idx].liga !== partido.liga) return false;
                // Si es el partido de vuelta (roles invertidos), no es conflicto
                const otro = partidos[idx];
                if (otro.equipoLocal === partido.equipoVisita && otro.equipoVisita === partido.equipoLocal) return false;
                return true;
              })
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
                    className="text-red-400 hover:text-red-600 text-xs"
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
                      {LIGA_ICON[liga] ?? "⚽"} {liga}
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
              {ligasUsadas.map((l) => `${LIGA_ICON[l] ?? "⚽"} ${l}`).join(" · ")}
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
