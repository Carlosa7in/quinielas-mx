"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { LIGA_ICON, getLogoUrl } from "@/lib/equipos";
import DesgloseCobrado from "@/components/DesgloseCobrado";
import LoadingScreen from "@/components/LoadingScreen";

type PickDist = { total: number; L: number; E: number; V: number; pctL: number; pctE: number; pctV: number };

type Partido = {
  id: string; equipoLocal: string; equipoVisita: string;
  resultado: string | null; golesLocal: number | null; golesVisita: number | null;
  orden: number; fechaHora: string | null;
  sofaId: string | null;
  picks: PickDist;
};

type Stats = {
  totalQuinielas: number; recaudado: number; ventas: number; pendientes: number; ganadoras: number;
  porCanal: { tienda: number; online: number };
};

type ResultadoRow = { folio: string; nombre: string; aciertos: number; puntos: number; estado: string };

type JornadaDetalle = {
  id: string; numero: number; nombre: string | null;
  temporada: string; liga: string; estado: string;
  partidos: Partido[]; stats: Stats;
  tablaResultados: ResultadoRow[];
};

const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function SofaIdInput({ partidoId, inicial }: { partidoId: string; inicial: string | null }) {
  const [valor, setValor] = useState(inicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(!!inicial);

  const guardar = async () => {
    setGuardando(true);
    const res = await fetch(`/api/admin/partido/${partidoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sofaId: valor }),
    });
    const data = await res.json() as { sofaId?: string };
    setOk(!!data.sofaId);
    if (data.sofaId) setValor(data.sofaId);
    setGuardando(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
        🔗 SofaScore widget
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={valor}
          onChange={e => { setValor(e.target.value); setOk(false); }}
          placeholder='Pega el ID o el embed code completo...'
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 bg-gray-50"
        />
        <button
          onClick={guardar}
          disabled={guardando || !valor.trim()}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white disabled:opacity-40 hover:bg-amber-600 transition-colors shrink-0"
        >
          {guardando ? "..." : ok ? "✓ Guardado" : "Guardar"}
        </button>
      </div>
      {ok && (
        <p className="text-[10px] text-green-600 mt-1">✅ Widget activo en /en-vivo</p>
      )}
    </div>
  );
}

function LogoEquipo({ equipo, size = 32 }: { equipo: string; size?: number }) {
  const url = getLogoUrl(equipo) ?? "";
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (!url || broken) {
    const ini = equipo.split(" ").filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join("").toUpperCase() || equipo.slice(0, 2).toUpperCase();
    return (
      <div className="rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-800 shrink-0 text-[10px]"
        style={{ width: size, height: size }}>
        {ini}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={equipo} width={size} height={size} onError={() => setBroken(true)}
    style={{ width: size, height: size, objectFit: "contain" }} className="shrink-0" />;
}

function BarraPicks({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-bold text-gray-500">{label}</span>
        <span className="text-[10px] font-bold text-gray-700">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return {
    dia: d.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Mexico_City" }),
    hora: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" }),
  };
}

export default function JornadaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [jornada, setJornada] = useState<JornadaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/jornadas/${id}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setJornada(d); })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [id]);

  const toggleEstado = async () => {
    if (!jornada) return;
    const nuevoEstado = jornada.estado === "abierta" ? "finalizada" : "abierta";
    if (!confirm(`¿${nuevoEstado === "finalizada" ? "Cerrar" : "Reabrir"} esta jornada?`)) return;
    setCambiandoEstado(true);
    const res = await fetch(`/api/admin/jornadas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) setJornada(j => j ? { ...j, estado: nuevoEstado } : j);
    setCambiandoEstado(false);
  };

  if (cargando) return <LoadingScreen texto="Cargando jornada..." />;

  if (!jornada) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Jornada no encontrada</p>
    </div>
  );

  const titulo = jornada.nombre ?? `Jornada ${jornada.numero}`;
  const abierta = jornada.estado === "abierta";
  const { stats } = jornada;

  // Próximo partido (primer partido sin resultado y con fechaHora)
  const proximoPartido = jornada.partidos.find(p => !p.resultado && p.fechaHora);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white px-4 pt-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Link href="/admin/jornadas" className="text-amber-400 text-sm">← Jornadas</Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "36px", objectFit: "contain" }} /></a>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{LIGA_ICON[jornada.liga] ?? "⚽"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  abierta ? "bg-green-400/20 text-green-300" : "bg-white/10 text-white/50"
                }`}>
                  {abierta ? "🟢 abierta" : "🔒 finalizada"}
                </span>
              </div>
              <h1 className="text-xl font-black leading-tight">{jornada.liga} · {titulo}</h1>
              <p className="text-amber-300/70 text-sm mt-0.5">{jornada.temporada}</p>
            </div>
            <button
              onClick={toggleEstado}
              disabled={cambiandoEstado}
              className={`shrink-0 text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50 ${
                abierta
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-300"
                  : "bg-green-500/20 hover:bg-green-500/30 text-green-300"
              }`}
            >
              {cambiandoEstado ? "..." : abierta ? "🔒 Cerrar" : "🟢 Reabrir"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-700">{stats.totalQuinielas}</p>
            <p className="text-xs text-gray-500">Quinielas</p>
            {(stats.porCanal.tienda > 0 || stats.porCanal.online > 0) && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                🏪 {stats.porCanal.tienda} · 💻 {stats.porCanal.online}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">${fmt(stats.recaudado)}</p>
            <p className="text-xs text-gray-500">Cobrado</p>
            <DesgloseCobrado cobrado={stats.recaudado} />
            {stats.pendientes > 0 && (
              <p className="text-[10px] text-orange-500 font-semibold mt-0.5">⏳ {stats.pendientes} pendiente{stats.pendientes !== 1 ? "s" : ""}</p>
            )}
          </div>
          {stats.ganadoras > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-amber-600">🏆 {stats.ganadoras}</p>
              <p className="text-xs text-gray-500">Ganadoras</p>
            </div>
          )}
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{jornada.partidos.length}</p>
            <p className="text-xs text-gray-500">Partidos</p>
          </div>
        </div>

        {/* Próximo partido banner */}
        {proximoPartido && (() => {
          const { dia, hora } = formatFecha(proximoPartido.fechaHora!);
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl shrink-0">⏰</span>
              <div>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Próximo partido</p>
                <p className="text-sm font-semibold text-blue-900">
                  {proximoPartido.equipoLocal} vs {proximoPartido.equipoVisita}
                </p>
                <p className="text-xs text-blue-600">{dia} · {hora}</p>
              </div>
            </div>
          );
        })()}

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/admin/quinielas`}
            className="bg-white rounded-xl p-3 text-center shadow-sm hover:bg-amber-50 transition-colors"
          >
            <p className="text-xl">📋</p>
            <p className="text-xs font-semibold text-gray-700 mt-1">Ver quinielas</p>
          </Link>
          <Link
            href={`/admin/comisiones`}
            className="bg-white rounded-xl p-3 text-center shadow-sm hover:bg-amber-50 transition-colors"
          >
            <p className="text-xl">💰</p>
            <p className="text-xs font-semibold text-gray-700 mt-1">Comisiones</p>
          </Link>
        </div>

        {/* Partidos */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
            Partidos · {jornada.partidos.length} <span className="normal-case font-normal text-gray-300">(ordenados por hora)</span>
          </p>
          <div className="space-y-2">
            {jornada.partidos.map((p) => {
              const { dia, hora } = p.fechaHora ? formatFecha(p.fechaHora) : { dia: null, hora: null };
              const tieneResultado = p.resultado !== null && p.resultado !== "";
              const tienePicksData = p.picks.total > 0;

              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4">
                  {/* Número + fecha */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      #{p.orden + 1}
                    </span>
                    {dia && (
                      <span className="text-[10px] text-gray-400">
                        {dia} · {hora}
                      </span>
                    )}
                  </div>

                  {/* Equipos + resultado */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <LogoEquipo equipo={p.equipoLocal} size={32} />
                      <span className="font-bold text-sm text-gray-800 truncate">{p.equipoLocal}</span>
                    </div>

                    {tieneResultado ? (
                      <div className="shrink-0 text-center px-3">
                        <p className="font-black text-lg text-gray-800 leading-none">
                          {p.golesLocal} – {p.golesVisita}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {p.golesLocal! > p.golesVisita! ? "L" : p.golesLocal! < p.golesVisita! ? "V" : "E"}
                        </p>
                      </div>
                    ) : (
                      <div className="shrink-0 text-center px-3">
                        <span className="text-gray-300 text-sm font-bold">vs</span>
                      </div>
                    )}

                    <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
                      <span className="font-bold text-sm text-gray-800 truncate text-right">{p.equipoVisita}</span>
                      <LogoEquipo equipo={p.equipoVisita} size={32} />
                    </div>
                  </div>

                  {/* Distribución de picks */}
                  {tienePicksData && (
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <p className="text-[10px] text-gray-400 mb-2">
                        Distribución de {p.picks.total} pick{p.picks.total !== 1 ? "s" : ""}
                      </p>
                      <div className="flex gap-3">
                        <BarraPicks pct={p.picks.pctL} color="bg-amber-400" label="L" />
                        <BarraPicks pct={p.picks.pctE} color="bg-gray-400" label="E" />
                        <BarraPicks pct={p.picks.pctV} color="bg-blue-500" label="V" />
                      </div>
                      <div className="flex gap-3 mt-1">
                        <p className="flex-1 text-center text-[10px] text-amber-600 font-semibold">{p.picks.L}</p>
                        <p className="flex-1 text-center text-[10px] text-gray-500 font-semibold">{p.picks.E}</p>
                        <p className="flex-1 text-center text-[10px] text-blue-600 font-semibold">{p.picks.V}</p>
                      </div>
                    </div>
                  )}

                  {/* SofaScore widget ID */}
                  {!tieneResultado && (
                    <SofaIdInput partidoId={p.id} inicial={p.sofaId} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón tabla de resultados */}
        {jornada.tablaResultados?.length > 0 && (
          <Link
            href={`/resultados/${jornada.id}`}
            className="block bg-white rounded-2xl shadow-sm p-4 hover:bg-amber-50 transition-colors text-center"
          >
            <p className="text-xl mb-1">🏆</p>
            <p className="text-sm font-bold text-gray-800">Tabla de resultados</p>
            <p className="text-xs text-gray-400 mt-0.5">{jornada.tablaResultados.length} quinielas · Ver clasificación completa</p>
          </Link>
        )}

      </div>
    </div>
  );
}
