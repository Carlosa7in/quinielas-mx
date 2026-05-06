"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Pick = { prediccion: string; acertado: boolean | null; partidoId: string; partido: { orden: number } };

type Quiniela = {
  id: string;
  folio: string;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  canal: string;
  estado: string;
  estadoPago: string;
  monto: number;
  aciertos: number | null;
  referenciaPago: string | null;
  picks: Pick[];
};

type Jornada = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  estado: string;
  quinielas: Quiniela[];
};

const LABEL = { "1": "L", "X": "E", "2": "V" } as Record<string, string>;

function estadoColor(estado: string) {
  if (estado === "ganadora") return "bg-green-100 text-green-700";
  if (estado === "perdedora") return "bg-red-100 text-red-600";
  return "bg-yellow-100 text-yellow-700";
}

function pickColor(p: Pick) {
  if (p.acertado === true) return "bg-green-500 text-white";
  if (p.acertado === false) return "bg-red-400 text-white";
  return "bg-gray-100 text-gray-600";
}

const CANAL_ICON: Record<string, string> = {
  tienda: "🏪",
  transferencia: "🏦",
  oxxo: "🏪",
  online: "💻",
};

const PAGO_LABEL: Record<string, { label: string; cls: string }> = {
  confirmado:   { label: "✓ Pagado",    cls: "bg-green-100 text-green-700" },
  pendiente:    { label: "⏳ Pendiente", cls: "bg-yellow-100 text-yellow-700" },
  no_realizado: { label: "✗ No pagó",   cls: "bg-red-100 text-red-600" },
};

function usePagoCambio(quiniela: Quiniela, onUpdate: (id: string, ep: string) => void) {
  const [cargando, setCargando] = useState(false);
  const cambiar = async (nuevoEstado: string) => {
    setCargando(true);
    await fetch(`/api/admin/quinielas/${quiniela.id}/pago`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estadoPago: nuevoEstado }),
    });
    onUpdate(quiniela.id, nuevoEstado);
    setCargando(false);
  };
  return { cambiar, cargando };
}

