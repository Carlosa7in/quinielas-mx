import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

const ESTADOS_VALIDOS = ["pendiente", "confirmado", "no_realizado"];

// PATCH /api/admin/quinielas/[id]/pago  — actualizar estado de pago
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { estadoPago } = await req.json();

  if (!ESTADOS_VALIDOS.includes(estadoPago)) {
    return NextResponse.json({ error: "estadoPago inválido" }, { status: 400 });
  }

  // Quién está confirmando
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const confirmadoPor = token?.name ?? token?.email ?? "desconocido";

  try {
    await prisma.quiniela.update({
      where: { id },
      data: { estadoPago },
      select: { id: true },
    });

    // Guardar quién y cuándo confirmó (columnas opcionales — falla silenciosa si no existen aún)
    if (estadoPago === "confirmado") {
      try {
        await sql`
          UPDATE "Quiniela"
          SET "confirmadoPor" = ${confirmadoPor}, "confirmadoEn" = NOW()
          WHERE id = ${id}
        `;
      } catch { /* columnas aún no migradas — silencioso */ }
    }

    return NextResponse.json({ ok: true, confirmadoPor });
  } catch (err) {
    console.error("[PATCH pago]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
