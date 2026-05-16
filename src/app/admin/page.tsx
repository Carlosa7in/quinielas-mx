"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LIGA_ICON } from "@/lib/equipos";
import DesgloseCobrado from "@/components/DesgloseCobrado";

type JornadaResumen = {
  id: string;
  numero: number;
  nombre: string | null;
  ventas: number;
  temporada: string;
  liga: string;
  estado: string;
  totalQuinielas: number;
  totalPartidos: number;
  recaudado: number;
  ganadoras: number;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const [jornadas, setJornadas] = useState<JornadaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seedStatus, setSeedStatus] = useState("");

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setJornadas(data); })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const inicializarDatos = async () => {
    setSeedStatus("Inicializando...");
    const res = await fetch("/api/admin/seed", { method: "POST" });
    const data = await res.json();
    setSeedStatus(data.message || data.error);
    window.location.reload();
  };

  const activas = jornadas.filter((j) => j.estado === "abierta");
  const hayJornadas = jornadas.length > 0;

  // Stats globales
  const totalQuinielas = jornadas.reduce((s, j) => s + j.totalQuinielas, 0);
  const totalRecaudado = jornadas.reduce((s, j) => s + j.recaudado, 0);
  const totalVentas    = jornadas.reduce((s, j) => s + (j.ventas ?? j.recaudado), 0);
  const totalGanadoras = jornadas.reduce((s, j) => s + j.ganadoras, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-6 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "40px", objectFit: "contain" }} />
            <h1 className="text-2xl font-bold">Panel Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{session?.user?.name}</p>
              <p className="text-amber-400 text-xs capitalize">{rol}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-amber-300 hover:text-white text-sm border border-amber-800 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Stats globales */}
        {hayJornadas && (
          <div>
            <p className="text-xs text-gray-400 font-medium px-1 mb-2">RESUMEN GLOBAL</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-700">{totalQuinielas}</p>
                <p className="text-xs text-gray-500">Quinielas</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm col-span-3 sm:col-span-1">
                <p className="text-2xl font-bold text-yellow-600">${totalRecaudado}</p>
                <p className="text-xs text-gray-500">Cobrado</p>
                <DesgloseCobrado cobrado={totalRecaudado} />
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-blue-600">{totalGanadoras}</p>
                <p className="text-xs text-gray-500">Ganadoras</p>
              </div>
            </div>
          </div>
        )}

        {/* Jornadas activas — botón compacto */}
        {cargando ? (
          <div className="bg-white rounded-xl p-5 text-center text-gray-400 shadow-sm">Cargando...</div>
        ) : activas.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-700 font-medium">No hay jornadas activas</p>
            <p className="text-yellow-600 text-sm mt-1">Crea una nueva jornada para comenzar</p>
          </div>
        ) : (
          <Link
            href="/admin/jornadas"
            className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-green-50 transition-colors"
          >
            <span className="text-2xl">📅</span>
            <div className="flex-1">
              <p className="font-bold text-gray-800">Jornadas Activas</p>
              <p className="text-sm text-gray-500">
                {activas.length} jornada{activas.length !== 1 ? "s" : ""} · {totalQuinielas} confirmadas · ${totalRecaudado} cobrado
              </p>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {activas.length}
            </span>
            <span className="text-gray-300 text-xl">›</span>
          </Link>
        )}

        {/* ── Mi Tienda ── */}
        <Link
          href="/admin/tienda"
          className="bg-amber-700 hover:bg-amber-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
        >
          <span className="text-2xl">🏪</span>
          <div className="flex-1">
            <p className="font-bold">Mi Tienda</p>
            <p className="text-amber-300/70 text-sm">Vender, mis ganancias, apostadores y perfil</p>
          </div>
          <span className="text-amber-300 text-lg">›</span>
        </Link>

        {/* ── Administración ── */}
        <div>
          <p className="text-xs text-gray-400 font-medium px-1 mb-2">ADMINISTRACIÓN</p>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/admin/resultados"
              className="bg-blue-700 hover:bg-blue-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-bold">Registrar Resultados</p>
                <p className="text-blue-200 text-sm">Capturar resultados y calcular ganadores</p>
              </div>
            </Link>

            <Link
              href="/admin/premiacion"
              className="bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">🏆</span>
              <div>
                <p className="font-bold">Premiación</p>
                <p className="text-yellow-200 text-sm">Ver ganadores y enviar notificaciones de premios</p>
              </div>
            </Link>

            <Link
              href="/admin/nueva-jornada"
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">📅</span>
              <div>
                <p className="font-bold">Nueva Jornada</p>
                <p className="text-gray-500 text-sm">Crear jornada con sus partidos</p>
              </div>
            </Link>

            <Link
              href="/admin/participantes"
              className="bg-teal-700 hover:bg-teal-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-bold">Participantes</p>
                <p className="text-teal-200 text-sm">Historial de clientes y notificaciones WhatsApp</p>
              </div>
            </Link>

            <Link
              href="/admin/quinielas"
              className="bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">✏️</span>
              <div>
                <p className="font-bold">Modificar Quinielas</p>
                <p className="text-indigo-200 text-sm">Editar quinielas de jornadas abiertas y cerradas</p>
              </div>
            </Link>

            {rol === "superadmin" && (
              <Link
                href="/admin/comisiones"
                className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
              >
                <span className="text-2xl">📈</span>
                <div>
                  <p className="font-bold">Comisiones</p>
                  <p className="text-orange-200 text-sm">Ventas y recaudado por punto de venta</p>
                </div>
              </Link>
            )}

            {rol === "superadmin" && (
              <Link
                href="/admin/usuarios"
                className="bg-purple-900 hover:bg-purple-800 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
              >
                <span className="text-2xl">👥</span>
                <div>
                  <p className="font-bold">Administradores</p>
                  <p className="text-purple-300 text-sm">Gestionar accesos y puntos de venta</p>
                </div>
              </Link>
            )}

            {rol === "superadmin" && (
              <Link
                href="/admin/cuentas"
                className="bg-teal-900 hover:bg-teal-800 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
              >
                <span className="text-2xl">🏦</span>
                <div>
                  <p className="font-bold">Cuentas Bancarias</p>
                  <p className="text-teal-300 text-sm">Gestionar cuentas para recibir transferencias</p>
                </div>
              </Link>
            )}

            {rol === "superadmin" && (
              <Link
                href="/admin/logos-check-db"
                className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
              >
                <span className="text-2xl">🖼️</span>
                <div>
                  <p className="font-bold">Verificar Logos</p>
                  <p className="text-slate-300 text-sm">Revisar y reparar logos de equipos</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Seed datos de ejemplo */}
        {!hayJornadas && !cargando && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Datos de ejemplo</h3>
            <p className="text-gray-500 text-sm mb-3">
              Crea una jornada de ejemplo para empezar a probar.
            </p>
            <button
              onClick={inicializarDatos}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Inicializar datos de prueba
            </button>
            {seedStatus && (
              <p className="text-amber-600 text-sm mt-2">{seedStatus}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
