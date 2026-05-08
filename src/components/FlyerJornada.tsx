"use client";
import { useState, useRef, useCallback } from "react";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  orden: number;
  fechaHoraStr?: string | null;
};

type FlyerProps = {
  jornadaId: string;
  jornadaNombre: string;
  liga: string;
  temporada: string;
  refCode: string;
};

const PRECIO = 20;

function truncar(texto: string, max: number) {
  return texto.length > max ? texto.slice(0, max - 1) + "…" : texto;
}

function dibujarFlyer(
  canvas: HTMLCanvasElement,
  partidos: Partido[],
  jornadaNombre: string,
  liga: string,
  refCode: string,
  origen: string
) {
  const W = 800;
  const HEADER_H = 110;
  const ROW_H = 54;
  const FOOTER_H = 90;
  const BRAND_H = 44;
  const H = HEADER_H + partidos.length * ROW_H + FOOTER_H + BRAND_H;

  // HiDPI
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // ── Fondo general ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0a1628");
  bg.addColorStop(1, "#0f2040");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Header ───────────────────────────────────────────────────────────
  const headerGrad = ctx.createLinearGradient(0, 0, W, 0);
  headerGrad.addColorStop(0, "#7c2d12");
  headerGrad.addColorStop(1, "#92400e");
  ctx.fillStyle = headerGrad;
  roundRect(ctx, 0, 0, W, HEADER_H, 0);

  // Icono pelota
  ctx.font = "bold 38px serif";
  ctx.textAlign = "center";
  ctx.fillText("⚽", 52, 52);

  // Título jornada
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(jornadaNombre.toUpperCase(), 90, 45);

  ctx.fillStyle = "#fcd34d";
  ctx.font = "500 18px Arial, sans-serif";
  ctx.fillText(liga + " · " + new Date().getFullYear(), 90, 72);

  // Badge "¡REGÍSTRATE!"
  ctx.fillStyle = "#fbbf24";
  roundRect(ctx, W - 180, 20, 160, 38, 8);
  ctx.fillStyle = "#7c2d12";
  ctx.font = "bold 15px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("¡REGÍSTRATE!", W - 100, 44);

  // ── Encabezado columnas ───────────────────────────────────────────────
  const colY = HEADER_H;
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(0, colY, W, 32);

  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("L", 44, colY + 21);
  ctx.fillText("LOCAL", W * 0.27, colY + 21);
  ctx.fillText("E", W * 0.5, colY + 21);
  ctx.fillText("VISITANTE", W * 0.73, colY + 21);
  ctx.fillText("V", W - 44, colY + 21);

  // ── Filas de partidos ─────────────────────────────────────────────────
  partidos.forEach((p, i) => {
    const y = HEADER_H + 32 + i * ROW_H;
    const par = i % 2 === 0;

    ctx.fillStyle = par ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)";
    ctx.fillRect(0, y, W, ROW_H);

    // Línea separadora
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(W - 20, y);
    ctx.stroke();

    const cy = y + ROW_H / 2 + 7;

    // Botones L / E / V
    const btnW = 34, btnH = 28;
    // L
    ctx.fillStyle = "#1d4ed8";
    roundRect(ctx, 14, y + (ROW_H - btnH) / 2, btnW, btnH, 6);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("L", 14 + btnW / 2, cy);

    // E
    ctx.fillStyle = "#374151";
    roundRect(ctx, W / 2 - btnW / 2, y + (ROW_H - btnH) / 2, btnW, btnH, 6);
    ctx.fillStyle = "#d1d5db";
    ctx.fillText("E", W / 2, cy);

    // V
    ctx.fillStyle = "#7c3aed";
    roundRect(ctx, W - 14 - btnW, y + (ROW_H - btnH) / 2, btnW, btnH, 6);
    ctx.fillStyle = "#fff";
    ctx.fillText("V", W - 14 - btnW / 2, cy);

    // Equipo local
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(truncar(p.equipoLocal.toUpperCase(), 14), W * 0.44, cy);

    // "vs"
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("vs", W * 0.5, cy);

    // Equipo visitante
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(truncar(p.equipoVisita.toUpperCase(), 14), W * 0.56, cy);
  });

  // ── Footer precio / cierre ────────────────────────────────────────────
  const footerY = HEADER_H + 32 + partidos.length * ROW_H;
  const footerGrad = ctx.createLinearGradient(0, footerY, 0, footerY + FOOTER_H);
  footerGrad.addColorStop(0, "#064e3b");
  footerGrad.addColorStop(1, "#065f46");
  ctx.fillStyle = footerGrad;
  ctx.fillRect(0, footerY, W, FOOTER_H);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PRECIO:", 30, footerY + 32);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.fillText(`$${PRECIO}`, 115, footerY + 34);

  ctx.fillStyle = "#6ee7b7";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("¡GANA PREMIOS EN EFECTIVO!", W - 30, footerY + 28);
  ctx.fillStyle = "#d1fae5";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText("Regístra tu quiniela en línea 👇", W - 30, footerY + 48);

  // ── Branding / link ───────────────────────────────────────────────────
  const brandY = footerY + FOOTER_H;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, brandY, W, BRAND_H);

  const linkTexto = `${origen}/quiniela?ref=${refCode}`;
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 16px Arial, monospace";
  ctx.textAlign = "center";
  ctx.fillText(linkTexto, W / 2, brandY + 28);
}

