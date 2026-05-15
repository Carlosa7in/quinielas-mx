import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = token.id as string;

  // Usuario actual (para codigoRef y nombre)
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { codigoRef: true, nombre: true },
  });

  // Jornada activa
  const jornadaActiva = await prisma.jornada.findFirst({
    where: { estado: "abierta" },
    orderBy: { numero: "desc" },
    select: { id: true, nombre: true, numero: true, liga: true },
  });

  // Todas las quinielas del usuario
  const quinielas = await prisma.quiniela.findMany({
    where: { usuarioId: userId },
    select: {
      clienteId: true,
      nombreCliente: true,
      telefonoCliente: true,
      jornadaId: true,
      folio: true,
      estadoPago: true,
    },
  });

  // Agrupa por nombre para construir apostadores
  const map = new Map<string, {
    nombre: string;
    telefono: string | null;
    totalQuinielas: number;
    folioActivo: string | null;
    estadoPagoActivo: string | null;
  }>();

  for (const q of quinielas) {
    const nombre = q.nombreCliente?.trim() ?? "Sin nombre";
    const key = nombre.toLowerCase();
    const telefono = q.telefonoCliente ?? null;

    if (!map.has(key)) {
      map.set(key, { nombre, telefono, totalQuinielas: 0, folioActivo: null, estadoPagoActivo: null });
    }
    const entry = map.get(key)!;
    entry.totalQuinielas += 1;

    // Si esta quiniela pertenece a la jornada activa, guarda folio y estadoPago
    if (jornadaActiva && q.jornadaId === jornadaActiva.id) {
      entry.folioActivo = q.folio;
      entry.estadoPagoActivo = q.estadoPago;
    }
  }

  const apostadores = Array.from(map.values()).sort((a, b) => b.totalQuinielas - a.totalQuinielas);

  return NextResponse.json({
    apostadores,
    jornadaActiva,
    codigoRef: usuario?.codigoRef ?? null,
  });
}
