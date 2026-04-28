"use client";
import { useState, useEffect } from "react";
import { getLogoUrl } from "@/lib/equipos";

interface LogoEquipoProps {
  equipo: string;
  size?: number;       // px
  className?: string;
}

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter((w) => w.length > 2) // ignorar "de", "FC", etc.
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || nombre.slice(0, 2).toUpperCase();
}

export function LogoEquipo({ equipo, size = 28, className = "" }: LogoEquipoProps) {
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    getLogoUrl(equipo).then(setUrl);
  }, [equipo]);

  // Fallback: círculo con iniciales
  if (!url || error) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-green-100 text-green-800 font-bold shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {iniciales(equipo)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={equipo}
      onError={() => setError(true)}
      className={`object-contain shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
