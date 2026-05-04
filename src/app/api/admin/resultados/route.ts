import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/resultados — guardar resultado de UN partido
// Body: { jornadaId, partidoId, resultado, golesLocal, golesVisita }
export async function POST(req: Request) {
  const body = await req.json();
  const { jornadaId, partidoId, resultado, golesLocal, golesVisita } = body;

  if (!jornadaId || !partidoId || !resultado) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  try {
    // 1. Actualizar el partido
    await prisma.partido.update({
      where: { id: partidoId },
      data: { resultado, golesLocal: golesLocal ?? 0, golesVisita: golesVisita ?? 0 },
      select: { id: true },
    });

    // 2. Obtener todos los picks de este partido
    const picks = await prisma.pick.findMany({
      where: { partidoId },
      select: { id: true, quinielaId: true, prediccion: true },
    });

    // 3. Actualizar acertado en cada pick y recalcular aciertos de su quiniela
    const quinielaIds = new Set<string>();
    for (const pick of picks) {
      const acertado = pick.prediccion === resultado;
      await prisma.pick.update({
        where: { id: pick.id },
        data: { acertado },
        select: { id: true },
      });
      quinielaIds.add(pick.quinielaId);
    }

    // 4. Recalcular aciertos de cada quiniela afectada
    // Acierto = partido donde AL MENOS UNA opción (doble/triple) fue correcta
    for (const quinielaId of quinielaIds) {
      const todosLosPicks = await prisma.pick.findMany({
        where: { quinielaId },
        select: { acertado: true, partidoId: true },
      });
      // Contar partidos únicos con al menos un pick acertado
      const partidosAcertados = new Set<string>();
      for (const p of todosLosPicks) {
        if (p.acertado === true) partidosAcertados.add(p.partidoId);
      }
      await prisma.quiniela.update({
        where: { id: quinielaId },
        data: { aciertos: partidosAcertados.size },
        select: { id: true },
      });
    }

    // 5. Verificar si todos los partidos de la jornada ya tienen resultado
    const partidos = await prisma.partido.findMany({
      where: { jornadaId },
      select: { id: true, resultado: true },
    });
    const totalPartidos = partidos.length;
    const resueltos = partidos.filter((p) => p.resultado !== null).length;
    const todosResueltos = resueltos === totalPartidos;

    // 6. Si todos están resueltos, finalizar jornada y marcar ganadoras
    if (todosResueltos) {
      await prisma.jornada.update({
        where: { id: jornadaId },
        data: { estado: "finalizada" },
        select: { id: true },
      });

      const quinielas = await prisma.quiniela.findMany({
        where: { jornadaId },
        select: { id: true, aciertos: true },
      });

      for (const q of quinielas) {
        const esGanadora = (q.aciertos ?? 0) === totalPartidos;
        await prisma.quiniela.update({
          where: { id: q.id },
          data: {
            puntos: q.aciertos ?? 0,
            estado: esGanadora ? "ganadora" : "perdedora",
          },
          select: { id: true },
        });
      }

      const ganadoras = await prisma.quiniela.findMany({
        where: { jornadaId, estado: "ganadora" },
        select: { folio: true, nombreCliente: true, aciertos: true },
      });

      return NextResponse.json({
        ok: true,
        resueltos,
        totalPartidos,
        finalizada: true,
        ganadoras,
      });
    }

    return NextResponse.json({ ok: true, resueltos, totalPartidos, finalizada: false });
  } catch (err) {
    console.error("[RESULTADOS] error:", err);
    return NextResponse.json({ error: "Error: " + String(err) }, { status: 500 });
  }
}
