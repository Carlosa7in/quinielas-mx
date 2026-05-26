"use client";
import { useState, useEffect } from "react";
import { getLogoUrl } from "@/lib/equipos";

const PAGES_CON_LOGOS = [
  {
    pagina: "/admin/tienda",
    descripcion: "Registro en tienda — selección manual de picks",
    componente: "LogoEquipo",
    fuente: "static" as const,
    ligas: "Jornada activa",
    nota: "Usa mapa estático de equipos.ts. Falla si el equipo no está en LOGOS{}.",
  },
  {
    pagina: "/admin/escanear",
    descripcion: "Escaneo de forma en tienda",
    componente: "LogoEquipo",
    fuente: "static" as const,
    ligas: "Jornada activa",
    nota: "Usa mapa estático de equipos.ts.",
  },
  {
    pagina: "/admin/registrar",
    descripcion: "Registro de resultados",
    componente: "LogoEquipo",
    fuente: "static" as const,
    ligas: "Jornada activa",
    nota: "Usa mapa estático de equipos.ts.",
  },
  {
    pagina: "/admin/premiacion",
    descripcion: "Pantalla de premiación / ganadores",
    componente: "LogoEquipo",
    fuente: "static" as const,
    ligas: "Jornada activa",
    nota: "Usa mapa estático de equipos.ts.",
  },
  {
    pagina: "/admin/mi-link → FlyerJornada",
    descripcion: "Generación del flyer (canvas) para compartir",
    componente: "FlyerJornada (canvas)",
    fuente: "dynamic" as const,
    ligas: "Liga MX, Champions, Premier, La Liga, Serie A, Ligue 1, Brasileirão",
    nota: "Fetch a /api/logos + NOMBRE_MAP. Falla si ESPN cambia el displayName del equipo.",
  },
  {
    pagina: "/kiosko/[vendedorId]",
    descripcion: "Página del cliente en tienda (pública)",
    componente: "LogoEquipo inline",
    fuente: "both" as const,
    ligas: "Jornada activa",
    nota: "Fetch a /api/logos (primero) + getLogoUrl de equipos.ts (respaldo).",
  },
  {
    pagina: "/quiniela",
    descripcion: "Registro público de quiniela (cliente)",
    componente: "LogoEquipo",
    fuente: "static" as const,
    ligas: "Jornada activa",
    nota: "Usa mapa estático de equipos.ts.",
  },
  {
    pagina: "/resultados/[jornadaId]",
    descripcion: "Tabla pública de resultados por jornada",
    componente: "TeamLogo (inline)",
    fuente: "both" as const,
    ligas: "Jornada activa",
    nota: "Intenta logoUrl de BD primero; si falla usa getLogoUrl de equipos.ts; si ambos fallan muestra iniciales.",
  },
  {
    pagina: "/api/resultados/[jornadaId]/imagen",
    descripcion: "Flyer de resultados (imagen PNG para compartir)",
    componente: "Satori / OG image",
    fuente: "both" as const,
    ligas: "Jornada activa",
    nota: "getLogoUrl de equipos.ts primero; logoUrl de BD como respaldo. Falla si el equipo no está en LOGOS{} ni en la tabla Equipo.",
  },
];

type Equipo = {
  id: string;
  nombre: string;
  liga: string;
  logoUrl: string;
};

