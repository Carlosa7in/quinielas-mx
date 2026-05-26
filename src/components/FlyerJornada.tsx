"use client";
import { useState, useRef, useCallback } from "react";
import { translations, type Locale } from "@/lib/i18n";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  orden: number;
  fechaHora?: string | null;
};

type FlyerProps = {
  jornadaId: string;
  jornadaNombre: string;
  liga: string;
  temporada: string;
  refCode: string;
  /** ISO datetime del primer partido = cuando cierran las ventas al público */
  fechaCierre?: string | null;
  locale?: Locale;
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
  _origen: string,
  fechaCierre?: string | null,
  locale: Locale = "es"
) {
  const tf = translations[locale].flyer;
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

  // Área fija por encima y por debajo de las filas
  const URL_H = 34; // franja con URL al pie
  const headerAreaH =
    PAD_TOP + LOGO_H + GAP_LOGO_TITLE +
    TITLE_H + SUBTITLE_H + GAP_TITLE_COLS +
    COL_H + GAP_COL_ROWS;
  const footerAreaH = GAP_ROWS_FOOTER + FOOTER_H + URL_H + PAD_BOT;
  const availH = H - headerAreaH - footerAreaH;

  // ROW_H se expande hasta MAX cuando caben todos los partidos;
  // si hay demasiados se clampea a MIN y los sobrantes se cortan (no se aplastan).
  const ROW_H_MIN = 68;
  const ROW_H_MAX = 88;
  const maxRows   = Math.floor(availH / ROW_H_MIN);
  const partidosMostrar = partidos.slice(0, maxRows);
  const cortados  = partidos.length - partidosMostrar.length;
  const n         = Math.max(partidosMostrar.length, 1);
  const ROW_H     = Math.min(ROW_H_MAX, Math.floor(availH / n));

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

  // ── Cargar logos de equipos: DB (primario) + ESPN (respaldo) ─────────
  const ligas = liga === "Mixta"
    ? ["Liga MX", "Champions League", "Premier League", "La Liga", "Serie A", "Ligue 1",
       "Brasileirão", "Bundesliga", "Copa Libertadores", "MLS", "Amistosos", "CONCACAF", "Mundial"]
    : [liga];

  // ESPN logos (GET)
  const espnMaps = await Promise.all(
    ligas.map(l =>
      fetch(`/api/logos?liga=${encodeURIComponent(l)}`)
        .then(r => r.json() as Promise<Record<string, string>>)
        .catch(() => ({} as Record<string, string>))
    )
  );
  // DB logos (POST) — más confiables, sobreescriben ESPN en caso de conflicto
  const dbMaps = await Promise.all(
    ligas.map(l =>
      fetch(`/api/logos?liga=${encodeURIComponent(l)}`, { method: "POST" })
        .then(r => r.json() as Promise<Record<string, string>>)
        .catch(() => ({} as Record<string, string>))
    )
  );
  // DB tiene prioridad
  const logoUrlMap: Record<string, string> = Object.assign({}, ...espnMaps, ...dbMaps);

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
  ctx.font = "600 26px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${liga} · ${new Date().getFullYear()}`, W / 2, curY + 26);
  curY += SUBTITLE_H + GAP_TITLE_COLS;

  // ── Encabezado columnas ───────────────────────────────────────────────
  // Layout: [L] [LOCAL →] [logo|E btn|logo] [← VISITANTE] [V]
  const btnW = 40, btnH = 30;
  const LOGO_R = 20;
  // Logo local centro: separado del botón E
  const localLogoCX = W / 2 - btnW / 2 - 22 - LOGO_R;
  // Logo visitante centro: separado del botón E
  const awayLogoCX  = W / 2 + btnW / 2 + 22 + LOGO_R;
  // Nombre local: right-aligned hasta el borde izq del logo local
  const localNameX  = localLogoCX - LOGO_R - 8;
  // Nombre visitante: left-aligned desde el borde der del logo visitante
  const awayNameX   = awayLogoCX  + LOGO_R + 8;

  ctx.fillStyle = "rgba(30,58,95,0.85)";
  roundRect(ctx, PAD, curY, W - PAD * 2, COL_H, 8);
  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.textAlign = "center";
  // "FECHA" centrado en el área del date box (x=124, w=72 → center=160)
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.fillText("FECHA",     PAD + 6 + 36,       curY + 24);  // caja fecha: x=78, w=72 → centro=114
  ctx.fillStyle = "#93c5fd";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillText("L",          PAD + 6 + 72 + 6 + 20, curY + 24); // botón L: x=156, w=40 → centro=176
  ctx.fillText(tf.local,     (196 + localNameX) / 2, curY + 24);
  ctx.fillText("E",          W / 2,             curY + 24);
  ctx.fillText(tf.visitante, (awayNameX + W - PAD) / 2, curY + 24);
  ctx.fillText("V",          W - PAD - 26,      curY + 24);
  curY += COL_H + GAP_COL_ROWS;

  // ── Filas de partidos ─────────────────────────────────────────────────
  partidosMostrar.forEach((p, i) => {
    const y   = curY + i * ROW_H;
    const midY = y + ROW_H / 2;
    const cy  = midY + 6; // baseline texto

    // Fondo alternado
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)";
    roundRect(ctx, PAD, y + 2, W - PAD * 2, ROW_H - 4, 10);

    // Fecha / hora — dentro del recuadro, entre botón L y nombre local
    if (p.fechaHora) {
      const d = new Date(p.fechaHora);
      const dia  = d.toLocaleDateString("es-MX", { weekday: "short", timeZone: "America/Mexico_City" })
                    .replace(".", "").slice(0, 3).toUpperCase();
      const hora = d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Mexico_City" })
                    .replace(/\s*a\.m\./i, "am").replace(/\s*p\.m\./i, "pm");

      // Caja de fecha: al inicio de la fila (antes del botón L)
      const dateBoxX = PAD + 6;  // 78 — primera posición
      const dateBoxW = 72;
      const dateBoxH = ROW_H - 18;
      const dateBoxY = y + 9;

      ctx.fillStyle = "rgba(10, 25, 55, 0.75)";
      roundRect(ctx, dateBoxX, dateBoxY, dateBoxW, dateBoxH, 7);

      const dateCX = dateBoxX + dateBoxW / 2; // 160
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fcd34d";
      ctx.font = "bold 16px Arial, sans-serif";
      ctx.fillText(dia,  dateCX, midY - 10);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Arial, sans-serif";
      ctx.fillText(hora, dateCX, midY + 10);
      ctx.textBaseline = "alphabetic";
    }

    // Botón L — después de la caja de fecha (fecha=78+72=150, gap=6 → L empieza en 156)
    ctx.fillStyle = "rgba(29,78,216,0.85)";
    roundRect(ctx, PAD + 6 + 72 + 6, midY - btnH / 2, btnW, btnH, 7);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("L", PAD + 6 + 72 + 6 + btnW / 2, cy);

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
    ctx.font = "bold 20px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(truncar(p.equipoLocal.toUpperCase(), 10), localNameX, cy);

    // Logo local (derecha del nombre, pegado al E btn)
    dibujarLogoCirculo(ctx, logoImgMap[p.equipoLocal] ?? null, p.equipoLocal, localLogoCX, midY, LOGO_R);

    // Logo visitante (izquierda del nombre, pegado al E btn)
    dibujarLogoCirculo(ctx, logoImgMap[p.equipoVisita] ?? null, p.equipoVisita, awayLogoCX, midY, LOGO_R);

    // Nombre visitante (left-aligned ← logo visitante ← E btn)
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "bold 20px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(truncar(p.equipoVisita.toUpperCase(), 10), awayNameX, cy);
  });

  // ── Indicador de partidos recortados ─────────────────────────────────
  if (cortados > 0) {
    const moreY = curY + n * ROW_H + GAP_ROWS_FOOTER / 2 + 12;
    ctx.fillStyle = "rgba(253,211,77,0.80)";
    ctx.font = "italic 17px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`+${cortados} partido${cortados > 1 ? "s" : ""} más · ver en tablitasquinielas.com`, W / 2, moreY);
    ctx.textBaseline = "alphabetic";
  }

  // ── Footer anclado al fondo del canvas ───────────────────────────────
  const footerY = H - PAD_BOT - URL_H - FOOTER_H;
  ctx.fillStyle = "rgba(6,78,59,0.90)";
  roundRect(ctx, PAD, footerY, W - PAD * 2, FOOTER_H, 14);

  // Izquierda: "PRECIO:" + "$20" alineados por el centro vertical
  const priceY = footerY + FOOTER_H / 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  const labelW = ctx.measureText(tf.precio).width;
  ctx.fillText(tf.precio, PAD + 26, priceY);
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`$${PRECIO}`, PAD + 26 + labelW, priceY);
  ctx.textBaseline = "alphabetic";

  // Derecha: fecha de cierre
  const lineGap = 24;
  const RR1 = footerY + FOOTER_H / 2 - lineGap / 2;
  const RR2 = footerY + FOOTER_H / 2 + lineGap / 2 + 14;
  ctx.fillStyle = "#6ee7b7";
  ctx.font = "bold 19px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillText(tf.cierre, W - PAD - 26, RR1);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 20px Arial, sans-serif";
  const cierreTexto = fechaCierre
    ? new Date(fechaCierre).toLocaleDateString(tf.bcp47, {
        weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit",
        timeZone: "America/Mexico_City",
      }).toUpperCase()
    : tf.verFecha;
  ctx.fillText(cierreTexto, W - PAD - 26, RR2);
  ctx.textBaseline = "alphabetic";

  // ── URL al pie ────────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 19px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("tablitasquinielas.com", W / 2, H - PAD_BOT / 2);
  ctx.textBaseline = "alphabetic";
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

