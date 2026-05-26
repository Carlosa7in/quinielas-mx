import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// POST /api/admin/premiacion/marcar-revisado
// Pone premio = 0 en todas las quinielas de la jornada que tengan
// aciertos calculados pero premio null → limpia la notificación
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { jornadaId } = await req.json();
  if (!jornadaId) return NextResponse.json({ error: "Falta jornadaId" }, { status: 400 });

  const { count } = await prisma.quiniela.updateMany({
    where: {
      jornadaId,
      aciertos: { not: null },
      premio: null,
      estadoPago: { not: "no_realizado" },
    },
    data: { premio: 0 },
  });

  return NextResponse.json({ ok: true, actualizadas: count });
}
