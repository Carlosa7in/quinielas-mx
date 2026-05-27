"use client";
import { useState, useEffect } from "react";
import type React from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Ticket, Search, Trophy, Radio, BarChart2, BookOpen,
  ShieldCheck, User, Users, LogOut, LogIn, Menu, X, Globe, Hand,
} from "lucide-react";

type MenuItem = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  highlight?: boolean;
};

export function HamburgerMenu() {
  const [abierto, setAbierto] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const role = (session?.user as { role?: string })?.role ?? "";
  const logueado = status === "authenticated";
  const esAdmin = ["admin", "superadmin"].includes(role);
  const esStaff = ["admin", "superadmin", "tienda", "vendedor"].includes(role);

  // Cerrar al cambiar de página
  useEffect(() => { setAbierto(false); }, [pathname]);

  // Bloquear scroll del body cuando está abierto
  useEffect(() => {
    document.body.style.overflow = abierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [abierto]);

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
    ...(esAdmin ? [{ href: "/admin",           label: "Panel Admin",    icon: <ShieldCheck {...sz} /> }] : []),
    { href: "/admin/perfil",                    label: "Mi perfil",      icon: <User {...sz} /> },
    ...(esStaff ? [{ href: "/admin/participantes", label: "Participantes", icon: <Users {...sz} /> }] : []),
  ];

  const itemSalir: MenuItem = {
    label: "Cerrar sesión",
    icon: <LogOut {...sz} />,
    onClick: () => signOut({ callbackUrl: "/" }),
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all text-white"
        style={{
          background: abierto ? "rgba(30,30,30,0.95)" : "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
        }}
      >
        {abierto ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
      </button>

      {/* Overlay oscuro */}
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* Drawer desde la derecha */}
      <div
        className="fixed top-0 right-0 h-full w-72 z-50 flex flex-col shadow-2xl transition-transform duration-300"
        style={{
          background: "rgba(18,18,28,0.97)",
          backdropFilter: "blur(16px)",
          transform: abierto ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header del drawer */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "36px", objectFit: "contain" }} />
          {logueado && session?.user?.name && (
            <p className="text-amber-300/70 text-xs mt-2 truncate flex items-center gap-1.5">
              <Hand size={13} strokeWidth={1.75} className="shrink-0" />
              Hola, {session.user.name.split(" ")[0]}
            </p>
          )}
        </div>

        {/* Items públicos */}
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

          {/* Sección staff/admin */}
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

          {/* Login si no está logueado */}
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
                <span className="w-5 flex items-center justify-center shrink-0 opacity-80"><LogIn size={16} strokeWidth={1.75} /></span>
                Iniciar sesión
              </Link>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-white/20 text-[10px] text-center">tablitasquinielas.com</p>
        </div>
      </div>
    </>
  );
}
