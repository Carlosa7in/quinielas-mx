"use client";
import { useEffect } from "react";

export function SwRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(err => console.warn("SW no registrado:", err));
    }
  }, []);
  return null;
}
