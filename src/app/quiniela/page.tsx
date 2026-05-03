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
  primerPartidoFecha?: string | null;
};

const LIGA_ICON: Record<string, string> = {
  "Liga MX": "🇲🇽",
  "Champions League": "⭐",
  "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "La Liga": "🇪🇸",
  "Mixta": "⚽",
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
      })
      .catch(() => {/* sin jornadas — el estado vacío se muestra abajo */})
      .finally(() => setCargando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarJornada = async (j: Jornada, cb: (jornada: Jornada) => void) => {
    const res = await fetch(`/api/jornadas?id=${j.id}`);
    const data = await res.json();
    if (!data.error) cb(data);
  };

  const LIGA_ORDEN: Record<string, number> = { "Liga MX": 0, "Champions League": 1, "Premier League": 2, "La Liga": 3, "Mixta": 4 };
  const ligas = [...new Set(jornadas.map((j) => j.liga))]
    .sort((a, b) => (LIGA_ORDEN[a] ?? 9) - (LIGA_ORDEN[b] ?? 9));
  const filtradas = jornadas.filter((j) => j.liga === ligaActiva);

  if (cargando) {
    return (
      <div className="min-h-screen bg-brand flex items-center justify-center">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" className="mx-auto mb-4 animate-pulse" style={{ height: "110px", objectFit: "contain" }} />
          <p className="text-amber-300/70 text-sm">Cargando jornadas...</p>
        </div>
      </div>
    );
  }

  if (jornadas.length === 0) {
    return (
      <div className="min-h-screen bg-brand flex items-center justify-center text-white px-4">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" className="mx-auto mb-4 opacity-60" style={{ height: "90px", objectFit: "contain" }} />
          <h2 className="text-xl font-bold mb-2">No hay jornadas abiertas</h2>
          <p className="text-amber-300/60 text-sm">Vuelve pronto, pronto habrá una nueva jornada.</p>
          <a href="/" className="mt-6 inline-block text-yellow-300 underline">← Inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div>
            <a href="/" className="text-amber-400 text-sm mb-1 inline-block">← Inicio</a>
            <h1 className="text-2xl font-bold">Registrar Quiniela</h1>
            <p className="text-amber-300/70 text-sm">Elige la jornada en la que quieres participar</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "52px", objectFit: "contain", flexShrink: 0 }} />
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
                  ligaActiva === liga ? "bg-amber-700 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {LIGA_ICON[liga] ?? "⚽"} {liga}
              </button>
            ))}
          </div>
        )}

        {/* Tarjetas de jornadas */}
        <div className="space-y-3">
          {filtradas.map((j) => {
            const cerrada = j.primerPartidoFecha
              ? new Date() >= new Date(j.primerPartidoFecha)
              : false;

            return (
              <button
                key={j.id}
                onClick={() => !cerrada && cargarJornada(j, onSelect)}
                disabled={cerrada}
                className={`w-full bg-white rounded-2xl shadow-sm p-5 text-left border-2 transition-all ${
                  cerrada
                    ? "opacity-60 cursor-not-allowed border-gray-200"
                    : "hover:shadow-md hover:border-amber-300 border-transparent"
                }`}
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
                  {cerrada
                    ? <span className="text-red-400 text-sm font-semibold">🔒 Cerrada</span>
                    : <span className="text-amber-600 font-bold text-xl">→</span>
                  }
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>⚽ {j.totalPartidos ?? "?"} partidos</span>
                    <span>🎯 {j.totalQuinielas ?? 0} inscritos</span>
                  </div>
                  {!cerrada && <span className="text-yellow-600 font-bold text-sm">$20 MXN</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Cuenta regresiva ─── */
function useCuentaRegresiva(fechaISO: string | null) {
  const calcular = () => {
    if (!fechaISO) return null;
    const diff = new Date(fechaISO).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, diff };
  };

  const [restante, setRestante] = useState(calcular);

  useEffect(() => {
    const t = setInterval(() => setRestante(calcular()), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaISO]);

  return restante;
}

/* ─── Formulario de picks ─── */
export default function QuinielaPage() {
  const router = useRouter();
  const [jornada, setJornada] = useState<Jornada | null>(null);
  // picks: múltiples opciones por partido (reventado)
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [cantidad, setCantidad] = useState(1);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [metodoPago, setMetodoPago] = useState<"transferencia" | "oxxo">("transferencia");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const BASE_PRICE = 20;

  // Partido más próximo = fecha límite
  const primerPartidoISO = jornada
    ? jornada.partidos.reduce((min, p) =>
        !min || p.fechaHora < min ? p.fechaHora : min, "")
    : null;

  const cuentaRegresiva = useCuentaRegresiva(primerPartidoISO);
  const registroCerrado = primerPartidoISO
    ? new Date() >= new Date(primerPartidoISO)
    : false;

  // Toggle: seleccionar o deseleccionar una opción por partido
  const togglePick = (partidoId: string, opcion: string) => {
    if (registroCerrado) return;
    setPicks((prev) => {
      const current = prev[partidoId] ?? [];
      if (current.includes(opcion)) {
        const next = current.filter((o) => o !== opcion);
        if (next.length === 0) {
          const { [partidoId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [partidoId]: next };
      }
      return { ...prev, [partidoId]: [...current, opcion] };
    });
  };

  const picksCompletos = jornada
    ? jornada.partidos.every((p) => (picks[p.id]?.length ?? 0) > 0)
    : false;

  // Número de combinaciones = producto de selecciones por partido
  const combinaciones = jornada && picksCompletos
    ? jornada.partidos.reduce((prod, p) => prod * (picks[p.id]?.length ?? 1), 1)
    : picksCompletos ? 1 : 0;

  const precioCombos  = combinaciones * BASE_PRICE;   // por un juego
  const totalPagar    = precioCombos * cantidad;       // con cantidad

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
        picks: Object.entries(picks).map(([partidoId, predicciones]) => ({
          partidoId,
          predicciones,
        })),
        cantidad,
        nombre,
        telefono,
        canal: metodoPago,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al registrar");
      setEnviando(false);
      return;
    }

    const total = data.folios?.length ?? 1;
    const primerFolio = data.folios?.[0] ?? data.folio;
    router.push(`/ticket/${primerFolio}${total > 1 ? `?total=${total}` : ""}`);
  };

  // Mostrar selector si no hay jornada elegida
  if (!jornada) {
    return <SelectorJornada onSelect={setJornada} />;
  }

  const partidosOrdenados = [...jornada.partidos].sort((a, b) => a.orden - b.orden);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => { setJornada(null); setPicks({}); setCantidad(1); }}
            className="text-amber-400 text-sm mb-2 inline-block"
          >
            ← Cambiar jornada
          </button>
          <h1 className="text-2xl font-bold">Registrar Quiniela</h1>
          <p className="text-amber-300/70 text-sm">
            {LIGA_ICON[jornada.liga] ?? "⚽"} {jornada.liga} · {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
          </p>

          {/* Cuenta regresiva / cierre */}
          {registroCerrado ? (
            <div className="mt-3 bg-red-900/60 border border-red-500/40 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <p className="text-sm font-semibold text-red-200">Registro cerrado — el primer partido ya comenzó</p>
            </div>
          ) : cuentaRegresiva && cuentaRegresiva.diff < 24 * 3_600_000 ? (
            <div className="mt-3 bg-amber-900/50 border border-amber-400/30 rounded-xl px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-amber-300/80 font-semibold uppercase tracking-wide">⏱ Cierra en</span>
              <span className="font-black text-yellow-300 tabular-nums text-lg">
                {String(cuentaRegresiva.h).padStart(2, "0")}:
                {String(cuentaRegresiva.m).padStart(2, "0")}:
                {String(cuentaRegresiva.s).padStart(2, "0")}
              </span>
            </div>
          ) : null}
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
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="tel"
            placeholder="Teléfono (opcional, para consultar después)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-xs text-gray-400">
            Con tu teléfono podrás consultar tus quinielas fácilmente
          </p>
        </div>

        {/* Partidos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-semibold text-gray-700">
              Pronósticos{" "}
              <span className="text-amber-600 font-normal text-sm">
                ({Object.keys(picks).length}/{partidosOrdenados.length})
              </span>
            </h2>
            <p className="text-xs text-gray-400">Puedes marcar 1, 2 ó 3 opciones</p>
          </div>

          {partidosOrdenados.map((partido) => {
            const sel = picks[partido.id] ?? [];
            const badge = sel.length === 2 ? "DOBLE" : sel.length === 3 ? "TRIPLE" : null;
            return (
              <div key={partido.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">
                    {new Date(partido.fechaHora).toLocaleDateString("es-MX", {
                      weekday: "short", day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  {badge && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      badge === "TRIPLE"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {badge}
                    </span>
                  )}
                </div>

                {/* Equipos */}
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

                {/* Botones toggle — se pueden seleccionar varios */}
                <div className="flex gap-2">
                  {(["1", "X", "2"] as const).map((opcion) => {
                    const activo = sel.includes(opcion);
                    return (
                      <button
                        key={opcion}
                        type="button"
                        onClick={() => togglePick(partido.id, opcion)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                          activo
                            ? "bg-green-600 text-white shadow ring-2 ring-green-400 ring-offset-1"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {opcion === "1" ? "L · Local" : opcion === "2" ? "V · Visita" : "E · Empate"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Método de pago */}
        {!registroCerrado && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-700 mb-3">¿Cómo vas a pagar?</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago("transferencia")}
                className={`rounded-xl p-3 text-center border-2 transition-colors ${
                  metodoPago === "transferencia"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-2xl mb-1">🏦</p>
                <p className="text-sm font-semibold text-gray-800">Transferencia</p>
                <p className="text-xs text-gray-400">SPEI / Banca en línea</p>
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago("oxxo")}
                className={`rounded-xl p-3 text-center border-2 transition-colors ${
                  metodoPago === "oxxo"
                    ? "border-amber-500 bg-amber-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-2xl mb-1">🏪</p>
                <p className="text-sm font-semibold text-gray-800">Depósito OXXO</p>
                <p className="text-xs text-gray-400">Efectivo en cualquier OXXO</p>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Ambos usan la misma CLABE — recibirás los datos en el ticket
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg p-3">{error}</p>
        )}

        {/* Resumen y envío */}
        <div className="bg-brand text-white rounded-xl p-4">
          {registroCerrado ? (
            <div className="text-center py-2">
              <p className="text-red-300 font-semibold text-sm">🔒 Registro cerrado</p>
              <p className="text-amber-300/60 text-xs mt-1">El primer partido ya comenzó. No se aceptan más quinielas.</p>
            </div>
          ) : (
            <>
              {/* Precio dinámico */}
              <div className="bg-white/10 rounded-xl p-3 mb-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-200">Precio base</span>
                  <span>${BASE_PRICE} MXN</span>
                </div>
                {combinaciones > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-200">Combinaciones</span>
                    <span className="font-semibold text-yellow-300">× {combinaciones}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-white/20 pt-1.5">
                  <span className="text-amber-200">Por juego</span>
                  <span className="font-bold">${precioCombos} MXN</span>
                </div>
              </div>

              {/* Selector de cantidad */}
              <div className="mb-4">
                <p className="text-sm text-amber-200 mb-2">Cantidad de boletos</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCantidad(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                        cantidad === n
                          ? "bg-yellow-400 text-amber-950"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-amber-200 text-sm">Total a pagar</span>
                <span className="text-yellow-300 font-black text-2xl">${totalPagar} MXN</span>
              </div>

              <button
                type="submit"
                disabled={!picksCompletos || !nombre || enviando}
                className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-500 disabled:cursor-not-allowed text-amber-950 font-bold py-3 rounded-xl transition-colors text-lg"
              >
                {enviando
                  ? "Registrando..."
                  : `Registrar ${cantidad > 1 ? `${cantidad} boletos` : "Quiniela"} · $${totalPagar}`}
              </button>
              {!picksCompletos && (
                <p className="text-amber-400 text-xs text-center mt-2">
                  Selecciona todos los partidos para continuar
                </p>
              )}
            </>
          )}
        </div>

        <div className="pb-6" />
      </form>
    </div>
  );
}
