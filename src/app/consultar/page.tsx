"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { LogoEquipo } from "@/components/LogoEquipo";
import { Suspense } from "react";

type Pick = {
  id: string;
  partidoId: string;
  prediccion: string;
  acertado: boolean | null;
  partido: {
    equipoLocal: string;
    equipoVisita: string;
    orden: number;
    resultado: string | null;
    golesLocal: number | null;
    golesVisita: number | null;
  };
};

// Grupo de picks del mismo partido (sencillo, doble o triple)
type PartidoGroup = {
  orden: number;
  equipoLocal: string;
  equipoVisita: string;
  resultado: string | null;
  golesLocal: number | null;
  golesVisita: number | null;
  predicciones: string[];
  acertados: (boolean | null)[];
};

function agruparPicks(picks: Pick[]): PartidoGroup[] {
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
        resultado: pick.partido.resultado,
        golesLocal: pick.partido.golesLocal,
        golesVisita: pick.partido.golesVisita,
        predicciones: [pick.prediccion],
        acertados: [pick.acertado],
      });
    }
  }
  return grupos;
}

type Quiniela = {
  folio: string;
  nombreCliente: string | null;
  estado: string;
  aciertos: number | null;
  monto: number;
  jornada: { numero: number; nombre: string | null; temporada: string; liga: string };
  picks: Pick[];
};

type Partido = {
  id: string;
  orden: number;
  equipoLocal: string;
  equipoVisita: string;
  resultado: string | null;
  golesLocal: number | null;
  golesVisita: number | null;
};


const LABEL: Record<string, string> = { "1": "L", "X": "E", "2": "V" };

function estadoBadge(estado: string) {
  if (estado === "ganadora") return "bg-green-500 text-white";
  if (estado === "perdedora") return "bg-red-400 text-white";
  return "bg-yellow-400 text-green-900";
}

function pickBadge(acertado: boolean | null) {
  if (acertado === true) return "bg-green-500 text-white";
  if (acertado === false) return "bg-red-400 text-white";
  return "bg-gray-100 text-gray-700";
}

// Devuelve clases CSS según si el grupo de picks está acertado/fallido/pendiente
function groupBadge(acertados: (boolean | null)[]) {
  if (acertados.some((a) => a === true)) return "bg-green-500 text-white";
  if (acertados.every((a) => a === false)) return "bg-red-400 text-white";
  return "bg-gray-100 text-gray-700";
}

