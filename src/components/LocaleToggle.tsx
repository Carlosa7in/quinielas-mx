"use client";
import type { Locale } from "@/lib/i18n";

const OPCIONES: { id: Locale; flag: string; label: string }[] = [
  { id: "es", flag: "🇲🇽", label: "ES" },
  { id: "en", flag: "🇺🇸", label: "EN" },
];

export function LocaleToggle({
  locale,
  onChange,
  dark = false,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
  dark?: boolean;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {OPCIONES.map((op) => {
        const activo = locale === op.id;
        return (
          <button
            key={op.id}
            onClick={() => onChange(op.id)}
            title={op.label}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              fontSize: 20,
              background: activo ? (dark ? "rgba(255,255,255,0.95)" : "#ffffff") : "rgba(255,255,255,0.25)",
              boxShadow: activo
                ? "0 0 0 2.5px #fbbf24, 0 4px 12px rgba(0,0,0,0.22)"
                : "0 2px 8px rgba(0,0,0,0.18)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: activo ? "scale(1.1)" : "scale(1)",
              transition: "all 0.15s ease",
              backdropFilter: "blur(6px)",
            }}
          >
            {op.flag}
          </button>
        );
      })}
    </div>
  );
}
