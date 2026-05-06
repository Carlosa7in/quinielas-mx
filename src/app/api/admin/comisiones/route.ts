import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// GET /api/admin/comisiones?jornadaId=xxx (opcional)
// superadmin → ve todos | admin/vendedor/tienda → solo sus propias ventas
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const rol = token.role as string;
  const userId = token.id as string;
  const esSuperadmin = rol === "superadmin";
  const rolesPermitidos = ["superadmin", "admin", "vendedor", "tienda"];
  if (!rolesPermitidos.includes(rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const jornadaId = req.nextUrl.searchParams.get("jornadaId") || undefined;

  // Todos los usuarios que venden (todos los roles internos)
  const usuariosBase = await prisma.usuario.findMany({
    where: esSuperadmin
      ? { rol: { in: ["superadmin", "admin", "vendedor", "tienda"] } }
      : { id: userId },
    select: { id: true, nombre: true, rol: true, puntoVenta: true },
    orderBy: { nombre: "asc" },
  });

  // Quinielas: tanto canal "tienda" como "online" con usuarioId asignado
  const quinielas = await prisma.quiniela.findMany({
    where: {
      usuarioId: esSuperadmin ? { not: null } : userId,
      ...(jornadaId ? { jornadaId } : {}),
    },
    select: {
      id: true,
      folio: true,
      monto: true,
      estado: true,
      canal: true,
      usuarioId: true,
      jornada: { select: { numero: true, temporada: true, liga: true } },
    },
    orderBy: { folio: "desc" },
  });

  // Construir reporte por usuario
  const reporte = usuariosBase.map((u) => {
    const mis = quinielas.filter((q) => q.usuarioId === u.id);
    const total = mis.length;
    const recaudado = mis.reduce((s, q) => s + q.monto, 0);
    const ganadoras = mis.filter((q) => q.estado === "ganadora").length;
    const tienda = mis.filter((q) => q.canal === "tienda").length;
    const online = mis.filter((q) => q.canal === "online").length;
    return { ...u, total, recaudado, ganadoras, tienda, online };
  });

  // Sin asignar: quinielas de tienda que no tienen usuarioId (solo visible para superadmin)
  const sinAsignarQuinielas = esSuperadmin
    ? await prisma.quiniela.findMany({
        where: {
          canal: "tienda",
          usuarioId: null,
          ...(jornadaId ? { jornadaId } : {}),
        },
        select: { id: true },
      })
    : [];

  return NextResponse.json({
    reporte,
    sinAsignar: sinAsignarQuinielas.length,
    esSuperadmin,
  });
}