/* ─── Detalle de una quiniela ─── */
function DetalleQuiniela({ q, onBack }: { q: Quiniela; onBack?: () => void }) {
  const grupos = agruparPicks(q.picks);
  const hayResultados = grupos.some((g) => g.resultado !== null);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-brand text-white p-4">
        {onBack && (
          <button onClick={onBack} className="text-amber-400 text-sm mb-2 flex items-center gap-1">
            ← Mis quinielas
          </button>
        )}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-amber-400 text-xs font-mono">{q.folio}</p>
            <p className="font-bold text-lg">{q.nombreCliente ?? "—"}</p>
            <p className="text-amber-400 text-xs mt-0.5">
              {q.jornada.liga} · {q.jornada.nombre ?? `Jornada ${q.jornada.numero}`} · {q.jornada.temporada}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize shrink-0 ${estadoBadge(q.estado)}`}>
            {q.estado}
          </span>
        </div>

        {q.aciertos !== null && (
          <div className="mt-3 bg-white/10 rounded-xl py-2 text-center">
            <span className="text-3xl font-black text-yellow-300">{q.aciertos}</span>
            <span className="text-amber-300/70 text-sm"> / {grupos.length} aciertos</span>
          </div>
        )}
      </div>

      {/* Picks agrupados por partido */}
      <div className="divide-y divide-gray-50">
        {grupos.map((g, i) => {
          const marcador = g.golesLocal !== null && g.golesVisita !== null ? `${g.golesLocal}-${g.golesVisita}` : null;
          const label = g.predicciones.map((p) => LABEL[p]).join("/");
          const esDoble = g.predicciones.length === 2;
          const esTriple = g.predicciones.length >= 3;

          return (
            <div key={i} className="px-4 py-2.5 flex items-center gap-2">
              <span className="text-gray-300 text-xs w-5 text-right shrink-0">{i + 1}</span>

              {/* Equipo local */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="text-xs text-gray-700 truncate text-right">{g.equipoLocal}</span>
                <LogoEquipo equipo={g.equipoLocal} size={22} />
              </div>

              {/* Marcador central */}
              <div className="flex flex-col items-center shrink-0 w-14">
                {marcador ? (
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">{marcador}</span>
                ) : (
                  <span className="text-gray-300 text-xs">vs</span>
                )}
              </div>

              {/* Equipo visita */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <LogoEquipo equipo={g.equipoVisita} size={22} />
                <span className="text-xs text-gray-700 truncate">{g.equipoVisita}</span>
              </div>

              {/* Pick(s) del usuario — doble/triple en un solo badge */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <span className={`text-xs font-bold px-2 h-7 flex items-center justify-center rounded-lg ${groupBadge(g.acertados)}`}>
                  {label}
                </span>
                {(esDoble || esTriple) && (
                  <span className="text-amber-600 text-[9px] font-bold leading-none">
                    {esTriple ? "TRIPLE" : "DOBLE"}
                  </span>
                )}
              </div>

              {/* Resultado real */}
              {g.resultado && (
                <span className="text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg shrink-0 bg-gray-100 text-gray-500">
                  {LABEL[g.resultado]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!hayResultados && (
        <div className="p-4 bg-yellow-50 text-yellow-700 text-sm text-center">
          ⏳ Los resultados se publicarán al terminar la jornada
        </div>
      )}

      <div className="p-3 bg-gray-50 text-center">
        <a href={`/ticket/${q.folio}`} className="text-green-700 text-sm font-semibold hover:underline">
          Ver ticket completo →
        </a>
      </div>
    </div>
  );
}

/* ─── Tarjeta resumen en lista ─── */
function TarjetaQuiniela({ q, onClick }: { q: Quiniela; onClick: () => void }) {
  const grupos = agruparPicks(q.picks);
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition-shadow border-2 border-transparent hover:border-amber-200"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-xs text-gray-400 font-mono">{q.folio}</p>
          <p className="font-bold text-gray-800 text-sm">
            {q.jornada.liga} · {q.jornada.nombre ?? `Jornada ${q.jornada.numero}`}
          </p>
          <p className="text-xs text-gray-400">{q.jornada.temporada}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${estadoBadge(q.estado)}`}>
            {q.estado}
          </span>
          {q.aciertos !== null && (
            <span className="text-xs text-gray-500">{q.aciertos}/{grupos.length} ✓</span>
          )}
        </div>
      </div>
      {/* Mini picks agrupados por partido (doble = "L/E", triple = "L/E/V") */}
      <div className="flex gap-1 flex-wrap mt-1">
        {grupos.map((g, i) => (
          <span key={i} className={`text-xs font-bold px-1.5 h-6 flex items-center justify-center rounded ${groupBadge(g.acertados)}`}>
            {g.predicciones.map((p) => LABEL[p]).join("/")}
          </span>
        ))}
      </div>
    </button>
  );
}

