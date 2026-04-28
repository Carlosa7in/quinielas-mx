import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/quinielas — jornadas con sus quinielas
export async function GET() {
  const jornadas = await prisma.jornada.findMany({
    select: {
      id: true,
      numero: true,
      temporada: true,
      liga: true,
      estado: true,
      quinielas: {
        select: {
          id: true,
          folio: true,
          nombreCliente: true,
          telefonoCliente: true,
          canal: true,
          monto: true,
          estado: true,
          aciertos: true,
          picks: { select: { prediccion: true, acertado: true } },
        },
        orderBy: { folio: "desc" },
      },
    },
    orderBy: { numero: "desc" },
  });

  return NextResponse.json(jornadas);
}
