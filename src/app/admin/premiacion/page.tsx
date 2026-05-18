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

type Participante = { folio: string; nombre: string | null; telefono: string | null };

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
    fondoAdmin: number;
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
  participantes: Participante[];
};

function formatMXN(amount: number): string {
  return amount.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
}

const BASE_URL = "https://tablitasquinielas.netlify.app";

function buildWhatsAppMsg(
  nombre: string | null,
  aciertos: number | null,
  jornadaNombre: string,
  lugar: "1.°" | "2.°",
  premio: number | null,
  locale: "es" | "en" = "es",
  jornadaId?: string,
): string {
  const link = jornadaId ? `${BASE_URL}/resultados/${jornadaId}` : undefined;
  return translations[locale].wa.ganador(
    nombre,
    aciertos ?? 0,
    jornadaNombre,
    lugar,
    formatMXN(premio ?? 0),
    link,
  );
}

function buildMassMsgText(nombre: string | null, jornadaNombre: string, jornadaId: string): string {
  const link = `${BASE_URL}/resultados/${jornadaId}`;
  return [
    `Hola ${nombre ?? ""}! 👋`,
    ``,
    `Aquí está la tabla de resultados de *${jornadaNombre}*. ¡Revisa cómo quedaste en la lista!`,
    ``,
    `📊 Ver resultados completos:`,
    link,
    ``,
    `Tablitas Quinielas 🎯`,
  ].join("\n");
}

type WaType = "normal" | "business";

