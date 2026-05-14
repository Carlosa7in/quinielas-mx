"use client";
import { useState, useEffect } from "react";
import type { Locale } from "@/lib/i18n";

const STORAGE_KEY = "tq_locale";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "es";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "es" || saved === "en") return saved;
  } catch { /* sin localStorage */ }
  const lang = navigator.language ?? "es";
  return lang.startsWith("en") ? "en" : "es";
}

export function useLocale(): [Locale, (l: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* sin localStorage */ }
  };

  return [locale, setLocale];
}
