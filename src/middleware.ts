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
    const rolesPermitidos = ["admin", "superadmin", "tienda"];
    if (!rolesPermitidos.includes(rol)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Rol tienda: solo puede entrar a /admin/tienda
    if (rol === "tienda" && !pathname.startsWith("/admin/tienda")) {
      return NextResponse.redirect(new URL("/admin/tienda", req.url));
    }
    // Solo superadmin puede acceder a gestión de usuarios y comisiones
    if (pathname.startsWith("/admin/usuarios") && rol !== "superadmin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (pathname.startsWith("/admin/comisiones") && rol !== "superadmin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