export function FlyerJornada({ jornadaId, jornadaNombre, liga, temporada, refCode, fechaCierre, locale = "es" }: FlyerProps) {
  const [estado, setEstado] = useState<"idle" | "cargando" | "listo">("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generar = useCallback(async () => {
    setEstado("cargando");
    try {
      const res = await fetch(`/api/jornadas?id=${jornadaId}`);
      const data = await res.json();
      const partidos: Partido[] = (data.partidos ?? []).sort((a: Partido, b: Partido) => {
        if (!a.fechaHora && !b.fechaHora) return a.orden - b.orden;
        if (!a.fechaHora) return 1;
        if (!b.fechaHora) return -1;
        return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
      });

      const canvas = canvasRef.current!;
      const origen = window.location.origin;
      await dibujarFlyer(canvas, partidos, jornadaNombre, liga, refCode, origen, fechaCierre ?? null, locale);

      canvas.toBlob((b) => {
        if (b) setBlob(b);
        setEstado("listo");
      }, "image/png");
    } catch {
      setEstado("idle");
    }
  }, [jornadaId, jornadaNombre, liga, refCode, locale, fechaCierre]);

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
    const origen = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origen}/quiniela${refCode ? `?ref=${refCode}` : ""}`;
    const texto = translations[locale].wa.promo(liga, jornadaNombre, link);
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Quinielas ${jornadaNombre}`,
          text: texto,
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
