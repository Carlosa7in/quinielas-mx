"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Apostador = {
  nombre: string;
  telefono: string | null;
  totalQuinielas: number;
};

export default function ApostadoresPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esAdmin = ["admin", "superadmin"].includes(rol);

  const [apostadores, setApostadores] = useState<Apostador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/admin/apostadores")
      .then((r) => r.json())
      .then((data) => { if (data.apostadores) setApostadores(data.apostadores); })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const backHref = esAdmin ? "/admin" : "/admin/tienda";
  const backLabel = esAdmin ? "Admin" : "Mi Panel";

  const filtrados = apostadores.filter((a) =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (a.telefono ?? "").includes(busqueda)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href={backHref} className="text-amber-400 text-sm">← {backLabel}</a>
            <h1 className="text-xl font-bold mt-1">Apostadores</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "40px", objectFit: "contain" }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {cargando ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
            Cargando...
          </div>
        ) : apostadores.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-medium text-gray-500">Sin apostadores todavía</p>
            <p className="text-sm mt-1">Los clientes aparecerán aquí cuando registres quinielas</p>
          </div>
        ) : (
          <>
            {/* Buscador + contador */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-2 rounded-xl font-medium shrink-0">
                {filtrados.length} / {apostadores.length}
              </span>
            </div>

            {/* Lista */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {filtrados.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Sin resultados para &ldquo;{busqueda}&rdquo;
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtrados.map((a, i) => (
                    <div key={i} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {a.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{a.nombre}</p>
                          {a.telefono ? (
                            <a
                              href={`tel:${a.telefono}`}
                              className="text-xs text-amber-600 hover:underline"
                            >
                              {a.telefono}
                            </a>
                          ) : (
                            <p className="text-xs text-gray-400">Sin teléfono</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-700 text-lg">{a.totalQuinielas}</p>
                        <p className="text-xs text-gray-400">quiniela{a.totalQuinielas !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