function whatsappUrl(telefono: string | null, msg: string, type: WaType = "normal"): string {
  if (!telefono) return "#";
  const clean = telefono.replace(/\D/g, "");
  const num = clean.startsWith("52") ? clean : `52${clean}`;
  if (type === "business") {
    return `https://web.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(msg)}`;
  }
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function GanadorCard({ ganador, lugar, jornadaNombre, jornadaId, waType = "normal", locale = "es" }: { ganador: Ganador; lugar: "1.°" | "2.°"; jornadaNombre: string; jornadaId?: string; waType?: WaType; locale?: "es" | "en" }) {
  const msg = buildWhatsAppMsg(ganador.nombre, ganador.aciertos, jornadaNombre, lugar, ganador.premio, locale, jornadaId);
  const urlNormal   = whatsappUrl(ganador.telefono, msg, "normal");
  const urlBusiness = whatsappUrl(ganador.telefono, msg, "business");

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
        <div className="grid grid-cols-2 gap-1.5">
          <a href={urlNormal} target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-bold transition-colors ${waType === "normal" ? "bg-green-600 hover:bg-green-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            💬 WA Normal
          </a>
          <a href={urlBusiness} target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-bold transition-colors ${waType === "business" ? "bg-green-600 hover:bg-green-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            🌐 WA Web
          </a>
        </div>
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
  const [waType, setWaType] = useState<WaType>("normal");

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
              <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-2 text-sm">

                {/* Total */}
                <div className="flex justify-between font-bold">
                  <span className="text-stone-300">Total recaudado ({datos.totalEnJuego} quinielas)</span>
                  <span>{formatMXN(datos.totalRecaudado)}</span>
                </div>
                <div className="flex gap-3 text-stone-500 text-xs flex-wrap">
                  {datos.desglose.tiendaCount   > 0 && <span>🏪 {datos.desglose.tiendaCount} tienda</span>}
                  {datos.desglose.referidoCount > 0 && <span>🔗 {datos.desglose.referidoCount} referido</span>}
                  {datos.desglose.directaCount  > 0 && <span>🌐 {datos.desglose.directaCount} directas</span>}
                </div>

                {/* Deducciones */}
                <div className="border-t border-stone-700 pt-2 space-y-1">
                  <div className="flex justify-between text-blue-400">
                    <span>− Casa (15%)</span>
                    <span className="font-bold">−{formatMXN(datos.desglose.fondoAdmin)}</span>
                  </div>
                  {datos.desglose.comisionTienda > 0 && (
                    <div className="flex justify-between text-orange-400">
                      <span>− Com. tienda ($2 × {datos.desglose.tiendaCount})</span>
                      <span className="font-bold">−{formatMXN(datos.desglose.comisionTienda)}</span>
                    </div>
                  )}
                  {datos.desglose.comisionReferido > 0 && (
                    <div className="flex justify-between text-cyan-400">
                      <span>− Com. referidos ($2 × {datos.desglose.referidoCount})</span>
                      <span className="font-bold">−{formatMXN(datos.desglose.comisionReferido)}</span>
                    </div>
                  )}
                  {datos.desglose.comisionDirecta > 0 && (
                    <div className="flex justify-between text-purple-400">
                      <span>− Com. directas ($2 × {datos.desglose.directaCount})</span>
                      <span className="font-bold">−{formatMXN(datos.desglose.comisionDirecta)}</span>
                    </div>
                  )}
                </div>

                {/* Bolsa neta */}
                <div className="border-t border-stone-700 pt-2 flex justify-between text-green-400 font-bold">
                  <span>💰 Bolsa de premios</span>
                  <span className="text-base">{formatMXN(datos.desglose.bolsaNeta)}</span>
                </div>

                {/* Split premios */}
                <div className="border-t border-stone-700 pt-2 space-y-1">
                  <div className="flex justify-between text-yellow-400">
                    <span>🥇 1.° lugar</span>
                    <span className="font-bold">{formatMXN(datos.bolsa1)}</span>
                  </div>
                  <div className="flex justify-between text-blue-400">
                    <span>🥈 2.° lugar{datos.jornada.bolsa2Acumulada > 0 ? " + acum." : ""}</span>
                    <span className="font-bold">{formatMXN(datos.bolsa2Total)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500 text-xs pt-1">
                    <span>Total distribuido</span>
                    <span>{formatMXN(datos.bolsa1 + datos.bolsa2Total)}</span>
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

            {/* WA type toggle */}
            <div>
              <p className="text-xs text-gray-400 font-medium px-1 mb-2">TIPO DE WHATSAPP</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWaType("normal")}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${waType === "normal" ? "bg-green-600 text-white" : "bg-white text-gray-500 border border-gray-200"}`}
                >
                  💬 WA Normal
                </button>
                <button
                  onClick={() => setWaType("business")}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${waType === "business" ? "bg-green-700 text-white" : "bg-white text-gray-500 border border-gray-200"}`}
                >
                  🌐 WA Web
                </button>
              </div>
            </div>

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
                    <GanadorCard key={g.folio} ganador={g} lugar="1.°" jornadaNombre={jornadaNombre} jornadaId={datos.jornada.id} waType={waType} locale={locale} />
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
                      <GanadorCard key={g.folio} ganador={g} lugar="2.°" jornadaNombre={jornadaNombre} jornadaId={datos.jornada.id} locale={locale} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mensaje masivo */}
            {datos.participantes.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium px-1 mb-2">
                  📣 MENSAJE MASIVO — {datos.participantes.length} participantes con teléfono
                </p>
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 space-y-1">
                    <p className="text-xs text-gray-500 font-medium">Vista previa del mensaje:</p>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 font-sans leading-relaxed">
                      {buildMassMsgText("(nombre)", jornadaNombre, datos.jornada.id)}
                    </pre>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                    {datos.participantes.map((p) => {
                      const msg = buildMassMsgText(p.nombre, jornadaNombre, datos.jornada.id);
                      const clean = (p.telefono ?? "").replace(/\D/g, "");
                      const num = clean.startsWith("52") ? clean : `52${clean}`;
                      const urlNormal   = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
                      const urlBusiness = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(msg)}`;
                      return (
                        <div key={p.folio} className="flex items-center justify-between gap-2 px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.nombre ?? "—"}</p>
                            <p className="text-xs text-gray-400 font-mono">{p.telefono}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <a href={urlNormal} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-green-100 hover:bg-green-200 text-green-800 font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                              💬
                            </a>
                            <a href={urlBusiness} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2.5 py-1.5 rounded-lg transition-colors">
                              🏢
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
