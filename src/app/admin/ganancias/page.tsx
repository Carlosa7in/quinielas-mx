"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "America/Mexico_City",
  });

type JornadaRow = {
  jornadaId: string; jornadaNombre: string; liga: string;
  total: number; tienda: number; online: number; recaudado: number;
  comisionTienda: number; comisionReferido: number; comision: number;
  pagado: boolean; pagadoEn: string | null;
};

type AdminRow = {
  jornadaId: string; jornadaNombre: string; liga: string; temporada: string;
  recaudadoTotal: number; numAdmins: number; miParte: number;
  pagado: boolean; pagadoEn: string | null;
  fondoAdmin: number; comisionTienda: number; comisionReferido: number;
  comisionDirecta: number; bolsaNeta: number;
  ventasTienda: number; ventasReferido: number; ventasDirectas: number;
};

type DesgloseGlobal = {
  recaudado: number; fondoAdmin: number; comisionTienda: number;
  comisionReferido: number; comisionDirecta: number; bolsaNeta: number;
  numAdmins: number; miParteTotal: number;
};

type Totales = {
  comisionTienda: number; pagadoTienda: number; pendienteTienda: number;
  comisionAdmin: number; pendienteAdmin: number;
};

type UltimaQuiniela = {
  folio: string; nombreCliente: string; canal: string;
  usuarioId?: string | null; vendedorId?: string | null;
  monto: number; estadoPago: string; jornada: string;
};

function getOrigenPago(q: UltimaQuiniela): { origen: string; pago: string; color: string } {
  if (q.canal === "tienda")  return { origen: "Tienda",     pago: "Efectivo",       color: "bg-amber-100 text-amber-700"  };
  if (q.canal === "kiosko")  return { origen: "Kiosko",     pago: "Efectivo",       color: "bg-amber-100 text-amber-700"  };
  const esReferido = !!(q.usuarioId || q.vendedorId);
  const origen     = esReferido ? "Referencia" : "Directa";
  const color      = esReferido ? "bg-cyan-100 text-cyan-700" : "bg-purple-100 text-purple-700";
  const pago = q.canal === "transferencia" ? "Transferencia"
    : q.canal === "oxxo"  ? "OXXO"
    : q.canal === "online" ? "Online"
    : q.canal;
  return { origen, pago, color };
}

const CANAL_LABEL: Record<string, string> = {
  tienda: "Tienda", online: "Online", transferencia: "Transfer.", oxxo: "OXXO",
};

const ESTADO_STYLE: Record<string, string> = {
  confirmado: "bg-green-100 text-green-700",
  pendiente:  "bg-orange-100 text-orange-700",
  cancelado:  "bg-red-100 text-red-600",
};

