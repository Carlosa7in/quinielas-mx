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

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function dibujarFlyer(
  canvas: HTMLCanvasElement,
  partidos: Partido[],
  jornadaNombre: string,
  liga: string,
  refCode: string,
  origen: string
) {
  const W = 800;
  const PAD = 64;          // padding horizontal generoso
  const VPAD = 16;         // padding vertical entre secciones
  const HEADER_H = 110;
  const ROW_H = 50;        // filas más compactas
  const FOOTER_H = 82;
  const BRAND_H = 64;
  const H = HEADER_H + VPAD + 30 + VPAD / 2 + partidos.length * ROW_H + VPAD + FOOTER_H + VPAD + BRAND_H + VPAD;

  // HiDPI
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // ── Cargar imágenes ──────────────────────────────────────────────────
  let bgImg: HTMLImageElement | null = null;
  let logoImg: HTMLImageElement | null = null;
  try { bgImg = await cargarImagen("/flyer-bg.webp"); } catch { /* sin fondo */ }
  try { logoImg = await cargarImagen("/logo-tablitas.png"); } catch { /* sin logo */ }

  // ── Fondo general ────────────────────────────────────────────────────
  if (bgImg) {
    // Dibujar imagen de fondo cubriendo todo el canvas
    ctx.drawImage(bgImg, 0, 0, W, H);
    // Overlay oscuro para legibilidad
    ctx.fillStyle = "rgba(5, 15, 35, 0.72)";
    ctx.fillRect(0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a1628");
    bg.addColorStop(1, "#0f2040");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Header ───────────────────────────────────────────────────────────

  // Logo
  const logoH = 64;
  const logoW = logoH;
  if (logoImg) {
    const ratio = logoImg.width / logoImg.height;
    const lW = Math.round(logoH * ratio);
    ctx.drawImage(logoImg, PAD, (HEADER_H - logoH) / 2, lW, logoH);
    // Título después del logo
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(jornadaNombre.toUpperCase(), PAD + lW + 14, HEADER_H / 2 - 4);
    ctx.fillStyle = "#fcd34d";
    ctx.font = "500 17px Arial, sans-serif";
    ctx.fillText(liga + " · " + new Date().getFullYear(), PAD + lW + 14, HEADER_H / 2 + 20);
  } else {
    ctx.font = "bold 38px serif";
    ctx.textAlign = "center";
    ctx.fillText("⚽", PAD + 28, HEADER_H / 2 + 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(jornadaNombre.toUpperCase(), PAD + 70, HEADER_H / 2 - 4);
    ctx.fillStyle = "#fcd34d";
    ctx.font = "500 17px Arial, sans-serif";
    ctx.fillText(liga + " · " + new Date().getFullYear(), PAD + 70, HEADER_H / 2 + 20);
  }

  // ── Encabezado columnas ───────────────────────────────────────────────
  const colY = HEADER_H + VPAD;
  ctx.fillStyle = "rgba(30,58,95,0.85)";
  roundRect(ctx, PAD, colY, W - PAD * 2, 30, 8);

  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("L", PAD + 26, colY + 20);
  ctx.fillText("LOCAL", W * 0.3, colY + 20);
  ctx.fillText("E", W * 0.5, colY + 20);
  ctx.fillText("VISITANTE", W * 0.7, colY + 20);
  ctx.fillText("V", W - PAD - 26, colY + 20);

  // ── Filas de partidos ─────────────────────────────────────────────────
  const rowsY = colY + 30 + VPAD / 2;
  partidos.forEach((p, i) => {
    const y = rowsY + i * ROW_H;

    // Fondo glassmorphism alternado
    ctx.fillStyle = i % 2 === 0
      ? "rgba(255,255,255,0.08)"
      : "rgba(255,255,255,0.04)";
    roundRect(ctx, PAD, y + 2, W - PAD * 2, ROW_H - 4, 10);

    const cy = y + ROW_H / 2 + 7;
    const btnW = 36, btnH = 28;

    // Botón L
    ctx.fillStyle = "rgba(29,78,216,0.85)";
    roundRect(ctx, PAD + 6, y + (ROW_H - btnH) / 2, btnW, btnH, 7);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("L", PAD + 6 + btnW / 2, cy);

    // Botón E
    ctx.fillStyle = "rgba(55,65,81,0.85)";
    roundRect(ctx, W / 2 - btnW / 2, y + (ROW_H - btnH) / 2, btnW, btnH, 7);
    ctx.fillStyle = "#d1d5db";
    ctx.fillText("E", W / 2, cy);

    // Botón V
    ctx.fillStyle = "rgba(124,58,237,0.85)";
    roundRect(ctx, W - PAD - 6 - btnW, y + (ROW_H - btnH) / 2, btnW, btnH, 7);
    ctx.fillStyle = "#fff";
    ctx.fillText("V", W - PAD - 6 - btnW / 2, cy);

    // Equipo local
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(truncar(p.equipoLocal.toUpperCase(), 13), W * 0.44, cy);

    // "vs"
    ctx.fillStyle = "rgba(156,163,175,0.8)";
    ctx.font = "11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("vs", W * 0.5, cy);

    // Equipo visitante
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(truncar(p.equipoVisita.toUpperCase(), 13), W * 0.56, cy);
  });

  // ── Footer precio / cierre ────────────────────────────────────────────
  const footerY = rowsY + partidos.length * ROW_H + VPAD;
  ctx.fillStyle = "rgba(6,78,59,0.88)";
  roundRect(ctx, PAD, footerY, W - PAD * 2, FOOTER_H, 12);

  const footerMid = footerY + FOOTER_H / 2;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PRECIO:", PAD + 20, footerMid - 4);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.fillText(`$${PRECIO}`, PAD + 110, footerMid + 14);

  ctx.fillStyle = "#6ee7b7";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("¡GANA PREMIOS EN EFECTIVO!", W - PAD - 20, footerMid - 8);
  ctx.fillStyle = "#d1fae5";
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText("Regístra tu quiniela en línea 👇", W - PAD - 20, footerMid + 12);

  // ── Branding / link ───────────────────────────────────────────────────
  const brandY = footerY + FOOTER_H + VPAD;
  ctx.fillStyle = "rgba(2,6,23,0.90)";
  roundRect(ctx, PAD, brandY, W - PAD * 2, BRAND_H - 8, 12);

  // CTA
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("👇  REGÍSTRATE AQUÍ  👇", W / 2, brandY + 18);

  // Link
  const linkTexto = `${origen}/quiniela?ref=${refCode}`;
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 16px Arial, monospace";
  ctx.textAlign = "center";
  ctx.fillText(linkTexto, W / 2, brandY + 40);
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
      await dibujarFlyer(canvas, partidos, jornadaNombre, liga, refCode, origen);

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
