"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  puntoVenta: string | null;
  username: string | null;
};

type Stats = {
  totalQuinielas: number;
  totalRecaudado: number;
  comisionGanada: number;
  comisionPendiente: number;
};

type JornadaRow = {
  jornadaId: string;
  jornadaNombre: string;
  liga: string;
  total: number;
  tienda: number;
  online: number;
  recaudado: number;
  comision: number;
  pagado: boolean;
  pagadoEn: string | null;
};

type Apostador = {
  nombre: string;
  telefono: string | null;
  totalQuinielas: number;
};

type Reciente = {
  folio: string;
  monto: number;
  canal: string;
  estado: string;
  nombreCliente: string | null;
  jornadaNombre: string;
};

type PerfilData = {
  usuario: Usuario;
  stats: Stats;
  porJornada: JornadaRow[];
  apostadores: Apostador[];
  recientes: Reciente[];
};

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
const CANAL_COLOR: Record<string, string> = {
  tienda: "bg-amber-100 text-amber-700",
  online: "bg-blue-100 text-blue-700",
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente: "text-yellow-600",
  confirmado: "text-green-600",
  ganadora: "text-amber-600 font-bold",
  perdedora: "text-gray-400",
};

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });

type Tab = "resumen" | "apostadores" | "ganancias" | "perfil";

