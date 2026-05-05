"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type JornadaBolsa = {
  id: string; nombre: string | null; numero: number; liga: string; bolsa: number;
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

function BolsaWidget() {
  const [bolsa, setBolsa]       = useState<number | null>(null);
  const [jornadas, setJornadas] = useState<JornadaBolsa[]>([]);
  const [primerPartidoFecha, setPrimerPartidoFecha] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bolsa")
      .then((r) => r.json())
      .then((d) => {
        setBolsa(d.bolsa ?? 0);
        setJornadas(d.jornadas ?? []);
        setPrimerPartidoFecha(d.primerPartidoFecha ?? null);
      })
      .catch(() => setBolsa(null));
  }, []);

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cuenta = useCuentaRegresiva(primerPartidoFecha);
  const cerrado = cuenta !== null && cuenta.diff === 0;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="rounded-2xl py-4 px-4 text-center" style={{ background: "rgba(0,0,0,0.2)" }}>
      <p className="text-amber-300/60 text-xs font-bold tracking-widest uppercase mb-2">💰 Bolsa acumulada 💰</p>

      <div>
        {bolsa === null ? (
          <p className="text-amber-200/30 text-2xl font-bold tracking-widest animate-pulse">$—</p>
        ) : (
          <span
            className="bolsa-numero font-black"
            style={{ fontSize: "clamp(1.8rem, 9vw, 2.6rem)", color: "#FFD166", letterSpacing: "0.04em" }}
          >
            ${fmt(bolsa)}
          </span>
        )}

        {/* Desglose si hay más de una jornada activa */}
        {jornadas.length > 1 && (
          <div className="mt-2 space-y-0.5">
            {jornadas.map((j) => (
              <p key={j.id} className="text-xs text-amber-200/50">
                {j.liga} · {j.nombre ?? `Jornada ${j.numero}`}
                <span className="text-amber-300/70 font-semibold ml-1">${fmt(j.bolsa)}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Fecha de cierre */}
      {primerPartidoFecha && (
        <div className="mt-3 pt-3 border-t border-white/10">
          {cerrado ? (
            <p className="text-red-400 text-sm font-bold text-center">🔒 Registro cerrado</p>
          ) : (
            <div className="text-center space-y-1">
              <p className="text-amber-200 font-bold text-sm tracking-wide">
                📅 Cierre{" "}
                {new Date(primerPartidoFecha).toLocaleDateString("es-MX", {
                  weekday: "long", timeZone: "America/Mexico_City",
                }).toUpperCase()}{" "}
                {new Date(primerPartidoFecha).toLocaleTimeString("es-MX", {
                  hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
                })}
              </p>
              {cuenta && cuenta.diff < 24 * 3_600_000 && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-amber-300/60 text-xs">⚡ Faltan</span>
                  <span className="font-black tabular-nums text-yellow-300" style={{ fontSize: "1.1rem", letterSpacing: "0.05em" }}>
                    {pad(cuenta.h)}:{pad(cuenta.m)}:{pad(cuenta.s)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-brand text-white px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" className="mx-auto mb-4" style={{ height: "130px", objectFit: "contain" }} />
          <p className="mt-2 text-amber-300/80 text-lg font-medium">Registra tus Quinielas</p>
        </div>

        <BolsaWidget />

        <div className="space-y-4">
          <Link
            href="/quiniela"
            className="block w-full bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold text-lg py-4 px-6 rounded-xl transition-colors shadow-lg shadow-amber-900/40"
          >
            Registrar mi Quiniela
          </Link>
          <Link
            href="/consultar"
            className="block w-full bg-white/8 hover:bg-white/15 text-stone-100 font-semibold text-lg py-4 px-6 rounded-xl transition-colors"
          >
            Consultar Quiniela
          </Link>
          <Link
            href="/clasificacion"
            className="block w-full bg-white/8 hover:bg-white/15 text-stone-200 font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
          >
            📊 Clasificación
          </Link>
        </div>

        <div className="bg-white/5 rounded-xl p-4 text-sm text-stone-300 space-y-2">
          <div className="flex justify-between">
            <span>Costo por quiniela:</span>
            <span className="font-bold text-amber-400">$20 MXN</span>
          </div>
          <div className="flex justify-between">
            <span>Aciertos para ganar:</span>
            <span className="font-bold text-amber-400">9 de 9</span>
          </div>
          <div className="flex justify-between">
            <span>Modalidad:</span>
            <span className="font-bold text-amber-400">En línea / Tienda</span>
          </div>
        </div>

        <p className="text-stone-500 text-xs">
          También puedes registrarte directamente en tienda y te damos tu ticket impreso.
        </p>

        <Link
          href="/reglamento"
          className="block text-amber-600 hover:text-amber-400 text-sm font-bold transition-colors"
        >
          📜 Ver reglamento
        </Link>

        <Link href="/admin" className="block text-stone-600 hover:text-stone-400 text-xs transition-colors">
          Acceso Administrador
        </Link>
      </div>
    </main>
  );
}
