import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/quinielas?jornadaId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jornadaId = searchParams.get("jornadaId");

  const quinielas = await prisma.quiniela.findMany({
    where: jornadaId ? { jornadaId } : undefined,
    select: {
      id: true,
      folio: true,
      nombreCliente: true,
      telefonoCliente: true,
      canal: true,
      monto: true,
      estado: true,
      puntos: true,
      aciertos: true,
      jornada: { select: { numero: true, temporada: true } },
      picks: {
        select: { id: true, prediccion: true, acertado: true, partidoId: true },
      },
    },
    orderBy: { folio: "desc" },
  });

  return NextResponse.json(quinielas);
}