export default function PerfilPage() {
  const [data, setData] = useState<PerfilData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<Tab>("resumen");
  const [jornadasExpandidas, setJornadasExpandidas] = useState<Set<string>>(new Set());

  // Edit form state
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editPuntoVenta, setEditPuntoVenta] = useState("");
  const [pwActual, setPwActual] = useState("");
  const [pwNueva, setPwNueva] = useState("");
  const [pwConfirmar, setPwConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [feedbackPerfil, setFeedbackPerfil] = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/perfil")
      .then((r) => r.json())
      .then((d: PerfilData) => {
        setData(d);
        setEditNombre(d.usuario.nombre ?? "");
        setEditTelefono(d.usuario.telefono ?? "");
        setEditPuntoVenta(d.usuario.puntoVenta ?? "");
      })
      .finally(() => setCargando(false));
  }, []);

  const toggleJornada = (id: string) =>
    setJornadasExpandidas((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackPerfil(null);

    if (pwNueva && pwNueva !== pwConfirmar) {
      setFeedbackPerfil({ tipo: "err", msg: "Las contraseñas nuevas no coinciden" });
      return;
    }

    setGuardando(true);
    try {
      const body: Record<string, string> = {
        nombre: editNombre,
        telefono: editTelefono,
        puntoVenta: editPuntoVenta,
      };
      if (pwNueva) {
        body.password = pwNueva;
        body.passwordActual = pwActual;
      }

      const res = await fetch("/api/admin/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedbackPerfil({ tipo: "err", msg: json.error ?? "Error al guardar" });
      } else {
        setData((prev) => prev ? { ...prev, usuario: json.usuario } : prev);
        setPwActual("");
        setPwNueva("");
        setPwConfirmar("");
        setFeedbackPerfil({ tipo: "ok", msg: "Perfil actualizado correctamente" });
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">Error al cargar el perfil</p>
      </div>
    );
  }

  const { usuario, stats, porJornada, apostadores, recientes } = data;

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "apostadores", label: "Apostadores" },
    { id: "ganancias", label: "Ganancias" },
    { id: "perfil", label: "Mi Perfil" },
  ];

  const totalComision = porJornada.reduce((s, j) => s + j.comision, 0);
  const totalPagado = porJornada.filter((j) => j.pagado).reduce((s, j) => s + j.comision, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link href="/admin/tienda" className="text-amber-400 text-sm">
              ← Inicio
            </Link>
            <h1 className="text-xl font-bold mt-1">Mi Panel</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-tablitas.png"
            alt="Tablitas"
            style={{ height: "44px", objectFit: "contain", flexShrink: 0 }}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? "bg-amber-700 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── Tab: Resumen ─────────────────────────────────────────────── */}
        {tab === "resumen" && (
          <>
            {/* Welcome card */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bienvenido de nuevo</p>
                  <h2 className="text-xl font-bold text-gray-800">Hola, {usuario.nombre}</h2>
                  {usuario.puntoVenta && (
                    <p className="text-sm text-gray-500 mt-1">📍 {usuario.puntoVenta}</p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${ROL_COLOR[usuario.rol] ?? "bg-gray-100 text-gray-500"}`}>
                  {ROL_LABEL[usuario.rol] ?? usuario.rol}
                </span>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{stats.totalQuinielas}</p>
                <p className="text-xs text-gray-500">Quinielas vendidas</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">${fmt(stats.totalRecaudado)}</p>
                <p className="text-xs text-gray-500">Recaudado</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">${fmt(stats.comisionGanada)}</p>
                <p className="text-xs text-gray-500">Comisión ganada</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className={`text-2xl font-bold ${stats.comisionPendiente > 0 ? "text-orange-500" : "text-gray-400"}`}>
                  ${fmt(stats.comisionPendiente)}
                </p>
                <p className="text-xs text-gray-500">Pendiente de cobrar</p>
              </div>
            </div>

            {/* Ventas por jornada */}
            {porJornada.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Ventas por jornada</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {porJornada.map((j) => {
                    const open = jornadasExpandidas.has(j.jornadaId);
                    return (
                      <div key={j.jornadaId}>
                        <button
                          onClick={() => toggleJornada(j.jornadaId)}
                          className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-700 text-sm">
                                {j.liga} · {j.jornadaNombre}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{j.total} quinielas · ${fmt(j.recaudado)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {j.comision > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                  {j.pagado ? "Pagado" : `$${fmt(j.comision)} pend.`}
                                </span>
                              )}
                              <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
                            </div>
                          </div>
                        </button>
                        {open && (
                          <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                            <div className="bg-green-50 rounded-lg p-2.5 text-center">
                              <p className="font-bold text-green-700">{j.total}</p>
                              <p className="text-[10px] text-gray-500">Quinielas</p>
                              {(j.tienda > 0 || j.online > 0) && (
                                <p className="text-[9px] text-gray-400">
                                  {j.tienda > 0 && `${j.tienda}T`}{j.tienda > 0 && j.online > 0 && "·"}{j.online > 0 && `${j.online}O`}
                                </p>
                              )}
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-2.5 text-center">
                              <p className="font-bold text-yellow-600">${fmt(j.recaudado)}</p>
                              <p className="text-[10px] text-gray-500">Recaudado</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                              <p className="font-bold text-orange-600">${fmt(j.comision)}</p>
                              <p className="text-[10px] text-gray-500">Comisión</p>
                              {j.pagado && j.pagadoEn && (
                                <p className="text-[9px] text-green-600">{fmtFecha(j.pagadoEn)}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ultimas quinielas */}
            {recientes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Ultimas quinielas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Folio</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Cliente</th>
                        <th className="text-center px-2 py-2 text-gray-500 font-medium">Canal</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium">Monto</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {recientes.map((q) => (
                        <tr key={q.folio} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-600">{q.folio}</td>
                          <td className="px-3 py-2 text-gray-500 truncate max-w-[80px]">
                            {q.nombreCliente ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CANAL_COLOR[q.canal] ?? "bg-gray-100 text-gray-600"}`}>
                              {q.canal === "tienda" ? "Tienda" : "Online"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-700">
                            ${fmt(q.monto)}
                          </td>
                          <td className={`px-3 py-2 text-right capitalize ${ESTADO_COLOR[q.estado] ?? "text-gray-500"}`}>
                            {q.estado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats.totalQuinielas === 0 && (
              <div className="text-center py-10 text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p>Todavia no tienes quinielas registradas</p>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Apostadores ─────────────────────────────────────────── */}
        {tab === "apostadores" && (
          <>
            {apostadores.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">👥</p>
                <p className="font-medium text-gray-500">Sin apostadores todavia</p>
                <p className="text-sm mt-1">Los clientes apareceran aqui cuando registres quinielas</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Apostadores</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{apostadores.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {apostadores.map((a, i) => (
                    <div key={i} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {a.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{a.nombre}</p>
                          {a.telefono && (
                            <p className="text-xs text-gray-400">{a.telefono}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-700">{a.totalQuinielas}</p>
                        <p className="text-xs text-gray-400">quinielas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Ganancias ───────────────────────────────────────────── */}
        {tab === "ganancias" && (
          <>
            {porJornada.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">💰</p>
                <p>Sin comisiones registradas todavia</p>
              </div>
            ) : (
              <>
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
                          <p className="text-[10px] text-gray-500">Comision</p>
                        </div>
                      </div>
                      {j.pagado && j.pagadoEn && (
                        <p className="text-xs text-green-600 mt-2">Pagado el {fmtFecha(j.pagadoEn)}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="bg-amber-900 text-white rounded-2xl p-4">
                  <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-3">Total</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-amber-300">${fmt(totalComision)}</p>
                      <p className="text-xs text-amber-400">Comision total</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className={`text-xl font-bold ${stats.comisionPendiente > 0 ? "text-orange-300" : "text-green-300"}`}>
                        ${fmt(totalPagado)}
                      </p>
                      <p className="text-xs text-amber-400">
                        {stats.comisionPendiente > 0 ? `$${fmt(stats.comisionPendiente)} pendiente` : "Todo pagado"}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Tab: Mi Perfil ───────────────────────────────────────────── */}
        {tab === "perfil" && (
          <form onSubmit={guardarPerfil} className="space-y-4">
            {/* Info card */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Informacion personal</h3>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Telefono</label>
                <input
                  type="tel"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Punto de venta</label>
                <input
                  type="text"
                  value={editPuntoVenta}
                  onChange={(e) => setEditPuntoVenta(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  {usuario.email}
                </p>
              </div>
            </div>

            {/* Change password */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Cambiar contrasena</h3>
              <p className="text-xs text-gray-400">Deja en blanco si no deseas cambiarla</p>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Contrasena actual</label>
                <input
                  type="password"
                  value={pwActual}
                  onChange={(e) => setPwActual(e.target.value)}
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Nueva contrasena</label>
                <input
                  type="password"
                  value={pwNueva}
                  onChange={(e) => setPwNueva(e.target.value)}
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Confirmar nueva contrasena</label>
                <input
                  type="password"
                  value={pwConfirmar}
                  onChange={(e) => setPwConfirmar(e.target.value)}
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {feedbackPerfil && (
              <div className={`rounded-xl p-3 text-sm text-center ${feedbackPerfil.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {feedbackPerfil.msg}
              </div>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
