import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = token.id as string;

  // Get user data (no DateTime fields in select)
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      rol: true,
      puntoVenta: true,
      username: true,
    },
  });

  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Get quinielas for this user (no DateTime in select)
  const quinielas = await prisma.quiniela.findMany({
    where: { usuarioId: userId },
    select: {
      id: true,
      folio: true,
      monto: true,
      canal: true,
      estado: true,
      estadoPago: true,
      nombreCliente: true,
      telefonoCliente: true,
      clienteId: true,
      jornadaId: true,
      jornada: {
        select: {
          id: true,
          nombre: true,
          numero: true,
          liga: true,
          temporada: true,
        },
      },
    },
  });

  // Stats
  const totalQuinielas = quinielas.length;
  const totalRecaudado = quinielas.reduce((s, q) => s + q.monto, 0);
  const tiendaQuinielas = quinielas.filter((q) => q.canal === "tienda");
  const comisionGanada = tiendaQuinielas.length * 2;

  // PagoComision via sql (DateTime fields)
  let pagosComision: Array<{ usuarioId: string; jornadaId: string; monto: number; pagadoEn: string }> = [];
  try {
    const rows = await sql`
      SELECT "usuarioId", "jornadaId", "monto", "pagadoEn"
      FROM "PagoComision"
      WHERE "usuarioId" = ${userId}
    `;
    pagosComision = rows as typeof pagosComision;
  } catch {
    // Table might not exist yet
  }

  const pagosPorJornada = new Map<string, { monto: number; pagadoEn: string }>();
  for (const p of pagosComision) {
    pagosPorJornada.set(p.jornadaId, { monto: p.monto, pagadoEn: p.pagadoEn });
  }

  // Group quinielas by jornada
  const porJornadaMap = new Map<string, {
    jornadaId: string;
    jornadaNombre: string;
    liga: string;
    total: number;
    tienda: number;
    online: number;
    recaudado: number;
    comision: number;
  }>();

  for (const q of quinielas) {
    const jId = q.jornadaId;
    const jNombre = q.jornada.nombre ?? `Jornada ${q.jornada.numero}`;
    if (!porJornadaMap.has(jId)) {
      porJornadaMap.set(jId, {
        jornadaId: jId,
        jornadaNombre: jNombre,
        liga: q.jornada.liga,
        total: 0,
        tienda: 0,
        online: 0,
        recaudado: 0,
        comision: 0,
      });
    }
    const entry = porJornadaMap.get(jId)!;
    entry.total += 1;
    entry.recaudado += q.monto;
    if (q.canal === "tienda") {
      entry.tienda += 1;
      entry.comision += 2;
    } else {
      entry.online += 1;
    }
  }

  const porJornada = Array.from(porJornadaMap.values()).map((j) => {
    const pago = pagosPorJornada.get(j.jornadaId);
    return {
      ...j,
      pagado: !!pago,
      pagadoEn: pago?.pagadoEn ?? null,
    };
  });

  // comisionPendiente: sum of comision in jornadas not yet paid
  const comisionPendiente = porJornada
    .filter((j) => !j.pagado)
    .reduce((s, j) => s + j.comision, 0);

  // Apostadores: group by clienteId or nombreCliente
  const apostadoresMap = new Map<string, { nombre: string; telefono: string | null; totalQuinielas: number }>();
  for (const q of quinielas) {
    const key = q.clienteId ?? q.nombreCliente ?? "sin-nombre";
    const nombre = q.nombreCliente ?? "Sin nombre";
    const telefono = q.telefonoCliente ?? null;
    if (!apostadoresMap.has(key)) {
      apostadoresMap.set(key, { nombre, telefono, totalQuinielas: 0 });
    }
    apostadoresMap.get(key)!.totalQuinielas += 1;
  }
  const apostadores = Array.from(apostadoresMap.values()).sort((a, b) => b.totalQuinielas - a.totalQuinielas);

  // Recientes: last 10 quinielas
  const recientes = quinielas
    .slice(-10)
    .reverse()
    .map((q) => ({
      folio: q.folio,
      monto: q.monto,
      canal: q.canal,
      estado: q.estado,
      nombreCliente: q.nombreCliente ?? null,
      jornadaNombre: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
    }));

  return NextResponse.json({
    usuario,
    stats: {
      totalQuinielas,
      totalRecaudado,
      comisionGanada,
      comisionPendiente,
    },
    porJornada,
    apostadores,
    recientes,
  });
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = token.id as string;

  const body = await req.json();
  const { nombre, telefono, puntoVenta, password, passwordActual } = body as {
    nombre?: string;
    telefono?: string;
    puntoVenta?: string;
    password?: string;
    passwordActual?: string;
  };

  // If changing password, verify current first
  if (password) {
    if (!passwordActual) {
      return NextResponse.json({ error: "Debes proporcionar la contraseña actual" }, { status: 400 });
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const valida = await bcrypt.compare(passwordActual, usuario.password);
    if (!valida) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
    }
  }

  const updateData: Record<string, string> = {};
  if (nombre !== undefined) updateData.nombre = nombre;
  if (telefono !== undefined) updateData.telefono = telefono;
  if (puntoVenta !== undefined) updateData.puntoVenta = puntoVenta;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  const updated = await prisma.usuario.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      rol: true,
      puntoVenta: true,
      username: true,
    },
  });

  return NextResponse.json({ usuario: updated });
}