export default function LogosCheckDbPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ligaActiva, setLigaActiva] = useState("todas");
  const [rotos, setRotos] = useState<Set<string>>(new Set());
  const [sincronizando, setSincronizando] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const cargarEquipos = () => {
    setCargando(true);
    fetch("/api/admin/equipos")
      .then((r) => r.json())
      .then((d) => setEquipos(d.equipos ?? []))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarEquipos(); }, []);

  const sincronizar = async () => {
    setSincronizando(true);
    setSyncMsg("");
    const res = await fetch("/api/admin/equipos-seed", { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      setSyncMsg(`✅ ${data.insertados} equipos sincronizados`);
      setRotos(new Set());
      cargarEquipos();
    } else {
      setSyncMsg(`❌ ${data.error ?? "Error"}`);
    }
    setSincronizando(false);
  };

  const ligas = ["todas", ...Array.from(new Set(equipos.map((e) => e.liga))).sort()];
  const filtrados = ligaActiva === "todas" ? equipos : equipos.filter((e) => e.liga === ligaActiva);
  const totalRotos = filtrados.filter((e) => rotos.has(e.id)).length;

  const marcarRoto = (id: string) => setRotos((p) => new Set([...p, id]));

  if (cargando) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      Cargando equipos...
    </div>
  );

  if (equipos.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-gray-600 font-medium">No hay equipos en la base de datos</p>
        <p className="text-gray-400 text-sm mt-1">Los equipos se crean cuando importas partidos desde ESPN</p>
        <a href="/admin" className="mt-4 inline-block text-amber-700 underline text-sm">← Volver al admin</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3 flex-wrap">
          <a href="/admin" className="text-gray-400 hover:text-white text-sm">← Admin</a>
          <h1 className="text-lg font-bold">Logos en Base de Datos</h1>
          <span className="text-gray-400 text-sm">({equipos.length} equipos)</span>
          {totalRotos > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {totalRotos} roto{totalRotos !== 1 ? "s" : ""}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {syncMsg && <span className="text-xs text-green-300">{syncMsg}</span>}
            <button
              onClick={sincronizar}
              disabled={sincronizando}
              className="bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              {sincronizando ? "Sincronizando..." : "🔄 Sincronizar equipos"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs de ligas */}
      <div className="bg-white border-b border-gray-200 overflow-x-auto">
        <div className="max-w-3xl mx-auto flex gap-1 px-4 py-2">
          {ligas.map((liga) => {
            const eqs = liga === "todas" ? equipos : equipos.filter((e) => e.liga === liga);
            const rotosLiga = eqs.filter((e) => rotos.has(e.id)).length;
            return (
              <button
                key={liga}
                onClick={() => setLigaActiva(liga)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  ligaActiva === liga ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="hidden sm:inline">{liga === "todas" ? "Todas" : liga}</span>
                <span className="sm:hidden">{liga === "todas" ? "All" : liga.split(" ")[0]}</span>
                {rotosLiga > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {rotosLiga}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-xs text-gray-400 mb-4">
          Logos guardados en la BD. <span className="text-red-500 font-medium">Rojo</span> = URL rota o vacía.
          Estos son los logos que usa la imagen de resultados (Satori).
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {filtrados.map((equipo) => {
            const estaRoto = rotos.has(equipo.id);
            const sinUrl = !equipo.logoUrl;
            // También muestra si el logo estático difiere del de BD
            const logoEstatico = getLogoUrl(equipo.nombre);
            const difiere = logoEstatico && equipo.logoUrl && logoEstatico !== equipo.logoUrl;

            return (
              <div
                key={equipo.id}
                className={`bg-white rounded-xl p-3 flex flex-col items-center gap-1.5 shadow-sm border-2 transition-colors ${
                  estaRoto || sinUrl ? "border-red-300 bg-red-50" : difiere ? "border-yellow-300 bg-yellow-50" : "border-transparent"
                }`}
              >
                {sinUrl ? (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs font-bold">?</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={equipo.logoUrl}
                    alt={equipo.nombre}
                    width={48}
                    height={48}
                    className="object-contain"
                    onError={() => marcarRoto(equipo.id)}
                  />
                )}
                <p className={`text-center text-[11px] leading-tight font-medium ${
                  estaRoto || sinUrl ? "text-red-600" : "text-gray-700"
                }`}>
                  {equipo.nombre}
                </p>
                <p className="text-[9px] text-gray-400 text-center">{equipo.liga}</p>
                {sinUrl && <span className="text-[9px] text-red-500 font-bold">SIN URL</span>}
                {estaRoto && !sinUrl && <span className="text-[9px] text-red-500 font-bold">ROTO</span>}
                {difiere && !estaRoto && !sinUrl && (
                  <span className="text-[9px] text-yellow-600 font-bold">DIFIERE</span>
                )}
              </div>
            );
          })}
        </div>

        {filtrados.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No hay equipos para esta liga en la BD</p>
          </div>
        )}

        {/* ── Registro de páginas con logos ── */}
        <div className="mt-8 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-800">📍 Dónde se usan logos en el sitio</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Referencia para saber qué fuente corregir cuando falle un logo
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {PAGES_CON_LOGOS.map((p) => (
              <div key={p.pagina} className="px-4 py-3 flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  p.fuente === "static"  ? "bg-blue-100 text-blue-700" :
                  p.fuente === "dynamic" ? "bg-purple-100 text-purple-700" :
                                           "bg-teal-100 text-teal-700"
                }`}>
                  {p.fuente === "static" ? "ESTÁTICO" : p.fuente === "dynamic" ? "ESPN" : "AMBOS"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-bold text-gray-700">{p.pagina}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{p.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.nota}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              <strong>ESTÁTICO</strong> = corregir en <code className="bg-gray-100 px-1 rounded">src/lib/equipos.ts → LOGOS{"{}"}</code> · {" "}
              <strong>ESPN</strong> = corregir en <code className="bg-gray-100 px-1 rounded">src/app/api/logos/route.ts → NOMBRE_MAP</code> · {" "}
              <strong>AMBOS</strong> = ambas fuentes como respaldo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
