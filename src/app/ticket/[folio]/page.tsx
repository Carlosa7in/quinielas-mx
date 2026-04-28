"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function generarMensajeWhatsApp(quiniela: {
  folio: string;
  nombreCliente: string | null;
  monto: number;
  jornada: { numero: number; temporada: string };
  picks: { prediccion: string; partido: { equipoLocal: string; equipoVisita: string; orden: number } }[];
}): string {
  const picks = [...quiniela.picks]
    .sort((a, b) => a.partido.orden - b.partido.orden)
    .map((p, i) => `  ${i + 1}. ${p.partido.equipoLocal} vs ${p.partido.equipoVisita}: *${p.prediccion}*`)
    .join("\n");

  return (
    `⚽ *QUINIELAS MX — Ticket de Registro*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *Folio:* ${quiniela.folio}\n` +
    `👤 *Nombre:* ${quiniela.nombreCliente ?? "-"}\n` +
    `🏆 *Jornada ${quiniela.jornada.numero}* · ${quiniela.jornada.temporada}\n` +
    `💵 *Monto:* $${quiniela.monto.toFixed(2)} MXN\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `*Tus pronósticos:*\n${picks}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Consulta resultados en:\n` +
    `${typeof window !== "undefined" ? window.location.origin : ""}/consultar\n\n` +
    `_Conserva este mensaje como comprobante_ 🍀`
  );
}

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
  jornada: { numero: number; temporada: string };
  picks: Pick[];
};

export default function TicketPage() {
  const params = useParams();
  const folio = params.folio as string;
  const [quiniela, setQuiniela] = useState<Quiniela | null>(null);
  const [error, setError] = useState("");
  const [telefonoWA, setTelefonoWA] = useState("");
  const [mostrarWA, setMostrarWA] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const canShareFiles = typeof navigator !== "undefined" && !!navigator.canShare;

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

  const descargarPDF = async () => {
    const { jsPDF } = await import("jspdf");
    if (!quiniela) return;

    const doc = new jsPDF({ unit: "mm", format: [80, 200] });

    // Encabezado
    doc.setFillColor(22, 101, 52); // verde oscuro
    doc.rect(0, 0, 80, 25, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("QUINIELAS MX", 40, 8, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Liga MX · Jornada ${quiniela.jornada.numero} · ${quiniela.jornada.temporada}`, 40, 14, { align: "center" });
    doc.text(`Folio: ${quiniela.folio}`, 40, 20, { align: "center" });

    // Folio
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    doc.text("FOLIO:", 5, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(quiniela.folio, 40, 30, { align: "center" });

    // Datos del jugador
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Nombre: ${quiniela.nombreCliente || "-"}`, 5, 38);
    if (quiniela.telefonoCliente) {
      doc.text(`Tel: ${quiniela.telefonoCliente}`, 5, 43);
    }

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(5, 47, 75, 47);

    // Partidos
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    let y = 53;

    const sortedPicks = [...quiniela.picks].sort(
      (a, b) => a.partido.orden - b.partido.orden
    );

    for (const pick of sortedPicks) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`${pick.partido.equipoLocal} vs ${pick.partido.equipoVisita}`, 5, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 101, 52);
      const prediccionLabel =
        pick.prediccion === "1"
          ? `L (${pick.partido.equipoLocal})`
          : pick.prediccion === "2"
          ? `V (${pick.partido.equipoVisita})`
          : "E (Empate)";
      doc.text(prediccionLabel, 75, y, { align: "right" });
      y += 7;
    }

    // Total
    doc.line(5, y, 75, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Costo:", 5, y);
    doc.text(`$${quiniela.monto.toFixed(2)} MXN`, 75, y, { align: "right" });

    // Footer
    y += 10;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("Conserva este ticket para reclamar tu premio.", 40, y, { align: "center" });
    doc.text("quinielas.mx", 40, y + 4, { align: "center" });

    doc.save(`quiniela-${quiniela.folio}.pdf`);
  };

  const compartirQR = async () => {
    if (!quiniela || !qrDataUrl) return;

    // Convertir dataUrl a Blob/File
    const res = await fetch(qrDataUrl);
    const blob = await res.blob();
    const file = new File([blob], `quiniela-${quiniela.folio}.png`, { type: "image/png" });

    const mensaje = generarMensajeWhatsApp(quiniela);

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      // Web Share API con imagen — abre menú nativo del teléfono
      await navigator.share({
        title: `Quiniela ${quiniela.folio}`,
        text: mensaje,
        files: [file],
      });
    } else {
      // Fallback: descargar QR como PNG
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `quiniela-${quiniela.folio}.png`;
      link.click();
    }
  };

  const enviarWhatsApp = (telefono: string) => {
    if (!quiniela) return;
    const numero = telefono.replace(/\D/g, "");
    const mensaje = generarMensajeWhatsApp(quiniela);
    const url = `https://wa.me/52${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
    setMostrarWA(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-800 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold">Quiniela Registrada</h1>
          <p className="text-green-200 text-sm mt-1">
            Jornada {quiniela.jornada.numero} · {quiniela.jornada.temporada}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Mensaje de éxito */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">🎉</div>
          <h2 className="text-green-800 font-bold text-lg">¡Quiniela registrada!</h2>
          <p className="text-green-600 text-sm">Guarda tu folio para consultar resultados</p>
        </div>

        {/* Ticket */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          {/* Header verde */}
          <div className="bg-green-800 text-white p-4 text-center">
            <p className="text-xs text-green-300 font-mono">FOLIO</p>
            <p className="font-mono font-bold text-lg tracking-wider mt-1">{quiniela.folio}</p>
            <p className="text-green-200 text-xs mt-1">
              {quiniela.nombreCliente}
            </p>
          </div>

          {/* Partidos */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Pronósticos
            </h3>
            <div className="space-y-2">
              {[...quiniela.picks]
                .sort((a, b) => a.partido.orden - b.partido.orden)
                .map((pick) => (
                  <div key={pick.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {pick.partido.equipoLocal}{" "}
                      <span className="text-gray-400 text-xs">vs</span>{" "}
                      {pick.partido.equipoVisita}
                    </span>
                    <span className="bg-green-100 text-green-800 font-bold text-xs px-2 py-1 rounded ml-2">
                      {pick.prediccion === "1"
                        ? "L"
                        : pick.prediccion === "2"
                        ? "V"
                        : "E"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Total + QR */}
          <div className="border-t border-dashed border-gray-200 p-4 flex justify-between items-center">
            <div>
              <span className="text-gray-600 text-sm block">Costo pagado:</span>
              <span className="font-bold text-green-700">${quiniela.monto.toFixed(2)} MXN</span>
            </div>
            {qrDataUrl && (
              <div className="text-center">
                <img src={qrDataUrl} alt="QR Quiniela" className="w-16 h-16" />
                <p className="text-xs text-gray-400 mt-0.5">Consultar</p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-3">
          {/* Imprimir ticket */}
          <button
            onClick={descargarPDF}
            className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>🖨️</span> Imprimir Ticket PDF
          </button>

          {/* Enviar por WhatsApp */}
          {!mostrarWA ? (
            <div className="space-y-2">
              {/* Compartir QR (Web Share API) */}
              <button
                onClick={compartirQR}
                className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {canShareFiles ? "Compartir QR por WhatsApp" : "Descargar QR PNG"}
              </button>

              {/* Enviar solo texto (wa.me) */}
              <button
                onClick={() => {
                  if (quiniela.telefonoCliente) {
                    enviarWhatsApp(quiniela.telefonoCliente);
                  } else {
                    setMostrarWA(true);
                  }
                }}
                className="w-full bg-white border border-[#25D366] hover:bg-green-50 text-[#25D366] font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar solo texto por WhatsApp
              </button>
            </div>
          ) : (
            <div className="bg-[#f0fdf4] border border-[#25D366] rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Número de WhatsApp del cliente
              </p>
              <div className="flex gap-2">
                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 text-sm text-gray-500 font-medium">
                  🇲🇽 +52
                </div>
                <input
                  type="tel"
                  placeholder="55 1234 5678"
                  value={telefonoWA}
                  onChange={(e) => setTelefonoWA(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarWA(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2 rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => enviarWhatsApp(telefonoWA)}
                  disabled={telefonoWA.replace(/\D/g, "").length < 10}
                  className="flex-1 bg-[#25D366] hover:bg-[#20b858] disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                >
                  Enviar
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Abre WhatsApp con el mensaje listo para enviar
              </p>
            </div>
          )}

          <a
            href="/consultar"
            className="block w-full text-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Consultar resultados
          </a>
          <a
            href="/"
            className="block w-full text-center text-green-700 font-semibold py-2 transition-colors"
          >
            Volver al inicio
          </a>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Conserva tu folio para reclamar tu premio en caso de ganar.
        </p>
      </div>
    </div>
  );
}