// Badge compacto para la columna derecha
function PagoBadgeCompact({ quiniela }: { quiniela: Quiniela }) {
  if (quiniela.canal === "tienda") {
    return <span className="text-xs text-gray-400 font-medium">💵 Efectivo</span>;
  }
  const { label, cls } = PAGO_LABEL[quiniela.estadoPago] ?? PAGO_LABEL.pendiente;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// Barra de acción de pago — aparece debajo de los picks solo cuando hay algo que hacer
function PagoAcciones({
  quiniela,
  onUpdate,
}: {
  quiniela: Quiniela;
  onUpdate: (id: string, ep: string) => void;
}) {
  const { cambiar, cargando } = usePagoCambio(quiniela, onUpdate);
  const [enviando, setEnviando] = useState(false); // true = mostrar selector WA

  // Tienda = efectivo al momento, no necesita acción
  if (quiniela.canal === "tienda") return null;

  // Ya confirmado
  if (quiniela.estadoPago === "confirmado") {
    // Si acabamos de confirmar, mostrar selector de WhatsApp
    if (enviando && quiniela.telefonoCliente) {
      const tel = quiniela.telefonoCliente.replace(/\D/g, "");
      const telWA = tel.length === 10 ? `52${tel}` : tel;
      const ticketUrl = `${window.location.origin}/ticket/${quiniela.folio}`;
      const msg = [
        `¡Hola${quiniela.nombreCliente ? ` ${quiniela.nombreCliente.split(" ")[0]}` : ""}! 🎉`,
        ``,
        `Tu pago ha sido *confirmado*. Ya puedes ver tu quiniela:`,
        ``,
        `👉 ${ticketUrl}`,
        ``,
        `*Folio:* ${quiniela.folio}`,
        `¡Buena suerte! 🍀`,
      ].join("\n");
      const waUrl       = `https://wa.me/${telWA}?text=${encodeURIComponent(msg)}`;
      // WhatsApp Business en Android usa package com.whatsapp.w4b
      const waBizUrl    = `intent://send?phone=${telWA}&text=${encodeURIComponent(msg)}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;

      return (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          <p className="text-xs text-green-700 font-semibold">✅ Confirmado — ¿con qué app envías?</p>
          <div className="flex gap-2">
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => setEnviando(false)}
              className="flex-1 text-center text-xs bg-[#25D366] hover:bg-[#20b858] text-white font-semibold px-2 py-1.5 rounded-lg transition-colors">
              WhatsApp
            </a>
            <a href={waBizUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => setEnviando(false)}
              className="flex-1 text-center text-xs bg-[#25D366] hover:bg-[#20b858] text-white font-semibold px-2 py-1.5 rounded-lg transition-colors border border-white/40">
              WA Business 💼
            </a>
          </div>
          <button onClick={() => setEnviando(false)}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline w-full text-center">
            Omitir
          </button>
        </div>
      );
    }

    return (
      <button onClick={() => cambiar("pendiente")} disabled={cargando}
        className="text-xs text-gray-400 hover:text-gray-600 hover:underline mt-1 disabled:opacity-50">
        {cargando ? "..." : "Deshacer confirmación"}
      </button>
    );
  }

  const metodo = quiniela.canal === "oxxo" ? "OXXO" : "transferencia";

  const confirmar = async () => {
    await cambiar("confirmado");
    if (quiniela.telefonoCliente) setEnviando(true);
  };

  return (
    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
      <div className="flex items-center gap-1 text-xs text-gray-400">
        ⏳ {metodo} pendiente
        {quiniela.referenciaPago && (
          <span className="ml-1 text-blue-500 font-medium">· Ref: {quiniela.referenciaPago}</span>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={confirmar} disabled={cargando}
          className="flex-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
          {cargando ? "..." : (
            <>✓ Confirmar {quiniela.telefonoCliente && <span className="text-green-600">· enviar ticket 📲</span>}</>
          )}
        </button>
        <button onClick={() => cambiar("no_realizado")} disabled={cargando}
          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50">
          {cargando ? "..." : "✗ No pagó"}
        </button>
      </div>
    </div>
  );
}

// Agrupa picks por partido (para mostrar dobles como "L/E")
function agruparPicks(picks: Pick[]): { predicciones: string[]; acertados: (boolean | null)[] }[] {
  const sorted = [...picks].sort((a, b) => a.partido.orden - b.partido.orden);
  const map = new Map<string, { predicciones: string[]; acertados: (boolean | null)[] }>();
  const order: string[] = [];
  for (const p of sorted) {
    if (!map.has(p.partidoId)) {
      map.set(p.partidoId, { predicciones: [], acertados: [] });
      order.push(p.partidoId);
    }
    map.get(p.partidoId)!.predicciones.push(p.prediccion);
    map.get(p.partidoId)!.acertados.push(p.acertado);
  }
  return order.map((id) => map.get(id)!);
}

function JornadaCard({ jornada, busqueda }: { jornada: Jornada; busqueda: string }) {
  const [abierta, setAbierta] = useState(true);
  const [quinielas, setQuinielas] = useState(jornada.quinielas);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const actualizarPago = (id: string, estadoPago: string) => {
    setQuinielas((prev) =>
      prev.map((q) => (q.id === id ? { ...q, estadoPago } : q))
    );
  };

  const eliminar = async (q: Quiniela) => {
    if (!confirm(`¿Eliminar la quiniela ${q.folio} de ${q.nombreCliente ?? "sin nombre"}?\nEsta acción no se puede deshacer.`)) return;
    setEliminando(q.id);
    const res = await fetch(`/api/admin/quinielas/${q.id}`, { method: "DELETE" });
    if (res.ok) {
      setQuinielas((prev) => prev.filter((x) => x.id !== q.id));
    } else {
      alert("Error al eliminar");
    }
    setEliminando(null);
  };

  const filtradas = quinielas.filter((q) =>
    (q.folio + (q.nombreCliente ?? "") + (q.telefonoCliente ?? ""))
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const total = filtradas.length;
  const recaudado = filtradas.reduce((s, q) => s + q.monto, 0);
  const ganadoras = filtradas.filter((q) => q.estado === "ganadora").length;
  const pendientesPago = filtradas.filter((q) => q.canal !== "tienda" && q.estadoPago === "pendiente").length;
  const totalPicks = filtradas[0]?.picks.length ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Cabecera jornada */}
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">
              {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              jornada.estado === "abierta"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {jornada.estado}
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
            <span>🎯 {total} quinielas</span>
            <span>💵 ${recaudado}</span>
            {pendientesPago > 0 && (
              <span className="text-yellow-600 font-semibold">⏳ {pendientesPago} sin confirmar</span>
            )}
            {ganadoras > 0 && <span className="text-yellow-600 font-bold">🏆 {ganadoras} ganadoras</span>}
          </div>
        </div>
        <span className="text-gray-400 text-lg">{abierta ? "▲" : "▼"}</span>
      </button>

      {abierta && (
        <div className="border-t border-gray-100">
          {filtradas.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">
              {busqueda ? "Sin resultados" : "No hay quinielas en esta jornada"}
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtradas.map((q) => (
                <div key={q.id} className="px-4 py-3 flex items-start gap-3">
                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm">{CANAL_ICON[q.canal] ?? "💻"}</span>
                      <span className="font-semibold text-sm text-gray-800 truncate">
                        {q.nombreCliente ?? "Sin nombre"}
                      </span>
                      {q.telefonoCliente && (
                        <span className="text-gray-400 text-xs">{q.telefonoCliente}</span>
                      )}
                      {q.canal === "transferencia" && (
                        <span className="text-xs text-blue-500 font-medium">Transferencia</span>
                      )}
                      {q.canal === "oxxo" && (
                        <span className="text-xs text-orange-500 font-medium">OXXO</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-gray-400 mt-0.5">{q.folio}</p>
                    {q.referenciaPago && (
                      <p className="text-xs text-blue-600 font-semibold mt-0.5">
                        🔑 Ref: {q.referenciaPago}
                      </p>
                    )}
                    {/* Picks agrupados por partido */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {agruparPicks(q.picks).map((g, i) => {
                        const allTrue = g.acertados.every((a) => a === true);
                        const anyFalse = g.acertados.some((a) => a === false);
                        const cls = allTrue
                          ? "bg-green-500 text-white"
                          : anyFalse
                          ? "bg-red-400 text-white"
                          : "bg-gray-100 text-gray-600";
                        return (
                          <span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded ${cls}`}>
                            {g.predicciones.map((p) => LABEL[p] ?? p).join("/")}
                          </span>
                        );
                      })}
                    </div>
                    {/* Acciones de pago — solo cuando hay algo que hacer */}
                    <PagoAcciones quiniela={q} onUpdate={actualizarPago} />
                  </div>

                  {/* Columna derecha: pago + resultado + ticket + eliminar */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[80px]">
                    <PagoBadgeCompact quiniela={q} />
                    {q.aciertos !== null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${estadoColor(q.estado)}`}>
                        {q.aciertos}/{totalPicks} {q.estado === "ganadora" ? "🏆" : ""}
                      </span>
                    )}
                    <Link
                      href={`/ticket/${q.folio}`}
                      className="text-green-700 text-xs font-medium hover:underline"
                      target="_blank"
                    >
                      ticket →
                    </Link>
                    <button
                      onClick={() => eliminar(q)}
                      disabled={eliminando === q.id}
                      className="text-red-400 hover:text-red-600 text-xs disabled:opacity-40 transition-colors"
                      title="Eliminar quiniela"
                    >
                      {eliminando === q.id ? "..." : "🗑"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuinielasAdminPage() {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"activa" | "pasadas">("activa");
  const [busqueda, setBusqueda] = useState("");
  const [ligaFiltro, setLigaFiltro] = useState<string>("todas");

  useEffect(() => {
    fetch("/api/admin/quinielas")
      .then((r) => r.json())
      .then((data) => setJornadas(data))
      .finally(() => setCargando(false));
  }, []);

  const ligas = [...new Set(jornadas.map((j) => j.liga))];

  const jornadasFiltradas = ligaFiltro === "todas" ? jornadas : jornadas.filter((j) => j.liga === ligaFiltro);
  const activas = jornadasFiltradas.filter((j) => j.estado === "abierta");
  const pasadas = jornadasFiltradas.filter((j) => j.estado === "finalizada");
  const mostrar = tab === "activa" ? activas : pasadas;

  // Stats globales
  const todasQuinielas = jornadas.flatMap((j) => j.quinielas);
  const totalGlobal = todasQuinielas.length;
  const recaudadoGlobal = todasQuinielas.reduce((s, q) => s + q.monto, 0);
  const ganadorasGlobal = todasQuinielas.filter((q) => q.estado === "ganadora").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-amber-400 text-sm">← Admin</Link>
            <h1 className="text-xl font-bold mt-1">Quinielas</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-700">{totalGlobal}</p>
            <p className="text-xs text-gray-500">Total histórico</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">${recaudadoGlobal}</p>
            <p className="text-xs text-gray-500">Recaudado</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{ganadorasGlobal}</p>
            <p className="text-xs text-gray-500">Ganadoras</p>
          </div>
        </div>

        {/* Filtro liga */}
        {ligas.length > 1 && (
          <div className="flex gap-2">
            {["todas", ...ligas].map((l) => (
              <button
                key={l}
                onClick={() => setLigaFiltro(l)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  ligaFiltro === l ? "bg-amber-700 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {l === "todas" ? "Todas" : l === "Liga MX" ? "🇲🇽 Liga MX" : "⭐ Champions"}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setTab("activa")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "activa"
                ? "bg-amber-700 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            🟢 Activa
            {activas.length > 0 && (
              <span className="ml-1.5 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">
                {activas.flatMap((j) => j.quinielas).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("pasadas")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "pasadas"
                ? "bg-amber-700 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            📁 Pasadas
            {pasadas.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "pasadas" ? "bg-white/30" : "bg-gray-100 text-gray-500"}`}>
                {pasadas.length}
              </span>
            )}
          </button>
        </div>

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por folio, nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />

        {/* Contenido */}
        {cargando ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : mostrar.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">{tab === "activa" ? "🟢" : "📁"}</p>
            <p>{tab === "activa" ? "No hay jornada activa" : "No hay jornadas pasadas"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mostrar.map((j) => (
              <JornadaCard key={j.id} jornada={j} busqueda={busqueda} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
