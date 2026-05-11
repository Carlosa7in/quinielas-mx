"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogoEquipo } from "@/components/LogoEquipo";
import { JornadaSelector, type JornadaResumen } from "@/components/JornadaSelector";
import { RegistroCerrado } from "@/components/RegistroCerrado";
import { calcularFechaCierre } from "@/lib/fechas";

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

// picks por forma: partidoId → opciones seleccionadas []
type FormaPicks = Record<string, string[]>;

const OPCIONES = ["1", "X", "2"] as const;
const LABELS: Record<string, string> = { "1": "L", X: "E", "2": "V" };

const toTitleCase = (str: string) =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());

const nombreCompleto = (str: string) => str.trim().split(/\s+/).length >= 2;

function rellenarAzar(partidos: Partido[], picks: FormaPicks): FormaPicks {
  const next = { ...picks };
  for (const p of partidos) {
    // Solo rellena los que están vacíos — respeta lo que ya marcó el usuario
    if (!next[p.id] || next[p.id].length === 0) {
      next[p.id] = [OPCIONES[Math.floor(Math.random() * 3)]];
    }
  }
  return next;
}

function combosDeForma(partidos: Partido[], picks: FormaPicks): number {
  return partidos.reduce((prod, p) => prod * (picks[p.id]?.length || 1), 1);
}

function formaCompleta(partidos: Partido[], picks: FormaPicks): boolean {
  return partidos.every((p) => (picks[p.id]?.length ?? 0) > 0);
}

