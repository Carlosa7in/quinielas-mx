"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LIGAS, LIGA_ICON } from "@/lib/equipos";

const MIN_PARTIDOS = 6;
const MAX_PARTIDOS = 9;

const TIPO_LABEL: Record<string, string> = {
  media:   "Media Semana",
  finde:   "Fin de Semana",
  domingo: "Dominguera",
};
const TIPO_PREFIJOS = Object.values(TIPO_LABEL);

/** Quita el prefijo de tipo de quiniela si ya viene incluido */
function sinPrefijo(s: string): string {
  const t = s.trim();
  for (const p of TIPO_PREFIJOS) {
    // Caso 1: el string ES exactamente el prefijo (sin base todavía)
    if (t.toLowerCase() === p.toLowerCase()) return "";
    // Caso 2: el string tiene prefijo + separador + base
    const re = new RegExp(`^${p}\\s*[-–]\\s*`, "i");
    if (re.test(t)) return t.replace(re, "").trim();
  }
  return t;
}
/** Construye el nombre completo con el prefijo de tipo */
function conPrefijo(tipo: string | null, base: string): string {
  const label = tipo ? TIPO_LABEL[tipo] : "";
  if (!label) return base;
  return base ? `${label} - ${base}` : label;
}

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

function toYYYYMMDD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function toInputDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Devuelve el lunes de la semana de `d`
function inicioSemana(d: Date): Date {
  const r = new Date(d);
  const dow = r.getDay(); // 0=dom, 1=lun…
  r.setDate(r.getDate() - (dow === 0 ? 6 : dow - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}

function formatHora(fechaHora: string): string {
  if (!fechaHora) return "";
  const [, hora] = fechaHora.split("T");
  return hora?.slice(0, 5) ?? "";
}
function formatDia(fechaHora: string): string {
  if (!fechaHora) return "";
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const [fecha] = fechaHora.split("T");
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${dias[dt.getDay()]} ${d}/${m}`;
}

export default function NuevaJornadaPage() {
  const router = useRouter();

  // ── Catálogo de equipos desde la DB ───────────────────────────────
  const [equiposPorLiga, setEquiposPorLiga] = useState<Record<string, string[]>>({});
  const [agregandoEquipo, setAgregandoEquipo] = useState<string | null>(null);

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
    setEspnDesconocidos((prev) => prev.filter((e) => e !== nombre));
  };

  const [nombreBase, setNombreBase] = useState(""); // parte que escribe el usuario
  const [temporada, setTemporada] = useState("Clausura 2026");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [partidos, setPartidos] = useState<PartidoForm[]>(
    Array.from({ length: MIN_PARTIDOS }, () => PARTIDO_VACIO())
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // ── Tipo de quiniela (persiste al cambiar de liga) ────────────────
  const [tipoQuiniela, setTipoQuiniela] = useState<string | null>(null);

  // Nombre completo que se guarda: "Tipo - Base" o solo "Base" si no hay tipo
  const nombre = tipoQuiniela && TIPO_LABEL[tipoQuiniela]
    ? nombreBase.trim() ? `${TIPO_LABEL[tipoQuiniela]} - ${nombreBase.trim()}` : TIPO_LABEL[tipoQuiniela]
    : nombreBase.trim();

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

  // ── Lista de partidos de ESPN (pendiente de selección) ─────────────
  const [espnLista, setEspnLista] = useState<PartidoForm[]>([]);
  const [espnSeleccion, setEspnSeleccion] = useState<Set<number>>(new Set());
  const [espnNombreSugerido, setEspnNombreSugerido] = useState<string | null>(null);

  // ── Atajos de fecha por tipo de quiniela ──────────────────────────
  const aplicarAtajo = (tipo: "media" | "finde" | "domingo") => {
    const lunes = inicioSemana(hoy);
    if (tipo === "media") {
      const mar = new Date(lunes); mar.setDate(lunes.getDate() + 1);
      const jue = new Date(lunes); jue.setDate(lunes.getDate() + 3);
      setEspnDesde(toInputDate(mar));
      setEspnHasta(toInputDate(jue));
    } else if (tipo === "finde") {
      const vie = new Date(lunes); vie.setDate(lunes.getDate() + 4);
      const dom = new Date(lunes); dom.setDate(lunes.getDate() + 6);
      setEspnDesde(toInputDate(vie));
      setEspnHasta(toInputDate(dom));
    } else {
      const dom = new Date(lunes); dom.setDate(lunes.getDate() + 6);
      setEspnDesde(toInputDate(dom));
      setEspnHasta(toInputDate(dom));
    }

    // Si el tipo cambia, reiniciar partidos (no se pueden mezclar semanas)
    setTipoQuiniela((prev) => {
      if (prev !== null && prev !== tipo) {
        setPartidos(Array.from({ length: MIN_PARTIDOS }, () => PARTIDO_VACIO()));
        setFechaInicio("");
        setFechaFin("");
      }
      return tipo;
    });
    // Limpiar lista anterior
    setEspnLista([]);
    setEspnSeleccion(new Set());
    setEspnMensaje(null);
  };

  // ── Paso 1: Consultar ESPN (solo muestra lista, no agrega) ─────────
  const consultarEspn = async () => {
    setEspnCargando(true);
    setEspnMensaje(null);
    setEspnDesconocidos([]);
    setEspnLista([]);
    setEspnSeleccion(new Set());
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
        setEspnMensaje({ tipo: "warn", texto: `No se encontraron partidos de ${espnLiga} en ese rango.` });
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
      setEspnLista(fetchedPartidos);
      // Pre-seleccionar todos
      setEspnSeleccion(new Set(fetchedPartidos.map((_, i) => i)));
      setEspnNombreSugerido(data.nombreSugerido ?? null);
      setEspnMensaje({ tipo: "ok", texto: `${fetchedPartidos.length} partidos encontrados — selecciona los que quieres agregar` });
    } catch {
      setEspnMensaje({ tipo: "error", texto: "No se pudo conectar con ESPN" });
    } finally {
      setEspnCargando(false);
    }
  };

  // ── Paso 2: Agregar los seleccionados ─────────────────────────────
  const agregarSeleccionados = () => {
    const seleccionados = espnLista.filter((_, i) => espnSeleccion.has(i));
    if (seleccionados.length === 0) {
      setEspnMensaje({ tipo: "warn", texto: "Selecciona al menos un partido." });
      return;
    }

    const existentes = partidos.filter((p) => p.equipoLocal || p.equipoVisita || p.fechaHora);
    const libres = MAX_PARTIDOS - existentes.length;
    if (libres <= 0) {
      setEspnMensaje({ tipo: "warn", texto: `Ya tienes ${MAX_PARTIDOS} partidos. Quita alguno primero.` });
      return;
    }

    const nuevos = seleccionados.slice(0, libres);
    const recortado = seleccionados.length > libres;
    const merged = [...existentes, ...nuevos];
    const ligaActual = espnLiga;

    setPartidos(
      merged.length < MIN_PARTIDOS
        ? [...merged, ...Array.from({ length: MIN_PARTIDOS - merged.length }, () => PARTIDO_VACIO(ligaActual))]
        : merged
    );

    // Auto-rellenar nombreBase con la sugerencia de ESPN si aún está vacío
    if (espnNombreSugerido && !nombreBase.trim()) {
      setNombreBase(espnNombreSugerido);
    }

    const fechasPartidos = nuevos.map((p) => p.fechaHora).filter(Boolean).sort();
    const primeraFecha = fechasPartidos[0]?.slice(0, 10);
    const ultimaFecha  = fechasPartidos[fechasPartidos.length - 1]?.slice(0, 10);
    if (!fechaInicio) setFechaInicio(primeraFecha ?? espnDesde);
    if (!fechaFin)    setFechaFin(ultimaFecha ?? espnHasta);

    setEspnMensaje({
      tipo: recortado ? "warn" : "ok",
      texto: recortado
        ? `⚠️ Solo se agregaron ${nuevos.length} de ${seleccionados.length} (límite ${MAX_PARTIDOS})`
        : `✅ ${nuevos.length} partido${nuevos.length !== 1 ? "s" : ""} agregados`,
    });
    setEspnLista([]);
    setEspnSeleccion(new Set());
  };

  const toggleSeleccion = (i: number) => {
    setEspnSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const updatePartido = (i: number, campo: keyof PartidoForm, valor: string) => {
    setPartidos((prev) => {
      const nuevo = [...prev];
      const p = { ...nuevo[i], [campo]: valor };
      if (campo === "liga") { p.equipoLocal = ""; p.equipoVisita = ""; }
      if (campo === "equipoLocal"  && valor === nuevo[i].equipoVisita) p.equipoVisita = "";
      if (campo === "equipoVisita" && valor === nuevo[i].equipoLocal)  p.equipoLocal  = "";
      nuevo[i] = p;
      return nuevo;
    });
  };

  const agregarPartido = () => {
    if (partidos.length >= MAX_PARTIDOS) return;
    const ultimaLiga = partidos[partidos.length - 1]?.liga ?? "Liga MX";
    setPartidos((prev) => [...prev, PARTIDO_VACIO(ultimaLiga)]);
  };

  const quitarPartido = (i: number) => {
    setPartidos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const partidosValidos = partidos.filter(
    (p) => p.equipoLocal && p.equipoVisita && p.fechaHora && p.equipoLocal !== p.equipoVisita
  );

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
    const porLiga: Record<string, { paresOrdenados: string[]; rivalPorEquipo: Record<string, string> }> = {};
    for (const p of partidosValidos) {
      if (!porLiga[p.liga]) porLiga[p.liga] = { paresOrdenados: [], rivalPorEquipo: {} };
      const { paresOrdenados, rivalPorEquipo } = porLiga[p.liga];
      const parOrdenado = `${p.equipoLocal}|${p.equipoVisita}`;
      if (paresOrdenados.includes(parOrdenado)) {
        setError(`El partido ${p.equipoLocal} vs ${p.equipoVisita} está duplicado en ${p.liga}.`);
        return;
      }
      paresOrdenados.push(parOrdenado);
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
      router.push("/admin");
    }
  };

  const slotsLibres = MAX_PARTIDOS - partidos.filter((p) => p.equipoLocal || p.equipoVisita || p.fechaHora).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href="/admin" className="text-amber-400 text-sm">← Admin</a>
            <h1 className="text-xl font-bold mt-1">Nueva Fecha / Jornada</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} /></a>
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
                <p className="text-xs text-gray-400">Importa y elige los partidos que quieres</p>
              </div>
            </div>
            <span className="text-gray-400 text-sm">{panelEspn ? "▲" : "▼"}</span>
          </button>

          {panelEspn && (
            <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">

              {/* Slots disponibles */}
              <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
                slotsLibres === 0 ? "bg-red-50 text-red-600" :
                slotsLibres <= 3  ? "bg-yellow-50 text-yellow-700" :
                                    "bg-blue-50 text-blue-600"
              }`}>
                {slotsLibres === 0
                  ? `⛔ Lleno (${MAX_PARTIDOS}/${MAX_PARTIDOS}) — quita partidos para agregar más`
                  : `Slots disponibles: ${slotsLibres} de ${MAX_PARTIDOS}`}
              </div>

              {/* Atajos de tipo de quiniela */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tipo de quiniela (atajo de fechas)</label>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => aplicarAtajo("media")}
                    className={`flex-1 text-xs py-2 px-2 rounded-lg font-medium border transition-colors text-center ${
                      tipoQuiniela === "media"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100"
                    }`}>
                    🌙 Media Semana<br /><span className="text-[10px] font-normal opacity-80">Mar–Jue</span>
                  </button>
                  <button type="button" onClick={() => aplicarAtajo("finde")}
                    className={`flex-1 text-xs py-2 px-2 rounded-lg font-medium border transition-colors text-center ${
                      tipoQuiniela === "finde"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-green-50 text-green-700 hover:bg-green-100 border-green-100"
                    }`}>
                    🎉 Fin de Semana<br /><span className="text-[10px] font-normal opacity-80">Vie–Dom</span>
                  </button>
                  <button type="button" onClick={() => aplicarAtajo("domingo")}
                    className={`flex-1 text-xs py-2 px-2 rounded-lg font-medium border transition-colors text-center ${
                      tipoQuiniela === "domingo"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100"
                    }`}>
                    ⭐ Dominguera<br /><span className="text-[10px] font-normal opacity-80">Solo Dom</span>
                  </button>
                </div>
              </div>

              {/* Liga */}
              <div>
                <label className="text-xs text-gray-500">Liga a consultar</label>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {LIGAS.map((liga) => (
                    <button
                      key={liga}
                      type="button"
                      onClick={() => { setEspnLiga(liga); setEspnLista([]); setEspnSeleccion(new Set()); }}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        espnLiga === liga ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
                  <input type="date" value={espnDesde} onChange={(e) => setEspnDesde(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Hasta</label>
                  <input type="date" value={espnHasta} onChange={(e) => setEspnHasta(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Botón consultar */}
              <button type="button" onClick={consultarEspn} disabled={espnCargando}
                className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                {espnCargando ? <><span className="animate-spin">⟳</span> Consultando ESPN…</> : <>🔍 Consultar partidos</>}
              </button>

              {/* Mensaje resultado */}
              {espnMensaje && (
                <div className={`rounded-lg p-3 text-sm ${
                  espnMensaje.tipo === "ok"   ? "bg-green-50 text-green-700" :
                  espnMensaje.tipo === "warn" ? "bg-yellow-50 text-yellow-700" :
                                                "bg-red-50 text-red-700"
                }`}>
                  {espnMensaje.texto}
                </div>
              )}

              {/* ── Lista de partidos para seleccionar ─────────────── */}
              {espnLista.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600">
                      Selecciona los partidos ({espnSeleccion.size}/{espnLista.length})
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEspnSeleccion(new Set(espnLista.map((_, i) => i)))}
                        className="text-[10px] text-blue-600 hover:underline">Todo</button>
                      <button type="button" onClick={() => setEspnSeleccion(new Set())}
                        className="text-[10px] text-gray-400 hover:underline">Ninguno</button>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                    {espnLista.map((p, i) => {
                      const seleccionado = espnSeleccion.has(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleSeleccion(i)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                            seleccionado ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                            seleccionado ? "bg-blue-600 border-blue-600" : "border-gray-300"
                          }`}>
                            {seleccionado && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                          {/* Partido */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {p.equipoLocal} <span className="text-gray-400 font-normal">vs</span> {p.equipoVisita}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {formatDia(p.fechaHora)} · {formatHora(p.fechaHora)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={agregarSeleccionados}
                    disabled={espnSeleccion.size === 0 || slotsLibres === 0}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-300 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
                  >
                    ➕ Agregar {espnSeleccion.size} partido{espnSeleccion.size !== 1 ? "s" : ""} seleccionado{espnSeleccion.size !== 1 ? "s" : ""}
                  </button>
                </div>
              )}

              {/* Equipos no reconocidos */}
              {espnDesconocidos.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-700 space-y-2">
                  <p className="font-semibold">⚠️ Equipos nuevos — no están en el catálogo aún:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {espnDesconocidos.map((eq) => (
                      <button key={eq} type="button" disabled={agregandoEquipo === eq}
                        onClick={() => agregarEquipoAlSistema(eq, espnLiga)}
                        className="flex items-center gap-1 bg-orange-100 hover:bg-amber-100 disabled:opacity-50 border border-orange-300 text-orange-800 px-2 py-1 rounded-full transition-colors">
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
            <div className="flex items-center gap-2 mt-1">
              {tipoQuiniela && (
                <span className="shrink-0 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 font-medium whitespace-nowrap">
                  {TIPO_LABEL[tipoQuiniela]} -
                </span>
              )}
              <input type="text"
                placeholder={
                  tipoQuiniela === "media"   ? "Clausura Jornada 17" :
                  tipoQuiniela === "finde"   ? "Clausura Semifinales" :
                  tipoQuiniela === "domingo" ? "Clausura Final" :
                  "Jornada 12 · Cuartos de Final · Semifinal Vuelta"
                }
                value={nombreBase} onChange={(e) => setNombreBase(e.target.value)} required
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            {nombre && (
              <p className="text-[11px] text-gray-400 mt-1 px-1">
                Se guardará como: <span className="font-medium text-gray-600">{nombre}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Temporada *</label>
              <input type="text" placeholder="Clausura 2026" value={temporada}
                onChange={(e) => setTemporada(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="flex items-end pb-0.5">
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
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Fecha fin *</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
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
            const usadosEnOtros = partidos
              .filter((_, idx) => {
                if (idx === i) return false;
                if (partidos[idx].liga !== partido.liga) return false;
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
                  <button type="button" onClick={() => quitarPartido(i)} className="text-red-400 hover:text-red-600 text-xs">
                    Quitar
                  </button>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {LIGAS.map((liga) => (
                    <button key={liga} type="button" onClick={() => updatePartido(i, "liga", liga)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        partido.liga === liga ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}>
                      {LIGA_ICON[liga] ?? "⚽"} {liga}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select value={partido.equipoLocal} onChange={(e) => updatePartido(i, "equipoLocal", e.target.value)}
                    className={`border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      partido.equipoLocal && usadosEnOtros.includes(partido.equipoLocal) ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}>
                    <option value="">Local</option>
                    {partido.equipoLocal && !opcionesLocal.includes(partido.equipoLocal) && (
                      <option value={partido.equipoLocal}>{partido.equipoLocal} ⚠️</option>
                    )}
                    {opcionesLocal.map((eq) => (
                      <option key={eq} value={eq} disabled={usadosEnOtros.includes(eq)}>
                        {usadosEnOtros.includes(eq) ? `${eq} (ya asignado)` : eq}
                      </option>
                    ))}
                  </select>

                  <select value={partido.equipoVisita} onChange={(e) => updatePartido(i, "equipoVisita", e.target.value)}
                    className={`border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      partido.equipoVisita && usadosEnOtros.includes(partido.equipoVisita) ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}>
                    <option value="">Visita</option>
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

                <input type="datetime-local" value={partido.fechaHora}
                  onChange={(e) => updatePartido(i, "fechaHora", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            );
          })}
        </div>

        {partidos.length < MAX_PARTIDOS && (
          <button type="button" onClick={agregarPartido}
            className="w-full border-2 border-dashed border-gray-300 hover:border-amber-400 text-gray-500 hover:text-amber-600 py-3 rounded-xl text-sm font-medium transition-colors">
            + Agregar partido ({partidos.length}/{MAX_PARTIDOS})
          </button>
        )}

        {ligasUsadas.length > 1 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
            <p className="font-semibold">⚽ Quiniela mixta</p>
            <p className="text-xs mt-1 text-blue-500">
              {ligasUsadas.map((l) => `${LIGA_ICON[l] ?? "⚽"} ${l}`).join(" · ")}
            </p>
          </div>
        )}

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}

        <button type="submit" disabled={enviando || partidosValidos.length < MIN_PARTIDOS}
          className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors">
          {enviando
            ? "Creando..."
            : `Crear fecha (${partidosValidos.length} partidos · ${ligaJornada})`}
        </button>
      </form>
    </div>
  );
}
