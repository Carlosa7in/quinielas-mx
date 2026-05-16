"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LIGA_ICON } from "@/lib/equipos";
import DesgloseCobrado from "@/components/DesgloseCobrado";

// Detecta si estamos en móvil Android (para usar intent de WA Business)
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setMobile(/Android|iPhone|iPad/i.test(navigator.userAgent)); }, []);
  return mobile;
}

// Genera el link/intent de WA Business según plataforma
function waBizLink(tel: string, msg: string, isMobile: boolean) {
  if (isMobile) return `intent://send?phone=${tel}&text=${encodeURIComponent(msg)}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
  // En desktop: WA web estándar (no hay forma de forzar WA Business desde browser)
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

type Pick = { prediccion: string; acertado: boolean | null; partidoId: string; partido: { orden: number } };

type Quiniela = {
  id: string;
  folio: string;
  usuarioId: string | null;
  vendedorId: string | null;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  canal: string;
  estado: string;
  estadoPago: string;
  monto: number;
  aciertos: number | null;
  referenciaPago: string | null;
  usuario: { nombre: string } | null;
  vendedor: { nombre: string; codigo: string } | null;
  picks: Pick[];
};

type UsuarioOpcion = { id: string; nombre: string; rol: string };

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

function getOrigenPago(q: Quiniela): { origen: string; pago: string; origenColor: string } {
  if (q.canal === "tienda")  return { origen: "Tienda",     pago: "Efectivo",      origenColor: "bg-amber-100 text-amber-700" };
  if (q.canal === "kiosko")  return { origen: "Kiosko",     pago: "Efectivo",      origenColor: "bg-amber-100 text-amber-700" };
  const esReferido = !!(q.usuarioId || q.vendedorId);
  const origen      = esReferido ? "Referencia" : "Directa";
  const origenColor = esReferido ? "bg-cyan-100 text-cyan-700" : "bg-purple-100 text-purple-700";
  const pago =
    q.canal === "transferencia" ? "Transferencia" :
    q.canal === "oxxo"          ? "OXXO"          :
    q.canal === "online"        ? "Online"         : q.canal;
  return { origen, pago, origenColor };
}

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

// Botón WA Business: intent en móvil, wa.me + copiar mensaje en desktop
function WaBizBoton({ tel, msg, label, onSent }: { tel: string; msg: string; label: string; onSent?: () => void }) {
  const isMobile = useIsMobile();
  const [copiado, setCopiado] = useState(false);
  const link = waBizLink(tel, msg, isMobile);
  return (
    <div className="flex gap-1.5 flex-1">
      <a href={link} target="_blank" rel="noopener noreferrer" onClick={onSent}
        className="flex-1 text-center text-xs bg-[#25D366] hover:bg-[#20b858] text-white font-semibold px-2 py-1.5 rounded-lg transition-colors">
        {label}
      </a>
      {!isMobile && (
        <button
          onClick={() => { navigator.clipboard.writeText(msg); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
          title="Copiar mensaje para enviarlo desde tu teléfono"
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded-lg transition-colors shrink-0">
          {copiado ? "✓" : "📋"}
        </button>
      )}
    </div>
  );
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
  const [enviando, setEnviando] = useState(false);

  if (quiniela.canal === "tienda") return null;

  if (quiniela.estadoPago === "confirmado") {
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
      return (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
          <p className="text-xs text-green-700 font-semibold">✅ Confirmado — envía el ticket</p>
          <div className="flex gap-2">
            <WaBizBoton tel={telWA} msg={msg} label="Enviar ticket 📲" onSent={() => setEnviando(false)} />
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
          {cargando ? "..." : (<>✓ Confirmar {quiniela.telefonoCliente && <span className="text-green-600">· enviar ticket 📲</span>}</>)}
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

type NotifItem = { tel: string; nombre: string; folios: string[] };

function AsignarVendedor({
  quiniela,
  usuarios,
  onAsignado,
}: {
  quiniela: Quiniela;
  usuarios: UsuarioOpcion[];
  onAsignado: (id: string, usuarioId: string) => void;
}) {
  const [seleccionado, setSeleccionado] = useState("");
  const [guardando, setGuardando] = useState(false);

  const asignar = async () => {
    if (!seleccionado) return;
    setGuardando(true);
    const res = await fetch(`/api/admin/quinielas/${quiniela.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId: seleccionado }),
    });
    if (res.ok) onAsignado(quiniela.id, seleccionado);
    setGuardando(false);
  };

  return (
    <div className="mt-2 pt-2 border-t border-orange-100 flex items-center gap-2 flex-wrap">
      <span className="text-xs text-orange-600 font-medium">⚠️ Sin vendedor</span>
      <select
        value={seleccionado}
        onChange={(e) => setSeleccionado(e.target.value)}
        className="flex-1 text-xs border border-orange-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
      >
        <option value="">Seleccionar vendedor...</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre} ({u.rol})
          </option>
        ))}
      </select>
      <button
        onClick={asignar}
        disabled={!seleccionado || guardando}
        className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
      >
        {guardando ? "..." : "Asignar"}
      </button>
    </div>
  );
}

