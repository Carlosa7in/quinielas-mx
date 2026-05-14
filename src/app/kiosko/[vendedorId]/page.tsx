"use client";
import { useState, useEffect, use } from "react";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  orden: number;
};

type JornadaInfo = {
  id: string;
  nombre: string;
  liga: string;
  temporada: string;
  partidos: Partido[];
};

type KioskoData = {
  vendedor: { nombre: string; puntoVenta: string | null };
  jornada: JornadaInfo;
};

type Pick = "L" | "E" | "V" | null;

const PICK_LABELS: Record<string, string> = { L: "L", E: "E", V: "V" };
const PICK_COLORS: Record<string, string> = {
  L: "bg-amber-500 text-white border-amber-500",
  E: "bg-gray-500 text-white border-gray-500",
  V: "bg-blue-600 text-white border-blue-600",
};
const PICK_IDLE = "bg-white text-gray-600 border-gray-200 hover:border-gray-400";

export default function KioskoPage({ params }: { params: Promise<{ vendedorId: string }> }) {
  const { vendedorId } = use(params);

  const [datos, setDatos] = useState<KioskoData | null>(null);
  const [error, setError] = useState("");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    fetch(`/api/kiosko?vendedorId=${vendedorId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setDatos(d);
        setPicks(new Array(d.jornada.partidos.length).fill(null));
      })
      .catch(() => setError("No se pudo cargar la jornada"));
  }, [vendedorId]);

  const seleccionarPick = (idx: number, pick: Pick) => {
    setPicks((prev) => {
      const next = [...prev];
      next[idx] = next[idx] === pick ? null : pick;
      return next;
    });
  };

  const todosSeleccionados = picks.length > 0 && picks.every((p) => p !== null);
  const nombreValido = nombre.trim().split(/\s+/).length >= 2;
  const telValido = telefono.replace(/\D/g, "").length === 10;
  const puedeEnviar = todosSeleccionados && nombreValido && telValido;

  const handleEnviar = async () => {
    if (!puedeEnviar || !datos) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/kiosko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendedorId,
          jornadaId: datos.jornada.id,
          nombre: nombre.trim(),
          telefono: telefono.replace(/\D/g, ""),
          picks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      setEnviado(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setEnviando(false);
    }
  };

  // ── Estado: enviado ────────────────────────────────────────────────────────
  if (enviado) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-black text-amber-900 mb-2">¡Listo!</h1>
        <p className="text-amber-800 text-lg font-medium mb-1">Picks enviados</p>
        <p className="text-amber-700 text-sm mb-6">
          Acércate al vendedor para confirmar tu quiniela y pagar.
        </p>
        <button
          onClick={() => {
            setEnviado(false);
            setPicks(new Array(datos?.jornada.partidos.length ?? 0).fill(null));
            setNombre("");
            setTelefono("");
          }}
          className="bg-amber-700 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl"
        >
          Nueva quiniela
        </button>
      </div>
    );
  }

  // ── Estado: error ──────────────────────────────────────────────────────────
  if (error && !datos) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">⚽</div>
        <p className="text-gray-500 font-medium">{error}</p>
      </div>
    );
  }

  // ── Estado: cargando ───────────────────────────────────────────────────────
  if (!datos) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando jornada...</p>
      </div>
    );
  }

  const { jornada, vendedor } = datos;

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "38px", objectFit: "contain" }} />
            <div className="text-right">
              <p className="text-xs text-amber-400">{vendedor.puntoVenta ?? vendedor.nombre}</p>
              <p className="text-sm font-bold">{jornada.liga}</p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-amber-300 text-xs uppercase tracking-wide font-semibold">Tus picks para</p>
            <h1 className="text-xl font-black">{jornada.nombre}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3 pb-32">
        {/* Instrucción */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Selecciona <strong>L</strong> (local), <strong>E</strong> (empate) o <strong>V</strong> (visitante) para cada partido.
        </div>

        {/* Partidos */}
        {jornada.partidos.map((p, idx) => {
          const pick = picks[idx];
          return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-3">
              {/* Equipos */}
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="font-semibold text-gray-800 text-sm flex-1 truncate">{p.equipoLocal}</span>
                <span className="text-gray-400 text-xs mx-2 shrink-0">vs</span>
                <span className="font-semibold text-gray-800 text-sm flex-1 text-right truncate">{p.equipoVisita}</span>
              </div>
              {/* Botones */}
              <div className="grid grid-cols-3 gap-2">
                {(["L", "E", "V"] as Pick[]).map((opcion) => (
                  <button
                    key={opcion}
                    onClick={() => seleccionarPick(idx, opcion)}
                    className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                      pick === opcion ? PICK_COLORS[opcion!] : PICK_IDLE
                    }`}
                  >
                    {PICK_LABELS[opcion!]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Datos del cliente */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tus datos</p>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre Apellido"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {nombre && !nombreValido && (
              <p className="text-xs text-red-400 mt-1">Ingresa nombre y apellido</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Teléfono (10 dígitos)</label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">+52</span>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="5512345678"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Resumen de picks */}
        {todosSeleccionados && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-xs text-green-700 font-semibold mb-1">✅ Picks seleccionados</p>
            <p className="font-mono text-sm text-green-800 tracking-widest">{picks.join(" ")}</p>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
      </div>

      {/* Botón fijo abajo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleEnviar}
            disabled={!puedeEnviar || enviando}
            className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${
              puedeEnviar && !enviando
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {enviando ? "Enviando..." : todosSeleccionados && puedeEnviar
              ? "Enviar mis picks ⚽"
              : !todosSeleccionados
              ? `Faltan ${picks.filter((p) => p === null).length} picks`
              : !nombreValido
              ? "Ingresa tu nombre completo"
              : "Ingresa tu teléfono"}
          </button>
        </div>
      </div>
    </div>
  );
}
