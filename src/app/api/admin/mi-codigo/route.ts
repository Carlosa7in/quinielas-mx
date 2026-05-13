/**
 * GET /api/admin/mi-codigo
 * Endpoint mínimo que devuelve el codigoRef del usuario autenticado.
 * Separado de /api/admin/perfil para ser robusto e independiente.
 */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { id: token.id as string },
    select: { id: true, nombre: true, rol: true, codigoRef: true },
  });

  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    codigoRef: usuario.codigoRef ?? null,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });
}
