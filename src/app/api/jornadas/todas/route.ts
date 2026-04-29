import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/jornadas/todas — todas las jornadas con stats básicas
export async function GET() {
  const jornadas = await prisma.jornada.findMany({
    select: {
      id: true,
      numero: true,
      temporada: true,
      liga: true,
      estado: true,
      _count: { select: { quinielas: true, partidos: true } },
      quinielas: { select: { monto: true, estado: true } },
    },
    orderBy: [{ liga: "desc" }, { numero: "desc" }],
  });

  // Calcular stats por jornada y devolver limpio
  const resultado = jornadas.map((j) => ({
    id: j.id,
    numero: j.numero,
    temporada: j.temporada,
    liga: j.liga,
    estado: j.estado,
    totalQuinielas: j._count.quinielas,
    totalPartidos: j._count.partidos,
    recaudado: j.quinielas.reduce((s, q) => s + q.monto, 0),
    ganadoras: j.quinielas.filter((q) => q.estado === "ganadora").length,
  }));

  return NextResponse.json(resultado);
}
