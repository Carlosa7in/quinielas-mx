import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/preliminares — public leaderboard for active jornadas
export async function GET() {
  try {
    const jornadas = await prisma.jornada.findMany({
      where: { estado: "abierta" },
      select: {
        id: true,
        numero: true,
        temporada: true,
        liga: true,
        quinielas: {
          select: {
            folio: true,
            nombreCliente: true,
            estado: true,
            aciertos: true,
            picks: { select: { id: true } },
          },
          orderBy: [{ aciertos: "desc" }, { folio: "asc" }],
        },
      },
      orderBy: { numero: "desc" },
    });

    const resultado = jornadas.map((j) => ({
      id: j.id,
      numero: j.numero,
      temporada: j.temporada,
      liga: j.liga,
      totalQuinielas: j.quinielas.length,
      participantes: j.quinielas.map((q) => ({
        folio: q.folio,
        nombre: q.nombreCliente ?? "—",
        aciertos: q.aciertos,
        estado: q.estado,
        totalPicks: q.picks.length,
      })),
    }));

    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[PRELIMINARES]", err);
    return NextResponse.json({ error: "Error al cargar" }, { status: 500 });
  }
}
