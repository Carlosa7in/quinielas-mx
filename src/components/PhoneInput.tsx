"use client";

// ── Países soportados ──────────────────────────────────────────────────────
export const PAISES_TEL = [
  { codigo: "52",  bandera: "🇲🇽", nombre: "México",          digitos: 10 },
  { codigo: "1",   bandera: "🇺🇸", nombre: "EE.UU.",           digitos: 10 },
  { codigo: "1",   bandera: "🇨🇦", nombre: "Canadá",           digitos: 10 },
  { codigo: "57",  bandera: "🇨🇴", nombre: "Colombia",         digitos: 10 },
  { codigo: "54",  bandera: "🇦🇷", nombre: "Argentina",        digitos: 10 },
  { codigo: "58",  bandera: "🇻🇪", nombre: "Venezuela",        digitos: 10 },
  { codigo: "56",  bandera: "🇨🇱", nombre: "Chile",            digitos: 9  },
  { codigo: "51",  bandera: "🇵🇪", nombre: "Perú",             digitos: 9  },
  { codigo: "502", bandera: "🇬🇹", nombre: "Guatemala",        digitos: 8  },
  { codigo: "503", bandera: "🇸🇻", nombre: "El Salvador",      digitos: 8  },
  { codigo: "504", bandera: "🇭🇳", nombre: "Honduras",         digitos: 8  },
  { codigo: "505", bandera: "🇳🇮", nombre: "Nicaragua",        digitos: 8  },
  { codigo: "506", bandera: "🇨🇷", nombre: "Costa Rica",       digitos: 8  },
  { codigo: "507", bandera: "🇵🇦", nombre: "Panamá",           digitos: 8  },
  { codigo: "34",  bandera: "🇪🇸", nombre: "España",           digitos: 9  },
] as const;

export type PaisTel = (typeof PAISES_TEL)[number];

// Dado un código, devuelve el primer país con ese código (default México)
export function paisPorCodigo(codigo: string): PaisTel {
  return PAISES_TEL.find(p => p.codigo === codigo) ?? PAISES_TEL[0];
}

// ── Helpers de número ──────────────────────────────────────────────────────

/** Construye el número completo (codigoPais + dígitos) para WhatsApp / DB */
export function telCompleto(codigo: string, numero: string): string {
  const limpio = numero.replace(/\D/g, "");
  if (!limpio) return "";
  return codigo + limpio;
}

/**
 * Separa un número guardado en DB en { codigo, numero }.
 * Intenta hacer match por longitud: código + dígitos esperados.
 * Si no coincide, asume México (+52, 10 dígitos).
 */
export function parsearTelefono(telGuardado: string): { codigo: string; numero: string } {
  const limpio = (telGuardado ?? "").replace(/\D/g, "");
  // Ordenar de más largo a más corto para evitar falsos positivos con "1"
  const ordenados = [...PAISES_TEL].sort((a, b) => b.codigo.length - a.codigo.length);
  for (const p of ordenados) {
    const total = p.codigo.length + p.digitos;
    if (limpio.length === total && limpio.startsWith(p.codigo)) {
      return { codigo: p.codigo, numero: limpio.slice(p.codigo.length) };
    }
  }
  // Fallback: 10 dígitos → México
  return { codigo: "52", numero: limpio.slice(0, 10) };
}

/**
 * Formatea un número guardado para mostrar al usuario.
 * "5213121234567" → "+52 312 123 4567"
 */
export function formatearTelefono(telGuardado: string): string {
  if (!telGuardado) return "";
  const { codigo, numero } = parsearTelefono(telGuardado);
  return `+${codigo} ${numero}`;
}

// ── Componente ─────────────────────────────────────────────────────────────

interface PhoneInputProps {
  /** Código de país sin "+", p.ej. "52" */
  codigo: string;
  /** Dígitos locales sin código de país */
  numero: string;
  onCodigo: (c: string) => void;
  onNumero: (n: string) => void;
  /** "default" = selects con bordes separados (registro público)
   *  "fused"   = un solo contenedor con borde (kiosko / admin) */
  variant?: "default" | "fused";
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export function PhoneInput({
  codigo,
  numero,
  onCodigo,
  onNumero,
  variant = "default",
  className = "",
  inputClassName = "",
  placeholder,
}: PhoneInputProps) {
  const pais = paisPorCodigo(codigo);
  const ph = placeholder ?? `${pais.digitos} dígitos`;

  const selectOpts = PAISES_TEL.map((p, i) => (
    <option key={`${p.codigo}-${i}`} value={p.codigo}>
      {p.bandera} +{p.codigo}
    </option>
  ));

  const handleNumero = (v: string) => {
    let limpio = v.replace(/\D/g, "");
    // El autocompletado del navegador a veces incluye el código de país
    // (ej: "5231212345677" en lugar de "3121234567").
    // Si la longitud es exactamente código + dígitos locales y empieza
    // con el código, lo quitamos.
    if (
      limpio.length === pais.codigo.length + pais.digitos &&
      limpio.startsWith(pais.codigo)
    ) {
      limpio = limpio.slice(pais.codigo.length);
    }
    onNumero(limpio.slice(0, pais.digitos));
  };

  if (variant === "fused") {
    // If className contains a border-color override, skip the default border-gray-200
    const hasBorderColor = /border-(?!gray-200)[a-z]/.test(className);
    return (
      <div
        className={`flex items-center border ${hasBorderColor ? "" : "border-gray-200"} rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-amber-500 ${className}`}
      >
        <select
          value={codigo}
          onChange={(e) => { onCodigo(e.target.value); onNumero(""); }}
          className="px-2 py-2.5 bg-gray-50 text-gray-600 text-sm border-r border-gray-200 shrink-0 focus:outline-none"
        >
          {selectOpts}
        </select>
        <input
          type="tel"
          value={numero}
          onChange={(e) => handleNumero(e.target.value)}
          placeholder={ph}
          maxLength={pais.digitos}
          inputMode="numeric"
          className={`flex-1 px-3 py-2.5 text-sm focus:outline-none ${inputClassName}`}
        />
      </div>
    );
  }

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <select
        value={codigo}
        onChange={(e) => { onCodigo(e.target.value); onNumero(""); }}
        className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white shrink-0"
      >
        {selectOpts}
      </select>
      <input
        type="tel"
        value={numero}
        onChange={(e) => handleNumero(e.target.value)}
        placeholder={ph}
        maxLength={pais.digitos}
        inputMode="numeric"
        className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${inputClassName}`}
      />
    </div>
  );
}
