"use client";
import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

type Estado = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

export function PushButton({ className = "" }: { className?: string }) {
  const [estado, setEstado] = useState<Estado>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstado("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("denied");
      return;
    }
    // Verificar si ya hay suscripcion activa
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub ? "subscribed" : "unsubscribed");
    });
  }, []);

  async function activar() {
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
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setEstado("subscribed");
    } catch (err) {
      console.error("Error al activar notificaciones", err);
    }
  }

  async function desactivar() {
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
    setEstado("unsubscribed");
  }

  if (estado === "loading") return null;
  if (estado === "unsupported") return null;

  if (estado === "denied") {
    return (
      <div className={`flex items-center gap-1.5 text-gray-500 text-xs ${className}`}>
        <BellOff size={13} />
        <span>Notificaciones bloqueadas</span>
      </div>
    );
  }

  if (estado === "subscribed") {
    return (
      <button
        onClick={desactivar}
        className={`flex items-center gap-1.5 text-green-400 text-xs font-semibold hover:text-red-400 transition-colors ${className}`}
        title="Toca para desactivar"
      >
        <BellRing size={13} className="animate-bounce" />
        <span>Notificaciones activas</span>
      </button>
    );
  }

  return (
    <button
      onClick={activar}
      className={`flex items-center gap-1.5 text-amber-400 text-xs font-semibold hover:text-amber-300 transition-colors ${className}`}
    >
      <Bell size={13} />
      <span>Activar notificaciones</span>
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
