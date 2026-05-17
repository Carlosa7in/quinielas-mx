"use client";
import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

type Estado = "loading" | "activando" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

export function PushButton({ className = "" }: { className?: string }) {
  const [estado, setEstado] = useState<Estado>("loading");
  const [confirmDesactivar, setConfirmDesactivar] = useState(false);

  useEffect(() => {
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
      const res = await fetch("/api/push/subscribe", {
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
    setConfirmDesactivar(false);
  }

  if (estado === "loading")      return <span className="w-20 h-5 bg-gray-700 rounded animate-pulse" />;
  if (estado === "unsupported")  return null;
  if (estado === "activando") {
    return (
      <div className={`flex items-center gap-1.5 text-amber-400 text-xs ${className}`}>
        <Loader2 size={13} className="animate-spin" />
        <span>Activando...</span>
      </div>
    );
  }

  if (estado === "denied") {
    return (
      <div className={`flex items-center gap-1.5 text-gray-500 text-xs ${className}`}>
        <BellOff size={13} />
        <span>Bloqueadas en ajustes</span>
      </div>
    );
  }

  if (estado === "subscribed") {
    // Requiere doble click para desactivar (evita desactivación accidental)
    if (confirmDesactivar) {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          <span className="text-gray-400 text-xs">¿Desactivar?</span>
          <button onClick={desactivar} className="text-red-400 text-xs font-bold hover:text-red-300">Sí</button>
          <button onClick={() => setConfirmDesactivar(false)} className="text-gray-500 text-xs hover:text-gray-300">No</button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setConfirmDesactivar(true)}
        className={`flex items-center gap-1.5 text-green-400 text-xs font-semibold ${className}`}
      >
        <BellRing size={13} />
        <span>Activas ✓</span>
      </button>
    );
  }

  return (
    <button
      onClick={activar}
      className={`flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${className}`}
    >
      <Bell size={13} />
      <span>Activar</span>
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
