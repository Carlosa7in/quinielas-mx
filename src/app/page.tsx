"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LIGA_ICON } from "@/lib/equipos";
import { useLocale } from "@/hooks/useLocale";
import { translations, type HomeT } from "@/lib/i18n";
import { LocaleToggle } from "@/components/LocaleToggle";

type JornadaBolsaItem = {
  id: string;
  nombre: string | null;
  numero: number;
  liga: string;
  ligasDetalle: string[];
  totalQuinielas: number;
  recaudado: number;
  bolsa: number;
  primerPartidoFecha: string | null;
};

function useCuentaRegresiva(fechaISO: string | null) {
  const calcular = () => {
    if (!fechaISO) return null;
    const diff = new Date(fechaISO).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, diff: 0 };
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, diff };
  };
  const [restante, setRestante] = useState(calcular);
  useEffect(() => {
    const t = setInterval(() => setRestante(calcular()), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaISO]);
  return restante;
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function JornadaCard({ jornada, t }: { jornada: JornadaBolsaItem; t: HomeT }) {
  const cuenta = useCuentaRegresiva(jornada.primerPartidoFecha);
  const cerrado = cuenta !== null && cuenta.diff === 0;
  const ligaIcon = LIGA_ICON[jornada.liga] ?? "⚽";
  const titulo = jornada.nombre ?? `Jornada ${jornada.numero}`;

  const sufijo =
    jornada.liga === "Mixta" && jornada.ligasDetalle.length > 0
      ? " · " + jornada.ligasDetalle.join(" · ")
      : "";

  return (
    <div
      className="rounded-2xl py-5 px-4 text-center space-y-3"
      style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Liga + nombre */}
      <p className="text-amber-300/70 text-xs font-bold tracking-widest uppercase">
        {ligaIcon} {jornada.liga} · {titulo}{sufijo}
      </p>

      {/* Bolsa */}
      <div>
        <p className="text-amber-300/50 text-[10px] font-bold tracking-widest uppercase mb-0.5">
          {t.bolsa}
        </p>
        <span
          className="font-black"
          style={{ fontSize: "clamp(2rem, 10vw, 2.8rem)", color: "#FFD166", letterSpacing: "0.04em" }}
        >
          ${fmt(jornada.bolsa)}
        </span>
        <p className="text-amber-200/30 text-xs mt-0.5">
          {jornada.totalQuinielas}{" "}
          {jornada.totalQuinielas !== 1 ? t.quinielasOther : t.quinielasOne}
        </p>
      </div>

      {/* Fecha de cierre */}
      {jornada.primerPartidoFecha && (
        <div className="pt-2 border-t border-white/10">
          {cerrado ? (
            <p className="text-red-400 text-sm font-bold">{t.cerrado}</p>
          ) : (
            <div className="space-y-1">
              <p className="text-amber-200 font-bold text-sm tracking-wide">
                {t.cierre}{" "}
                {new Date(jornada.primerPartidoFecha).toLocaleDateString(t.bcp47, {
                  weekday: "long", timeZone: "America/Mexico_City",
                }).toUpperCase()}{" "}
                {new Date(jornada.primerPartidoFecha).toLocaleTimeString(t.bcp47, {
                  hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
                })}
              </p>
              {cuenta && cuenta.diff > 0 && cuenta.diff < 24 * 3_600_000 && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-amber-300/60 text-xs">{t.faltan}</span>
                  <span className="font-black tabular-nums text-yellow-300" style={{ fontSize: "1.1rem", letterSpacing: "0.05em" }}>
                    {pad(cuenta.h)}:{pad(cuenta.m)}:{pad(cuenta.s)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botón registrar */}
      {!cerrado && (
        <Link
          href={`/quiniela?jornada=${jornada.id}`}
          className="block w-full bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold text-base py-3 px-6 rounded-xl transition-colors shadow-lg shadow-amber-900/40 mt-1"
        >
          {t.registrar}
        </Link>
      )}
    </div>
  );
}

function BolsaSection({ t }: { t: HomeT }) {
  const [jornadas, setJornadas] = useState<JornadaBolsaItem[] | null>(null);

  useEffect(() => {
    fetch("/api/bolsa")
      .then((r) => r.json())
      .then((d) => setJornadas(d.jornadas ?? []))
      .catch(() => setJornadas([]));
  }, []);

  if (jornadas === null) {
    return (
      <div
        className="rounded-2xl py-8 px-4 text-center animate-pulse"
        style={{ background: "rgba(0,0,0,0.2)" }}
      >
        <p className="text-amber-300/30 text-2xl font-bold tracking-widest">$—</p>
      </div>
    );
  }

  if (jornadas.length === 0) {
    return (
      <div
        className="rounded-2xl py-6 px-4 text-center"
        style={{ background: "rgba(0,0,0,0.2)" }}
      >
        <p className="text-amber-200/40 text-sm">{t.sinJornadas}</p>
        <p className="text-amber-200/25 text-xs mt-1">{t.vuelve}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jornadas.map((j) => (
        <JornadaCard key={j.id} jornada={j} t={t} />
      ))}
    </div>
  );
}

function ResultadosRecientes({ t }: { t: HomeT }) {
  const [jornada, setJornada] = useState<{ id: string; nombre: string | null; numero: number; liga: string } | null>(null);

  useEffect(() => {
    fetch("/api/jornadas/todas")
      .then((r) => r.json())
      .then((data: { id: string; nombre: string | null; numero: number; liga: string; estado: string }[]) => {
        if (!Array.isArray(data)) return;
        const finalizada = data.find((j) => j.estado === "finalizada");
        if (finalizada) setJornada(finalizada);
      })
      .catch(() => {});
  }, []);

  if (!jornada) return null;

  const nombre = jornada.nombre ?? `Jornada ${jornada.numero}`;

  return (
    <a
      href={`/resultados/${jornada.id}`}
      className="block w-full bg-white/8 hover:bg-white/15 rounded-xl p-4 text-left transition-colors"
    >
      <p className="text-xs text-amber-400 font-semibold mb-0.5">{t.resultadosRecientes}</p>
      <p className="text-white font-bold">{nombre}</p>
      <p className="text-stone-400 text-sm mt-0.5">{t.resultadosCta}</p>
    </a>
  );
}

type PendienteItem = { folio: string; jornadaId?: string; nombre: string; monto: number; jornada: string; ts: number; totalBoletos?: number; montoTotal?: number };

function BannerPagosPendientes({ t }: { t: HomeT }) {
  const [pendientes, setPendientes] = useState<PendienteItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("quinielasPendientes");
      if (!raw) return;
      const items: PendienteItem[] = JSON.parse(raw);
      const recientes = items.filter((i) => Date.now() - i.ts < 72 * 3_600_000);
      if (recientes.length === 0) { localStorage.removeItem("quinielasPendientes"); return; }
      Promise.all(
        recientes.map((i) =>
          fetch(`/api/quinielas?folio=${i.folio}`)
            .then((r) => r.json())
            .then((d) => ({ folio: i.folio, estadoPago: d.estadoPago ?? "pendiente", item: i }))
            .catch(() => ({ folio: i.folio, estadoPago: "pendiente", item: i }))
        )
      ).then((resultados) => {
        const aun_pendientes = resultados.filter((r) => r.estadoPago === "pendiente").map((r) => r.item);
        if (aun_pendientes.length < recientes.length) {
          localStorage.setItem("quinielasPendientes", JSON.stringify(aun_pendientes));
        }
        setPendientes(aun_pendientes);
      });
    } catch { /* sin localStorage */ }
  }, []);

  if (pendientes.length === 0) return null;

  return (
    <div className="bg-amber-400/20 border border-amber-400/50 rounded-2xl p-4 text-left space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">⏳</span>
        <div>
          {pendientes[0]?.nombre && (
            <p className="text-amber-300 font-bold text-sm">
              {t.hola(pendientes[0].nombre.split(" ")[0])}
            </p>
          )}
          <p className="font-bold text-amber-200 text-sm">
            {pendientes.length === 1
              ? t.pagoPendiente
              : t.pagosPendientes(pendientes.length)}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {pendientes.map((p) => {
          const boletos = p.totalBoletos ?? 1;
          const monto = p.montoTotal ?? p.monto;
          const params = new URLSearchParams({ total: String(boletos), formas: String(boletos), montoTotal: String(monto) });
          const cancelar = (e: React.MouseEvent) => {
            e.preventDefault();
            const nuevos = pendientes.filter((x) => x.folio !== p.folio);
            setPendientes(nuevos);
            try {
              if (nuevos.length === 0) localStorage.removeItem("quinielasPendientes");
              else localStorage.setItem("quinielasPendientes", JSON.stringify(nuevos));
            } catch { /* sin localStorage */ }
          };
          return (
            <div key={p.folio} className="flex items-center gap-2">
              <a
                href={`/ticket/${p.folio}?${params.toString()}`}
                className="flex-1 flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2.5 transition-colors"
              >
                <div>
                  <p className="text-white font-semibold text-sm font-mono">{p.folio}</p>
                  <p className="text-amber-300/70 text-xs">
                    {p.jornada}{boletos > 1 ? ` · ${boletos} boletos · $${monto.toFixed(2)}` : ""}
                  </p>
                </div>
                <span className="text-amber-300 text-sm font-bold">{t.verInstrucciones}</span>
              </a>
              <button
                onClick={cancelar}
                title="Cancelar compra"
                className="shrink-0 bg-white/10 hover:bg-red-500/40 text-white/50 hover:text-white rounded-xl px-2.5 py-2.5 transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-amber-300/50 text-xs">{t.completaPago}</p>
    </div>
  );
}

export default function Home() {
  const [locale, setLocale] = useLocale();
  const t = translations[locale].home;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-brand text-white px-4">
      <div className="max-w-md w-full text-center space-y-6 pt-14 pb-10">
        {/* Logo + toggle idioma */}
        <div className="relative">
          <div className="absolute top-0 right-0">
            <LocaleToggle locale={locale} onChange={setLocale} dark />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" className="mx-auto mb-4" style={{ height: "130px", objectFit: "contain" }} />
          <p className="mt-2 text-amber-300/80 text-lg font-medium">{t.subtitle}</p>
        </div>

        <BannerPagosPendientes t={t} />

        <BolsaSection t={t} />

        <ResultadosRecientes t={t} />

        <div className="space-y-3">
          <Link
            href="/consultar"
            className="block w-full bg-white/8 hover:bg-white/15 text-stone-100 font-semibold text-lg py-4 px-6 rounded-xl transition-colors"
          >
            {t.consultar}
          </Link>
          <Link
            href="/clasificacion"
            className="block w-full bg-white/8 hover:bg-white/15 text-stone-200 font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
          >
            {t.clasificacion}
          </Link>
        </div>

        <div className="bg-white/5 rounded-xl p-4 text-sm text-stone-300 space-y-2">
          <div className="flex justify-between">
            <span>{t.costoLabel}</span>
            <span className="font-bold text-amber-400">{t.costoValor}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.aciertosLabel}</span>
            <span className="font-bold text-amber-400">{t.aciertosValor}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.modalidadLabel}</span>
            <span className="font-bold text-amber-400">{t.modalidadValor}</span>
          </div>
        </div>

        <p className="text-stone-500 text-xs">{t.tiendaNota}</p>

        <Link
          href="/reglamento"
          className="block text-amber-600 hover:text-amber-400 text-sm font-bold transition-colors"
        >
          {t.reglamento}
        </Link>

        <Link href="/admin" className="block text-stone-600 hover:text-stone-400 text-xs transition-colors">
          {t.admin}
        </Link>
      </div>
    </main>
  );
}
