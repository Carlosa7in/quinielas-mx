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

    // Comisión 10% del monto por cada venta
    const comisionTienda   = qTienda.reduce((s, q) => s + q.monto * COMISION_PCT, 0);
    const comisionReferido = qReferido.reduce((s, q) => s + q.monto * COMISION_PCT, 0);
    // Directas: 10% también va a la casa (no a ningún vendedor externo)
    const comisionDirecta  = qDirecta.reduce((s, q) => s + q.monto * COMISION_PCT, 0);
    const totalComisiones  = comisionTienda + comisionReferido + comisionDirecta;

    // Fondo admin: 15% del total + comisión directa (ventas sin referido → van a la casa)
    const fondoAdmin = totalRecaudado * PORC_ADMIN + comisionDirecta;

    // Bolsa neta para premios (total − fondo admin − com. tienda − com. referido)
    const bolsaNeta = Math.max(totalRecaudado - fondoAdmin - comisionTienda - comisionReferido, 0);

    // Bolsas de 1° y 2° lugar sobre la bolsa neta
    const bolsa1     = bolsaNeta * (PORC_PRIMERO / (PORC_PRIMERO + PORC_SEGUNDO)); // 60/85
    const bolsa2Base = bolsaNeta * (PORC_SEGUNDO / (PORC_PRIMERO + PORC_SEGUNDO)); // 25/85
    const bolsa2Total = bolsa2Base + (jornada.bolsa2Acumulada ?? 0);

    // Ganadores (por aciertos)
    const aciertosUnicos = [
      ...new Set(todasQuinielas.map((q) => q.aciertos ?? 0)),
    ].sort((a, b) => b - a);
    const maxAciertos    = aciertosUnicos[0] ?? 0;
    const segundoAciertos = aciertosUnicos.length > 1 ? aciertosUnicos[1] : null;

    const g1 = todasQuinielas
      .filter((q) => (q.aciertos ?? 0) === maxAciertos && q.premio !== null)
      .map((q) => ({ folio: q.folio, nombre: q.nombreCliente, telefono: q.telefonoCliente, aciertos: q.aciertos, premio: q.premio }));

    const g2 = segundoAciertos !== null
      ? todasQuinielas
          .filter((q) => (q.aciertos ?? 0) === segundoAciertos && q.premio !== null)
          .map((q) => ({ folio: q.folio, nombre: q.nombreCliente, telefono: q.telefonoCliente, aciertos: q.aciertos, premio: q.premio }))
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
      segundoDistribuido: g2.length > 0,
    });
  } catch (err) {
    console.error("[PREMIACION] error:", err);
    return NextResponse.json({ error: "Error: " + String(err) }, { status: 500 });
  }
}
