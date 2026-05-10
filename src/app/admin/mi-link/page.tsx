"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FlyerJornada } from "@/components/FlyerJornada";

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Stats = {
  totalQuinielas: number;
  comisionGanada: number;
  comisionPendiente: number;
};

type JornadaAbierta = {
  id: string;
  numero: number;
  nombre: string | null;
  liga: string;
  temporada: string;
};

type Data = {
  codigoRef: string | null;
  esVendedor: boolean;
  stats: Stats;
  jornadasAbiertas: JornadaAbierta[];
};

export default function MiLinkPage() {
  const { data: session } = useSession();
  const rol = (session?.user as { role?: string })?.role ?? "";
  const esAdmin = ["admin", "superadmin"].includes(rol);

  const backHref = esAdmin ? "/admin" : "/admin/tienda";
  const backLabel = esAdmin ? "Admin" : "Vender";

  const [data, setData] = useState<Data | null>(null);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/admin/perfil")
      .then((r) => r.json())
      .then((d) => {
        setData({
          codigoRef: d.usuario?.codigoRef ?? null,
          esVendedor: d.usuario?.rol === "vendedor",
          stats: d.stats ?? { totalQuinielas: 0, comisionGanada: 0, comisionPendiente: 0 },
          jornadasAbiertas: d.jornadasAbiertas ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const copiarLink = () => {
    if (!data?.codigoRef) return;
    const link = `${window.location.origin}/quiniela?ref=${data.codigoRef}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <a href={backHref} className="text-amber-400 text-sm">← {backLabel}</a>
            <h1 className="text-xl font-bold mt-1">Mi Link de Ventas</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas" style={{ height: "40px", objectFit: "contain" }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {cargando ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">Cargando...</div>
        ) : !data?.codigoRef ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-xl shadow-sm">
            <p className="text-4xl mb-3">🔗</p>
            <p className="font-semibold text-gray-600">Aún no tienes código de referido</p>
            <p className="text-sm mt-2 max-w-xs mx-auto">
              Pídele al administrador que te asigne un código en la sección de Usuarios.
            </p>
          </div>
        ) : (
          <>
            {/* Stats — solo vendedor referido */}
            {data.esVendedor && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{data.stats.totalQuinielas}</p>
                  <p className="text-xs text-gray-500">Quinielas referidas</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">${fmt(data.stats.comisionGanada)}</p>
                  <p className="text-xs text-gray-500">Comisión ganada</p>
                </div>
                {data.stats.comisionPendiente > 0 && (
                  <div className="bg-orange-50 rounded-xl shadow-sm p-4 text-center col-span-2">
                    <p className="text-xl font-bold text-orange-500">${fmt(data.stats.comisionPendiente)}</p>
                    <p className="text-xs text-gray-500">Pendiente de cobrar</p>
                  </div>
                )}
              </div>
            )}

            {/* Link general */}
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-xs font-bold tracking-widest text-cyan-200 uppercase mb-1">Tu link general</p>
              <p className="text-sm font-mono break-all text-cyan-100 mt-2 mb-4">
                {typeof window !== "undefined" ? window.location.origin : ""}/quiniela?ref={data.codigoRef}
              </p>
              <button
                onClick={copiarLink}
                className="w-full bg-white text-cyan-800 font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95"
              >
                {copiado ? "✓ ¡Copiado!" : "📋 Copiar link"}
              </button>
            </div>

            {/* Código */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">Tu código de vendedor</p>
              <p className="font-mono text-2xl font-bold text-cyan-700 tracking-widest">{data.codigoRef}</p>
            </div>

            {/* Compartir por jornada */}
            {data.jornadasAbiertas.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Compartir por jornada activa</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Abre WhatsApp con un mensaje listo para enviar</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.jornadasAbiertas.map((j) => {
                    const nombreJornada = j.nombre ?? `Jornada ${j.numero}`;
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const link = `${origin}/quiniela?ref=${data.codigoRef}`;
                    const mensaje = `🏆 ¡Ya están abiertas las quinielas!\n\n⚽ ${j.liga} · ${nombreJornada}\n💰 Solo $20 por boleto — ¡gana premios en efectivo!\n\nRegistra la tuya aquí 👇\n${link}\n\n¡No te quedes sin la tuya! 🔥`;
                    const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
                    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`🏆 ¡Ya están abiertas las quinielas! ⚽ ${j.liga} · ${nombreJornada} — Solo $20. ¡Regístra la tuya! 🔥`)}`;
                    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏆 ¡Ya están abiertas las quinielas de ${j.liga} · ${nombreJornada}! Solo $20. ¡Regístra la tuya! 🔥`)}&url=${encodeURIComponent(link)}`;
                    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
                    const puedeCompartirNativo = typeof navigator !== "undefined" && !!navigator.share;

                    return (
                      <div key={j.id} className="px-4 py-3 space-y-2">
                        <div>
                          <p className="font-semibold text-gray-700 text-sm">{nombreJornada}</p>
                          <p className="text-xs text-gray-400">{j.liga} · {j.temporada}</p>
                        </div>
                        {puedeCompartirNativo && (
                          <button
                            onClick={async () => {
                              try { await navigator.share({ title: `Quinielas ${nombreJornada}`, text: mensaje, url: link }); }
                              catch { /* cancelado */ }
                            }}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                            Compartir esta jornada
                          </button>
                        )}
                        <div className="grid grid-cols-4 gap-2">
                          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl py-2.5 text-xs font-semibold transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            WhatsApp
                          </a>
                          <a href={tgUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl py-2.5 text-xs font-semibold transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                            Telegram
                          </a>
                          <a href={twUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl py-2.5 text-xs font-semibold transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.735-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            X
                          </a>
                          <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl py-2.5 text-xs font-semibold transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            Facebook
                          </a>
                        </div>
                        <FlyerJornada
                          jornadaId={j.id}
                          jornadaNombre={j.nombre ?? `Jornada ${j.numero}`}
                          liga={j.liga}
                          temporada={j.temporada}
                          refCode={data.codigoRef!}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm">
                No hay jornadas abiertas en este momento
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
