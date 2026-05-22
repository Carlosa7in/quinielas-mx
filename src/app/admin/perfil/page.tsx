"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { PasswordInput } from "@/components/PasswordInput";
import { FlyerJornada } from "@/components/FlyerJornada";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  puntoVenta: string | null;
  username: string | null;
  codigoRef: string | null;
};

type Stats = {
  totalQuinielas: number;
  totalRecaudado: number;
  comisionGanada: number;
  comisionPendiente: number;
  comisionAdmin: number;
  comisionAdminPendiente: number;
};

type JornadaRow = {
  jornadaId: string;
  jornadaNombre: string;
  liga: string;
  total: number;
  tienda: number;
  online: number;
  recaudado: number;
  comision: number;
  pagado: boolean;
  pagadoEn: string | null;
};

type ComisionAdminRow = {
  jornadaId: string;
  jornadaNombre: string;
  liga: string;
  temporada: string;
  recaudadoTotal: number;
  numAdmins: number;
  miParte: number;
  pagado: boolean;
  pagadoEn: string | null;
};

type Apostador = {
  nombre: string;
  telefono: string | null;
  totalQuinielas: number;
};

type Reciente = {
  folio: string;
  monto: number;
  canal: string;
  estado: string;
  nombreCliente: string | null;
  jornadaNombre: string;
};

type JornadaAbierta = {
  id: string;
  numero: number;
  nombre: string | null;
  liga: string;
  temporada: string;
};

type PerfilData = {
  usuario: Usuario;
  stats: Stats;
  porJornada: JornadaRow[];
  comisionesAdmin: ComisionAdminRow[];
  apostadores: Apostador[];
  recientes: Reciente[];
  jornadasAbiertas: JornadaAbierta[];
};

const ROL_LABEL: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  vendedor: "Vendedor",
  tienda: "Tienda",
};
const ROL_COLOR: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  vendedor: "bg-green-100 text-green-700",
  tienda: "bg-amber-100 text-amber-700",
};
const CANAL_COLOR: Record<string, string> = {
  tienda: "bg-amber-100 text-amber-700",
  online: "bg-blue-100 text-blue-700",
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente: "text-yellow-600",
  confirmado: "text-green-600",
  ganadora: "text-amber-600 font-bold",
  perdedora: "text-gray-400",
};

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });

type Tab = "resumen" | "apostadores" | "ganancias" | "milink" | "perfil";