// ── Bloque de desglose financiero por jornada (superadmin) ──────────────────
function DesgloseJornada({ j }: { j: AdminRow }) {
  return (
    <div className="space-y-2">
      {/* Resumen de ventas */}
      {(j.ventasTienda > 0 || j.ventasReferido > 0 || j.ventasDirectas > 0) && (
        <div className="flex gap-2 text-xs text-gray-500 flex-wrap">
          {j.ventasTienda   > 0 && <span>🏪 {j.ventasTienda} tienda</span>}
          {j.ventasReferido > 0 && <span>🔗 {j.ventasReferido} referido</span>}
          {j.ventasDirectas > 0 && <span>🌐 {j.ventasDirectas} directas</span>}
        </div>
      )}

      {/* Cajas de deducción */}
      <div className="grid grid-cols-2 gap-2">
        {j.comisionTienda > 0 && (
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <p className="font-bold text-orange-600">−${fmt(j.comisionTienda)}</p>
            <p className="text-[10px] text-gray-500">Com. tienda 🏪</p>
            <p className="text-[9px] text-gray-400">10% de ventas</p>
          </div>
        )}
        {j.comisionReferido > 0 && (
          <div className="bg-cyan-50 rounded-lg p-2 text-center">
            <p className="font-bold text-cyan-700">−${fmt(j.comisionReferido)}</p>
            <p className="text-[10px] text-gray-500">Com. referidos 🔗</p>
            <p className="text-[9px] text-gray-400">10% confirmadas</p>
          </div>
        )}
        {j.comisionDirecta > 0 && (
          <div className="bg-purple-50 rounded-lg p-2 text-center">
            <p className="font-bold text-purple-600">−${fmt(j.comisionDirecta)}</p>
            <p className="text-[10px] text-gray-500">Ventas directas 🌐</p>
            <p className="text-[9px] text-gray-400">10% sin código</p>
          </div>
        )}
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="font-bold text-green-700">${fmt(j.bolsaNeta)}</p>
          <p className="text-[10px] text-gray-500">💰 Bolsa premios</p>
          <p className="text-[9px] text-gray-400">${fmt(j.recaudadoTotal)} total</p>
        </div>
      </div>

      {/* Mi parte — misma estructura que comisiones */}
      <div className="bg-blue-50 rounded-lg p-2 text-center col-span-full">
        <div className="flex items-center justify-between px-1">
          <div className="text-left space-y-0.5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] text-gray-500">👤 Fondo admin (15%){j.numAdmins > 1 ? ` ÷ ${j.numAdmins}` : ""}</p>
              <p className="font-bold text-blue-700">${fmt(j.fondoAdmin / j.numAdmins)}</p>
            </div>
            {j.comisionDirecta > 0 && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] text-gray-500">🌐 Ventas directas (10%){j.numAdmins > 1 ? ` ÷ ${j.numAdmins}` : ""}</p>
                <p className="font-bold text-purple-600">${fmt(j.comisionDirecta / j.numAdmins)}</p>
              </div>
            )}
          </div>
          <div className="text-right border-l border-blue-200 pl-3 ml-3">
            <p className="font-black text-indigo-700 text-base">${fmt(j.miParte)}</p>
            <p className="text-[10px] text-gray-500">Total a cobrar</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GananciasPage() {
  const { data: session } = useSession();
  const rol    = (session?.user as { role?: string })?.role ?? "";
  const nombre = session?.user?.name ?? "";
  const esAdminNav = ["admin", "superadmin"].includes(rol);

  const [porJornada, setPorJornada]           = useState<JornadaRow[]>([]);
  const [comisionesAdmin, setComisionesAdmin] = useState<AdminRow[]>([]);
  const [totales, setTotales]                 = useState<Totales | null>(null);
  const [ultimasQ, setUltimasQ]               = useState<UltimaQuiniela[]>([]);
  const [desgloseGlobal, setDesgloseGlobal]   = useState<DesgloseGlobal | null>(null);
  const [esAdmin, setEsAdmin]                 = useState(false);
  const [cargando, setCargando]               = useState(true);
  const [jornadaAbierta, setJornadaAbierta]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/ganancias")
      .then((r) => r.json())
      .then((data) => {
        setPorJornada(data.porJornada ?? []);
        setComisionesAdmin(data.comisionesAdmin ?? []);
        setTotales(data.totales ?? null);
        setUltimasQ(data.ultimasQuinielas ?? []);
        setDesgloseGlobal(data.desgloseGlobal ?? null);
        setEsAdmin(data.esAdmin ?? false);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const backHref  = esAdminNav ? "/admin" : "/admin/tienda";
  const backLabel = esAdminNav ? "Admin" : "Mi Panel";

  const totalQuinielas = porJornada.reduce((s, j) => s + j.tienda + j.online, 0);
  const totalRecaudado = porJornada.reduce((s, j) => s + j.recaudado, 0);
  const totalComision  = totales ? totales.comisionTienda + totales.comisionAdmin : 0;
  const totalPendiente = totales ? totales.pendienteTienda + totales.pendienteAdmin : 0;

  const sinDatos = porJornada.length === 0 && comisionesAdmin.length === 0;

  const rolLabel: Record<string, string> = {
    tienda: "Tienda", vendedor: "Vendedor", admin: "Admin", superadmin: "Superadmin",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href={backHref} className="text-amber-400 text-sm">← {backLabel}</a>
            <h1 className="text-xl font-bold mt-1">Mis Ganancias</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "40px", objectFit: "contain" }} /></a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {cargando ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">Cargando...</div>
        ) : sinDatos ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">💰</p>
            <p className="font-medium text-gray-500">Sin ganancias todavía</p>
            <p className="text-sm mt-1">Las comisiones aparecerán aquí conforme registres quinielas</p>
          </div>
        ) : (
          <>
            {/* ── Saludo ── */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Bienvenido de nuevo</p>
                <p className="text-lg font-bold text-gray-800">Hola, {nombre.split(" ")[0]}</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800 capitalize">
                {rolLabel[rol] ?? rol}
              </span>
            </div>

            {/* ── Stats 2×2 ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-800">{totalQuinielas}</p>
                <p className="text-xs text-gray-500 mt-0.5">Quinielas vendidas</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">${fmt(totalRecaudado)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total generado</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">${fmt(totalComision)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Comisión ganada</p>
              </div>
              <div className={`rounded-xl shadow-sm p-4 text-center ${totalPendiente > 0 ? "bg-orange-50" : "bg-green-50"}`}>
                <p className={`text-2xl font-bold ${totalPendiente > 0 ? "text-orange-500" : "text-green-600"}`}>
                  ${fmt(totalPendiente)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {totalPendiente > 0 ? "Pendiente cobrar" : "Todo cobrado ✓"}
                </p>
              </div>
            </div>

            {/* ── Desglose global — solo superadmin ── */}
            {esAdmin && desgloseGlobal && desgloseGlobal.recaudado > 0 && (
              <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">Desglose global (todas las jornadas)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-300">Total recaudado</span>
                    <span className="font-bold">${fmt(desgloseGlobal.recaudado)}</span>
                  </div>
                  <div className="flex justify-between text-blue-400">
                    <span>
                      − 15% fondo admin
                      {desgloseGlobal.numAdmins > 1 && (
                        <span className="text-blue-500 text-xs ml-2">
                          (${fmt(desgloseGlobal.fondoAdmin / desgloseGlobal.numAdmins)} × {desgloseGlobal.numAdmins})
                        </span>
                      )}
                    </span>
                    <span className="font-bold">−${fmt(desgloseGlobal.fondoAdmin)}</span>
                  </div>
                  {desgloseGlobal.comisionTienda > 0 && (
                    <div className="flex justify-between text-orange-400">
                      <span>− Com. tienda (10%)</span>
                      <span className="font-bold">−${fmt(desgloseGlobal.comisionTienda)}</span>
                    </div>
                  )}
                  {desgloseGlobal.comisionReferido > 0 && (
                    <div className="flex justify-between text-cyan-400">
                      <span>− Com. referidos (10%)</span>
                      <span className="font-bold">−${fmt(desgloseGlobal.comisionReferido)}</span>
                    </div>
                  )}
                  {desgloseGlobal.comisionDirecta > 0 && (
                    <div className="flex justify-between text-purple-400">
                      <span>− Ventas directas 🌐 (10%)</span>
                      <span className="font-bold">−${fmt(desgloseGlobal.comisionDirecta)}</span>
                    </div>
                  )}
                  <div className="border-t border-stone-700 pt-2 flex justify-between text-green-400">
                    <span className="font-bold">💰 Bolsa total para premios</span>
                    <span className="font-black text-base">${fmt(desgloseGlobal.bolsaNeta)}</span>
                  </div>
                  <div className="border-t border-stone-700 pt-2 space-y-1">
                    <div className="flex justify-between text-indigo-300">
                      <span className="text-xs">👤 Mi parte fondo admin (15%)</span>
                      <span className="font-bold">${fmt(desgloseGlobal.fondoAdmin / desgloseGlobal.numAdmins)}</span>
                    </div>
                    {desgloseGlobal.comisionDirecta > 0 && (
                      <div className="flex justify-between text-purple-300">
                        <span className="text-xs">🌐 Mi parte ventas directas (10%)</span>
                        <span className="font-bold">${fmt(desgloseGlobal.comisionDirecta / desgloseGlobal.numAdmins)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white pt-1 border-t border-stone-600">
                      <span className="text-xs font-bold">Total a cobrar</span>
                      <span className="font-black">${fmt(desgloseGlobal.miParteTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Fondo admin por jornada — solo superadmin ── */}
            {esAdmin && comisionesAdmin.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Fondo de administración por jornada</h3>
                  <p className="text-xs text-gray-400 mt-0.5">15% del recaudado ÷ {comisionesAdmin[0]?.numAdmins} admin{comisionesAdmin[0]?.numAdmins !== 1 ? "s" : ""}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {comisionesAdmin.map((j) => {
                    const abierta = jornadaAbierta === `admin_${j.jornadaId}`;
                    return (
                      <div key={j.jornadaId}>
                        <button
                          onClick={() => setJornadaAbierta(abierta ? null : `admin_${j.jornadaId}`)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{j.liga} · {j.jornadaNombre}</p>
                            <p className="text-xs text-gray-400 mt-0.5">${fmt(j.recaudadoTotal)} recaudado total</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"
                            }`}>
                              ${fmt(j.miParte)} {j.pagado ? "✓" : "pend."}
                            </span>
                            <span className="text-gray-400 text-xs">{abierta ? "▲" : "▼"}</span>
                          </div>
                        </button>

                        {abierta && (
                          <div className="px-4 pb-4">
                            <DesgloseJornada j={j} />
                            {j.pagado && j.pagadoEn && (
                              <p className="text-xs text-green-600 mt-2 text-right">
                                Cobrado el {fmtFecha(j.pagadoEn)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Ventas por jornada — vendedores/tienda ── */}
            {porJornada.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Mis ventas por jornada</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {porJornada.map((j) => {
                    const abierta = jornadaAbierta === j.jornadaId;
                    return (
                      <div key={j.jornadaId}>
                        <button
                          onClick={() => setJornadaAbierta(abierta ? null : j.jornadaId)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{j.liga} · {j.jornadaNombre}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {j.tienda + j.online} quiniela{j.tienda + j.online !== 1 ? "s" : ""} · ${fmt(j.recaudado)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-600"
                            }`}>
                              ${fmt(j.comision)} {j.pagado ? "✓" : "pend."}
                            </span>
                            <span className="text-gray-400 text-xs">{abierta ? "▲" : "▼"}</span>
                          </div>
                        </button>

                        {abierta && (
                          <div className="px-4 pb-4 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-green-50 rounded-lg p-2 text-center">
                                <p className="font-bold text-green-700">{j.total}</p>
                                <p className="text-[10px] text-gray-500">Quinielas</p>
                                {(j.tienda > 0 || j.online > 0) && (
                                  <p className="text-[9px] text-gray-400">
                                    {j.tienda > 0 && `${j.tienda}T`}{j.tienda > 0 && j.online > 0 && " · "}{j.online > 0 && `${j.online}O`}
                                  </p>
                                )}
                              </div>
                              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                                <p className="font-bold text-yellow-600">${fmt(j.recaudado)}</p>
                                <p className="text-[10px] text-gray-500">Recaudado</p>
                              </div>
                              {(j.comisionTienda ?? 0) > 0 && (
                                <div className="bg-orange-50 rounded-lg p-2 text-center">
                                  <p className="font-bold text-orange-600">${fmt(j.comisionTienda)}</p>
                                  <p className="text-[10px] text-gray-500">Com. tienda 🏪</p>
                                  <p className="text-[9px] text-gray-400">10% de ${fmt(j.tienda * 20)}</p>
                                </div>
                              )}
                              {(j.comisionReferido ?? 0) > 0 && (
                                <div className="bg-cyan-50 rounded-lg p-2 text-center">
                                  <p className="font-bold text-cyan-700">${fmt(j.comisionReferido)}</p>
                                  <p className="text-[10px] text-gray-500">Com. referido 🔗</p>
                                  <p className="text-[9px] text-gray-400">10% confirmadas</p>
                                </div>
                              )}
                            </div>
                            {j.comision > 0 && (
                              <div className="bg-blue-50 rounded-lg p-2 flex items-center justify-between px-3">
                                <p className="text-[10px] text-gray-500">Total comisión a cobrar</p>
                                <p className="font-black text-blue-700">${fmt(j.comision)}</p>
                              </div>
                            )}
                            {j.pagado && j.pagadoEn && (
                              <p className="text-xs text-green-600 text-right">Cobrado el {fmtFecha(j.pagadoEn)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Últimas quinielas ── */}
            {ultimasQ.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Últimas quinielas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left px-4 py-2 font-medium">Folio</th>
                        <th className="text-left px-4 py-2 font-medium">Cliente</th>
                        <th className="text-left px-4 py-2 font-medium">Canal</th>
                        <th className="text-right px-4 py-2 font-medium">Monto</th>
                        <th className="text-right px-4 py-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {ultimasQ.map((q) => (
                        <tr key={q.folio} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{q.folio}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[100px]">{q.nombreCliente}</td>
                          <td className="px-4 py-2.5">
                            {(() => {
                              const { origen, pago, color } = getOrigenPago(q);
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${color}`}>{origen}</span>
                                  <span className="text-[10px] text-gray-400">{pago}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800">${fmt(q.monto)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLE[q.estadoPago] ?? "bg-gray-100 text-gray-500"}`}>
                              {q.estadoPago === "confirmado" ? "Pagado" : q.estadoPago === "pendiente" ? "Pendiente" : q.estadoPago}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
