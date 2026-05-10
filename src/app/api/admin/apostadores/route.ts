import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = token.id as string;

  const quinielas = await prisma.quiniela.findMany({
    where: { usuarioId: userId },
    select: {
      clienteId: true,
      nombreCliente: true,
      telefonoCliente: true,
    },
  });

  const map = new Map<string, { nombre: string; telefono: string | null; totalQuinielas: number }>();
  for (const q of quinielas) {
    // Agrupar por nombre (normalizado) para que cada persona aparezca por separado
    // aunque compartan teléfono o clienteId
    const nombre = q.nombreCliente?.trim() ?? "Sin nombre";
    const key = nombre.toLowerCase();
    const telefono = q.telefonoCliente ?? null;
    if (!map.has(key)) {
      map.set(key, { nombre, telefono, totalQuinielas: 0 });
    }
    map.get(key)!.totalQuinielas += 1;
  }

  const apostadores = Array.from(map.values()).sort((a, b) => b.totalQuinielas - a.totalQuinielas);

  return NextResponse.json({ apostadores });
}
