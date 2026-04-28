"use client";
import { useState, useEffect } from "react";

type Usuario = {
  id: string;
  nombre: string;
  username: string | null;
  email: string;
  rol: string;
  createdAt: string;
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("admin");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);

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
      body: JSON.stringify({ nombre, username, email, password, rol }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); }
    else {
      setExito(`Administrador "${data.nombre}" creado`);
      setNombre(""); setUsername(""); setEmail(""); setPassword(""); setRol("admin");
      cargar();
    }
    setEnviando(false);
  };

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    const res = await fetch(`/api/admin/usuarios?id=${id}`, { method: "DELETE" });
    if (res.ok) cargar();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-green-900 text-white py-4 px-4">
        <div className="max-w-xl mx-auto">
          <a href="/admin" className="text-green-300 text-sm">← Admin</a>
          <h1 className="text-xl font-bold mt-1">Gestión de Administradores</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Crear nuevo admin */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Nuevo administrador</h2>
          <form onSubmit={crear} className="space-y-3">
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              placeholder="Usuario (para iniciar sesión)"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="password"
              placeholder="Contraseña temporal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>

            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{error}</p>}
            {exito && <p className="text-green-700 text-sm bg-green-50 rounded-lg p-2">{exito}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-xl transition-colors"
            >
              {enviando ? "Creando..." : "Crear administrador"}
            </button>
          </form>
        </div>

        {/* Lista de admins */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Administradores activos</h2>
          </div>
          {usuarios.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Sin administradores registrados</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{u.nombre}</p>
                    <p className="text-gray-400 text-xs">
                      {u.username && <span className="text-green-600">@{u.username} · </span>}
                      {u.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      u.rol === "superadmin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {u.rol === "superadmin" ? "Super Admin" : "Admin"}
                    </span>
                    {u.rol !== "superadmin" && (
                      <button
                        onClick={() => eliminar(u.id, u.nombre)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
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
