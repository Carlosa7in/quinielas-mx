"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type JornadaOpcion = {
  id: string; numero: number; nombre: string | null; temporada: string; liga: string;
};

type QuinielaItem = {
  id: string; folio: string; monto: number; canal: string;
  estado: string; estadoPago: string; nombreCliente: string | null;
  usuarioId?: string | null; vendedorId?: string | null;
};

function getOrigenPago(q: QuinielaItem): { origen: string; pago: string; origenColor: string } {
  if (q.canal === "tienda")  return { origen: "Tienda",     pago: "Efectivo",       origenColor: "bg-amber-100 text-amber-700"  };
  if (q.canal === "kiosko")  return { origen: "Kiosko",     pago: "Efectivo",       origenColor: "bg-amber-100 text-amber-700"  };
  const esReferido = !!(q.usuarioId || q.vendedorId);
  const origen     = esReferido ? "Referencia" : "Directa";
  const origenColor = esReferido ? "bg-cyan-100 text-cyan-700" : "bg-purple-100 text-purple-700";
  const pago = q.canal === "transferencia" ? "Transferencia"
    : q.canal === "oxxo"  ? "OXXO"
    : q.canal === "online" ? "Online"
    : q.canal;
  return { origen, pago, origenColor };
}

type JornadaDesglose = {
  jornadaId: string; jornadaNombre: string; liga: string; temporada: string;
  total: number; tienda: number; online: number;
  recaudado: number;
  comisionTienda: number; comisionReferido: number;
  comision: number; comisionAdmin: number; comisionDirecta: number; comisionTotal: number;
  pagado: boolean; pagadoEn: string | null; montoPagado: number | null;
  quinielas: QuinielaItem[];
};

type VendedorReporte = {
  id: string; nombre: string; rol: string; puntoVenta: string | null;
  total: number; tienda: number; online: number;
  recaudado: number; ganadoras: number; comisionTotal: number; comisionAdminTotal: number; pendientePago: number;
  porJornada: JornadaDesglose[];
};

const COMISION_PCT = 0.10;
const PCT_DUENOS = 0.15;

const ROL_LABEL: Record<string, string> = {
  superadmin: "Superadmin", admin: "Admin", vendedor: "Vendedor", tienda: "Tienda",
};
const ROL_COLOR: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700", admin: "bg-blue-100 text-blue-700",
  vendedor: "bg-green-100 text-green-700", tienda: "bg-amber-100 text-amber-700",
};
const CANAL_LABEL: Record<string, string> = { tienda: "Tienda", online: "Online", directa: "Directa 🌐" };
const ESTADO_COLOR: Record<string, string> = {
  pendiente: "text-yellow-600", confirmado: "text-green-600",
  ganadora: "text-amber-600 font-bold", perdedora: "text-gray-400",
};
const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

