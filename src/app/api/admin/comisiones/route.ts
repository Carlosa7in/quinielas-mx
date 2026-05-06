import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

// GET /api/admin/comisiones?jornadaId=xxx
// superadmin → todos | admin/vendedor/tienda → solo sus propias ventas
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

  // Usuarios vendedores
  const usuarios = await prisma.usuario.findMany({
    where: esSuperadmin
      ? { rol: { in: ["superadmin", "admin", "vendedor", "tienda"] } }
      : { id: userId },
    select: { id: true, nombre: true, rol: true, puntoVenta: true },
    orderBy: { nombre: "asc" },
  });

  // Quinielas con usuarioId (ambos canales)
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

  const COMISION_TIENDA = 2;

  const reporte = usuarios.map((u) => {
    const misQ = quinielas.filter((q) => q.usuarioId === u.id);

    // Agrupar por jornada
    const jornadasMap = new Map<string, typeof misQ>();
    for (const q of misQ) {
      if (!jornadasMap.has(q.jornadaId)) jornadasMap.set(q.jornadaId, []);
      jornadasMap.get(q.jornadaId)!.push(q);
    }

    const porJornada = [...jornadasMap.entries()].map(([jId, qs]) => {
      const jornada = qs[0].jornada;
      const tienda = qs.filter((q) => q.canal === "tienda").length;
      const online = qs.filter((q) => q.canal === "online").length;
      const recaudado = qs.reduce((s, q) => s + q.monto, 0);
      const comision = tienda * COMISION_TIENDA;
      const pago = pagos.find((p) => p.usuarioId === u.id && p.jornadaId === jId);
      return {
        jornadaId: jId,
        jornadaNombre: jornada.nombre ?? `Jornada ${jornada.numero}`,
        liga: jornada.liga,
        temporada: jornada.temporada,
        total: qs.length,
        tienda,
        online,
        recaudado,
        comision,
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
      };
    });

    const total = misQ.length;
    const tienda = misQ.filter((q) => q.canal === "tienda").length;
    const online = misQ.filter((q) => q.canal === "online").length;
    const recaudado = misQ.reduce((s, q) => s + q.monto, 0);
    const comisionTotal = tienda * COMISION_TIENDA;
    const ganadoras = misQ.filter((q) => q.estado === "ganadora").length;
    const pendientePago = porJornada.filter((j) => !j.pagado && j.comision > 0).reduce((s, j) => s + j.comision, 0);

    return {
      ...u,
      total,
      tienda,
      online,
      recaudado,
      ganadoras,
      comisionTotal,
      pendientePago,
      porJornada: porJornada.sort((a, b) => b.jornadaNombre.localeCompare(a.jornadaNombre)),
    };
  });

  // Sin asignar
  const sinAsignarQuinielas = esSuperadmin
    ? await prisma.quiniela.findMany({
        where: { canal: "tienda", usuarioId: null, ...(jornadaId ? { jornadaId } : {}) },
        select: { id: true },
      })
    : [];

  return NextResponse.json({ reporte, sinAsignar: sinAsignarQuinielas.length, esSuperadmin });
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