/* ─── Scanner QR ─── */
function ScannerQR({ onFolioDetectado }: { onFolioDetectado: (folio: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  const [error, setError] = useState("");
  const [escaneando, setEscaneando] = useState(false);
  const [detectado, setDetectado] = useState("");

  useEffect(() => {
    iniciar();
    return () => detener();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciar = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setEscaneando(true);
        escanearFrame();
      }
    } catch {
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const detener = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setEscaneando(false);
  };

  const escanearFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animRef.current = requestAnimationFrame(escanearFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Intentar con BarcodeDetector (Chrome nativo)
    if ("BarcodeDetector" in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      detector.detect(canvas).then((codes: { rawValue: string }[]) => {
        if (codes.length > 0) {
          procesarURL(codes[0].rawValue);
        } else {
          animRef.current = requestAnimationFrame(escanearFrame);
        }
      }).catch(() => {
        animRef.current = requestAnimationFrame(escanearFrame);
      });
    } else {
      // Fallback: jsQR
      import("jsqr").then(({ default: jsQR }) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          procesarURL(code.data);
        } else {
          animRef.current = requestAnimationFrame(escanearFrame);
        }
      }).catch(() => {
        animRef.current = requestAnimationFrame(escanearFrame);
      });
    }
  };

  const procesarURL = (rawValue: string) => {
    detener();
    // Extraer folio: puede ser una URL "/ticket/QMX-J1-xxx" o directamente el folio
    let folio = rawValue.trim();
    const match = folio.match(/\/ticket\/([A-Z0-9-]+)/i);
    if (match) folio = match[1].toUpperCase();
    else folio = folio.toUpperCase();

    setDetectado(folio);
    setTimeout(() => onFolioDetectado(folio), 600);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <p className="text-sm text-gray-500">Apunta la cámara al código QR de tu ticket</p>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-h-72">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Visor */}
        {escaneando && !detectado && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white rounded-2xl opacity-60" />
            <div className="absolute w-48 h-1 bg-green-400 opacity-70 animate-bounce" />
          </div>
        )}

        {detectado && (
          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-4xl mb-1">✅</p>
              <p className="font-bold text-sm font-mono">{detectado}</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 text-center">
          {error}
          <button onClick={iniciar} className="block mx-auto mt-2 text-red-700 font-bold underline text-xs">
            Intentar de nuevo
          </button>
        </div>
      )}

      {escaneando && !error && (
        <p className="text-xs text-gray-400 text-center animate-pulse">Buscando código QR...</p>
      )}
    </div>
  );
}

const toTitleCase = (str: string) =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());


