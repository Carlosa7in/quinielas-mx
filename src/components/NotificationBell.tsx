"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type NotifItem = {
  tipo: string;
  texto: string;
  count: number;
  href: string;
};

type NotifData = {
  totalUrgentes: number;
  quinielasHoy: number;
  items: NotifItem[];
};

const TIPO_ICON: Record<string, string> = {
  kiosko:     "🏪",
  pago:       "💳",
  resultados: "⚽",
  premio:     "🏆",
  nuevo:      "🆕",
};

const POLL_INTERVAL = 60_000; // re-fetch cada 60 segundos

export default function NotificationBell({ float = false }: { float?: boolean }) {
  const [data, setData]       = useState<NotifData | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [visto, setVisto]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notificaciones");
      if (res.ok) {
        const d: NotifData = await res.json();
        setData(d);
        // Si llegan nuevas urgentes, resetear "visto"
        setVisto((prev) => {
          if (!prev) return false;
          return d.totalUrgentes === 0;
        });
      }
    } catch { /* silencioso */ }
  }, []);

  // Carga inicial + polling
  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifs]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const badge = data ? data.totalUrgentes : 0;
  const hayNuevo = badge > 0 && !visto;

  const handleOpen = () => {
    setAbierto((v) => !v);
    if (!abierto) setVisto(true);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
          padding: float ? "12px" : "6px",
          borderRadius: "50%",
          background: float
            ? (hayNuevo ? "#1e3a5f" : "#334155")
            : (abierto ? "rgba(255,255,255,0.15)" : "transparent"),
          border: "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: float ? "0 4px 16px rgba(0,0,0,.35)" : "none",
        }}
        title="Notificaciones"
      >
        <span style={{ fontSize: float ? 26 : 22, lineHeight: 1 }}>🔔</span>
        {hayNuevo && (
          <span style={{
            position: "absolute", top: float ? 6 : 2, right: float ? 6 : 2,
            background: "#ef4444", color: "#fff",
            fontSize: 10, fontWeight: 800,
            minWidth: 16, height: 16,
            borderRadius: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
            border: `2px solid ${float ? "#334155" : "#1e3a5f"}`,
          }}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {/* Dropdown — hacia arriba si es flotante, hacia abajo si es header */}
      {abierto && (
        <div style={{
          position: "absolute", right: 0,
          ...(float
            ? { bottom: "calc(100% + 8px)" }
            : { top: "calc(100% + 8px)" }),
          width: 300, background: "#fff",
          borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,.18)",
          border: "1px solid #e5e7eb",
          zIndex: 100, overflow: "hidden",
        }}>
          {/* Header dropdown */}
          <div style={{ background: "#1e3a5f", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>🔔 Notificaciones</span>
            {badge > 0 && (
              <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 999 }}>
                {badge} urgente{badge !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Items */}
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {!data || data.items.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                ✅ Todo al día, sin pendientes
              </div>
            ) : (
              data.items.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  onClick={() => setAbierto(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", background: (item.tipo === "nuevo") ? "#fff" : "#fffbeb" }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{TIPO_ICON[item.tipo] ?? "🔔"}</span>
                  <span style={{ color: "#111827", fontSize: 12, fontWeight: item.tipo !== "nuevo" ? 700 : 500, lineHeight: 1.4 }}>
                    {item.texto}
                  </span>
                  <span style={{ color: "#9ca3af", fontSize: 16, marginLeft: "auto", flexShrink: 0 }}>›</span>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "8px 14px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", textAlign: "center" }}>
            <button
              onClick={fetchNotifs}
              style={{ color: "#6b7280", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}
            >
              ↻ Actualizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
