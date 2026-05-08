import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — lista todos los vendedores con conteo y recaudado
export async function GET() {
  const vendedores = await prisma.vendedor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { quinielas: true } },
      quinielas: { select: { monto: true, estadoPago: true } },
    },
  });
  return NextResponse.json(vendedores);
}

// POST — crear vendedor { nombre, codigo }
export async function POST(req: Request) {
  const { nombre, codigo } = await req.json();
  if (!nombre?.trim() || !codigo?.trim()) {
    return NextResponse.json({ error: "Nombre y código requeridos" }, { status: 400 });
  }
  const codigoLimpio = codigo.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  try {
    const v = await prisma.vendedor.create({
      data: { nombre: nombre.trim(), codigo: codigoLimpio },
    });
    return NextResponse.json(v, { status: 201 });
  } catch {
    return NextResponse.json({ error: "El código ya existe" }, { status: 409 });
  }
}
