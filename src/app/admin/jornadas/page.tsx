"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

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

export default function JornadasPage() {
  const [jornadas, setJornadas] = useState<JornadaResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"activas" | "todas">("activas");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setJornadas(data); })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

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

  const activas = jornadas.filter((j) => j.estado === "abierta");
  const mostrar = tab === "activas" ? activas : jornadas;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-amber-400 text-sm">← Admin</Link>
            <h1 className="text-xl font-bold mt-1">Jornadas</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "40px", objectFit: "contain" }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setTab("activas")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "activas" ? "bg-green-700 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            🟢 Activas
            {activas.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "activas" ? "bg-white/30" : "bg-gray-100 text-gray-500"}`}>
                {activas.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("todas")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "todas" ? "bg-green-700 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            📋 Todas
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "todas" ? "bg-white/30" : "bg-gray-100 text-gray-500"}`}>
              {jornadas.length}
            </span>
          </button>
        </div>

        {cargando ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">Cargando...</div>
        ) : mostrar.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-yellow-700 font-medium">No hay jornadas activas</p>
            <p className="text-yellow-600 text-sm mt-1">Crea una nueva jornada para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mostrar.map((j) => (
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
                            onKeyDown={(e) => {
                              if (e.key === "Enter") guardarNombre(j.id);
                              if (e.key === "Escape") setEditandoId(null);
                            }}
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
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                    j.estado === "abierta" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {j.estado}
                  </span>
                </div>

                {/* Stats */}
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
        )}

        {/* Nueva jornada */}
        <Link
          href="/admin/nueva-jornada"
          className="bg-white border border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 text-gray-500 hover:text-green-700 rounded-xl p-4 flex items-center justify-center gap-2 transition-colors"
        >
          <span className="text-lg">＋</span>
          <span className="font-medium text-sm">Nueva Jornada</span>
        </Link>
      </div>
    </div>
  );
}
