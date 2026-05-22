"use client";
import { useState, useEffect } from "react";
import { BellOff, Loader2 } from "lucide-react";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/** Detecta iPhone/iPad en Safari fuera de PWA (pantalla de inicio) */
function detectIosSafariNoPwa(): boolean {
  if (typeof window === "undefined") return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!isIos) return false;
  // navigator.standalone === true cuando está instalada como PWA
  const isPwa =
    (navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return !isPwa;
}

type Estado = "loading" | "activando" | "unsupported" | "ios-no-pwa" | "denied" | "subscribed" | "unsubscribed";

export function PushButton({ className = "", tipo = "cliente" }: { className?: string; tipo?: "cliente" | "admin" }) {
  const [estado, setEstado] = useState<Estado>("loading");
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    if (detectIosSafariNoPwa()) {
      setEstado("ios-no-pwa");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstado("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub ? "subscribed" : "unsubscribed");
    }).catch(() => setEstado("unsubscribed"));
  }, []);

  async function activar() {
    setEstado("activando");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEstado("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as ArrayBuffer,
      });
      const res = await fetch(`/api/push/subscribe?tipo=${tipo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Error al guardar suscripcion");
      setEstado("subscribed");
    } catch (err) {
      console.error("Error al activar notificaciones", err);
      setEstado("unsubscribed");
    }
  }

  async function desactivar() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } catch { /* ignorar */ }
    setEstado("unsubscribed");
  }

  function toggle() {
    if (estado === "subscribed") desactivar();
    else if (estado === "unsubscribed") activar();
  }

  // iOS Safari fuera de PWA — mostrar guía de instalación
  if (estado === "ios-no-pwa") {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIosGuide(v => !v)}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
            Activar notificaciones
          </span>
          <div className="relative w-9 h-5 rounded-full bg-gray-600 shrink-0">
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow" />
          </div>
        </button>

        {iosGuide && (
          <div className="absolute right-0 top-8 z-50 w-64 bg-gray-900 border border-white/10 rounded-2xl p-4 shadow-xl text-left">
            <p className="text-white text-sm font-bold mb-1">📲 Instala la app primero</p>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">
              En iPhone las notificaciones solo funcionan desde la app instalada.
            </p>
            <ol className="text-gray-300 text-xs space-y-1.5 list-none">
              <li>1. Toca el botón <span className="bg-gray-700 px-1.5 py-0.5 rounded font-mono">⬆</span> compartir en Safari</li>
              <li>2. Selecciona <span className="font-semibold">"Agregar a pantalla de inicio"</span></li>
              <li>3. Abre la app desde tu pantalla de inicio</li>
              <li>4. Activa las notificaciones aquí</li>
            </ol>
            <button
              onClick={() => setIosGuide(false)}
              className="mt-3 text-gray-500 text-xs hover:text-gray-300"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    );
  }

  if (estado === "unsupported") return null;

  const activo = estado === "subscribed";
  const cargando = estado === "loading" || estado === "activando";
  const bloqueado = estado === "denied";

  return (
    <button
      onClick={!cargando && !bloqueado ? toggle : undefined}
      disabled={cargando || bloqueado}
      title={bloqueado ? "Notificaciones bloqueadas en ajustes del navegador" : undefined}
      className={`flex items-center gap-2 select-none transition-opacity ${cargando || bloqueado ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {/* Label */}
      <span className={`text-xs font-medium whitespace-nowrap ${activo ? "text-green-400" : "text-gray-400"}`}>
        {bloqueado
          ? "Notificaciones bloqueadas"
          : activo
            ? "Notificaciones activas"
            : "Activar notificaciones"}
      </span>

      {/* Switch */}
      {cargando ? (
        <Loader2 size={13} className="animate-spin text-amber-400 shrink-0" />
      ) : bloqueado ? (
        <BellOff size={13} className="text-gray-500 shrink-0" />
      ) : (
        <div
          className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${activo ? "bg-green-500" : "bg-gray-600"}`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${activo ? "translate-x-[18px]" : "translate-x-0.5"}`}
          />
        </div>
      )}
    </button>
  );
}

// Hook para registrar el service worker en el layout
export function usePushSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch(err => console.warn("SW registration failed", err));
  }, []);
}
