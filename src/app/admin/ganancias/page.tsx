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

export default function GananciasPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esAdminNav = ["admin", "superadmin"].includes(rol);

  const [porJornada, setPorJornada] = useState<JornadaRow[]>([]);
  const [comisionesAdmin, setComisionesAdmin] = useState<AdminRow[]>([]);
  const [totales, setTotales] = useState<Totales | null>(null);
  const [esVendedor, setEsVendedor] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ganancias")
      .then((r) => r.json())
      .then((data) => {
        setPorJornada(data.porJornada ?? []);
        setComisionesAdmin(data.comisionesAdmin ?? []);
        setTotales(data.totales ?? null);
        setEsVendedor(data.esVendedor ?? false);
        setEsAdmin(data.esAdmin ?? false);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const backHref = esAdminNav ? "/admin" : "/admin/tienda";
  const backLabel = esAdminNav ? "Admin" : "Mi Panel";

  const sinDatos = porJornada.length === 0 && comisionesAdmin.length === 0;

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

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
            {/* ── Ventas personales ── */}
            {porJornada.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium px-1 uppercase tracking-wider mb-3">
                  {porJornada.some((j) => j.tienda > 0)
                    ? "Comisión por ventas en tienda ($2/quiniela)"
                    : "Ventas por jornada"}
                </p>
                <div className="space-y-3">
                  {porJornada.map((j) => (
                    <div key={j.jornadaId} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">{j.jornadaNombre}</p>
                          <p className="text-xs text-gray-400">{j.liga}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {j.pagado ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-gray-700">{j.tienda}</p>
                          <p className="text-[10px] text-gray-500">Tienda</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-yellow-600">${fmt(j.recaudado)}</p>
                          <p className="text-[10px] text-gray-500">Recaudado</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-amber-600">${fmt(j.comision)}</p>
                          <p className="text-[10px] text-gray-500">Comisión</p>
                        </div>
                      </div>
                      {j.pagado && j.pagadoEn && (
                        <p className="text-xs text-green-600 mt-2">Pagado el {fmtFecha(j.pagadoEn)}</p>
                      )}
                    </div>
                  ))}
                </div>

                {totales && totales.comisionTienda > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between mt-3">
                    <div>
                      <p className="text-sm font-bold text-amber-800">Subtotal tienda</p>
                      <p className="text-xs text-amber-600">${fmt(totales.pagadoTienda)} pagado</p>
                    </div>
                    <p className="text-xl font-bold text-amber-700">${fmt(totales.comisionTienda)}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Fondo de administración — solo admins ── */}
            {esAdmin && comisionesAdmin.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium px-1 uppercase tracking-wider mb-3">
                  Fondo de administración · 15% del total repartido entre {comisionesAdmin[0]?.numAdmins ?? "—"} administradores
                </p>
                <div className="space-y-3">
                  {comisionesAdmin.map((j) => (
                    <div key={j.jornadaId} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">{j.jornadaNombre}</p>
                          <p className="text-xs text-gray-400">{j.liga} · {j.temporada}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {j.pagado ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-gray-700">${fmt(j.recaudadoTotal)}</p>
                          <p className="text-[10px] text-gray-500">Total jornada</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-blue-600">${fmt(j.recaudadoTotal * 0.15)}</p>
                          <p className="text-[10px] text-gray-500">15% fondo</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-indigo-600">${fmt(j.miParte)}</p>
                          <p className="text-[10px] text-gray-500">Tu parte</p>
                        </div>
                      </div>
                      {j.pagado && j.pagadoEn && (
                        <p className="text-xs text-green-600 mt-2">Pagado el {fmtFecha(j.pagadoEn)}</p>
                      )}
                    </div>
                  ))}
                </div>

                {totales && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between mt-3">
                    <div>
                      <p className="text-sm font-bold text-blue-800">Subtotal fondo admin</p>
                      <p className="text-xs text-blue-600">${fmt(totales.comisionAdmin - totales.pendienteAdmin)} pagado</p>
                    </div>
                    <p className="text-xl font-bold text-blue-700">${fmt(totales.comisionAdmin)}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Gran total ── */}
            {totales && (totales.comisionTienda > 0 || totales.comisionAdmin > 0) && (
              <div className="bg-amber-900 text-white rounded-2xl p-4">
                <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-3">Total acumulado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-amber-300">
                      ${fmt(totales.comisionTienda + totales.comisionAdmin)}
                    </p>
                    <p className="text-xs text-amber-400">Ganancias totales</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className={`text-xl font-bold ${(totales.pendienteTienda + totales.pendienteAdmin) > 0 ? "text-orange-300" : "text-green-300"}`}>
                      ${fmt(totales.pendienteTienda + totales.pendienteAdmin)}
                    </p>
                    <p className="text-xs text-amber-400">
                      {(totales.pendienteTienda + totales.pendienteAdmin) > 0 ? "Pendiente de cobrar" : "Todo pagado"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