function PerfilInner() {
  const { data: session } = useSession();
  const rolSession = (session?.user as { role?: string })?.role ?? "";
  const esAdminNav = rolSession === "admin" || rolSession === "superadmin";

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;

  const [data, setData] = useState<PerfilData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<Tab>(tabParam ?? "resumen");
  const [jornadasExpandidas, setJornadasExpandidas] = useState<Set<string>>(new Set());

  // Edit form state
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editPuntoVenta, setEditPuntoVenta] = useState("");
  const [pwActual, setPwActual] = useState("");
  const [pwNueva, setPwNueva] = useState("");
  const [pwConfirmar, setPwConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [feedbackPerfil, setFeedbackPerfil] = useState<{ tipo: "ok" | "err"; msg: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [copiadoInstrucciones, setCopiadoInstrucciones] = useState(false);

  useEffect(() => {
    fetch("/api/admin/perfil")
      .then((r) => r.json())
      .then((d: PerfilData) => {
        setData(d);
        setEditNombre(d.usuario.nombre ?? "");
        setEditTelefono(d.usuario.telefono ?? "");
        setEditPuntoVenta(d.usuario.puntoVenta ?? "");
      })
      .finally(() => setCargando(false));
  }, []);

  const toggleJornada = (id: string) =>
    setJornadasExpandidas((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackPerfil(null);

    if (pwNueva && pwNueva !== pwConfirmar) {
      setFeedbackPerfil({ tipo: "err", msg: "Las contraseñas nuevas no coinciden" });
      return;
    }

    setGuardando(true);
    try {
      const body: Record<string, string> = {
        nombre: editNombre,
        telefono: editTelefono,
        puntoVenta: editPuntoVenta,
      };
      if (pwNueva) {
        body.password = pwNueva;
        body.passwordActual = pwActual;
      }

      const res = await fetch("/api/admin/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedbackPerfil({ tipo: "err", msg: json.error ?? "Error al guardar" });
      } else {
        setData((prev) => prev ? { ...prev, usuario: json.usuario } : prev);
        setPwActual("");
        setPwNueva("");
        setPwConfirmar("");
        setFeedbackPerfil({ tipo: "ok", msg: "Perfil actualizado correctamente" });
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">Error al cargar el perfil</p>
      </div>
    );
  }

  const { usuario, stats, porJornada, comisionesAdmin, apostadores, recientes, jornadasAbiertas = [] } = data;
  const esAdminRole = usuario.rol === "admin" || usuario.rol === "superadmin";
  const esVendedor = usuario.rol === "vendedor";
  const esTienda = usuario.rol === "tienda";
  const mostrarTabs = esAdminRole || esVendedor || esTienda;

  const copiarLink = () => {
    if (!usuario.codigoRef) return;
    const link = `${window.location.origin}/quiniela?ref=${usuario.codigoRef}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const copiarInstrucciones = () => {
    if (!usuario.codigoRef) return;
    const link = `${window.location.origin}/quiniela?ref=${usuario.codigoRef}`;
    const home = window.location.origin;
    const texto = [
      `🎯 *¿Cómo participar en la quiniela?*`,
      ``,
      `*1.* Entra aquí 👉 ${link}`,
      ``,
      `*2.* Selecciona la jornada de tu preferencia y elige tu quiniela 🏟️`,
      ``,
      `*3.* En cada partido indica quién crees que gana: local, visitante o empate. 💡 También puedes seleccionar doble o triple chance para cubrirte en más de un resultado`,
      ``,
      `*4.* Elige cómo pagar (transferencia u OXXO — instrucciones ahí dentro) y guarda tu comprobante 📸`,
      ``,
      `*5.* Desde el mismo cel, entra a ${home} → verás un aviso de pago pendiente → toca *Registrar pago* → adjunta la foto del comprobante por WhatsApp`,
      ``,
      `*6.* Lo revisamos y te mandamos tu folio 🏆`,
      ``,
      `¡Cualquier duda aquí estoy! 😉`,
    ].join("\n");
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoInstrucciones(true);
      setTimeout(() => setCopiadoInstrucciones(false), 2500);
    });
  };

  const tabs: { id: Tab; label: string }[] = esVendedor
    ? [
        { id: "resumen", label: "Resumen" },
        { id: "milink", label: "Mi Link" },
        { id: "perfil", label: "Mi Perfil" },
      ]
    : esTienda
    ? [
        { id: "resumen", label: "Resumen" },
        { id: "apostadores", label: "Apostadores" },
        { id: "ganancias", label: "Ganancias" },
        { id: "milink", label: "Mi Link" },
        { id: "perfil", label: "Mi Perfil" },
      ]
    : [
        { id: "resumen", label: "Resumen" },
        { id: "apostadores", label: "Apostadores" },
        { id: "ganancias", label: "Ganancias" },
        { id: "perfil", label: "Mi Perfil" },
      ];

  const TAB_TITULO: Record<Tab, string> = {
    resumen: "Resumen",
    apostadores: "Mis Apostadores",
    ganancias: "Mis Ganancias",
    milink: "Mi Link",
    perfil: "Mi Perfil",
  };

  const totalComisionTienda = porJornada.reduce((s, j) => s + j.comision, 0);
  const totalPagadoTienda = porJornada.filter((j) => j.pagado).reduce((s, j) => s + j.comision, 0);
  const totalComisionAdmin = comisionesAdmin.reduce((s, j) => s + j.miParte, 0);
  const totalPagadoAdmin = comisionesAdmin.filter((j) => j.pagado).reduce((s, j) => s + j.miParte, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-4 px-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            {esAdminNav && (
              <Link href="/admin" className="text-amber-400 text-sm">
                ← Admin
              </Link>
            )}
            {esTienda && !esAdminNav && (
              <Link href="/admin/tienda" className="text-amber-400 text-sm">
                ← Mi Panel
              </Link>
            )}
            <h1 className="text-xl font-bold mt-1">
              {esVendedor ? "Mi Dashboard" : mostrarTabs ? "Mi Panel" : TAB_TITULO[tab]}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href="/" style={{flexShrink:0}}><img
              src="/logo-tablitas.png"
              alt="Tablitas"
              style={{ height: "44px", objectFit: "contain", flexShrink: 0 }}
            /></a>
            {esVendedor && (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-amber-300 hover:text-white text-sm border border-amber-800 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar — solo para admin/superadmin */}
      {mostrarTabs && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    tab === t.id
                      ? "bg-amber-700 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── Tab: Resumen ─────────────────────────────────────────────── */}
        {tab === "resumen" && (
          <>
            {/* Welcome card */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bienvenido de nuevo</p>
                  <h2 className="text-xl font-bold text-gray-800">Hola, {usuario.nombre}</h2>
                  {usuario.puntoVenta && (
                    <p className="text-sm text-gray-500 mt-1">📍 {usuario.puntoVenta}</p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${ROL_COLOR[usuario.rol] ?? "bg-gray-100 text-gray-500"}`}>
                  {ROL_LABEL[usuario.rol] ?? usuario.rol}
                </span>
              </div>
            </div>

            {/* ── Vista principal VENDEDOR ────────────────────────────── */}
            {esVendedor ? (
              <>
                {/* Stats rápidos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{stats.totalQuinielas}</p>
                    <p className="text-xs text-gray-500">Quinielas referidas</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">${fmt(stats.comisionGanada + stats.comisionPendiente)}</p>
                    <p className="text-xs text-gray-500">Comisión total</p>
                  </div>
                </div>

                {/* Mi link — card grande tipo admin */}
                {usuario.codigoRef ? (
                  <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-2xl p-5 text-white shadow-lg space-y-3">
                    <div>
                      <p className="text-xs font-bold tracking-widest text-cyan-200 uppercase mb-1">Tu link de ventas</p>
                      <p className="text-sm font-mono break-all text-cyan-100">{typeof window !== "undefined" ? window.location.origin : ""}/quiniela?ref={usuario.codigoRef}</p>
                    </div>
                    <button
                      onClick={copiarLink}
                      className="w-full bg-white text-cyan-800 font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95"
                    >
                      {copiado ? "✓ ¡Copiado!" : "📋 Copiar link"}
                    </button>
                    <button
                      onClick={copiarInstrucciones}
                      className="w-full bg-cyan-700/60 hover:bg-cyan-700/80 text-white font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-95"
                    >
                      {copiadoInstrucciones ? "✓ ¡Instrucciones copiadas!" : "💬 Copiar instrucciones para prospectos"}
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-xl p-4 text-center text-gray-400 text-sm">
                    Sin código de referido — pídelo al administrador
                  </div>
                )}

                {/* Flyer de jornadas abiertas */}
                {jornadasAbiertas.length > 0 && usuario.codigoRef && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium px-1 mb-2 uppercase tracking-wide">Compartir por jornada</p>
                    <div className="space-y-3">
                      {jornadasAbiertas.map((j) => {
                        const nombreJornada = j.nombre ?? `Jornada ${j.numero}`;
                        const origin = typeof window !== "undefined" ? window.location.origin : "https://tablitasquinielas.netlify.app";
                        const link = `${origin}/quiniela?ref=${usuario.codigoRef}`;
                        const mensaje = `🏆 ¡Ya están abiertas las quinielas!\n\n⚽ ${j.liga} · ${nombreJornada}\n💰 Solo $20 por boleto — ¡gana premios en efectivo!\n\nRegistra la tuya aquí 👇\n${link}\n\n¡No te quedes sin la tuya! 🔥`;
                        const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
                        const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(mensaje)}`;
                        const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(mensaje.slice(0, 200))}&url=${encodeURIComponent(link)}`;
                        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
                        const puedeCompartirNativo = typeof navigator !== "undefined" && !!navigator.share;
                        return (
                          <div key={j.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                              <p className="font-bold text-gray-800">{nombreJornada}</p>
                              <p className="text-xs text-gray-400">{j.liga} · {j.temporada}</p>
                            </div>
                            <div className="px-4 py-3 space-y-2">
                              {puedeCompartirNativo && (
                                <button
                                  onClick={async () => { try { await navigator.share({ title: `Quinielas ${nombreJornada}`, text: mensaje, url: link }); } catch { /* cancelado */ } }}
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
                            </div>
                            <div className="p-3 pt-0">
                              <FlyerJornada
                                jornadaId={j.id}
                                jornadaNombre={j.nombre ?? `Jornada ${j.numero}`}
                                liga={j.liga}
                                temporada={j.temporada}
                                refCode={usuario.codigoRef!}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Instrucciones estilo cards admin */}
                <div>
                  <p className="text-xs text-gray-400 font-medium px-1 mb-2 uppercase tracking-wide">¿Cómo ganar comisiones?</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-cyan-700 text-white rounded-xl p-4 flex items-center gap-3">
                      <span className="text-2xl shrink-0">🔗</span>
                      <div>
                        <p className="font-bold">1. Comparte tu link</p>
                        <p className="text-cyan-200 text-sm">Envía tu link personal a tus contactos y redes</p>
                      </div>
                    </div>
                    <div className="bg-green-700 text-white rounded-xl p-4 flex items-center gap-3">
                      <span className="text-2xl shrink-0">💰</span>
                      <div>
                        <p className="font-bold">2. Gana $2 por quiniela</p>
                        <p className="text-green-200 text-sm">Cada registro confirmado vía tu link te genera $2</p>
                      </div>
                    </div>
                    <div className="bg-amber-700 text-white rounded-xl p-4 flex items-center gap-3">
                      <span className="text-2xl shrink-0">🖼️</span>
                      <div>
                        <p className="font-bold">3. Genera el flyer</p>
                        <p className="text-amber-200 text-sm">Descarga la imagen con los partidos para compartir en status</p>
                      </div>
                    </div>
                    <div className="bg-indigo-700 text-white rounded-xl p-4 flex items-center gap-3">
                      <span className="text-2xl shrink-0">📊</span>
                      <div>
                        <p className="font-bold">4. Revisa tus ventas</p>
                        <p className="text-indigo-200 text-sm">En la pestaña "Mi Link" ves tu historial y comisiones</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ventas por jornada */}
                {porJornada.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800">Mis ventas por jornada</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {porJornada.map((j) => {
                        const open = jornadasExpandidas.has(j.jornadaId);
                        return (
                          <div key={j.jornadaId}>
                            <button
                              onClick={() => toggleJornada(j.jornadaId)}
                              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-700 text-sm">{j.liga} · {j.jornadaNombre}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{j.total} quinielas · ${fmt(j.recaudado)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {j.comision > 0 && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                      {j.pagado ? "Pagado" : `$${fmt(j.comision)} pend.`}
                                    </span>
                                  )}
                                  <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
                                </div>
                              </div>
                            </button>
                            {open && (
                              <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                                <div className="bg-green-50 rounded-lg p-2.5 text-center">
                                  <p className="font-bold text-green-700">{j.total}</p>
                                  <p className="text-[10px] text-gray-500">Quinielas</p>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-2.5 text-center">
                                  <p className="font-bold text-yellow-600">${fmt(j.recaudado)}</p>
                                  <p className="text-[10px] text-gray-500">Recaudado</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                                  <p className="font-bold text-orange-600">${fmt(j.comision)}</p>
                                  <p className="text-[10px] text-gray-500">Comisión</p>
                                  {j.pagado && j.pagadoEn && (
                                    <p className="text-[9px] text-green-600">{fmtFecha(j.pagadoEn)}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ── Vista para admin / tienda / otros ─────────────────────── */
              <>
                {/* Link de referido — destacado para tienda */}
                {esTienda && (
                  <div className={`rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm ${usuario.codigoRef ? "bg-cyan-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                    <div className="min-w-0">
                      {usuario.codigoRef ? (
                        <>
                          <p className="text-xs font-bold text-cyan-100 uppercase tracking-wider mb-0.5">Tu link de ventas</p>
                          <p className="font-mono text-sm font-bold truncate">/quiniela?ref={usuario.codigoRef}</p>
                        </>
                      ) : (
                        <p className="text-sm">Sin código de referido asignado</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {usuario.codigoRef && (
                        <button
                          onClick={copiarLink}
                          className="bg-white text-cyan-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          {copiado ? "✓ Copiado" : "📋 Copiar"}
                        </button>
                      )}
                      <button
                        onClick={() => setTab("milink")}
                        className="bg-cyan-700 text-white text-xs px-3 py-1.5 rounded-lg border border-cyan-500"
                      >
                        Ver →
                      </button>
                    </div>
                  </div>
                )}

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{stats.totalQuinielas}</p>
                    <p className="text-xs text-gray-500">Quinielas vendidas</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">${fmt(stats.totalRecaudado)}</p>
                    <p className="text-xs text-gray-500">Recaudado personal</p>
                  </div>
                  {stats.comisionGanada > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">${fmt(stats.comisionGanada)}</p>
                      <p className="text-xs text-gray-500">Comisión tienda</p>
                    </div>
                  )}
                  {esAdminRole && stats.comisionAdmin > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">${fmt(stats.comisionAdmin)}</p>
                      <p className="text-xs text-gray-500">Fondo admin (15%)</p>
                    </div>
                  )}
                  {stats.comisionPendiente > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                      <p className="text-2xl font-bold text-orange-500">${fmt(stats.comisionPendiente)}</p>
                      <p className="text-xs text-gray-500">Pendiente tienda</p>
                    </div>
                  )}
                  {esAdminRole && stats.comisionAdminPendiente > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                      <p className="text-2xl font-bold text-orange-400">${fmt(stats.comisionAdminPendiente)}</p>
                      <p className="text-xs text-gray-500">Pendiente admin</p>
                    </div>
                  )}
                </div>

                {/* Ventas por jornada */}
                {porJornada.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800">Ventas por jornada</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {porJornada.map((j) => {
                        const open = jornadasExpandidas.has(j.jornadaId);
                        return (
                          <div key={j.jornadaId}>
                            <button
                              onClick={() => toggleJornada(j.jornadaId)}
                              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-700 text-sm">
                                    {j.liga} · {j.jornadaNombre}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">{j.total} quinielas · ${fmt(j.recaudado)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {j.comision > 0 && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                      {j.pagado ? "Pagado" : `$${fmt(j.comision)} pend.`}
                                    </span>
                                  )}
                                  <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
                                </div>
                              </div>
                            </button>
                            {open && (
                              <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                                <div className="bg-green-50 rounded-lg p-2.5 text-center">
                                  <p className="font-bold text-green-700">{j.total}</p>
                                  <p className="text-[10px] text-gray-500">Quinielas</p>
                                  {(j.tienda > 0 || j.online > 0) && (
                                    <p className="text-[9px] text-gray-400">
                                      {j.tienda > 0 && `${j.tienda}T`}{j.tienda > 0 && j.online > 0 && "·"}{j.online > 0 && `${j.online}O`}
                                    </p>
                                  )}
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-2.5 text-center">
                                  <p className="font-bold text-yellow-600">${fmt(j.recaudado)}</p>
                                  <p className="text-[10px] text-gray-500">Recaudado</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                                  <p className="font-bold text-orange-600">${fmt(j.comision)}</p>
                                  <p className="text-[10px] text-gray-500">Comisión</p>
                                  {j.pagado && j.pagadoEn && (
                                    <p className="text-[9px] text-green-600">{fmtFecha(j.pagadoEn)}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ultimas quinielas */}
                {recientes.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800">Ultimas quinielas</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-gray-500 font-medium">Folio</th>
                            <th className="text-left px-3 py-2 text-gray-500 font-medium">Cliente</th>
                            <th className="text-center px-2 py-2 text-gray-500 font-medium">Canal</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-medium">Monto</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-medium">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {recientes.map((q) => (
                            <tr key={q.folio} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-gray-600">{q.folio}</td>
                              <td className="px-3 py-2 text-gray-500 truncate max-w-[80px]">{q.nombreCliente ?? "—"}</td>
                              <td className="px2 py-2 text-center">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CANAL_COLOR[q.canal] ?? "bg-gray-100 text-gray-600"}`}>
                                  {q.canal === "tienda" ? "Tienda" : "Online"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-700">${fmt(q.monto)}</td>
                              <td className={`px-3 py-2 text-right capitalize ${ESTADO_COLOR[q.estado] ?? "text-gray-500"}`}>{q.estado}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {stats.totalQuinielas === 0 && !esAdminRole && (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-3xl mb-2">📋</p>
                    <p>Todavia no tienes quinielas registradas</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Tab: Apostadores ─────────────────────────────────────────── */}
        {tab === "apostadores" && (
          <>
            {apostadores.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">👥</p>
                <p className="font-medium text-gray-500">Sin apostadores todavia</p>
                <p className="text-sm mt-1">Los clientes apareceran aqui cuando registres quinielas</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Apostadores</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{apostadores.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {apostadores.map((a, i) => (
                    <div key={i} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {a.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{a.nombre}</p>
                          {a.telefono && (
                            <p className="text-xs text-gray-400">{a.telefono}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-700">{a.totalQuinielas}</p>
                        <p className="text-xs text-gray-400">quinielas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Ganancias ───────────────────────────────────────────── */}
        {tab === "ganancias" && (
          <>
            {/* Ventas personales por jornada */}
            {porJornada.length > 0 && (
              <>
                <p className="text-xs text-gray-400 font-medium px-1 uppercase tracking-wider">
                  {porJornada.some((j) => j.tienda > 0)
                    ? "Comisión por ventas en tienda (10% del monto)"
                    : "Ventas por jornada"}
                </p>
                <div className="space-y-3">
                  {porJornada.map((j) => (
                    <div key={j.jornadaId} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">{j.jornadaNombre}</p>
                          <p className="text-xs text-gray-400">{j.liga}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {j.pagado ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-gray-700">{j.tienda}</p>
                          <p className="text-[10px] text-gray-500">Tienda</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-yellow-600">${fmt(j.recaudado)}</p>
                          <p className="text-[10px] text-gray-500">Recaudado</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-amber-600">${fmt(j.comision)}</p>
                          <p className="text-[10px] text-gray-500">Comision</p>
                        </div>
                      </div>
                      {j.pagado && j.pagadoEn && (
                        <p className="text-xs text-green-600 mt-2">Pagado el {fmtFecha(j.pagadoEn)}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subtotal tienda */}
                {totalComisionTienda > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-amber-800">Subtotal tienda</p>
                      <p className="text-xs text-amber-600">${fmt(totalPagadoTienda)} pagado</p>
                    </div>
                    <p className="text-xl font-bold text-amber-700">${fmt(totalComisionTienda)}</p>
                  </div>
                )}
              </>
            )}

            {/* Fondo de administración (15%) — solo admin/superadmin */}
            {esAdminRole && comisionesAdmin.length > 0 && (
              <>
                <p className="text-xs text-gray-400 font-medium px-1 uppercase tracking-wider mt-2">
                  Fondo de administración · 15% del total repartido entre {comisionesAdmin[0]?.numAdmins ?? "—"} administradores
                </p>
                <div className="space-y-3">
                  {comisionesAdmin.map((j) => (
                    <div key={j.jornadaId} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">{j.jornadaNombre}</p>
                          <p className="text-xs text-gray-400">{j.liga} · {j.temporada}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${j.pagado ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {j.pagado ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-gray-700">${fmt(j.recaudadoTotal)}</p>
                          <p className="text-[10px] text-gray-500">Total jornada</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-blue-600">${fmt(j.recaudadoTotal * 0.15)}</p>
                          <p className="text-[10px] text-gray-500">15% fondo</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-2 text-center">
                          <p className="font-bold text-indigo-600">${fmt(j.miParte)}</p>
                          <p className="text-[10px] text-gray-500">Tu parte</p>
                        </div>
                      </div>
                      {j.pagado && j.pagadoEn && (
                        <p className="text-xs text-green-600 mt-2">Pagado el {fmtFecha(j.pagadoEn)}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subtotal fondo admin */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-blue-800">Subtotal fondo admin</p>
                    <p className="text-xs text-blue-600">${fmt(totalPagadoAdmin)} pagado</p>
                  </div>
                  <p className="text-xl font-bold text-blue-700">${fmt(totalComisionAdmin)}</p>
                </div>
              </>
            )}

            {/* Gran total */}
            {(totalComisionTienda > 0 || totalComisionAdmin > 0) && (
              <div className="bg-amber-900 text-white rounded-2xl p-4">
                <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-3">Total acumulado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-amber-300">
                      ${fmt(totalComisionTienda + totalComisionAdmin)}
                    </p>
                    <p className="text-xs text-amber-400">Ganancias totales</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className={`text-xl font-bold ${(stats.comisionPendiente + stats.comisionAdminPendiente) > 0 ? "text-orange-300" : "text-green-300"}`}>
                      ${fmt(stats.comisionPendiente + stats.comisionAdminPendiente)}
                    </p>
                    <p className="text-xs text-amber-400">
                      {(stats.comisionPendiente + stats.comisionAdminPendiente) > 0 ? "Pendiente de cobrar" : "Todo pagado"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {porJornada.length === 0 && comisionesAdmin.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">💰</p>
                <p>Sin registros todavía</p>
                <p className="text-sm mt-1">Las ganancias aparecen aquí conforme registres quinielas</p>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Mi Link (Vendedor / Tienda) ────────────────────────── */}
        {tab === "milink" && (esVendedor || esTienda) && (
          <>
            {usuario.codigoRef ? (
              <>
                {/* Comisiones */}
                {esVendedor && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{stats.totalQuinielas}</p>
                      <p className="text-xs text-gray-500">Quinielas referidas</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">${fmt(stats.comisionGanada)}</p>
                      <p className="text-xs text-gray-500">Comisión ganada</p>
                    </div>
                    {stats.comisionPendiente > 0 && (
                      <div className="bg-orange-50 rounded-xl shadow-sm p-4 text-center col-span-2">
                        <p className="text-xl font-bold text-orange-500">${fmt(stats.comisionPendiente)}</p>
                        <p className="text-xs text-gray-500">Pendiente de cobrar</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Link general */}
                <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-2xl p-5 text-white shadow-lg">
                  <p className="text-xs font-bold tracking-widest text-cyan-200 uppercase mb-1">Tu link general</p>
                  <p className="text-sm font-mono break-all text-cyan-100 mt-2 mb-4">
                    {typeof window !== "undefined" ? window.location.origin : ""}/quiniela?ref={usuario.codigoRef}
                  </p>
                  <button
                    onClick={copiarLink}
                    className="w-full bg-white text-cyan-800 font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95"
                  >
                    {copiado ? "✓ ¡Copiado!" : "📋 Copiar link"}
                  </button>
                </div>

                {/* Compartir por jornada activa vía WhatsApp */}
                {jornadasAbiertas.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800">Compartir por jornada activa</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Abre WhatsApp con un mensaje listo para enviar</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {jornadasAbiertas.map((j) => {
                        const nombreJornada = j.nombre ?? `Jornada ${j.numero}`;
                        const origin = typeof window !== "undefined" ? window.location.origin : "https://tablitasquinielas.netlify.app";
                        const link = `${origin}/quiniela?ref=${usuario.codigoRef}`;
                        const mensaje = `🏆 ¡Ya están abiertas las quinielas!\n\n⚽ ${j.liga} · ${nombreJornada}\n💰 Solo $20 por boleto — ¡gana premios en efectivo!\n\nRegistra la tuya aquí 👇\n${link}\n\n¡No te quedes sin la tuya! 🔥`;

                        const puedeCompartirNativo = typeof navigator !== "undefined" && !!navigator.share;

                        const compartirNativo = async () => {
                          try {
                            await navigator.share({ title: `Quinielas ${nombreJornada}`, text: mensaje, url: link });
                          } catch { /* cancelado */ }
                        };

                        const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
                        const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`🏆 ¡Ya están abiertas las quinielas! ⚽ ${j.liga} · ${nombreJornada} — Solo $20 por boleto. ¡Regístra la tuya! 🔥`)}`;
                        const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏆 ¡Ya están abiertas las quinielas de ${j.liga} · ${nombreJornada}! Solo $20. ¡Regístra la tuya! 🔥`)}&url=${encodeURIComponent(link)}`;
                        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;

                        return (
                          <div key={j.id} className="px-4 py-3 space-y-2">
                            <div>
                              <p className="font-semibold text-gray-700 text-sm">{nombreJornada}</p>
                              <p className="text-xs text-gray-400">{j.liga} · {j.temporada}</p>
                            </div>
                            {/* Botón nativo (móvil) */}
                            {puedeCompartirNativo && (
                              <button
                                onClick={compartirNativo}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                                Compartir esta jornada
                              </button>
                            )}
                            {/* Botones individuales */}
                            <div className="grid grid-cols-4 gap-2">
                              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl py-2.5 text-xs font-semibold transition-colors">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                WhatsApp
                              </a>
                              <a href={tgUrl} target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl py-2.5 text-xs font-semibold transition-colors">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                Telegram
                              </a>
                              <a href={twUrl} target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl py-2.5 text-xs font-semibold transition-colors">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.735-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                X
                              </a>
                              <a href={fbUrl} target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl py-2.5 text-xs font-semibold transition-colors">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                Facebook
                              </a>
                            </div>
                            {/* Flyer generador */}
                            <FlyerJornada
                              jornadaId={j.id}
                              jornadaNombre={j.nombre ?? `Jornada ${j.numero}`}
                              liga={j.liga}
                              temporada={j.temporada}
                              refCode={usuario.codigoRef!}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {jornadasAbiertas.length === 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm">
                    No hay jornadas abiertas en este momento
                  </div>
                )}

                {/* Código */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <p className="text-xs text-gray-500 mb-1">Tu código de vendedor</p>
                  <p className="font-mono text-2xl font-bold text-cyan-700 tracking-widest">{usuario.codigoRef}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl shadow-sm">
                <p className="text-4xl mb-3">🔗</p>
                <p className="font-semibold text-gray-600">Aún no tienes código de referido</p>
                <p className="text-sm mt-2 max-w-xs mx-auto">
                  Pídele al administrador que te asigne un código en la sección de Usuarios.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Mi Perfil ───────────────────────────────────────────── */}
        {tab === "perfil" && (
          <form onSubmit={guardarPerfil} className="space-y-4">
            {/* Info card */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Informacion personal</h3>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Telefono</label>
                <input
                  type="tel"
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Punto de venta</label>
                <input
                  type="text"
                  value={editPuntoVenta}
                  onChange={(e) => setEditPuntoVenta(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  {usuario.email}
                </p>
              </div>
            </div>

            {/* Change password */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-gray-800">Cambiar contrasena</h3>
              <p className="text-xs text-gray-400">Deja en blanco si no deseas cambiarla</p>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Contraseña actual</label>
                <PasswordInput value={pwActual} onChange={setPwActual} placeholder="Contraseña actual" autoComplete="current-password" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Nueva contraseña</label>
                <PasswordInput value={pwNueva} onChange={setPwNueva} placeholder="Nueva contraseña" autoComplete="new-password" />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Confirmar nueva contraseña</label>
                <PasswordInput value={pwConfirmar} onChange={setPwConfirmar} placeholder="Confirmar contraseña" autoComplete="new-password" />
              </div>
            </div>

            {feedbackPerfil && (
              <div className={`rounded-xl p-3 text-sm text-center ${feedbackPerfil.tipo === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {feedbackPerfil.msg}
              </div>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    }>
      <PerfilInner />
    </Suspense>
  );
}
