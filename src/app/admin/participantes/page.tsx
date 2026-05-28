"use client";
import { useState, useEffect } from "react";
import { PhoneInput, telCompleto, parsearTelefono, formatearTelefono } from "@/components/PhoneInput";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
  totalQuinielas: number;
  pendientes: number;
  pendientesCerrados: number;
  ganadoras: number;
  ultimaJornada: number | null;
  jornadasAbiertasCompradas: string[]; // IDs de jornadas abiertas donde ya compró
};

type JornadaAbierta = {
  id: string;
  nombre: string | null;
  numero: number;
  liga: string;
  ligasDetalle: string[];
  primerPartidoFecha: string | null; // ISO — fecha de cierre de registro
};

// Convierte liga + ligasDetalle en una descripción natural para el mensaje WA
function descLigas(liga: string, ligasDetalle: string[]): string {
  const MAP: Record<string, string> = {
    "Champions":        "Champions League",
    "Champions League": "Champions League",
    "Liga MX":          "Liga MX",
    "Premier":          "Premier League",
    "Premier League":   "Premier League",
    "LaLiga":           "LaLiga española",
    "La Liga":          "LaLiga española",
    "Bundesliga":       "Bundesliga",
    "Serie A":          "Serie A italiana",
    "Ligue 1":          "Ligue 1 francesa",
    "Brasileirao":      "Brasileirao",
    "Liga Brasil":      "Brasileirao",
    "Amistosos":        "amistosos de selecciones",
    "Mundial":          "partidos del Mundial 2026 🏆",
  };
  if (liga !== "Mixta") return MAP[liga] ?? liga;
  // Mixta: listar las ligas únicas de los partidos
  const nombres = ligasDetalle.map((l) => MAP[l] ?? l);
  if (nombres.length === 0) return "varias ligas";
  if (nombres.length === 1) return nombres[0];
  return nombres.slice(0, -1).join(", ") + " y " + nombres[nombres.length - 1];
}

// Formatea la fecha de cierre en español para el mensaje
function formatFechaCierre(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
  });
}

