"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Partido = {
  id: string;
  equipoLocal: string;
  equipoVisita: string;
  orden: number;
};

type Jornada = {
  id: string;
  numero: number;
  temporada: string;
  partidos: Partido[];
};

type PicksDetectados = Record<string, string>;

// Calcula el porcentaje de píxeles oscuros en una región del canvas
function porcentajeOscuro(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): number {
  const data = ctx.getImageData(x, y, w, h).data;
  let oscuros = 0;
  for (let i = 0; i < data.length; i += 4) {
    const brillo = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brillo < 100) oscuros++;
  }
  return oscuros / (data.length / 4);
}

// Detecta marcadores de esquina buscando regiones muy oscuras cerca de las esquinas
function detectarEsquinas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { tl: [number, number]; tr: [number, number]; bl: [number, number]; br: [number, number] } | null {
  const margen = Math.min(w, h) * 0.15;
  const tam = Math.min(w, h) * 0.08;

  const zonas = [
    { key: "tl", x: 0, y: 0 },
    { key: "tr", x: w - margen, y: 0 },
    { key: "bl", x: 0, y: h - margen },
    { key: "br", x: w - margen, y: h - margen },
  ];

  const centros: Record<string, [number, number]> = {};

  for (const zona of zonas) {
    let maxOscuro = 0;
    let cx = zona.x + margen / 2;
    let cy = zona.y + margen / 2;

    for (let dx = 0; dx < margen - tam; dx += 4) {
      for (let dy = 0; dy < margen - tam; dy += 4) {
        const pct = porcentajeOscuro(ctx, zona.x + dx, zona.y + dy, tam, tam);
        if (pct > maxOscuro) {
          maxOscuro = pct;
          cx = zona.x + dx + tam / 2;
          cy = zona.y + dy + tam / 2;
        }
      }
    }

    if (maxOscuro < 0.45) return null; // No encontró marcador
    centros[zona.key] = [cx, cy];
  }

  return {
    tl: centros.tl,
    tr: centros.tr,
    bl: centros.bl,
    br: centros.br,
  };
}

// Analiza el canvas ya alineado y detecta qué recuadros están marcados
function detectarPicks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  numPartidos: number
): string[] {
  const UMBRAL = 0.28;

  // Zona de partidos: empieza ~28% desde arriba, termina ~82% desde arriba
  const yInicio = h * 0.28;
  const yFin = h * 0.82;
  const alturaPorPartido = (yFin - yInicio) / numPartidos;

  // Las tres columnas (1, X, 2) ocupan el lado derecho
  // Aproximadamente: col1 empieza en 55% del ancho, cada col ocupa ~14%
  const colX = [w * 0.56, w * 0.70, w * 0.84];
  const colW = w * 0.11;
  const celH = alturaPorPartido * 0.7;

  const picks: string[] = [];

  for (let i = 0; i < numPartidos; i++) {
    const y = yInicio + i * alturaPorPartido + alturaPorPartido * 0.15;
    const opciones = ["1", "X", "2"];
    let mejorOpcion = "";
    let mejorPct = UMBRAL;

    for (let j = 0; j < 3; j++) {
      const pct = porcentajeOscuro(ctx, colX[j], y, colW, celH);
      if (pct > mejorPct) {
        mejorPct = pct;
        mejorOpcion = opciones[j];
      }
    }

    picks.push(mejorOpcion); // "" si no detectó nada
  }

  return picks;
}

function EscanearInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jornadaId = searchParams.get("jornadaId");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [fase, setFase] = useState<"camara" | "confirmacion" | "datos">("camara");
  const [imagenCapturada, setImagenCapturada] = useState<string>("");
  const [picksDetectados, setPicksDetectados] = useState<PicksDetectados>({});
  const [confianza, setConfianza] = useState<Record<string, boolean>>({});
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [camaraError, setCamaraError] = useState("");

  useEffect(() => {
    const url = jornadaId ? `/api/jornadas?id=${jornadaId}` : "/api/jornadas";
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setJornada(data); });
  }, [jornadaId]);

  useEffect(() => {
    if (fase !== "camara") return;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setCamaraError("No se pudo acceder a la cámara. Verifica los permisos.");
      });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [fase]);

  const capturar = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !jornada) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    const w = canvas.width;
    const h = canvas.height;

    // Intentar detectar esquinas — requeridas para proceder
    const esquinas = detectarEsquinas(ctx, w, h);

    if (!esquinas) {
      // No se encontró la forma — mostrar error y volver a cámara
      setImagenCapturada(canvas.toDataURL("image/jpeg", 0.8));
      streamRef.current?.getTracks().forEach((t) => t.stop());
      // Resetear picks vacíos y pasar a confirmación con advertencia
      const picksVacios: PicksDetectados = {};
      const confianzaVacia: Record<string, boolean> = {};
      jornada.partidos.forEach((p) => {
        picksVacios[p.id] = "";
        confianzaVacia[p.id] = false;
      });
      setPicksDetectados(picksVacios);
      setConfianza(confianzaVacia);
      setFase("confirmacion");
      return;
    }

    // Recortar la forma usando los marcadores de esquina
    const { tl, tr, bl } = esquinas;
    const anchoForma = tr[0] - tl[0];
    const altoForma = bl[1] - tl[1];
    const canvasForma = document.createElement("canvas");
    canvasForma.width = anchoForma;
    canvasForma.height = altoForma;
    const ctxForma = canvasForma.getContext("2d")!;
    ctxForma.drawImage(canvas, tl[0], tl[1], anchoForma, altoForma, 0, 0, anchoForma, altoForma);

    // Detectar picks solo dentro de la forma recortada
    const picks = detectarPicks(
      ctxForma,
      canvasForma.width,
      canvasForma.height,
      jornada.partidos.length
    );

    // Mapear picks a partidos
    const picksMap: PicksDetectados = {};
    const confianzaMap: Record<string, boolean> = {};

    jornada.partidos.forEach((partido, i) => {
      picksMap[partido.id] = picks[i] || "";
      confianzaMap[partido.id] = picks[i] !== "";
    });

    setPicksDetectados(picksMap);
    setConfianza(confianzaMap);
    setImagenCapturada(canvas.toDataURL("image/jpeg", 0.8));

    // Detener cámara
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setFase("confirmacion");
  }, [jornada]);

  const cambiarPick = (partidoId: string, valor: string) => {
    setPicksDetectados((prev) => ({ ...prev, [partidoId]: valor }));
    setConfianza((prev) => ({ ...prev, [partidoId]: true }));
  };

  const todosConfirmados = jornada?.partidos.every((p) => picksDetectados[p.id]) ?? false;

  const registrar = async () => {
    if (!jornada || !nombre || !todosConfirmados) return;
    setEnviando(true);
    setError("");

    const res = await fetch("/api/quinielas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jornadaId: jornada.id,
        picks: Object.entries(picksDetectados).map(([partidoId, prediccion]) => ({
          partidoId,
          prediccion,
        })),
        nombre,
        telefono,
        canal: "tienda",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al registrar");
      setEnviando(false);
      return;
    }

    router.push(`/ticket/${data.folio}`);
  };

  // ── FASE: CÁMARA ──────────────────────────────────────────────
  if (fase === "camara") {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="bg-brand text-white py-3 px-4 flex items-center justify-between">
          <a href="/admin/tienda" className="text-amber-400 text-sm">← Tienda</a>
          <p className="font-bold">Escanear Forma</p>
          <div />
        </div>

        {camaraError ? (
          <div className="flex-1 flex items-center justify-center text-white text-center px-8">
            <div>
              <p className="text-2xl mb-3">📷</p>
              <p className="text-red-400">{camaraError}</p>
              <a href="/admin/tienda" className="text-amber-400 underline mt-4 inline-block">
                Usar captura manual
              </a>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[70vh] object-cover"
            />

            {/* Marco guía */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="border-4 border-yellow-400 rounded-lg"
                style={{ width: "85%", height: "80%" }}
              >
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-yellow-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-yellow-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-yellow-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-yellow-400" />
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute bottom-0 left-0 right-0 pb-8 flex flex-col items-center gap-3 bg-gradient-to-t from-black/60 pt-8">
              <p className="text-white text-sm text-center px-4">
                Centra la forma dentro del marco y presiona capturar
              </p>
              <button
                onClick={capturar}
                className="bg-yellow-400 text-amber-950 font-bold text-lg px-10 py-4 rounded-full shadow-lg active:scale-95 transition-transform"
              >
                Capturar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── FASE: CONFIRMACIÓN DE PICKS ───────────────────────────────
  if (fase === "confirmacion") {
    const totalDetectados = jornada?.partidos.filter((p) => picksDetectados[p.id]).length ?? 0;
    const totalPartidos = jornada?.partidos.length ?? 0;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-brand text-white py-3 px-4 flex items-center justify-between">
          <button
            onClick={() => setFase("camara")}
            className="text-amber-400 text-sm"
          >
            ← Reescanear
          </button>
          <p className="font-bold">Confirmar Picks</p>
          <div />
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* Resumen de detección */}
          <div
            className={`rounded-xl p-3 text-center text-sm font-medium ${
              totalDetectados === totalPartidos
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {totalDetectados === totalPartidos
              ? `✅ ${totalDetectados}/${totalPartidos} picks detectados correctamente`
              : `⚠️ ${totalDetectados}/${totalPartidos} detectados — corrige los marcados en amarillo`}
          </div>

          {/* Imagen capturada (miniatura) */}
          {imagenCapturada && (
            <div className="flex justify-center">
              <img
                src={imagenCapturada}
                alt="Forma escaneada"
                className="h-24 rounded-lg border border-gray-200 object-contain"
              />
            </div>
          )}

          {/* Picks detectados — editables */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {jornada?.partidos.map((partido) => {
                const detectado = confianza[partido.id];
                const pick = picksDetectados[partido.id];

                return (
                  <div
                    key={partido.id}
                    className={`p-3 ${!detectado ? "bg-yellow-50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-800">
                        {partido.equipoLocal}{" "}
                        <span className="text-gray-400 font-normal text-xs">vs</span>{" "}
                        {partido.equipoVisita}
                      </p>
                      {!detectado && (
                        <span className="text-yellow-600 text-xs font-bold">
                          Sin detectar
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {["1", "X", "2"].map((op) => (
                        <button
                          key={op}
                          onClick={() => cambiarPick(partido.id, op)}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                            pick === op
                              ? "bg-green-600 text-white shadow"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {op === "1"
                            ? `L · ${partido.equipoLocal}`
                            : op === "2"
                            ? `V · ${partido.equipoVisita}`
                            : "E · Empate"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setFase("datos")}
            disabled={!todosConfirmados}
            className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Continuar con datos del cliente →
          </button>
        </div>
      </div>
    );
  }

  // ── FASE: DATOS DEL CLIENTE ───────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand text-white py-3 px-4 flex items-center justify-between">
        <button onClick={() => setFase("confirmacion")} className="text-amber-400 text-sm">
          ← Picks
        </button>
        <p className="font-bold">Datos del Cliente</p>
        <div />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Resumen picks */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            Picks confirmados
          </h3>
          <div className="flex flex-wrap gap-2">
            {jornada?.partidos.map((p) => (
              <div key={p.id} className="text-xs bg-green-50 rounded-lg px-2 py-1">
                <span className="text-gray-500">{p.equipoLocal.split(" ")[0]} vs {p.equipoVisita.split(" ")[0]}</span>
                <span className="font-bold text-green-700 ml-1">{picksDetectados[p.id]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Datos */}
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-600">Datos del cliente</h3>
          <input
            type="text"
            placeholder="Nombre *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="tel"
            placeholder="Teléfono (opcional)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <button
          onClick={registrar}
          disabled={!nombre || enviando}
          className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl transition-colors text-lg"
        >
          {enviando ? "Registrando..." : "Registrar y Ver Ticket"}
        </button>
      </div>
    </div>
  );
}

export default function EscanearPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Cargando escáner...</p>
      </div>
    }>
      <EscanearInner />
    </Suspense>
  );
}
