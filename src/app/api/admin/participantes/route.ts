import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

async function verificarAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.role === "admin" || token?.role === "superadmin";
}

// GET /api/admin/participantes — lista todos los clientes con stats
export async function GET(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const clientes = await prisma.cliente.findMany({
    select: {
      id: true,
      nombre: true,
      telefono: true,
      quinielas: {
        select: {
          id: true,
          folio: true,
          estado: true,
          aciertos: true,
          jornada: { select: { numero: true, temporada: true } },
        },
      },
    },
  });

  // Calcular stats por cliente
  const resultado = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    totalQuinielas: c.quinielas.length,
    ganadoras: c.quinielas.filter((q) => q.estado === "ganadora").length,
    ultimaJornada: c.quinielas.length > 0
      ? Math.max(...c.quinielas.map((q) => q.jornada.numero))
      : null,
  }));

  // Ordenar por más activos primero
  resultado.sort((a, b) => b.totalQuinielas - a.totalQuinielas);

  return NextResponse.json(resultado);
}
