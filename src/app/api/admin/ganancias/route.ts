import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

const COMISION_PCT = 0.10;
const PCT_ADMIN    = 0.15;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const userId = token.id as string;

  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { rol: true },
  });
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const esVendedor = usuario.rol === "vendedor";
  const esAdmin    = usuario.rol === "superadmin";

  // Quinielas propias (todas)
  const quinielas = await prisma.quiniela.findMany({
    where: { usuarioId: userId },
    select: {
      folio: true, monto: true, canal: true,
      estadoPago: true, jornadaId: true, nombreCliente: true,
      jornada: { select: { id: true, nombre: true, numero: true, liga: true, temporada: true } },
    },
  });

  // Pagos de comisión registrados
  let pagosComision: Array<{ jornadaId: string; monto: number; pagadoEn: string }> = [];
  try {
    const rows = await sql`
      SELECT "jornadaId", "monto", "pagadoEn"
      FROM "PagoComision"
      WHERE "usuarioId" = ${userId}
    `;
    pagosComision = rows as typeof pagosComision;
  } catch { /* tabla puede no existir */ }

  const pagosPorJornada = new Map(pagosComision.map((p) => [p.jornadaId, p]));

  // Ventas personales agrupadas por jornada
  const porJornadaMap = new Map<string, {
    jornadaId: string; jornadaNombre: string; liga: string;
    total: number; tienda: number; online: number; recaudado: number; comision: number;
  }>();

  for (const q of quinielas) {
    const jId = q.jornadaId;
    if (!porJornadaMap.has(jId)) {
      porJornadaMap.set(jId, {
        jornadaId: jId,
        jornadaNombre: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
        liga: q.jornada.liga,
        total: 0, tienda: 0, online: 0, recaudado: 0, comision: 0,
      });
    }
    const e = porJornadaMap.get(jId)!;
    e.total += 1;
    if (q.estadoPago === "confirmado") e.recaudado += q.monto;
    if (q.canal === "tienda") {
      e.tienda += 1;
      e.comision += q.monto * COMISION_PCT;
    } else {
      e.online += 1;
      if (q.estadoPago === "confirmado") e.comision += q.monto * COMISION_PCT;
    }
  }

  const porJornada = Array.from(porJornadaMap.values()).map((j) => {
    const pago = pagosPorJornada.get(j.jornadaId);
    return { ...j, pagado: !!pago, pagadoEn: pago?.pagadoEn ?? null };
  });

  const totalComisionTienda  = porJornada.reduce((s, j) => s + j.comision, 0);
  const totalPagadoTienda    = porJornada.filter((j) => j.pagado).reduce((s, j) => s + j.comision, 0);
  const pendienteTienda      = totalComisionTienda - totalPagadoTienda;

  // ── Fondo de administración + desglose global — solo superadmin ──────────
  let comisionesAdmin: Array<{
    jornadaId: string; jornadaNombre: string; liga: string; temporada: string;
    recaudadoTotal: number; numAdmins: number; miParte: number;
    pagado: boolean; pagadoEn: string | null;
    // desglose
    fondoAdmin: number; comisionTienda: number; comisionReferido: number;
    comisionDirecta: number; bolsaNeta: number;
    ventasTienda: number; ventasReferido: number; ventasDirectas: number;
  }> = [];
  let totalComisionAdmin = 0;
  let pendienteAdmin     = 0;
  let desgloseGlobal: {
    recaudado: number; fondoAdmin: number; comisionTienda: number;
    comisionReferido: number; comisionDirecta: number; bolsaNeta: number;
    numAdmins: number; miParteTotal: number;
  } | null = null;

  if (esAdmin) {
    const numAdmins = await prisma.usuario.count({ where: { rol: "superadmin" } });
    const todasQ    = await prisma.quiniela.findMany({
      select: {
        jornadaId: true, monto: true, canal: true,
        usuarioId: true, vendedorId: true, estadoPago: true,
        jornada: { select: { id: true, nombre: true, numero: true, liga: true, temporada: true } },
      },
    });

    // Agrupa por jornada con todo el desglose
    const recMap = new Map<string, {
      recaudado: number;
      comisionTienda: number; comisionReferido: number; comisionDirecta: number;
      ventasTienda: number; ventasReferido: number; ventasDirectas: number;
      nombre: string; liga: string; temporada: string;
    }>();

    for (const q of todasQ) {
      if (!recMap.has(q.jornadaId)) {
        recMap.set(q.jornadaId, {
          recaudado: 0, comisionTienda: 0, comisionReferido: 0, comisionDirecta: 0,
          ventasTienda: 0, ventasReferido: 0, ventasDirectas: 0,
          nombre: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
          liga: q.jornada.liga, temporada: q.jornada.temporada,
        });
      }
      const e = recMap.get(q.jornadaId)!;
      if (q.estadoPago === "confirmado") e.recaudado += q.monto;

      if (q.canal === "tienda") {
        // Venta en tienda: comisión inmediata al vendedor
        e.comisionTienda += q.monto * COMISION_PCT;
        e.ventasTienda   += 1;
      } else if (q.usuarioId !== null || q.vendedorId !== null) {
        // Venta referida: comisión al confirmar pago
        if (q.estadoPago === "confirmado") e.comisionReferido += q.monto * COMISION_PCT;
        e.ventasReferido += 1;
      } else {
        // Venta directa (sin referido): comisión va al fondo
        if (q.estadoPago === "confirmado") e.comisionDirecta += q.monto * COMISION_PCT;
        e.ventasDirectas += 1;
      }
    }

    // Totales globales
    let gRecaudado = 0, gFondo = 0, gTienda = 0, gReferido = 0, gDirecta = 0, gMiParte = 0;

    for (const [jId, d] of recMap) {
      const fondoAdmin   = d.recaudado * PCT_ADMIN;   // solo el 15% base
      const bolsaNeta    = Math.max(d.recaudado - fondoAdmin - d.comisionTienda - d.comisionReferido - d.comisionDirecta, 0);
      const miParte      = numAdmins > 0 ? fondoAdmin / numAdmins : 0;
      const pago         = pagosPorJornada.get(jId);

      comisionesAdmin.push({
        jornadaId: jId, jornadaNombre: d.nombre, liga: d.liga, temporada: d.temporada,
        recaudadoTotal: d.recaudado, numAdmins, miParte,
        pagado: !!pago, pagadoEn: pago?.pagadoEn ?? null,
        fondoAdmin, comisionTienda: d.comisionTienda, comisionReferido: d.comisionReferido,
        comisionDirecta: d.comisionDirecta, bolsaNeta,
        ventasTienda: d.ventasTienda, ventasReferido: d.ventasReferido, ventasDirectas: d.ventasDirectas,
      });

      totalComisionAdmin += miParte;
      if (!pago) pendienteAdmin += miParte;

      gRecaudado += d.recaudado;
      gFondo     += fondoAdmin;
      gTienda    += d.comisionTienda;
      gReferido  += d.comisionReferido;
      gDirecta   += d.comisionDirecta;
      gMiParte   += miParte;
    }

    comisionesAdmin.sort((a, b) => b.jornadaNombre.localeCompare(a.jornadaNombre));

    desgloseGlobal = {
      recaudado:        gRecaudado,
      fondoAdmin:       gFondo,
      comisionTienda:   gTienda,
      comisionReferido: gReferido,
      comisionDirecta:  gDirecta,
      bolsaNeta:        Math.max(gRecaudado - gFondo - gTienda - gReferido - gDirecta, 0),
      numAdmins,
      miParteTotal:     gMiParte,
    };
  }

  // Últimas 15 quinielas
  const ultimasQuinielas = quinielas.slice(0, 15).map((q) => ({
    folio: q.folio,
    nombreCliente: q.nombreCliente ?? "—",
    canal: q.canal,
    monto: q.monto,
    estadoPago: q.estadoPago,
    jornada: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
  }));

  return NextResponse.json({
    porJornada,
    comisionesAdmin,
    ultimasQuinielas,
    desgloseGlobal,
    totales: {
      comisionTienda: totalComisionTienda,
      pagadoTienda:   totalPagadoTienda,
      pendienteTienda,
      comisionAdmin:  totalComisionAdmin,
      pendienteAdmin,
    },
    esVendedor,
    esAdmin,
  });
}
