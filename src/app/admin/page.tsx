"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

type Jornada = {
  id: string;
  numero: number;
  temporada: string;
  estado: string;
  partidos: { id: string }[];
  quinielas: { id: string; estado: string }[];
};

export default function AdminPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [seedStatus, setSeedStatus] = useState("");

  useEffect(() => {
    fetch("/api/jornadas")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setJornada(data);
      });
  }, []);

  const inicializarDatos = async () => {
    setSeedStatus("Inicializando...");
    const res = await fetch("/api/admin/seed", { method: "POST" });
    const data = await res.json();
    setSeedStatus(data.message || data.error);
    window.location.reload();
  };

  const totalQuinielas = jornada?.quinielas?.length ?? 0;
  const ganadoras = jornada?.quinielas?.filter((q) => q.estado === "ganadora").length ?? 0;
  const recaudado = totalQuinielas * 20;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-900 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Panel Admin</h1>
            <p className="text-green-300 text-sm">Quinielas MX · Liga MX</p>
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
        {/* Jornada activa */}
        {jornada ? (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-800">
                  Jornada {jornada.numero} · {jornada.temporada}
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    jornada.estado === "abierta"
                      ? "bg-green-100 text-green-700"
                      : jornada.estado === "finalizada"
                      ? "bg-gray-100 text-gray-600"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {jornada.estado}
                </span>
              </div>
              <div className="text-right text-sm text-gray-500">
                {jornada.partidos.length} partidos
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{totalQuinielas}</p>
                <p className="text-xs text-gray-500">Quinielas</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">${recaudado}</p>
                <p className="text-xs text-gray-500">Recaudado</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{ganadoras}</p>
                <p className="text-xs text-gray-500">Ganadoras</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-700 font-medium">No hay jornada activa</p>
            <p className="text-yellow-600 text-sm mt-1">
              Crea una nueva jornada o inicializa datos de ejemplo
            </p>
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

          {jornada && (
            <Link
              href={`/admin/forma/${jornada.id}`}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">🖨️</span>
              <div>
                <p className="font-bold">Imprimir Formas</p>
                <p className="text-gray-500 text-sm">Formas en blanco o con picks aleatorios</p>
              </div>
            </Link>
          )}

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

          {rol === "superadmin" && (
            <Link
              href="/admin/usuarios"
              className="bg-purple-900 hover:bg-purple-800 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">👥</span>
              <div>
                <p className="font-bold">Administradores</p>
                <p className="text-purple-300 text-sm">Gestionar accesos al panel admin</p>
              </div>
            </Link>
          )}
        </div>

        {/* Seed datos de ejemplo */}
        {!jornada && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Datos de ejemplo</h3>
            <p className="text-gray-500 text-sm mb-3">
              Crea un administrador y una jornada de ejemplo para empezar a probar.
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