export default function TiendaPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const usuarioId = (session?.user as { id?: string })?.id ?? null;
  const nombreUsuario = session?.user?.name ?? "";
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esAdmin = ["admin", "superadmin"].includes(rol);

  type Modo = "home" | "vender" | "selector" | "seleccion" | "manual";
  const [modo, setModo] = useState<Modo>("home");

  // Navegar entre modos registrando historial para que el botón atrás funcione
  const irA = (nuevoModo: Modo) => {
    history.pushState({ modo: nuevoModo }, "");
    setModo(nuevoModo);
  };

  // Retroceder en el estado cuando el navegador/teléfono pulsa atrás
  useEffect(() => {
    const handlePop = () => {
      setModo((prev) => {
        if (prev === "seleccion" || prev === "manual") { setJornada(null); return "selector"; }
        if (prev === "selector") return esAdmin ? "home" : "vender";
        if (prev === "vender") return "home";
        return "home";
      });
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAdmin]);

  const [jornada, setJornada] = useState<Jornada | null>(null);

  // Múltiples formas — cada una es un Record independiente
  const [formas, setFormas] = useState<FormaPicks[]>([{}]);
  const [formaActiva, setFormaActiva] = useState(0);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState<{ nombre: string } | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);

  /* ── Búsqueda de cliente por teléfono (debounced 500ms) ─────── */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const tel = telefono.replace(/\D/g, "");
    if (tel.length < 10) { setClienteEncontrado(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setBuscandoCliente(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/admin/cliente?telefono=${tel}`)
        .then((r) => r.json())
        .then((data) => {
          setClienteEncontrado(data.cliente ?? null);
          // Auto-rellenar nombre si el campo está vacío
          if (data.cliente && !nombre.trim()) setNombre(data.cliente.nombre);
        })
        .catch(() => setClienteEncontrado(null))
        .finally(() => setBuscandoCliente(false));
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefono]);

  /* ── Header compartido home/vender ──────────────────────────── */
  const headerPanel = (onBack?: () => void) => {
    const rolLabel: Record<string, string> = { tienda: "Tienda", vendedor: "Vendedor", admin: "Admin", superadmin: "Superadmin" };
    return (
      <div className="bg-brand text-white py-6 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button onClick={onBack} className="text-amber-400 text-sm mr-1">←</button>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "40px", objectFit: "contain" }} />
            <h1 className="text-2xl font-bold">{onBack ? "Vender" : "Mi Panel"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{nombreUsuario}</p>
              <p className="text-amber-400 text-xs capitalize">{rolLabel[rol] ?? rol}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-amber-300 hover:text-white text-sm border border-amber-800 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Pantalla de inicio ──────────────────────────────────────── */
  if (modo === "home") {
    return (
      <div className="min-h-screen bg-gray-50">
        {headerPanel()}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">

          <button
            onClick={() => irA("vender")}
            className="w-full bg-amber-700 hover:bg-amber-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors text-left"
          >
            <span className="text-2xl">🏪</span>
            <div className="flex-1">
              <p className="font-bold">Vender</p>
              <p className="text-amber-300/70 text-sm">Registro en tienda, imprimir formas y mi link</p>
            </div>
            <span className="text-amber-400 text-lg">›</span>
          </button>

          <a
            href="/admin/ganancias"
            className="bg-green-700 hover:bg-green-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors flex"
          >
            <span className="text-2xl">💰</span>
            <div className="flex-1">
              <p className="font-bold">Mis Ganancias</p>
              <p className="text-green-200 text-sm">Comisiones y ventas por jornada</p>
            </div>
            <span className="text-green-400 text-lg">›</span>
          </a>

          <a
            href="/admin/apostadores"
            className="bg-teal-700 hover:bg-teal-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors flex"
          >
            <span className="text-2xl">👥</span>
            <div className="flex-1">
              <p className="font-bold">Apostadores</p>
              <p className="text-teal-200 text-sm">Historial de clientes registrados</p>
            </div>
            <span className="text-teal-400 text-lg">›</span>
          </a>

          <a
            href="/admin/mi-perfil"
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl p-4 flex items-center gap-3 transition-colors flex"
          >
            <span className="text-2xl">👤</span>
            <div className="flex-1">
              <p className="font-bold">Mi Perfil</p>
              <p className="text-gray-500 text-sm">Editar datos y cambiar contraseña</p>
            </div>
            <span className="text-gray-400 text-lg">›</span>
          </a>

        </div>
      </div>
    );
  }

  /* ── Sub-pantalla Vender ─────────────────────────────────────── */
  if (modo === "vender") {
    return (
      <div className="min-h-screen bg-gray-50">
        {headerPanel(() => setModo("home"))}
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">

          <button
            onClick={() => irA("selector")}
            className="w-full bg-amber-700 hover:bg-amber-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors text-left"
          >
            <span className="text-2xl">🏪</span>
            <div className="flex-1">
              <p className="font-bold">Registro en Tienda</p>
              <p className="text-amber-300/70 text-sm">Registrar quiniela presencial e imprimir ticket</p>
            </div>
            <span className="text-amber-400 text-lg">›</span>
          </button>

          <a
            href="/admin/mi-link"
            className="bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl p-4 flex items-center gap-3 transition-colors flex"
          >
            <span className="text-2xl">🔗</span>
            <div className="flex-1">
              <p className="font-bold">Mi Link de Ventas</p>
              <p className="text-cyan-200 text-sm">Comparte tu link y ve tus referidos online</p>
            </div>
            <span className="text-cyan-400 text-lg">›</span>
          </a>

        </div>
      </div>
    );
  }

  /* ── Jornada selector ─────────────────────────────────────────── */
  const seleccionarJornada = async (j: JornadaResumen) => {
    const res = await fetch(`/api/jornadas?id=${j.id}`);
    const data = await res.json();
    if (!data.error) {
      setJornada(data);
      irA("seleccion");
    }
  };

  if (modo === "selector") {
    return (
      <JornadaSelector
        onSelect={seleccionarJornada}
        titulo="Registrar Quiniela"
        backLabel={esAdmin ? "Admin" : "Volver"}
        backHref={esAdmin ? "/admin" : undefined}
        onBack={esAdmin ? undefined : () => setModo("vender")}
        soloActivas={true}
        onSignOut={() => signOut({ callbackUrl: esAdmin ? "/login" : "/" })}
      />
    );
  }

  // Bloquear si el registro está cerrado
  const fechaCierreObj = jornada
    ? (() => {
        const fechas = jornada.partidos
          .map((p) => p.fechaHora ? new Date(p.fechaHora) : null)
          .filter((d): d is Date => d !== null && !isNaN(d.getTime()));
        if (fechas.length === 0) return null;
        const primera = new Date(Math.min(...fechas.map((d) => d.getTime())));
        return calcularFechaCierre(primera);
      })()
    : null;
  const registroCerrado = !esAdmin && (fechaCierreObj ? new Date() >= fechaCierreObj : false);

  if (registroCerrado && fechaCierreObj && jornada) {
    return (
      <RegistroCerrado
        jornada={jornada}
        fechaCierre={fechaCierreObj}
        onBack={() => { setJornada(null); setModo("selector"); setFormas([{}]); }}
        onReabrir={(jornadaActualizada) => { setJornada(jornadaActualizada as unknown as Jornada); irA("seleccion"); }}
      />
    );
  }

  /* ── Modo selección (manual vs escanear vs imprimir) ────────── */
  if (modo === "seleccion") {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-brand text-white py-4 px-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div>
              <button onClick={() => { setJornada(null); setModo("selector"); }} className="text-amber-400 text-sm">← Registrar Quiniela</button>
              <h1 className="text-xl font-bold mt-1">Registrar Quiniela</h1>
              {jornada && (
                <p className="text-amber-400 text-xs">
                  {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
                </p>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: esAdmin ? "/login" : "/" })}
              className="text-amber-300 hover:text-white text-sm border border-amber-800 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
          <p className="text-gray-500 text-sm text-center mb-2">
            ¿Cómo deseas registrar la quiniela del cliente?
          </p>

          <button
            onClick={() => irA("manual")}
            className="w-full bg-white border-2 border-amber-600 hover:bg-amber-50 rounded-2xl p-6 flex items-center gap-4 transition-colors text-left"
          >
            <span className="text-4xl">✏️</span>
            <div>
              <p className="font-bold text-gray-800 text-lg">a) Capturar picks</p>
              <p className="text-gray-500 text-sm">
                El empleado selecciona manualmente los pronósticos del cliente en pantalla
              </p>
            </div>
          </button>

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

          <Link
            href={jornada ? `/admin/forma/${jornada.id}` : "/admin/forma"}
            className="w-full bg-white border-2 border-gray-300 hover:bg-gray-50 rounded-2xl p-6 flex items-center gap-4 transition-colors text-left block"
          >
            <span className="text-4xl">🖨️</span>
            <div>
              <p className="font-bold text-gray-800 text-lg">c) Imprimir formas</p>
              <p className="text-gray-500 text-sm">
                Imprime la forma en blanco o con picks aleatorios para que el cliente la llene
              </p>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  /* ── Helpers sobre formas ────────────────────────────────────── */
  const partidos = jornada?.partidos ?? [];

  const agregarForma = () => {
    if (formas.length >= 20) return;
    setFormas((prev) => [...prev, {}]);
    setFormaActiva(formas.length); // nueva pestaña activa
  };

  const quitarForma = () => {
    if (formas.length <= 1) return;
    setFormas((prev) => prev.slice(0, -1));
    setFormaActiva((prev) => Math.min(prev, formas.length - 2));
  };

  const togglePick = (formaIdx: number, partidoId: string, opcion: string) => {
    setFormas((prev) => {
      const next = [...prev];
      const current = next[formaIdx][partidoId] ?? [];
      const newSel = current.includes(opcion)
        ? current.filter((o) => o !== opcion)
        : [...current, opcion];
      if (newSel.length === 0) {
        const { [partidoId]: _, ...rest } = next[formaIdx];
        next[formaIdx] = rest;
      } else {
        next[formaIdx] = { ...next[formaIdx], [partidoId]: newSel };
      }
      return next;
    });
  };

  const rellenarForma = (idx: number) => {
    if (!jornada) return;
    setFormas((prev) => {
      const next = [...prev];
      next[idx] = rellenarAzar(partidos, next[idx]);
      return next;
    });
  };

  const rellenarTodas = () => {
    if (!jornada) return;
    setFormas((prev) => prev.map((f) => rellenarAzar(partidos, f)));
  };

  const limpiarForma = (idx: number) => {
    setFormas((prev) => {
      const next = [...prev];
      next[idx] = {};
      return next;
    });
  };

  // Totales
  const combosTotal = formas.reduce((sum, f) => sum + combosDeForma(partidos, f), 0);
  const totalPagar = combosTotal * 20;
  const todasCompletas = formas.every((f) => formaCompleta(partidos, f));

  const picks = formas[formaActiva] ?? {};
  const completaActiva = formaCompleta(partidos, picks);
  const combosActiva = combosDeForma(partidos, picks);

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todasCompletas || !nombreCompleto(nombre)) return;
    setEnviando(true);
    setError("");

    const foliosTodos: string[] = [];

    for (const formaPicks of formas) {
      const picksArr = Object.entries(formaPicks).map(([partidoId, predicciones]) => ({
        partidoId,
        predicciones,
      }));

      const res = await fetch("/api/quinielas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jornadaId: jornada!.id,
          picks: picksArr,
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
      foliosTodos.push(...(data.folios ?? [data.folio]));
    }

    sessionStorage.setItem("lastRegistro", JSON.stringify({
      folios: foliosTodos,
      formas: formas.length,
    }));
    router.push(`/ticket/${foliosTodos[0]}?imprimir=1&total=${foliosTodos.length}&formas=${formas.length}`);
  };

  /* ── Render manual ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => setModo("seleccion")} className="text-amber-400 text-sm">
              ← Formas
            </button>
            <h1 className="text-xl font-bold">
              {jornada?.nombre ?? (jornada ? `Jornada ${jornada.numero}` : "Tienda")}
            </h1>
            {jornada && (
              <p className="text-amber-400 text-xs">{jornada.liga} · {jornada.temporada}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-yellow-300 font-bold text-xl">${totalPagar}</p>
              <p className="text-amber-400 text-xs">
                {formas.length} quiniela{formas.length !== 1 ? "s" : ""}
                {combosTotal > formas.length && (
                  <span className="ml-1 opacity-70">· {combosTotal} combos</span>
                )}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-amber-300 hover:text-white text-sm border border-amber-800 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── Barra de control de formas ── */}
        <div className="bg-white rounded-xl p-3 space-y-3">
          {/* Contador + botón rellenar todas */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Formas:</span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={quitarForma}
                disabled={formas.length <= 1}
                className="w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-lg disabled:opacity-30 hover:bg-red-200 transition-colors"
              >
                −
              </button>
              <span className="w-7 text-center font-bold text-gray-800 text-lg">
                {formas.length}
              </span>
              <button
                type="button"
                onClick={agregarForma}
                disabled={formas.length >= 20}
                className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-lg disabled:opacity-30 hover:bg-green-200 transition-colors"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={rellenarTodas}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            >
              🎲 Rellenar todas al azar
            </button>
          </div>

          {/* Pestañas cuando hay más de una forma */}
          {formas.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {formas.map((f, i) => {
                const completa = formaCompleta(partidos, f);
                const combos = combosDeForma(partidos, f);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFormaActiva(i)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      formaActiva === i
                        ? "bg-amber-700 text-white"
                        : completa
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    Forma {i + 1}
                    {completa && formaActiva !== i && (
                      <span className="ml-1 opacity-70">
                        {combos > 1 ? `×${combos}` : "✓"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Picks de la forma activa ── */}
        <div className="bg-white rounded-xl p-4">
          {/* Título forma + acciones */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">
              {formas.length > 1 ? `Forma ${formaActiva + 1}` : "Pronósticos"}
              <span className="ml-2 text-amber-600 font-normal text-sm">
                {Object.keys(picks).filter((k) => (picks[k]?.length ?? 0) > 0).length}/
                {partidos.length}
              </span>
              {combosActiva > 1 && (
                <span className="ml-2 text-xs font-bold text-orange-600">
                  {combosActiva} combos
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => rellenarForma(formaActiva)}
                className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                🎲 Azar
              </button>
              <button
                type="button"
                onClick={() => limpiarForma(formaActiva)}
                className="text-xs bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* Lista de partidos */}
          <div className="space-y-1.5">
            {partidos.map((partido) => {
              const sel = picks[partido.id] ?? [];
              const esDoble = sel.length === 2;
              const esTriple = sel.length === 3;

              return (
                <div
                  key={partido.id}
                  className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
                >
                  {/* Equipos */}
                  <div className="flex items-center gap-1.5 flex-1 text-xs min-w-0">
                    <LogoEquipo equipo={partido.equipoLocal} size={22} />
                    <span className="font-medium truncate">{partido.equipoLocal}</span>
                    <span className="text-gray-400 shrink-0 text-[10px]">vs</span>
                    <LogoEquipo equipo={partido.equipoVisita} size={22} />
                    <span className="font-medium truncate">{partido.equipoVisita}</span>
                    {esDoble && (
                      <span className="shrink-0 text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                        DOBLE
                      </span>
                    )}
                    {esTriple && (
                      <span className="shrink-0 text-[9px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                        TRIPLE
                      </span>
                    )}
                  </div>

                  {/* Botones L/E/V */}
                  <div className="flex gap-1 shrink-0">
                    {OPCIONES.map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => togglePick(formaActiva, partido.id, op)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                          sel.includes(op)
                            ? "bg-amber-700 text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {LABELS[op]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Precio de esta forma si tiene combos */}
          {combosActiva > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400">{combosActiva} combinaciones × $20</span>
              <span className="text-sm font-bold text-amber-700">${combosActiva * 20}</span>
            </div>
          )}
        </div>

        {/* ── Datos del cliente ── */}
        <div className="bg-white rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Datos del cliente</h2>
          <div>
            <input
              type="text"
              placeholder="Nombre y apellido *"
              value={nombre}
              onChange={(e) => setNombre(toTitleCase(e.target.value))}
              required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                nombre.trim().length > 0 && !nombreCompleto(nombre)
                  ? "border-red-300"
                  : "border-gray-200"
              }`}
            />
            {nombre.trim().length > 0 && !nombreCompleto(nombre) && (
              <p className="text-xs text-red-500 mt-1 px-1">Ingresa nombre y apellido</p>
            )}
          </div>
          <div>
            <input
              type="tel"
              placeholder="Teléfono (10 dígitos, opcional)"
              value={telefono}
              onChange={(e) => { setTelefono(e.target.value); setClienteEncontrado(null); }}
              maxLength={10}
              inputMode="numeric"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                telefono.replace(/\D/g, "").length > 0 && telefono.replace(/\D/g, "").length < 10
                  ? "border-red-300"
                  : clienteEncontrado && clienteEncontrado.nombre.toLowerCase() !== nombre.trim().toLowerCase()
                  ? "border-yellow-400"
                  : clienteEncontrado
                  ? "border-green-400"
                  : "border-gray-200"
              }`}
            />
            {telefono.replace(/\D/g, "").length > 0 && telefono.replace(/\D/g, "").length < 10 && (
              <p className="text-xs text-red-500 mt-1.5 px-1">El teléfono debe tener 10 dígitos</p>
            )}
            {buscandoCliente && telefono.replace(/\D/g, "").length === 10 && (
              <p className="text-xs text-gray-400 mt-1.5 px-1">Buscando...</p>
            )}
            {!buscandoCliente && clienteEncontrado && (
              clienteEncontrado.nombre.toLowerCase() === nombre.trim().toLowerCase() ? (
                <p className="text-xs text-green-600 mt-1.5 px-1 font-medium">
                  ✓ Cliente reconocido: <span className="font-bold">{clienteEncontrado.nombre}</span>
                </p>
              ) : (
                <div className="mt-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-yellow-800 font-medium">
                    📱 Este número ya está registrado como <span className="font-bold">{clienteEncontrado.nombre}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setNombre(clienteEncontrado.nombre)}
                    className="text-xs text-yellow-700 underline mt-0.5"
                  >
                    Usar ese nombre
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>
        )}

        {/* ── Botón registrar ── */}
        <button
          type="submit"
          disabled={!todasCompletas || !nombreCompleto(nombre) || enviando}
          className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-lg"
        >
          {enviando
            ? "Registrando..."
            : todasCompletas
            ? `Registrar ${formas.length} quiniela${formas.length !== 1 ? "s" : ""} · $${totalPagar}`
            : `Faltan picks en ${formas.filter((f) => !formaCompleta(partidos, f)).length} forma${formas.filter((f) => !formaCompleta(partidos, f)).length !== 1 ? "s" : ""}`}
        </button>
      </form>
    </div>
  );
}
