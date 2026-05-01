import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ESTADOS_VALIDOS = ["pendiente", "confirmado", "no_realizado"];

// PATCH /api/admin/quinielas/[id]/pago  — actualizar estado de pago
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { estadoPago } = await req.json();

  if (!ESTADOS_VALIDOS.includes(estadoPago)) {
    return NextResponse.json({ error: "estadoPago inválido" }, { status: 400 });
  }

  try {
    await prisma.quiniela.update({
      where: { id },
      data: { estadoPago },
      select: { id: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH pago]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
