"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

type Apostador = {
  nombre: string;
  telefono: string | null;
  totalQuinielas: number;
  folioActivo: string | null;
  estadoPagoActivo: string | null;
};

type JornadaActiva = {
  id: string;
  nombre: string | null;
  numero: number;
  liga: string;
} | null;

// ── Helpers WA ───────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setMobile(/Android|iPhone|iPad/i.test(navigator.userAgent)); }, []);
  return mobile;
}

function waLink(tel: string, msg: string, isMobile: boolean) {
  const limpio = tel.replace(/\D/g, "");
  const telWA  = limpio.length === 10 ? `52${limpio}` : limpio;
  if (isMobile)
    return `intent://send?phone=${telWA}&text=${encodeURIComponent(msg)}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
  return `https://wa.me/${telWA}?text=${encodeURIComponent(msg)}`;
}

// ── Templates de mensajes ────────────────────────────────────────────────────
type Template = {
  id: string;
  emoji: string;
  label: string;
  /** null = siempre visible; "activa" = necesita quiniela en jornada activa; "pendiente" = estadoPago pendiente */
  condicion: null | "activa" | "pendiente";
  generar: (ctx: {
    nombre: string;
    jornadaNombre: string;
    miLink: string;
    folioActivo: string | null;
    origin: string;
  }) => string;
};

const TEMPLATES: Template[] = [
  {
    id: "nueva",
    emoji: "🆕",
    label: "Nueva quiniela disponible",
    condicion: null,
    generar: ({ nombre, jornadaNombre, miLink }) => [
      `¡Hola ${nombre}! 🎯`,
      ``,
      `Ya tenemos lista la quiniela de *${jornadaNombre}*. ¡No te la pierdas!`,
      ``,
      `Regístrate aquí 👉 ${miLink}`,
      ``,
      `¡Buena suerte! 🍀`,
    ].join("\n"),
  },
  {
    id: "cancelada",
    emoji: "❌",
    label: "Jornada cancelada",
    condicion: "activa",
    generar: ({ nombre, jornadaNombre }) => [
      `¡Hola ${nombre}! 😔`,
      ``,
      `Lamentablemente la quiniela de *${jornadaNombre}* no se va a realizar esta vez porque no se juntaron suficientes participantes.`,
      ``,
      `Pero no te preocupes, en la siguiente jornada podrás participar *gratis* como compensación. ¡Gracias por tu comprensión! 🙏`,
    ].join("\n"),
  },
  {
    id: "pago",
    emoji: "⏳",
    label: "Recordatorio de pago",
    condicion: "pendiente",
    generar: ({ nombre, jornadaNombre }) => [
      `¡Hola ${nombre}! 💰`,
      ``,
      `Te recordamos que tu quiniela de *${jornadaNombre}* todavía no tiene el pago confirmado.`,
      ``,
      `Confírmalo para asegurar tu lugar. ¡No te quedes fuera! 🎯`,
    ].join("\n"),
  },
  {
    id: "resultados",
    emoji: "🏆",
    label: "Resultados disponibles",
    condicion: "activa",
    generar: ({ nombre, jornadaNombre, folioActivo, origin }) => [
      `¡Hola ${nombre}! 🏆`,
      ``,
      `Ya están los resultados de *${jornadaNombre}*. ¡Consulta cómo te fue!`,
      ``,
      folioActivo ? `👉 ${origin}/ticket/${folioActivo}` : ``,
      ``,
      `¡Gracias por participar! 🍀`,
    ].filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n"),
  },
  {
    id: "invitacion",
    emoji: "🤝",
    label: "Invitación a participar",
    condicion: null,
    generar: ({ nombre, miLink }) => [
      `¡Hola ${nombre}! 👋`,
      ``,
      `¿Te animas a participar en nuestra próxima quiniela? Es muy fácil y divertido 🎯`,
      ``,
      `Regístrate aquí 👉 ${miLink}`,
      ``,
      `¡Te esperamos! 🍀`,
    ].join("\n"),
  },
];

