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
  const [venderAbierto, setVenderAbierto] = useState(false);
  // Edición inline de nombre
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const iniciarEdicion = (j: JornadaResumen) => {
    setEditandoId(j.id);
    setEditNombre(j.nombre ?? `Jornada ${j.numero}`);
  };

  const guardarNombre = async (id: string) => {
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/jornadas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editNombre }),
      });
      if (res.ok) {
        setJornadas((prev) =>
          prev.map((j) => j.id === id ? { ...j, nombre: editNombre.trim() || null } : j)
        );
        setEditandoId(null);
      }
    } finally {
      setGuardando(false);
    }
  };

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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg shrink-0">{LIGA_ICON[j.liga] ?? "⚽"}</span>
                      <div className="flex-1 min-w-0">
                        {editandoId === j.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              className="border border-blue-400 rounded px-2 py-0.5 text-sm font-bold text-gray-800 w-full"
                              value={editNombre}
                              onChange={(e) => setEditNombre(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") guardarNombre(j.id); if (e.key === "Escape") setEditandoId(null); }}
                              autoFocus
                            />
                            <button
                              onClick={() => guardarNombre(j.id)}
                              disabled={guardando}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded shrink-0"
                            >
                              {guardando ? "…" : "✓"}
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="text-xs text-gray-400 px-1 py-1 shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-gray-800 truncate">
                              {j.liga} · {j.nombre ?? `Jornada ${j.numero}`}
                            </p>
                            <button
                              onClick={() => iniciarEdicion(j)}
                              className="text-gray-300 hover:text-blue-500 text-xs shrink-0"
                              title="Editar nombre"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">{j.temporada}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 shrink-0 ml-2">
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

          {/* ── Vender (expandible) ── */}
          <div className="rounded-xl overflow-hidden border border-amber-200">
            <button
              onClick={() => setVenderAbierto((v) => !v)}
              className="w-full bg-amber-700 hover:bg-amber-600 text-white p-4 flex items-center gap-3 transition-colors text-left"
            >
              <span className="text-2xl">🏪</span>
              <div className="flex-1">
                <p className="font-bold">Vender</p>
                <p className="text-amber-300/70 text-sm">Registro en tienda, imprimir formas y mi link</p>
              </div>
              <span className="text-amber-300 text-lg">{venderAbierto ? "▲" : "▼"}</span>
            </button>
            {venderAbierto && (
              <div className="bg-amber-50 divide-y divide-amber-100">
                <Link
                  href="/admin/tienda"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-lg">🏪</span>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Registro en Tienda</p>
                    <p className="text-amber-700/60 text-xs">Registrar quiniela presencial</p>
                  </div>
                </Link>
                <Link
                  href="/admin/mi-link"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-lg">🔗</span>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Mi Link de Ventas</p>
                    <p className="text-amber-700/60 text-xs">Compartir link y ver referidos</p>
                  </div>
                </Link>
                <Link
                  href="/admin/forma"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-lg">🖨️</span>
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Imprimir Formas</p>
                    <p className="text-amber-700/60 text-xs">Formas en blanco o con picks aleatorios</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

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
            href="/admin/vendedores"
            className="bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
          >
            <span className="text-2xl">🔗</span>
            <div>
              <p className="font-bold">Vendedores</p>
              <p className="text-cyan-200 text-sm">Links de referido y ventas por vendedor</p>
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

          {["superadmin", "admin"].includes(rol) && (
            <Link
              href="/admin/equipos"
              className="bg-stone-800 hover:bg-stone-700 text-white rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <span className="text-2xl">⚽</span>
              <div>
                <p className="font-bold">Catálogo de Equipos</p>
                <p className="text-stone-300 text-sm">Agregar y gestionar equipos por liga</p>
              </div>
            </Link>
          )}

          <Link
            href="/admin/perfil"
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl p-4 flex items-center gap-3 transition-colors"
          >
            <span className="text-2xl">👤</span>
            <div>
              <p className="font-bold">Mi Panel</p>
              <p className="text-gray-500 text-sm">Estadisticas personales, apostadores y perfil</p>
            </div>
          </Link>
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
