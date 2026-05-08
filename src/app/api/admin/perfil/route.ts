import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { calcularFechaCierre } from "@/lib/fechas";

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
      codigoRef: true,
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

  // Stats personales
  const totalQuinielas = quinielas.length;
  const totalRecaudado = quinielas.reduce((s, q) => s + q.monto, 0);
  const esVendedorReferido = usuario.rol === "vendedor";
  const tiendaQuinielas = quinielas.filter((q) => q.canal === "tienda");
  const comisionGanada = esVendedorReferido
    ? quinielas.filter((q) => q.estadoPago === "confirmado").length * 2
    : tiendaQuinielas.length * 2;

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

  // Group quinielas by jornada (ventas personales)
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
      if (!esVendedorReferido) entry.comision += 2;
    } else {
      entry.online += 1;
    }
    if (esVendedorReferido && q.estadoPago === "confirmado") {
      entry.comision += 2;
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

  // comisionPendiente (ventas tienda, $2 c/u)
  const comisionPendiente = porJornada
    .filter((j) => !j.pagado)
    .reduce((s, j) => s + j.comision, 0);

  // ── Fondo de administración (15%) ──────────────────────────────────────
  // Solo para admins y superadmins
  type ComisionAdminRow = {
    jornadaId: string;
    jornadaNombre: string;
    liga: string;
    temporada: string;
    recaudadoTotal: number;
    numAdmins: number;
    miParte: number;
    pagado: boolean;
    pagadoEn: string | null;
  };

  let comisionesAdmin: ComisionAdminRow[] = [];
  let totalComisionAdmin = 0;
  let comisionAdminPendiente = 0;

  const esAdminRole = ["admin", "superadmin"].includes(usuario.rol);

  if (esAdminRole) {
    // Cuántos admins/superadmins hay en total
    const numAdmins = await prisma.usuario.count({
      where: { rol: { in: ["admin", "superadmin"] } },
    });

    // Recaudado total de TODAS las quinielas, agrupado por jornada
    const todasLasQ = await prisma.quiniela.findMany({
      select: {
        jornadaId: true,
        monto: true,
        jornada: {
          select: { id: true, nombre: true, numero: true, liga: true, temporada: true },
        },
      },
    });

    const recaudadoMap = new Map<string, {
      recaudado: number;
      jornadaNombre: string;
      liga: string;
      temporada: string;
    }>();

    for (const q of todasLasQ) {
      const jId = q.jornadaId;
      if (!recaudadoMap.has(jId)) {
        recaudadoMap.set(jId, {
          recaudado: 0,
          jornadaNombre: q.jornada.nombre ?? `Jornada ${q.jornada.numero}`,
          liga: q.jornada.liga,
          temporada: q.jornada.temporada,
        });
      }
      recaudadoMap.get(jId)!.recaudado += q.monto;
    }

    for (const [jId, data] of recaudadoMap) {
      const miParte = numAdmins > 0 ? (data.recaudado * 0.15) / numAdmins : 0;
      const pago = pagosPorJornada.get(jId);
      const row: ComisionAdminRow = {
        jornadaId: jId,
        jornadaNombre: data.jornadaNombre,
        liga: data.liga,
        temporada: data.temporada,
        recaudadoTotal: data.recaudado,
        numAdmins,
        miParte,
        pagado: !!pago,
        pagadoEn: pago?.pagadoEn ?? null,
      };
      comisionesAdmin.push(row);
      totalComisionAdmin += miParte;
      if (!pago) comisionAdminPendiente += miParte;
    }

    // Ordenar por nombre de jornada desc
    comisionesAdmin.sort((a, b) => b.jornadaNombre.localeCompare(a.jornadaNombre));
  }

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

  // Jornadas con registro aún abierto (estado=abierta + cierre no alcanzado)
  const jornadasCandidatas = await prisma.jornada.findMany({
    where: { estado: "abierta" },
    select: { id: true, numero: true, nombre: true, liga: true, temporada: true },
    orderBy: { numero: "desc" },
  });

  // Filtrar las que ya cerraron según fechaHora del primer partido
  const ahora = new Date();
  const jornadasAbiertas = await Promise.all(
    jornadasCandidatas.map(async (j) => {
      try {
        const rows = await sql`
          SELECT "fechaHora" FROM "Partido"
          WHERE "jornadaId" = ${j.id}
            AND "fechaHora" IS NOT NULL
          ORDER BY "fechaHora" ASC
          LIMIT 1
        `;
        const val = rows[0]?.fechaHora;
        if (!val) return j; // sin fecha aún = abierta
        const d = val instanceof Date ? val : new Date(String(val));
        if (isNaN(d.getTime())) return j;
        const cierre = calcularFechaCierre(d);
        return ahora < cierre ? j : null;
      } catch {
        return j; // si falla, incluirla
      }
    })
  ).then((results) => results.filter(Boolean) as typeof jornadasCandidatas);

  return NextResponse.json({
    usuario,
    stats: {
      totalQuinielas,
      totalRecaudado,
      comisionGanada,
      comisionPendiente,
      comisionAdmin: totalComisionAdmin,
      comisionAdminPendiente,
    },
    porJornada,
    comisionesAdmin,
    apostadores,
    recientes,
    jornadasAbiertas,
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
      codigoRef: true,
    },
  });

  return NextResponse.json({ usuario: updated });
}
