"use client";
import { useState, useEffect, use } from "react";

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
  const url = buscarLogo(logoMap, equipo);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [equipo]);
  if (!url || broken) return <Iniciales nombre={equipo} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={equipo} width={size} height={size} onError={() => setBroken(true)}
    style={{ width: size, height: size, objectFit: "contain" }} className="shrink-0" />;
}

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

// picks[i] = array de opciones seleccionadas para el partido i
// ej. [] = sin selección, ["L"] = simple, ["L","E"] = doble, ["L","E","V"] = triple
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

export default function KioskoPage({ params }: { params: Promise<{ vendedorId: string }> }) {
  const { vendedorId } = use(params);

  const [datos, setDatos] = useState<KioskoData | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [picks, setPicks] = useState<Picks>([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/kiosko?vendedorId=${vendedorId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErrorCarga(d.error); return; }
        setDatos(d);
        setPicks(new Array(d.jornada.partidos.length).fill(null).map(() => []));
        // Cargar logos de la liga
        fetch(`/api/logos?liga=${encodeURIComponent(d.jornada.liga)}`)
          .then((r) => r.json())
          .then((m) => typeof m === "object" && setLogoMap(m))
          .catch(() => {});
      })
      .catch(() => setErrorCarga("No se pudo cargar la jornada"));
  }, [vendedorId]);

  const togglePick = (idx: number, opcion: string) => {
    setPicks((prev) => {
      const next = prev.map((s) => [...s]);
      const sel = next[idx];
      const i = sel.indexOf(opcion);
      if (i >= 0) sel.splice(i, 1);
      else sel.push(opcion);
      return next;
    });
  };

  const todosSeleccionados = picks.length > 0 && picks.every((s) => s.length > 0);
  const nombreValido = nombre.trim().split(/\s+/).length >= 2;
  const telValido = telefono.replace(/\D/g, "").length === 10;
  const puedeEnviar = todosSeleccionados && nombreValido && telValido;

  const combos = combosTotal(picks);
  const precio = combos * PRECIO_BASE;

  const handleEnviar = async () => {
    if (!puedeEnviar || !datos) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      const res = await fetch("/api/kiosko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendedorId,
          jornadaId: datos.jornada.id,
          nombre: nombre.trim(),
          telefono: telefono.replace(/\D/g, ""),
          picks,                   // [["L"], ["L","E"], ["V"], ...]
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      setEnviado(true);
    } catch (e: unknown) {
      setErrorEnvio(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setEnviando(false);
    }
  };

  const reiniciar = () => {
    setEnviado(false);
    setPicks(new Array(datos?.jornada.partidos.length ?? 0).fill(null).map(() => []));
    setNombre("");
    setTelefono("");
    setErrorEnvio("");
  };

  /* ── Pantalla de confirmación ────────────────────────────────────────────── */
  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-600 to-amber-800 flex flex-col items-center justify-center px-6 text-center text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "56px", objectFit: "contain" }} className="mb-6 opacity-90" />
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-black mb-2">¡Picks enviados!</h1>
        <p className="text-amber-100 text-lg mb-1">Tu quiniela está lista.</p>
        <p className="text-amber-200 text-sm mb-8">
          Acércate al vendedor para confirmar y pagar <strong className="text-white">${precio}</strong>.
        </p>
        <button
          onClick={reiniciar}
          className="bg-white text-amber-800 font-bold px-8 py-3 rounded-2xl shadow-lg hover:bg-amber-50 transition-colors"
        >
          Nueva quiniela
        </button>
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
  if (!datos) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "44px", objectFit: "contain" }} />
        <p className="text-gray-400 text-sm animate-pulse">Cargando jornada...</p>
      </div>
    );
  }

  const { jornada, vendedor } = datos;
  const faltanPicks = picks.filter((s) => s.length === 0).length;

  /* ── Página principal ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">

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
          <h1 className="text-2xl font-black leading-tight">{jornada.nombre}</h1>
          <p className="text-amber-300 text-sm mt-1">Elige tu resultado para cada partido</p>

          {/* Precio en vivo */}
          <div className="mt-4 bg-white/10 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">Tu quiniela</p>
              <p className="text-white text-sm">
                {combos === 1
                  ? "1 combinación"
                  : <><span className="font-bold text-amber-200">{combos}</span> combinaciones</>}
                {combos > 1 && (
                  <span className="ml-2 text-xs text-amber-300/80">
                    ({picks.filter((s) => s.length === 2).length > 0 && `${picks.filter((s) => s.length === 2).length} doble${picks.filter((s) => s.length === 2).length > 1 ? "s" : ""}`}
                    {picks.filter((s) => s.length === 2).length > 0 && picks.filter((s) => s.length === 3).length > 0 && ", "}
                    {picks.filter((s) => s.length === 3).length > 0 && `${picks.filter((s) => s.length === 3).length} triple${picks.filter((s) => s.length === 3).length > 1 ? "s" : ""}`})
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-amber-300">${precio}</p>
              <p className="text-xs text-white/50">${PRECIO_BASE} × {combos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Partidos */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-2.5 pb-40">

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
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {n}
                </span>
                <p className="text-sm text-gray-600 leading-snug">
                  {icon}{" "}
                  {text.split("**").map((part, i) =>
                    i % 2 === 1
                      ? <strong key={i} className="text-gray-800">{part}</strong>
                      : part
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {jornada.partidos.map((p, idx) => {
          const sel = picks[idx] ?? [];
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl shadow-sm p-4 transition-all ${
                sel.length === 0 ? "border-2 border-transparent" :
                sel.length === 2 ? "border-2 border-purple-300" :
                sel.length === 3 ? "border-2 border-rose-300" :
                "border-2 border-transparent"
              }`}
            >
              {/* Número + equipos + logos */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 bg-gray-100 rounded-full text-[10px] font-bold text-gray-400 flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <LogoEquipo equipo={p.equipoLocal} logoMap={logoMap} size={28} />
                  <span className="font-semibold text-gray-800 text-sm truncate flex-1">{p.equipoLocal}</span>
                  <span className="text-gray-300 text-xs shrink-0">vs</span>
                  <span className="font-semibold text-gray-800 text-sm truncate flex-1 text-right">{p.equipoVisita}</span>
                  <LogoEquipo equipo={p.equipoVisita} logoMap={logoMap} size={28} />
                </div>
                {badgeCombo(sel.length)}
              </div>

              {/* Botones L / E / V */}
              <div className="grid grid-cols-3 gap-2">
                {OPCIONES.map((op) => {
                  const activo = sel.includes(op);
                  return (
                    <button
                      key={op}
                      onClick={() => togglePick(idx, op)}
                      className={`py-3 rounded-xl font-black text-base border-2 transition-all duration-100 ${
                        activo ? OPCION_STYLES[op].active : IDLE
                      }`}
                    >
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
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre Apellido"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {nombre.length > 2 && !nombreValido && (
              <p className="text-xs text-orange-400 mt-1">Ingresa nombre y apellido</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Teléfono (10 dígitos)</label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
              <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 shrink-0">+52</span>
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

        {errorEnvio && (
          <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-4 py-3">{errorEnvio}</p>
        )}
      </div>

      {/* Barra fija inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-2xl px-4 py-3 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto space-y-2">
          {/* Resumen precio */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{combos === 1 ? "Quiniela sencilla" : `${combos} combinaciones`}</span>
              {picks.filter((s) => s.length === 2).length > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  {picks.filter((s) => s.length === 2).length} doble{picks.filter((s) => s.length === 2).length > 1 ? "s" : ""}
                </span>
              )}
              {picks.filter((s) => s.length === 3).length > 0 && (
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                  {picks.filter((s) => s.length === 3).length} triple{picks.filter((s) => s.length === 3).length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <span className="text-xl font-black text-amber-600">${precio}</span>
          </div>

          {/* Botón */}
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
              : !todosSeleccionados
              ? `Faltan ${faltanPicks} partido${faltanPicks !== 1 ? "s" : ""}`
              : !nombreValido
              ? "Ingresa tu nombre completo"
              : !telValido
              ? "Ingresa tu teléfono"
              : `Enviar picks · $${precio} ⚽`}
          </button>
        </div>
      </div>
    </div>
  );
}
