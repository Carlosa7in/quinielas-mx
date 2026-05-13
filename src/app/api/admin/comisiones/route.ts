import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

// GET /api/admin/comisiones?jornadaId=xxx
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const rol = token.role as string;
  const userId = token.id as string;
  const esSuperadmin = rol === "superadmin";
  const rolesPermitidos = ["superadmin", "admin", "vendedor", "tienda"];
  if (!rolesPermitidos.includes(rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const jornadaId = req.nextUrl.searchParams.get("jornadaId") || undefined;

  // Usuarios del reporte
  const usuarios = await prisma.usuario.findMany({
    where: esSuperadmin
      ? { rol: { in: ["superadmin", "admin", "vendedor", "tienda"] } }
      : { id: userId },
    select: { id: true, nombre: true, rol: true, puntoVenta: true },
    orderBy: { nombre: "asc" },
  });

  // Cuántos admins/superadmins hay (para repartir el 15%)
  const numAdmins = await prisma.usuario.count({
    where: { rol: { in: ["admin", "superadmin"] } },
  });

  // Quinielas del reporte (ventas por usuario)
  const quinielas = await prisma.quiniela.findMany({
    where: {
      usuarioId: esSuperadmin ? { not: null } : userId,
      ...(jornadaId ? { jornadaId } : {}),
    },
    select: {
      id: true,
      folio: true,
      monto: true,
      estado: true,
      estadoPago: true,
      canal: true,
      usuarioId: true,
      jornadaId: true,
      nombreCliente: true,
      jornada: { select: { id: true, numero: true, nombre: true, liga: true, temporada: true } },
    },
    orderBy: { folio: "desc" },
  });

  // Recaudado TOTAL por jornada (TODAS las quinielas, de todos los usuarios)
  // Necesario para calcular el 15% de admins
  const todasLasQ = await prisma.quiniela.findMany({
    where: jornadaId ? { jornadaId } : {},
    select: {
      jornadaId: true,
      monto: true,
      jornada: { select: { id: true, nombre: true, numero: true, liga: true, temporada: true } },
    },
  });

  const recaudadoGlobalPorJornada = new Map<string, {
    recaudado: number;
    jornadaNombre: string;
    liga: string;
    temporada: string;
  }>();
  for (const q of todasLasQ) {
    const jId = q.jornadaId;
    if (!recaudadoGlobalPorJornada.has(jId)) {
      recaudadoGlobalPorJornada.set(jId, {
        recaudado: 0,
        jornadaNombre: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
        liga: q.jornada.liga,
        temporada: q.jornada.temporada,
      });
    }
    recaudadoGlobalPorJornada.get(jId)!.recaudado += q.monto;
  }

  // Pagos de comisión registrados
  let pagos: { usuarioId: string; jornadaId: string; monto: number; pagadoEn: string | Date }[] = [];
  try {
    const rows = await sql`SELECT "usuarioId", "jornadaId", "monto", "pagadoEn" FROM "PagoComision"`;
    pagos = rows.map((r) => ({
      usuarioId: String(r.usuarioId),
      jornadaId: String(r.jornadaId),
      monto: Number(r.monto),
      pagadoEn: r.pagadoEn instanceof Date ? r.pagadoEn : new Date(String(r.pagadoEn)),
    }));
  } catch { /* tabla aún no existe — ignorar */ }

  const COMISION_PCT = 0.10; // 10% del monto vendido (sencilla=$2, doble=$4, triple=$6…)
  const esRolAdmin = (r: string) => r === "admin" || r === "superadmin";

  type QItem = {
    id: string; folio: string; monto: number; canal: string;
    estado: string; estadoPago: string; nombreCliente: string | null;
  };

  const reporte = usuarios.map((u) => {
    const misQ = quinielas.filter((q) => q.usuarioId === u.id);

    // Jornadas donde el usuario vendió personalmente
    const jornadasMap = new Map<string, typeof misQ>();
    for (const q of misQ) {
      if (!jornadasMap.has(q.jornadaId)) jornadasMap.set(q.jornadaId, []);
      jornadasMap.get(q.jornadaId)!.push(q);
    }

    // Construir porJornada con ventas personales
    const porJornada: Array<{
      jornadaId: string;
      jornadaNombre: string;
      liga: string;
      temporada: string;
      total: number;
      tienda: number;
      online: number;
      recaudado: number;
      comision: number;        // comisión tienda ($2/quiniela)
      comisionAdmin: number;   // parte del 15% (solo para admin/superadmin)
      comisionTotal: number;   // suma de ambas
      pagado: boolean;
      pagadoEn: string | null;
      montoPagado: number | null;
      quinielas: QItem[];
    }> = [];

    for (const [jId, qs] of jornadasMap.entries()) {
      const jornada = qs[0].jornada;
      const tienda = qs.filter((q) => q.canal === "tienda").length;
      const online = qs.filter((q) => q.canal !== "tienda").length;
      const recaudado = qs.reduce((s, q) => s + q.monto, 0);
      const comision = u.rol === "vendedor"
        ? qs.filter((q) => q.estadoPago === "confirmado").reduce((s, q) => s + q.monto * COMISION_PCT, 0)
        : qs.filter((q) => q.canal === "tienda").reduce((s, q) => s + q.monto * COMISION_PCT, 0);
      const globalJ = recaudadoGlobalPorJornada.get(jId);
      const comisionAdmin = esRolAdmin(u.rol) && numAdmins > 0 && globalJ
        ? (globalJ.recaudado * 0.15) / numAdmins
        : 0;
      const pago = pagos.find((p) => p.usuarioId === u.id && p.jornadaId === jId);
      porJornada.push({
        jornadaId: jId,
        jornadaNombre: jornada.nombre ?? `Jornada ${jornada.numero}`,
        liga: jornada.liga,
        temporada: jornada.temporada,
        total: qs.length,
        tienda,
        online,
        recaudado,
        comision,
        comisionAdmin,
        comisionTotal: comision + comisionAdmin,
        pagado: !!pago,
        pagadoEn: pago ? (pago.pagadoEn instanceof Date ? pago.pagadoEn.toISOString() : String(pago.pagadoEn)) : null,
        montoPagado: pago?.monto ?? null,
        quinielas: qs.map((q) => ({
          id: q.id,
          folio: q.folio,
          monto: q.monto,
          canal: q.canal,
          estado: q.estado,
          estadoPago: q.estadoPago,
          nombreCliente: q.nombreCliente,
        })),
      });
    }

    // Para admin/superadmin: agregar jornadas donde NO vendieron pero tienen parte del 15%
    if (esRolAdmin(u.rol) && numAdmins > 0) {
      for (const [jId, globalJ] of recaudadoGlobalPorJornada.entries()) {
        if (!jornadasMap.has(jId)) {
          const comisionAdmin = (globalJ.recaudado * 0.15) / numAdmins;
          const pago = pagos.find((p) => p.usuarioId === u.id && p.jornadaId === jId);
          porJornada.push({
            jornadaId: jId,
            jornadaNombre: globalJ.jornadaNombre,
            liga: globalJ.liga,
            temporada: globalJ.temporada,
            total: 0,
            tienda: 0,
            online: 0,
            recaudado: 0,
            comision: 0,
            comisionAdmin,
            comisionTotal: comisionAdmin,
            pagado: !!pago,
            pagadoEn: pago ? (pago.pagadoEn instanceof Date ? pago.pagadoEn.toISOString() : String(pago.pagadoEn)) : null,
            montoPagado: pago?.monto ?? null,
            quinielas: [],
          });
        }
      }
    }

    // Totales del usuario
    const total = misQ.length;
    const tienda = misQ.filter((q) => q.canal === "tienda").length;
    const online = misQ.filter((q) => q.canal !== "tienda").length;
    const recaudado = misQ.reduce((s, q) => s + q.monto, 0);
    const comisionTiendaTotal = u.rol === "vendedor"
      ? misQ.filter((q) => q.estadoPago === "confirmado").reduce((s, q) => s + q.monto * COMISION_PCT, 0)
      : misQ.filter((q) => q.canal === "tienda").reduce((s, q) => s + q.monto * COMISION_PCT, 0);
    const comisionAdminTotal = porJornada.reduce((s, j) => s + j.comisionAdmin, 0);
    const ganadoras = misQ.filter((q) => q.estado === "ganadora").length;
    const pendientePago = porJornada
      .filter((j) => !j.pagado && j.comisionTotal > 0)
      .reduce((s, j) => s + j.comisionTotal, 0);

    return {
      ...u,
      total,
      tienda,
      online,
      recaudado,
      ganadoras,
      comisionTotal: comisionTiendaTotal,
      comisionAdminTotal,
      pendientePago,
      porJornada: porJornada.sort((a, b) => b.jornadaNombre.localeCompare(a.jornadaNombre)),
    };
  });

  // Ventas directas (homepage, sin código de referido) — $2 por quiniela confirmada → superadmin
  const ventasDirectas = esSuperadmin
    ? await prisma.quiniela.findMany({
        where: {
          usuarioId: null,
          canal: { not: "tienda" },  // tienda sin usuario = error de captura, no venta directa
          estadoPago: "confirmado",
          ...(jornadaId ? { jornadaId } : {}),
        },
        select: {
          id: true, folio: true, monto: true, estado: true, estadoPago: true,
          canal: true, nombreCliente: true, jornadaId: true,
          jornada: { select: { id: true, numero: true, nombre: true, liga: true, temporada: true } },
        },
      })
    : [];

  // Agrupar ventas directas por jornada
  const ventasDirectasPorJornada = new Map<string, typeof ventasDirectas>();
  for (const q of ventasDirectas) {
    if (!ventasDirectasPorJornada.has(q.jornadaId)) ventasDirectasPorJornada.set(q.jornadaId, []);
    ventasDirectasPorJornada.get(q.jornadaId)!.push(q);
  }

  // Cuántos superadmins hay (para repartir ventas directas si fueran varios)
  const numSuperadmins = await prisma.usuario.count({ where: { rol: "superadmin" } });

  // Inyectar comisiones de ventas directas al reporte de cada superadmin
  if (esSuperadmin) {
    for (const u of reporte) {
      if (u.rol !== "superadmin") continue;
      for (const [jId, qs] of ventasDirectasPorJornada.entries()) {
        const comisionDirecta = numSuperadmins > 0
          ? (qs.reduce((s, q) => s + q.monto, 0) * COMISION_PCT) / numSuperadmins
          : 0;
        const jornada = qs[0].jornada;
        const jornadaNombre = jornada.nombre ?? `Jornada ${jornada.numero}`;
        const existente = u.porJornada.find((j) => j.jornadaId === jId);
        if (existente) {
          existente.comision += comisionDirecta;
          existente.comisionTotal += comisionDirecta;
          existente.quinielas.push(...qs.map((q) => ({
            id: q.id, folio: q.folio, monto: q.monto, canal: "directa",
            estado: q.estado, estadoPago: q.estadoPago, nombreCliente: q.nombreCliente,
          })));
        } else {
          const pago = pagos.find((p) => p.usuarioId === u.id && p.jornadaId === jId);
          u.porJornada.push({
            jornadaId: jId,
            jornadaNombre,
            liga: jornada.liga,
            temporada: jornada.temporada,
            total: qs.length,
            tienda: 0,
            online: 0,
            recaudado: 0,
            comision: comisionDirecta,
            comisionAdmin: 0,
            comisionTotal: comisionDirecta,
            pagado: !!pago,
            pagadoEn: pago ? (pago.pagadoEn instanceof Date ? pago.pagadoEn.toISOString() : String(pago.pagadoEn)) : null,
            montoPagado: pago?.monto ?? null,
            quinielas: qs.map((q) => ({
              id: q.id, folio: q.folio, monto: q.monto, canal: "directa",
              estado: q.estado, estadoPago: q.estadoPago, nombreCliente: q.nombreCliente,
            })),
          });
        }
        u.comisionTotal += comisionDirecta;
        u.pendientePago = u.porJornada
          .filter((j) => !j.pagado && j.comisionTotal > 0)
          .reduce((s, j) => s + j.comisionTotal, 0);
      }
      u.porJornada.sort((a, b) => b.jornadaNombre.localeCompare(a.jornadaNombre));
    }
  }

  // Sin asignar (tienda sin usuario)
  const sinAsignarQuinielas = esSuperadmin
    ? await prisma.quiniela.findMany({
        where: { canal: "tienda", usuarioId: null, ...(jornadaId ? { jornadaId } : {}) },
        select: {
          id: true,
          folio: true,
          nombreCliente: true,
          monto: true,
          jornada: { select: { nombre: true, numero: true } },
        },
      })
    : [];

  const recaudadoGlobal = Array.from(recaudadoGlobalPorJornada.values()).reduce((s, j) => s + j.recaudado, 0);
  const totalGlobal = await prisma.quiniela.count({ where: jornadaId ? { jornadaId } : {} });

  return NextResponse.json({
    reporte,
    sinAsignar: sinAsignarQuinielas.length,
    sinAsignarDetalle: sinAsignarQuinielas.map((q) => ({
      folio: q.folio,
      nombreCliente: q.nombreCliente ?? "—",
      monto: q.monto,
      jornada: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
    })),
    esSuperadmin,
    numAdmins,
    recaudadoGlobal,
    totalGlobal,
    ventasDirectasConfirmadas: ventasDirectas.length,
    comisionDirectaTotal: ventasDirectas.reduce((s, q) => s + q.monto, 0) * COMISION_PCT,
  });
}

// POST /api/admin/comisiones — marcar comisión como pagada
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin puede registrar pagos" }, { status: 403 });
  }

  const { usuarioId, jornadaId, monto } = await req.json();
  if (!usuarioId || !jornadaId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const pagadoPor = token.id as string;
  const id = `${usuarioId}_${jornadaId}`;

  try {
    await sql`
      INSERT INTO "PagoComision" ("id", "usuarioId", "jornadaId", "monto", "pagadoPor", "pagadoEn", "createdAt")
      VALUES (${id}, ${usuarioId}, ${jornadaId}, ${monto ?? 0}, ${pagadoPor}, NOW(), NOW())
      ON CONFLICT ("usuarioId", "jornadaId") DO UPDATE
        SET "monto" = EXCLUDED."monto",
            "pagadoEn" = NOW(),
            "pagadoPor" = EXCLUDED."pagadoPor"
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/admin/comisiones — desmarcar pago (corrección)
export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const { usuarioId, jornadaId } = await req.json();
  try {
    await sql`DELETE FROM "PagoComision" WHERE "usuarioId" = ${usuarioId} AND "jornadaId" = ${jornadaId}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
