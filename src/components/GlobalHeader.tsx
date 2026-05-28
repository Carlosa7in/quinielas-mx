"use client";
import { useState, useEffect } from "react";
import type React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Ticket, Search, Radio, BarChart2, BookOpen,
  ShieldCheck, User, Users, LogOut, LogIn, Menu, X, Globe, Hand,
} from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import type { Locale } from "@/lib/i18n";

// Rutas donde el header desaparece por completo
const OCULTAR_PREFIJOS = ["/login", "/kiosko"];
// Rutas donde solo aparece el botón flotante (sin barra ni espaciador)
const SOLO_BOTON_PREFIJOS = ["/admin"];

type MenuItem = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  highlight?: boolean;
};

const LOCALES: { id: Locale; flag: string; label: string }[] = [
  { id: "es", flag: "🇲🇽", label: "Español" },
  { id: "en", flag: "🇺🇸", label: "English" },
];

export function GlobalHeader() {
  const [abierto, setAbierto] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [locale, setLocale] = useLocale();

  const role = (session?.user as { role?: string })?.role ?? "";
  const logueado = status === "authenticated";
  const esAdmin = ["admin", "superadmin"].includes(role);
  const esStaff = ["admin", "superadmin", "tienda", "vendedor"].includes(role);

  // Cerrar drawer al navegar
  useEffect(() => { setAbierto(false); }, [pathname]);

  // Bloquear scroll cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [abierto]);

  // Ocultar completamente en login y kiosko
  if (OCULTAR_PREFIJOS.some((p) => pathname.startsWith(p))) return null;

  const soloBoton = SOLO_BOTON_PREFIJOS.some((p) => pathname.startsWith(p));

  const sz = { size: 16, strokeWidth: 1.75 };

  const itemsPublicos: MenuItem[] = [
    { href: "/",              label: "Inicio",             icon: <Home {...sz} /> },
    { href: "/quiniela",      label: "Registrar Quiniela", icon: <Ticket {...sz} />, highlight: true },
    { href: "/consultar",     label: "Consultar Quiniela", icon: <Search {...sz} /> },
    { href: "/mundial",       label: "Mundial 2026",       icon: <Globe {...sz} /> },
    { href: "/en-vivo",       label: "En Vivo",            icon: <Radio {...sz} /> },
    { href: "/clasificacion", label: "Clasificación",      icon: <BarChart2 {...sz} /> },
    { href: "/reglamento",    label: "Reglamento",         icon: <BookOpen {...sz} /> },
  ];

  const itemsStaff: MenuItem[] = [
    ...(esAdmin  ? [{ href: "/admin",                label: "Panel Admin",    icon: <ShieldCheck {...sz} /> }] : []),
    {               href: "/admin/perfil",            label: "Mi perfil",      icon: <User {...sz} /> },
    ...(esStaff  ? [{ href: "/admin/participantes",  label: "Participantes",  icon: <Users {...sz} /> }]  : []),
  ];

  const itemSalir: MenuItem = {
    label: "Cerrar sesión",
    icon: <LogOut {...sz} />,
    onClick: () => signOut({ callbackUrl: "/" }),
  };

  /* ─── Estilos de la barra según estado de sesión ─────────────────────── */
  const headerBg      = logueado ? "rgba(10,10,20,0.94)" : "rgba(10,10,20,0.78)";
  const headerBorder  = logueado ? "1px solid rgba(251,191,36,0.18)" : "1px solid rgba(255,255,255,0.07)";

  return (
    <>
      {/* Espaciador en flujo — empuja el contenido de la página hacia abajo */}
      <div className="h-14 shrink-0" />

      {/* ── Barra fija superior ──────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 gap-3"
        style={{ background: headerBg, backdropFilter: "blur(14px)", borderBottom: headerBorder }}
      >
        {soloBoton ? (
          /* Admin: logo a la izquierda igual que en páginas públicas */
          <Link href="/" className="flex-1 flex items-center" onClick={() => setAbierto(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "28px", objectFit: "contain" }} />
          </Link>
        ) : (
          <>
            {/* Público: logo + saludo */}
            <Link href="/" className="flex-1 flex items-center" onClick={() => setAbierto(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "28px", objectFit: "contain" }} />
            </Link>
            {logueado && session?.user?.name && (
              <p className="text-amber-300/60 text-xs font-medium truncate max-w-[130px] flex items-center gap-1 shrink-0">
                <Hand size={12} strokeWidth={1.75} className="shrink-0" />
                {session.user.name.split(" ")[0]}
              </p>
            )}
          </>
        )}

        {/* Botón hamburguesa — mismo estilo en todas las rutas */}
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-white shrink-0"
          style={{
            background: abierto
              ? "rgba(251,191,36,0.2)"
              : logueado
                ? "rgba(251,191,36,0.12)"
                : "rgba(255,255,255,0.1)",
            border: logueado ? "1px solid rgba(251,191,36,0.2)" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {abierto ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        </button>
      </header>

      {/* Overlay oscuro */}
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          style={{ top: 0 }}
          onClick={() => setAbierto(false)}
        />
      )}

      {/* ── Drawer desde la derecha ─────────────────────────────────────── */}
      <div
        className="fixed top-0 right-0 h-full w-72 z-50 flex flex-col shadow-2xl transition-transform duration-300"
        style={{
          background: "rgba(18,18,28,0.97)",
          backdropFilter: "blur(16px)",
          transform: abierto ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header del drawer */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "34px", objectFit: "contain" }} />
            {logueado && session?.user?.name && (
              <p className="text-amber-300/70 text-xs mt-2 truncate flex items-center gap-1.5">
                <Hand size={13} strokeWidth={1.75} className="shrink-0" />
                Hola, {session.user.name.split(" ")[0]}
              </p>
            )}
          </div>
          <button
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="ml-3 mt-0.5 text-white/30 hover:text-white/70 transition-colors shrink-0"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {itemsPublicos.map((item) => (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setAbierto(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-amber-600/20 text-amber-300"
                  : item.highlight
                    ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                    : "text-white/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              <span className="w-5 flex items-center justify-center shrink-0 opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Sección Mi cuenta (logueado) */}
          {logueado && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Mi cuenta</p>
              </div>
              {itemsStaff.map((item) => (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={() => setAbierto(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-amber-600/20 text-amber-300"
                      : "text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <span className="w-5 flex items-center justify-center shrink-0 opacity-80">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={itemSalir.onClick}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                <span className="w-5 flex items-center justify-center shrink-0 opacity-80">{itemSalir.icon}</span>
                {itemSalir.label}
              </button>
            </>
          )}

          {/* Login (no logueado) */}
          {!logueado && status !== "loading" && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Acceso</p>
              </div>
              <Link
                href="/login"
                onClick={() => setAbierto(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white transition-colors"
              >
                <span className="w-5 flex items-center justify-center shrink-0 opacity-80">
                  <LogIn size={16} strokeWidth={1.75} />
                </span>
                Iniciar sesión
              </Link>
            </>
          )}
        </nav>

        {/* Footer: idioma + branding */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          {/* Selector de idioma */}
          <div>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2 px-1">Idioma</p>
            <div className="flex gap-2">
              {LOCALES.map((op) => (
                <button
                  key={op.id}
                  onClick={() => setLocale(op.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    locale === op.id
                      ? "bg-amber-500/25 text-amber-300 ring-1 ring-amber-400/40"
                      : "text-white/40 hover:text-white/70 hover:bg-white/8"
                  }`}
                >
                  <span className="text-base leading-none">{op.flag}</span>
                  {op.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-white/15 text-[10px] text-center">tablitasquinielas.com</p>
        </div>
      </div>
    </>
  );
}
