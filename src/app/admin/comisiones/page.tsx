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
};

type JornadaDesglose = {
  jornadaId: string; jornadaNombre: string; liga: string; temporada: string;
  total: number; tienda: number; online: number;
  recaudado: number; comision: number; comisionAdmin: number; comisionTotal: number;
  pagado: boolean; pagadoEn: string | null; montoPagado: number | null;
  quinielas: QuinielaItem[];
};

type VendedorReporte = {
  id: string; nombre: string; rol: string; puntoVenta: string | null;
  total: number; tienda: number; online: number;
  recaudado: number; ganadoras: number; comisionTotal: number; comisionAdminTotal: number; pendientePago: number;
  porJornada: JornadaDesglose[];
};

const COMISION_TIENDA = 2;
const PCT_DUENOS = 0.15;

const ROL_LABEL: Record<string, string> = {
  superadmin: "Superadmin", admin: "Admin", vendedor: "Vendedor", tienda: "Tienda",
};
const ROL_COLOR: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700", admin: "bg-blue-100 text-blue-700",
  vendedor: "bg-green-100 text-green-700", tienda: "bg-amber-100 text-amber-700",
};
const CANAL_LABEL: Record<string, string> = { tienda: "Tienda", online: "Online" };
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
  const [numAdmins, setNumAdmins] = useState(0);
  const [recaudadoGlobal, setRecaudadoGlobal] = useState(0);
  const [jornadas, setJornadas] = useState<JornadaOpcion[]>([]);
  const [jornadaId, setJornadaId] = useState("");
  const [cargando, setCargando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [pagando, setPagando] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setJornadas(data));
  }, []);

  const cargar = useCallback(() => {
    setCargando(true);
    const url = jornadaId ? `/api/admin/comisiones?jornadaId=${jornadaId}` : "/api/admin/comisiones";
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setReporte(data.reporte ?? []); setSinAsignar(data.sinAsignar ?? 0); setNumAdmins(data.numAdmins ?? 0); setRecaudadoGlobal(data.recaudadoGlobal ?? 0); })
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
  const totalComisionesReferido = reporte.filter((v) => v.rol === "vendedor").reduce((s, v) => s + v.comisionTotal, 0);
  const baseDesglose = recaudadoGlobal > 0 ? recaudadoGlobal : recaudadoGeneral;
  const cutDuenos = baseDesglose * PCT_DUENOS;
  const cutTienda = totalTiendaAll * COMISION_TIENDA;
  const bolsaNeta = Math.max(baseDesglose - cutDuenos - cutTienda - totalComisionesReferido, 0);
  const totalComisiones = reporte.reduce((s, v) => s + v.comisionTotal, 0);
  const totalPendiente = reporte.reduce((s, v) => s + v.pendientePago, 0);

  const reporteConVentas = reporte.filter((v) => v.total > 0).sort((a, b) => b.total - a.total);
  const reporteSinVentas = reporte.filter((v) => v.total === 0);

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
          <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
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
            <p className="text-2xl font-bold text-green-700">{totalGeneral}</p>
            <p className="text-xs text-gray-500">Quinielas vendidas</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">${fmt(recaudadoGeneral)}</p>
            <p className="text-xs text-gray-500">Total recaudado</p>
          </div>
        </div>

        {/* Desglose financiero — solo superadmin */}
        {esSuperadmin && recaudadoGeneral > 0 && (
          <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">Desglose financiero</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-300">Total recaudado</span>
                <span className="font-bold">${fmt(baseDesglose)}</span>
              </div>
              {recaudadoGlobal > recaudadoGeneral && (
                <div className="flex justify-between text-stone-500 text-xs">
                  <span>↳ {fmt(recaudadoGeneral)} atribuido · {fmt(recaudadoGlobal - recaudadoGeneral)} sin asignar</span>
                </div>
              )}
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
                  <span>− Comisión tienda ($2 × {totalTiendaAll})</span>
                  <span className="font-bold">−${fmt(cutTienda)}</span>
                </div>
              )}
              {totalComisionesReferido > 0 && (
                <div className="flex justify-between text-cyan-400">
                  <span>− Comisión referidos ($2 × {reporte.filter((v) => v.rol === "vendedor").reduce((s, v) => s + v.total, 0)} confirmadas)</span>
                  <span className="font-bold">−${fmt(totalComisionesReferido)}</span>
                </div>
              )}
              <div className="border-t border-stone-700 pt-2 flex justify-between text-green-400">
                <span className="font-bold">💰 Bolsa para premios</span>
                <span className="font-black text-base">${fmt(bolsaNeta)}</span>
              </div>
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
                            <div className={`grid gap-2 ${j.comisionAdmin > 0 ? "grid-cols-2" : "grid-cols-3"}`}>
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
                              {j.comision > 0 && (
                                <div className={`rounded-lg p-2 text-center ${v.rol === "vendedor" ? "bg-cyan-50" : "bg-orange-50"}`}>
                                  <p className={`font-bold ${v.rol === "vendedor" ? "text-cyan-700" : "text-orange-600"}`}>${fmt(j.comision)}</p>
                                  <p className="text-[10px] text-gray-500">{v.rol === "vendedor" ? "Com. referido" : "Com. tienda"}</p>
                                  <p className="text-[9px] text-gray-400">$2 × {v.rol === "vendedor" ? j.total : j.tienda}</p>
                                </div>
                              )}
                              {j.comisionAdmin > 0 && (
                                <div className="bg-blue-50 rounded-lg p-2 text-center col-span-full">
                                  <div className="flex items-center justify-between px-1">
                                    <div className="text-left">
                                      <p className="font-bold text-blue-700">${fmt(j.comisionAdmin)}</p>
                                      <p className="text-[10px] text-gray-500">Fondo admin (15%)</p>
                                    </div>
                                    {j.comision > 0 && (
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
                            <div className="rounded-lg border border-gray-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Folio</th>
                                    <th className="text-left px-3 py-2 text-gray-500 font-medium">Cliente</th>
                                    <th className="text-center px-2 py-2 text-gray-500 font-medium">Canal</th>
                                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Monto</th>
                                    <th className="text-right px-3 py-2 text-gray-500 font-medium">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {j.quinielas.map((q) => (
                                    <tr key={q.id} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 font-mono text-gray-600">{q.folio}</td>
                                      <td className="px-3 py-2 text-gray-500 truncate max-w-[80px]">
                                        {q.nombreCliente ?? "—"}
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${q.canal === "tienda" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                          {CANAL_LABEL[q.canal] ?? q.canal}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-gray-700">
                                        ${fmt(q.monto)}
                                      </td>
                                      <td className={`px-3 py-2 text-right capitalize ${ESTADO_COLOR[q.estado] ?? "text-gray-500"}`}>
                                        {q.estado}
                                      </td>
                                    </tr>
                                  ))}
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
                    <p className="text-xl font-bold">{totalGeneral}</p>
                    <p className="text-xs text-amber-300">Quinielas</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-yellow-300">${fmt(recaudadoGeneral)}</p>
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
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-700 font-medium">
                  ⚠️ {sinAsignar} quiniela{sinAsignar > 1 ? "s" : ""} de tienda sin vendedor asignado
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Fueron registradas antes de agregar el seguimiento por usuario.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
