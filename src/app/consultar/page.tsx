"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LogoEquipo } from "@/components/LogoEquipo";
import { Suspense } from "react";

type Pick = {
  id: string;
  prediccion: string;
  acertado: boolean | null;
  partido: {
    equipoLocal: string;
    equipoVisita: string;
    orden: number;
    resultado: string | null;
    golesLocal: number | null;
    golesVisita: number | null;
  };
};

type Quiniela = {
  folio: string;
  nombreCliente: string | null;
  estado: string;
  aciertos: number | null;
  monto: number;
  jornada: { numero: number; temporada: string; liga: string };
  picks: Pick[];
};

const LABEL: Record<string, string> = { "1": "L", "X": "E", "2": "V" };

function estadoBadge(estado: string) {
  if (estado === "ganadora") return "bg-green-500 text-white";
  if (estado === "perdedora") return "bg-red-400 text-white";
  return "bg-yellow-400 text-green-900";
}

function pickBadge(acertado: boolean | null) {
  if (acertado === true) return "bg-green-500 text-white";
  if (acertado === false) return "bg-red-400 text-white";
  return "bg-gray-100 text-gray-700";
}

/* ─── Detalle de una quiniela ─── */
function DetalleQuiniela({ q, onBack }: { q: Quiniela; onBack?: () => void }) {
  const picks = [...q.picks].sort((a, b) => a.partido.orden - b.partido.orden);
  const hayResultados = picks.some((p) => p.partido.resultado);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-green-800 text-white p-4">
        {onBack && (
          <button onClick={onBack} className="text-green-300 text-sm mb-2 flex items-center gap-1">
            ← Mis quinielas
          </button>
        )}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-green-300 text-xs font-mono">{q.folio}</p>
            <p className="font-bold text-lg">{q.nombreCliente ?? "—"}</p>
            <p className="text-green-300 text-xs mt-0.5">
              {q.jornada.liga} · Jornada {q.jornada.numero} · {q.jornada.temporada}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize shrink-0 ${estadoBadge(q.estado)}`}>
            {q.estado}
          </span>
        </div>

        {q.aciertos !== null && (
          <div className="mt-3 bg-white/10 rounded-xl py-2 text-center">
            <span className="text-3xl font-black text-yellow-300">{q.aciertos}</span>
            <span className="text-green-200 text-sm"> / {picks.length} aciertos</span>
          </div>
        )}
      </div>

      {/* Picks */}
      <div className="divide-y divide-gray-50">
        {picks.map((pick, i) => {
          const resultado = pick.partido.resultado;
          const gl = pick.partido.golesLocal;
          const gv = pick.partido.golesVisita;
          const marcador = gl !== null && gv !== null ? `${gl}-${gv}` : null;

          return (
            <div key={pick.id} className="px-4 py-2.5 flex items-center gap-2">
              <span className="text-gray-300 text-xs w-5 text-right shrink-0">{i + 1}</span>

              {/* Equipo local */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="text-xs text-gray-700 truncate text-right">{pick.partido.equipoLocal}</span>
                <LogoEquipo equipo={pick.partido.equipoLocal} size={22} />
              </div>

              {/* Marcador central */}
              <div className="flex flex-col items-center shrink-0 w-14">
                {marcador ? (
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">{marcador}</span>
                ) : (
                  <span className="text-gray-300 text-xs">vs</span>
                )}
              </div>

              {/* Equipo visita */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <LogoEquipo equipo={pick.partido.equipoVisita} size={22} />
                <span className="text-xs text-gray-700 truncate">{pick.partido.equipoVisita}</span>
              </div>

              {/* Pick del usuario */}
              <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg shrink-0 ${pickBadge(pick.acertado)}`}>
                {LABEL[pick.prediccion]}
              </span>

              {/* Resultado real */}
              {resultado && (
                <span className="text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg shrink-0 bg-gray-100 text-gray-500">
                  {LABEL[resultado]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!hayResultados && (
        <div className="p-4 bg-yellow-50 text-yellow-700 text-sm text-center">
          ⏳ Los resultados se publicarán al terminar la jornada
        </div>
      )}

      <div className="p-3 bg-gray-50 text-center">
        <a href={`/ticket/${q.folio}`} className="text-green-700 text-sm font-semibold hover:underline">
          Ver ticket completo →
        </a>
      </div>
    </div>
  );
}

/* ─── Tarjeta resumen en lista ─── */
function TarjetaQuiniela({ q, onClick }: { q: Quiniela; onClick: () => void }) {
  const picks = [...q.picks].sort((a, b) => a.partido.orden - b.partido.orden);
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition-shadow border-2 border-transparent hover:border-green-200"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-xs text-gray-400 font-mono">{q.folio}</p>
          <p className="font-bold text-gray-800 text-sm">
            {q.jornada.liga} · Jornada {q.jornada.numero}
          </p>
          <p className="text-xs text-gray-400">{q.jornada.temporada}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${estadoBadge(q.estado)}`}>
            {q.estado}
          </span>
          {q.aciertos !== null && (
            <span className="text-xs text-gray-500">{q.aciertos}/{picks.length} ✓</span>
          )}
        </div>
      </div>
      {/* Mini picks */}
      <div className="flex gap-1 flex-wrap mt-1">
        {picks.map((p) => (
          <span key={p.id} className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded ${pickBadge(p.acertado)}`}>
            {LABEL[p.prediccion]}
          </span>
        ))}
      </div>
    </button>
  );
}

