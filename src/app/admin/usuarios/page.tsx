"use client";
import { useState, useEffect } from "react";
import { PasswordInput } from "@/components/PasswordInput";

type Usuario = {
  id: string;
  nombre: string;
  username: string | null;
  email: string;
  rol: string;
  puntoVenta: string | null;
  codigoRef: string | null;
};

const ROL_LABEL: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  tienda: "Punto de venta",
  vendedor: "Vendedor referido",
};
const ROL_COLOR: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  tienda: "bg-amber-100 text-amber-700",
  vendedor: "bg-cyan-100 text-cyan-700",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("tienda");
  const [puntoVenta, setPuntoVenta] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editPuntoVenta, setEditPuntoVenta] = useState("");
  const [editandoRefId, setEditandoRefId] = useState<string | null>(null);
  const [editCodigoRef, setEditCodigoRef] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = () =>
    fetch("/api/admin/usuarios")
      .then((r) => r.json())
      .then(setUsuarios);

  useEffect(() => { cargar(); }, []);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito(""); setEnviando(true);
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, username, email, password, rol, puntoVenta }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); }
    else {
      setExito(`"${data.nombre}" creado correctamente`);
      setNombre(""); setUsername(""); setEmail(""); setPassword(""); setRol("vendedor"); setPuntoVenta("");
      cargar();
    }
    setEnviando(false);
  };

  const guardarPuntoVenta = async (id: string) => {
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, puntoVenta: editPuntoVenta }),
    });
    if (res.ok) { setEditandoId(null); cargar(); }
  };

  const guardarCodigoRef = async (id: string) => {
    const res = await fetch("/api/admin/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, codigoRef: editCodigoRef }),
    });
    if (res.ok) { setEditandoRefId(null); cargar(); }
    else { const d = await res.json(); alert(d.error); }
  };

  const copiarLink = (codigo: string) => {
    const link = `${window.location.origin}/quiniela?ref=${codigo}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    const res = await fetch(`/api/admin/usuarios?id=${id}`, { method: "DELETE" });
    if (res.ok) cargar();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href="/admin" className="text-amber-400 text-sm">← Admin</a>
            <h1 className="text-xl font-bold mt-1">Usuarios y Puntos de Venta</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} /></a>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Crear nuevo usuario */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Nuevo usuario</h2>
          <form onSubmit={crear} className="space-y-3">
            <input
              type="text" placeholder="Nombre completo" value={nombre} required
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="text" placeholder="Usuario para iniciar sesión" value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              type="email" placeholder="Correo electrónico" value={email} required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <PasswordInput value={password} onChange={setPassword} placeholder="Contraseña temporal" required />
            <select
              value={rol} onChange={(e) => setRol(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="tienda">Vendedor — Punto de venta (registro presencial)</option>
              <option value="vendedor">Vendedor — Por referido (solo link online)</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <input
              type="text" placeholder="Nombre del punto de venta (ej. Tienda Centro)" value={puntoVenta}
              onChange={(e) => setPuntoVenta(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-400">El punto de venta aparece en el reporte de comisiones.</p>

            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{error}</p>}
            {exito && <p className="text-green-700 text-sm bg-green-50 rounded-lg p-2">{exito}</p>}

            <button
              type="submit" disabled={enviando}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-xl transition-colors"
            >
              {enviando ? "Creando..." : "Crear usuario"}
            </button>
          </form>
        </div>

        {/* Lista de usuarios */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Usuarios activos ({usuarios.length})</h2>
          </div>
          {usuarios.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Sin usuarios registrados</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <li key={u.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800 text-sm">{u.nombre}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROL_COLOR[u.rol] ?? "bg-gray-100 text-gray-500"}`}>
                          {ROL_LABEL[u.rol] ?? u.rol}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {u.username && <span className="text-amber-600">@{u.username} · </span>}
                        {u.email}
                      </p>

                      {/* Punto de venta */}
                      {editandoId === u.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={editPuntoVenta}
                            onChange={(e) => setEditPuntoVenta(e.target.value)}
                            placeholder="Nombre del punto de venta"
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                            autoFocus
                          />
                          <button onClick={() => guardarPuntoVenta(u.id)} className="text-xs bg-amber-700 text-white px-2 py-1 rounded-lg">Guardar</button>
                          <button onClick={() => setEditandoId(null)} className="text-xs text-gray-400 px-2 py-1">Cancelar</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditandoId(u.id); setEditPuntoVenta(u.puntoVenta ?? ""); }}
                          className="text-xs mt-1 text-left"
                        >
                          {u.puntoVenta
                            ? <span className="text-amber-700">📍 {u.puntoVenta} <span className="text-gray-400">(editar)</span></span>
                            : <span className="text-gray-400 hover:text-amber-700">+ Agregar punto de venta</span>
                          }
                        </button>
                      )}

                      {/* Link de referido */}
                      {editandoRefId === u.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={editCodigoRef}
                            onChange={(e) => setEditCodigoRef(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                            placeholder="Ej. CARLOS"
                            maxLength={20}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            autoFocus
                          />
                          <button onClick={() => guardarCodigoRef(u.id)} className="text-xs bg-cyan-700 text-white px-2 py-1 rounded-lg">Guardar</button>
                          <button onClick={() => setEditandoRefId(null)} className="text-xs text-gray-400 px-2 py-1">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <button
                            onClick={() => { setEditandoRefId(u.id); setEditCodigoRef(u.codigoRef ?? ""); }}
                            className="text-xs text-left"
                          >
                            {u.codigoRef
                              ? <span className="text-cyan-700">🔗 Código: <span className="font-mono font-bold">{u.codigoRef}</span> <span className="text-gray-400">(editar)</span></span>
                              : <span className="text-gray-400 hover:text-cyan-700">+ Asignar link de referido</span>
                            }
                          </button>
                          {u.codigoRef && (
                            <button
                              onClick={() => copiarLink(u.codigoRef!)}
                              className="text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold px-2 py-0.5 rounded-lg transition-colors"
                            >
                              {copiado === u.codigoRef ? "✓ Copiado" : "📋 Copiar link"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {u.rol !== "superadmin" && (
                      <button onClick={() => eliminar(u.id, u.nombre)} className="text-red-400 hover:text-red-600 text-xs shrink-0">
                        Eliminar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
