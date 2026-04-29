"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Pick = { prediccion: string; acertado: boolean | null };

type Quiniela = {
  id: string;
  folio: string;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  canal: string;
  estado: string;
  monto: number;
  aciertos: number | null;
  picks: Pick[];
};

type Jornada = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  estado: string;
  quinielas: Quiniela[];
};

const LABEL = { "1": "L", "X": "E", "2": "V" } as Record<string, string>;

function estadoColor(estado: string) {
  if (estado === "ganadora") return "bg-green-100 text-green-700";
  if (estado === "perdedora") return "bg-red-100 text-red-600";
  return "bg-yellow-100 text-yellow-700";
}

function pickColor(p: Pick) {
  if (p.acertado === true) return "bg-green-500 text-white";
  if (p.acertado === false) return "bg-red-400 text-white";
  return "bg-gray-100 text-gray-600";
}

function JornadaCard({ jornada, busqueda }: { jornada: Jornada; busqueda: string }) {
  const [abierta, setAbierta] = useState(true);

  const filtradas = jornada.quinielas.filter((q) =>
    (q.folio + (q.nombreCliente ?? "") + (q.telefonoCliente ?? ""))
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const total = filtradas.length;
  const recaudado = filtradas.reduce((s, q) => s + q.monto, 0);
  const ganadoras = filtradas.filter((q) => q.estado === "ganadora").length;
  const totalPicks = filtradas[0]?.picks.length ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Cabecera jornada */}
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">
              {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              jornada.estado === "abierta"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {jornada.estado}
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            <span>🎯 {total} quinielas</span>
            <span>💵 ${recaudado}</span>
            {ganadoras > 0 && <span className="text-yellow-600 font-bold">🏆 {ganadoras} ganadoras</span>}
          </div>
        </div>
        <span className="text-gray-400 text-lg">{abierta ? "▲" : "▼"}</span>
      </button>

      {abierta && (
        <div className="border-t border-gray-100">
          {filtradas.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">
              {busqueda ? "Sin resultados" : "No hay quinielas en esta jornada"}
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtradas.map((q) => (
                <div key={q.id} className="px-4 py-3 flex items-start gap-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{q.canal === "tienda" ? "🏪" : "💻"}</span>
                      <span className="font-semibold text-sm text-gray-800 truncate">
                        {q.nombreCliente ?? "Sin nombre"}
                      </span>
                      {q.telefonoCliente && (
                        <span className="text-gray-400 text-xs">{q.telefonoCliente}</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-gray-400 mt-0.5">{q.folio}</p>
                    {/* Picks */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {q.picks.map((p, i) => (
                        <span
                          key={i}
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${pickColor(p)}`}
                        >
                          {LABEL[p.prediccion] ?? p.prediccion}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Estado + aciertos */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${estadoColor(q.estado)}`}>
                      {q.estado}
                    </span>
                    {q.aciertos !== null && (
                      <span className="text-xs text-gray-500">
                        {q.aciertos}/{totalPicks}
                      </span>
                    )}
                    <Link
                      href={`/ticket/${q.folio}`}
                      className="text-green-700 text-xs font-medium hover:underline"
                      target="_blank"
                    >
                      ticket →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuinielasAdminPage() {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"activa" | "pasadas">("activa");
  const [busqueda, setBusqueda] = useState("");
  const [ligaFiltro, setLigaFiltro] = useState<string>("todas");

  useEffect(() => {
    fetch("/api/admin/quinielas")
      .then((r) => r.json())
      .then((data) => setJornadas(data))
      .finally(() => setCargando(false));
  }, []);

  const ligas = [...new Set(jornadas.map((j) => j.liga))];

  const jornadasFiltradas = ligaFiltro === "todas" ? jornadas : jornadas.filter((j) => j.liga === ligaFiltro);
  const activas = jornadasFiltradas.filter((j) => j.estado === "abierta");
  const pasadas = jornadasFiltradas.filter((j) => j.estado === "finalizada");
  const mostrar = tab === "activa" ? activas : pasadas;

  // Stats globales
  const todasQuinielas = jornadas.flatMap((j) => j.quinielas);
  const totalGlobal = todasQuinielas.length;
  const recaudadoGlobal = todasQuinielas.reduce((s, q) => s + q.monto, 0);
  const ganadorasGlobal = todasQuinielas.filter((q) => q.estado === "ganadora").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-900 text-white py-4 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/admin" className="text-green-300 text-sm">← Admin</Link>
          <h1 className="text-xl font-bold mt-1">Quinielas</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-700">{totalGlobal}</p>
            <p className="text-xs text-gray-500">Total histórico</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">${recaudadoGlobal}</p>
            <p className="text-xs text-gray-500">Recaudado</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{ganadorasGlobal}</p>
            <p className="text-xs text-gray-500">Ganadoras</p>
          </div>
        </div>

        {/* Filtro liga */}
        {ligas.length > 1 && (
          <div className="flex gap-2">
            {["todas", ...ligas].map((l) => (
              <button
                key={l}
                onClick={() => setLigaFiltro(l)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  ligaFiltro === l ? "bg-green-700 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {l === "todas" ? "Todas" : l === "Liga MX" ? "🇲🇽 Liga MX" : "⭐ Champions"}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setTab("activa")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "activa"
                ? "bg-green-700 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            🟢 Activa
            {activas.length > 0 && (
              <span className="ml-1.5 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">
                {activas.flatMap((j) => j.quinielas).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("pasadas")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "pasadas"
                ? "bg-green-700 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            📁 Pasadas
            {pasadas.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "pasadas" ? "bg-white/30" : "bg-gray-100 text-gray-500"}`}>
                {pasadas.length}
              </span>
            )}
          </button>
        </div>

        {/* Buscador */}
        <input
          type="text"
          placeholder="Buscar por folio, nombre o teléfono..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        {/* Contenido */}
        {cargando ? (
          <div className="text-center py-12 text-gray-400">Cargando...</div>
        ) : mostrar.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">{tab === "activa" ? "🟢" : "📁"}</p>
            <p>{tab === "activa" ? "No hay jornada activa" : "No hay jornadas pasadas"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mostrar.map((j) => (
              <JornadaCard key={j.id} jornada={j} busqueda={busqueda} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
