"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Gasto = {
  id: string;
  concepto: string;
  categoria: string;
  monto: number;
  moneda: "MXN" | "USD";
  recurrencia: "unico" | "mensual" | "anual";
  fechaPago: string;
  fechaVence: string | null;
  notas: string | null;
};

type FormState = Omit<Gasto, "id"> & { id?: string };

// ── Catálogos ─────────────────────────────────────────────────────────────────
const CATEGORIAS: { value: string; label: string; icon: string }[] = [
  { value: "infraestructura", label: "Infraestructura",  icon: "🖥️"  },
  { value: "marketing",       label: "Marketing",        icon: "📣"  },
  { value: "api",             label: "APIs / Servicios", icon: "🔌"  },
  { value: "comunicacion",    label: "Comunicación",     icon: "💬"  },
  { value: "otro",            label: "Otro",             icon: "📦"  },
];

const RECURRENCIA_LABEL: Record<string, string> = {
  unico: "Pago único", mensual: "Mensual", anual: "Anual",
};

const CAT_COLOR: Record<string, string> = {
  infraestructura: "bg-blue-100 text-blue-700",
  marketing:       "bg-pink-100 text-pink-700",
  api:             "bg-purple-100 text-purple-700",
  comunicacion:    "bg-green-100 text-green-700",
  otro:            "bg-gray-100 text-gray-600",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number, dec = 2) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });

function toMXN(g: Gasto, tc: number) {
  return g.moneda === "USD" ? g.monto * tc : g.monto;
}

/** Costo mensual equivalente en MXN */
function mensualMXN(g: Gasto, tc: number) {
  const base = toMXN(g, tc);
  if (g.recurrencia === "mensual") return base;
  if (g.recurrencia === "anual")   return base / 12;
  return 0; // único no cuenta como recurrente
}

