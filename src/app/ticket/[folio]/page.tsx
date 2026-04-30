"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LogoEquipo } from "@/components/LogoEquipo";
import { getLogoUrl } from "@/lib/equipos";

type Pick = {
  id: string;
  prediccion: string;
  partido: {
    equipoLocal: string;
    equipoVisita: string;
    fechaHora: string;
    orden: number;
  };
};

type Quiniela = {
  folio: string;
  nombreCliente: string | null;
  telefonoCliente: string | null;
  canal: string;
  monto: number;
  estado: string;
  jornada: { numero: number; nombre: string | null; temporada: string; liga: string };
  picks: Pick[];
};

// Normalizar caracteres especiales para impresoras térmicas (no soportan UTF-8 completo)
function norm(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default function TicketPage() {
  const params = useParams();
  const folio = params.folio as string;
  const [quiniela, setQuiniela] = useState<Quiniela | null>(null);
  const [error, setError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [cargandoPNG, setCargandoPNG] = useState(false);

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

  // Genera una imagen PNG del ticket con logo + escudos de equipos
  const generarYCompartirPNG = async () => {
    if (!quiniela || !qrDataUrl) return;
    setCargandoPNG(true);
    try {
      const picks = [...quiniela.picks].sort((a, b) => a.partido.orden - b.partido.orden);
      const scale = 2;
      const W = 390;
      const pad = 22;
      const lh = 20;
      const qrSz = 150;
      const logoW = 100;
      const logoH = Math.round(logoW * 215 / 200); // mantener proporción del SVG

      // ── Helper: cargar imagen con timeout y fallback ──────────
      const loadImg = (src: string): Promise<HTMLImageElement | null> =>
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload  = () => resolve(img);
          img.onerror = () => resolve(null);
          setTimeout(() => resolve(null), 4000);
          img.src = src;
        });

      // Cargar logo Tablitas + logos de equipos en paralelo
      const equiposUnicos = [...new Set(picks.flatMap(p => [p.partido.equipoLocal, p.partido.equipoVisita]))];
      const [logoTablitas, ...equipoImgs] = await Promise.all([
        loadImg("/logo-tablitas.svg"),
        ...equiposUnicos.map(eq => loadImg(getLogoUrl(eq))),
      ]);
      const logoMap: Record<string, HTMLImageElement | null> = {};
      equiposUnicos.forEach((eq, i) => { logoMap[eq] = equipoImgs[i]; });

      // ── Calcular altura total ─────────────────────────────────
      const pickH = picks.length * (22 + lh + 6);
      const H =
        14 + logoH + 12 +                           // logo tablitas
        lh + lh + 14 +                              // info jornada
        14 +                                        // sep naranja
        lh * (quiniela.telefonoCliente ? 4 : 3) +  // datos cliente
        16 +                                        // sep punteado
        lh + pickH +                                // picks
        16 +                                        // sep punteado
        qrSz + 20 + lh + 16;                       // QR + footer

      const canvas = document.createElement("canvas");
      canvas.width  = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      // Fondo papel crema
      ctx.fillStyle = "#FAFAF7";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#E5E7EB";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      const mono = (sz: number, bold = false) =>
        `${bold ? "bold " : ""}${sz}px 'Courier New', Courier, monospace`;

      let y = 14;

      // ── Logo Tablitas ─────────────────────────────────────────
      if (logoTablitas) {
        ctx.drawImage(logoTablitas, (W - logoW) / 2, y, logoW, logoH);
      } else {
        ctx.fillStyle = "#14532d";
        ctx.fillRect(0, y, W, 55);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("TABLITAS QUINIELAS", W / 2, y + 34);
      }
      y += logoH + 10;

      // ── Info jornada ──────────────────────────────────────────
      ctx.textAlign = "center";
      ctx.font = mono(12, true);
      ctx.fillStyle = "#374151";
      ctx.fillText(quiniela.jornada.liga, W / 2, y);
      y += lh;
      ctx.font = mono(11);
      ctx.fillStyle = "#6B7280";
      ctx.fillText(
        `${quiniela.jornada.nombre ?? `Jornada ${quiniela.jornada.numero}`}  ·  ${quiniela.jornada.temporada}`,
        W / 2, y
      );
      y += lh + 12;

      // Línea ámbar (color del logo)
      ctx.strokeStyle = "#C8894A";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
      y += 14;

      // ── Datos cliente ─────────────────────────────────────────
      ctx.textAlign = "left";
      ctx.lineWidth = 1;
      const fila = (label: string, value: string, color = "#111827") => {
        ctx.font = mono(10); ctx.fillStyle = "#6B7280";
        ctx.fillText(label, pad, y);
        ctx.font = mono(11, true); ctx.fillStyle = color;
        ctx.fillText(value, pad + ctx.measureText(label).width + 6, y);
        y += lh;
      };
      fila("FOLIO:",   quiniela.folio);
      fila("NOMBRE:",  quiniela.nombreCliente ?? "—");
      if (quiniela.telefonoCliente) fila("TEL:", quiniela.telefonoCliente);
      fila("TOTAL:",  `$${quiniela.monto.toFixed(2)} MXN`, "#16a34a");

      // Sep punteado
      y += 6;
      ctx.strokeStyle = "#D1D5DB"; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
      ctx.setLineDash([]); y += 14;

      // ── Picks con logos de equipos ─────────────────────────────
      ctx.font = mono(10, true); ctx.fillStyle = "#374151";
      ctx.fillText("PRONOSTICOS:", pad, y);
      y += lh;

      const logoSz = 20; // tamaño del escudo en px
      for (let i = 0; i < picks.length; i++) {
        const p = picks[i];
        const label    = p.prediccion === "1" ? "LOCAL"  : p.prediccion === "2" ? "VISITA" : "EMPATE";
        const colLabel = p.prediccion === "1" ? "#15803d": p.prediccion === "2" ? "#1d4ed8": "#b45309";

        // Fila con logos + nombres
        let x = pad;
        ctx.font = mono(9); ctx.fillStyle = "#9CA3AF";
        ctx.fillText(`${i + 1}.`, x, y + logoSz - 5); x += 18;

        const lImg = logoMap[p.partido.equipoLocal];
        if (lImg) { ctx.drawImage(lImg, x, y, logoSz, logoSz); }
        x += logoSz + 4;
        ctx.font = mono(10, true); ctx.fillStyle = "#111827";
        ctx.fillText(p.partido.equipoLocal, x, y + logoSz - 5);
        x += ctx.measureText(p.partido.equipoLocal).width + 6;

        ctx.font = mono(9); ctx.fillStyle = "#9CA3AF";
        ctx.fillText("vs", x, y + logoSz - 5); x += ctx.measureText("vs").width + 6;

        const vImg = logoMap[p.partido.equipoVisita];
        if (vImg) { ctx.drawImage(vImg, x, y, logoSz, logoSz); }
        x += logoSz + 4;
        ctx.font = mono(10, true); ctx.fillStyle = "#111827";
        ctx.fillText(p.partido.equipoVisita, x, y + logoSz - 5);
        y += 24;

        // Label resultado
        ctx.font = mono(10, true); ctx.fillStyle = colLabel;
        ctx.fillText(`      [${label}]`, pad + 18, y);
        y += lh + 4;
      }

      // Sep punteado
      y += 4;
      ctx.strokeStyle = "#D1D5DB"; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
      ctx.setLineDash([]); y += 14;

      // ── QR ────────────────────────────────────────────────────
      const qrImg = new Image();
      await new Promise<void>((res) => { qrImg.onload = () => res(); qrImg.src = qrDataUrl; });
      ctx.drawImage(qrImg, (W - qrSz) / 2, y, qrSz, qrSz);
      y += qrSz + 8;

      ctx.textAlign = "center";
      ctx.font = mono(9); ctx.fillStyle = "#6B7280";
      ctx.fillText("Escanea para consultar tus resultados", W / 2, y);
      y += 16;
      ctx.font = mono(10, true); ctx.fillStyle = "#C8894A";
      ctx.fillText("tablitasquinielas.net", W / 2, y);

      // ── Exportar / Compartir ──────────────────────────────────
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `quiniela-${quiniela.folio}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `Quiniela ${quiniela.folio}`, files: [file] });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl; a.download = `quiniela-${quiniela.folio}.png`; a.click();
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
          <a href="/" className="text-green-700 underline mt-4 inline-block">
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
      <div className="bg-green-800 text-white py-6 px-4 print:hidden">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">Quiniela Registrada</h1>
          <p className="text-green-200 text-sm mt-1">
            {quiniela.jornada.liga} · {quiniela.jornada.nombre ?? `Jornada ${quiniela.jornada.numero}`} · {quiniela.jornada.temporada}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Mensaje de éxito */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center print:hidden">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="text-green-800 font-bold text-lg">¡Quiniela registrada!</h2>
          <p className="text-green-600 text-sm">Guarda tu folio para consultar resultados</p>
        </div>

        {/* Ticket estilo boleta térmica */}
        <div id="ticket-receipt" className="flex justify-center">
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
                <p style={{ fontWeight: "bold", fontSize: "15px", letterSpacing: "2px", marginBottom: "2px" }}>
                  QUINIELAS MX
                </p>
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
              </div>

              {/* Separador */}
              <p style={{ borderTop: "1px dashed #d1d5db", margin: "8px 0" }} />

              {/* Pronósticos */}
              <p style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "11px" }}>PRONÓSTICOS:</p>
              <div style={{ marginBottom: "4px" }}>
                {[...quiniela.picks]
                  .sort((a, b) => a.partido.orden - b.partido.orden)
                  .map((pick, i) => {
                    const label = pick.prediccion === "1" ? "L" : pick.prediccion === "2" ? "V" : "E";
                    const acertado = (pick as { acertado?: boolean | null }).acertado;
                    const colorLabel =
                      acertado === true ? "#16a34a" :
                      acertado === false ? "#ef4444" : "#111827";
                    return (
                      <div key={pick.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", flex: 1, minWidth: 0 }}>
                          <span style={{ color: "#9ca3af", minWidth: "14px" }}>{i + 1}.</span>
                          <LogoEquipo equipo={pick.partido.equipoLocal} size={14} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }}>
                            {pick.partido.equipoLocal}
                          </span>
                          <span style={{ color: "#9ca3af", flexShrink: 0 }}>vs</span>
                          <LogoEquipo equipo={pick.partido.equipoVisita} size={14} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80px" }}>
                            {pick.partido.equipoVisita}
                          </span>
                        </div>
                        <span style={{
                          fontWeight: "bold",
                          color: colorLabel,
                          border: `1px solid ${colorLabel}`,
                          borderRadius: "3px",
                          padding: "0 5px",
                          marginLeft: "6px",
                          flexShrink: 0,
                          fontSize: "11px",
                        }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Separador */}
              <p style={{ borderTop: "1px dashed #d1d5db", margin: "8px 0" }} />

              {/* Total + QR */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: "#6b7280", fontSize: "10px" }}>TOTAL PAGADO</p>
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
          <p style={{ textAlign: "center", fontWeight: "bold", fontSize: "13pt", letterSpacing: "2px" }}>QUINIELAS MX</p>
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
          {[...quiniela.picks]
            .sort((a, b) => a.partido.orden - b.partido.orden)
            .map((pick, i) => {
              const label =
                pick.prediccion === "1" ? "LOCAL" :
                pick.prediccion === "2" ? "VISITA" : "EMPATE";
              return (
                <div key={pick.id} style={{ marginBottom: "3px" }}>
                  <p>{i + 1}. {norm(pick.partido.equipoLocal)} vs {norm(pick.partido.equipoVisita)}</p>
                  <p style={{ paddingLeft: "6mm" }}>[{label}]</p>
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
          {/* Compartir como imagen PNG */}
          <button
            onClick={generarYCompartirPNG}
            disabled={cargandoPNG || !qrDataUrl}
            className="w-full bg-[#25D366] hover:bg-[#20b858] disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {cargandoPNG ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            )}
            {cargandoPNG ? "Generando imagen..." : "Compartir ticket por WhatsApp"}
          </button>

          {/* Imprimir en térmica */}
          <button
            onClick={() => window.print()}
            className="w-full bg-green-800 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>🧾</span> Imprimir en Térmica
          </button>

          <a
            href="/consultar"
            className="block w-full text-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Consultar resultados
          </a>
          <a
            href="/reglamento"
            className="block w-full text-center text-green-600 text-sm font-medium py-2 hover:underline transition-colors"
          >
            📜 Ver reglamento
          </a>
          <a
            href="/"
            className="block w-full text-center text-green-700 font-semibold py-2 transition-colors"
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
