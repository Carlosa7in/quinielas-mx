"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Quiniela = {
  id: string;
  folio: string;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  canal: string;
  estado: string;
  monto: number;
  aciertos: number | null;
  createdAt: string;
  jornada: { numero: number; temporada: string };
  picks: { prediccion: string }[];
};

export default function QuinielasAdminPage() {
  const [quinielas, setQuinielas] = useState<Quiniela[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  useEffect(() => {
    fetch("/api/admin/quinielas")
      .then((r) => r.json())
      .then((data) => setQuinielas(data))
      .finally(() => setCargando(false));
  }, []);

  const filtradas = quinielas.filter((q) => {
    const coincideBusqueda =
      q.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      (q.nombreCliente ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (q.telefonoCliente ?? "").includes(busqueda);
    const coincideEstado = filtroEstado === "todos" || q.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  const total = quinielas.length;
  const recaudado = quinielas.reduce((s, q) => s + q.monto, 0);
  const ganadoras = quinielas.filter((q) => q.estado === "ganadora").length;

  const estadoColor = (estado: string) => {
    if (estado === "ganadora") return "bg-green-100 text-green-700";
    if (estado === "perdedora") return "bg-red-100 text-red-600";
    return "bg-yellow-100 text-yellow-700";
  };

  const canalIcon = (canal: string) => (canal === "tienda" ? "🏪" : "💻");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-900 text-white py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-green-300 text-sm">← Admin</Link>
            <h1 className="text-xl font-bold mt-1">Quinielas Registradas</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-700">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">${recaudado}</p>
            <p className="text-xs text-gray-500">Recaudado</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{ganadoras}</p>
            <p className="text-xs text-gray-500">Ganadoras</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por folio, nombre o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="ganadora">Ganadoras</option>
            <option value="perdedora">Perdedoras</option>
          </select>
        </div>

        {/* Lista */}
        {cargando ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {busqueda || filtroEstado !== "todos"
              ? "Sin resultados para tu búsqueda"
              : "No hay quinielas registradas aún"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map((q) => (
              <div key={q.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{canalIcon(q.canal)}</span>
                      <span className="font-semibold text-gray-800 text-sm truncate">
                        {q.nombreCliente ?? "Sin nombre"}
                      </span>
                      {q.telefonoCliente && (
                        <span className="text-gray-400 text-xs">{q.telefonoCliente}</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-gray-500">{q.folio}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Jornada {q.jornada.numero} · {q.jornada.temporada} ·{" "}
                      {new Date(q.createdAt).toLocaleString("es-MX", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${estadoColor(q.estado)}`}>
                      {q.estado}
                    </span>
                    {q.aciertos !== null && (
                      <span className="text-xs text-gray-500">
                        {q.aciertos}/{q.picks.length} aciertos
                      </span>
                    )}
                    <span className="text-xs font-bold text-green-700">${q.monto}</span>
                  </div>
                </div>

                {/* Picks resumen */}
                <div className="mt-3 flex gap-1 flex-wrap">
                  {q.picks.map((p, i) => (
                    <span
                      key={i}
                      className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded"
                    >
                      {p.prediccion}
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex justify-end">
                  <Link
                    href={`/ticket/${q.folio}`}
                    className="text-green-700 hover:text-green-600 text-xs font-medium"
                    target="_blank"
                  >
                    Ver ticket →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
