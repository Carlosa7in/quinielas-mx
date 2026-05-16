"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function LiveBadge() {
  const [hayEnVivo, setHayEnVivo] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/live")
      .then(r => r.json())
      .then((d: { hayEnVivo?: boolean }) => setHayEnVivo(d.hayEnVivo ?? false))
      .catch(() => setHayEnVivo(false));
  }, []);

  if (!hayEnVivo) return null;

  return (
    <Link
      href="/en-vivo"
      className="flex items-center justify-between bg-red-600/20 border border-red-500/40 rounded-2xl px-4 py-3 hover:bg-red-600/30 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
        <div>
          <p className="text-red-300 font-black text-sm leading-tight">Partidos EN VIVO ahora</p>
          <p className="text-red-400/60 text-xs">Toca para ver resultados en tiempo real</p>
        </div>
      </div>
      <span className="text-red-300 group-hover:translate-x-1 transition-transform text-lg">→</span>
    </Link>
  );
}
