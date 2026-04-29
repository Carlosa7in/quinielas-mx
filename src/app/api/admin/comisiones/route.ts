import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

async function verificarSuperadmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.role === "superadmin";
}

// GET /api/admin/comisiones?jornadaId=xxx (opcional)
export async function GET(req: NextRequest) {
  if (!(await verificarSuperadmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const jornadaId = req.nextUrl.searchParams.get("jornadaId") || undefined;

  // Todos los vendedores/admins
  const usuarios = await prisma.usuario.findMany({
    where: { rol: { in: ["admin", "vendedor"] } },
    select: { id: true, nombre: true, rol: true, puntoVenta: true },
    orderBy: { nombre: "asc" },
  });

  // Quinielas de tienda agrupadas por usuario
  const quinielas = await prisma.quiniela.findMany({
    where: {
      canal: "tienda",
      usuarioId: { not: null },
      ...(jornadaId ? { jornadaId } : {}),
    },
    select: {
      id: true,
      folio: true,
      monto: true,
      estado: true,
      usuarioId: true,
      jornada: { select: { numero: true, temporada: true, liga: true } },
    },
    orderBy: { folio: "desc" },
  });

  // Construir reporte por usuario
  const reporte = usuarios.map((u) => {
    const mis = quinielas.filter((q) => q.usuarioId === u.id);
    const total = mis.length;
    const recaudado = mis.reduce((s, q) => s + q.monto, 0);
    const ganadoras = mis.filter((q) => q.estado === "ganadora").length;
    return { ...u, total, recaudado, ganadoras, quinielas: mis };
  });

  // Sin asignar (tienda sin usuario)
  const sinAsignar = quinielas.filter((q) => !q.usuarioId);

  return NextResponse.json({ reporte, sinAsignar: sinAsignar.length });
}
