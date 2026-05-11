"use client";
import { useState } from "react";
import { JornadaSelector, type JornadaResumen } from "@/components/JornadaSelector";

type Ganador = {
  folio: string;
  nombre: string | null;
  telefono: string | null;
  aciertos: number | null;
  premio: number | null;
};

type PremiacionData = {
  jornada: {
    id: string;
    numero: number;
    nombre: string | null;
    temporada: string;
    liga: string;
    estado: string;
    bolsa2Acumulada: number;
    acumulaciones2: number;
  };
  totalRecaudado: number;
  bolsa1: number;
  bolsa2Total: number;
  ganadores1: Ganador[];
  ganadores2: Ganador[];
  totalConfirmadas: number;
  acumulaciones2: number;
  segundoDistribuido: boolean;
};

function formatMXN(amount: number): string {
  return amount.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
}

function buildWhatsAppMsg(nombre: string | null, aciertos: number | null, jornadaNombre: string, lugar: "1.°" | "2.°", premio: number | null): string {
  const lines = [
    `🏆 ¡Felicidades ${nombre ?? "ganador/a"}!`,
    ``,
    `Obtuviste ${aciertos ?? 0} aciertos en la jornada ${jornadaNombre} y ganaste el ${lugar} lugar.`,
    ``,
    `💰 Tu premio: ${formatMXN(premio ?? 0)}`,
    ``,
    `Tienes 7 días para reclamarlo. ¡Contáctanos para recibirlo!`,
    ``,
    `Tablitas Quinielas 🎯`,
  ];
  return lines.join("\n");
}

