import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

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
  const esAdmin = ["admin", "superadmin"].includes(usuario.rol);

  // Quinielas propias (todas, para stats + últimas)
  const quinielas = await prisma.quiniela.findMany({
    where: { usuarioId: userId },
    orderBy: { creadoEn: "desc" },
    select: {
      folio: true,
      monto: true,
      canal: true,
      estadoPago: true,
      jornadaId: true,
      nombreCliente: true,
      creadoEn: true,
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
    e.recaudado += q.monto;
    if (q.canal === "tienda") {
      e.tienda += 1;
      if (!esVendedor) e.comision += 2;
    } else {
      e.online += 1;
    }
    if (esVendedor && q.estadoPago === "confirmado") e.comision += 2;
  }

  const porJornada = Array.from(porJornadaMap.values()).map((j) => {
    const pago = pagosPorJornada.get(j.jornadaId);
    return { ...j, pagado: !!pago, pagadoEn: pago?.pagadoEn ?? null };
  });

  const totalComisionTienda = porJornada.reduce((s, j) => s + j.comision, 0);
  const totalPagadoTienda = porJornada.filter((j) => j.pagado).reduce((s, j) => s + j.comision, 0);
  const pendienteTienda = totalComisionTienda - totalPagadoTienda;

  // Fondo de administración — solo admins
  let comisionesAdmin: Array<{
    jornadaId: string; jornadaNombre: string; liga: string; temporada: string;
    recaudadoTotal: number; numAdmins: number; miParte: number; pagado: boolean; pagadoEn: string | null;
  }> = [];
  let totalComisionAdmin = 0;
  let pendienteAdmin = 0;

  if (esAdmin) {
    const numAdmins = await prisma.usuario.count({ where: { rol: { in: ["admin", "superadmin"] } } });
    const todasQ = await prisma.quiniela.findMany({
      select: {
        jornadaId: true, monto: true,
        jornada: { select: { id: true, nombre: true, numero: true, liga: true, temporada: true } },
      },
    });

    const recMap = new Map<string, { recaudado: number; nombre: string; liga: string; temporada: string }>();
    for (const q of todasQ) {
      if (!recMap.has(q.jornadaId)) {
        recMap.set(q.jornadaId, {
          recaudado: 0,
          nombre: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
          liga: q.jornada.liga,
          temporada: q.jornada.temporada,
        });
      }
      recMap.get(q.jornadaId)!.recaudado += q.monto;
    }

    for (const [jId, d] of recMap) {
      const miParte = numAdmins > 0 ? (d.recaudado * 0.15) / numAdmins : 0;
      const pago = pagosPorJornada.get(jId);
      comisionesAdmin.push({
        jornadaId: jId, jornadaNombre: d.nombre, liga: d.liga, temporada: d.temporada,
        recaudadoTotal: d.recaudado, numAdmins, miParte,
        pagado: !!pago, pagadoEn: pago?.pagadoEn ?? null,
      });
      totalComisionAdmin += miParte;
      if (!pago) pendienteAdmin += miParte;
    }
    comisionesAdmin.sort((a, b) => b.jornadaNombre.localeCompare(a.jornadaNombre));
  }

  // Últimas 15 quinielas para la tabla
  const ultimasQuinielas = quinielas.slice(0, 15).map((q) => ({
    folio: q.folio,
    nombreCliente: q.nombreCliente ?? "—",
    canal: q.canal,
    monto: q.monto,
    estadoPago: q.estadoPago,
    jornada: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
    creadoEn: q.creadoEn,
  }));

  return NextResponse.json({
    porJornada,
    comisionesAdmin,
    ultimasQuinielas,
    totales: {
      comisionTienda: totalComisionTienda,
      pagadoTienda: totalPagadoTienda,
      pendienteTienda,
      comisionAdmin: totalComisionAdmin,
      pendienteAdmin,
    },
    esVendedor,
    esAdmin,
  });
}
