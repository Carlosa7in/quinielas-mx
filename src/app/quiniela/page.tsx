"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoEquipo } from "@/components/LogoEquipo";
import { RegistroCerrado } from "@/components/RegistroCerrado";
import { calcularFechaCierre } from "@/lib/fechas";

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

// picks por forma: partidoId → opciones seleccionadas
type FormaPicks = Record<string, string[]>;

const LIGA_ICON: Record<string, string> = {
  "Liga MX": "🇲🇽",
  "Champions League": "⭐",
  "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "La Liga": "🇪🇸",
  "Mixta": "⚽",
};

const OPCIONES = ["1", "X", "2"] as const;
const LABELS: Record<string, string> = { "1": "L", X: "E", "2": "V" };

// Rellena picks vacíos con UN resultado aleatorio (el usuario puede agregar más manualmente)
function rellenarAzar(partidos: Partido[], picks: FormaPicks): FormaPicks {
  const next = { ...picks };
  for (const p of partidos) {
    if (!next[p.id] || next[p.id].length === 0) {
      next[p.id] = [OPCIONES[Math.floor(Math.random() * 3)]];
    }
  }
  return next;
}

function combosDeForma(partidos: Partido[], picks: FormaPicks): number {
  return partidos.reduce((prod, p) => prod * (picks[p.id]?.length || 1), 1);
}