function whatsappUrl(telefono: string | null, msg: string): string {
  if (!telefono) return "#";
  const clean = telefono.replace(/\D/g, "");
  const num = clean.startsWith("52") ? clean : `52${clean}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function GanadorCard({ ganador, lugar, jornadaNombre }: { ganador: Ganador; lugar: "1.°" | "2.°"; jornadaNombre: string }) {
  const msg = buildWhatsAppMsg(ganador.nombre, ganador.aciertos, jornadaNombre, lugar, ganador.premio);
  const url = whatsappUrl(ganador.telefono, msg);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-800">{ganador.nombre || "—"}</p>
          <p className="text-xs font-mono text-gray-400">{ganador.folio}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-green-700 text-lg">{formatMXN(ganador.premio ?? 0)}</p>
          <p className="text-xs text-gray-500">{ganador.aciertos} aciertos</p>
        </div>
      </div>
      {ganador.telefono ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-sm transition-colors"
        >
          <span>💬</span> Notificar por WhatsApp
        </a>
      ) : (
        <p className="text-xs text-gray-400 text-center italic">Sin teléfono registrado</p>
      )}
    </div>
  );
}

export default function PremiacionPage() {
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<JornadaResumen | null>(null);
  const [datos, setDatos] = useState<PremiacionData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarPremiacion = async (j: JornadaResumen) => {
    // Only allow finalized jornadas
    if (j.estado !== "finalizada") {
      setJornadaSeleccionada(j);
      setDatos(null);
      setError("Esta jornada aún no ha sido finalizada. Solo se pueden ver premios de jornadas finalizadas.");
      return;
    }
    setJornadaSeleccionada(j);
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/premiacion?jornadaId=${j.id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cargar premiación");
      } else {
        setDatos(data);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setCargando(false);
    }
  };

  if (!jornadaSeleccionada) {
    return (
      <JornadaSelector
        onSelect={cargarPremiacion}
        titulo="Premiación"
        backHref="/admin"
        backLabel="Admin"
        soloActivas={false}
      />
    );
  }

  const jornadaNombre = jornadaSeleccionada.nombre ?? `Jornada ${jornadaSeleccionada.numero}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <div>
            <button
              onClick={() => { setJornadaSeleccionada(null); setDatos(null); setError(""); }}
              className="text-amber-400 text-sm"
            >
              ← Cambiar jornada
            </button>
            <h1 className="text-xl font-bold mt-1">Premiación</h1>
            <p className="text-amber-400 text-xs">{jornadaNombre} · {jornadaSeleccionada.temporada}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {cargando && (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 shadow-sm">Cargando premios...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {datos && !cargando && (
          <>
            {/* Resumen financiero */}
            <div>
              <p className="text-xs text-gray-400 font-medium px-1 mb-2">RESUMEN DE BOLSA</p>
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quinielas confirmadas</span>
                  <span className="font-bold">{datos.totalConfirmadas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total recaudado</span>
                  <span className="font-bold text-gray-800">{formatMXN(datos.totalRecaudado)}</span>
                </div>
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700 font-medium">🥇 Bolsa 1.° lugar (60%)</span>
                    <span className="font-bold text-yellow-700">{formatMXN(datos.bolsa1)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700 font-medium">🥈 Bolsa 2.° lugar (25%{datos.jornada.bolsa2Acumulada > 0 ? " + acum." : ""})</span>
                    <span className="font-bold text-blue-700">{formatMXN(datos.bolsa2Total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Admin (15%)</span>
                    <span>{formatMXN(datos.totalRecaudado * 0.15)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2nd place accumulation notice */}
            {!datos.segundoDistribuido && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-800 font-bold text-sm">2.° lugar acumulado</p>
                <p className="text-blue-700 text-sm mt-1">
                  La bolsa de 2.° lugar ({formatMXN(datos.bolsa2Total)}) se acumula a la siguiente jornada
                  porque hay más de 20 ganadores.
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Acumulaciones registradas: {datos.acumulaciones2} de 2 máximas. En la 3.ª semana se distribuye sin importar el número de ganadores.
                </p>
              </div>
            )}

            {/* 1st place winners */}
            <div>
              <p className="text-xs text-gray-400 font-medium px-1 mb-2">
                🥇 PRIMER LUGAR — {datos.ganadores1.length} ganador{datos.ganadores1.length !== 1 ? "es" : ""}
                {datos.ganadores1.length > 0 && ` · ${formatMXN(datos.ganadores1[0]?.premio ?? 0)} c/u`}
              </p>
              {datos.ganadores1.length === 0 ? (
                <div className="bg-white rounded-xl p-4 text-center text-gray-400 shadow-sm text-sm">
                  No hay ganadores de 1.° lugar con pago confirmado
                </div>
              ) : (
                <div className="space-y-3">
                  {datos.ganadores1.map((g) => (
                    <GanadorCard key={g.folio} ganador={g} lugar="1.°" jornadaNombre={jornadaNombre} />
                  ))}
                </div>
              )}
            </div>

            {/* 2nd place winners */}
            {datos.segundoDistribuido && (
              <div>
                <p className="text-xs text-gray-400 font-medium px-1 mb-2">
                  🥈 SEGUNDO LUGAR — {datos.ganadores2.length} ganador{datos.ganadores2.length !== 1 ? "es" : ""}
                  {datos.ganadores2.length > 0 && ` · ${formatMXN(datos.ganadores2[0]?.premio ?? 0)} c/u`}
                </p>
                {datos.ganadores2.length === 0 ? (
                  <div className="bg-white rounded-xl p-4 text-center text-gray-400 shadow-sm text-sm">
                    No hay ganadores de 2.° lugar con pago confirmado
                  </div>
                ) : (
                  <div className="space-y-3">
                    {datos.ganadores2.map((g) => (
                      <GanadorCard key={g.folio} ganador={g} lugar="2.°" jornadaNombre={jornadaNombre} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <a
              href={`/resultados/${datos.jornada.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              📊 Ver cuadrícula de resultados
            </a>
            <a
              href="/admin"
              className="block w-full text-center bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Volver al admin
            </a>
          </>
        )}
      </div>
    </div>
  );
}