// ── Ícono WhatsApp ──────────────────────────────────────────────────────────
function IconWA({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`fill-current ${className}`}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

// ── Tarjeta de cliente ──────────────────────────────────────────────────────
function ClienteCard({
  c,
  onEditar,
  onEliminar,
  onWhatsApp,
}: {
  c: Cliente;
  onEditar: (c: Cliente) => void;
  onEliminar: (c: Cliente) => void;
  onWhatsApp: (telefono: string) => void;
}) {
  const nombre1 = c.nombre.split(" ")[0];
  const tel = c.telefono.replace(/\D/g, "");
  const telWA = tel.length === 10 ? `52${tel}` : tel;

  const msgReembolso = [
    `¡Hola ${nombre1}! 👋`,
    ``,
    `Revisamos tu registro y notamos que tu pago quedó *pendiente de confirmar* antes de que cerrara la jornada.`,
    ``,
    `Queremos ser transparentes contigo — lamentablemente ya no fue posible incluirte en esta ronda. 😔`,
    ``,
    `Puedes elegir:`,
    `💸 *Reembolso total* de tu pago`,
    `🎟️ *Crédito para la siguiente jornada* (participas gratis la próxima)`,
    ``,
    `¿Qué prefieres? Dinos y lo resolvemos de inmediato. 🙌`,
  ].join("\n");

  const msgCredito = [
    `¡Hola ${nombre1}! 🎉`,
    ``,
    `Tenemos registrado que tienes un *crédito pendiente* con nosotros de la jornada anterior.`,
    ``,
    `🎟️ Tu próxima quiniela es *completamente gratis* — solo acércate cuando abramos la siguiente jornada y te registramos sin costo.`,
    ``,
    `¡Gracias por tu confianza! 🙌`,
  ].join("\n");

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Fila principal */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center font-bold text-amber-700 text-sm shrink-0">
          {c.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{c.nombre}</p>
          <p className="text-sm text-gray-500">{formatearTelefono(c.telefono)}</p>
          <div className="flex gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-400">
              🎯 {c.totalQuinielas} confirmada{c.totalQuinielas !== 1 ? "s" : ""}
              {(c.pendientes + c.pendientesCerrados) > 0 && (
                <span className={`font-semibold ${c.pendientesCerrados > 0 ? "text-orange-500" : "text-yellow-600"}`}>
                  {" "}· {c.pendientes + c.pendientesCerrados} sin confirmar
                </span>
              )}
            </span>
            {c.ganadoras > 0 && (
              <span className="text-xs text-yellow-600 font-semibold">🏆 {c.ganadoras} ganada{c.ganadoras !== 1 ? "s" : ""}</span>
            )}
            {c.ultimaJornada && (
              <span className="text-xs text-gray-400">J{c.ultimaJornada}</span>
            )}
          </div>
          {c.pendientes > 0 && (
            <a href="/admin/quinielas" className="text-xs text-amber-600 hover:text-amber-800 hover:underline font-semibold mt-0.5 inline-block">
              ⏳ Confirmar pago →
            </a>
          )}
        </div>
        {/* Acciones */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onWhatsApp(c.telefono)} className="bg-[#25D366] hover:bg-[#20b858] text-white p-2 rounded-lg transition-colors" title="WhatsApp">
            <IconWA />
          </button>
          <button onClick={() => onEditar(c)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 p-2 rounded-lg transition-colors" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={() => onEliminar(c)} className="bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-colors" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Panel pago sin confirmar en jornada cerrada */}
      {c.pendientesCerrados > 0 && (
        <div className="border-t border-orange-100 bg-orange-50 px-4 py-3">
          <p className="text-xs font-bold text-orange-700 mb-2">
            ⚠️ {c.pendientesCerrados} pago{c.pendientesCerrados !== 1 ? "s" : ""} sin confirmar — jornada cerrada
          </p>
          <p className="text-xs text-orange-600 mb-2">Ofrécele una solución por WhatsApp:</p>
          <div className="flex gap-2">
            <a
              href={`https://wa.me/${telWA}?text=${encodeURIComponent(msgReembolso)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs bg-white border border-orange-200 hover:bg-orange-100 text-orange-700 font-semibold px-2 py-2 rounded-lg transition-colors"
            >
              💸 Ofrecer reembolso
            </a>
            <a
              href={`https://wa.me/${telWA}?text=${encodeURIComponent(msgCredito)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center text-xs bg-white border border-orange-200 hover:bg-orange-100 text-orange-700 font-semibold px-2 py-2 rounded-lg transition-colors"
            >
              🎟️ Ofrecer crédito
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal de edición ────────────────────────────────────────────────────────
function ModalEditar({
  cliente,
  onGuardar,
  onCerrar,
}: {
  cliente: Cliente;
  onGuardar: (id: string, nombre: string, telefono: string) => Promise<void>;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(cliente.nombre);
  const { codigo: initCodigo, numero: initNumero } = parsearTelefono(cliente.telefono);
  const [codigoPais, setCodigoPais] = useState(initCodigo);
  const [telefono, setTelefono] = useState(initNumero);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!nombre.trim()) { setError("El nombre no puede estar vacío"); return; }
    if (!telefono.trim()) { setError("El teléfono no puede estar vacío"); return; }
    setGuardando(true);
    setError("");
    try {
      await onGuardar(cliente.id, nombre.trim(), telCompleto(codigoPais, telefono));
      onCerrar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800 text-lg">Editar participante</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Teléfono</label>
            <PhoneInput
              variant="fused"
              codigo={codigoPais}
              numero={telefono}
              onCodigo={setCodigoPais}
              onNumero={setTelefono}
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCerrar}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de confirmación de eliminación ────────────────────────────────────
function ModalEliminar({
  cliente,
  onConfirmar,
  onCerrar,
}: {
  cliente: Cliente;
  onConfirmar: (id: string) => Promise<void>;
  onCerrar: () => void;
}) {
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  const handleEliminar = async () => {
    setEliminando(true);
    setError("");
    try {
      await onConfirmar(cliente.id);
      onCerrar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🗑️</div>
          <h2 className="font-bold text-gray-800 text-lg">Eliminar participante</h2>
          <p className="text-gray-500 text-sm mt-1">
            ¿Eliminar a <span className="font-semibold text-gray-700">{cliente.nombre}</span>?
          </p>
          {cliente.totalQuinielas > 0 && (
            <p className="text-orange-600 text-xs mt-2 bg-orange-50 rounded-lg px-3 py-2">
              ⚠️ Tiene {cliente.totalQuinielas} quiniela{cliente.totalQuinielas !== 1 ? "s" : ""} registrada{cliente.totalQuinielas !== 1 ? "s" : ""}. Se desvinculará del cliente pero no se borrarán.
            </p>
          )}
          {error && (
            <p className="text-red-500 text-xs mt-2 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCerrar}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            disabled={eliminando}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            {eliminando ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function ParticipantesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [jornadasAbiertas, setJornadasAbiertas] = useState<JornadaAbierta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [modoBroadcast, setModoBroadcast] = useState(false);
  const [tipoNotif, setTipoNotif] = useState<"general" | "sobreventa">("general");
  const [jornadaSobreventa, setJornadaSobreventa] = useState<JornadaAbierta | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [indiceActual, setIndiceActual] = useState(0);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());

  const [editando, setEditando] = useState<Cliente | null>(null);
  const [eliminando, setEliminando] = useState<Cliente | null>(null);

  const cargar = () => {
    fetch("/api/admin/participantes")
      .then((r) => r.json())
      .then((data) => {
        if (data.clientes) {
          setClientes(data.clientes);
          setJornadasAbiertas(data.jornadasAbiertas ?? []);
        }
        setCargando(false);
      });
  };

  useEffect(() => { cargar(); }, []);

  const handleGuardar = async (id: string, nombre: string, telefono: string) => {
    const res = await fetch("/api/admin/participantes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nombre, telefono }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? "Error al guardar");
    }
    setClientes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nombre, telefono } : c))
    );
  };

  const handleEliminar = async (id: string) => {
    const res = await fetch("/api/admin/participantes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Error al eliminar");
    setClientes((prev) => prev.filter((c) => c.id !== id));
  };

  const abrirBroadcast = (tipo: "general" | "sobreventa", jornada?: JornadaAbierta) => {
    const origen = typeof window !== "undefined" ? window.location.origin : "https://tablitasquinielas.com";
    const nombreJornada = jornada
      ? (jornada.nombre ?? `Jornada ${jornada.numero}`)
      : "la siguiente jornada";
    const ligas = jornada ? descLigas(jornada.liga, jornada.ligasDetalle ?? []) : "varias ligas";
    const cierre = jornada?.primerPartidoFecha
      ? formatFechaCierre(jornada.primerPartidoFecha)
      : "[fecha de cierre]";
    // Link directo a la jornada si se conoce; genérico si es notificación general
    const linkQuiniela = jornada
      ? `${origen}/quiniela?jornada=${jornada.id}`
      : `${origen}/quiniela`;

    if (tipo === "sobreventa") {
      setMensaje(
        `⚽ *¡No te quedes fuera!*\n\n` +
        `Hola {nombre}, ya está abierta la quiniela *${nombreJornada}* con partidos de ${ligas} 👀\n\n` +
        `🗓️ Todavía estás a tiempo de registrarte\n` +
        `💵 Solo $20 MXN por quiniela\n` +
        `🏆 Adivina todos los resultados y gana el premio\n\n` +
        `👉 ${linkQuiniela}\n\n` +
        `¡Recuerda que el registro se cierra el ${cierre}! ⏰\n\n` +
        `¡Cualquier duda contáctanos!`
      );
    } else {
      setMensaje(
        `⚽ *¡Ya está abierta!*\n\n` +
        `Hola {nombre}, ya puedes registrar tu quiniela *${nombreJornada}* con partidos de ${ligas} 👀\n\n` +
        `🗓️ Fecha límite de registro: ${cierre}\n` +
        `💵 Solo $20 MXN por quiniela\n` +
        `🏆 Adivina todos los resultados y gana el premio\n\n` +
        `👉 ${linkQuiniela}\n\n` +
        `¡Cualquier duda contáctanos!`
      );
    }
    setTipoNotif(tipo);
    setJornadaSobreventa(jornada ?? null);
    setIndiceActual(0);
    setEnviados(new Set());
    setModoBroadcast(true);
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda)
  );

  const clientesConTel = clientesFiltrados.filter((c) => {
    if (!c.telefono) return false;
    if (tipoNotif === "sobreventa" && jornadaSobreventa) {
      // Solo clientes que NO han comprado en la jornada específica de sobreventa
      return !c.jornadasAbiertasCompradas.includes(jornadaSobreventa.id);
    }
    return true;
  });

  const abrirWhatsApp = (telefono: string, msg: string, business = false) => {
    const numero = telefono.replace(/\D/g, "");
    const tel    = numero.length === 10 ? `52${numero}` : numero;
    const texto  = encodeURIComponent(msg);
    // business=true usa whatsapp:// scheme que en muchos teléfonos abre WA Business
    const url = business
      ? `whatsapp://send?phone=${tel}&text=${texto}`
      : `https://wa.me/${tel}?text=${texto}`;
    window.open(url, "_blank");
  };

  const siguiente = (business = false) => {
    const cliente = clientesConTel[indiceActual];
    if (!cliente) return;
    const primerNombre = cliente.nombre.split(" ")[0];
    const msgPersonalizado = mensaje.replace(/\{nombre\}/g, primerNombre);
    abrirWhatsApp(cliente.telefono, msgPersonalizado, business);
    setEnviados((prev) => new Set([...prev, cliente.id]));
    if (indiceActual < clientesConTel.length - 1) {
      setIndiceActual((i) => i + 1);
    }
  };

  // ── MODO BROADCAST ───────────────────────────────────────────────────────
  if (modoBroadcast) {
    const clienteActual = clientesConTel[indiceActual];
    const totalEnviados = enviados.size;
    const total = clientesConTel.length;
    const completado = totalEnviados === total;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-brand text-white py-4 px-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div>
              <button onClick={() => setModoBroadcast(false)} className="text-amber-400 text-sm">
                ← Participantes
              </button>
              <h1 className="text-xl font-bold mt-0.5">
                {tipoNotif === "sobreventa" && jornadaSobreventa
                  ? `Sobreventa — ${jornadaSobreventa.nombre ?? `J${jornadaSobreventa.numero}`}`
                  : "Notificar por WhatsApp"}
              </h1>
            </div>
            <span className="text-amber-300/70 text-sm font-bold">
              {totalEnviados}/{total}
            </span>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
          {/* Banner informativo según tipo */}
          {tipoNotif === "sobreventa" && jornadaSobreventa ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              <p className="font-bold mb-0.5">
                📢 Sobreventa — {jornadaSobreventa.nombre ?? `Jornada ${jornadaSobreventa.numero}`}
              </p>
              <p className="text-xs text-blue-600">
                Solo clientes que <strong>aún no han comprado</strong> en esta jornada.
                Quienes ya compraron no aparecen en esta lista.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <p className="font-bold mb-0.5">📣 Notificación general</p>
              <p className="text-xs text-amber-600">Se enviará a todos los clientes con teléfono registrado.</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Progreso</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400">{totalEnviados} de {total} enviados</span>
                {totalEnviados > 0 && (
                  <button
                    onClick={() => { setEnviados(new Set()); setIndiceActual(0); }}
                    className="text-[10px] text-red-400 hover:text-red-600 underline"
                    title="Reiniciar todos los enviados"
                  >
                    Reiniciar
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (totalEnviados / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
              Mensaje (editable)
            </label>
            <p className="text-[11px] text-gray-400 mb-2">
              <span className="font-mono bg-gray-100 px-1 rounded">{"{nombre}"}</span> se reemplaza automáticamente con el primer nombre de cada cliente.
            </p>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={8}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          {!completado ? (
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center font-bold text-amber-700">
                  {indiceActual + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{clienteActual?.nombre}</p>
                  <p className="text-sm text-gray-500">{formatearTelefono(clienteActual?.telefono ?? "")}</p>
                </div>
                <span className="ml-auto text-xs text-gray-400">
                  {clienteActual?.totalQuinielas} quiniela{clienteActual?.totalQuinielas !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-gray-500 text-center -mb-1">
                Elige con qué app enviar a <span className="font-semibold text-gray-700">{clienteActual?.nombre}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => siguiente(false)}
                  className="flex-1 bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-sm"
                >
                  <IconWA className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={() => siguiente(true)}
                  className="flex-1 bg-[#075E54] hover:bg-[#054d44] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors text-sm"
                >
                  <IconWA className="w-4 h-4" />
                  Business
                </button>
              </div>

              <div className="border-t pt-3 space-y-1 max-h-40 overflow-y-auto">
                <p className="text-[10px] text-gray-400 mb-1">Toca ✓ para desmarcar y reenviar</p>
                {clientesConTel.map((c, i) => {
                  const yaEnviado = enviados.has(c.id);
                  return (
                    <div key={c.id} className={`flex items-center gap-2 text-sm py-0.5 ${i === indiceActual ? "font-bold text-amber-700" : ""}`}>
                      <button
                        onClick={() => {
                          if (yaEnviado) {
                            setEnviados((prev) => { const s = new Set(prev); s.delete(c.id); return s; });
                            setIndiceActual(i);
                          }
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 transition-colors ${
                          yaEnviado
                            ? "bg-green-500 text-white hover:bg-red-400 cursor-pointer"
                            : i === indiceActual
                              ? "bg-yellow-400 text-white cursor-default"
                              : "bg-gray-200 text-gray-500 cursor-default"
                        }`}
                        title={yaEnviado ? "Desmarcar para reenviar" : undefined}
                      >
                        {yaEnviado ? "✓" : i + 1}
                      </button>
                      <span className={yaEnviado ? "line-through text-gray-400" : ""}>{c.nombre}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-amber-900 font-bold text-lg">¡Todos notificados!</h2>
              <p className="text-amber-700 text-sm">{total} mensajes enviados</p>
              <button
                onClick={() => setModoBroadcast(false)}
                className="mt-4 bg-amber-700 text-white font-bold px-6 py-2 rounded-xl"
              >
                Volver a participantes
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LISTA DE PARTICIPANTES ───────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-brand text-white py-4 px-4">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <a href="/admin" className="text-amber-400 text-sm">← Admin</a>
              <div className="flex items-center gap-3 mt-0.5">
                <h1 className="text-xl font-bold">Participantes</h1>
              </div>
              <p className="text-amber-400 text-xs mt-0.5">{clientes.length} participantes</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", flexShrink: 0 }} /></a>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-4 space-y-3">

          {/* ── Dropdown de notificaciones ── */}
          {clientes.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setDropdownAbierto((v) => !v)}
                className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <IconWA className="w-4 h-4" />
                  Notificaciones
                </span>
                <span className="text-white/70 text-xs">{dropdownAbierto ? "▲" : "▼"}</span>
              </button>

              {dropdownAbierto && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                  {/* Notificar todos */}
                  <button
                    onClick={() => { abrirBroadcast("general"); setDropdownAbierto(false); }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📣</span>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">Notificar todos</p>
                        <p className="text-xs text-gray-400">Mensaje general a todos los clientes</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-400 shrink-0">{clientes.filter(c => c.telefono).length} clientes</span>
                  </button>

                  {/* Sobreventa por jornada */}
                  {jornadasAbiertas.map((j) => {
                    const elegibles = clientes.filter(
                      (c) => c.telefono && !c.jornadasAbiertasCompradas.includes(j.id)
                    );
                    const yaCompraron = clientes.filter(
                      (c) => c.telefono && c.jornadasAbiertasCompradas.includes(j.id)
                    );
                    return (
                      <button
                        key={j.id}
                        onClick={() => { abrirBroadcast("sobreventa", j); setDropdownAbierto(false); }}
                        disabled={elegibles.length === 0}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between border-b border-gray-100 last:border-0 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📢</span>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              Sobreventa — {j.nombre ?? `Jornada ${j.numero}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {elegibles.length === 0
                                ? "Todos ya compraron ✅"
                                : `${elegibles.length} sin comprar · ${yaCompraron.length} ya compraron`}
                            </p>
                          </div>
                        </div>
                        {elegibles.length > 0 && (
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                            {elegibles.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          {cargando ? (
            <p className="text-center text-gray-400 py-8">Cargando...</p>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">👥</p>
              <p>No hay participantes aún</p>
              <p className="text-xs mt-1">Se registran automáticamente al ingresar su teléfono</p>
            </div>
          ) : (
            clientesFiltrados.map((c) => (
              <ClienteCard
                key={c.id}
                c={c}
                onEditar={setEditando}
                onEliminar={setEliminando}
                onWhatsApp={(tel) => {
                  const origen = typeof window !== "undefined" ? window.location.origin : "https://tablitasquinielas.com";
                  const nombre1 = c.nombre.split(" ")[0];
                  abrirWhatsApp(tel, `Hola ${nombre1} 👋 Hay una nueva quiniela disponible en Tablitas Quinielas.\n\n👉 ${origen}/quiniela\n\n¡Cualquier duda contáctanos!`);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Modales */}
      {editando && (
        <ModalEditar
          cliente={editando}
          onGuardar={handleGuardar}
          onCerrar={() => setEditando(null)}
        />
      )}
      {eliminando && (
        <ModalEliminar
          cliente={eliminando}
          onConfirmar={handleEliminar}
          onCerrar={() => setEliminando(null)}
        />
      )}
    </>
  );
}
