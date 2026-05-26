import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";

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
    // Nota: usamos sql directo (no prisma ORM) porque el adaptador NeonHTTP
    // devuelve {} para campos DateTime — sql() los omite y funciona bien.
    if (todosResueltos) {
      await sql`UPDATE "Jornada" SET estado = 'finalizada' WHERE id = ${jornadaId}`;

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

      // ── Prize calculation ──────────────────────────────────────────────────
      // Prize constants — easy to change
      const PORC_PRIMERO    = 0.60;
      const PORC_SEGUNDO    = 0.25;
      const PORC_ADMIN      = 0.15;
      const COMISION_PCT    = 0.10;  // 10% por venta (tienda/referido/directa)
      const MAX_GANADORES_2 = 20;
      const MAX_ACUMULACIONES = 2;

      // Get jornada with accumulated prize (sql directo — evita bug DateTime de NeonHTTP)
      const jornadaRows = await sql`
        SELECT "bolsa2Acumulada", "acumulaciones2" FROM "Jornada" WHERE id = ${jornadaId}
      `;
      const jornadaData = jornadaRows[0] as { bolsa2Acumulada: number; acumulaciones2: number } | undefined;

      // Prize pool: tienda (cash in hand) + online confirmed
      const todasConfirmadas = await prisma.quiniela.findMany({
        where: {
          jornadaId,
          OR: [{ canal: "tienda" }, { estadoPago: "confirmado" }],
          estadoPago: { not: "no_realizado" },
        },
        select: { id: true, monto: true, aciertos: true, nombreCliente: true, telefonoCliente: true, folio: true },
      });

      const totalRecaudado  = todasConfirmadas.reduce((s, q) => s + q.monto, 0);
      const fondoAdmin      = totalRecaudado * PORC_ADMIN;              // 15% casa
      const totalComisiones = totalRecaudado * COMISION_PCT;            // 10% ventas (tienda+referido+directa)
      const bolsaNeta       = totalRecaudado - fondoAdmin - totalComisiones; // lo que queda para premios
      const bolsa1     = bolsaNeta * (PORC_PRIMERO / (PORC_PRIMERO + PORC_SEGUNDO));
      const bolsa2Base = bolsaNeta * (PORC_SEGUNDO  / (PORC_PRIMERO + PORC_SEGUNDO));
      const bolsa2Total = bolsa2Base + (jornadaData?.bolsa2Acumulada ?? 0);

      // Find max aciertos (1st place)
      const maxAciertos = todasConfirmadas.length > 0 ? Math.max(...todasConfirmadas.map((q) => q.aciertos ?? 0)) : 0;
      const ganadores1 = todasConfirmadas.filter((q) => (q.aciertos ?? 0) === maxAciertos);
      const premio1Cada = ganadores1.length > 0 ? Math.floor(bolsa1 / ganadores1.length) : 0;

      // Find 2nd place (second highest aciertos, different from 1st)
      const aciertosUnicos = [...new Set(todasConfirmadas.map((q) => q.aciertos ?? 0))].sort((a, b) => b - a);
      const segundoAciertos = aciertosUnicos.length > 1 ? aciertosUnicos[1] : null;
      const ganadores2 = segundoAciertos !== null
        ? todasConfirmadas.filter((q) => (q.aciertos ?? 0) === segundoAciertos)
        : [];

      // Determine 2nd place distribution (Math.floor to truncate cents)
      let premio2Cada = 0;
      let bolsa2SiguienteJornada = 0;
      let acumulaciones2Nuevas = jornadaData?.acumulaciones2 ?? 0;
      let segundoDistribuido = false;

      if (ganadores2.length > 0) {
        if (ganadores2.length <= MAX_GANADORES_2 || acumulaciones2Nuevas >= MAX_ACUMULACIONES) {
          // Distribute (Math.floor to truncate cents)
          premio2Cada = Math.floor(bolsa2Total / ganadores2.length);
          segundoDistribuido = true;
          acumulaciones2Nuevas = 0;
          bolsa2SiguienteJornada = 0;
        } else {
          // Accumulate
          bolsa2SiguienteJornada = bolsa2Total;
          acumulaciones2Nuevas = acumulaciones2Nuevas + 1;
          segundoDistribuido = false;
        }
      }

      // Marcar TODAS las quinielas con aciertos: ganadores con su premio, perdedores con 0
      // Esto limpia la notificación "sin revisar premios" automáticamente
      const ganadores1Ids = new Set(ganadores1.map(q => q.id));
      const ganadores2Ids = new Set(ganadores2.map(q => q.id));
      for (const q of quinielas) {
        let premio = 0;
        if (ganadores1Ids.has(q.id)) premio = premio1Cada;
        else if (segundoDistribuido && ganadores2Ids.has(q.id)) premio = premio2Cada;
        await prisma.quiniela.update({ where: { id: q.id }, data: { premio }, select: { id: true } });
      }

      // Update current jornada acumulaciones counter (sql directo)
      await sql`UPDATE "Jornada" SET "acumulaciones2" = ${acumulaciones2Nuevas} WHERE id = ${jornadaId}`;

      // If 2nd prize accumulates, find the next open jornada and add to it
      if (!segundoDistribuido && bolsa2SiguienteJornada > 0) {
        const sigRows = await sql`
          SELECT id, "bolsa2Acumulada", "acumulaciones2"
          FROM "Jornada"
          WHERE estado = 'abierta' AND id != ${jornadaId}
          ORDER BY "createdAt" ASC
          LIMIT 1
        `;
        const siguienteJornada = sigRows[0] as { id: string; bolsa2Acumulada: number; acumulaciones2: number } | undefined;
        if (siguienteJornada) {
          const nuevaBolsa = (Number(siguienteJornada.bolsa2Acumulada) ?? 0) + bolsa2SiguienteJornada;
          await sql`
            UPDATE "Jornada"
            SET "bolsa2Acumulada" = ${nuevaBolsa}, "acumulaciones2" = ${acumulaciones2Nuevas}
            WHERE id = ${siguienteJornada.id}
          `;
        }
      }

      // Build premios summary for response
      const premios = {
        totalRecaudado,
        bolsa1,
        bolsa2Total,
        segundoDistribuido,
        acumulaciones2: acumulaciones2Nuevas,
        ganadores1: ganadores1.map((q) => ({
          folio: q.folio,
          nombre: q.nombreCliente,
          telefono: q.telefonoCliente,
          aciertos: q.aciertos,
          premio: premio1Cada,
        })),
        ganadores2: segundoDistribuido
          ? ganadores2.map((q) => ({
              folio: q.folio,
              nombre: q.nombreCliente,
              telefono: q.telefonoCliente,
              aciertos: q.aciertos,
              premio: premio2Cada,
            }))
          : [],
        bolsa2Acumulada: bolsa2SiguienteJornada,
      };
      // ── End prize calculation ──────────────────────────────────────────────

      return NextResponse.json({
        ok: true,
        resueltos,
        totalPartidos,
        finalizada: true,
        ganadoras,
        premios,
      });
    }

    return NextResponse.json({ ok: true, resueltos, totalPartidos, finalizada: false });
  } catch (err) {
    console.error("[RESULTADOS] error:", err);
    return NextResponse.json({ error: "Error: " + String(err) }, { status: 500 });
  }
}
