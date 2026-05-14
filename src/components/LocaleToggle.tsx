"use client";
import type { Locale } from "@/lib/i18n";

export function LocaleToggle({
  locale,
  onChange,
  dark = false,
}: {
  locale: Locale;
  onChange: (l: Locale) => void;
  dark?: boolean;
}) {
  const base = dark
    ? "flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5"
    : "flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5";

  const active = dark
    ? "bg-white text-gray-800 shadow-sm"
    : "bg-white text-gray-800 shadow-sm border border-gray-200";

  const inactive = dark
    ? "text-white/50 hover:text-white"
    : "text-gray-400 hover:text-gray-600";

  return (
    <div className={base}>
      <button
        onClick={() => onChange("es")}
        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
          locale === "es" ? active : inactive
        }`}
      >
        🇲🇽 ES
      </button>
      <button
        onClick={() => onChange("en")}
        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
          locale === "en" ? active : inactive
        }`}
      >
        🇺🇸 EN
      </button>
    </div>
  );
}
