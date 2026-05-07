"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { LogoEquipo } from "@/components/LogoEquipo";
import { getLogoUrl } from "@/lib/equipos";
import { ADMIN_WHATSAPP, CLABE, BANCO, TITULAR, TARJETA_OXXO } from "@/lib/config";

type Pick = {
  id: string;
  partidoId?: string;
  prediccion: string;
  acertado?: boolean | null;
  partido: {
    equipoLocal: string;
    equipoVisita: string;
    fechaHora: string;
    orden: number;
    resultado?: string | null;
  };
};

type Quiniela = {
  folio: string;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  canal: string;
  monto: number;
  estado: string;
  estadoPago: string;
  jornada: { id: string; numero: number; nombre: string | null; temporada: string; liga: string };
  picks: Pick[];
};

// Grupo de picks del mismo partido (sencillo, doble o triple)
type PartidoGroup = {
  orden: number;
  equipoLocal: string;
  equipoVisita: string;
  predicciones: string[];
  acertados: (boolean | null | undefined)[];
};

function agruparPicksPorPartido(picks: Pick[]): PartidoGroup[] {
  const sorted = [...picks].sort((a, b) => a.partido.orden - b.partido.orden);
  const grupos: PartidoGroup[] = [];
  for (const pick of sorted) {
    const g = grupos.find((x) => x.orden === pick.partido.orden);
    if (g) {
      if (!g.predicciones.includes(pick.prediccion)) g.predicciones.push(pick.prediccion);
      g.acertados.push(pick.acertado);
    } else {
      grupos.push({
        orden: pick.partido.orden,
        equipoLocal: pick.partido.equipoLocal,
        equipoVisita: pick.partido.equipoVisita,
        predicciones: [pick.prediccion],
        acertados: [pick.acertado],
      });
    }
  }
  return grupos;
}

