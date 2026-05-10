import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// GET /api/admin/cliente?telefono=xxx
// Busca si ya existe un cliente con ese número
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const telefono = req.nextUrl.searchParams.get("telefono") ?? "";
  const telefonoLimpio = telefono.replace(/\D/g, "");

  if (telefonoLimpio.length < 10) {
    return NextResponse.json({ cliente: null });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { telefono: telefonoLimpio },
    select: { id: true, nombre: true, telefono: true },
  });

  return NextResponse.json({ cliente: cliente ?? null });
}
