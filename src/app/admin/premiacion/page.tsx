"use client";
import { useState } from "react";
import { JornadaSelector, type JornadaResumen } from "@/components/JornadaSelector";
import { useLocale } from "@/hooks/useLocale";
import { translations } from "@/lib/i18n";
import { LocaleToggle } from "@/components/LocaleToggle";

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
  totalEnJuego: number;
  desglose: {
    fondoAdmin: number; netoAdmin: number;
    comisionTienda: number;   tiendaCount: number;
    comisionReferido: number; referidoCount: number;
    comisionDirecta: number;  directaCount: number;
    totalComisiones: number;
    bolsaNeta: number;
  };
  bolsa1: number;
  bolsa2Total: number;
  ganadores1: Ganador[];
  ganadores2: Ganador[];
  acumulaciones2: number;
  segundoDistribuido: boolean;
};

function formatMXN(amount: number): string {
  return amount.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
}

function buildWhatsAppMsg(
  nombre: string | null,
  aciertos: number | null,
  jornadaNombre: string,
  lugar: "1.°" | "2.°",
  premio: number | null,
  locale: "es" | "en" = "es"
): string {
  return translations[locale].wa.ganador(
    nombre,
    aciertos ?? 0,
    jornadaNombre,
    lugar,
    formatMXN(premio ?? 0),
  );
}

function whatsappUrl(telefono: string | null, msg: string): string {
  if (!telefono) return "#";
  const clean = telefono.replace(/\D/g, "");
  const num = clean.startsWith("52") ? clean : `52${clean}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function GanadorCard({ ganador, lugar, jornadaNombre, locale = "es" }: { ganador: Ganador; lugar: "1.°" | "2.°"; jornadaNombre: string; locale?: "es" | "en" }) {
  const msg = buildWhatsAppMsg(ganador.nombre, ganador.aciertos, jornadaNombre, lugar, ganador.premio, locale);
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
  const [locale, setLocale] = useLocale();

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
          <div className="flex items-center gap-3">
            <LocaleToggle locale={locale} onChange={setLocale} dark />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} />
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {cargando && (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 shadow-sm">Cargando premios...</div>
        )}

        {error && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
            <a
              href={`/resultados/${jornadaSeleccionada.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-amber-50 hover:border-amber-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors shadow-sm"
            >
              <span>📊</span> Ver tabla de resultados
            </a>
          </div>
        )}

        {datos && !cargando && (
          <>
            {/* Resumen financiero — desglose completo */}
            <div>
              <p className="text-xs text-gray-400 font-medium px-1 mb-2">DESGLOSE FINANCIERO</p>
              <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-3 text-sm">

                {/* ── Total recaudado ─────────────────────────────────── */}
                <div className="flex justify-between font-bold text-base">
                  <span>Total recaudado ({datos.totalEnJuego} quinielas)</span>
                  <span>{formatMXN(datos.totalRecaudado)}</span>
                </div>
                <div className="flex gap-3 text-stone-500 text-xs flex-wrap -mt-1">
                  {datos.desglose.tiendaCount   > 0 && <span>🏪 {datos.desglose.tiendaCount} tienda</span>}
                  {datos.desglose.referidoCount > 0 && <span>🔗 {datos.desglose.referidoCount} referido</span>}
                  {datos.desglose.directaCount  > 0 && <span>🌐 {datos.desglose.directaCount} directas</span>}
                </div>

                {/* ── Pozo de premios (85%) ────────────────────────────── */}
                <div className="border-t border-stone-700 pt-3 space-y-1.5">
                  <div className="flex justify-between text-green-400 font-bold">
                    <span>💰 Pozo de premios (85%)</span>
                    <span>{formatMXN(datos.desglose.bolsaNeta)}</span>
                  </div>
                  <div className="flex justify-between text-yellow-400 pl-4">
                    <span>🥇 1.° lugar (60% del total)</span>
                    <span className="font-bold">{formatMXN(datos.bolsa1)}</span>
                  </div>
                  <div className="flex justify-between text-blue-400 pl-4">
                    <span>🥈 2.° lugar (25% del total{datos.jornada.bolsa2Acumulada > 0 ? " + acum." : ""})</span>
                    <span className="font-bold">{formatMXN(datos.bolsa2Total)}</span>
                  </div>
                </div>

                {/* ── Fondo administración (15%) ───────────────────────── */}
                <div className="border-t border-stone-700 pt-3 space-y-1.5">
                  <div className="flex justify-between text-blue-400 font-bold">
                    <span>🏛️ Fondo administración (15%)</span>
                    <span>{formatMXN(datos.desglose.fondoAdmin)}</span>
                  </div>
                  {datos.desglose.comisionTienda > 0 && (
                    <div className="flex justify-between text-orange-400 pl-4">
                      <span>− Com. tienda ($2 × {datos.desglose.tiendaCount})</span>
                      <span className="font-bold">−{formatMXN(datos.desglose.comisionTienda)}</span>
                    </div>
                  )}
                  {datos.desglose.comisionReferido > 0 && (
                    <div className="flex justify-between text-cyan-400 pl-4">
                      <span>− Com. referidos ($2 × {datos.desglose.referidoCount})</span>
                      <span className="font-bold">−{formatMXN(datos.desglose.comisionReferido)}</span>
                    </div>
                  )}
                  {datos.desglose.comisionDirecta > 0 && (
                    <div className="flex justify-between text-purple-400 pl-4">
                      <span>− Com. directas ($2 × {datos.desglose.directaCount})</span>
                      <span className="font-bold">−{formatMXN(datos.desglose.comisionDirecta)}</span>
                    </div>
                  )}
                  {datos.desglose.totalComisiones > 0 && (
                    <div className="flex justify-between text-stone-400 pl-4 border-t border-stone-700 pt-1 mt-1">
                      <span>= Neto admin</span>
                      <span className="font-bold">{formatMXN(datos.desglose.netoAdmin)}</span>
                    </div>
                  )}
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
                    <GanadorCard key={g.folio} ganador={g} lugar="1.°" jornadaNombre={jornadaNombre} locale={locale} />
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
                      <GanadorCard key={g.folio} ganador={g} lugar="2.°" jornadaNombre={jornadaNombre} locale={locale} />
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