export default function ComisionesPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esSuperadmin = rol === "superadmin";

  const [reporte, setReporte] = useState<VendedorReporte[]>([]);
  const [sinAsignar, setSinAsignar] = useState(0);
  const [sinAsignarDetalle, setSinAsignarDetalle] = useState<{ folio: string; nombreCliente: string; monto: number; jornada: string }[]>([]);
  const [numAdmins, setNumAdmins] = useState(0);
  const [ventasDirectasConfirmadas, setVentasDirectasConfirmadas] = useState(0);
  const [comisionDirectaTotal, setComisionDirectaTotal] = useState(0);
  const [recaudadoGlobal, setRecaudadoGlobal] = useState(0);
  const [totalGlobal, setTotalGlobal] = useState(0);
  const [flujo, setFlujo] = useState<{
    efectivo: number;
    transferencias: number;
    porCuenta?: { banco: string; titular: string; usuarioId: string; monto: number; count: number }[];
  } | null>(null);
  const [jornadas, setJornadas] = useState<JornadaOpcion[]>([]);
  const [jornadaId, setJornadaId] = useState("");
  const [cargando, setCargando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [pagando, setPagando] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        // Ordenar desc por número para mostrar la más reciente primero
        const sorted = [...data].sort((a: JornadaOpcion, b: JornadaOpcion) => b.numero - a.numero);
        setJornadas(sorted);
        // Auto-seleccionar la jornada más reciente
        if (sorted.length > 0) setJornadaId(sorted[0].id);
      });
  }, []);

  const cargar = useCallback(() => {
    setCargando(true);
    const url = jornadaId ? `/api/admin/comisiones?jornadaId=${jornadaId}` : "/api/admin/comisiones";
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setReporte(data.reporte ?? []); setSinAsignar(data.sinAsignar ?? 0); setSinAsignarDetalle(data.sinAsignarDetalle ?? []); setNumAdmins(data.numAdmins ?? 0); setRecaudadoGlobal(data.recaudadoGlobal ?? 0); setTotalGlobal(data.totalGlobal ?? 0); setVentasDirectasConfirmadas(data.ventasDirectasConfirmadas ?? 0); setComisionDirectaTotal(data.comisionDirectaTotal ?? 0); setFlujo(data.flujo ?? null); })
      .finally(() => setCargando(false));
  }, [jornadaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleExpandir = (id: string) =>
    setExpandidos((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const marcarPago = async (usuarioId: string, jornadaId: string, monto: number, desmarcar = false) => {
    const key = `${usuarioId}_${jornadaId}`;
    setPagando(key);
    try {
      await fetch("/api/admin/comisiones", {
        method: desmarcar ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, jornadaId, monto }),
      });
      await cargar();
    } finally {
      setPagando(null);
    }
  };

  const totalGeneral = reporte.reduce((s, v) => s + v.total, 0);
  const recaudadoGeneral = reporte.reduce((s, v) => s + v.recaudado, 0);
  const totalTiendaAll = reporte.filter((v) => v.rol !== "vendedor").reduce((s, v) => s + v.tienda, 0);
  // Referidas = online de admins/superadmins (via su propio link) + todos los vendedores (modelo Vendedor o rol vendedor)
  const totalReferidoAll =
    reporte.filter((v) => ["admin", "superadmin"].includes(v.rol)).reduce((s, v) => s + v.online, 0) +
    reporte.filter((v) => v.rol === "vendedor").reduce((s, v) => s + v.total, 0);
  const totalDirectasAll = Math.max(0, (totalGlobal || totalGeneral) - totalGeneral - sinAsignar);
  const totalComisionesReferido = reporte.filter((v) => v.rol === "vendedor").reduce((s, v) => s + v.comisionTotal, 0);
  const baseDesglose = recaudadoGlobal > 0 ? recaudadoGlobal : recaudadoGeneral;
  const cutDuenos = baseDesglose * PCT_DUENOS;
  // comisionTotal de admins/superadmin incluye el 10% de directas (inyectado vía superadmin),
  // que ya está contado en comisionDirectaTotal → se resta para no doble-descontar
  const cutTienda = reporte.filter((v) => v.rol !== "vendedor").reduce((s, v) => s + v.comisionTotal, 0) - comisionDirectaTotal;
  const bolsaNeta = Math.max(baseDesglose - cutDuenos - cutTienda - totalComisionesReferido - comisionDirectaTotal, 0);
  const totalComisiones = reporte.reduce((s, v) => s + v.comisionTotal, 0);
  const totalPendiente = reporte.reduce((s, v) => s + v.pendientePago, 0);

  const reporteConVentas = reporte
    .filter((v) => v.total > 0 || v.comisionTotal > 0 || v.comisionAdminTotal > 0)
    .sort((a, b) => b.total - a.total);
  const reporteSinVentas = reporte
    .filter((v) => v.total === 0 && v.comisionTotal === 0 && v.comisionAdminTotal === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-amber-400 text-sm">← Admin</Link>
            <h1 className="text-xl font-bold mt-1">
              {esSuperadmin ? "Comisiones por Punto de Venta" : "Mis Ventas"}
            </h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} /></a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Filtro jornada */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="text-sm font-medium text-gray-600 block mb-2">Filtrar por jornada</label>
          <select
            value={jornadaId}
            onChange={(e) => setJornadaId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Todas las jornadas</option>
            {jornadas.map((j) => (
              <option key={j.id} value={j.id}>
                {j.liga} · {j.nombre ?? `Jornada ${j.numero}`} · {j.temporada}
              </option>
            ))}
          </select>
        </div>

        {/* Resumen global */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-700">{totalGlobal || totalGeneral}</p>
            <p className="text-xs text-gray-500">Quinielas vendidas</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">${fmt(recaudadoGlobal || recaudadoGeneral)}</p>
            <p className="text-xs text-gray-500">Total recaudado</p>
          </div>
        </div>

        {/* Desglose financiero — solo superadmin */}
        {esSuperadmin && baseDesglose > 0 && (
          <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">Desglose financiero</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-300">Total recaudado</span>
                <span className="font-bold">${fmt(baseDesglose)}</span>
              </div>
              <div className="flex gap-3 text-stone-500 text-xs flex-wrap">
                {totalTiendaAll > 0 && <span>🏪 {totalTiendaAll} tienda</span>}
                {totalReferidoAll > 0 && <span>🔗 {totalReferidoAll} referido</span>}
                {totalDirectasAll > 0 && <span>🌐 {totalDirectasAll} directas</span>}
              </div>
              <div className="flex justify-between text-blue-400">
                <span>
                  − 15% fondo admin
                  {numAdmins > 0 && (
                    <span className="text-blue-500 text-xs ml-2">
                      (${fmt(cutDuenos / numAdmins)} × {numAdmins} admins)
                    </span>
                  )}
                </span>
                <span className="font-bold">−${fmt(cutDuenos)}</span>
              </div>
              {cutTienda > 0 && (
                <div className="flex justify-between text-orange-400">
                  <span>− Comisión vendedores (10% tienda + referidos)</span>
                  <span className="font-bold">−${fmt(cutTienda)}</span>
                </div>
              )}
              {totalComisionesReferido > 0 && (
                <div className="flex justify-between text-cyan-400">
                  <span>− Comisión referidos (10% de ventas confirmadas)</span>
                  <span className="font-bold">−${fmt(totalComisionesReferido)}</span>
                </div>
              )}
              {comisionDirectaTotal > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>− Ventas directas 🌐 (10% · {ventasDirectasConfirmadas} confirmadas)</span>
                  <span className="font-bold">−${fmt(comisionDirectaTotal)}</span>
                </div>
              )}
              <div className="border-t border-stone-700 pt-2 flex justify-between text-green-400">
                <span className="font-bold">💰 Bolsa para premios</span>
                <span className="font-black text-base">${fmt(bolsaNeta)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Flujo de caja — solo superadmin */}
        {esSuperadmin && flujo && (flujo.efectivo > 0 || flujo.transferencias > 0) && (
          <div className="bg-blue-950 text-white rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold tracking-widest text-blue-400 uppercase">💳 En tu cuenta</p>
            <p className="text-xs text-blue-400">Todo el dinero confirmado, sin importar quién lo vendió</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-200">🏪 Efectivo (tienda)</span>
                <span className="font-bold">${fmt(flujo.efectivo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">🏦 Transferencias recibidas</span>
                <span className="font-bold">${fmt(flujo.transferencias)}</span>
              </div>
              <div className="border-t border-blue-800 pt-2 flex justify-between text-blue-300">
                <span className="font-bold">Total en tu cuenta</span>
                <span className="font-black text-base">${fmt(flujo.efectivo + flujo.transferencias)}</span>
              </div>
            </div>
            {/* Desglose por cuenta bancaria */}
            {flujo.porCuenta && flujo.porCuenta.length > 0 && (
              <div className="border-t border-blue-800 pt-3 space-y-1.5">
                <p className="text-xs font-bold tracking-wider text-blue-400 uppercase">Por cuenta</p>
                {flujo.porCuenta.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-blue-200 font-medium">{c.banco}</span>
                      {c.titular !== "—" && (
                        <span className="text-blue-500 ml-1">· {c.titular}</span>
                      )}
                      <span className="text-blue-600 ml-1">({c.count} pago{c.count !== 1 ? "s" : ""})</span>
                    </div>
                    <span className="font-bold text-blue-200">${fmt(c.monto)}</span>
                  </div>
                ))}
              </div>
            )}
            {flujo.transferencias > 0 && (
              <p className="text-xs text-blue-400 border-t border-blue-800 pt-2">
                ⚠️ Las transferencias incluyen ventas de referidos (Elias y otros). Recuerda pagarles su comisión.
              </p>
            )}
          </div>
        )}

        {/* ── Resumen rápido ── */}
        {!cargando && reporteConVentas.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700">⚡ Resumen rápido</p>
              {totalPendiente > 0 && (
                <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                  ⏳ ${fmt(totalPendiente)} pendiente total
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-500 font-medium text-xs">Vendedor</th>
                    <th className="text-center px-2 py-2 text-gray-500 font-medium text-xs">Vendidas</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium text-xs">Recaudado</th>
                    <th className="text-right px-3 py-2 text-gray-500 font-medium text-xs">A pagar</th>
                    <th className="text-right px-2 py-2 text-gray-500 font-medium text-xs">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reporteConVentas.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpandir(v.id)}>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-gray-800 leading-tight">{v.nombre}</p>
                        {v.puntoVenta && <p className="text-xs text-gray-400">{v.puntoVenta}</p>}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-gray-700">{v.total}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-green-700">${fmt(v.recaudado)}</td>
                      <td className="px-3 py-2.5 text-right font-bold">
                        {v.pendientePago > 0
                          ? <span className="text-orange-600">${fmt(v.pendientePago)}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {v.pendientePago > 0
                          ? <span className="text-xs text-orange-500 font-bold">⏳</span>
                          : <span className="text-xs text-green-600 font-bold">✅</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                {reporteConVentas.length > 1 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td className="px-3 py-2.5 font-bold text-gray-700 text-xs uppercase tracking-wide">Total</td>
                      <td className="px-2 py-2.5 text-center font-black text-gray-800">
                        {reporteConVentas.reduce((s, v) => s + v.total, 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-green-700">
                        ${fmt(reporteConVentas.reduce((s, v) => s + v.recaudado, 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-orange-600">
                        {totalPendiente > 0 ? `$${fmt(totalPendiente)}` : "✅ Todo pagado"}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Lista de vendedores */}
        {cargando ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : reporte.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">📊</p>
            <p>No hay registros todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reporteConVentas.map((v) => {
              const expandido = expandidos.has(v.id);
              return (
                <div key={v.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Cabecera vendedor */}
                  <button
                    onClick={() => toggleExpandir(v.id)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{v.nombre}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLOR[v.rol] ?? "bg-gray-100 text-gray-500"}`}>
                          {ROL_LABEL[v.rol] ?? v.rol}
                        </span>
                        {v.puntoVenta && (
                          <span className="text-xs text-gray-400">📍 {v.puntoVenta}</span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm ml-2">{expandido ? "▲" : "▼"}</span>
                    </div>
                    {/* Mini resumen */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <span className="text-green-700 font-semibold">{v.total} quinielas</span>
                      <span className="text-yellow-600 font-semibold">${fmt(v.recaudado)}</span>
                      {v.comisionAdminTotal > 0 && (
                        <span className="text-blue-600 font-semibold text-xs">
                          💼 ${fmt(v.comisionAdminTotal)} fondo admin
                        </span>
                      )}
                      {(v.comisionTotal > 0 || v.comisionAdminTotal > 0) && (
                        <span className={v.pendientePago > 0 ? "text-orange-500 font-semibold" : "text-gray-400"}>
                          {v.pendientePago > 0 ? `⏳ $${fmt(v.pendientePago)} pendiente` : "✅ Todo pagado"}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Desglose expandido */}
                  {expandido && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {v.porJornada.map((j) => {
                        const key = `${v.id}_${j.jornadaId}`;
                        const estaPagando = pagando === key;
                        return (
                          <div key={j.jornadaId} className="p-4 space-y-3">
                            {/* Encabezado jornada */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-gray-700 text-sm">
                                  {j.liga} · {j.jornadaNombre}
                                </p>
                                <p className="text-xs text-gray-400">{j.temporada}</p>
                              </div>
                              {/* Estado de pago de comisión */}
                              {j.comisionTotal > 0 && (
                                <div className="text-right">
                                  {j.pagado ? (
                                    <div>
                                      <p className="text-xs text-green-600 font-bold">✅ Pagado</p>
                                      {j.pagadoEn && (
                                        <p className="text-[10px] text-gray-400">{fmtFecha(j.pagadoEn)}</p>
                                      )}
                                      {esSuperadmin && (
                                        <button
                                          onClick={() => marcarPago(v.id, j.jornadaId, j.comisionTotal, true)}
                                          disabled={!!estaPagando}
                                          className="text-[10px] text-red-400 hover:text-red-600 mt-0.5"
                                        >
                                          Deshacer
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-right">
                                      <p className="text-xs text-orange-500 font-bold">
                                        ⏳ ${fmt(j.comisionTotal)} pendiente
                                      </p>
                                      {esSuperadmin && (
                                        <button
                                          onClick={() => marcarPago(v.id, j.jornadaId, j.comisionTotal)}
                                          disabled={!!estaPagando}
                                          className="mt-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                          {estaPagando ? "..." : "Marcar pagado"}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Stats de la jornada */}
                            <div className="grid gap-2 grid-cols-2">
                              {j.total > 0 && (
                                <div className="bg-green-50 rounded-lg p-2 text-center">
                                  <p className="font-bold text-green-700">{j.total}</p>
                                  <p className="text-[10px] text-gray-500">Quinielas</p>
                                  {(j.tienda > 0 || j.online > 0) && (
                                    <p className="text-[9px] text-gray-400">
                                      {j.tienda > 0 && `${j.tienda}T`}{j.tienda > 0 && j.online > 0 && "·"}{j.online > 0 && `${j.online}O`}
                                    </p>
                                  )}
                                </div>
                              )}
                              {j.recaudado > 0 && (
                                <div className="bg-yellow-50 rounded-lg p-2 text-center">
                                  <p className="font-bold text-yellow-600">${fmt(j.recaudado)}</p>
                                  <p className="text-[10px] text-gray-500">Recaudado</p>
                                </div>
                              )}
                              {/* Comisión tienda — separada */}
                              {(j.comisionTienda ?? 0) > 0 && (
                                <div className="bg-orange-50 rounded-lg p-2 text-center">
                                  <p className="font-bold text-orange-600">${fmt(j.comisionTienda)}</p>
                                  <p className="text-[10px] text-gray-500">Com. tienda 🏪</p>
                                  <p className="text-[9px] text-gray-400">10% de ${fmt(j.tienda * (j.recaudado / (j.total || 1)))}</p>
                                </div>
                              )}
                              {/* Comisión referido — separada */}
                              {(j.comisionReferido ?? 0) > 0 && (
                                <div className="bg-cyan-50 rounded-lg p-2 text-center">
                                  <p className="font-bold text-cyan-700">${fmt(j.comisionReferido)}</p>
                                  <p className="text-[10px] text-gray-500">Com. referido 🔗</p>
                                  <p className="text-[9px] text-gray-400">10% confirmadas</p>
                                </div>
                              )}
                              {/* Comisión directa (solo superadmin) — separada */}
                              {(j.comisionDirecta ?? 0) > 0 && (
                                <div className="bg-purple-50 rounded-lg p-2 text-center">
                                  <p className="font-bold text-purple-600">${fmt(j.comisionDirecta)}</p>
                                  <p className="text-[10px] text-gray-500">Com. directas 🌐</p>
                                  <p className="text-[9px] text-gray-400">10% sin código</p>
                                </div>
                              )}
                              {j.comisionAdmin > 0 && (
                                <div className="bg-blue-50 rounded-lg p-2 text-center col-span-full">
                                  <div className="flex items-center justify-between px-1">
                                    <div className="text-left">
                                      <p className="font-bold text-blue-700">${fmt(j.comisionAdmin)}</p>
                                      <p className="text-[10px] text-gray-500">Fondo admin (15%)</p>
                                    </div>
                                    {j.comisionTotal > j.comisionAdmin && (
                                      <div className="text-right border-l border-blue-200 pl-3">
                                        <p className="font-bold text-indigo-700">${fmt(j.comisionTotal)}</p>
                                        <p className="text-[10px] text-gray-500">Total a pagar</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Lista de quinielas individuales */}
                            <div className="rounded-lg border border-gray-100 overflow-hidden overflow-x-auto">
                              <table className="w-full text-xs min-w-[360px]">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Folio</th>
                                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Cliente</th>
                                    <th className="text-center px-2 py-2 text-gray-500 font-medium hidden sm:table-cell">Canal</th>
                                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Monto</th>
                                    <th className="text-right px-2 py-2 text-gray-500 font-medium">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {j.quinielas.map((q) => {
                                    const { origen, origenColor } = getOrigenPago(q);
                                    return (
                                      <tr key={q.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">{q.folio}</td>
                                        <td className="px-3 py-2 text-gray-500 max-w-[90px] truncate">
                                          {q.nombreCliente ?? "—"}
                                          {/* Canal visible solo en mobile como badge inline */}
                                          <span className={`sm:hidden ml-1 text-[9px] px-1 py-0.5 rounded-full font-medium ${origenColor}`}>{origen}</span>
                                        </td>
                                        <td className="px-2 py-2 text-center hidden sm:table-cell">
                                          {(() => {
                                            const { pago, origenColor: oc } = getOrigenPago(q);
                                            return (
                                              <div className="flex flex-col items-center gap-0.5">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${oc}`}>{origen}</span>
                                                <span className="text-[9px] text-gray-400">{pago}</span>
                                              </div>
                                            );
                                          })()}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                                          ${fmt(q.monto)}
                                        </td>
                                        <td className={`px-2 py-2 text-right capitalize whitespace-nowrap ${ESTADO_COLOR[q.estado] ?? "text-gray-500"}`}>
                                          {q.estado}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Gran total */}
            {esSuperadmin && reporteConVentas.length > 1 && (
              <div className="bg-amber-900 text-white rounded-2xl p-4">
                <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-3">Gran Total</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold">{totalGlobal || totalGeneral}</p>
                    <p className="text-xs text-amber-300">Quinielas</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-yellow-300">${fmt(recaudadoGlobal || recaudadoGeneral)}</p>
                    <p className="text-xs text-amber-300">Recaudado</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-orange-300">${fmt(totalComisiones)}</p>
                    <p className="text-xs text-amber-300">Total comisiones</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <p className={`text-xl font-bold ${totalPendiente > 0 ? "text-red-300" : "text-green-300"}`}>
                      ${fmt(totalPendiente)}
                    </p>
                    <p className="text-xs text-amber-300">
                      {totalPendiente > 0 ? "⏳ Pendiente pagar" : "✅ Todo pagado"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sin ventas — colapsado */}
            {esSuperadmin && reporteSinVentas.length > 0 && (
              <details className="bg-white rounded-xl shadow-sm">
                <summary className="p-4 text-sm text-gray-400 cursor-pointer select-none">
                  {reporteSinVentas.length} vendedor{reporteSinVentas.length !== 1 ? "es" : ""} sin ventas aún
                </summary>
                <div className="px-4 pb-4 space-y-1">
                  {reporteSinVentas.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-sm text-gray-500">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROL_COLOR[v.rol] ?? "bg-gray-100 text-gray-400"}`}>
                        {ROL_LABEL[v.rol] ?? v.rol}
                      </span>
                      <span>{v.nombre}</span>
                      {v.puntoVenta && <span className="text-gray-400">· {v.puntoVenta}</span>}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Sin asignar */}
            {sinAsignar > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
                <p className="text-sm text-orange-700 font-medium">
                  ⚠️ {sinAsignar} quiniela{sinAsignar > 1 ? "s" : ""} de tienda sin vendedor asignado
                </p>
                <div className="space-y-1">
                  {sinAsignarDetalle.map((q) => (
                    <div key={q.folio} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-orange-100">
                      <div>
                        <span className="font-mono font-bold text-orange-800">{q.folio}</span>
                        <span className="text-gray-500 ml-2">{q.nombreCliente}</span>
                        <span className="text-gray-400 ml-2">· {q.jornada}</span>
                      </div>
                      <span className="text-gray-600 font-medium">${fmt(q.monto)}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/quinielas"
                  className="inline-block text-xs text-orange-700 underline"
                >
                  Ir a Modificar Quinielas para asignarlas →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