function diasHastaVence(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function isoDate(iso: string) {
  return iso.slice(0, 10);
}

// ── Sugerencias de gastos comunes ─────────────────────────────────────────────
const SUGERENCIAS: Omit<FormState, "id">[] = [
  { concepto: "Dominio tablitasquinielas.mx", categoria: "infraestructura", monto: 12,     moneda: "USD", recurrencia: "anual",   fechaPago: new Date().toISOString().slice(0,10), fechaVence: null, notas: "Comprado en Namecheap" },
  { concepto: "Netlify Pro",                  categoria: "infraestructura", monto: 19,     moneda: "USD", recurrencia: "mensual", fechaPago: new Date().toISOString().slice(0,10), fechaVence: null, notas: null },
  { concepto: "API-Football Starter",         categoria: "api",             monto: 10,     moneda: "USD", recurrencia: "mensual", fechaPago: new Date().toISOString().slice(0,10), fechaVence: null, notas: "500 req/día" },
  { concepto: "WhatsApp Business API",        categoria: "comunicacion",    monto: 0,      moneda: "USD", recurrencia: "mensual", fechaPago: new Date().toISOString().slice(0,10), fechaVence: null, notas: "Cobro por mensaje aprox $0.01 USD" },
  { concepto: "Facebook Ads",                 categoria: "marketing",       monto: 500,    moneda: "MXN", recurrencia: "mensual", fechaPago: new Date().toISOString().slice(0,10), fechaVence: null, notas: "Presupuesto estimado" },
];

const FORM_VACIO: FormState = {
  concepto: "", categoria: "infraestructura", monto: 0, moneda: "USD",
  recurrencia: "mensual", fechaPago: new Date().toISOString().slice(0, 10),
  fechaVence: null, notas: null,
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GastosPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esSuperadmin = rol === "superadmin";

  const [gastos, setGastos]               = useState<Gasto[]>([]);
  const [ingresosMes, setIngresosMes]     = useState(0);
  const [cargando, setCargando]           = useState(true);
  const [tc, setTc]                       = useState(17.5);          // tipo de cambio USD → MXN
  const [filtro, setFiltro]               = useState("todos");
  const [form, setForm]                   = useState<FormState | null>(null);
  const [guardando, setGuardando]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    fetch("/api/admin/gastos")
      .then((r) => r.json())
      .then((d) => {
        setGastos(d.gastos ?? []);
        setIngresosMes(d.ingresosMes ?? 0);
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Métricas ───────────────────────────────────────────────────────────────
  const costoMensualMXN = gastos.reduce((s, g) => s + mensualMXN(g, tc), 0);
  const margenMes       = ingresosMes - costoMensualMXN;
  const alertas         = gastos.filter((g) => {
    const d = diasHastaVence(g.fechaVence);
    return d !== null && d <= 30 && d >= 0;
  });

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form || !form.concepto) return;
    setGuardando(true);
    try {
      const method = form.id ? "PATCH" : "POST";
      await fetch("/api/admin/gastos", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monto: Number(form.monto),
          fechaVence: form.fechaVence || null,
        }),
      });
      setForm(null);
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: string) => {
    await fetch("/api/admin/gastos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmDelete(null);
    cargar();
  };

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const gastosFiltrados = filtro === "todos" ? gastos : gastos.filter((g) => g.categoria === filtro);

  if (!esSuperadmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Solo superadmin puede ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-amber-400 text-sm">← Admin</Link>
            <h1 className="text-xl font-bold mt-1">💸 Gastos & Costos</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/"><img src="/logo-tablitas.png" alt="Tablitas" style={{ height: 44, objectFit: "contain" }} /></a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── Tipo de cambio ── */}
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm">
          <span className="text-xs text-gray-500">💱 USD =</span>
          <input
            type="number"
            value={tc}
            onChange={(e) => setTc(Number(e.target.value))}
            className="w-20 text-sm font-bold border-b border-gray-200 focus:outline-none focus:border-amber-400 text-center"
            step="0.1"
          />
          <span className="text-xs text-gray-500">MXN</span>
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-xs text-gray-400">Ajusta según el tipo de cambio actual</span>
        </div>

        {/* ── Alertas de vencimiento ── */}
        {alertas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-amber-700">⚠️ Próximos a vencer</p>
            {alertas.map((g) => {
              const d = diasHastaVence(g.fechaVence)!;
              return (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-800 font-medium">{g.concepto}</span>
                  <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${d <= 7 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                    {d === 0 ? "¡Hoy!" : `${d} día${d !== 1 ? "s" : ""}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Resumen ROI ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-lg font-black text-red-600">${fmt(costoMensualMXN, 0)}</p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Gasto mensual MXN</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className="text-lg font-black text-green-600">${fmt(ingresosMes, 0)}</p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Ingresos este mes</p>
          </div>
          <div className={`rounded-xl p-3 text-center shadow-sm ${margenMes >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className={`text-lg font-black ${margenMes >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {margenMes >= 0 ? "+" : ""}${fmt(margenMes, 0)}
            </p>
            <p className="text-[10px] text-gray-400 leading-tight mt-0.5">Margen neto</p>
          </div>
        </div>

        {/* ── Desglose por categoría ── */}
        {gastos.length > 0 && (
          <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold tracking-widest text-stone-400 uppercase">Desglose mensual por categoría</p>
            {CATEGORIAS.map((cat) => {
              const total = gastos
                .filter((g) => g.categoria === cat.value)
                .reduce((s, g) => s + mensualMXN(g, tc), 0);
              if (total === 0) return null;
              return (
                <div key={cat.value} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{cat.icon} {cat.label}</span>
                  <span className="font-bold text-white">${fmt(total, 0)} <span className="text-stone-500 text-xs">MXN/mes</span></span>
                </div>
              );
            })}
            <div className="border-t border-stone-700 pt-2 flex justify-between">
              <span className="text-stone-300 font-bold text-sm">Total</span>
              <span className="font-black text-amber-400">${fmt(costoMensualMXN, 0)} MXN/mes</span>
            </div>
          </div>
        )}

        {/* ── Filtros + botón agregar ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[{ value: "todos", label: "Todos", icon: "📋" }, ...CATEGORIAS].map((c) => (
            <button
              key={c.value}
              onClick={() => setFiltro(c.value)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                filtro === c.value
                  ? "bg-brand text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
          <button
            onClick={() => setForm({ ...FORM_VACIO, fechaPago: new Date().toISOString().slice(0, 10) })}
            className="shrink-0 ml-auto text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-1.5 rounded-full transition-colors whitespace-nowrap"
          >
            + Agregar
          </button>
        </div>

        {/* ── Sugerencias ── */}
        {gastos.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-bold text-blue-700">💡 Gastos comunes para este proyecto</p>
            <p className="text-xs text-blue-500">Toca uno para agregar rápido:</p>
            <div className="space-y-2">
              {SUGERENCIAS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setForm({ ...s, fechaPago: new Date().toISOString().slice(0, 10) })}
                  className="w-full text-left bg-white rounded-lg px-3 py-2.5 border border-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">{s.concepto}</span>
                    <span className="text-xs font-bold text-blue-600">
                      {s.monto > 0 ? `$${s.monto} ${s.moneda}/${s.recurrencia === "mensual" ? "mes" : s.recurrencia === "anual" ? "año" : "único"}` : "Por uso"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Lista de gastos ── */}
        {cargando ? (
          <div className="text-center py-8 text-gray-400">Cargando...</div>
        ) : gastosFiltrados.length === 0 && gastos.length > 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">No hay gastos en esta categoría</div>
        ) : gastos.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            <p className="text-3xl mb-2">💸</p>
            <p>Sin gastos registrados todavía</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gastosFiltrados.map((g) => {
              const cat = CATEGORIAS.find((c) => c.value === g.categoria);
              const dias = diasHastaVence(g.fechaVence);
              const mxn = toMXN(g, tc);
              const mensual = mensualMXN(g, tc);
              return (
                <div key={g.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 leading-tight">{g.concepto}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[g.categoria] ?? "bg-gray-100 text-gray-500"}`}>
                          {cat?.icon} {cat?.label ?? g.categoria}
                        </span>
                        <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                          {RECURRENCIA_LABEL[g.recurrencia]}
                        </span>
                        {dias !== null && (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            dias <= 7 ? "bg-red-100 text-red-600" :
                            dias <= 30 ? "bg-amber-100 text-amber-600" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {dias <= 0 ? "¡Vencido!" : `Vence en ${dias}d`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-gray-800">
                        ${fmt(g.monto, g.monto % 1 === 0 ? 0 : 2)} {g.moneda}
                      </p>
                      {g.moneda === "USD" && (
                        <p className="text-xs text-gray-400">${fmt(mxn, 0)} MXN</p>
                      )}
                      {g.recurrencia === "anual" && (
                        <p className="text-[10px] text-gray-400">${fmt(mensual, 0)}/mes</p>
                      )}
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>📅 Último pago: {fmtFecha(g.fechaPago)}</span>
                    {g.fechaVence && <span>⏰ Vence: {fmtFecha(g.fechaVence)}</span>}
                  </div>
                  {g.notas && (
                    <p className="text-xs text-gray-500 italic">{g.notas}</p>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setForm({ ...g, fechaPago: isoDate(g.fechaPago), fechaVence: g.fechaVence ? isoDate(g.fechaVence) : null })}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      ✏️ Editar
                    </button>
                    <span className="text-gray-200">·</span>
                    {confirmDelete === g.id ? (
                      <span className="text-xs flex items-center gap-1.5">
                        <span className="text-red-600 font-medium">¿Eliminar?</span>
                        <button onClick={() => eliminar(g.id)} className="text-red-600 font-bold hover:text-red-700">Sí</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-gray-400 hover:text-gray-600">No</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(g.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">
                        🗑️ Eliminar
                      </button>
                    )}
                    {/* Marcar renovado */}
                    {g.fechaVence && diasHastaVence(g.fechaVence) !== null && diasHastaVence(g.fechaVence)! <= 30 && (
                      <>
                        <span className="text-gray-200">·</span>
                        <button
                          onClick={() => {
                            const hoy = new Date().toISOString().slice(0, 10);
                            // Calcular próximo vencimiento
                            const actual = new Date(g.fechaVence!);
                            let proxVence: string | null = null;
                            if (g.recurrencia === "mensual") {
                              actual.setMonth(actual.getMonth() + 1);
                              proxVence = actual.toISOString().slice(0, 10);
                            } else if (g.recurrencia === "anual") {
                              actual.setFullYear(actual.getFullYear() + 1);
                              proxVence = actual.toISOString().slice(0, 10);
                            }
                            setForm({ ...g, fechaPago: hoy, fechaVence: proxVence, id: g.id });
                          }}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          ✅ Marcar renovado
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Mostrar sugerencias si ya hay gastos pero faltan algunos */}
            <button
              onClick={() => setMostrarSugerencias(!mostrarSugerencias)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors"
            >
              {mostrarSugerencias ? "▲ Ocultar sugerencias" : "💡 Ver sugerencias de gastos comunes"}
            </button>
            {mostrarSugerencias && (
              <div className="space-y-2">
                {SUGERENCIAS.filter((s) => !gastos.some((g) => g.concepto.toLowerCase().includes(s.concepto.toLowerCase().slice(0, 10)))).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setForm({ ...s, fechaPago: new Date().toISOString().slice(0, 10) })}
                    className="w-full text-left bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">{s.concepto}</span>
                      <span className="text-xs font-bold text-blue-600">
                        {s.monto > 0 ? `$${s.monto} ${s.moneda}` : "Por uso"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal / Form ─────────────────────────────────────────────────────── */}
      {form && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setForm(null); }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{form.id ? "Editar gasto" : "Nuevo gasto"}</h2>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Concepto */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Concepto *</label>
                <input
                  type="text"
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Ej. Dominio tablitasquinielas.mx"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>

              {/* Monto + moneda */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Monto *</label>
                  <input
                    type="number"
                    value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
                    min={0} step="0.01"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Moneda</label>
                  <select
                    value={form.moneda}
                    onChange={(e) => setForm({ ...form, moneda: e.target.value as "MXN" | "USD" })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="USD">🇺🇸 USD</option>
                    <option value="MXN">🇲🇽 MXN</option>
                  </select>
                </div>
              </div>

              {/* Equivalente en MXN */}
              {form.moneda === "USD" && form.monto > 0 && (
                <p className="text-xs text-gray-400 -mt-2">
                  ≈ ${fmt(form.monto * tc, 0)} MXN al tipo de cambio actual
                </p>
              )}

              {/* Recurrencia */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Recurrencia</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["unico", "mensual", "anual"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setForm({ ...form, recurrencia: r })}
                      className={`text-xs py-2 rounded-lg border font-medium transition-colors ${
                        form.recurrencia === r
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {RECURRENCIA_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Fecha de pago</label>
                  <input
                    type="date"
                    value={form.fechaPago}
                    onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {form.recurrencia !== "unico" && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Fecha de vencimiento</label>
                    <input
                      type="date"
                      value={form.fechaVence ?? ""}
                      onChange={(e) => setForm({ ...form, fechaVence: e.target.value || null })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Notas (opcional)</label>
                <textarea
                  value={form.notas ?? ""}
                  onChange={(e) => setForm({ ...form, notas: e.target.value || null })}
                  rows={2}
                  placeholder="Ej. Plan incluye 500 req/día"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setForm(null)}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !form.concepto}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                {guardando ? "Guardando..." : form.id ? "Actualizar" : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
