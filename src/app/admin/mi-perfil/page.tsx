"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PasswordInput } from "@/components/PasswordInput";

type Usuario = {
  nombre: string;
  email: string;
  telefono: string | null;
  puntoVenta: string | null;
};

export default function MiPerfilPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esAdmin = ["admin", "superadmin"].includes(rol);

  const backHref = esAdmin ? "/admin" : "/admin/tienda";
  const backLabel = esAdmin ? "Admin" : "Mi Panel";

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editPuntoVenta, setEditPuntoVenta] = useState("");
  const [pwActual, setPwActual] = useState("");
  const [pwNueva, setPwNueva] = useState("");
  const [pwConfirmar, setPwConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/perfil")
      .then((r) => r.json())
      .then((data) => {
        if (data.usuario) {
          setUsuario(data.usuario);
          setEditNombre(data.usuario.nombre ?? "");
          setEditTelefono(data.usuario.telefono ?? "");
          setEditPuntoVenta(data.usuario.puntoVenta ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (pwNueva && pwNueva !== pwConfirmar) {
      setFeedback({ tipo: "err", msg: "Las contraseñas nuevas no coinciden" });
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
        setFeedback({ tipo: "err", msg: json.error ?? "Error al guardar" });
      } else {
        setUsuario(json.usuario);
        setPwActual("");
        setPwNueva("");
        setPwConfirmar("");
        setFeedback({ tipo: "ok", msg: "Perfil actualizado correctamente" });
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href={backHref} className="text-amber-400 text-sm">← {backLabel}</a>
            <h1 className="text-xl font-bold mt-1">Mi Perfil</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "40px", objectFit: "contain" }} /></a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {cargando ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">Cargando...</div>
        ) : (
          <form onSubmit={guardar} className="space-y-4">

            {/* Información personal */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Información personal</h3>

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
                <label className="text-xs text-gray-500 block mb-1">Teléfono</label>
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
                  {usuario?.email}
                </p>
              </div>
            </div>

            {/* Cambiar contraseña */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Cambiar contraseña</h3>
              <p className="text-xs text-gray-400">Deja en blanco si no deseas cambiarla</p>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Contraseña actual</label>
                <PasswordInput value={pwActual} onChange={setPwActual} placeholder="Contraseña actual" autoComplete="current-password" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Nueva contraseña</label>
                <PasswordInput value={pwNueva} onChange={setPwNueva} placeholder="Nueva contraseña" autoComplete="new-password" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Confirmar nueva contraseña</label>
                <PasswordInput value={pwConfirmar} onChange={setPwConfirmar} placeholder="Confirmar contraseña" autoComplete="new-password" />
              </div>
            </div>

            {feedback && (
              <div className={`rounded-xl p-3 text-sm text-center ${feedback.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {feedback.msg}
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
