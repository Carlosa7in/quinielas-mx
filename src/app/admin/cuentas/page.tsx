"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Usuario = {
  id: string;
  nombre: string;
  rol: string;
};

type CuentaBancaria = {
  id: string;
  usuarioId: string;
  usuario: Usuario;
  banco: string;
  titular: string;
  clabe: string | null;
  numero: string | null;
  tipo: string;
  activa: boolean;
  orden: number;
};

const BANCOS_MX = [
  "BBVA",
  "Banorte",
  "Santander",
  "HSBC",
  "Banamex / Citibanamex",
  "Scotiabank",
  "OXXO Pay",
  "Spin by OXXO",
  "Mercado Pago",
  "Nu (Nubank)",
  "Hey Banco",
  "Otro",
];

const BANCO_EMOJI: Record<string, string> = {
  BBVA: "🔵",
  Banorte: "🟠",
  Santander: "🔴",
  HSBC: "🟥",
  "Banamex / Citibanamex": "🔵",
  Scotiabank: "🟡",
  "OXXO Pay": "🟡",
  "Spin by OXXO": "🟣",
  "Mercado Pago": "🔵",
  "Nu (Nubank)": "🟣",
  "Hey Banco": "🟢",
};

const getBancoEmoji = (banco: string) => BANCO_EMOJI[banco] ?? "🏦";

function maskClabe(clabe: string | null): string {
  if (!clabe) return "—";
  if (clabe.length <= 4) return clabe;
  return "*".repeat(clabe.length - 4) + clabe.slice(-4);
}

