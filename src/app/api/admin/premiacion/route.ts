import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";

const COMISION_PCT = 0.10; // 10% del monto por venta
const PORC_ADMIN = 0.15;
const PORC_PRIMERO = 0.60;
const PORC_SEGUNDO = 0.25;

// GET /api/admin/premiacion?jornadaId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jornadaId = searchParams.get("jornadaId");

  if (!jornadaId) {
    return NextResponse.json({ error: "jornadaId requerido" }, { status: 400 });
  }

  try {
    // sql directo — evita bug {} en campos DateTime con adaptador NeonHTTP
    const jornadaRows = await sql`
      SELECT id, numero, nombre, temporada, liga, estado, "bolsa2Acumulada", "acumulaciones2"
      FROM "Jornada" WHERE id = ${jornadaId}
    `;
    const jornada = jornadaRows[0] as {
      id: string; numero: number; nombre: string | null; temporada: string;
      liga: string; estado: string; bolsa2Acumulada: number; acumulaciones2: number;
    } | undefined;

    if (!jornada) {
      return NextResponse.json({ error: "Jornada no encontrada" }, { status: 404 });
    }

    // Todas las quinielas en juego: tienda (efectivo) + online confirmadas
    const todasQuinielas = await prisma.quiniela.findMany({
      where: {
        jornadaId,
        OR: [{ canal: "tienda" }, { estadoPago: "confirmado" }],
        estadoPago: { not: "no_realizado" },
      },
      select: {
        id: true, folio: true, nombreCliente: true, telefonoCliente: true,
        aciertos: true, monto: true, premio: true, canal: true,
        usuarioId: true, estadoPago: true,
      },
    });

    const totalRecaudado = todasQuinielas.reduce((s, q) => s + q.monto, 0);

    // Comisiones por tipo de venta
    const qTienda    = todasQuinielas.filter((q) => q.canal === "tienda");
    const qReferido  = todasQuinielas.filter((q) => q.canal !== "tienda" && q.usuarioId !== null && q.estadoPago === "confirmado");
    const qDirecta   = todasQuinielas.filter((q) => q.canal !== "tienda" && q.usuarioId === null && q.estadoPago === "confirmado");

    const tiendaCount   = qTienda.length;
    const referidoCount = qReferido.length;
    const directaCount  = qDirecta.length;

    // Comisión 10% del monto por cada venta (se pagan del fondo admin, no del pozo de premios)
    const comisionTienda   = qTienda.reduce((s, q) => s + q.monto * COMISION_PCT, 0);
    const comisionReferido = qReferido.reduce((s, q) => s + q.monto * COMISION_PCT, 0);
    const comisionDirecta  = qDirecta.reduce((s, q) => s + q.monto * COMISION_PCT, 0);
    const totalComisiones  = comisionTienda + comisionReferido + comisionDirecta;

    // Fondo admin: 15% del total.
    // Comisiones (tienda/referido/directa): deducciones separadas del pozo de premios.
    const fondoAdmin  = totalRecaudado * PORC_ADMIN;                  // $87

    // Bolsa neta: lo que queda después de sacar la casa Y las comisiones
    const bolsaNeta   = totalRecaudado - fondoAdmin - totalComisiones; // $435

    // Premios: reparto proporcional 60:25 de la bolsa neta
    const bolsa1      = bolsaNeta * (PORC_PRIMERO / (PORC_PRIMERO + PORC_SEGUNDO));
    const bolsa2Base  = bolsaNeta * (PORC_SEGUNDO  / (PORC_PRIMERO + PORC_SEGUNDO));
    const bolsa2Total = bolsa2Base + (jornada.bolsa2Acumulada ?? 0);

    // Ganadores (por aciertos) — recalcular premios correctos (Math.floor, no DB)
    const aciertosUnicos = [
      ...new Set(todasQuinielas.map((q) => q.aciertos ?? 0)),
    ].sort((a, b) => b - a);
    const maxAciertos    = aciertosUnicos[0] ?? 0;
    const segundoAciertos = aciertosUnicos.length > 1 ? aciertosUnicos[1] : null;

    const ganadores1Raw = todasQuinielas.filter((q) => (q.aciertos ?? 0) === maxAciertos);
    const ganadores2Raw = segundoAciertos !== null
      ? todasQuinielas.filter((q) => (q.aciertos ?? 0) === segundoAciertos)
      : [];

    // Recalcular premios (floored) — ignorar valores almacenados en DB
    const MAX_GANADORES_2 = 20;
    const MAX_ACUMULACIONES = 2;
    const segundoDistribuidoCalc =
      ganadores2Raw.length > 0 &&
      (ganadores2Raw.length <= MAX_GANADORES_2 || (jornada.acumulaciones2 ?? 0) >= MAX_ACUMULACIONES);

    const premio1Cada = ganadores1Raw.length > 0 ? Math.floor(bolsa1 / ganadores1Raw.length) : 0;
    const premio2Cada = segundoDistribuidoCalc && ganadores2Raw.length > 0
      ? Math.floor(bolsa2Total / ganadores2Raw.length)
      : 0;

    const g1 = ganadores1Raw
      .map((q) => ({ folio: q.folio, nombre: q.nombreCliente, telefono: q.telefonoCliente, aciertos: q.aciertos, premio: premio1Cada }));

    const g2 = segundoDistribuidoCalc
      ? ganadores2Raw.map((q) => ({ folio: q.folio, nombre: q.nombreCliente, telefono: q.telefonoCliente, aciertos: q.aciertos, premio: premio2Cada }))
      : [];

    return NextResponse.json({
      jornada: {
        id: jornada.id, numero: jornada.numero, nombre: jornada.nombre,
        temporada: jornada.temporada, liga: jornada.liga, estado: jornada.estado,
        bolsa2Acumulada: jornada.bolsa2Acumulada, acumulaciones2: jornada.acumulaciones2,
      },
      totalRecaudado,
      totalEnJuego: todasQuinielas.length,
      desglose: {
        fondoAdmin,
        comisionTienda,   tiendaCount,
        comisionReferido, referidoCount,
        comisionDirecta,  directaCount,
        totalComisiones,
        bolsaNeta,
      },
      bolsa1,
      bolsa2Total,
      ganadores1: g1,
      ganadores2: g2,
      acumulaciones2: jornada.acumulaciones2,
      segundoDistribuido: segundoDistribuidoCalc,
    });
  } catch (err) {
    console.error("[PREMIACION] error:", err);
    return NextResponse.json({ error: "Error: " + String(err) }, { status: 500 });
  }
}
