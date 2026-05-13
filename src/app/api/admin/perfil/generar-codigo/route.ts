import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// POST /api/admin/perfil/generar-codigo
// Genera un codigoRef único para el usuario si aún no tiene uno.
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = token.id as string;

  // Verificar si ya tiene código
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { codigoRef: true, nombre: true },
  });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (usuario.codigoRef) return NextResponse.json({ codigoRef: usuario.codigoRef });

  // Generar un código único basado en el nombre + random
  const base = (usuario.nombre ?? "USER")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);

  let codigo = base;
  let intentos = 0;
  while (intentos < 10) {
    const suffix = intentos === 0 ? "" : String(Math.floor(Math.random() * 90) + 10);
    codigo = (base + suffix).slice(0, 10);
    const existe = await prisma.usuario.findUnique({ where: { codigoRef: codigo } });
    if (!existe) break;
    intentos++;
  }

  const updated = await prisma.usuario.update({
    where: { id: userId },
    data: { codigoRef: codigo },
    select: { codigoRef: true },
  });

  return NextResponse.json({ codigoRef: updated.codigoRef });
}
