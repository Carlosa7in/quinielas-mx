"use client";
import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { getLogoUrl } from "@/lib/equipos";
import { telefonoFalso } from "@/lib/telefono";
import LoadingScreen from "@/components/LoadingScreen";

const PRECIO_BASE = 20;

// ── Logo helper ──────────────────────────────────────────────────────────────
function slugify(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
function buscarLogo(map: Record<string, string>, equipo: string): string | null {
  return map[equipo] ?? map[slugify(equipo)] ?? null;
}
function Iniciales({ nombre, size = 28 }: { nombre: string; size?: number }) {
  const ini = nombre.split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || nombre.slice(0, 2).toUpperCase();
  return (
    <div className="rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-800 shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {ini}
    </div>
  );
}
function LogoEquipo({ equipo, logoMap, size = 32 }: { equipo: string; logoMap: Record<string, string>; size?: number }) {
  const url = buscarLogo(logoMap, equipo) || getLogoUrl(equipo) || "";
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [url]);
  if (!url || broken) return <Iniciales nombre={equipo} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={equipo} width={size} height={size}
    onError={() => setBroken(true)}
    style={{ width: size, height: size, objectFit: "contain" }} className="shrink-0" />;
}

type Partido = { id: string; equipoLocal: string; equipoVisita: string; orden: number };
type JornadaInfo = { id: string; nombre: string; liga: string; temporada: string; partidos: Partido[] };
type JornadaResumen = { id: string; nombre: string; liga: string; temporada: string };
type KioskoData = {
  vendedor: { nombre: string; puntoVenta: string | null };
  jornada: JornadaInfo;
  jornadas: JornadaInfo[];
};

// picks[i] = array de opciones seleccionadas para el partido i
type Picks = string[][];

const OPCIONES = ["L", "E", "V"] as const;
const OPCION_STYLES: Record<string, { active: string; label: string }> = {
  L: { active: "bg-amber-500 border-amber-500 text-white shadow-md scale-105", label: "Local" },
  E: { active: "bg-gray-600 border-gray-600 text-white shadow-md scale-105",   label: "Empate" },
  V: { active: "bg-blue-600 border-blue-600 text-white shadow-md scale-105",   label: "Visitante" },
};
const IDLE = "bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:bg-gray-50";

function combosTotal(picks: Picks): number {
  return picks.reduce((prod, sel) => prod * (sel.length || 1), 1);
}
function badgeCombo(n: number) {
  if (n === 2) return <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full ml-1">2×</span>;
  if (n === 3) return <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full ml-1">3×</span>;
  return null;
}

// Primera letra de cada palabra en mayúscula (tras espacio, no tras acento)
const toTitleCase = (str: string) =>
  str.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const nombreCompleto = (str: string) => str.trim().split(/\s+/).length >= 2;

function rellenarAzar(picks: Picks): Picks {
  return picks.map((sel) => sel.length > 0 ? sel : [OPCIONES[Math.floor(Math.random() * OPCIONES.length)]]);
}

function picksVacias(n: number): Picks {
  return new Array(n).fill(null).map(() => []);
}

const MAX_FORMAS = 5;

