import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Rutas de admin protegidas
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    const rol = token.role as string;
    const rolesPermitidos = ["admin", "superadmin", "tienda", "vendedor"];
    if (!rolesPermitidos.includes(rol)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Rol tienda: acceso a su panel de registro presencial y perfil
    if (
      rol === "tienda" &&
      !pathname.startsWith("/admin/tienda") &&
      !pathname.startsWith("/admin/perfil") &&
      !pathname.startsWith("/admin/forma") &&
      !pathname.startsWith("/admin/apostadores") &&
      !pathname.startsWith("/admin/ganancias") &&
      !pathname.startsWith("/admin/mi-perfil") &&
      !pathname.startsWith("/admin/mi-link")
    ) {
      return NextResponse.redirect(new URL("/admin/tienda", req.url));
    }
    // Rol vendedor (solo referidos): acceso únicamente a su dashboard
    if (
      rol === "vendedor" &&
      !pathname.startsWith("/admin/perfil") &&
      !pathname.startsWith("/admin/apostadores") &&
      !pathname.startsWith("/admin/ganancias") &&
      !pathname.startsWith("/admin/mi-perfil") &&
      !pathname.startsWith("/admin/mi-link")
    ) {
      return NextResponse.redirect(new URL("/admin/perfil", req.url));
    }
    // Solo superadmin puede gestionar usuarios
    if (pathname.startsWith("/admin/usuarios") && rol !== "superadmin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    // Comisiones: superadmin ve todo, admin ve todo, vendedor/tienda solo sus ventas (via /admin/tienda)
    if (pathname.startsWith("/admin/comisiones") && !["superadmin", "admin"].includes(rol)) {
      return NextResponse.redirect(new URL("/admin/tienda", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