// ── Dropdown de WA por apostador ─────────────────────────────────────────────
function WaDropdown({
  apostador,
  jornadaActiva,
  miLink,
}: {
  apostador: Apostador;
  jornadaActiva: JornadaActiva;
  miLink: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);

  // Cierra al hacer click fuera
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [abierto]);

  if (!apostador.telefono) {
    return (
      <span title="Sin teléfono registrado" className="text-gray-300 text-xl cursor-not-allowed">
        💬
      </span>
    );
  }

  const jornadaNombre = jornadaActiva
    ? (jornadaActiva.nombre ?? `Jornada ${jornadaActiva.numero}`)
    : "la próxima jornada";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const ctx = {
    nombre: apostador.nombre.split(" ")[0], // solo primer nombre
    jornadaNombre,
    miLink,
    folioActivo: apostador.folioActivo,
    origin,
  };

  // Filtra templates según condición
  const disponibles = TEMPLATES.filter((t) => {
    if (t.condicion === null) return true;
    if (t.condicion === "activa") return !!apostador.folioActivo;
    if (t.condicion === "pendiente")
      return apostador.folioActivo && apostador.estadoPagoActivo === "pendiente";
    return true;
  });

  const copiar = (msg: string, id: string) => {
    navigator.clipboard.writeText(msg);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((v) => !v)}
        title="Enviar mensaje por WhatsApp"
        className="w-9 h-9 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 flex items-center justify-center transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#25D366]" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </button>

      {abierto && (
        <div className="absolute right-0 top-11 z-50 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-[#25D366]/10 border-b border-[#25D366]/20">
            <p className="text-xs font-bold text-green-800">
              WhatsApp → {apostador.nombre.split(" ")[0]}
            </p>
            {jornadaActiva && (
              <p className="text-[10px] text-green-600 mt-0.5">
                Jornada activa: {jornadaNombre}
              </p>
            )}
          </div>

          <div className="py-1">
            {disponibles.map((t) => {
              const msg = t.generar(ctx);
              const link = waLink(apostador.telefono!, msg, isMobile);
              return (
                <div key={t.id} className="flex items-center gap-1 px-2 py-1 hover:bg-gray-50">
                  {/* Abrir WA */}
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setAbierto(false)}
                    className="flex-1 flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-[#25D366]/10 transition-colors group"
                  >
                    <span className="text-base shrink-0">{t.emoji}</span>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-green-800 leading-tight">
                      {t.label}
                    </span>
                  </a>
                  {/* Copiar mensaje */}
                  {!isMobile && (
                    <button
                      onClick={() => copiar(msg, t.id)}
                      title="Copiar mensaje"
                      className="shrink-0 w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs flex items-center justify-center transition-colors"
                    >
                      {copiado === t.id ? "✓" : "📋"}
                    </button>
                  )}
                </div>
              );
            })}

            {disponibles.length === 0 && (
              <p className="px-4 py-3 text-xs text-gray-400 text-center">
                No hay mensajes disponibles para este apostador
              </p>
            )}
          </div>

          {!jornadaActiva && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
              <p className="text-[10px] text-amber-600">
                ⚠️ Sin jornada activa — algunos mensajes no están disponibles
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ApostadoresPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esAdmin = ["admin", "superadmin"].includes(rol);

  const [apostadores, setApostadores]       = useState<Apostador[]>([]);
  const [jornadaActiva, setJornadaActiva]   = useState<JornadaActiva>(null);
  const [codigoRef, setCodigoRef]           = useState<string | null>(null);
  const [cargando, setCargando]             = useState(true);
  const [busqueda, setBusqueda]             = useState("");

  useEffect(() => {
    fetch("/api/admin/apostadores")
      .then((r) => r.json())
      .then((data) => {
        if (data.apostadores)  setApostadores(data.apostadores);
        if (data.jornadaActiva !== undefined) setJornadaActiva(data.jornadaActiva);
        if (data.codigoRef)    setCodigoRef(data.codigoRef);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const backHref  = esAdmin ? "/admin" : "/admin/tienda";
  const backLabel = esAdmin ? "Admin" : "Mi Panel";

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const miLink = codigoRef
    ? `${origin}/ref/${codigoRef}`
    : origin;

  const filtrados = apostadores.filter((a) =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (a.telefono ?? "").includes(busqueda)
  );

  const conJornada = filtrados.filter((a) => a.folioActivo).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href={backHref} className="text-amber-400 text-sm">← {backLabel}</a>
            <h1 className="text-xl font-bold mt-1">Apostadores</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "40px", objectFit: "contain" }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {cargando ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
            Cargando...
          </div>
        ) : apostadores.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-medium text-gray-500">Sin apostadores todavía</p>
            <p className="text-sm mt-1">Los clientes aparecerán aquí cuando registres quinielas</p>
          </div>
        ) : (
          <>
            {/* Jornada activa banner */}
            {jornadaActiva && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">🟢</span>
                <div>
                  <p className="text-sm font-bold text-green-800">
                    {jornadaActiva.nombre ?? `Jornada ${jornadaActiva.numero}`} activa
                  </p>
                  <p className="text-xs text-green-600">
                    {conJornada} apostador{conJornada !== 1 ? "es" : ""} participando
                  </p>
                </div>
              </div>
            )}

            {/* Buscador + contador */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-2 rounded-xl font-medium shrink-0">
                {filtrados.length} / {apostadores.length}
              </span>
            </div>

            {/* Lista */}
            <div className="bg-white rounded-xl shadow-sm">
              {filtrados.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Sin resultados para &ldquo;{busqueda}&rdquo;
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtrados.map((a, i) => (
                    <div key={i} className={`p-4 flex items-center justify-between gap-3 ${i === 0 ? "rounded-t-xl" : ""} ${i === filtrados.length - 1 ? "rounded-b-xl" : ""}`}>
                      {/* Avatar + info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {a.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-gray-800 truncate">{a.nombre}</p>
                            {a.folioActivo && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                a.estadoPagoActivo === "confirmado"
                                  ? "bg-green-100 text-green-700"
                                  : a.estadoPagoActivo === "no_realizado"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                                {a.estadoPagoActivo === "confirmado" ? "✓ pagado" : a.estadoPagoActivo === "no_realizado" ? "✗ no pagó" : "⏳ pendiente"}
                              </span>
                            )}
                          </div>
                          {a.telefono ? (
                            <a href={`tel:${a.telefono}`} className="text-xs text-amber-600 hover:underline">
                              {a.telefono}
                            </a>
                          ) : (
                            <p className="text-xs text-gray-400">Sin teléfono</p>
                          )}
                        </div>
                      </div>

                      {/* Derecha: quinielas + WA */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-green-700 text-lg">{a.totalQuinielas}</p>
                          <p className="text-xs text-gray-400">quiniela{a.totalQuinielas !== 1 ? "s" : ""}</p>
                        </div>
                        <WaDropdown
                          apostador={a}
                          jornadaActiva={jornadaActiva}
                          miLink={miLink}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
