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
  comision: number; pagado: boolean; pagadoEn: string | null;
};

type AdminRow = {
  jornadaId: string; jornadaNombre: string; liga: string; temporada: string;
  recaudadoTotal: number; numAdmins: number; miParte: number;
  pagado: boolean; pagadoEn: string | null;
};

type Totales = {
  comisionTienda: number; pagadoTienda: number; pendienteTienda: number;
  comisionAdmin: number; pendienteAdmin: number;
};

type UltimaQuiniela = {
  folio: string; nombreCliente: string; canal: string;
  monto: number; estadoPago: string; jornada: string;
};

const CANAL_LABEL: Record<string, string> = {
  tienda: "Tienda", online: "Online", transferencia: "Transfer.", oxxo: "OXXO",
};

const ESTADO_STYLE: Record<string, string> = {
  confirmado: "bg-green-100 text-green-700",
  pendiente:  "bg-orange-100 text-orange-700",
  cancelado:  "bg-red-100 text-red-600",
};

export default function GananciasPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const nombre = session?.user?.name ?? "";
  const esAdminNav = ["admin", "superadmin"].includes(rol);

  const [porJornada, setPorJornada]           = useState<JornadaRow[]>([]);
  const [comisionesAdmin, setComisionesAdmin] = useState<AdminRow[]>([]);
  const [totales, setTotales]                 = useState<Totales | null>(null);
  const [ultimasQ, setUltimasQ]               = useState<UltimaQuiniela[]>([]);
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
          <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "40px", objectFit: "contain" }} />
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

            {/* ── Ventas por jornada ── */}
            {porJornada.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Ventas por jornada</h3>
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
                          <div className="px-4 pb-4 space-y-2 bg-gray-50">
                            {j.tienda > 0 && (
                              <div className="flex justify-between text-sm pt-2">
                                <span className="text-gray-500">🏪 {j.tienda} en tienda × $2</span>
                                <span className="font-semibold text-amber-700">${fmt(j.tienda * 2)}</span>
                              </div>
                            )}
                            {j.online > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">🔗 {j.online} online × $2</span>
                                <span className="font-semibold text-cyan-700">${fmt(j.online * 2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                              <span className="text-gray-400">Total recaudado</span>
                              <span className="text-gray-600 font-medium">${fmt(j.recaudado)}</span>
                            </div>
                            {j.pagado && j.pagadoEn && (
                              <p className="text-xs text-green-600">Cobrado el {fmtFecha(j.pagadoEn)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Fondo admin ── */}
            {esAdmin && comisionesAdmin.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Fondo de administración</h3>
                  <p className="text-xs text-gray-400 mt-0.5">15% del total ÷ {comisionesAdmin[0]?.numAdmins} admins</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {comisionesAdmin.map((j) => (
                    <div key={j.jornadaId} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{j.jornadaNombre}</p>
                        <p className="text-xs text-gray-400">{j.liga} · ${fmt(j.recaudadoTotal)} total</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">${fmt(j.miParte)}</p>
                        <p className={`text-xs ${j.pagado ? "text-green-600" : "text-orange-500"}`}>
                          {j.pagado ? `Cobrado ${j.pagadoEn ? fmtFecha(j.pagadoEn) : ""}` : "Pendiente"}
                        </p>
                      </div>
                    </div>
                  ))}
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
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {CANAL_LABEL[q.canal] ?? q.canal}
                            </span>
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
