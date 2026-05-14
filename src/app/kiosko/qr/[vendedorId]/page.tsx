"use client";
import { useState, useEffect, use } from "react";

export default function QRPrintPage({ params }: { params: Promise<{ vendedorId: string }> }) {
  const { vendedorId } = use(params);
  const [puntoVenta, setPuntoVenta] = useState<string>("");
  const [cargando, setCargando] = useState(true);

  const kioskUrl = typeof window !== "undefined"
    ? `${window.location.origin}/kiosko/${vendedorId}`
    : `https://tablitasquinielas.com/kiosko/${vendedorId}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(kioskUrl)}&bgcolor=ffffff&color=1a1a1a&margin=16&format=png`;

  useEffect(() => {
    fetch(`/api/kiosko?vendedorId=${vendedorId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setPuntoVenta(d.vendedor?.puntoVenta ?? d.vendedor?.nombre ?? "");
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [vendedorId]);

  const imprimir = () => window.print();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <>
      {/* Estilos de impresión — ocultan el botón y ajustan márgenes */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.5cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Botón de imprimir — solo visible en pantalla */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={imprimir}
          className="bg-brand text-white font-bold px-5 py-2.5 rounded-xl shadow-lg hover:opacity-90 transition flex items-center gap-2"
        >
          🖨️ Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-100 text-gray-600 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-200 transition"
        >
          ✕ Cerrar
        </button>
      </div>

      {/* Hoja imprimible */}
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm mx-auto text-center space-y-6">

          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-tablitas.png"
            alt="Tablitas Quinielas"
            className="h-14 mx-auto object-contain"
          />

          {/* Título */}
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-gray-900 leading-tight">
              ¡Llena tu quiniela<br />desde tu celular!
            </h1>
            {puntoVenta && (
              <p className="text-sm text-gray-500 font-medium">{puntoVenta}</p>
            )}
          </div>

          {/* QR */}
          <div className="flex justify-center">
            <div className="border-4 border-gray-900 rounded-2xl p-3 inline-block bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Kiosko"
                width={220}
                height={220}
                className="block"
              />
            </div>
          </div>

          {/* Instrucciones breves */}
          <div className="bg-gray-50 rounded-2xl px-5 py-4 text-left space-y-2.5">
            {[
              { icon: "📱", text: "Escanea el código con tu cámara" },
              { icon: "⚽", text: "Selecciona tus picks (Local · Empate · Visitante)" },
              { icon: "2️⃣", text: "Puedes elegir 2 o 3 opciones para dobles y triples" },
              { icon: "✅", text: "Envía tus picks y muéstraselos al vendedor para pagar" },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5">{icon}</span>
                <p className="text-sm text-gray-700 leading-snug">{text}</p>
              </div>
            ))}
          </div>

          {/* URL por si no puede escanear */}
          <div className="space-y-1">
            <p className="text-xs text-gray-400">¿No puedes escanear? Entra a:</p>
            <p className="text-xs font-mono text-gray-600 break-all bg-gray-100 rounded-lg px-3 py-2">{kioskUrl}</p>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-300">tablitasquinielas.com · $20 por quiniela</p>
        </div>
      </div>
    </>
  );
}
