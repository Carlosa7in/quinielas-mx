import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/premiacion?jornadaId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jornadaId = searchParams.get("jornadaId");

  if (!jornadaId) {
    return NextResponse.json({ error: "jornadaId requerido" }, { status: 400 });
  }

  try {
    const jornada = await prisma.jornada.findUnique({
      where: { id: jornadaId },
      select: {
        id: true,
        numero: true,
        nombre: true,
        temporada: true,
        liga: true,
        estado: true,
        bolsa2Acumulada: true,
        acumulaciones2: true,
      },
    });

    if (!jornada) {
      return NextResponse.json({ error: "Jornada no encontrada" }, { status: 404 });
    }

    // Prize pool: tienda (cash in hand, always counts) + online confirmed
    const todasConfirmadas = await prisma.quiniela.findMany({
      where: {
        jornadaId,
        OR: [
          { canal: "tienda" },           // efectivo en mano → siempre cuenta
          { estadoPago: "confirmado" },  // online → solo al confirmar pago
        ],
        estadoPago: { not: "no_realizado" }, // excluir los que explícitamente no pagaron
      },
      select: {
        id: true,
        folio: true,
        nombreCliente: true,
        telefonoCliente: true,
        aciertos: true,
        monto: true,
        premio: true,
      },
    });

    const totalRecaudado = todasConfirmadas.reduce((s, q) => s + q.monto, 0);

    // Prize constants (must match resultados/route.ts)
    const PORC_PRIMERO = 0.60;
    const PORC_SEGUNDO = 0.25;

    const bolsa1 = totalRecaudado * PORC_PRIMERO;
    const bolsa2Base = totalRecaudado * PORC_SEGUNDO;
    const bolsa2Total = bolsa2Base + (jornada.bolsa2Acumulada ?? 0);

    // Winners by prize assignment
    const ganadores1 = todasConfirmadas.filter((q) => q.premio !== null && q.premio > 0);
    const aciertosUnicos = [...new Set(todasConfirmadas.map((q) => q.aciertos ?? 0))].sort((a, b) => b - a);
    const maxAciertos = aciertosUnicos[0] ?? 0;
    const segundoAciertos = aciertosUnicos.length > 1 ? aciertosUnicos[1] : null;

    // Separate 1st vs 2nd place from premio field
    const g1 = todasConfirmadas
      .filter((q) => (q.aciertos ?? 0) === maxAciertos && q.premio !== null)
      .map((q) => ({
        folio: q.folio,
        nombre: q.nombreCliente,
        telefono: q.telefonoCliente,
        aciertos: q.aciertos,
        premio: q.premio,
      }));

    const g2 =
      segundoAciertos !== null
        ? todasConfirmadas
            .filter((q) => (q.aciertos ?? 0) === segundoAciertos && q.premio !== null)
            .map((q) => ({
              folio: q.folio,
              nombre: q.nombreCliente,
              telefono: q.telefonoCliente,
              aciertos: q.aciertos,
              premio: q.premio,
            }))
        : [];

    return NextResponse.json({
      jornada: {
        id: jornada.id,
        numero: jornada.numero,
        nombre: jornada.nombre,
        temporada: jornada.temporada,
        liga: jornada.liga,
        estado: jornada.estado,
        bolsa2Acumulada: jornada.bolsa2Acumulada,
        acumulaciones2: jornada.acumulaciones2,
      },
      totalRecaudado,
      bolsa1,
      bolsa2Total,
      ganadores1: g1,
      ganadores2: g2,
      totalConfirmadas: todasConfirmadas.length,
      acumulaciones2: jornada.acumulaciones2,
      segundoDistribuido: g2.length > 0,
    });
  } catch (err) {
    console.error("[PREMIACION] error:", err);
    return NextResponse.json({ error: "Error: " + String(err) }, { status: 500 });
  }
}
