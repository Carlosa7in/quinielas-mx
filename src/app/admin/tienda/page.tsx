"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LogoEquipo } from "@/components/LogoEquipo";
import { JornadaSelector, type JornadaResumen } from "@/components/JornadaSelector";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string;
  orden: number;
};

type Jornada = {
  id: string;
  numero: number;
  nombre: string | null;
  temporada: string;
  liga: string;
  partidos: Partido[];
};

export default function TiendaPage() {
  const [modo, setModo] = useState<"selector" | "seleccion" | "manual">("selector");
  const router = useRouter();
  const { data: session } = useSession();
  const usuarioId = (session?.user as { id?: string })?.id ?? null;
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const seleccionarJornada = async (j: JornadaResumen) => {
    const res = await fetch(`/api/jornadas?id=${j.id}`);
    const data = await res.json();
    if (!data.error) {
      setJornada(data);
      setModo("seleccion");
    }
  };

  if (modo === "selector") {
    return <JornadaSelector onSelect={seleccionarJornada} titulo="Registro en Tienda" soloActivas />;
  }

  const seleccionar = (partidoId: string, valor: string) => {
    setPicks((prev) => ({ ...prev, [partidoId]: valor }));
  };

  const picksCompletos = jornada
    ? jornada.partidos.every((p) => picks[p.id])
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picksCompletos || !nombre) return;
    setEnviando(true);
    setError("");

    const res = await fetch("/api/quinielas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jornadaId: jornada!.id,
        picks: Object.entries(picks).map(([partidoId, prediccion]) => ({
          partidoId,
          prediccion,
        })),
        nombre,
        telefono,
        canal: "tienda",
        usuarioId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al registrar");
      setEnviando(false);
      return;
    }

    router.push(`/ticket/${data.folio}?imprimir=1`);
  };

  if (!jornada && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <a href="/admin" className="text-green-700 underline mt-4 inline-block">
            Volver al admin
          </a>
        </div>
      </div>
    );
  }

  // Pantalla de selección de modo
  if (modo === "seleccion") {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-green-900 text-white py-4 px-4">
          <div className="max-w-xl mx-auto">
            <a href="/admin" className="text-green-300 text-sm">← Admin</a>
            <h1 className="text-xl font-bold mt-1">Registro en Tienda</h1>
            {jornada && (
              <p className="text-green-300 text-xs">
                {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
              </p>
            )}
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
          <p className="text-gray-500 text-sm text-center mb-6">
            ¿Cómo deseas registrar la quiniela del cliente?
          </p>

          {/* Opción A — Manual */}
          <button
            onClick={() => setModo("manual")}
            className="w-full bg-white border-2 border-green-600 hover:bg-green-50 rounded-2xl p-6 flex items-center gap-4 transition-colors text-left"
          >
            <span className="text-4xl">✏️</span>
            <div>
              <p className="font-bold text-gray-800 text-lg">a) Capturar picks</p>
              <p className="text-gray-500 text-sm">
                El empleado selecciona manualmente los pronósticos del cliente en pantalla
              </p>
            </div>
          </button>

          {/* Opción B — Cámara */}
          <Link
            href={jornada ? `/admin/escanear?jornadaId=${jornada.id}` : "/admin/escanear"}
            className="w-full bg-white border-2 border-blue-600 hover:bg-blue-50 rounded-2xl p-6 flex items-center gap-4 transition-colors text-left block"
          >
            <span className="text-4xl">📷</span>
            <div>
              <p className="font-bold text-gray-800 text-lg">b) Escanear forma</p>
              <p className="text-gray-500 text-sm">
                La cámara detecta automáticamente los recuadros marcados por el cliente
              </p>
            </div>
          </Link>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 text-center">
            Para la opción b) el cliente debe haber llenado una forma impresa de la jornada.{" "}
            {jornada && (
              <a
                href={`/admin/forma/${jornada.id}`}
                target="_blank"
                className="font-bold underline"
              >
                Imprimir formas →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-green-900 text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <a href="/admin" className="text-green-300 text-sm">
              ← Admin
            </a>
            <h1 className="text-xl font-bold">Registro en Tienda</h1>
            {jornada && (
              <p className="text-green-300 text-xs">
                {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-yellow-300 font-bold">$20 MXN</p>
            <p className="text-green-300 text-xs">por quiniela</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Datos del cliente */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Datos del cliente</h2>
          <input
            type="text"
            placeholder="Nombre del cliente *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="tel"
            placeholder="Teléfono (opcional)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Partidos - vista compacta para uso en tienda */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold text-gray-700 mb-3">
            Pronósticos{" "}
            <span className="text-green-600 font-normal text-sm">
              ({Object.keys(picks).length}/{jornada?.partidos.length ?? 0})
            </span>
          </h2>

          <div className="space-y-2">
            {jornada?.partidos.map((partido) => (
              <div
                key={partido.id}
                className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-1.5 flex-1 text-xs min-w-0">
                  <LogoEquipo equipo={partido.equipoLocal} size={20} />
                  <span className="font-medium truncate">{partido.equipoLocal}</span>
                  <span className="text-gray-400 shrink-0">vs</span>
                  <LogoEquipo equipo={partido.equipoVisita} size={20} />
                  <span className="font-medium truncate">{partido.equipoVisita}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(["1", "X", "2"] as const).map((op, i) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => seleccionar(partido.id, op)}
                      className={`w-9 h-8 rounded text-xs font-bold transition-colors ${
                        picks[partido.id] === op
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {["L", "E", "V"][i]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={!picksCompletos || !nombre || enviando}
          className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-lg"
        >
          {enviando
            ? "Registrando..."
            : `Registrar y Ver Ticket ($20)`}
        </button>
      </form>
    </div>
  );
}
