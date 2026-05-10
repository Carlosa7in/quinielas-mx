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
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ganancias")
      .then((r) => r.json())
      .then((data) => {
        setPorJornada(data.porJornada ?? []);
        setComisionesAdmin(data.comisionesAdmin ?? []);
        setTotales(data.totales ?? null);
        setEsAdmin(data.esAdmin ?? false);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const backHref  = esAdminNav ? "/admin" : "/admin/tienda";
  const backLabel = esAdminNav ? "Admin" : "Mi Panel";

  const totalQuinielas  = porJornada.reduce((s, j) => s + j.tienda + j.online, 0);
  const totalComision   = totales ? totales.comisionTienda + totales.comisionAdmin : 0;
  const totalPagado     = totales ? totales.pagadoTienda + (totales.comisionAdmin - totales.pendienteAdmin) : 0;
  const totalPendiente  = totales ? totales.pendienteTienda + totales.pendienteAdmin : 0;

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
            {/* ── Resumen global ── */}
            <div className="bg-amber-900 text-white rounded-2xl p-5 space-y-4">
              <p className="text-xs font-bold tracking-widest text-amber-400 uppercase">Resumen</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white">{totalQuinielas}</p>
                  <p className="text-xs text-amber-300 mt-0.5">Quinielas</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-300">${fmt(totalComision)}</p>
                  <p className="text-xs text-amber-300 mt-0.5">Ganado</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${totalPendiente > 0 ? "text-orange-300" : "text-green-300"}`}>
                    ${fmt(totalPendiente)}
                  </p>
                  <p className="text-xs text-amber-300 mt-0.5">
                    {totalPendiente > 0 ? "Pendiente" : "Al corriente"}
                  </p>
                </div>
              </div>
              {totalPagado > 0 && (
                <p className="text-xs text-amber-400 text-center">
                  ${fmt(totalPagado)} ya cobrado · ${fmt(totalPendiente)} por cobrar
                </p>
              )}
            </div>

            {/* ── Ventas en tienda por jornada ── */}
            {porJornada.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium px-1 uppercase tracking-wider mb-3">
                  Comisión por jornada
                </p>
                <div className="space-y-3">
                  {porJornada.map((j) => (
                    <div key={j.jornadaId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      {/* Cabecera jornada */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <div>
                          <p className="font-semibold text-gray-800">{j.jornadaNombre}</p>
                          <p className="text-xs text-gray-400">{j.liga}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {j.pagado ? "✓ Pagado" : "Pendiente"}
                        </span>
                      </div>

                      {/* Desglose */}
                      <div className="px-4 py-3 space-y-2">
                        {/* Ventas en tienda */}
                        {j.tienda > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              🏪 {j.tienda} quiniela{j.tienda !== 1 ? "s" : ""} en tienda × $2
                            </span>
                            <span className="font-bold text-amber-700">${fmt(j.tienda * 2)}</span>
                          </div>
                        )}
                        {/* Ventas online (referidos) */}
                        {j.online > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              🔗 {j.online} quiniela{j.online !== 1 ? "s" : ""} online × $2
                            </span>
                            <span className="font-bold text-cyan-700">${fmt(j.online * 2)}</span>
                          </div>
                        )}
                        {/* Divisor */}
                        <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                          <div className="text-xs text-gray-400">
                            Total recaudado: <span className="font-medium text-gray-600">${fmt(j.recaudado)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400">Tu comisión</span>
                            <p className="text-lg font-bold text-amber-600">${fmt(j.comision)}</p>
                          </div>
                        </div>
                      </div>

                      {j.pagado && j.pagadoEn && (
                        <div className="px-4 py-2 bg-green-50 border-t border-green-100">
                          <p className="text-xs text-green-600">Cobrado el {fmtFecha(j.pagadoEn)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Fondo de administración — solo admins ── */}
            {esAdmin && comisionesAdmin.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium px-1 uppercase tracking-wider mb-3">
                  Fondo de administración · 15% del total
                </p>
                <div className="space-y-3">
                  {comisionesAdmin.map((j) => (
                    <div key={j.jornadaId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <div>
                          <p className="font-semibold text-gray-800">{j.jornadaNombre}</p>
                          <p className="text-xs text-gray-400">{j.liga} · {j.temporada}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {j.pagado ? "✓ Pagado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Total jornada</span>
                          <span className="font-medium text-gray-700">${fmt(j.recaudadoTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">15% fondo ÷ {j.numAdmins} admins</span>
                          <span className="font-medium text-gray-700">${fmt(j.recaudadoTotal * 0.15)} ÷ {j.numAdmins}</span>
                        </div>
                        <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-400">Tu parte</span>
                          <p className="text-lg font-bold text-indigo-600">${fmt(j.miParte)}</p>
                        </div>
                      </div>
                      {j.pagado && j.pagadoEn && (
                        <div className="px-4 py-2 bg-green-50 border-t border-green-100">
                          <p className="text-xs text-green-600">Cobrado el {fmtFecha(j.pagadoEn)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