function formaCompleta(partidos: Partido[], picks: FormaPicks): boolean {
  return partidos.every((p) => (picks[p.id]?.length ?? 0) > 0);
}

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
        // Auto-seleccionar solo si hay una jornada Y su registro NO está cerrado
        if (activas.length === 1) {
          const j = activas[0];
          const cerrada = j.primerPartidoFecha
            ? new Date() >= new Date(j.primerPartidoFecha)
            : false;
          if (!cerrada) cargarJornada(j, onSelect);
        }
      })
      .catch(() => {})
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

        <div className="space-y-3">
          {filtradas.map((j) => {
            const cerrada = j.primerPartidoFecha
              ? new Date() >= new Date(j.primerPartidoFecha)
              : false;

            // Fecha de cierre formateada
            const fechaCierre = j.primerPartidoFecha
              ? new Date(j.primerPartidoFecha).toLocaleDateString("es-MX", {
                  weekday: "short", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })
              : null;

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
                  <div className="flex flex-col gap-1 text-xs text-gray-400">
                    <div className="flex gap-3">
                      <span>⚽ {j.totalPartidos ?? "?"} partidos</span>
                      <span>🎯 {j.totalQuinielas ?? 0} inscritos</span>
                    </div>
                    {fechaCierre && (
                      <span className={cerrada ? "text-red-400" : "text-amber-600 font-medium"}>
                        🕐 {cerrada ? "Cerró" : "Cierra"} el {fechaCierre}
                      </span>
                    )}
                  </div>
                  {!cerrada && <span className="text-yellow-600 font-bold text-sm shrink-0">$20 MXN</span>}
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
function QuinielaInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jornadaParam = searchParams.get("jornada");
  const [jornada, setJornada] = useState<Jornada | null>(null);

  // Auto-cargar jornada si viene por URL param
  useEffect(() => {
    if (!jornadaParam || jornada) return;
    fetch(`/api/jornadas?id=${jornadaParam}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setJornada(data); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornadaParam]);

  // Múltiples formas — cada una con picks independientes
  const [formas, setFormas] = useState<FormaPicks[]>([{}]);
  const [formaActiva, setFormaActiva] = useState(0);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [metodoPago, setMetodoPago] = useState<"transferencia" | "oxxo">("transferencia");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // Fecha de cierre usando la función canónica
  const fechaCierreObj = jornada
    ? (() => {
        const fechas = jornada.partidos
          .map((p) => p.fechaHora ? new Date(p.fechaHora) : null)
          .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
        if (fechas.length === 0) return null;
        const primera = new Date(Math.min(...fechas.map((d) => d.getTime())));
        return calcularFechaCierre(primera);
      })()
    : null;
  const primerPartidoISO = fechaCierreObj ? fechaCierreObj.toISOString() : null;
  const cuentaRegresiva = useCuentaRegresiva(primerPartidoISO);
  const registroCerrado = fechaCierreObj ? new Date() >= fechaCierreObj : false;

  if (!jornada) return <SelectorJornada onSelect={setJornada} />;

  // Bloquear ANTES de mostrar el formulario
  if (registroCerrado && fechaCierreObj) {
    return (
      <RegistroCerrado
        jornada={jornada}
        fechaCierre={fechaCierreObj}
        onBack={() => { setJornada(null); setFormas([{}]); setFormaActiva(0); }}
        onReabrir={(jornadaActualizada) => { setJornada(jornadaActualizada as unknown as Jornada); setFormas([{}]); setFormaActiva(0); }}
      />
    );
  }

  const partidos = [...jornada.partidos].sort((a, b) => a.orden - b.orden);

  /* ── Formas helpers ── */
  const agregarForma = () => {
    if (formas.length >= 10) return;
    setFormas((prev) => [...prev, {}]);
    setFormaActiva(formas.length);
  };

  const quitarForma = () => {
    if (formas.length <= 1) return;
    setFormas((prev) => prev.slice(0, -1));
    setFormaActiva((prev) => Math.min(prev, formas.length - 2));
  };

  const togglePick = (formaIdx: number, partidoId: string, opcion: string) => {
    if (registroCerrado) return;
    setFormas((prev) => {
      const next = [...prev];
      const current = next[formaIdx][partidoId] ?? [];
      const newSel = current.includes(opcion)
        ? current.filter((o) => o !== opcion)
        : [...current, opcion];
      if (newSel.length === 0) {
        const { [partidoId]: _, ...rest } = next[formaIdx];
        next[formaIdx] = rest;
      } else {
        next[formaIdx] = { ...next[formaIdx], [partidoId]: newSel };
      }
      return next;
    });
  };

  const rellenarForma = (idx: number) => {
    setFormas((prev) => {
      const next = [...prev];
      next[idx] = rellenarAzar(partidos, next[idx]);
      return next;
    });
  };

  const rellenarTodas = () => {
    setFormas((prev) => prev.map((f) => rellenarAzar(partidos, f)));
  };

  const limpiarForma = (idx: number) => {
    setFormas((prev) => { const next = [...prev]; next[idx] = {}; return next; });
  };

  /* ── Totales ── */
  const combosTotal = formas.reduce((sum, f) => sum + combosDeForma(partidos, f), 0);
  const totalPagar = combosTotal * 20;
  const todasCompletas = formas.every((f) => formaCompleta(partidos, f));

  const picks = formas[formaActiva] ?? {};
  const combosActiva = combosDeForma(partidos, picks);

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todasCompletas || !nombre || registroCerrado) return;
    setEnviando(true);
    setError("");

    const foliosTodos: string[] = [];

    for (const formaPicks of formas) {
      const picksArr = Object.entries(formaPicks).map(([partidoId, predicciones]) => ({
        partidoId,
        predicciones,
      }));

      const res = await fetch("/api/quinielas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jornadaId: jornada.id,
          picks: picksArr,
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
      foliosTodos.push(...(data.folios ?? [data.folio]));
    }

    // Guardar todos los folios para generación multi-imagen en el ticket
    sessionStorage.setItem("lastRegistro", JSON.stringify({
      folios: foliosTodos,
      formas: formas.length,
    }));

    // Guardar en localStorage para recuperar pago si se cierra el navegador
    // Solo aplica para pagos online (transferencia/OXXO), no para tienda
    if (metodoPago === "transferencia" || metodoPago === "oxxo") {
      const pendientes: { folio: string; nombre: string; monto: number; jornada: string; ts: number }[] =
        JSON.parse(localStorage.getItem("quinielasPendientes") ?? "[]");
      for (const f of foliosTodos) {
        pendientes.push({
          folio: f,
          nombre,
          monto: 20,
          jornada: jornada.nombre ?? `Jornada ${jornada.numero}`,
          ts: Date.now(),
        });
      }
      localStorage.setItem("quinielasPendientes", JSON.stringify(pendientes));
    }

    const total = foliosTodos.length;
    const params = new URLSearchParams();
    if (total > 1) { params.set("total", String(total)); params.set("formas", String(formas.length)); }
    const qs = params.toString();
    router.push(`/ticket/${foliosTodos[0]}${qs ? `?${qs}` : ""}`);
  };

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-5 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => { setJornada(null); setFormas([{}]); setFormaActiva(0); }}
            className="text-amber-400 text-sm mb-1 inline-block"
          >
            ← Cambiar jornada
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {jornada.nombre ?? `Jornada ${jornada.numero}`}
              </h1>
              <p className="text-amber-300/70 text-sm">
                {LIGA_ICON[jornada.liga] ?? "⚽"} {jornada.liga} · {jornada.temporada}
              </p>
            </div>
            <div className="text-right">
              <p className="text-yellow-300 font-bold text-xl">${totalPagar}</p>
              <p className="text-amber-400 text-xs">
                {formas.length} quiniela{formas.length !== 1 ? "s" : ""}
                {combosTotal > formas.length && (
                  <span className="ml-1 opacity-70">· {combosTotal} combos</span>
                )}
              </p>
            </div>
          </div>

          {/* Fecha de cierre + cuenta regresiva */}
          {registroCerrado ? (
            <div className="mt-3 bg-red-900/60 border border-red-500/40 rounded-xl px-4 py-2 flex items-center gap-2">
              <span>🔒</span>
              <p className="text-sm font-semibold text-red-200">Registro cerrado — el primer partido ya comenzó</p>
            </div>
          ) : primerPartidoISO ? (
            <div className="mt-3 bg-amber-900/50 border border-amber-400/30 rounded-xl px-4 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-300/80 font-semibold uppercase tracking-wide">
                  🕐 Se cierra el
                </span>
                <span className="text-xs text-amber-200 font-medium">
                  {new Date(primerPartidoISO).toLocaleDateString("es-MX", {
                    weekday: "long", day: "numeric", month: "long",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              {cuentaRegresiva && cuentaRegresiva.diff < 24 * 3_600_000 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-300/80 font-semibold uppercase tracking-wide">⚡ Faltan</span>
                  <span className="font-black text-yellow-300 tabular-nums text-lg">
                    {String(cuentaRegresiva.h).padStart(2, "0")}:
                    {String(cuentaRegresiva.m).padStart(2, "0")}:
                    {String(cuentaRegresiva.s).padStart(2, "0")}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* ── Datos del jugador ── */}
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
            placeholder="Teléfono (para consultar tus boletos después)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* ── Barra de formas ── */}
        {!registroCerrado && (
          <div className="bg-white rounded-xl shadow-sm p-3 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-600">Boletos:</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={quitarForma} disabled={formas.length <= 1}
                  className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-lg disabled:opacity-30 hover:bg-red-200 transition-colors">−</button>
                <span className="w-7 text-center font-bold text-gray-800 text-lg">{formas.length}</span>
                <button type="button" onClick={agregarForma} disabled={formas.length >= 10}
                  className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg disabled:opacity-30 hover:bg-green-200 transition-colors">+</button>
              </div>
              <button type="button" onClick={rellenarTodas}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors">
                🎲 Rellenar todas al azar
              </button>
            </div>

            {/* Fecha de cierre debajo del contador */}
            {primerPartidoISO && (
              <p className="text-xs text-center text-gray-400">
                🕐 Se cierra el{" "}
                <span className="font-semibold text-amber-600">
                  {new Date(primerPartidoISO).toLocaleDateString("es-MX", {
                    weekday: "long", day: "numeric", month: "long",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </p>
            )}

            {/* Tabs cuando hay más de uno */}
            {formas.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {formas.map((f, i) => {
                  const completa = formaCompleta(partidos, f);
                  const combos   = combosDeForma(partidos, f);
                  return (
                    <button key={i} type="button" onClick={() => setFormaActiva(i)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        formaActiva === i
                          ? "bg-amber-700 text-white"
                          : completa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                      Boleto {i + 1}
                      {completa && formaActiva !== i && (
                        <span className="ml-1 opacity-70">{combos > 1 ? `×${combos}` : "✓"}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Picks de la forma activa ── */}
        <div className="bg-white rounded-xl shadow-sm">
          {/* Cabecera */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">
              {formas.length > 1 ? `Boleto ${formaActiva + 1}` : "Pronósticos"}{" "}
              <span className="text-amber-600 font-normal text-sm">
                ({Object.keys(picks).filter(k => (picks[k]?.length ?? 0) > 0).length}/{partidos.length})
              </span>
              {combosActiva > 1 && (
                <span className="ml-2 text-xs font-bold text-orange-600">{combosActiva} combos</span>
              )}
            </h2>
            {!registroCerrado && (
              <div className="flex gap-2">
                <button type="button" onClick={() => rellenarForma(formaActiva)}
                  className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                  🎲 Azar
                </button>
                <button type="button" onClick={() => limpiarForma(formaActiva)}
                  className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                  Limpiar
                </button>
              </div>
            )}
          </div>

          {/* Lista compacta */}
          {partidos.map((partido) => {
            const sel      = picks[partido.id] ?? [];
            const esDoble  = sel.length === 2;
            const esTriple = sel.length === 3;
            return (
              <div key={partido.id}
                className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-1.5 flex-1 text-sm min-w-0">
                  <LogoEquipo equipo={partido.equipoLocal} size={24} />
                  <span className="font-medium truncate">{partido.equipoLocal}</span>
                  <span className="text-gray-400 shrink-0 text-xs">vs</span>
                  <LogoEquipo equipo={partido.equipoVisita} size={24} />
                  <span className="font-medium truncate">{partido.equipoVisita}</span>
                  {esDoble && (
                    <span className="shrink-0 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">DOBLE</span>
                  )}
                  {esTriple && (
                    <span className="shrink-0 text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">TRIPLE</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {OPCIONES.map((op) => (
                    <button key={op} type="button"
                      onClick={() => togglePick(formaActiva, partido.id, op)}
                      disabled={registroCerrado}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                        sel.includes(op)
                          ? "bg-amber-700 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed"
                      }`}>
                      {LABELS[op]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Precio de esta forma si tiene combos */}
          {combosActiva > 1 && (
            <div className="px-4 py-2.5 flex justify-between items-center border-t border-gray-100">
              <span className="text-xs text-gray-400">{combosActiva} combinaciones × $20</span>
              <span className="text-sm font-bold text-amber-700">${combosActiva * 20}</span>
            </div>
          )}
        </div>

        {/* ── Método de pago ── */}
        {!registroCerrado && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-700 mb-3">¿Cómo vas a pagar?</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMetodoPago("transferencia")}
                className={`rounded-xl p-3 text-center border-2 transition-colors ${
                  metodoPago === "transferencia" ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                <p className="text-2xl mb-1">🏦</p>
                <p className="text-sm font-semibold text-gray-800">Transferencia</p>
                <p className="text-xs text-gray-400">SPEI / Banca en línea</p>
              </button>
              <button type="button" onClick={() => setMetodoPago("oxxo")}
                className={`rounded-xl p-3 text-center border-2 transition-colors ${
                  metodoPago === "oxxo" ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                <p className="text-2xl mb-1">🏪</p>
                <p className="text-sm font-semibold text-gray-800">Depósito OXXO</p>
                <p className="text-xs text-gray-400">Efectivo en cualquier OXXO</p>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Recibirás los datos bancarios en el ticket
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg p-3">{error}</p>
        )}

        {/* ── Botón de registro ── */}
        {registroCerrado ? (
          <div className="bg-brand text-white rounded-xl p-4 text-center">
            <p className="text-red-300 font-semibold">🔒 Registro cerrado</p>
            <p className="text-amber-300/60 text-xs mt-1">El primer partido ya comenzó.</p>
          </div>
        ) : (
          <button type="submit"
            disabled={!todasCompletas || !nombre || enviando}
            className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-lg">
            {enviando
              ? "Registrando..."
              : todasCompletas && nombre
              ? `Registrar ${formas.length} quiniela${formas.length !== 1 ? "s" : ""} · $${totalPagar}`
              : !nombre
              ? "Ingresa tu nombre para continuar"
              : `Faltan picks en ${formas.filter(f => !formaCompleta(partidos, f)).length} boleto${formas.filter(f => !formaCompleta(partidos, f)).length !== 1 ? "s" : ""}`}
          </button>
        )}

        <div className="pb-6" />
      </form>
    </div>
  );
}

export default function QuinielaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Cargando...</p></div>}>
      <QuinielaInner />
    </Suspense>
  );
}
