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

// Misma función que en /api/logos — busca por nombre exacto y sin acentos
function slugify(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function buscarLogo(logoUrlMap: Record<string, string>, equipo: string): string | null {
  return logoUrlMap[equipo] ?? logoUrlMap[slugify(equipo)] ?? null;
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

// Dibuja logo real (recortado en círculo) o iniciales como fallback
function dibujarLogoCirculo(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  nombre: string,
  cx: number,
  cy: number,
  r: number
) {
  if (img) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.20)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Fallback: círculo con iniciales
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    const sat = 55 + (Math.abs(hash >> 4) % 25);
    const lit = 32 + (Math.abs(hash >> 8) % 18);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue},${sat}%,${lit}%)`;
    ctx.fill();
    ctx.strokeStyle = `hsl(${hue},${sat}%,${Math.min(lit + 30, 80)}%)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const palabras = nombre.trim().split(/\s+/);
    const iniciales = palabras.length === 1
      ? nombre.slice(0, 2).toUpperCase()
      : palabras.slice(0, 2).map(p => p[0]).join("").toUpperCase();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(r * 0.88)}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(iniciales, cx, cy);
    ctx.textBaseline = "alphabetic";
  }
}

async function dibujarFlyer(
  canvas: HTMLCanvasElement,
  partidos: Partido[],
  jornadaNombre: string,
  liga: string,
  _refCode: string,
  _origen: string
) {
  // ── Dimensiones 9:16 ─────────────────────────────────────────────────
  const W = 810;
  const H = Math.round(W * 16 / 9); // 1440
  const PAD = 72;
  const PAD_TOP = 72;
  const PAD_BOT = 72;

  const LOGO_H = 120;
  const GAP_LOGO_TITLE = 20;
  const TITLE_H = 46;
  const SUBTITLE_H = 32;
  const GAP_TITLE_COLS = 40;
  const COL_H = 36;
  const GAP_COL_ROWS = 10;
  const GAP_ROWS_FOOTER = 28;
  const FOOTER_H = 116;

  const fixedH =
    PAD_TOP + LOGO_H + GAP_LOGO_TITLE +
    TITLE_H + SUBTITLE_H + GAP_TITLE_COLS +
    COL_H + GAP_COL_ROWS +
    GAP_ROWS_FOOTER + FOOTER_H + PAD_BOT;

  const n = Math.max(partidos.length, 1);
  const ROW_H = Math.min(82, Math.max(56, Math.floor((H - fixedH) / n)));

  // HiDPI
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // ── Cargar imágenes de fondo y logo ──────────────────────────────────
  let bgImg: HTMLImageElement | null = null;
  let logoImg: HTMLImageElement | null = null;
  try { bgImg = await cargarImagen("/flyer-bg.webp"); } catch { /* sin fondo */ }
  try { logoImg = await cargarImagen("/logo-tablitas.png"); } catch { /* sin logo */ }

  // ── Cargar logos de equipos desde ESPN (vía proxy) ───────────────────
  // Primero obtenemos el mapa nombre→URL para la liga de esta jornada.
  // Para jornadas Mixtas cargamos todas las ligas soportadas.
  const ligas = liga === "Mixta"
    ? ["Liga MX", "Champions League", "Premier League", "La Liga", "Serie A"]
    : [liga];

  const logoUrlMaps = await Promise.all(
    ligas.map(l =>
      fetch(`/api/logos?liga=${encodeURIComponent(l)}`)
        .then(r => r.json() as Promise<Record<string, string>>)
        .catch(() => ({} as Record<string, string>))
    )
  );
  const logoUrlMap: Record<string, string> = Object.assign({}, ...logoUrlMaps);

  // Luego cargamos cada imagen vía proxy (mismo origen → sin CORS)
  const equiposUnicos = [...new Set(partidos.flatMap(p => [p.equipoLocal, p.equipoVisita]))];
  const logoImgMap: Record<string, HTMLImageElement | null> = {};
  await Promise.all(
    equiposUnicos.map(async (equipo) => {
      const url = buscarLogo(logoUrlMap, equipo);
      if (!url) { logoImgMap[equipo] = null; return; }
      try {
        logoImgMap[equipo] = await cargarImagen(`/api/logo?url=${encodeURIComponent(url)}`);
      } catch {
        logoImgMap[equipo] = null;
      }
    })
  );

  // ── Fondo ────────────────────────────────────────────────────────────
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, W, H);
    ctx.fillStyle = "rgba(5, 15, 35, 0.75)";
    ctx.fillRect(0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a1628");
    bg.addColorStop(1, "#0f2040");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Logo de la app centrado ───────────────────────────────────────────
  let curY = PAD_TOP;
  if (logoImg) {
    const ratio = logoImg.width / logoImg.height;
    const lW = Math.round(LOGO_H * ratio);
    ctx.drawImage(logoImg, (W - lW) / 2, curY, lW, LOGO_H);
  } else {
    ctx.font = `bold ${LOGO_H * 0.8}px serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("⚽", W / 2, curY + LOGO_H * 0.8);
  }
  curY += LOGO_H + GAP_LOGO_TITLE;

  // ── Título ────────────────────────────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(jornadaNombre.toUpperCase(), W / 2, curY + 32);
  curY += TITLE_H;

  // ── Subtítulo ─────────────────────────────────────────────────────────
  ctx.fillStyle = "#fcd34d";
  ctx.font = "600 21px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${liga} · ${new Date().getFullYear()}`, W / 2, curY + 22);
  curY += SUBTITLE_H + GAP_TITLE_COLS;

  // ── Encabezado columnas ───────────────────────────────────────────────
  // Layout: [L] [LOCAL →] [logo|E btn|logo] [← VISITANTE] [V]
  const btnW = 40, btnH = 30;
  const LOGO_R = 20;
  // Logo local centro: justo a la izquierda del botón E
  const localLogoCX = W / 2 - btnW / 2 - 10 - LOGO_R;  // 385 - 10 - 20 = 355
  // Logo visitante centro: justo a la derecha del botón E
  const awayLogoCX  = W / 2 + btnW / 2 + 10 + LOGO_R;  // 425 + 10 + 20 = 455
  // Nombre local: right-aligned hasta el borde izq del logo local
  const localNameX  = localLogoCX - LOGO_R - 8;          // 355 - 20 - 8 = 327
  // Nombre visitante: left-aligned desde el borde der del logo visitante
  const awayNameX   = awayLogoCX  + LOGO_R + 8;          // 455 + 20 + 8 = 483

  ctx.fillStyle = "rgba(30,58,95,0.85)";
  roundRect(ctx, PAD, curY, W - PAD * 2, COL_H, 8);
  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("L",          PAD + 26,          curY + 24);
  ctx.fillText("LOCAL",      (PAD + localNameX) / 2 + PAD / 2, curY + 24);
  ctx.fillText("E",          W / 2,             curY + 24);
  ctx.fillText("VISITANTE",  (awayNameX + W - PAD) / 2, curY + 24);
  ctx.fillText("V",          W - PAD - 26,      curY + 24);
  curY += COL_H + GAP_COL_ROWS;

  // ── Filas de partidos ─────────────────────────────────────────────────
  partidos.forEach((p, i) => {
    const y   = curY + i * ROW_H;
    const midY = y + ROW_H / 2;
    const cy  = midY + 6; // baseline texto

    // Fondo alternado
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)";
    roundRect(ctx, PAD, y + 2, W - PAD * 2, ROW_H - 4, 10);

    // Botón L
    ctx.fillStyle = "rgba(29,78,216,0.85)";
    roundRect(ctx, PAD + 6, midY - btnH / 2, btnW, btnH, 7);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("L", PAD + 6 + btnW / 2, cy);

    // Botón E
    ctx.fillStyle = "rgba(55,65,81,0.85)";
    roundRect(ctx, W / 2 - btnW / 2, midY - btnH / 2, btnW, btnH, 7);
    ctx.fillStyle = "#d1d5db";
    ctx.fillText("E", W / 2, cy);

    // Botón V
    ctx.fillStyle = "rgba(124,58,237,0.85)";
    roundRect(ctx, W - PAD - 6 - btnW, midY - btnH / 2, btnW, btnH, 7);
    ctx.fillStyle = "#fff";
    ctx.fillText("V", W - PAD - 6 - btnW / 2, cy);

    // Nombre local  (right-aligned → logo local → E btn)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(truncar(p.equipoLocal.toUpperCase(), 12), localNameX, cy);

    // Logo local (derecha del nombre, pegado al E btn)
    dibujarLogoCirculo(ctx, logoImgMap[p.equipoLocal] ?? null, p.equipoLocal, localLogoCX, midY, LOGO_R);

    // Logo visitante (izquierda del nombre, pegado al E btn)
    dibujarLogoCirculo(ctx, logoImgMap[p.equipoVisita] ?? null, p.equipoVisita, awayLogoCX, midY, LOGO_R);

    // Nombre visitante (left-aligned ← logo visitante ← E btn)
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "bold 17px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(truncar(p.equipoVisita.toUpperCase(), 12), awayNameX, cy);
  });

  curY += n * ROW_H + GAP_ROWS_FOOTER;

  // ── Footer precio ─────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(6,78,59,0.90)";
  roundRect(ctx, PAD, curY, W - PAD * 2, FOOTER_H, 14);

  const LINE1 = curY + FOOTER_H * 0.34;
  const LINE2 = curY + FOOTER_H * 0.76;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PRECIO:", PAD + 26, LINE1);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 34px Arial, sans-serif";
  ctx.fillText(`$${PRECIO}`, PAD + 26, LINE2);

  ctx.fillStyle = "#6ee7b7";
  ctx.font = "bold 15px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("¡GANA PREMIOS EN EFECTIVO!", W - PAD - 26, LINE1);

  ctx.fillStyle = "#d1fae5";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("Regístra tu quiniela en línea", W - PAD - 26, LINE2);
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
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            <img src={URL.createObjectURL(blob)} alt="Flyer" className="w-full" />
          </div>
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
