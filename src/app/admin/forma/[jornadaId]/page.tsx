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
  nombre: string | null;
  temporada: string;
  liga: string;
  partidos: Partido[];
};

// Normalizar caracteres para impresoras térmicas sin soporte UTF-8 completo
function norm(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function CornerMarker({ position }: { position: string }) {
  return (
    <div className={`absolute w-10 h-10 ${position}`} style={{ lineHeight: 0 }}>
      <div className="w-full h-full border-4 border-black bg-white flex items-center justify-center">
        <div className="w-4 h-4 bg-black" />
      </div>
    </div>
  );
}

const OPCIONES = ["1", "X", "2"];

function generarAleatorio(partidos: Partido[]): Record<string, string> {
  const picks: Record<string, string> = {};
  for (const p of partidos) picks[p.id] = OPCIONES[Math.floor(Math.random() * 3)];
  return picks;
}

/* ─── Forma carta (148mm) ─── */
function FormaCarta({ jornada, picks }: { jornada: Jornada; picks: Record<string, string> }) {
  const tienepicks = Object.keys(picks).length > 0;
  const partidos = [...jornada.partidos].sort((a, b) => a.orden - b.orden);

  return (
    <div
      className="relative bg-white mx-auto my-0 print:break-after-page forma-hoja"
      style={{
        width: "100%", maxWidth: "148mm", minHeight: "200mm",
        padding: "8mm", fontFamily: "Arial, sans-serif",
        border: "1px solid #ccc", pageBreakInside: "avoid", boxSizing: "border-box",
      }}
    >
      <CornerMarker position="top-2 left-2" />
      <CornerMarker position="top-2 right-2" />
      <CornerMarker position="bottom-2 left-2" />
      <CornerMarker position="bottom-2 right-2" />

      {/* Encabezado */}
      <div className="text-center mb-2 pt-2" style={{ borderBottom: "2px solid #000", paddingBottom: "4px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "44px", objectFit: "contain", margin: "0 auto 2px", display: "block" }} />
        <p style={{ fontSize: "8.5pt", fontWeight: "bold" }}>
          {jornada.liga} · {jornada.nombre ?? `Jornada ${jornada.numero}`} · {jornada.temporada}
        </p>
        <p style={{ fontSize: "7.5pt", color: "#333" }}>
          {tienepicks ? "✦ Forma con picks pre-seleccionados ✦" : "Costo: $20 MXN — Marca con pluma o bolígrafo"}
        </p>
      </div>

      {/* Instrucciones */}
      <div style={{ border: "1.5px solid #000", borderRadius: "3px", padding: "2px 6px", marginBottom: "4px", fontSize: "7pt", fontWeight: "bold", textAlign: "center" }}>
        L = Gana Local &nbsp;|&nbsp; E = Empate &nbsp;|&nbsp; V = Gana Visita
      </div>

      {/* Cabecera */}
      <div className="flex" style={{ fontSize: "7pt", fontWeight: "900", borderBottom: "2px solid #000", borderTop: "1px solid #000", padding: "2px 0", marginBottom: "1px" }}>
        <div style={{ width: "5mm" }} />
        <div style={{ flex: 1 }}>PARTIDO</div>
        <div style={{ width: "13mm", textAlign: "center" }}>L</div>
        <div style={{ width: "13mm", textAlign: "center" }}>E</div>
        <div style={{ width: "13mm", textAlign: "center" }}>V</div>
      </div>

      {/* Partidos */}
      {partidos.map((partido, i) => {
        const seleccionado = picks[partido.id];
        return (
          <div key={partido.id} className="flex items-center" style={{ borderBottom: "1px solid #bbb", paddingTop: "2px", paddingBottom: "2px" }}>
            <span style={{ fontSize: "6pt", width: "5mm", textAlign: "center", flexShrink: 0, color: "#555" }}>{i + 1}</span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "3px" }}>
              <LogoEquipo equipo={partido.equipoLocal} size={14} />
              <strong style={{ fontSize: "6.5pt" }}>{partido.equipoLocal}</strong>
            </div>
            <span style={{ fontSize: "6pt", width: "5mm", textAlign: "center", flexShrink: 0 }}>vs</span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "3px" }}>
              <LogoEquipo equipo={partido.equipoVisita} size={14} />
              <strong style={{ fontSize: "6.5pt" }}>{partido.equipoVisita}</strong>
            </div>
            {["1", "X", "2"].map((op, j) => {
              const etiqueta = ["L", "E", "V"][j];
              const esSel = seleccionado === op;
              return (
                <div key={op} style={{ width: "13mm", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <div style={{
                    width: "9mm", height: "8mm",
                    border: esSel ? "3px solid #000" : "1.5px solid #555",
                    borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: esSel ? "9pt" : "7pt", fontWeight: "bold", color: esSel ? "#000" : "#aaa",
                  }}>
                    {etiqueta}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Datos cliente */}
      <div className="mt-3" style={{ fontSize: "7.5pt" }}>
        <div style={{ marginBottom: "6px" }}>
          <span style={{ whiteSpace: "nowrap" }}>Nombre:</span>
          <div style={{ borderBottom: "1px solid black", height: "10mm", marginTop: "1px" }} />
        </div>
        <div>
          <span style={{ whiteSpace: "nowrap" }}>Teléfono:</span>
          <div style={{ borderBottom: "1px solid black", height: "10mm", marginTop: "1px" }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-end mt-3">
        <p style={{ fontSize: "6pt", color: "#444", maxWidth: "80mm" }}>
          Esta forma no es comprobante. Al pagar en caja recibirás tu ticket oficial con folio.
        </p>
        <div style={{ width: "18mm", height: "18mm", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9pt", fontWeight: "bold" }}>
          {jornada.nombre ?? `J${jornada.numero}`}
        </div>
      </div>
    </div>
  );
}

/* ─── Forma ticket 80mm ─── */
function FormaTicket({ jornada, picks }: { jornada: Jornada; picks: Record<string, string> }) {
  const tienepicks = Object.keys(picks).length > 0;
  const partidos = [...jornada.partidos].sort((a, b) => a.orden - b.orden);

  return (
    <div
      className="bg-white mx-auto my-0 print:break-after-page forma-ticket"
      style={{
        width: "100%", maxWidth: "72mm",
        padding: "4mm", fontFamily: "'Courier New', Courier, monospace",
        border: "1px dashed #999", pageBreakInside: "avoid", boxSizing: "border-box",
      }}
    >
      {/* Encabezado — sin emojis ni acentos para compatibilidad térmica */}
      <div style={{ textAlign: "center", borderBottom: "1px solid #000", paddingBottom: "3px", marginBottom: "4px" }}>
        <p style={{ fontSize: "11pt", fontWeight: "900", letterSpacing: "2px" }}>TABLITAS QUINIELAS</p>
        <p style={{ fontSize: "7.5pt", fontWeight: "bold" }}>{norm(jornada.liga)}</p>
        <p style={{ fontSize: "7.5pt" }}>
          {norm(jornada.nombre ?? `Jornada ${jornada.numero}`)} * {norm(jornada.temporada)}
        </p>
        {!tienepicks
          ? <p style={{ fontSize: "7pt", marginTop: "2px" }}>$20 MXN - Marca con pluma</p>
          : <p style={{ fontSize: "7pt", marginTop: "2px" }}>*** PICKS PRE-SELECCIONADOS ***</p>
        }
      </div>

      {/* Leyenda */}
      <p style={{ fontSize: "7pt", fontWeight: "bold", textAlign: "center", marginBottom: "3px", borderBottom: "1px dashed #000", paddingBottom: "2px" }}>
        [ L=Local  E=Empate  V=Visita ]
      </p>

      {/* Partidos — 2 líneas: nombre arriba, casillas abajo (sin logos) */}
      {partidos.map((partido, i) => {
        const sel = picks[partido.id];
        const L = sel === "1" ? "[*]" : "[ ]";
        const E = sel === "X" ? "[*]" : "[ ]";
        const V = sel === "2" ? "[*]" : "[ ]";
        return (
          <div key={partido.id} style={{ marginBottom: "4px", borderBottom: "1px dotted #bbb", paddingBottom: "3px" }}>
            {/* Línea 1: número y equipos */}
            <p style={{ fontSize: "7.5pt", fontWeight: "bold", margin: 0 }}>
              <span style={{ color: "#555" }}>{i + 1}.</span>{" "}
              {norm(partido.equipoLocal)} vs {norm(partido.equipoVisita)}
            </p>
            {/* Línea 2: casillas L E V */}
            <p style={{ fontSize: "9pt", fontWeight: "bold", paddingLeft: "6mm", margin: "2px 0 0" }}>
              L{L}{"  "}E{E}{"  "}V{V}
            </p>
          </div>
        );
      })}

      {/* Datos cliente */}
      <div style={{ borderTop: "1px dashed #000", paddingTop: "6px", marginTop: "6px", fontSize: "7.5pt" }}>
        <p style={{ margin: "0 0 2px" }}>Nombre:</p>
        <div style={{ borderBottom: "1px solid #000", height: "16mm", marginBottom: "6px" }} />
        <p style={{ margin: "0 0 2px" }}>Telefono:</p>
        <div style={{ borderBottom: "1px solid #000", height: "16mm" }} />
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", borderTop: "1px solid #000", marginTop: "4px", paddingTop: "3px", fontSize: "6.5pt" }}>
        <p style={{ margin: 0 }}>No valido como comprobante de pago.</p>
        <p style={{ margin: 0 }}>{norm(jornada.nombre ?? `Jornada ${jornada.numero}`)} * quinielas.mx</p>
      </div>
    </div>
  );
}

/* ─── Página principal ─── */
export default function FormaPage() {
  const params = useParams();
  const jornadaId = params.jornadaId as string;
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [modo, setModo] = useState<"carta" | "ticket">("ticket");
  const [formasPicks, setFormasPicks] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    fetch(`/api/jornadas?id=${jornadaId}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setJornada(data); });
  }, [jornadaId]);

  useEffect(() => {
    if (!jornada) return;
    setFormasPicks((prev) => Array.from({ length: cantidad }, (_, i) => prev[i] ?? {}));
  }, [cantidad, jornada]);

  const rellenarAleatorio = (idx: number) => {
    if (!jornada) return;
    setFormasPicks((prev) => { const n = [...prev]; n[idx] = generarAleatorio(jornada.partidos); return n; });
  };

  const rellenarTodosAleatorio = () => {
    if (!jornada) return;
    setFormasPicks(Array.from({ length: cantidad }, () => generarAleatorio(jornada.partidos)));
  };

  const limpiar = (idx: number) => {
    setFormasPicks((prev) => { const n = [...prev]; n[idx] = {}; return n; });
  };

  // Inyectar @page dinámico según modo de impresión
  const handlePrint = () => {
    if (modo === "ticket") {
      const s = document.createElement("style");
      s.id = "__page-size-ticket";
      s.textContent = "@page { size: 80mm auto; margin: 0; }";
      document.head.appendChild(s);
      setTimeout(() => {
        window.print();
        document.getElementById("__page-size-ticket")?.remove();
      }, 80);
    } else {
      window.print();
    }
  };

  if (!jornada) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-400">Cargando forma...</p></div>;
  }

  return (
    <>
      {/* Controles */}
      <div className="print:hidden bg-brand text-white py-3 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <a href="/admin/forma" className="text-amber-400 text-sm">← Formas</a>
              <p className="font-bold mt-0.5">
                {jornada.liga} · {jornada.nombre ?? `Jornada ${jornada.numero}`}
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="bg-yellow-400 text-green-900 font-bold px-5 py-2 rounded-lg text-sm"
            >
              🖨️ Imprimir
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-brand/50 rounded-xl p-3">
            {/* Tipo de impresora */}
            <div className="flex rounded-lg overflow-hidden border border-amber-700 text-sm">
              <button
                onClick={() => setModo("ticket")}
                className={`px-3 py-1.5 font-semibold transition-colors ${modo === "ticket" ? "bg-yellow-400 text-amber-950" : "text-amber-400 hover:bg-amber-700"}`}
              >
                🧾 Ticket 80mm
              </button>
              <button
                onClick={() => setModo("carta")}
                className={`px-3 py-1.5 font-semibold transition-colors ${modo === "carta" ? "bg-yellow-400 text-amber-950" : "text-amber-400 hover:bg-amber-700"}`}
              >
                📄 Hoja carta
              </button>
            </div>

            {/* Cantidad */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-amber-400">Formas:</span>
              <button onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="w-7 h-7 rounded-full bg-amber-700 hover:bg-amber-600 font-bold text-lg leading-none">−</button>
              <span className="font-bold text-lg w-6 text-center">{cantidad}</span>
              <button onClick={() => setCantidad((c) => Math.min(50, c + 1))} className="w-7 h-7 rounded-full bg-amber-700 hover:bg-amber-600 font-bold text-lg leading-none">+</button>
            </div>

            <button onClick={rellenarTodosAleatorio} className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-4 py-1.5 rounded-lg text-sm">
              🎲 Rellenar todas al azar
            </button>

            <button onClick={() => setFormasPicks(Array.from({ length: cantidad }, () => ({})))} className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-1.5 rounded-lg text-sm">
              Limpiar todas
            </button>
          </div>
        </div>
      </div>

      {/* Formas */}
      <div className={modo === "ticket" ? "py-2" : ""}>
        {Array.from({ length: cantidad }, (_, idx) => {
          const picks = formasPicks[idx] ?? {};
          const tienepicks = Object.keys(picks).length > 0;

          return (
            <div key={idx}>
              {/* Controles individuales */}
              <div className={`print:hidden mx-auto mt-3 mb-1 flex items-center justify-between px-1 ${modo === "ticket" ? "max-w-[72mm]" : "w-full max-w-[148mm]"}`}>
                <span className="text-xs text-gray-400 font-medium">Forma #{idx + 1}</span>
                <div className="flex gap-2">
                  <button onClick={() => rellenarAleatorio(idx)} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1 rounded-lg">
                    🎲 Aleatorio
                  </button>
                  {tienepicks && (
                    <button onClick={() => limpiar(idx)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg">
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {modo === "ticket"
                ? <FormaTicket jornada={jornada} picks={picks} />
                : <FormaCarta jornada={jornada} picks={picks} />
              }
            </div>
          );
        })}
      </div>

      <style>{`
        html, body { overflow-x: hidden; }
        @media print {
          body { margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .forma-hoja {
            width: 148mm !important;
            max-width: 148mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          .forma-ticket {
            width: 72mm !important;
            max-width: 72mm !important;
            border: none !important;
            padding: 4mm !important;
          }
          /* Quitar logos en cualquier modo de impresión */
          img { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