/* ─── Página principal ─── */
function ConsultarInner() {
  const searchParams = useSearchParams();
  const folioParam = searchParams.get("folio");

  const [modo, setModo] = useState<"telefono" | "folio">("telefono");
  const [telefono, setTelefono] = useState("");
  const [folio, setFolio] = useState(folioParam ?? "");
  const [quinielas, setQuinielas] = useState<Quiniela[]>([]);
  const [detalle, setDetalle] = useState<Quiniela | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  // Si viene con ?folio= directo, buscar automáticamente
  useEffect(() => {
    if (folioParam) {
      setModo("folio");
      buscarFolio(folioParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buscarTelefono = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = telefono.replace(/\D/g, "");
    if (num.length < 10) return;
    setCargando(true); setError(""); setQuinielas([]); setDetalle(null); setBuscado(false);

    const res = await fetch(`/api/quinielas?telefono=${num}`);
    const data = await res.json();
    setCargando(false); setBuscado(true);

    if (!res.ok) { setError(data.error || "Error al buscar"); return; }
    const ORDEN: Record<string, number> = { pendiente: 0, ganadora: 1, perdedora: 2 };
    const lista: Quiniela[] = (data.quinielas ?? []).sort(
      (a: Quiniela, b: Quiniela) => (ORDEN[a.estado] ?? 9) - (ORDEN[b.estado] ?? 9)
    );
    setQuinielas(lista);
    if (lista.length === 1) setDetalle(lista[0]);
  };

  const buscarFolio = async (f?: string) => {
    const val = (f ?? folio).trim().toUpperCase();
    if (!val) return;
    setCargando(true); setError(""); setDetalle(null); setBuscado(false);

    const res = await fetch(`/api/quinielas?folio=${val}`);
    const data = await res.json();
    setCargando(false); setBuscado(true);

    if (!res.ok) { setError(data.error || "No encontrada"); return; }
    setDetalle(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white py-5 px-4">
        <div className="max-w-lg mx-auto">
          <a href="/" className="text-green-300 text-sm mb-1 inline-block">← Inicio</a>
          <h1 className="text-2xl font-bold">Consultar Quiniela</h1>
          <p className="text-green-200 text-sm">Encuentra tus pronósticos y resultados</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => { setModo("telefono"); setError(""); setDetalle(null); setQuinielas([]); setBuscado(false); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${modo === "telefono" ? "bg-green-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            📱 Por teléfono
          </button>
          <button
            onClick={() => { setModo("folio"); setError(""); setDetalle(null); setQuinielas([]); setBuscado(false); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${modo === "folio" ? "bg-green-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            🎫 Por folio
          </button>
        </div>

        {/* Búsqueda por teléfono */}
        {modo === "telefono" && (
          <form onSubmit={buscarTelefono} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <p className="text-sm text-gray-500">Ingresa el número con el que te registraste</p>
            <div className="flex gap-2">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-500 font-medium shrink-0">
                🇲🇽 +52
              </div>
              <input
                type="tel"
                placeholder="55 1234 5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={cargando || telefono.replace(/\D/g, "").length < 10}
              className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {cargando ? "Buscando..." : "Buscar mis quinielas"}
            </button>
          </form>
        )}

        {/* Búsqueda por folio */}
        {modo === "folio" && (
          <form onSubmit={(e) => { e.preventDefault(); buscarFolio(); }} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <p className="text-sm text-gray-500">Ingresa el folio de tu ticket</p>
            <input
              type="text"
              placeholder="QMX-J1-..."
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
            />
            <button
              type="submit"
              disabled={cargando || !folio.trim()}
              className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {cargando ? "Buscando..." : "Buscar"}
            </button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 text-sm text-center">{error}</div>
        )}

        {/* Sin resultados */}
        {buscado && !error && quinielas.length === 0 && !detalle && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-medium">No encontramos quinielas</p>
            <p className="text-sm mt-1">Verifica el número o usa tu folio</p>
          </div>
        )}

        {/* Lista de quinielas (búsqueda por teléfono con múltiples resultados) */}
        {!detalle && quinielas.length > 1 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium">{quinielas.length} quinielas encontradas</p>
            {quinielas.map((q) => (
              <TarjetaQuiniela key={q.folio} q={q} onClick={() => setDetalle(q)} />
            ))}
          </div>
        )}

        {/* Detalle de quiniela */}
        {detalle && (
          <DetalleQuiniela
            q={detalle}
            onBack={quinielas.length > 1 ? () => setDetalle(null) : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default function ConsultarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Cargando...</div>}>
      <ConsultarInner />
    </Suspense>
  );
}
