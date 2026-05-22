"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Equipo = {
  id: string;
  nombre: string;
  liga: string;
  logoUrl: string;
};

const LIGAS = ["Liga MX", "Champions League", "Premier League", "La Liga"];

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [ligaFiltro, setLigaFiltro] = useState("Liga MX");
  const [nombre, setNombre] = useState("");
  const [liga, setLiga] = useState("Liga MX");
  const [logoUrl, setLogoUrl] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const cargar = () =>
    fetch(`/api/admin/equipos?liga=${encodeURIComponent(ligaFiltro)}`)
      .then((r) => r.json())
      .then((d) => setEquipos(d.equipos ?? []));

  useEffect(() => { cargar(); }, [ligaFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setExito(""); setEnviando(true);
    const res = await fetch("/api/admin/equipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, liga, logoUrl }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); }
    else {
      setExito(`"${data.nombre}" agregado`);
      setNombre(""); setLogoUrl("");
      cargar();
    }
    setEnviando(false);
  };

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar ${nombre}?`)) return;
    await fetch(`/api/admin/equipos?id=${id}`, { method: "DELETE" });
    cargar();
  };

  const hacerSeed = async () => {
    if (!confirm("Esto insertará todos los equipos del catálogo base. ¿Continuar?")) return;
    setSeeding(true);
    const res = await fetch("/api/admin/equipos-seed", { method: "POST" });
    const data = await res.json();
    if (res.ok) { setExito(`Seed completado: ${data.insertados} equipos`); cargar(); }
    else setError(data.error);
    setSeeding(false);
  };

  const equiposFiltrados = equipos.filter((e) => e.liga === ligaFiltro);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-amber-400 text-sm">← Admin</Link>
            <h1 className="text-xl font-bold mt-1">Catálogo de Equipos</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} /></a>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Seed inicial */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">Primera vez</p>
            <p className="text-xs text-amber-700">Importa el catálogo base de equipos al sistema.</p>
          </div>
          <button
            onClick={hacerSeed}
            disabled={seeding}
            className="shrink-0 bg-amber-700 hover:bg-amber-600 disabled:bg-gray-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            {seeding ? "Importando..." : "Importar catálogo"}
          </button>
        </div>

        {/* Agregar equipo */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Agregar equipo</h2>
          <form onSubmit={agregar} className="space-y-3">
            <input
              type="text" placeholder="Nombre del equipo" value={nombre} required
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <select
              value={liga} onChange={(e) => setLiga(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {LIGAS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <input
              type="url" placeholder="URL del logo (opcional)" value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{error}</p>}
            {exito && <p className="text-green-700 text-sm bg-green-50 rounded-lg p-2">{exito}</p>}

            <button
              type="submit" disabled={enviando}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-xl transition-colors"
            >
              {enviando ? "Guardando..." : "Agregar equipo"}
            </button>
          </form>
        </div>

        {/* Lista por liga */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Equipos registrados</h2>
            <div className="flex gap-1 flex-wrap justify-end">
              {LIGAS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLigaFiltro(l)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    ligaFiltro === l ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {equiposFiltrados.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              No hay equipos en {ligaFiltro}.<br />
              <span className="text-xs">Usa "Importar catálogo" o agrega uno manualmente.</span>
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {equiposFiltrados.map((eq) => (
                <li key={eq.id} className="px-5 py-3 flex items-center gap-3">
                  {eq.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={eq.logoUrl} alt={eq.nombre} className="w-7 h-7 object-contain" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">⚽</div>
                  )}
                  <span className="flex-1 text-sm text-gray-800">{eq.nombre}</span>
                  <button
                    onClick={() => eliminar(eq.id, eq.nombre)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
