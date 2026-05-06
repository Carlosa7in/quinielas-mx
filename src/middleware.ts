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
    // Rol tienda/vendedor: solo puede entrar a /admin/tienda y /admin/perfil
    if (
      (rol === "tienda" || rol === "vendedor") &&
      !pathname.startsWith("/admin/tienda") &&
      !pathname.startsWith("/admin/perfil")
    ) {
      return NextResponse.redirect(new URL("/admin/tienda", req.url));
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
