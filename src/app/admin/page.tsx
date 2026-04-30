"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

type JornadaResumen = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  estado: string;
  totalQuinielas: number;
  totalPartidos: number;
  recaudado: number;
  ganadoras: number;
};

const LIGA_ICON: Record<string, string> = {
  "Liga MX": "🇲🇽",
  "Champions League": "⭐",
  "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "La Liga": "🇪🇸",
  "Mixta": "⚽",
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
      .then((data) => setJornadas(data))
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
  const totalGanadoras = jornadas.reduce((s, j) => s + j.ganadoras, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-900 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "40px", objectFit: "contain" }} />
            <h1 className="text-2xl font-bold">Panel Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{session?.user?.name}</p>
              <p className="text-green-400 text-xs capitalize">{rol}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-green-300 hover:text-white text-sm border border-green-700 hover:border-green-400 px-3 py-1.5 rounded-lg transition-colors"
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
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-yellow-600">${totalRecaudado}</p>
                <p className="text-xs text-gray-500">Recaudado</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-blue-600">{totalGanadoras}</p>
                <p className="text-xs text-gray-500">Ganadoras</p>
              </div>
            </div>
          </div>
        )}

        {/* Jornadas activas */}
        {cargando ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
            Cargando...
          </div>
        ) : activas.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-700 font-medium">No hay jornadas activas</p>
            <p className="text-yellow-600 text-sm mt-1">Crea una nueva jornada para comenzar</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-400 font-medium px-1 mb-2">
              JORNADAS ACTIVAS ({activas.length})
            </p>
            <div className="space-y-3">
              {activas.map((j) => (
                <div key={j.id} className="bg-white rounded-xl shadow-sm p-4">
                  {/* Título */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{LIGA_ICON[j.liga] ?? "⚽"}</span>
                      <div>
                        <p className="font-bold text-gray-800">
                          {j.liga} · {j.nombre ?? `Jornada ${j.numero}`}
                        </p>
                        <p className="text-xs text-gray-400">{j.temporada}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                      abierta
                    </span>
                  </div>

                  {/* Stats de la jornada */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-green-700">{j.totalQuinielas}</p>
                      <p className="text-xs text-gray-500">Quinielas</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-yellow-600">${j.recaudado}</p>
                      <p className="text-xs text-gray-500">Recaudado</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-blue-600">{j.totalPartidos}</p>
                      <p className="text-xs text-gray-500">Partidos</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="grid grid-cols-1 gap-3">
          <Link
            href="/admin/quinielas"
            className="bg-purple-700 hover:bg-purple-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-bold">Ver Quinielas</p>
              <p className="text-purple-200 text-sm">Lista de todas las quinielas registradas</p>
            </div>
          </Link>

          <Link
            href="/admin/tienda"
            className="bg-green-700 hover:bg-green-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
          >
            <span className="text-2xl">🏪</span>
            <div>
              <p className="font-bold">Registro en Tienda</p>
              <p className="text-green-200 text-sm">Registrar quiniela presencial e imprimir ticket</p>
            </div>
          </Link>

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
            href="/admin/forma"
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl p-4 flex items-center gap-3 transition-colors"
          >
            <span className="text-2xl">🖨️</span>
            <div>
              <p className="font-bold">Imprimir Formas</p>
              <p className="text-gray-500 text-sm">Formas en blanco o con picks aleatorios</p>
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

          {rol === "superadmin" && (
            <Link
              href="/admin/comisiones"
              className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">💰</span>
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
              <p className="text-green-600 text-sm mt-2">{seedStatus}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