// Helper: rect con bordes redondeados
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

export function FlyerJornada({ jornadaId, jornadaNombre, liga, temporada, refCode }: FlyerProps) {
  const [estado, setEstado] = useState<"idle" | "cargando" | "listo">("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generar = useCallback(async () => {
    setEstado("cargando");
    try {
      const res = await fetch(`/api/jornadas?id=${jornadaId}`);
      const data = await res.json();
      const partidos: Partido[] = (data.partidos ?? []).sort((a: Partido, b: Partido) => a.orden - b.orden);

      const canvas = canvasRef.current!;
      const origen = window.location.origin;
      dibujarFlyer(canvas, partidos, jornadaNombre, liga, refCode, origen);

      canvas.toBlob((b) => {
        if (b) setBlob(b);
        setEstado("listo");
      }, "image/png");
    } catch {
      setEstado("idle");
    }
  }, [jornadaId, jornadaNombre, liga, refCode]);

  const descargar = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiniela-${jornadaNombre.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const compartir = async () => {
    if (!blob) return;
    const file = new File([blob], "quiniela-flyer.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Quinielas ${jornadaNombre}`,
          text: `🏆 ¡Ya están abiertas las quinielas! ⚽ ${liga} · ${jornadaNombre} — Solo $${PRECIO}. ¡Regístra la tuya!`,
        });
      } catch { /* cancelado */ }
    } else {
      descargar();
    }
  };

  return (
    <div className="space-y-2">
      {/* Canvas oculto para dibujar */}
      <canvas ref={canvasRef} className="hidden" />

      {estado === "idle" && (
        <button
          onClick={generar}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          🖼️ Generar flyer para compartir
        </button>
      )}

      {estado === "cargando" && (
        <div className="w-full bg-gray-100 text-gray-400 text-sm py-2.5 rounded-xl text-center">
          Generando flyer...
        </div>
      )}

      {estado === "listo" && blob && (
        <div className="space-y-2">
          {/* Preview */}
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <img
              src={URL.createObjectURL(blob)}
              alt="Flyer"
              className="w-full"
            />
          </div>
          {/* Acciones */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={compartir}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              📤 Compartir imagen
            </button>
            <button
              onClick={descargar}
              className="bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              ⬇️ Descargar PNG
            </button>
          </div>
          <button
            onClick={() => { setEstado("idle"); setBlob(null); }}
            className="w-full text-xs text-gray-400 py-1"
          >
            Regenerar
          </button>
        </div>
      )}
    </div>
  );
}
