"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Quiniela = {
  monto: number;
  estadoPago: string;
};

type Vendedor = {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
  createdAt: string;
  _count: { quinielas: number };
  quinielas: Quiniela[];
};

function calcRecaudado(quinielas: Quiniela[]) {
  return quinielas
    .filter((q) => q.estadoPago === "confirmado")
    .reduce((s, q) => s + q.monto, 0);
}

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    fetch("/api/admin/vendedores")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setVendedores(data); })
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const crearVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCrear("");
    setCreando(true);
    try {
      const res = await fetch("/api/admin/vendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, codigo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorCrear(data.error || "Error al crear");
      } else {
        setNombre("");
        setCodigo("");
        cargar();
      }
    } finally {
      setCreando(false);
    }
  };

  const toggleActivo = async (v: Vendedor) => {
    await fetch(`/api/admin/vendedores/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !v.activo }),
    });
    cargar();
  };

  const eliminarVendedor = async (v: Vendedor) => {
    if (!confirm(`¿Eliminar a ${v.nombre}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/admin/vendedores/${v.id}`, { method: "DELETE" });
    cargar();
  };

  const copiarLink = (codigo: string) => {
    const link = `${window.location.origin}/quiniela?ref=${codigo}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-6 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-amber-400 text-sm">← Admin</Link>
          <div className="ml-2">
            <h1 className="text-2xl font-bold">Vendedores</h1>
            <p className="text-amber-300/70 text-sm">Links de referido y ventas por vendedor</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Formulario crear */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-4">Nuevo vendedor</h2>
          <form onSubmit={crearVendedor} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej. Carlos Arias"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Código (link)</label>
                <input
                  type="text"
                  placeholder="Ej. CARLOS"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
                  required
                  maxLength={20}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            {codigo && (
              <p className="text-xs text-gray-400">
                Link: <span className="font-mono text-cyan-700">/quiniela?ref={codigo}</span>
              </p>
            )}
            {errorCrear && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{errorCrear}</p>
            )}
            <button
              type="submit"
              disabled={creando}
              className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-300 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {creando ? "Creando..." : "Crear vendedor"}
            </button>
          </form>
        </div>

        {/* Lista de vendedores */}
        {cargando ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
            Cargando...
          </div>
        ) : vendedores.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
            No hay vendedores aún. Crea el primero arriba.
          </div>
        ) : (
          <div className="space-y-3">
            {vendedores.map((v) => {
              const totalVendido = v._count.quinielas;
              const recaudado = calcRecaudado(v.quinielas);
              const puedeEliminar = totalVendido === 0;

              return (
                <div
                  key={v.id}
                  className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${
                    v.activo ? "border-cyan-500" : "border-gray-300 opacity-70"
                  }`}
                >
                  {/* Nombre y código */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{v.nombre}</p>
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {v.codigo}
                        </span>
                        {!v.activo && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                            Inactivo
                          </span>
                        )}
                      </div>
                      {/* Link */}
                      <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                        /quiniela?ref={v.codigo}
                      </p>
                    </div>

                    {/* Botones */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => copiarLink(v.codigo)}
                        className="text-xs bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        title="Copiar link"
                      >
                        {copiado === v.codigo ? "✓ Copiado" : "🔗 Copiar link"}
                      </button>
                      <button
                        onClick={() => toggleActivo(v)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          v.activo
                            ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                            : "bg-green-50 hover:bg-green-100 text-green-700"
                        }`}
                        title={v.activo ? "Desactivar" : "Activar"}
                      >
                        {v.activo ? "Pausar" : "Activar"}
                      </button>
                      {puedeEliminar && (
                        <button
                          onClick={() => eliminarVendedor(v)}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-gray-700">{totalVendido}</p>
                      <p className="text-xs text-gray-400">Quinielas vendidas</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2.5 text-center">
                      <p className="text-xl font-bold text-green-700">${recaudado}</p>
                      <p className="text-xs text-gray-400">Recaudado (confirmado)</p>
                    </div>
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
