"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

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
  recaudado: number;
  ganadoras: number;
};

export default function ComisionesPage() {
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

  const totalGeneral = reporte.reduce((s, v) => s + v.total, 0);
  const recaudadoGeneral = reporte.reduce((s, v) => s + v.recaudado, 0);

  const ROL_LABEL: Record<string, string> = {
    superadmin: "Superadmin",
    admin: "Admin",
    vendedor: "Vendedor",
  };

  const ROL_COLOR: Record<string, string> = {
    superadmin: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    vendedor: "bg-green-100 text-green-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-900 text-white py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/admin" className="text-green-300 text-sm">← Admin</Link>
          <h1 className="text-xl font-bold mt-1">Comisiones por Punto de Venta</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Filtro jornada */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <label className="text-sm font-medium text-gray-600 block mb-2">Filtrar por jornada</label>
          <select
            value={jornadaId}
            onChange={(e) => setJornadaId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
            <p className="text-2xl font-bold text-yellow-600">${recaudadoGeneral}</p>
            <p className="text-xs text-gray-500">Total recaudado</p>
          </div>
        </div>

        {/* Tabla de vendedores */}
        {cargando ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : reporte.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">📊</p>
            <p>No hay registros de tienda todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reporte
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
                    {v.total === 0 && (
                      <span className="text-xs text-gray-400">Sin registros</span>
                    )}
                  </div>

                  {v.total > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-green-50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-green-700">{v.total}</p>
                        <p className="text-xs text-gray-500">Quinielas</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-yellow-600">${v.recaudado}</p>
                        <p className="text-xs text-gray-500">Recaudado</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                        <p className="text-xl font-bold text-blue-600">{v.ganadoras}</p>
                        <p className="text-xs text-gray-500">Ganadoras</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

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
