"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LogoEquipo } from "@/components/LogoEquipo";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  fechaHora: string;
  orden: number;
};

type Jornada = {
  id: string;
  numero: number;
  temporada: string;
  partidos: Partido[];
};

// Marcador de esquina estilo ArUco simplificado (cuadrado con patrón interno)
function CornerMarker({ position }: { position: string }) {
  return (
    <div
      className={`absolute w-10 h-10 ${position}`}
      style={{ lineHeight: 0 }}
    >
      {/* Borde externo negro */}
      <div className="w-full h-full border-4 border-black bg-white flex items-center justify-center">
        {/* Cuadrado interno negro — patrón único para OpenCV */}
        <div className="w-4 h-4 bg-black" />
      </div>
    </div>
  );
}

const OPCIONES = ["1", "X", "2"];

function generarAleatorio(partidos: Partido[]): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const p of partidos) {
    picks[p.id] = OPCIONES[Math.floor(Math.random() * 3)];
  }
  return picks;
}

export default function FormaPage() {
  const params = useParams();
  const jornadaId = params.jornadaId as string;
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [cantidad, setCantidad] = useState(1);
  // picks[formIdx][partidoId] = "1"|"X"|"2"|""
  const [formasPicks, setFormasPicks] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    fetch("/api/jornadas")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setJornada(data); });
  }, [jornadaId]);

  // Sincronizar formasPicks cuando cambia cantidad o jornada
  useEffect(() => {
    if (!jornada) return;
    setFormasPicks((prev) => {
      const nuevas = Array.from({ length: cantidad }, (_, i) => prev[i] ?? {});
      return nuevas;
    });
  }, [cantidad, jornada]);

  const rellenarAleatorio = (idx: number) => {
    if (!jornada) return;
    setFormasPicks((prev) => {
      const nuevas = [...prev];
      nuevas[idx] = generarAleatorio(jornada.partidos);
      return nuevas;
    });
  };

  const rellenarTodosAleatorio = () => {
    if (!jornada) return;
    setFormasPicks(Array.from({ length: cantidad }, () => generarAleatorio(jornada.partidos)));
  };

  const limpiar = (idx: number) => {
    setFormasPicks((prev) => {
      const nuevas = [...prev];
      nuevas[idx] = {};
      return nuevas;
    });
  };

  const imprimir = () => window.print();

  if (!jornada) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Cargando forma...</p>
      </div>
    );
  }

  return (
    <>
      {/* Controles — solo visibles en pantalla */}
      <div className="print:hidden bg-green-800 text-white py-3 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <a href="/admin/tienda" className="text-green-300 text-sm">← Tienda</a>
              <p className="font-bold mt-0.5">
                Imprimir Formas · Jornada {jornada.numero}
              </p>
            </div>
            <button
              onClick={imprimir}
              className="bg-yellow-400 text-green-900 font-bold px-5 py-2 rounded-lg text-sm"
            >
              🖨️ Imprimir
            </button>
          </div>

          {/* Controles de cantidad y aleatorio */}
          <div className="flex flex-wrap items-center gap-3 bg-green-900/50 rounded-xl p-3">
            {/* Cantidad */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-300">Formas:</span>
              <button
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="w-7 h-7 rounded-full bg-green-700 hover:bg-green-600 font-bold text-lg leading-none"
              >−</button>
              <span className="font-bold text-lg w-6 text-center">{cantidad}</span>
              <button
                onClick={() => setCantidad((c) => Math.min(20, c + 1))}
                className="w-7 h-7 rounded-full bg-green-700 hover:bg-green-600 font-bold text-lg leading-none"
              >+</button>
            </div>

            {/* Aleatorio global */}
            <button
              onClick={rellenarTodosAleatorio}
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-4 py-1.5 rounded-lg text-sm"
            >
              🎲 Rellenar todas al azar
            </button>

            <button
              onClick={() => setFormasPicks(Array.from({ length: cantidad }, () => ({})))}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-1.5 rounded-lg text-sm"
            >
              Limpiar todas
            </button>
          </div>
        </div>
      </div>

      {/* FORMAS IMPRIMIBLES */}
      {Array.from({ length: cantidad }, (_, idx) => {
        const picks = formasPicks[idx] ?? {};
        const tienepicks = Object.keys(picks).length > 0;

        return (
          <div key={idx}>
            {/* Controles individuales por forma — solo en pantalla */}
            <div className="print:hidden max-w-[148mm] mx-auto mt-4 mb-1 flex items-center justify-between px-1">
              <span className="text-xs text-gray-400 font-medium">Forma #{idx + 1}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => rellenarAleatorio(idx)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1 rounded-lg"
                >
                  🎲 Aleatorio
                </button>
                {tienepicks && (
                  <button
                    onClick={() => limpiar(idx)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div
              className="relative bg-white mx-auto my-0 print:break-after-page"
              style={{
                width: "148mm",
                minHeight: "200mm",
                padding: "8mm",
                fontFamily: "Arial, sans-serif",
                border: "1px solid #ccc",
                pageBreakInside: "avoid",
              }}
            >
              {/* Marcadores de esquina para OpenCV */}
              <CornerMarker position="top-2 left-2" />
              <CornerMarker position="top-2 right-2" />
              <CornerMarker position="bottom-2 left-2" />
              <CornerMarker position="bottom-2 right-2" />

              {/* Encabezado */}
              <div className="text-center mb-3 pt-2">
                <p className="font-bold" style={{ fontSize: "14pt" }}>
                  ⚽ QUINIELAS MX
                </p>
                <p style={{ fontSize: "9pt", color: "#555" }}>
                  Jornada {jornada.numero} · {jornada.temporada} · Liga MX
                </p>
                <p style={{ fontSize: "8pt", color: "#555" }}>
                  {tienepicks
                    ? "✦ Forma con picks pre-seleccionados ✦"
                    : "Costo: $20 MXN — Marca con pluma o bolígrafo"}
                </p>
              </div>

              {/* Instrucciones */}
              <div
                className="mb-2 px-2 py-1 rounded text-center"
                style={{ backgroundColor: "#1e3a5f", color: "#fff", fontSize: "7pt", fontWeight: "bold" }}
              >
                L = Gana Local &nbsp;|&nbsp; E = Empate &nbsp;|&nbsp; V = Gana Visita
              </div>

              {/* Cabecera columnas */}
              <div
                className="flex mb-1"
                style={{ fontSize: "7pt", fontWeight: "bold", backgroundColor: "#1e3a5f", color: "#fff", padding: "2px 0" }}
              >
                <div style={{ flex: 1, paddingLeft: "2px" }}>PARTIDO</div>
                <div style={{ width: "16mm", textAlign: "center" }}>L</div>
                <div style={{ width: "16mm", textAlign: "center" }}>E</div>
                <div style={{ width: "16mm", textAlign: "center" }}>V</div>
              </div>

              {/* Partidos */}
              {jornada.partidos.map((partido, i) => {
                const seleccionado = picks[partido.id];
                const colorFila = i % 2 === 0 ? "#fff" : "#f5f8ff";
                return (
                  <div
                    key={partido.id}
                    className="flex items-center"
                    style={{
                      borderBottom: "1px solid #ddd",
                      paddingTop: "2px",
                      paddingBottom: "2px",
                      backgroundColor: colorFila,
                    }}
                  >
                    {/* Número */}
                    <span style={{ color: "#999", fontSize: "6pt", width: "5mm", textAlign: "center", flexShrink: 0 }}>
                      {i + 1}
                    </span>

                    {/* Logo local + nombre */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "3px", fontSize: "7pt" }}>
                      <LogoEquipo equipo={partido.equipoLocal} size={16} />
                      <strong style={{ fontSize: "6.5pt" }}>{partido.equipoLocal}</strong>
                    </div>

                    <span style={{ fontSize: "6pt", color: "#888", width: "5mm", textAlign: "center", flexShrink: 0 }}>vs</span>

                    {/* Logo visita + nombre */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "3px", fontSize: "7pt" }}>
                      <LogoEquipo equipo={partido.equipoVisita} size={16} />
                      <strong style={{ fontSize: "6.5pt" }}>{partido.equipoVisita}</strong>
                    </div>

                    {/* Casillas L / E / V */}
                    {["1", "X", "2"].map((op, j) => {
                      const etiqueta = ["L", "E", "V"][j];
                      const esSel = seleccionado === op;
                      return (
                        <div
                          key={op}
                          style={{ width: "16mm", display: "flex", justifyContent: "center", alignItems: "center" }}
                        >
                          <div
                            style={{
                              width: "10mm",
                              height: "9mm",
                              border: "2px solid #1e3a5f",
                              borderRadius: "2px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "9pt",
                              fontWeight: "bold",
                              backgroundColor: esSel ? "#1e3a5f" : "#fff",
                              color: esSel ? "#fff" : "#ccc",
                            }}
                          >
                            {etiqueta}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Datos del cliente */}
              <div className="mt-3" style={{ fontSize: "7.5pt" }}>
                <div className="flex gap-2 mb-1">
                  <span style={{ whiteSpace: "nowrap" }}>Nombre:</span>
                  <div style={{ flex: 1, borderBottom: "1px solid black" }} />
                </div>
                <div className="flex gap-2">
                  <span style={{ whiteSpace: "nowrap" }}>Teléfono:</span>
                  <div style={{ flex: 1, borderBottom: "1px solid black" }} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-end mt-3">
                <p style={{ fontSize: "6pt", color: "#aaa", maxWidth: "80mm" }}>
                  Esta forma no es comprobante. Al pagar en caja recibirás tu ticket oficial con folio.
                </p>
                <div
                  style={{
                    width: "18mm", height: "18mm", border: "2px solid black",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "5pt", textAlign: "center", color: "#666",
                  }}
                >
                  J{jornada.numero}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  );
}
