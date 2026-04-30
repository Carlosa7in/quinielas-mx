"use client";
import { useState, useEffect } from "react";
import { getLogoUrl } from "@/lib/equipos";

interface LogoEquipoProps {
  equipo: string;
  size?: number;
  className?: string;
}

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || nombre.slice(0, 2).toUpperCase();
}

function Fallback({ equipo, size, className }: LogoEquipoProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size, fontSize: (size ?? 28) * 0.35 }}
    >
      {iniciales(equipo)}
    </div>
  );
}

export function LogoEquipo({ equipo, size = 28, className = "" }: LogoEquipoProps) {
  const url = getLogoUrl(equipo);
  const [broken, setBroken] = useState(false);

  // Resetear cuando cambia el equipo
  useEffect(() => {
    setBroken(false);
  }, [equipo]);

  if (!url || broken) {
    return <Fallback equipo={equipo} size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={equipo}
      onError={() => setBroken(true)}
      className={`object-contain shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