/* ─── Página principal ─── */
function ConsultarInner() {
  const searchParams = useSearchParams();
  const folioParam = searchParams.get("folio");

  const [modo, setModo] = useState<"telefono" | "folio" | "qr">("telefono");
  const [telefono, setTelefono] = useState("");
  const [nombreBusqueda, setNombreBusqueda] = useState("");
  const [folio, setFolio] = useState(folioParam ?? "");
  const [quinielas, setQuinielas] = useState<Quiniela[]>([]);
  const [detalle, setDetalle] = useState<Quiniela | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);

  // Si viene con ?folio= directo, buscar automáticamente
  useEffect(() => {
    if (folioParam) {
      setModo("folio");
      buscarFolio(folioParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limpiar = () => {
    setError(""); setDetalle(null); setQuinielas([]); setBuscado(false);
  };

  const buscarTelefono = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = telefono.replace(/\D/g, "");
    if (num.length < 10 || !nombreBusqueda.trim()) return;
    setCargando(true); limpiar();

    const res = await fetch(
      `/api/quinielas?telefono=${num}&nombre=${encodeURIComponent(nombreBusqueda.trim())}`
    );
    const data = await res.json();
    setCargando(false); setBuscado(true);

    if (!res.ok) { setError(data.error || "Error al buscar"); return; }
    const ORDEN: Record<string, number> = { pendiente: 0, ganadora: 1, perdedora: 2 };
    const lista: Quiniela[] = (data.quinielas ?? []).sort(
      (a: Quiniela, b: Quiniela) => (ORDEN[a.estado] ?? 9) - (ORDEN[b.estado] ?? 9)
    );
    setQuinielas(lista);
    if (lista.length === 1) setDetalle(lista[0]);
  };

  const buscarFolio = async (f?: string) => {
    const val = (f ?? folio).trim().toUpperCase();
    if (!val) return;
    setCargando(true); limpiar();

    const res = await fetch(`/api/quinielas?folio=${val}`);
    const data = await res.json();
    setCargando(false); setBuscado(true);

    if (!res.ok) { setError(data.error || "No encontrada"); return; }
    setDetalle(data);
  };

  const alEscanear = (folioEscaneado: string) => {
    setModo("folio");
    setFolio(folioEscaneado);
    buscarFolio(folioEscaneado);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-5 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div>
            <a href="/" className="text-amber-400 text-sm mb-1 inline-block">← Inicio</a>
            <h1 className="text-2xl font-bold">Consultar Quiniela</h1>
            <p className="text-amber-300/70 text-sm">Encuentra tus pronósticos y resultados</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "52px", objectFit: "contain", flexShrink: 0 }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => { setModo("telefono"); limpiar(); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${modo === "telefono" ? "bg-amber-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            📱 Teléfono
          </button>
          <button
            onClick={() => { setModo("folio"); limpiar(); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${modo === "folio" ? "bg-amber-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            🎫 Folio
          </button>
          <button
            onClick={() => { setModo("qr"); limpiar(); }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${modo === "qr" ? "bg-amber-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}
          >
            📷 QR
          </button>
        </div>

        {/* Búsqueda por teléfono + nombre */}
        {modo === "telefono" && (
          <form onSubmit={buscarTelefono} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <p className="text-sm text-gray-500">
              Ingresa el nombre y teléfono con los que te registraste
            </p>
            <input
              type="text"
              placeholder="Tu nombre (como te registraste)"
              value={nombreBusqueda}
              onChange={(e) => setNombreBusqueda(toTitleCase(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            <div className="flex gap-2">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm text-gray-500 font-medium shrink-0">
                🇲🇽 +52
              </div>
              <input
                type="tel"
                placeholder="55 1234 5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={cargando || telefono.replace(/\D/g, "").length < 10 || !nombreBusqueda.trim()}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {cargando ? "Buscando..." : "Buscar mis quinielas"}
            </button>
            <p className="text-xs text-gray-400 text-center">
              🔒 Tu nombre es requerido para proteger tu privacidad
            </p>
          </form>
        )}

        {/* Búsqueda por folio */}
        {modo === "folio" && (
          <form onSubmit={(e) => { e.preventDefault(); buscarFolio(); }} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <p className="text-sm text-gray-500">Ingresa el folio de tu ticket</p>
            <input
              type="text"
              placeholder="QMX-J1-..."
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
            />
            <button
              type="submit"
              disabled={cargando || !folio.trim()}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {cargando ? "Buscando..." : "Buscar"}
            </button>
          </form>
        )}

        {/* Scanner QR */}
        {modo === "qr" && (
          <ScannerQR onFolioDetectado={alEscanear} />
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 text-sm text-center">{error}</div>
        )}

        {/* Sin resultados */}
        {buscado && !error && quinielas.length === 0 && !detalle && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">🔍</p>
            <p className="font-medium">No encontramos quinielas</p>
            <p className="text-sm mt-1">Verifica el número o usa tu folio</p>
          </div>
        )}

        {/* Lista de quinielas (búsqueda por teléfono con múltiples resultados) */}
        {!detalle && quinielas.length > 1 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-medium">{quinielas.length} quinielas encontradas</p>
            {quinielas.map((q) => (
              <TarjetaQuiniela key={q.folio} q={q} onClick={() => setDetalle(q)} />
            ))}
          </div>
        )}

        {/* Detalle de quiniela */}
        {detalle && (
          <DetalleQuiniela
            q={detalle}
            onBack={quinielas.length > 1 ? () => setDetalle(null) : undefined}
          />
        )}

      </div>
    </div>
  );
}

export default function ConsultarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Cargando...</div>}>
      <ConsultarInner />
    </Suspense>
  );
}