export default function CuentasPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const rol = (session?.user as { role?: string })?.role ?? "";

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    usuarioId: "",
    banco: "",
    titular: "",
    clabe: "",
    numero: "",
    tipo: "transferencia",
    orden: "0",
  });

  // Redirect non-superadmin
  useEffect(() => {
    if (session && rol !== "superadmin") {
      router.replace("/admin");
    }
  }, [session, rol, router]);

  useEffect(() => {
    if (rol !== "superadmin") return;
    cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  const cargar = async () => {
    setCargando(true);
    try {
      const [cRes, uRes] = await Promise.all([
        fetch("/api/admin/cuentas"),
        fetch("/api/admin/usuarios"),
      ]);
      const cData = await cRes.json();
      const uData = await uRes.json();
      if (Array.isArray(cData)) setCuentas(cData);
      if (Array.isArray(uData)) setUsuarios(uData);
    } catch {
      setError("Error al cargar datos");
    } finally {
      setCargando(false);
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.usuarioId || !form.banco || !form.titular) {
      setError("Usuario, banco y titular son obligatorios");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cuentas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: form.usuarioId,
          banco: form.banco,
          titular: form.titular,
          clabe: form.clabe || undefined,
          numero: form.numero || undefined,
          tipo: form.tipo,
          orden: parseInt(form.orden) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al crear"); return; }
      setCuentas((prev) => [...prev, data].sort((a, b) => a.orden - b.orden || a.banco.localeCompare(b.banco)));
      setMostrarForm(false);
      setForm({ usuarioId: "", banco: "", titular: "", clabe: "", numero: "", tipo: "transferencia", orden: "0" });
    } catch {
      setError("Error de red");
    } finally {
      setGuardando(false);
    }
  };

  const toggleActiva = async (cuenta: CuentaBancaria) => {
    try {
      const res = await fetch("/api/admin/cuentas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cuenta.id, activa: !cuenta.activa }),
      });
      const data = await res.json();
      if (res.ok) {
        setCuentas((prev) => prev.map((c) => c.id === cuenta.id ? { ...c, activa: !c.activa } : c));
      } else {
        setError(data.error || "Error al actualizar");
      }
    } catch {
      setError("Error de red");
    }
  };

  const eliminar = async (id: string, banco: string) => {
    if (!confirm(`¿Eliminar cuenta ${banco}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch("/api/admin/cuentas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setCuentas((prev) => prev.filter((c) => c.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Error al eliminar");
      }
    } catch {
      setError("Error de red");
    }
  };

  // Agrupar por usuario: superadmin primero, luego por nombre
  const ROL_ORDEN: Record<string, number> = { superadmin: 0, admin: 1, vendedor: 2, tienda: 3 };
  const usuariosConCuentas = Array.from(
    new Map(cuentas.map((c) => [c.usuarioId, c.usuario])).entries()
  ).map(([, u]) => u).sort((a, b) =>
    (ROL_ORDEN[a.rol] ?? 9) - (ROL_ORDEN[b.rol] ?? 9) || a.nombre.localeCompare(b.nombre)
  );

  if (rol && rol !== "superadmin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Solo superadmin puede acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-amber-400 text-sm">← Admin</Link>
            <h1 className="text-xl font-bold mt-1">Cuentas Bancarias</h1>
            <p className="text-amber-300/70 text-sm">Gestiona las cuentas para recibir pagos</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Botón nueva cuenta */}
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setError(""); }}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {mostrarForm ? "✕ Cancelar" : "🏦 Nueva cuenta"}
        </button>

        {/* Formulario nueva cuenta */}
        {mostrarForm && (
          <form onSubmit={handleCrear} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Nueva cuenta bancaria</h2>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Usuario *</label>
              <select
                value={form.usuarioId}
                onChange={(e) => setForm((f) => ({ ...f, usuarioId: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Seleccionar usuario...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Banco *</label>
                <select
                  value={form.banco}
                  onChange={(e) => setForm((f) => ({ ...f, banco: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Seleccionar...</option>
                  {BANCOS_MX.map((b) => (
                    <option key={b} value={b}>{getBancoEmoji(b)} {b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="transferencia">Transferencia / SPEI</option>
                  <option value="oxxo">OXXO / Efectivo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Titular de la cuenta *</label>
              <input
                type="text"
                placeholder="Nombre completo del titular"
                value={form.titular}
                onChange={(e) => setForm((f) => ({ ...f, titular: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">CLABE (18 dígitos)</label>
                <input
                  type="text"
                  placeholder="000000000000000000"
                  value={form.clabe}
                  onChange={(e) => setForm((f) => ({ ...f, clabe: e.target.value.replace(/\D/g, "").slice(0, 18) }))}
                  maxLength={18}
                  inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Últimos 4 dígitos tarjeta</label>
                <input
                  type="text"
                  placeholder="1234"
                  value={form.numero}
                  onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  maxLength={4}
                  inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Orden de visualización</label>
              <input
                type="number"
                placeholder="0"
                value={form.orden}
                onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))}
                min={0}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {guardando ? "Guardando..." : "Guardar cuenta"}
            </button>
          </form>
        )}

        {error && !mostrarForm && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Lista de cuentas agrupadas por usuario */}
        {cargando ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : cuentas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-2">🏦</p>
            <p>No hay cuentas bancarias registradas</p>
            <p className="text-sm mt-1">Agrega una cuenta para que los clientes puedan transferir</p>
          </div>
        ) : (
          <div className="space-y-5">
            {usuariosConCuentas.map((usuario) => {
              const cuentasUsuario = cuentas.filter((c) => c.usuarioId === usuario.id);
              return (
                <div key={usuario.id}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{usuario.nombre}</p>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{usuario.rol}</span>
                    <span className="text-xs text-gray-400">{cuentasUsuario.length} cuenta{cuentasUsuario.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-2">
                    {cuentasUsuario.map((cuenta) => (
                      <div
                        key={cuenta.id}
                        className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${cuenta.activa ? "border-green-500" : "border-gray-300"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-lg">{getBancoEmoji(cuenta.banco)}</span>
                              <p className="font-bold text-gray-800">{cuenta.banco}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cuenta.tipo === "oxxo" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                                {cuenta.tipo === "oxxo" ? "OXXO" : "SPEI"}
                              </span>
                              {!cuenta.activa && (
                                <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactiva</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{cuenta.titular}</p>
                            {cuenta.clabe && (
                              <p className="text-xs text-gray-400 font-mono mt-0.5">
                                CLABE: {maskClabe(cuenta.clabe)}
                              </p>
                            )}
                            {cuenta.numero && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Tarjeta: •••• {cuenta.numero}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Toggle activa */}
                            <button
                              onClick={() => toggleActiva(cuenta)}
                              title={cuenta.activa ? "Desactivar" : "Activar"}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                cuenta.activa ? "bg-green-500" : "bg-gray-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  cuenta.activa ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                            {/* Eliminar */}
                            <button
                              onClick={() => eliminar(cuenta.id, cuenta.banco)}
                              title="Eliminar cuenta"
                              className="text-red-400 hover:text-red-600 transition-colors text-sm"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>Orden: {cuenta.orden}</span>
                          <span className={cuenta.activa ? "text-green-600 font-medium" : "text-gray-400"}>
                            {cuenta.activa ? "● Activa — visible al cliente" : "● Inactiva — oculta"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
