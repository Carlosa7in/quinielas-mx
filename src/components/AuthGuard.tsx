"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/", "/login", "/quiniela", "/ticket", "/consultar", "/kiosko"];

/**
 * Detecta cuando el navegador restaura una página protegida desde bfcache
 * (botón atrás después de cerrar sesión) y redirige al login inmediatamente.
 */
export function AuthGuard() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const statusRef = useRef(status);

  // Mantener ref actualizado sin causar re-renders adicionales
  statusRef.current = status;

  const isProtected = !PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Redirige cuando la sesión termina
  useEffect(() => {
    if (!isProtected) return;
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, isProtected, router]);

  // Detecta restauración desde bfcache (botón atrás del navegador/teléfono)
  useEffect(() => {
    if (!isProtected) return;

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && statusRef.current === "unauthenticated") {
        window.location.replace("/login");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [isProtected]);

  return null;
}
