import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/resultados - registrar resultados y calcular ganadores
export async function POST(req: Request) {
  const body = await req.json();
  const { jornadaId, resultados } = body;
  // resultados: [{ partidoId, resultado: "1"|"X"|"2", golesLocal, golesVisita }]

  // Actualizar resultados de partidos
  for (const r of resultados) {
    await prisma.partido.update({
      where: { id: r.partidoId },
      data: {
        resultado: r.resultado,
        golesLocal: r.golesLocal,
        golesVisita: r.golesVisita,
      },
    });
  }

  // Marcar jornada como finalizada
  await prisma.jornada.update({
    where: { id: jornadaId },
    data: { estado: "finalizada" },
  });

  // Calcular aciertos para cada quiniela
  const quinielas = await prisma.quiniela.findMany({
    where: { jornadaId },
    include: { picks: true },
  });

  const resultadoMap: Record<string, string> = {};
  for (const r of resultados) {
    resultadoMap[r.partidoId] = r.resultado;
  }

  const totalPartidos = resultados.length;

  for (const quiniela of quinielas) {
    let aciertos = 0;

    for (const pick of quiniela.picks) {
      const resultadoCorrecto = resultadoMap[pick.partidoId];
      const acertado = pick.prediccion === resultadoCorrecto;

      await prisma.pick.update({
        where: { id: pick.id },
        data: { acertado },
      });

      if (acertado) aciertos++;
    }

    const esGanadora = aciertos === totalPartidos;

    await prisma.quiniela.update({
      where: { id: quiniela.id },
      data: {
        aciertos,
        puntos: aciertos,
        estado: esGanadora ? "ganadora" : "perdedora",
      },
    });
  }

  const ganadoras = await prisma.quiniela.findMany({
    where: { jornadaId, estado: "ganadora" },
    select: { folio: true, nombreCliente: true, aciertos: true },
  });

  return NextResponse.json({
    message: "Resultados registrados",
    ganadoras,
    totalQuinielas: quinielas.length,
  });
}
