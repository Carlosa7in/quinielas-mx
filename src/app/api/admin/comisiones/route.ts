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
      vendedorId: true,
      jornadaId: true,
      nombreCliente: true,
      jornada: { select: { id: true, numero: true, nombre: true, liga: true, temporada: true } },
    },
    orderBy: { folio: "desc" },
  });

  // Recaudado TOTAL por jornada (TODAS las quinielas, de todos los usuarios)
  // Necesario para calcular el 15% de admins
  const todasLasQ = await prisma.quiniela.findMany({
    where: { estadoPago: "confirmado", ...(jornadaId ? { jornadaId } : {}) },
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
    usuarioId: string | null; vendedorId: string | null;
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
      comisionTienda: number;   // 10% de ventas en tienda
      comisionReferido: number; // 10% de ventas online confirmadas
      comision: number;         // tienda + referido (compat.)
      comisionAdmin: number;    // parte del 15% (solo para admin/superadmin)
      comisionDirecta: number;  // 10% de ventas directas inyectadas (superadmin)
      comisionTotal: number;    // suma de todos
      pagado: boolean;
      pagadoEn: string | null;
      montoPagado: number | null;
      quinielas: QItem[];
    }> = [];

    for (const [jId, qs] of jornadasMap.entries()) {
      const jornada = qs[0].jornada;
      const tienda = qs.filter((q) => q.canal === "tienda").length;
      const online = qs.filter((q) => q.canal !== "tienda").length;
      const recaudado = qs.filter((q) => q.estadoPago === "confirmado").reduce((s, q) => s + q.monto, 0);
      // Tienda: comisión inmediata (no requiere estadoPago=confirmado pues se cobra en caja)
      const comisionTienda = qs.filter((q) => q.canal === "tienda").reduce((s, q) => s + q.monto * COMISION_PCT, 0);
      // Referido (online): comisión solo cuando pago confirmado — aplica a TODOS los roles
      const comisionReferido = qs.filter((q) => q.canal !== "tienda" && q.estadoPago === "confirmado").reduce((s, q) => s + q.monto * COMISION_PCT, 0);
      const comision = comisionTienda + comisionReferido;
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
        comisionTienda,
        comisionReferido,
        comision,
        comisionAdmin,
        comisionDirecta: 0,
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
          usuarioId: q.usuarioId,
          vendedorId: q.vendedorId,
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
            comisionTienda: 0,
            comisionReferido: 0,
            comision: 0,
            comisionAdmin,
            comisionDirecta: 0,
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
    const recaudado = misQ.filter((q) => q.estadoPago === "confirmado").reduce((s, q) => s + q.monto, 0);
    // Tienda: siempre; online/referido: solo confirmados — aplica a todos los roles
    const comisionTiendaTotal = misQ
      .filter((q) => q.canal === "tienda" || q.estadoPago === "confirmado")
      .reduce((s, q) => s + q.monto * COMISION_PCT, 0);
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

  // Ventas directas (homepage, sin código de referido, sin vendedor) — $2 por quiniela confirmada → superadmin
  const ventasDirectas = esSuperadmin
    ? await prisma.quiniela.findMany({
        where: {
          usuarioId: null,
          vendedorId: null,          // excluir referidos de Vendedor (modelo separado)
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

  // Ventas referidas por Vendedor (modelo separado — no tienen usuarioId)
  const quinielasVendedor = esSuperadmin
    ? await prisma.quiniela.findMany({
        where: {
          vendedorId: { not: null },
          usuarioId: null,
          ...(jornadaId ? { jornadaId } : {}),
        },
        select: {
          id: true, folio: true, monto: true, estado: true, estadoPago: true,
          canal: true, nombreCliente: true, jornadaId: true, vendedorId: true,
          vendedor: { select: { id: true, nombre: true, codigo: true } },
          jornada: { select: { id: true, numero: true, nombre: true, liga: true, temporada: true } },
        },
        orderBy: { folio: "desc" },
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
          existente.comisionDirecta += comisionDirecta;
          existente.comisionTotal += comisionDirecta;
          existente.quinielas.push(...qs.map((q) => ({
            id: q.id, folio: q.folio, monto: q.monto, canal: q.canal,
            estado: q.estado, estadoPago: q.estadoPago, nombreCliente: q.nombreCliente,
            usuarioId: null, vendedorId: null,
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
            comisionTienda: 0,
            comisionReferido: 0,
            comision: 0,
            comisionAdmin: 0,
            comisionDirecta,
            comisionTotal: comisionDirecta,
            pagado: !!pago,
            pagadoEn: pago ? (pago.pagadoEn instanceof Date ? pago.pagadoEn.toISOString() : String(pago.pagadoEn)) : null,
            montoPagado: pago?.monto ?? null,
            quinielas: qs.map((q) => ({
              id: q.id, folio: q.folio, monto: q.monto, canal: q.canal,
              estado: q.estado, estadoPago: q.estadoPago, nombreCliente: q.nombreCliente,
              usuarioId: null, vendedorId: null,
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

  // ── Inyectar comisiones de Vendedores (modelo separado) al reporte ──────────
  if (esSuperadmin && quinielasVendedor.length > 0) {
    // Agrupar por vendedorId
    const vendedoresMap = new Map<string, {
      vendedor: { id: string; nombre: string; codigo: string };
      quinielas: typeof quinielasVendedor;
    }>();
    for (const q of quinielasVendedor) {
      if (!q.vendedor || !q.vendedorId) continue;
      if (!vendedoresMap.has(q.vendedorId)) {
        vendedoresMap.set(q.vendedorId, { vendedor: q.vendedor, quinielas: [] });
      }
      vendedoresMap.get(q.vendedorId)!.quinielas.push(q);
    }

    for (const [vendedorId, { vendedor, quinielas: vqs }] of vendedoresMap) {
      // Agrupar por jornada
      const jornadasMap = new Map<string, typeof vqs>();
      for (const q of vqs) {
        if (!jornadasMap.has(q.jornadaId)) jornadasMap.set(q.jornadaId, []);
        jornadasMap.get(q.jornadaId)!.push(q);
      }

      const porJornada: Array<{
        jornadaId: string; jornadaNombre: string; liga: string; temporada: string;
        total: number; tienda: number; online: number; recaudado: number;
        comisionTienda: number; comisionReferido: number; comision: number;
        comisionAdmin: number; comisionDirecta: number; comisionTotal: number;
        pagado: boolean; pagadoEn: string | null; montoPagado: number | null;
        quinielas: QItem[];
      }> = [];

      for (const [jId, qs] of jornadasMap.entries()) {
        const jornada = qs[0].jornada;
        const recaudado = qs.filter((q) => q.estadoPago === "confirmado").reduce((s, q) => s + q.monto, 0);
        const comisionReferido = qs.filter((q) => q.estadoPago === "confirmado").reduce((s, q) => s + q.monto * COMISION_PCT, 0);
        const pago = pagos.find((p) => p.usuarioId === vendedorId && p.jornadaId === jId);
        porJornada.push({
          jornadaId: jId,
          jornadaNombre: jornada.nombre ?? `Jornada ${jornada.numero}`,
          liga: jornada.liga,
          temporada: jornada.temporada,
          total: qs.length,
          tienda: 0,
          online: qs.length,
          recaudado,
          comisionTienda: 0,
          comisionReferido,
          comision: comisionReferido,
          comisionAdmin: 0,
          comisionDirecta: 0,
          comisionTotal: comisionReferido,
          pagado: !!pago,
          pagadoEn: pago ? (pago.pagadoEn instanceof Date ? pago.pagadoEn.toISOString() : String(pago.pagadoEn)) : null,
          montoPagado: pago?.monto ?? null,
          quinielas: qs.map((q) => ({
            id: q.id, folio: q.folio, monto: q.monto, canal: q.canal,
            estado: q.estado, estadoPago: q.estadoPago, nombreCliente: q.nombreCliente,
            usuarioId: null, vendedorId: q.vendedorId ?? null,
          })),
        });
      }

      const totalVendedor = vqs.length;
      const recaudadoVendedor = vqs.filter((q) => q.estadoPago === "confirmado").reduce((s, q) => s + q.monto, 0);
      const comisionVendedor = vqs.filter((q) => q.estadoPago === "confirmado").reduce((s, q) => s + q.monto * COMISION_PCT, 0);
      const pendientePago = porJornada.filter((j) => !j.pagado && j.comisionTotal > 0).reduce((s, j) => s + j.comisionTotal, 0);

      reporte.push({
        id: vendedorId,
        nombre: `${vendedor.nombre} [${vendedor.codigo}]`,
        rol: "vendedor",
        puntoVenta: null,
        total: totalVendedor,
        tienda: 0,
        online: totalVendedor,
        recaudado: recaudadoVendedor,
        ganadoras: vqs.filter((q) => q.estado === "ganadora").length,
        comisionTotal: comisionVendedor,
        comisionAdminTotal: 0,
        pendientePago,
        porJornada: porJornada.sort((a, b) => b.jornadaNombre.localeCompare(a.jornadaNombre)),
      });
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

  // Flujo de caja: efectivo (tienda) vs transferencias (online, todo cae en cuenta del superadmin)
  const efectivoTotal = todasLasQ.filter(q => {
    // necesitamos el canal — lo tomamos de las quinielas ya cargadas
    return false; // placeholder, calculamos abajo
  }).reduce((s, q) => s + q.monto, 0);

  // Recalcular desde quinielas completas (todasLasQ no tiene canal)
  const todasConfirmadasConCanal = await prisma.quiniela.findMany({
    where: { estadoPago: "confirmado", ...(jornadaId ? { jornadaId } : {}) },
    select: { monto: true, canal: true },
  });
  const efectivo       = todasConfirmadasConCanal.filter(q => q.canal === "tienda").reduce((s, q) => s + q.monto, 0);
  const transferencias = todasConfirmadasConCanal.filter(q => q.canal !== "tienda").reduce((s, q) => s + q.monto, 0);

  // Desglose por cuenta bancaria via SQL (evita error de Prisma client no regenerado)
  let porCuenta: { banco: string; titular: string; usuarioId: string; monto: number; count: number }[] = [];
  try {
    const rowsCuenta = await sql`
      SELECT
        COALESCE(cb."banco", 'Sin cuenta asignada') AS banco,
        COALESCE(cb."titular", '—') AS titular,
        COALESCE(cb."usuarioId", '') AS "usuarioId",
        SUM(q."monto")::float AS monto,
        COUNT(*)::int AS count
      FROM "Quiniela" q
      LEFT JOIN "CuentaBancaria" cb ON cb."id" = q."cuentaDestinoId"
      WHERE q."estadoPago" = 'confirmado'
        AND q."canal" != 'tienda'
        ${jornadaId ? sql`AND q."jornadaId" = ${jornadaId}` : sql``}
      GROUP BY cb."banco", cb."titular", cb."usuarioId"
      ORDER BY monto DESC
    `;
    porCuenta = rowsCuenta.map((r) => ({
      banco: String(r.banco),
      titular: String(r.titular),
      usuarioId: String(r.usuarioId),
      monto: Number(r.monto),
      count: Number(r.count),
    }));
  } catch {
    // Tabla CuentaBancaria aún no existe (antes de db push) — ignorar
    porCuenta = [];
  }

  // Comisiones que el superadmin debe pagar a otros (vendedores/referidos)
  const comisionesAPagar = reporte
    .filter(v => v.rol === "vendedor" || (v.rol !== "vendedor" && !["admin","superadmin"].includes(v.rol)))
    .reduce((s, v) => s + v.pendientePago, 0);

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
    flujo: { efectivo, transferencias, porCuenta },
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