function JornadaCard({ jornada, busqueda, usuarios }: { jornada: Jornada; busqueda: string; usuarios: UsuarioOpcion[] }) {
  const [abierta, setAbierta] = useState(true);
  const [quinielas, setQuinielas] = useState(jornada.quinielas);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]); // para enviar WA tras confirmar
  const [reenviarAbierto, setReenviarAbierto] = useState(false);

  const actualizarPago = (id: string, estadoPago: string) => {
    setQuinielas((prev) => prev.map((q) => (q.id === id ? { ...q, estadoPago } : q)));
  };

  const actualizarUsuario = (id: string, usuarioId: string) => {
    setQuinielas((prev) => prev.map((q) => (q.id === id ? { ...q, usuarioId } : q)));
  };

  const eliminar = async (q: Quiniela) => {
    if (!confirm(`¿Eliminar la quiniela ${q.folio} de ${q.nombreCliente ?? "sin nombre"}?\nEsta acción no se puede deshacer.`)) return;
    setEliminando(q.id);
    const res = await fetch(`/api/admin/quinielas/${q.id}`, { method: "DELETE" });
    if (res.ok) setQuinielas((prev) => prev.filter((x) => x.id !== q.id));
    else alert("Error al eliminar");
    setEliminando(null);
  };

  const filtradas = quinielas
    .filter((q) =>
      (q.folio + (q.nombreCliente ?? "") + (q.telefonoCliente ?? ""))
        .toLowerCase()
        .includes(busqueda.toLowerCase())
    )
    // Pendientes primero, luego el resto
    .sort((a, b) => {
      const peso = (q: Quiniela) => (q.canal !== "tienda" && q.estadoPago === "pendiente" ? 0 : 1);
      return peso(a) - peso(b);
    });

  const pendientes = filtradas.filter((q) => q.canal !== "tienda" && q.estadoPago === "pendiente");
  const confirmadas = filtradas.filter((q) => q.estadoPago === "confirmado");
  const total = confirmadas.length;
  const recaudado = confirmadas.reduce((s, q) => s + q.monto, 0);
  const ganadoras = filtradas.filter((q) => q.estado === "ganadora").length;
  const totalPicks = filtradas[0]?.picks.length ?? 0;

  const toggleSel = (id: string) =>
    setSeleccionadas((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const selAll = () =>
    setSeleccionadas(new Set(pendientes.map((q) => q.id)));

  const selNone = () => setSeleccionadas(new Set());

  const confirmarSeleccionadas = async () => {
    if (seleccionadas.size === 0) return;
    setConfirmando(true);
    const ids = [...seleccionadas];
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/admin/quinielas/${id}/pago`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estadoPago: "confirmado" }),
        })
      )
    );
    // Actualizar estado local
    setQuinielas((prev) => prev.map((q) => ids.includes(q.id) ? { ...q, estadoPago: "confirmado" } : q));
    // Agrupar por teléfono para notificaciones
    const porTel = new Map<string, NotifItem>();
    for (const id of ids) {
      const q = quinielas.find((x) => x.id === id);
      if (!q?.telefonoCliente) continue;
      const tel = q.telefonoCliente.replace(/\D/g, "");
      const telWA = tel.length === 10 ? `52${tel}` : tel;
      if (!porTel.has(telWA)) porTel.set(telWA, { tel: telWA, nombre: q.nombreCliente ?? "", folios: [] });
      porTel.get(telWA)!.folios.push(q.folio);
    }
    setNotifs([...porTel.values()]);
    setSeleccionadas(new Set());
    setConfirmando(false);
  };

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
              jornada.estado === "abierta" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {jornada.estado}
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
            <span>🎯 {total} confirmadas</span>
            <span>💵 ${recaudado} cobrado</span>
            {pendientes.length > 0 && (
              <span className="text-yellow-600 font-semibold">⏳ {pendientes.length} sin confirmar</span>
            )}
            {ganadoras > 0 && <span className="text-yellow-600 font-bold">🏆 {ganadoras} ganadoras</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón re-enviar notificaciones */}
          {filtradas.some((q) => q.estadoPago === "confirmado" && q.telefonoCliente) && (
            <button
              onClick={(e) => { e.stopPropagation(); setReenviarAbierto((v) => !v); }}
              title="Re-enviar notificaciones de tickets confirmados"
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
            >
              📲 Re-enviar
            </button>
          )}
          <span className="text-gray-400 text-lg">{abierta ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Panel de re-envío de notificaciones */}
      {reenviarAbierto && (() => {
        const confirmadas = filtradas.filter((q) => q.estadoPago === "confirmado" && q.telefonoCliente);
        const porTel = new Map<string, NotifItem>();
        for (const q of confirmadas) {
          const tel = q.telefonoCliente!.replace(/\D/g, "");
          const telWA = tel.length === 10 ? `52${tel}` : tel;
          if (!porTel.has(telWA)) porTel.set(telWA, { tel: telWA, nombre: q.nombreCliente ?? "", folios: [] });
          porTel.get(telWA)!.folios.push(q.folio);
        }
        const grupos = [...porTel.values()];
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        return (
          <div className="border-t border-blue-100 bg-blue-50 px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-blue-800">📲 Re-enviar notificaciones — tickets confirmados</p>
            {grupos.map((n) => {
              const links = n.folios.map((f) => `👉 ${origin}/ticket/${f}`).join("\n");
              const msg = [
                `¡Hola${n.nombre ? ` ${n.nombre.split(" ")[0]}` : ""}! 🎉`,
                ``,
                `Tu${n.folios.length > 1 ? "s" : ""} pago${n.folios.length > 1 ? "s han" : " ha"} sido *confirmado${n.folios.length > 1 ? "s" : ""}*. Ya puedes ver tu${n.folios.length > 1 ? "s" : ""} quiniela${n.folios.length > 1 ? "s" : ""}:`,
                ``,
                links,
                ``,
                `¡Buena suerte! 🍀`,
              ].join("\n");
              return (
                <div key={n.tel} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-blue-700 font-semibold min-w-0 truncate">
                    {n.nombre || n.tel}
                    {n.folios.length > 1 && <span className="ml-1 text-blue-400">· {n.folios.length} tickets</span>}
                  </span>
                  <WaBizBoton tel={n.tel} msg={msg} label="Enviar 📲" />
                </div>
              );
            })}
            <button onClick={() => setReenviarAbierto(false)} className="text-xs text-blue-400 hover:text-blue-600 hover:underline">Cerrar</button>
          </div>
        );
      })()}

      {abierta && (
        <div className="border-t border-gray-100">
          {filtradas.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">
              {busqueda ? "Sin resultados" : "No hay quinielas en esta jornada"}
            </p>
          ) : (
            <>
              {/* Barra de confirmación masiva — solo si hay pendientes */}
              {pendientes.length > 0 && (
                <div className="px-4 py-2.5 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={seleccionadas.size === pendientes.length ? selNone : selAll}
                    className="text-xs text-yellow-700 font-semibold hover:underline"
                  >
                    {seleccionadas.size === pendientes.length ? "Deseleccionar" : `Seleccionar ${pendientes.length} pendientes`}
                  </button>
                  {seleccionadas.size > 0 && (
                    <button
                      onClick={confirmarSeleccionadas}
                      disabled={confirmando}
                      className="ml-auto text-xs bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {confirmando ? "Confirmando..." : `✓ Confirmar ${seleccionadas.size} seleccionada${seleccionadas.size !== 1 ? "s" : ""}`}
                    </button>
                  )}
                </div>
              )}

              {/* Panel de notificaciones tras confirmación masiva */}
              {notifs.length > 0 && (
                <div className="px-4 py-3 bg-green-50 border-b border-green-100 space-y-2">
                  <p className="text-xs font-bold text-green-800">✅ Confirmadas — ¿a quién notificas?</p>
                  {notifs.map((n) => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const links = n.folios.map((f) => `👉 ${origin}/ticket/${f}`).join("\n");
                    const msg = [
                      `¡Hola${n.nombre ? ` ${n.nombre.split(" ")[0]}` : ""}! 🎉`,
                      ``,
                      `Tu${n.folios.length > 1 ? "s" : ""} pago${n.folios.length > 1 ? "s han" : " ha"} sido *confirmado${n.folios.length > 1 ? "s" : ""}*. Ya puedes ver tu${n.folios.length > 1 ? "s" : ""} quiniela${n.folios.length > 1 ? "s" : ""}:`,
                      ``,
                      links,
                      ``,
                      `¡Buena suerte! 🍀`,
                    ].join("\n");
                    return (
                      <div key={n.tel} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-green-700 font-semibold">
                          {n.nombre || n.tel}
                          {n.folios.length > 1 && <span className="ml-1 text-green-500">· {n.folios.length} tickets</span>}
                        </span>
                        <WaBizBoton tel={n.tel} msg={msg} label="Enviar ticket 📲" onSent={() => setNotifs((prev) => prev.filter((x) => x.tel !== n.tel))} />
                        <button onClick={() => setNotifs((prev) => prev.filter((x) => x.tel !== n.tel))}
                          className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Omitir</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="divide-y divide-gray-50">
                {filtradas.map((q) => {
                  const esPendiente = q.canal !== "tienda" && q.estadoPago === "pendiente";
                  return (
                    <div key={q.id} className={`px-4 py-3 flex items-start gap-3 ${esPendiente && seleccionadas.has(q.id) ? "bg-yellow-50" : ""}`}>
                      {/* Checkbox de selección */}
                      {esPendiente && (
                        <button
                          onClick={() => toggleSel(q.id)}
                          className={`mt-0.5 w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                            seleccionadas.has(q.id)
                              ? "bg-amber-500 border-amber-500 text-white"
                              : "border-gray-300 bg-white hover:border-amber-400"
                          }`}
                        >
                          {seleccionadas.has(q.id) && (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[3]">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      )}
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Chip origen/pago */}
                          {(() => {
                            const { origen, pago, origenColor } = getOrigenPago(q);
                            return (
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${origenColor}`}>
                                {origen}
                                <span className="text-[10px] font-normal ml-0.5 opacity-70">/{pago}</span>
                              </span>
                            );
                          })()}
                          <span className="font-semibold text-sm text-gray-800 truncate">
                            {q.nombreCliente ?? "Sin nombre"}
                          </span>
                          {q.telefonoCliente && (
                            <span className="text-gray-400 text-xs">{q.telefonoCliente}</span>
                          )}
                        </div>
                        {/* Vendedor / usuario referido */}
                        {(q.vendedor || q.usuario) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            🔗 {q.vendedor
                              ? `${q.vendedor.nombre} [${q.vendedor.codigo}]`
                              : q.usuario?.nombre}
                          </p>
                        )}
                        <p className="font-mono text-xs text-gray-400 mt-0.5">{q.folio}</p>
                        {q.referenciaPago && (
                          <p className="text-xs text-blue-600 font-semibold mt-0.5">
                            🔑 Ref: {q.referenciaPago}
                          </p>
                        )}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {agruparPicks(q.picks).map((g, i) => {
                            const allTrue = g.acertados.every((a) => a === true);
                            const anyFalse = g.acertados.some((a) => a === false);
                            const cls = allTrue ? "bg-green-500 text-white" : anyFalse ? "bg-red-400 text-white" : "bg-gray-100 text-gray-600";
                            return (
                              <span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded ${cls}`}>
                                {g.predicciones.map((p) => LABEL[p] ?? p).join("/")}
                              </span>
                            );
                          })}
                        </div>
                        <PagoAcciones quiniela={q} onUpdate={actualizarPago} />
                        {q.canal === "tienda" && !q.usuarioId && (
                          <AsignarVendedor
                            quiniela={q}
                            usuarios={usuarios}
                            onAsignado={actualizarUsuario}
                          />
                        )}
                      </div>

                      {/* Columna derecha */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[80px]">
                        <PagoBadgeCompact quiniela={q} />
                        {q.aciertos !== null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${estadoColor(q.estado)}`}>
                            {q.aciertos}/{totalPicks} {q.estado === "ganadora" ? "🏆" : ""}
                          </span>
                        )}
                        <Link href={`/ticket/${q.folio}`} className="text-green-700 text-xs font-medium hover:underline" target="_blank">
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
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuinielasAdminPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esAdmin = ["admin", "superadmin"].includes(rol);

  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"activa" | "pasadas">("activa");
  const [busqueda, setBusqueda] = useState("");
  const [ligaFiltro, setLigaFiltro] = useState<string>("todas");
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);

  useEffect(() => {
    fetch("/api/admin/quinielas")
      .then((r) => r.json())
      .then((data) => setJornadas(data))
      .finally(() => setCargando(false));
    fetch("/api/admin/usuarios")
      .then((r) => r.json())
      .then((data: UsuarioOpcion[]) => Array.isArray(data) && setUsuarios(data));
  }, []);

  const ligas = [...new Set(jornadas.map((j) => j.liga))];

  const jornadasFiltradas = (ligaFiltro === "todas" ? jornadas : jornadas.filter((j) => j.liga === ligaFiltro))
    .filter((j) => esAdmin || j.estado === "abierta"); // vendedores solo ven jornadas abiertas
  const activas = jornadasFiltradas.filter((j) => j.estado === "abierta");
  const pasadas = jornadasFiltradas.filter((j) => j.estado === "finalizada");
  const mostrar = tab === "activa" ? activas : pasadas;

  // Stats globales — solo quinielas con pago confirmado
  const todasQuinielas = jornadas.flatMap((j) => j.quinielas);
  const todasConfirmadas = todasQuinielas.filter((q) => q.estadoPago === "confirmado");
  const totalGlobal = todasConfirmadas.length;
  const recaudadoGlobal = todasConfirmadas.reduce((s, q) => s + q.monto, 0);
  const ventasGlobal = todasQuinielas.filter((q) => q.estadoPago !== "no_realizado").reduce((s, q) => s + q.monto, 0);
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
            <p className="text-xs text-gray-500">Cobrado</p>
            <DesgloseCobrado cobrado={recaudadoGlobal} />
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{ganadorasGlobal}</p>
            <p className="text-xs text-gray-500">Ganadoras</p>
          </div>
        </div>

        {/* Filtro liga */}
        {ligas.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {["todas", ...ligas].map((l) => (
              <button
                key={l}
                onClick={() => setLigaFiltro(l)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  ligaFiltro === l ? "bg-amber-700 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {l === "todas" ? "Todas" : `${LIGA_ICON[l] ?? "⚽"} ${l}`}
              </button>
            ))}
          </div>
        )}

        {/* Tabs — Pasadas solo para admins */}
        {esAdmin ? (
          <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setTab("activa")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === "activa" ? "bg-amber-700 text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              🟢 Activa
              {activas.length > 0 && (
                <span className="ml-1.5 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">
                  {activas.flatMap((j) => j.quinielas).filter((q) => q.estadoPago === "confirmado").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("pasadas")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === "pasadas" ? "bg-amber-700 text-white" : "text-gray-500 hover:bg-gray-50"
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
        ) : (
          <div className="bg-white rounded-xl shadow-sm px-4 py-3">
            <p className="text-sm font-semibold text-amber-700">🟢 Jornada activa</p>
          </div>
        )}

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
              <JornadaCard key={j.id} jornada={j} busqueda={busqueda} usuarios={usuarios} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
