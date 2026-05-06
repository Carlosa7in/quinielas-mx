"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type JornadaOpcion = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
};

type VendedorReporte = {
  id: string;
  nombre: string;
  rol: string;
  puntoVenta: string | null;
  total: number;
  tienda: number;
  online: number;
  recaudado: number;
  ganadoras: number;
};

export default function ComisionesPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esSuperadmin = rol === "superadmin";

  const [reporte, setReporte] = useState<VendedorReporte[]>([]);
  const [sinAsignar, setSinAsignar] = useState(0);
  const [jornadas, setJornadas] = useState<JornadaOpcion[]>([]);
  const [jornadaId, setJornadaId] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data) => setJornadas(data));
  }, []);

  useEffect(() => {
    setCargando(true);
    const url = jornadaId
      ? `/api/admin/comisiones?jornadaId=${jornadaId}`
      : "/api/admin/comisiones";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setReporte(data.reporte ?? []);
        setSinAsignar(data.sinAsignar ?? 0);
      })
      .finally(() => setCargando(false));
  }, [jornadaId]);

  const COMISION_TIENDA = 2;   // $2 por quiniela vendida en tienda
  const PCT_DUENOS      = 0.15; // 15%

  const totalGeneral     = reporte.reduce((s, v) => s + v.total, 0);
  const recaudadoGeneral = reporte.reduce((s, v) => s + v.recaudado, 0);
  const totalTiendaAll   = reporte.reduce((s, v) => s + v.tienda, 0);
  const cutDuenos        = recaudadoGeneral * PCT_DUENOS;
  const cutTienda        = totalTiendaAll * COMISION_TIENDA;
  const bolsaNeta        = Math.max(recaudadoGeneral - cutDuenos - cutTienda, 0);
  const totalComisiones  = reporte.reduce((s, v) => s + v.tienda * COMISION_TIENDA, 0);

  const ROL_LABEL: Record<string, string> = {
    superadmin: "Superadmin",
    admin: "Admin",
    vendedor: "Vendedor",
    tienda: "Tienda",
  };

  const ROL_COLOR: Record<string, string> = {
    superadmin: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    vendedor: "bg-green-100 text-green-700",
    tienda: "bg-amber-100 text-amber-700",
  };

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const reporteConVentas = reporte.filter((v) => v.total > 0);
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
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
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
                <span className="font-bold">${fmt(recaudadoGeneral)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>− 15% dueños</span>
                <span className="font-bold">−${fmt(cutDuenos)}</span>
              </div>
              <div className="flex justify-between text-orange-400">
                <span>− Comisión tienda ($2 × {totalTiendaAll})</span>
                <span className="font-bold">−${fmt(cutTienda)}</span>
              </div>
              <div className="border-t border-stone-700 pt-2 flex justify-between text-green-400">
                <span className="font-bold">💰 Bolsa para premios</span>
                <span className="font-black text-base">${fmt(bolsaNeta)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de vendedores */}
        {cargando ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : reporte.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">📊</p>
            <p>No hay registros todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Vendedores con ventas */}
            {reporteConVentas
              .sort((a, b) => b.total - a.total)
              .map((v) => (
                <div key={v.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{v.nombre}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLOR[v.rol] ?? "bg-gray-100 text-gray-500"}`}>
                          {ROL_LABEL[v.rol] ?? v.rol}
                        </span>
                      </div>
                      {v.puntoVenta && (
                        <p className="text-sm text-gray-500 mt-0.5">📍 {v.puntoVenta}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-green-700">{v.total}</p>
                      <p className="text-xs text-gray-500">Quinielas</p>
                      {(v.tienda > 0 || v.online > 0) && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {v.tienda > 0 && `${v.tienda} tienda`}
                          {v.tienda > 0 && v.online > 0 && " · "}
                          {v.online > 0 && `${v.online} online`}
                        </p>
                      )}
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-yellow-600">${fmt(v.recaudado)}</p>
                      <p className="text-xs text-gray-500">Recaudado</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-orange-600">${fmt(v.tienda * COMISION_TIENDA)}</p>
                      <p className="text-xs text-gray-500">Comisión</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">$2 × {v.tienda}</p>
                    </div>
                  </div>
                </div>
              ))}

            {/* Gran total — solo cuando hay más de un vendedor */}
            {esSuperadmin && reporteConVentas.length > 1 && (
              <div className="bg-amber-900 text-white rounded-2xl p-4">
                <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-3">
                  Gran Total
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-white">{totalGeneral}</p>
                    <p className="text-xs text-amber-300">Quinielas</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-yellow-300">${fmt(recaudadoGeneral)}</p>
                    <p className="text-xs text-amber-300">Recaudado</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2.5 text-center">
                    <p className="text-xl font-bold text-orange-300">${fmt(totalComisiones)}</p>
                    <p className="text-xs text-amber-300">Total comisiones</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sin ventas aún */}
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
