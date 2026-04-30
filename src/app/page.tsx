"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

function BolsaWidget() {
  const [bolsa, setBolsa] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/bolsa")
      .then((r) => r.json())
      .then((d) => setBolsa(d.bolsa ?? 0))
      .catch(() => setBolsa(null));
  }, []);

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #1a3a1a 0%, #0f2210 100%)", border: "1px solid #2d5a2d" }}>
      <div className="px-4 pt-3 pb-1 text-center">
        <p className="text-green-400 text-xs font-bold tracking-widest uppercase">💰 Bolsa acumulada 💰</p>
      </div>
      <div className="px-4 pb-4 text-center">
        {bolsa === null ? (
          <p className="text-green-300/50 text-2xl font-bold tracking-widest animate-pulse">$—</p>
        ) : (
          <p
            className="font-black tracking-wider"
            style={{
              fontSize: "clamp(1.6rem, 8vw, 2.4rem)",
              color: "#7dff7d",
              textShadow: "0 0 20px #00ff0060, 0 0 40px #00ff0030",
              letterSpacing: "0.05em",
            }}
          >
            ${fmt(bolsa)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#7A3A12] to-[#3A1A06] text-white px-4">
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