export default function KioskoPage({ params }: { params: Promise<{ vendedorId: string }> }) {
  const { vendedorId } = use(params);
  const { data: session } = useSession();
  const rolSession = (session?.user as { role?: string })?.role ?? "";
  const esStaff = ["admin", "superadmin", "tienda", "vendedor"].includes(rolSession);

  const [datos, setDatos] = useState<KioskoData | null>(null);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<JornadaInfo | null>(null);
  const [errorCarga, setErrorCarga] = useState("");

  // Multi-forma
  const [formas, setFormas] = useState<Picks[]>([[]]);
  const [formaActiva, setFormaActiva] = useState(0);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sugerencias, setSugerencias] = useState<{ nombre: string; telefono: string }[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [precioEnviado, setPrecioEnviado] = useState(0);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2500);
    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    fetch(`/api/kiosko?vendedorId=${vendedorId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErrorCarga(d.error); return; }
        setDatos(d);
        if (d.jornadas?.length === 1) seleccionarJornada(d.jornadas[0]);
      })
      .catch(() => setErrorCarga("No se pudo cargar la jornada"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendedorId]);

  const seleccionarJornada = (j: JornadaInfo) => {
    setJornadaSeleccionada(j);
    setFormas([picksVacias(j.partidos.length)]);
    setFormaActiva(0);
    fetch(`/api/logos?liga=${encodeURIComponent(j.liga)}`)
      .then((r) => r.json())
      .then((m) => typeof m === "object" && setLogoMap(m))
      .catch(() => {});
  };

  const agregarForma = () => {
    if (!jornadaSeleccionada || formas.length >= MAX_FORMAS) return;
    const nueva = picksVacias(jornadaSeleccionada.partidos.length);
    setFormas((prev) => [...prev, nueva]);
    setFormaActiva(formas.length);
  };

  const quitarForma = () => {
    if (formas.length <= 1) return;
    setFormas((prev) => prev.slice(0, -1));
    setFormaActiva((prev) => Math.min(prev, formas.length - 2));
  };

  const togglePick = (idx: number, opcion: string) => {
    setFormas((prev) => {
      const newFormas = prev.map((f) => f.map((s) => [...s]));
      const picks = newFormas[formaActiva];
      const sel = picks[idx];
      const i = sel.indexOf(opcion);
      if (i < 0) {
        const newLen = sel.length + 1;
        const otros = picks.filter((_, j) => j !== idx);
        const dobles  = otros.filter((s) => s.length === 2).length;
        const triples = otros.filter((s) => s.length === 3).length;
        if (newLen === 2 && dobles  >= 3) { setAviso("Máximo 3 dobles por quiniela");  return prev; }
        if (newLen === 3 && triples >= 2) { setAviso("Máximo 2 triples por quiniela"); return prev; }
        sel.push(opcion);
      } else {
        sel.splice(i, 1);
      }
      return newFormas;
    });
  };

  // Picks de la forma activa
  const picks = formas[formaActiva] ?? [];
  const todosSeleccionadosActiva = picks.length > 0 && picks.every((s) => s.length > 0);
  const todasFormasCompletas = formas.every((f) => f.length > 0 && f.every((s) => s.length > 0));

  const combos = combosTotal(picks);
  const precioFormaActiva = combos * PRECIO_BASE;
  const precioTotal = formas.reduce((sum, f) => sum + combosTotal(f) * PRECIO_BASE, 0);

  // Sugerencias de clientes (solo staff logueado)
  useEffect(() => {
    if (!esStaff || nombre.trim().length < 2) { setSugerencias([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/clientes?q=${encodeURIComponent(nombre.trim())}`);
        if (res.ok) setSugerencias(await res.json());
      } catch { /* silencioso */ }
    }, 250);
    return () => clearTimeout(t);
  }, [nombre, esStaff]);

  const nombreValido = nombreCompleto(nombre);
  const telValido = telefono.replace(/\D/g, "").length === 10 && !telefonoFalso(telefono);
  const puedeEnviar = todasFormasCompletas && nombreValido && telValido;

  const faltanPicks = picks.filter((s) => s.length === 0).length;
  const formasIncompletas = formas.filter((f) => !f.every((s) => s.length > 0)).length;

  const doblesCount  = picks.filter((s) => s.length === 2).length;
  const triplesCount = picks.filter((s) => s.length === 3).length;

  const handleEnviar = async () => {
    if (!puedeEnviar || !datos) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      const resultados = await Promise.all(
        formas.map((picksForma) =>
          fetch("/api/kiosko", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vendedorId,
              jornadaId: jornada.id,
              nombre: nombre.trim(),
              telefono: telefono.replace(/\D/g, ""),
              picks: picksForma,
            }),
          })
        )
      );
      const errores = resultados.filter((r) => !r.ok);
      if (errores.length > 0) throw new Error("Error al enviar");
      setPrecioEnviado(precioTotal);
      setEnviado(true);
    } catch (e: unknown) {
      setErrorEnvio(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setEnviando(false);
    }
  };

  const reiniciar = () => {
    setEnviado(false);
    setJornadaSeleccionada(null);
    setFormas([[]]);
    setFormaActiva(0);
    setNombre("");
    setTelefono("");
    setErrorEnvio("");
    if (datos?.jornadas?.length === 1) seleccionarJornada(datos.jornadas[0]);
  };

  /* ── Pantalla de confirmación ────────────────────────────────────────────── */
  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-600 to-amber-800 flex flex-col items-center justify-center px-6 text-center text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "56px", objectFit: "contain" }} className="mb-6 opacity-90" />
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-black mb-2">¡Picks enviados!</h1>
        {formas.length > 1 && (
          <p className="text-amber-200 text-base mb-1">{formas.length} quinielas registradas</p>
        )}
        <p className="text-amber-100 text-lg mb-1">Tu quiniela está lista.</p>
        <p className="text-amber-200 text-sm mb-8">
          Acércate al vendedor para confirmar y pagar <strong className="text-white">${precioEnviado}</strong>.
        </p>
        <a
          href={esStaff ? "/admin/tienda" : "/"}
          className="bg-white text-amber-800 font-bold px-8 py-3 rounded-2xl shadow-lg hover:bg-amber-50 transition-colors"
        >
          {esStaff ? "← Volver al kiosko" : "Cerrar"}
        </a>
      </div>
    );
  }

  /* ── Pantalla de error de carga ──────────────────────────────────────────── */
  if (errorCarga) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "48px", objectFit: "contain" }} />
        <p className="text-4xl">⚽</p>
        <p className="text-gray-600 font-medium">{errorCarga}</p>
      </div>
    );
  }

  /* ── Cargando ────────────────────────────────────────────────────────────── */
  if (!datos) return <LoadingScreen texto="Cargando jornada..." />;

  /* ── Selección de jornada ────────────────────────────────────────────────── */
  if (!jornadaSeleccionada && datos.jornadas.length > 1) {
    const LIGA_EMOJI: Record<string, string> = {
      "Liga MX": "🇲🇽", "Champions League": "⭐", "Premier League": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      "La Liga": "🇪🇸", "Serie A": "🇮🇹", "Ligue 1": "🇫🇷", "Brasileirão": "🇧🇷",
    };
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-brand text-white px-4 pt-5 pb-6">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "40px", objectFit: "contain" }} />
              <p className="text-amber-400 text-xs font-medium">{datos.vendedor.puntoVenta ?? datos.vendedor.nombre}</p>
            </div>
            <h1 className="text-2xl font-black">Elige tu quiniela</h1>
            <p className="text-amber-300 text-sm mt-1">Hay {datos.jornadas.length} jornadas disponibles</p>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
          {datos.jornadas.map((j) => (
            <button key={j.id} onClick={() => seleccionarJornada(j)}
              className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 text-left hover:bg-amber-50 hover:shadow-md transition-all active:scale-95">
              <span className="text-3xl shrink-0">{LIGA_EMOJI[j.liga] ?? "⚽"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800">{j.liga}</p>
                <p className="text-sm text-gray-500">{j.nombre} · {j.temporada}</p>
                <p className="text-xs text-gray-400 mt-0.5">{j.partidos.length} partidos</p>
              </div>
              <span className="text-amber-500 text-xl shrink-0">›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const jornada = jornadaSeleccionada!;
  const { vendedor } = datos;

  /* ── Página principal ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Aviso límite dobles/triples */}
      {aviso && (
        <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="bg-orange-500 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg">
            ⚠️ {aviso}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-brand text-white px-4 pt-5 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "40px", objectFit: "contain" }} />
            <div className="text-right">
              <p className="text-amber-400 text-xs font-medium">{vendedor.puntoVenta ?? vendedor.nombre}</p>
              <p className="text-xs text-white/60">{jornada.liga} · {jornada.temporada}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black leading-tight">{jornada.nombre}</h1>
            {datos.jornadas.length > 1 && (
              <button onClick={() => { setJornadaSeleccionada(null); setFormas([[]]); setFormaActiva(0); }}
                className="text-xs text-amber-300 border border-amber-600 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-colors shrink-0 ml-3">
                ← Cambiar
              </button>
            )}
          </div>
          <p className="text-amber-300 text-sm mt-1">Elige tu resultado para cada partido</p>

          {/* Precio + controles +/- quinielas */}
          <div className="mt-4 bg-white/10 rounded-2xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">
                  {formas.length > 1 ? `Quiniela ${formaActiva + 1} de ${formas.length}` : "Tu quiniela"}
                </p>
                <p className="text-white text-sm">
                  {combos === 1
                    ? "1 combinación"
                    : <><span className="font-bold text-amber-200">{combos}</span> combinaciones</>}
                  {combos > 1 && (
                    <span className="ml-2 text-xs text-amber-300/80">
                      ({doblesCount  > 0 && `${doblesCount}/3 doble${doblesCount  > 1 ? "s" : ""}`}
                      {doblesCount > 0 && triplesCount > 0 && ", "}
                      {triplesCount > 0 && `${triplesCount}/2 triple${triplesCount > 1 ? "s" : ""}`})
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-amber-300">${precioFormaActiva}</p>
                {formas.length > 1 && (
                  <p className="text-xs text-amber-400">Total: ${precioTotal}</p>
                )}
              </div>
            </div>

            {/* Controles de quinielas */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <p className="text-xs text-amber-300/80">Número de quinielas</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={quitarForma}
                  disabled={formas.length <= 1}
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-lg flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  −
                </button>
                <span className="text-white font-black text-lg w-6 text-center">{formas.length}</span>
                <button
                  onClick={agregarForma}
                  disabled={formas.length >= MAX_FORMAS}
                  className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-lg flex items-center justify-center disabled:opacity-30 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partidos */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-2.5 pb-40">

        {/* Tabs de formas — solo si hay más de una */}
        {formas.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {formas.map((f, i) => {
              const completa = f.length > 0 && f.every((s) => s.length > 0);
              return (
                <button
                  key={i}
                  onClick={() => setFormaActiva(i)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                    i === formaActiva
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white text-gray-500 hover:bg-amber-50"
                  }`}
                >
                  Q{i + 1}
                  {completa
                    ? <span className="text-[10px]">✓</span>
                    : <span className="text-[10px] opacity-60">○</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
            <p className="text-sm font-bold text-amber-800">📋 ¿Cómo funciona?</p>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            {[
              { n: "1", icon: "⚽", text: "Elige el resultado de cada partido: **L** (gana local), **E** (empate) o **V** (gana visitante)." },
              { n: "2", icon: "2️⃣", text: "¿No estás seguro? Toca **2 opciones** en un partido para jugar un **doble** (+$20)." },
              { n: "3", icon: "3️⃣", text: "Toca las **3 opciones** para cubrir todos los resultados con un **triple** (+$40)." },
              { n: "4", icon: "👤", text: "Escribe tu **nombre completo** y **teléfono** para recibir tu ticket." },
              { n: "5", icon: "✅", text: "Toca **Enviar picks** y muéstrale la confirmación al vendedor para pagar." },
            ].map(({ n, icon, text }) => (
              <div key={n} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                <p className="text-sm text-gray-600 leading-snug">
                  {icon}{" "}
                  {text.split("**").map((part, i) =>
                    i % 2 === 1 ? <strong key={i} className="text-gray-800">{part}</strong> : part
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Botón rellenar al azar */}
        <div className="flex items-center justify-between px-1 pt-1">
          <p className="text-xs text-gray-400">
            {todosSeleccionadosActiva
              ? `${picks.filter((s) => s.length > 1).length > 0 ? "Con dobles/triples ✓" : "Todos seleccionados ✓"}`
              : `${picks.filter((s) => s.length > 0).length} de ${picks.length} partidos`}
          </p>
          <button
            onClick={() => setFormas((prev) => {
              const next = prev.map((f) => [...f.map((s) => [...s])]);
              next[formaActiva] = rellenarAzar(next[formaActiva]);
              return next;
            })}
            className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
          >
            🎲 Rellenar al azar
          </button>
        </div>

        {jornada.partidos.map((p, idx) => {
          const sel = picks[idx] ?? [];
          return (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm p-4 transition-all ${
              sel.length === 2 ? "border-2 border-purple-300" :
              sel.length === 3 ? "border-2 border-rose-300" :
              "border-2 border-transparent"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-400 flex items-center justify-center shrink-0">{idx + 1}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <LogoEquipo equipo={p.equipoLocal} logoMap={logoMap} size={28} />
                  <span className="font-semibold text-gray-800 text-sm truncate flex-1">{p.equipoLocal}</span>
                  <span className="text-gray-300 text-xs shrink-0">vs</span>
                  <span className="font-semibold text-gray-800 text-sm truncate flex-1 text-right">{p.equipoVisita}</span>
                  <LogoEquipo equipo={p.equipoVisita} logoMap={logoMap} size={28} />
                </div>
                {badgeCombo(sel.length)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {OPCIONES.map((op) => {
                  const activo = sel.includes(op);
                  return (
                    <button key={op} onClick={() => togglePick(idx, op)}
                      className={`py-3 rounded-xl font-black text-base border-2 transition-all duration-100 ${activo ? OPCION_STYLES[op].active : IDLE}`}>
                      {op}
                      <span className={`block text-[9px] font-normal mt-0.5 ${activo ? "opacity-80" : "text-gray-400"}`}>
                        {OPCION_STYLES[op].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Datos del cliente */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3 mt-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tus datos para el ticket</p>
          <div className="relative">
            <label className="text-xs text-gray-500 block mb-1">Nombre completo</label>
            <input type="text" value={nombre}
              onChange={(e) => { setNombre(toTitleCase(e.target.value)); setMostrarSugerencias(true); }}
              onFocus={() => setMostrarSugerencias(true)}
              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
              placeholder="Nombre Apellido"
              autoCapitalize="off"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {mostrarSugerencias && sugerencias.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {sugerencias.map((s, i) => (
                  <button key={i} type="button"
                    onMouseDown={() => {
                      setNombre(s.nombre);
                      setTelefono(s.telefono);
                      setSugerencias([]);
                      setMostrarSugerencias(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-50 text-left border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-800">{s.nombre}</span>
                    <span className="text-xs text-gray-400 font-mono">{s.telefono}</span>
                  </button>
                ))}
              </div>
            )}
            {nombre.length > 2 && !nombreValido && (
              <p className="text-xs text-orange-400 mt-1">Ingresa nombre y al menos un apellido</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Teléfono (10 dígitos)</label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 shrink-0">+52</span>
              <input type="tel" value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="5512345678"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
            {telefono.length === 10 && telefonoFalso(telefono) && (
              <p className="text-xs text-red-500 mt-1">Ingresa un número de teléfono real</p>
            )}
          </div>
        </div>

        {errorEnvio && (
          <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-4 py-3">{errorEnvio}</p>
        )}
      </div>

      {/* Barra fija inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-2xl px-4 py-3 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
              {formas.length > 1 ? (
                <span>{formas.length} quinielas</span>
              ) : (
                <span>{combos === 1 ? "Quiniela sencilla" : `${combos} combinaciones`}</span>
              )}
              {doblesCount > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  {doblesCount}/3 doble{doblesCount > 1 ? "s" : ""}
                </span>
              )}
              {triplesCount > 0 && (
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                  {triplesCount}/2 triple{triplesCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <span className="text-xl font-black text-amber-600">${precioTotal}</span>
          </div>

          <button
            onClick={handleEnviar}
            disabled={!puedeEnviar || enviando}
            className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
              puedeEnviar && !enviando
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg active:scale-95"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {enviando
              ? "Enviando..."
              : !todasFormasCompletas
              ? formasIncompletas > 1
                ? `Faltan picks en ${formasIncompletas} quinielas`
                : `Faltan ${faltanPicks} partido${faltanPicks !== 1 ? "s" : ""}`
              : !nombreValido
              ? "Ingresa tu nombre completo"
              : !telValido
              ? "Ingresa tu teléfono"
              : formas.length > 1
              ? `Enviar ${formas.length} quinielas · $${precioTotal} ⚽`
              : `Enviar picks · $${precioTotal} ⚽`}
          </button>
        </div>
      </div>
    </div>
  );
}