// Normalizar caracteres especiales para impresoras térmicas (no soportan UTF-8 completo)
function norm(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default function TicketPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const folio = params.folio as string;
  const totalBoletos = Number(searchParams.get("total") ?? 1);
  // formas = cuántos formularios distintos se enviaron (vs combinaciones de reventado)
  const totalFormas  = Number(searchParams.get("formas") ?? totalBoletos);
  // montoTotal = monto de todos los boletos juntos (un solo pago)
  const montoTotalParam = searchParams.get("montoTotal");
  // esRegistro = llegamos desde el flujo de registro (admin/tienda), NO desde el link del cliente
  const esRegistro   = searchParams.get("total") !== null;
  const [quiniela, setQuiniela] = useState<Quiniela | null>(null);
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [cargandoPNG, setCargandoPNG] = useState(false);
  const [referenciaPago, setReferenciaPago] = useState("");
  const [guardandoRef, setGuardandoRef] = useState(false);
  const [refGuardada, setRefGuardada] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [ticketImgUrl, setTicketImgUrl]     = useState("");
  const [buildingImg,  setBuildingImg]      = useState(false);
  const [cambiandoCanal, setCambiandoCanal] = useState(false);

  // Auto-generar PNG del ticket en modo registro (tienda/admin)
  useEffect(() => {
    if (!esRegistro || !quiniela || !qrDataUrl || ticketImgUrl) return;
    setBuildingImg(true);
    buildPNG(quiniela, qrDataUrl)
      .then((file) => setTicketImgUrl(URL.createObjectURL(file)))
      .finally(() => setBuildingImg(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esRegistro, quiniela, qrDataUrl]);

  const copiar = (texto: string, clave: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  // Generar QR cuando carga la quiniela
  useEffect(() => {
    if (!quiniela) return;
    import("qrcode").then((QRCode) => {
      const url = `${window.location.origin}/consultar?folio=${quiniela.folio}`;
      QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: "#166534", light: "#fff" } })
        .then(setQrDataUrl);
    });
  }, [quiniela]);

  useEffect(() => {
    fetch(`/api/quinielas?folio=${folio}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setQuiniela(data);
      });
  }, [folio]);

  // ── Función que genera el PNG de UNA quiniela ────────────────
  const buildPNG = async (q: Quiniela, qrUrl: string): Promise<File> => {
    const picks   = [...q.picks].sort((a, b) => a.partido.orden - b.partido.orden);
    const grupos  = agruparPicksPorPartido(picks); // agrupados por partido (doble/triple)
    // CLABE, BANCO, TITULAR vienen del import de @/lib/config
    const scale   = 2;
    const W       = 480;
    const pad     = 32;
    const sans    = (sz: number, w: "normal" | "bold" = "normal") =>
      `${w} ${sz}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

    const loadImg = (src: string): Promise<HTMLImageElement | null> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        setTimeout(() => resolve(null), 4000);
        img.src = src;
      });

    const roundRect = (
      c: CanvasRenderingContext2D,
      x: number, y: number, w: number, h: number, r: number
    ) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    };

    const barcodeCanvas = document.createElement("canvas");
    const hasPago = q.canal === "transferencia" || q.canal === "oxxo";
    if (hasPago) {
      const JsBarcode = (await import("jsbarcode")).default;
      JsBarcode(barcodeCanvas, CLABE, {
        format: "CODE128", width: 3, height: 90,
        displayValue: false, margin: 0, background: "#ffffff", lineColor: "#111827",
      });
    }

    const equiposUnicos = [...new Set(picks.flatMap(p => [p.partido.equipoLocal, p.partido.equipoVisita]))];
    const [logoTablitas, qrImg, ...equipoImgs] = await Promise.all([
      loadImg("/logo-tablitas.png"),
      loadImg(qrUrl),
      ...equiposUnicos.map(eq => loadImg(getLogoUrl(eq))),
    ]);
    const logoMap: Record<string, HTMLImageElement | null> = {};
    equiposUnicos.forEach((eq, i) => { logoMap[eq] = equipoImgs[i]; });

    const LOGO_W = 110;
    const LOGO_H = logoTablitas
      ? Math.round(LOGO_W * logoTablitas.naturalHeight / logoTablitas.naturalWidth)
      : 70;
    const ROW_H  = 48;
    const PICK_H = grupos.length * ROW_H; // usar nº de partidos únicos, no picks totales
    const QR_SZ  = 160;
    const BAR_W  = W - pad * 2;
    const BAR_H  = hasPago ? barcodeCanvas.height / scale : 0;
    const PAGO_H = hasPago
      ? 20 + 24 + 20 + 20 + (q.canal === "transferencia" ? 22 : 0) + 16 + BAR_H + 20
      : 0;

    const H = 28 + LOGO_H + 14
      + 22 + 16 + 16
      + 26 + 20 + 16
      + PICK_H + 16
      + PAGO_H
      + 16 + QR_SZ + 14 + 22 + 28;

    const canvas = document.createElement("canvas");
    canvas.width  = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    let y = 28;

    if (logoTablitas) {
      ctx.drawImage(logoTablitas, (W - LOGO_W) / 2, y, LOGO_W, LOGO_H);
    } else {
      ctx.font = sans(24, "bold"); ctx.fillStyle = "#14532d";
      ctx.textAlign = "center"; ctx.fillText("TABLITAS", W / 2, y + 40);
    }
    y += LOGO_H + 14;

    ctx.textAlign = "center";
    ctx.font = sans(16, "bold"); ctx.fillStyle = "#14532d";
    ctx.fillText(q.jornada.liga, W / 2, y); y += 22;
    ctx.font = sans(13); ctx.fillStyle = "#6b7280";
    ctx.fillText(`${q.jornada.nombre ?? `Jornada ${q.jornada.numero}`}  ·  ${q.jornada.temporada}`, W / 2, y);
    y += 16;

    ctx.strokeStyle = "#bbf7d0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    y += 16;

    ctx.textAlign = "left";
    ctx.font = sans(17, "bold"); ctx.fillStyle = "#111827";
    ctx.fillText(q.nombreCliente ?? "—", pad, y);
    ctx.textAlign = "right";
    ctx.font = sans(11); ctx.fillStyle = "#9ca3af";
    ctx.fillText(q.folio, W - pad, y); y += 20;
    ctx.textAlign = "left";
    ctx.font = sans(14, "bold"); ctx.fillStyle = "#16a34a";
    ctx.fillText(`$${q.monto.toFixed(2)} MXN`, pad, y); y += 20;

    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    y += 16;

    const logoSz   = 30;
    const PRED_W   = 54; // más ancho para dobles ("L/E") y triples ("L/E/V")
    const PRED_COL = W - pad - PRED_W;

    for (let i = 0; i < grupos.length; i++) {
      const g    = grupos[i];
      const rowY = y + i * ROW_H;
      const midY = rowY + ROW_H / 2;

      if (i % 2 === 0) {
        roundRect(ctx, pad - 6, rowY + 3, W - (pad - 6) * 2, ROW_H - 6, 8);
        ctx.fillStyle = "#f9fafb"; ctx.fill();
      }

      ctx.textAlign = "left"; ctx.font = sans(11); ctx.fillStyle = "#d1d5db";
      ctx.fillText(`${i + 1}`, pad, midY + 5);

      let x = pad + 20;
      const lImg = logoMap[g.equipoLocal];
      if (lImg) ctx.drawImage(lImg, x, midY - logoSz / 2, logoSz, logoSz);
      x += logoSz + 6;

      ctx.font = sans(13, "bold"); ctx.fillStyle = "#1f2937"; ctx.textAlign = "left";
      const maxLocal = 85;
      let ln = g.equipoLocal;
      while (ctx.measureText(ln).width > maxLocal && ln.length > 3) ln = ln.slice(0, -1);
      if (ln !== g.equipoLocal) ln += "…";
      ctx.fillText(ln, x, midY + 5); x += maxLocal + 6;

      ctx.font = sans(11); ctx.fillStyle = "#9ca3af"; ctx.textAlign = "center";
      ctx.fillText("vs", x + 10, midY + 5); x += 22;

      const vImg = logoMap[g.equipoVisita];
      if (vImg) ctx.drawImage(vImg, x, midY - logoSz / 2, logoSz, logoSz);
      x += logoSz + 6;

      ctx.textAlign = "left"; ctx.font = sans(13, "bold"); ctx.fillStyle = "#1f2937";
      const maxVisit = PRED_COL - x - 6;
      let vn = g.equipoVisita;
      while (ctx.measureText(vn).width > maxVisit && vn.length > 3) vn = vn.slice(0, -1);
      if (vn !== g.equipoVisita) vn += "…";
      ctx.fillText(vn, x, midY + 5);

      // Badge de predicción(es) — doble/triple aparece como "L/E" o "L/E/V"
      const preds = g.predicciones;
      const pTxt = preds.map(p => p === "1" ? "L" : p === "2" ? "V" : "E").join("/");
      const anyAcertado = g.acertados.some(a => a === true);
      const anyFailed   = g.acertados.some(a => a === false);
      // Color del badge según resultado
      const pBg  = anyAcertado ? "#dcfce7" : anyFailed ? "#fee2e2" : "#fef9c3";
      const pCol = anyAcertado ? "#15803d" : anyFailed ? "#dc2626" : "#854d0e";
      const pH = 24;
      roundRect(ctx, PRED_COL, midY - pH / 2, PRED_W, pH, 6);
      ctx.fillStyle = pBg; ctx.fill();
      ctx.textAlign = "center";
      ctx.font = sans(preds.length > 1 ? 11 : 13, "bold"); // fuente más pequeña para dobles
      ctx.fillStyle = pCol;
      ctx.fillText(pTxt, PRED_COL + PRED_W / 2, midY + 4);
      // Etiqueta DOBLE/TRIPLE debajo del badge
      if (preds.length >= 2) {
        ctx.font = sans(9); ctx.fillStyle = "#9ca3af";
        ctx.fillText(preds.length >= 3 ? "TRIPLE" : "DOBLE", PRED_COL + PRED_W / 2, midY + pH / 2 + 9);
      }
    }
    y += PICK_H + 16;

    if (hasPago) {
      const isOxxo = q.canal === "oxxo";
      ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
      y += 20;

      ctx.textAlign = "center"; ctx.font = sans(18, "bold"); ctx.fillStyle = "#92400e";
      ctx.fillText(isOxxo ? "Deposita en OXXO" : `Transferencia ${BANCO}`, W / 2, y); y += 24;

      ctx.font = sans(14); ctx.fillStyle = "#374151";
      ctx.fillText(`${BANCO}  ·  ${TITULAR}`, W / 2, y); y += 20;

      ctx.font = `bold 16px 'Courier New', Courier, monospace`;
      ctx.fillStyle = "#111827";
      ctx.fillText(CLABE, W / 2, y); y += 20;

      if (!isOxxo) {
        ctx.font = sans(12); ctx.fillStyle = "#6b7280";
        ctx.fillText("Concepto: tu nombre completo", W / 2, y); y += 22;
      } else { y += 4; }

      const bW = Math.min(BAR_W, barcodeCanvas.width / scale);
      ctx.drawImage(barcodeCanvas, (W - bW) / 2, y, bW, BAR_H);
      y += BAR_H + 20;
    }

    ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    y += 16;

    if (qrImg) ctx.drawImage(qrImg, (W - QR_SZ) / 2, y, QR_SZ, QR_SZ);
    y += QR_SZ + 14;

    ctx.textAlign = "center"; ctx.font = sans(12); ctx.fillStyle = "#9ca3af";
    ctx.fillText("Escanea para consultar tus resultados", W / 2, y); y += 22;
    ctx.font = sans(13, "bold"); ctx.fillStyle = "#14532d";
    ctx.fillText("tablitasquinielas.net", W / 2, y);

    const dataUrl = canvas.toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], `quiniela-${q.folio}.png`, { type: "image/png" });
  };

  // ── Genera QR data URL para un folio ─────────────────────────
  const buildQR = async (folioQ: string): Promise<string> => {
    const QRCode = await import("qrcode");
    const url = `${window.location.origin}/consultar?folio=${folioQ}`;
    return QRCode.default.toDataURL(url, {
      width: 300, margin: 2, color: { dark: "#166534", light: "#fff" },
    });
  };

  // ── Compartir por WhatsApp: una imagen por forma ──────────────
  const generarYCompartirPNG = async () => {
    if (!quiniela || !qrDataUrl) return;
    setCargandoPNG(true);
    try {
      // Leer folios guardados al registrar
      const stored = sessionStorage.getItem("lastRegistro");
      const { folios: allFolios = [folio], formas: nFormas = 1 } =
        stored ? (JSON.parse(stored) as { folios: string[]; formas: number }) : {};

      // Solo generamos múltiples imágenes cuando hay formas independientes
      // (no para reventado donde cada combinación es un folio distinto)
      const generarMulti = nFormas > 1 && allFolios.length === nFormas && nFormas <= 15;

      if (!generarMulti) {
        // ── Imagen única ──────────────────────────────────────
        const file = await buildPNG(quiniela, qrDataUrl);
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: `Quiniela ${quiniela.folio}`, files: [file] });
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(file); a.download = file.name; a.click();
        }
      } else {
        // ── Una imagen por forma ──────────────────────────────
        const files: File[] = [];
        for (const f of allFolios) {
          const q: Quiniela = f === folio
            ? quiniela
            : await fetch(`/api/quinielas?folio=${f}`).then((r) => r.json());
          const qr = f === folio ? qrDataUrl : await buildQR(f);
          files.push(await buildPNG(q, qr));
        }
        if (navigator.canShare?.({ files })) {
          await navigator.share({
            title: `Quinielas ${quiniela.nombreCliente ?? ""} (${files.length})`,
            files,
          });
        } else {
          files.forEach((file) => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(file); a.download = file.name; a.click();
          });
        }
      }
    } finally {
      setCargandoPNG(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <a href="/" className="text-amber-700 underline mt-4 inline-block">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (!quiniela) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando ticket...</p>
      </div>
    );
  }

  // ── Gate de pago: si es online y aún no se confirmó, mostrar pantalla de espera ──
  const pagoPendiente =
    quiniela.estadoPago === "pendiente" &&
    (quiniela.canal === "transferencia" || quiniela.canal === "oxxo");

  // Monto real a pagar: si vinieron múltiples boletos, usar montoTotal del param
  const montoAPagar = montoTotalParam ? Number(montoTotalParam) : quiniela.monto;

  if (pagoPendiente) {
    const isOxxo = quiniela.canal === "oxxo";
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-brand text-white py-6 px-4">
          <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-bold">Registro recibido</h1>
            <p className="text-amber-300/70 text-sm mt-1">
              {quiniela.jornada.liga} · {quiniela.jornada.nombre ?? `Jornada ${quiniela.jornada.numero}`} · {quiniela.jornada.temporada}
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          {/* Estado pendiente */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <h2 className="text-amber-900 font-bold text-lg mb-1">Pendiente de confirmación de pago</h2>
            <p className="text-amber-700 text-sm">
              Tu registro está guardado. Tu ticket con pronósticos estará disponible
              en cuanto confirmemos tu pago.
            </p>
          </div>

          {/* Folio */}
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Tu folio</p>
            <p className="text-2xl font-black tracking-widest text-gray-800">{quiniela.folio}</p>
            <p className="text-xs text-gray-400 mt-1">Guárdalo para consultar tu ticket después</p>
          </div>

          {/* Banner multi-boletos: UN SOLO pago cubre todos */}
          {totalBoletos > 1 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center space-y-1">
              <p className="text-green-800 font-bold text-base">
                🎟️ {totalBoletos} boletos registrados
              </p>
              <p className="text-green-700 text-sm">
                Realiza <span className="font-bold">un solo pago</span> por el monto total y cubre todos tus boletos de una vez.
              </p>
              <p className="text-3xl font-black text-green-700 mt-1">${montoAPagar.toFixed(2)} MXN</p>
              <p className="text-green-600/70 text-xs">{totalBoletos} quiniela{totalBoletos !== 1 ? "s" : ""} · pago único</p>
            </div>
          )}

          {/* Instrucciones de pago */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{isOxxo ? "🏪" : "🏦"}</span>
              <div>
                <p className="font-bold text-gray-800">
                  {isOxxo ? "Deposita en OXXO" : "Realiza tu transferencia"}
                </p>
                <p className="text-xs text-gray-500">
                  {isOxxo ? "Muestra esta pantalla en caja" : "Desde cualquier banco o app"}
                </p>
              </div>
            </div>
            {isOxxo ? (
              /* ── Instrucciones OXXO ── */
              <div className="space-y-3">
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">1.</span> Dirígete al OXXO más cercano.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">2.</span> Dile al cajero que vas a hacer un depósito a una cuenta BBVA.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">3.</span> Proporciona el número de tarjeta:</li>
                </ol>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-2">
                  <span className="font-black font-mono tracking-widest text-gray-800 text-base">{TARJETA_OXXO}</span>
                  <button
                    onClick={() => copiar(TARJETA_OXXO.replace(/\s/g, ""), "clabe")}
                    title="Copiar número"
                    className="text-gray-400 hover:text-amber-600 transition-colors p-1 rounded shrink-0"
                  >
                    {copiado === "clabe" ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500 fill-none stroke-current stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="text-gray-500">Monto a depositar</span>
                  <span className="font-bold text-green-700 text-base">${montoAPagar.toFixed(2)} MXN</span>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-xs text-yellow-800">
                  ⚠️ OXXO cobra una comisión adicional por el depósito. Ese cargo no corre por nuestra cuenta.
                </div>
              </div>
            ) : (
              /* ── Instrucciones transferencia ── */
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Banco</span>
                  <span className="font-semibold">{BANCO}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500 shrink-0">CLABE</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold font-mono tracking-wider">{CLABE}</span>
                    <button
                      onClick={() => copiar(CLABE, "clabe")}
                      title="Copiar CLABE"
                      className="text-gray-400 hover:text-amber-600 transition-colors p-1 rounded"
                    >
                      {copiado === "clabe" ? (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500 fill-none stroke-current stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-500 shrink-0">Titular</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{TITULAR}</span>
                    <button
                      onClick={() => copiar(TITULAR, "titular")}
                      title="Copiar titular"
                      className="text-gray-400 hover:text-amber-600 transition-colors p-1 rounded"
                    >
                      {copiado === "titular" ? (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500 fill-none stroke-current stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-gray-500">Monto</span>
                  <span className="font-bold text-green-700 text-base">${montoAPagar.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Concepto</span>
                  <span className="font-semibold text-amber-700">Tu nombre completo</span>
                </div>
              </div>
            )}
          </div>

          {/* Cambiar método de pago */}
          <button
            disabled={cambiandoCanal}
            onClick={async () => {
              const nuevoCanal = quiniela.canal === "oxxo" ? "transferencia" : "oxxo";
              setCambiandoCanal(true);
              const res = await fetch(`/api/quinielas?folio=${quiniela.folio}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ canal: nuevoCanal }),
              });
              if (res.ok) {
                setQuiniela((prev) => prev ? { ...prev, canal: nuevoCanal } : prev);
              }
              setCambiandoCanal(false);
            }}
            className="w-full text-center text-gray-500 text-sm py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cambiandoCanal
              ? "Cambiando..."
              : quiniela.canal === "oxxo"
              ? "🔄 Pagar por transferencia bancaria"
              : "🔄 Pagar en OXXO"}
          </button>

          {/* Seguir comprando: vuelve a la misma jornada */}
          <a
            href={`/quiniela?jornada=${quiniela.jornada.id}`}
            className="block w-full text-center text-white font-bold py-3 rounded-xl bg-amber-500 hover:bg-amber-400 transition-colors"
          >
            🎟️ Registrar otra quiniela
          </a>

          {/* Referencia de pago */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <p className="font-semibold text-gray-700 text-sm mb-1">
                {isOxxo ? "🧾 Número de recibo OXXO (opcional)" : "🔑 Número de referencia / folio de transferencia (opcional)"}
              </p>
              <p className="text-xs text-gray-400 mb-2">
                {isOxxo
                  ? "Escríbelo aquí para que podamos ubicar tu pago más rápido."
                  : "Encuéntralo en tu app bancaria: suele llamarse «Número de operación», «Folio» o «Referencia»."}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isOxxo ? "Ej. 12345678" : "Ej. 202405061234"}
                  value={referenciaPago}
                  onChange={(e) => { setReferenciaPago(e.target.value); setRefGuardada(false); }}
                  maxLength={60}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  disabled={!referenciaPago.trim() || guardandoRef || refGuardada}
                  onClick={async () => {
                    setGuardandoRef(true);
                    try {
                      await fetch(`/api/quinielas?folio=${quiniela.folio}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ referenciaPago: referenciaPago.trim() }),
                      });
                      setRefGuardada(true);
                    } finally {
                      setGuardandoRef(false);
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  {guardandoRef ? "..." : refGuardada ? "✓" : "Guardar"}
                </button>
              </div>
              {refGuardada && (
                <p className="text-xs text-green-600 mt-1">✅ Referencia guardada — veremos tu pago más rápido.</p>
              )}
            </div>
          </div>

          {/* Botón: avisar al cobrador por WhatsApp */}
          {(() => {
            const refLine = referenciaPago.trim()
              ? `*Referencia:* ${referenciaPago.trim()}\n`
              : "";
            const boletosLine = totalBoletos > 1
              ? `*Boletos:* ${totalBoletos} (folio principal: ${quiniela.folio})\n`
              : `*Folio:* ${quiniela.folio}\n`;
            const msg = [
              `¡Hola! Ya realicé mi pago 💰`,
              ``,
              `*Nombre:* ${quiniela.nombreCliente ?? "—"}`,
              boletosLine.trimEnd(),
              `*Monto:* $${montoAPagar.toFixed(2)} MXN`,
              `*Método:* ${isOxxo ? "Depósito OXXO" : "Transferencia SPEI"}`,
              refLine,
              `📎 Te adjunto mi comprobante de pago.`,
              ``,
              `Por favor confirma mi registro. ¡Gracias!`,
            ].filter((l) => l !== undefined).join("\n");
            return (
              <a
                href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Ya pagué — avisar al cobrador
              </a>
            );
          })()}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 text-center space-y-1">
            <p>📸 <span className="font-semibold">Adjunta tu comprobante</span> al mensaje de WhatsApp para agilizar la confirmación.</p>
            <p>
              Tu ticket con pronósticos estará disponible en cuanto confirmemos tu pago.{" "}
              <a href={`/consultar?folio=${quiniela.folio}`} className="font-bold underline">
                Ver estado →
              </a>
            </p>
          </div>

          <a
            href="/"
            className="block w-full text-center text-amber-700 font-semibold py-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  // ── Indicador de reventado (disponible justo después del registro vía URL params) ──
  const esReventado = totalFormas <= 1 && totalBoletos > 1;

  return (
    <>
    <style>{`
      #print-ticket { display: none; }
      @media print {
        @page { size: 80mm auto; margin: 0; }
        body { visibility: hidden; margin: 0; padding: 0; }
        #print-ticket {
          display: block !important;
          visibility: visible !important;
          position: fixed !important;
          top: 0; left: 0;
          width: 100%;
          padding: 3mm 4mm;
          font-family: 'Courier New', Courier, monospace;
          font-size: 9pt;
          line-height: 1.5;
          color: #000 !important;
          background: white !important;
        }
        #print-ticket * { visibility: visible !important; }
        #print-ticket p  { margin: 0; }
        #print-ticket img { display: block !important; }
      }
    `}</style>
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-6 px-4 print:hidden">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">{esRegistro ? "Quiniela Registrada" : "Tu Quiniela"}</h1>
          <p className="text-amber-300/70 text-sm mt-1">
            {quiniela.jornada.liga} · {quiniela.jornada.nombre ?? `Jornada ${quiniela.jornada.numero}`} · {quiniela.jornada.temporada}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Mensaje de éxito — solo justo después del registro */}
        {esRegistro && (() => {
          const esReventado = totalFormas <= 1 && totalBoletos > 1;
          const esMultiForma = totalFormas > 1;
          return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center print:hidden">
              <div className="text-3xl mb-2">🎉</div>
              <h2 className="text-green-800 font-bold text-lg">
                {esReventado
                  ? `¡Reventado registrado!`
                  : esMultiForma
                  ? `¡${totalFormas} boleto${totalFormas !== 1 ? "s" : ""} registrado${totalFormas !== 1 ? "s" : ""}!`
                  : "¡Quiniela registrada!"}
              </h2>
              <p className="text-green-600 text-sm">
                {esReventado
                  ? `${totalBoletos} combinaciones — cada una con su propio folio`
                  : esMultiForma && totalBoletos > totalFormas
                  ? `${totalFormas} formas · ${totalBoletos} boletos en total`
                  : "Guarda tu folio para consultar resultados"}
              </p>
            </div>
          );
        })()}

        {/* Banner info cuando hay múltiples boletos */}
        {esRegistro && totalBoletos > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 print:hidden">
            <p className="text-blue-800 text-sm font-semibold mb-1">
              {totalFormas <= 1
                ? `📋 Reventado · ${totalBoletos} combinaciones`
                : `📋 ${totalFormas} formas · ${totalBoletos} boletos`}
            </p>
            <p className="text-blue-600 text-xs">
              Cada boleto tiene su propio folio. Consulta todos con tu teléfono en la sección &quot;Consultar&quot;.
            </p>
          </div>
        )}

        {/* Instrucciones de pago — solo cuando aún pendiente */}
        {(quiniela.canal === "transferencia" || quiniela.canal === "oxxo") && quiniela.estadoPago !== "confirmado" && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 print:hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{quiniela.canal === "oxxo" ? "🏪" : "🏦"}</span>
              <div>
                <p className="font-bold text-amber-900">
                  {quiniela.canal === "oxxo" ? "Deposita en OXXO" : "Realiza tu transferencia"}
                </p>
                <p className="text-xs text-amber-700">
                  {quiniela.canal === "oxxo" ? "Muestra esta pantalla en caja" : "Desde cualquier banco o app"}
                </p>
              </div>
            </div>

            {quiniela.canal === "oxxo" ? (
              <div className="space-y-3">
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">1.</span> Dirígete al OXXO más cercano.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">2.</span> Dile al cajero que vas a hacer un depósito a una cuenta BBVA.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-700 shrink-0">3.</span> Proporciona el número de tarjeta:</li>
                </ol>
                <div className="bg-white rounded-lg p-3 flex items-center justify-between gap-2">
                  <span className="font-black font-mono tracking-widest text-gray-800 text-base">{TARJETA_OXXO}</span>
                  <button onClick={() => copiar(TARJETA_OXXO.replace(/\s/g, ""), "clabe")}
                    className="text-gray-400 hover:text-amber-600 transition-colors p-1 rounded shrink-0">
                    {copiado === "clabe"
                      ? <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500 fill-none stroke-current stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="text-gray-500">Monto a depositar</span>
                  <span className="font-bold text-green-700">${quiniela.monto.toFixed(2)} MXN</span>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 text-xs text-yellow-800">
                  ⚠️ OXXO cobra una comisión adicional por el depósito. Ese cargo no corre por nuestra cuenta.
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Banco</span>
                  <span className="font-semibold text-gray-800">{BANCO}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">CLABE</span>
                  <span className="font-bold text-gray-900 tracking-wider text-sm font-mono">{CLABE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Titular</span>
                  <span className="font-semibold text-gray-800">{TITULAR}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-1">
                  <span className="text-gray-500">Monto</span>
                  <span className="font-bold text-green-700 text-base">${quiniela.monto.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Concepto</span>
                  <span className="font-semibold text-amber-700">Tu nombre completo</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modo registro: mostrar PNG generado */}
        {esRegistro && (
          <div className="flex justify-center print:hidden">
            {buildingImg || !ticketImgUrl ? (
              <div className="w-full max-w-xs bg-white rounded-xl shadow-sm flex items-center justify-center py-16">
                <p className="text-gray-400 text-sm animate-pulse">Generando ticket...</p>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ticketImgUrl}
                alt="Ticket"
                className="w-full max-w-xs rounded-xl shadow-lg"
                style={{ imageRendering: "crisp-edges" }}
              />
            )}
          </div>
        )}

        {/* Ticket HTML — siempre presente pero solo visible para cliente y para imprimir */}
        <div id="ticket-receipt" className={`flex justify-center ${esRegistro ? "hidden print:flex" : ""}`}>
          <div
            className="w-full bg-white shadow-lg"
            style={{
              maxWidth: "320px",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "12px",
              lineHeight: "1.5",
            }}
          >
            {/* Borde dentado superior */}
            <div style={{
              height: "12px",
              background: "radial-gradient(circle at 50% 0%, #f9fafb 6px, white 6px) 0 0 / 14px 12px repeat-x",
              borderLeft: "1px solid #e5e7eb",
              borderRight: "1px solid #e5e7eb",
            }} />

            {/* Cuerpo */}
            <div style={{
              padding: "12px 20px 16px",
              borderLeft: "1px solid #e5e7eb",
              borderRight: "1px solid #e5e7eb",
            }}>
              {/* Encabezado */}
              <div style={{ textAlign: "center", marginBottom: "10px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "56px", objectFit: "contain", margin: "0 auto 4px" }} />
                <p style={{ fontSize: "10px", color: "#6b7280" }}>
                  {quiniela.jornada.liga} · {quiniela.jornada.nombre ?? `Jornada ${quiniela.jornada.numero}`}
                </p>
                <p style={{ fontSize: "10px", color: "#6b7280" }}>{quiniela.jornada.temporada}</p>
              </div>

              {/* Separador */}
              <p style={{ borderTop: "1px dashed #d1d5db", margin: "8px 0" }} />

              {/* Datos del cliente */}
              <div style={{ marginBottom: "8px" }}>
                <p><span style={{ color: "#6b7280" }}>NOMBRE: </span><strong>{quiniela.nombreCliente ?? "—"}</strong></p>
                {quiniela.telefonoCliente && (
                  <p><span style={{ color: "#6b7280" }}>TEL: </span>{quiniela.telefonoCliente}</p>
                )}
                <p><span style={{ color: "#6b7280" }}>FOLIO: </span><strong style={{ letterSpacing: "1px" }}>{quiniela.folio}</strong></p>
                {esReventado && (
                  <p style={{ marginTop: "4px" }}>
                    <span style={{ background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px" }}>
                      REVENTADO · boleto 1 de {totalBoletos}
                    </span>
                  </p>
                )}
              </div>

              {/* Separador */}
              <p style={{ borderTop: "1px dashed #d1d5db", margin: "8px 0" }} />

              {/* Pronósticos */}
              <p style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "11px" }}>PRONÓSTICOS:</p>
              <div style={{ marginBottom: "4px" }}>
                {agruparPicksPorPartido([...quiniela.picks])
                  .map((g, i) => {
                    const label = g.predicciones.map(p => p === "1" ? "L" : p === "2" ? "V" : "E").join("/");
                    const anyAcertado = g.acertados.some(a => a === true);
                    const allFailed = g.acertados.length > 0 && g.acertados.every(a => a === false);
                    const colorLabel = anyAcertado ? "#16a34a" : allFailed ? "#ef4444" : "#111827";
                    const esMulti = g.predicciones.length > 1;
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: 1, minWidth: 0 }}>
                          <span style={{ color: "#9ca3af", minWidth: "14px" }}>{i + 1}.</span>
                          <LogoEquipo equipo={g.equipoLocal} size={14} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }}>
                            {g.equipoLocal}
                          </span>
                          <span style={{ color: "#9ca3af", flexShrink: 0 }}>vs</span>
                          <LogoEquipo equipo={g.equipoVisita} size={14} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }}>
                            {g.equipoVisita}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, marginLeft: "6px" }}>
                          <span style={{
                            fontWeight: "bold",
                            color: colorLabel,
                            border: `1px solid ${colorLabel}`,
                            borderRadius: "3px",
                            padding: "0 5px",
                            fontSize: "11px",
                            lineHeight: "18px",
                          }}>
                            {label}
                          </span>
                          {esMulti && (
                            <span style={{ fontSize: "8px", color: "#d97706", fontWeight: "bold", lineHeight: "10px" }}>
                              {g.predicciones.length >= 3 ? "TRIPLE" : "DOBLE"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Separador */}
              <p style={{ borderTop: "1px dashed #d1d5db", margin: "8px 0" }} />

              {/* Total + QR */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "10px" }}>
                    {quiniela.canal === "tienda" ? "TOTAL PAGADO" : "TOTAL A PAGAR"}
                  </p>
                  <p style={{ fontWeight: "bold", fontSize: "16px" }}>${quiniela.monto.toFixed(2)} MXN</p>
                </div>
                {qrDataUrl && (
                  <div style={{ textAlign: "center" }}>
                    <img src={qrDataUrl} alt="QR" style={{ width: "64px", height: "64px" }} />
                    <p style={{ fontSize: "9px", color: "#9ca3af", marginTop: "2px" }}>Consultar</p>
                  </div>
                )}
              </div>

              {/* Separador */}
              <p style={{ borderTop: "1px dashed #d1d5db", margin: "8px 0" }} />

              {/* Pie */}
              <div style={{ textAlign: "center", color: "#6b7280", fontSize: "9px" }}>
                <p>Conserva este ticket para reclamar tu premio.</p>
                <p style={{ marginTop: "2px" }}>quinielas.mx</p>
              </div>
            </div>

            {/* Borde dentado inferior */}
            <div style={{
              height: "12px",
              background: "radial-gradient(circle at 50% 100%, #f9fafb 6px, white 6px) 0 0 / 14px 12px repeat-x",
              borderLeft: "1px solid #e5e7eb",
              borderRight: "1px solid #e5e7eb",
            }} />
          </div>
        </div>

        {/* ── Área exclusiva para impresión térmica (oculta en pantalla) ── */}
        <div id="print-ticket">
          <p style={{ textAlign: "center", fontWeight: "bold", fontSize: "13pt", letterSpacing: "2px" }}>TABLITAS QUINIELAS</p>
          <p style={{ textAlign: "center" }}>{norm(quiniela.jornada.liga)}</p>
          <p style={{ textAlign: "center" }}>
            {norm(quiniela.jornada.nombre ?? `Jornada ${quiniela.jornada.numero}`)} * {norm(quiniela.jornada.temporada)}
          </p>
          <div style={{ borderTop: "1px solid #000", margin: "4px 0" }} />
          <p><strong>FOLIO:</strong> {quiniela.folio}</p>
          <p><strong>NOMBRE:</strong> {norm(quiniela.nombreCliente ?? "—")}</p>
          {quiniela.telefonoCliente && <p><strong>TEL:</strong> {quiniela.telefonoCliente}</p>}
          <p><strong>TOTAL:</strong> ${quiniela.monto.toFixed(2)} MXN</p>
          <div style={{ borderTop: "1px solid #000", margin: "4px 0" }} />
          <p style={{ fontWeight: "bold" }}>PRONOSTICOS:</p>
          {agruparPicksPorPartido([...quiniela.picks])
            .map((g, i) => {
              const labels = g.predicciones.map(p =>
                p === "1" ? "LOCAL" : p === "2" ? "VISITA" : "EMPATE"
              ).join(" / ");
              const badge = g.predicciones.length === 2 ? " [DOBLE]" : g.predicciones.length >= 3 ? " [TRIPLE]" : "";
              return (
                <div key={i} style={{ marginBottom: "3px" }}>
                  <p>{i + 1}. {norm(g.equipoLocal)} vs {norm(g.equipoVisita)}</p>
                  <p style={{ paddingLeft: "6mm" }}>[{labels}]{badge}</p>
                </div>
              );
            })}
          <div style={{ borderTop: "1px solid #000", margin: "4px 0" }} />
          <p style={{ textAlign: "center", fontSize: "8pt" }}>Conserva este ticket para reclamar tu premio.</p>
          <p style={{ textAlign: "center", fontSize: "8pt" }}>tablitasquinielas.net</p>
          {qrDataUrl && (
            <div style={{ textAlign: "center", marginTop: "6px" }}>
              <img src={qrDataUrl} alt="QR" style={{ width: "55mm", height: "55mm", margin: "0 auto" }} />
              <p style={{ fontSize: "7pt", textAlign: "center", marginTop: "2px" }}>Escanea para consultar resultados</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="space-y-3 print:hidden">

          {/* ── Modo cliente (llegó desde link) — solo descargar ── */}
          {!esRegistro && (
            <button
              onClick={generarYCompartirPNG}
              disabled={cargandoPNG || !qrDataUrl}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {cargandoPNG ? (
                <><span className="animate-spin inline-block">⟳</span> Generando...</>
              ) : (
                <><span>⬇️</span> Descargar mi ticket</>
              )}
            </button>
          )}

          {/* ── Modo registro (tienda) — WhatsApp: mensaje de gracias + link ── */}
          {esRegistro && quiniela.telefonoCliente && (() => {
            const tel     = quiniela.telefonoCliente.replace(/\D/g, "");
            const waPhone = tel.length === 10 ? `52${tel}` : tel;
            const ticketUrl = `${window.location.origin}/ticket/${quiniela.folio}`;
            const nombre1   = quiniela.nombreCliente?.split(" ")[0] ?? "";
            const msg = [
              `¡Gracias por tu registro${nombre1 ? `, ${nombre1}` : ""}! 🎉`,
              ``,
              `*Folio:* ${quiniela.folio}`,
              `Consulta tu quiniela aquí:`,
              `👉 ${ticketUrl}`,
              ``,
              `¡Buena suerte! 🍀`,
              `— Tablitas Quinielas`,
            ].join("\n");
            return (
              <a
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar gracias a {tel.slice(-10).replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3")}
              </a>
            );
          })()}

          {/* Imprimir en térmica — solo en modo registro (admin/tienda) */}
          {esRegistro && (
            <button
              onClick={() => window.print()}
              className="w-full bg-brand hover:bg-amber-900 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>🧾</span> Imprimir en Térmica
            </button>
          )}

          <a
            href={`/consultar?folio=${quiniela.folio}`}
            className="block w-full text-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            🔍 Consultar resultados
          </a>
          <a
            href="/reglamento"
            className="block w-full text-center text-amber-600 text-sm font-medium py-2 hover:underline transition-colors"
          >
            📜 Ver reglamento
          </a>
          <a
            href="/"
            className="block w-full text-center text-amber-700 font-semibold py-2 transition-colors"
          >
            Volver al inicio
          </a>
        </div>

        <p className="text-xs text-gray-400 text-center print:hidden">
          Conserva tu folio para reclamar tu premio en caso de ganar.
        </p>
      </div>
    </div>
    </>
  );
}
