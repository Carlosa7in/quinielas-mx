"use client";
import { useState } from "react";
import { JornadaSelector, type JornadaResumen } from "@/components/JornadaSelector";
import { LogoEquipo } from "@/components/LogoEquipo";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  liga: string;
  resultado: string | null;
  golesLocal: number | null;
  golesVisita: number | null;
  fechaHora: string | null;
};

type Jornada = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  estado: string;
  partidos: Partido[];
};

type EspnResultado = {
  equipoLocal: string;
  equipoVisita: string;
  golesLocal: number;
  golesVisita: number;
  resultado: "1" | "X" | "2";
  liga: string;
};

type EstadoPartido = {
  resultado: string;
  golesLocal: string;
  golesVisita: string;
  guardando: boolean;
  guardado: boolean;
  error: string;
};

type GanadorPremio = {
  folio: string;
  nombre: string | null;
  telefono: string | null;
  aciertos: number | null;
  premio: number;
};

type Premios = {
  totalRecaudado: number;
  bolsa1: number;
  bolsa2Total: number;
  segundoDistribuido: boolean;
  acumulaciones2: number;
  ganadores1: GanadorPremio[];
  ganadores2: GanadorPremio[];
  bolsa2Acumulada: number;
};

function normEspn(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function matchPartido(local: string, visita: string, lista: EspnResultado[]): EspnResultado | null {
  const nl = normEspn(local);
  const nv = normEspn(visita);
  for (const r of lista) {
    const rl = normEspn(r.equipoLocal);
    const rv = normEspn(r.equipoVisita);
    const localOk  = rl === nl || rl.includes(nl) || nl.includes(rl);
    const visitaOk = rv === nv || rv.includes(nv) || nv.includes(rv);
    if (localOk && visitaOk) return r;
  }
  return null;
}

const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function detectarResultado(gl: string, gv: string): string {
  const l = parseInt(gl);
  const v = parseInt(gv);
  if (isNaN(l) || isNaN(v) || gl === "" || gv === "") return "";
  return l > v ? "1" : l < v ? "2" : "X";
}

export default function ResultadosPage() {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [estados, setEstados] = useState<Record<string, EstadoPartido>>({});
  const [finalizada, setFinalizada] = useState(false);
  const [ganadoras, setGanadoras] = useState<{ folio: string; nombreCliente: string | null; aciertos: number | null }[]>([]);
  const [premios, setPremios] = useState<Premios | null>(null);
  const [importando, setImportando] = useState(false);
  const [importMsg, setImportMsg] = useState<{ texto: string; tipo: "ok" | "error" | "info" } | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [guardandoTodos, setGuardandoTodos] = useState(false);

  const cargarJornada = async (j: JornadaResumen) => {
    const res = await fetch(`/api/jornadas?id=${j.id}`);
    const data = await res.json();
    if (data.error) return;
    setJornada(data);
    if (data.estado === "finalizada") setFinalizada(true);
    const init: Record<string, EstadoPartido> = {};
    for (const p of data.partidos) {
      init[p.id] = {
        resultado: p.resultado ?? "",
        golesLocal: p.golesLocal?.toString() ?? "",
        golesVisita: p.golesVisita?.toString() ?? "",
        guardando: false,
        guardado: !!p.resultado,
        error: "",
      };
    }
    setEstados(init);
    // Partidos ya guardados empiezan colapsados
    setExpandidos(new Set());
  };

  const toggleExpand = (id: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const set = (partidoId: string, campo: keyof EstadoPartido, valor: string | boolean) => {
    setEstados((prev) => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], [campo]: valor },
    }));
  };

  // Actualiza goles y auto-detecta L/E/V en un solo setState
  const setGoles = (partidoId: string, campo: "golesLocal" | "golesVisita", valor: string) => {
    setEstados((prev) => {
      const e = prev[partidoId];
      const gl = campo === "golesLocal" ? valor : e.golesLocal;
      const gv = campo === "golesVisita" ? valor : e.golesVisita;
      const autoRes = detectarResultado(gl, gv);
      return {
        ...prev,
        [partidoId]: {
          ...e,
          [campo]: valor,
          resultado: autoRes || e.resultado,
          guardado: false,
        },
      };
    });
  };

  const guardar = async (partidoId: string): Promise<boolean> => {
    if (!jornada) return false;
    const e = estados[partidoId];
    if (!e?.resultado) return false;

    set(partidoId, "guardando", true);
    set(partidoId, "error", "");

    const res = await fetch("/api/admin/resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jornadaId: jornada.id,
        partidoId,
        resultado: e.resultado,
        golesLocal: parseInt(e.golesLocal) || 0,
        golesVisita: parseInt(e.golesVisita) || 0,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      set(partidoId, "error", data.error || "Error al guardar");
      set(partidoId, "guardando", false);
      return false;
    } else {
      set(partidoId, "guardado", true);
      if (data.finalizada) {
        setFinalizada(true);
        setGanadoras(data.ganadoras ?? []);
        if (data.premios) setPremios(data.premios);
      }
    }
    set(partidoId, "guardando", false);
    return true;
  };

  const guardarTodos = async () => {
    if (!jornada) return;
    const pendientes = jornada.partidos.filter((p) => {
      const e = estados[p.id];
      return e?.resultado && !e.guardado;
    });
    if (pendientes.length === 0) return;
    setGuardandoTodos(true);
    for (const p of pendientes) {
      await guardar(p.id);
    }
    setGuardandoTodos(false);
  };

  const importarEspn = async () => {
    if (!jornada) return;
    setImportando(true);
    setImportMsg(null);
    try {
      const ligasUnicas = [...new Set(jornada.partidos.map((p) => p.liga).filter(Boolean))];
      const ligasParam = ligasUnicas.join(",");

      const fechas = jornada.partidos
        .map((p) => p.fechaHora ? new Date(p.fechaHora).getTime() : null)
        .filter((t): t is number => t !== null);

      const pad = (n: number) => String(n).padStart(2, "0");
      const fmtDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

      let desdeStr = "";
      if (fechas.length > 0) {
        const minT = new Date(Math.min(...fechas)); minT.setDate(minT.getDate() - 1);
        const maxT = new Date(Math.max(...fechas)); maxT.setDate(maxT.getDate() + 2);
        desdeStr = `&desde=${fmtDate(minT)}&hasta=${fmtDate(maxT)}`;
      }

      const res = await fetch(`/api/espn-resultados?ligas=${encodeURIComponent(ligasParam)}${desdeStr}`);
      const data = await res.json();
      const espnLista: EspnResultado[] = data.resultados ?? [];

      if (espnLista.length === 0) {
        setImportMsg({ texto: "ESPN no devolvió resultados para este rango de fechas.", tipo: "info" });
        return;
      }

      let matched = 0;
      setEstados((prev) => {
        const next = { ...prev };
        for (const partido of jornada.partidos) {
          const r = matchPartido(partido.equipoLocal, partido.equipoVisita, espnLista);
          if (r) {
            matched++;
            next[partido.id] = {
              ...next[partido.id],
              resultado: r.resultado,
              golesLocal: String(r.golesLocal),
              golesVisita: String(r.golesVisita),
              guardado: false,
              error: "",
            };
          }
        }
        return next;
      });

      const noMatch = jornada.partidos.length - matched;
      setImportMsg({
        texto: `✅ ${matched} partido${matched !== 1 ? "s" : ""} importado${matched !== 1 ? "s" : ""}${noMatch > 0 ? ` · ${noMatch} sin match` : ""}. Revisa y usa "Guardar todos".`,
        tipo: matched > 0 ? "ok" : "error",
      });
    } catch (err) {
      setImportMsg({ texto: "Error al conectar con ESPN: " + String(err), tipo: "error" });
    } finally {
      setImportando(false);
    }
  };

  const resueltos = Object.values(estados).filter((e) => e.guardado).length;
  const total = jornada?.partidos.length ?? 0;
  const pendientesGuardar = jornada?.partidos.filter((p) => {
    const e = estados[p.id];
    return e?.resultado && !e.guardado;
  }).length ?? 0;

  if (!jornada) {
    return <JornadaSelector onSelect={cargarJornada} titulo="Registrar Resultados" />;
  }

  // ─── Pantalla final ───────────────────────────────────────────────────────
  if (finalizada && resueltos === total && total > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-brand text-white py-4 px-4">
          <div className="max-w-xl mx-auto">
            <h1 className="text-xl font-bold">🏆 Jornada Finalizada</h1>
            <p className="text-amber-300/70 text-sm mt-0.5">
              {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
            </p>
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

          {/* Resumen */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700 font-bold text-lg">Todos los resultados registrados</p>
            <p className="text-green-600 text-sm">{total} partidos · jornada cerrada</p>
          </div>

          {/* Premios breakdown */}
          {premios && (
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <p className="font-bold text-gray-700 text-sm uppercase tracking-wider">💰 Distribución de premios</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Cobrado</p>
                  <p className="font-bold text-gray-800">${fmt(premios.totalRecaudado)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Bolsa 1er</p>
                  <p className="font-bold text-amber-700">${fmt(premios.bolsa1)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Bolsa 2do</p>
                  <p className="font-bold text-blue-700">${fmt(premios.bolsa2Total)}</p>
                </div>
              </div>

              {/* Ganadores 1er lugar */}
              {premios.ganadores1.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
                    🥇 1er Lugar · {premios.ganadores1.length} ganador{premios.ganadores1.length !== 1 ? "es" : ""}
                  </p>
                  {premios.ganadores1.map((g) => (
                    <div key={g.folio} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 mb-1">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{g.nombre || "—"}</p>
                        <p className="text-xs font-mono text-gray-400">{g.folio}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-700">${fmt(g.premio)}</p>
                        <p className="text-xs text-gray-400">{g.aciertos} aciertos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ganadores 2do lugar */}
              {premios.ganadores2.length > 0 && premios.segundoDistribuido && (
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
                    🥈 2do Lugar · {premios.ganadores2.length} ganador{premios.ganadores2.length !== 1 ? "es" : ""}
                  </p>
                  {premios.ganadores2.map((g) => (
                    <div key={g.folio} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 mb-1">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{g.nombre || "—"}</p>
                        <p className="text-xs font-mono text-gray-400">{g.folio}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-700">${fmt(g.premio)}</p>
                        <p className="text-xs text-gray-400">{g.aciertos} aciertos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bolsa 2do acumulada */}
              {!premios.segundoDistribuido && premios.bolsa2Acumulada > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <p className="text-sm font-semibold text-orange-700">
                    🏦 Bolsa 2do acumulada → próxima jornada
                  </p>
                  <p className="text-lg font-bold text-orange-600">${fmt(premios.bolsa2Acumulada)}</p>
                  <p className="text-xs text-orange-500">Acumulación #{premios.acumulaciones2}</p>
                </div>
              )}

              {/* Sin ganadores */}
              {premios.ganadores1.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-2">No hubo ganadores esta jornada</p>
              )}
            </div>
          )}

          {/* Fallback si no hay premios (jornadas viejas) */}
          {!premios && ganadoras.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-bold text-yellow-800 mb-3">Ganadores ({ganadoras.length})</h3>
              {ganadoras.map((g) => (
                <div key={g.folio} className="bg-white rounded-lg p-3 mb-2">
                  <p className="font-bold text-gray-800">{g.nombreCliente || "—"}</p>
                  <p className="text-xs font-mono text-gray-500">{g.folio}</p>
                  <p className="text-green-600 text-sm font-bold">{g.aciertos} aciertos</p>
                </div>
              ))}
            </div>
          )}

          {!premios && ganadoras.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-gray-600">No hubo ganadores esta jornada</p>
            </div>
          )}

          <a
            href={`/resultados/${jornada.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors"
          >
            📊 Ver cuadrícula de resultados
          </a>
          <a
            href="/admin"
            className="block w-full text-center bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Volver al admin
          </a>
        </div>
      </div>
    );
  }

  // ─── Página principal ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-brand text-white shadow-md">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <a href="/admin" className="text-amber-400 text-xs">← Admin</a>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-base font-bold leading-tight truncate">Resultados</h1>
              {jornada && (
                <span className="text-amber-300/70 text-xs truncate">
                  {jornada.nombre ?? `J${jornada.numero}`}
                </span>
              )}
            </div>
          </div>
          {/* Progreso compacto */}
          {total > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-xs text-amber-300">
                  <span className="font-bold text-white">{resueltos}</span>/{total}
                </p>
                <div className="w-20 bg-white/20 rounded-full h-1.5 mt-0.5">
                  <div
                    className="bg-green-400 h-1.5 rounded-full transition-all"
                    style={{ width: `${(resueltos / total) * 100}%` }}
                  />
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-tablitas.png" alt="" style={{ height: "32px", objectFit: "contain" }} />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">

        {/* Barra de acciones */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={importarEspn}
              disabled={importando}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              {importando ? <>⏳ Consultando...</> : <>📡 Importar ESPN</>}
            </button>
            {pendientesGuardar > 0 && (
              <button
                onClick={guardarTodos}
                disabled={guardandoTodos}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                {guardandoTodos
                  ? <>⏳ Guardando...</>
                  : <>💾 Guardar todos ({pendientesGuardar})</>}
              </button>
            )}
          </div>

          {importMsg && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
              importMsg.tipo === "ok"    ? "bg-green-50 text-green-700 border border-green-200" :
              importMsg.tipo === "error" ? "bg-red-50 text-red-700 border border-red-200" :
                                          "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              {importMsg.texto}
            </div>
          )}
        </div>

        {/* Partidos */}
        {jornada?.partidos.map((partido) => {
          const e = estados[partido.id];
          if (!e) return null;
          const estaExpandido = expandidos.has(partido.id);

          // ── Card compacta (guardado y no expandido) ──
          if (e.guardado && !estaExpandido) {
            const resLabel = e.resultado === "1" ? "Local" : e.resultado === "2" ? "Visita" : "Empate";
            return (
              <button
                key={partido.id}
                type="button"
                onClick={() => toggleExpand(partido.id)}
                className="w-full bg-white rounded-xl border-2 border-amber-200 px-4 py-3 flex items-center gap-3 hover:bg-amber-50 transition-colors text-left"
              >
                <LogoEquipo equipo={partido.equipoLocal} size={24} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 truncate">
                    {partido.equipoLocal} <span className="text-gray-400">vs</span> {partido.equipoVisita}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-gray-800 tabular-nums">
                    {e.golesLocal} – {e.golesVisita}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    e.resultado === "1" ? "bg-amber-100 text-amber-700" :
                    e.resultado === "2" ? "bg-blue-100 text-blue-700" :
                                         "bg-gray-100 text-gray-600"
                  }`}>
                    {resLabel}
                  </span>
                  <span className="text-green-500 text-xs">✓</span>
                </div>
                <LogoEquipo equipo={partido.equipoVisita} size={24} />
              </button>
            );
          }

          // ── Card expandida (sin guardar o en edición) ──
          return (
            <div
              key={partido.id}
              className={`bg-white rounded-xl p-4 border-2 transition-colors ${
                e.guardado ? "border-amber-200" : "border-transparent"
              }`}
            >
              {/* Botón colapsar si ya estaba guardado */}
              {e.guardado && estaExpandido && (
                <button
                  onClick={() => toggleExpand(partido.id)}
                  className="w-full text-xs text-gray-400 hover:text-gray-600 mb-3 text-right"
                >
                  ▲ Colapsar
                </button>
              )}

              {/* Logos y nombres */}
              <div className="flex flex-col items-center mb-3 gap-1">
                <div className="flex items-center justify-center gap-3 w-full">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <LogoEquipo equipo={partido.equipoLocal} size={40} />
                    <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{partido.equipoLocal}</span>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-gray-400 text-xs font-bold">VS</span>
                    {e.guardado && (
                      <span className="text-green-600 text-[10px] font-bold bg-green-50 px-1.5 py-0.5 rounded-full mt-1">✓</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <LogoEquipo equipo={partido.equipoVisita} size={40} />
                    <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{partido.equipoVisita}</span>
                  </div>
                </div>
                {partido.fechaHora && (
                  <p className="text-xs text-gray-400">
                    🕐{" "}
                    {new Date(partido.fechaHora).toLocaleDateString("es-MX", {
                      weekday: "short", day: "numeric", month: "short", timeZone: "America/Mexico_City",
                    })}{" "}
                    {new Date(partido.fechaHora).toLocaleTimeString("es-MX", {
                      hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
                    })}
                  </p>
                )}
              </div>

              {/* Marcador — va primero para auto-detectar resultado */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={e.golesLocal}
                  onChange={(ev) => setGoles(partido.id, "golesLocal", ev.target.value)}
                  className="w-16 h-12 border border-gray-200 rounded-xl text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-gray-300 font-bold text-xl">–</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={e.golesVisita}
                  onChange={(ev) => setGoles(partido.id, "golesVisita", ev.target.value)}
                  className="w-16 h-12 border border-gray-200 rounded-xl text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Botones resultado — se sincronizan con el marcador */}
              <div className="flex gap-2 mb-3">
                {[
                  { val: "1", label: "L · Local" },
                  { val: "X", label: "E · Empate" },
                  { val: "2", label: "V · Visita" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      set(partido.id, "resultado", val);
                      set(partido.id, "guardado", false);
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      e.resultado === val
                        ? "bg-amber-700 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {e.error && (
                <p className="text-red-600 text-xs mb-2">{e.error}</p>
              )}

              <button
                onClick={() => guardar(partido.id)}
                disabled={!e.resultado || e.guardando}
                className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm transition-colors"
              >
                {e.guardando ? "Guardando..." : e.guardado ? "Actualizar resultado" : "Guardar resultado"}
              </button>
            </div>
          );
        })}

        {resueltos > 0 && resueltos < total && (
          <p className="text-xs text-yellow-600 text-center py-1">
            Los aciertos parciales ya son visibles para los participantes
          </p>
        )}
      </div>
    </div>
  );
}
