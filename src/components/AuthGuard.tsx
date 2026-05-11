"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/", "/login", "/quiniela", "/ticket", "/consultar"];

/**
 * Detecta cuando el navegador restaura una página protegida desde bfcache
 * (botón atrás después de cerrar sesión) y redirige al login inmediatamente.
 */
export function AuthGuard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isProtected = !PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  useEffect(() => {
    if (!isProtected) return;

    // Si la sesión ya cargó y no hay usuario → login
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    // Detecta restauración desde bfcache (botón atrás del navegador/teléfono)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && status === "unauthenticated") {
        window.location.replace("/login");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [status, isProtected, router]);

  return null;
}
