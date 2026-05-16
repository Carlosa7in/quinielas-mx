import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

// GET /api/admin/notificaciones — conteos para el bell del admin
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.id ? String(token.id) : null;
    // 1. Pagos pendientes de confirmar (online, no confirmados, no rechazados)
    const pagosPendientes = await prisma.quiniela.count({
      where: {
        canal: { not: "tienda" },
        estadoPago: "pendiente",
      },
    });

    // 2. Jornadas finalizadas con ganadores sin premio asignado
    // (aciertos registrados pero premio = null → admin no ha revisado premiación)
    const jornadasSinPremio = await prisma.jornada.count({
      where: {
        estado: "finalizada",
        quinielas: {
          some: {
            aciertos: { not: null },
            premio: null,
            OR: [{ canal: "tienda" }, { estadoPago: "confirmado" }],
            estadoPago: { not: "no_realizado" },
          },
        },
      },
    });

    // 3. Quinielas nuevas hoy (todas las jornadas)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const quinielasHoy = await prisma.quiniela.count({
      where: { createdAt: { gte: hoy } },
    });

    // 4. Jornadas cerradas sin resultados completos (admin debe capturar)
    const jornadasCerradasSinResultados = await prisma.jornada.findMany({
      where: { estado: "cerrada" },
      select: {
        id: true,
        nombre: true,
        numero: true,
        _count: { select: { partidos: true } },
        partidos: {
          where: { resultado: null },
          select: { id: true },
        },
      },
    });
    const jornadasConResultadosPendientes = jornadasCerradasSinResultados.filter(
      (j) => j.partidos.length > 0
    ).length;

    // 5. Pre-registros de kiosko pendientes (del vendedor actual, últimos 60 min)
    let preRegistrosPendientes = 0;
    if (userId) {
      try {
        const rows = await sql`
          SELECT COUNT(*) AS total FROM "PreRegistro"
          WHERE "vendedorId" = ${userId}
            AND usado = false
            AND "createdAt" > NOW() - INTERVAL '60 minutes'
        `;
        preRegistrosPendientes = Number(rows[0]?.total ?? 0);
      } catch { /* tabla puede no existir aún */ }
    }

    // Armar lista de notificaciones con texto
    const items: { tipo: string; texto: string; count: number; href: string }[] = [];

    if (preRegistrosPendientes > 0) {
      items.push({
        tipo: "kiosko",
        texto: `${preRegistrosPendientes} cliente${preRegistrosPendientes !== 1 ? "s" : ""} esperando en kiosko`,
        count: preRegistrosPendientes,
        href: "/admin/tienda",
      });
    }

    if (pagosPendientes > 0) {
      items.push({
        tipo: "pago",
        texto: `${pagosPendientes} pago${pagosPendientes !== 1 ? "s" : ""} pendiente${pagosPendientes !== 1 ? "s" : ""} de confirmar`,
        count: pagosPendientes,
        href: "/admin/quinielas",
      });
    }

    if (jornadasConResultadosPendientes > 0) {
      items.push({
        tipo: "resultados",
        texto: `${jornadasConResultadosPendientes} jornada${jornadasConResultadosPendientes !== 1 ? "s" : ""} con resultados pendientes`,
        count: jornadasConResultadosPendientes,
        href: "/admin/resultados",
      });
    }

    if (jornadasSinPremio > 0) {
      items.push({
        tipo: "premio",
        texto: `${jornadasSinPremio} jornada${jornadasSinPremio !== 1 ? "s" : ""} finalizada${jornadasSinPremio !== 1 ? "s" : ""} sin revisar premios`,
        count: jornadasSinPremio,
        href: "/admin/premiacion",
      });
    }

    if (quinielasHoy > 0) {
      items.push({
        tipo: "nuevo",
        texto: `${quinielasHoy} quiniela${quinielasHoy !== 1 ? "s" : ""} nueva${quinielasHoy !== 1 ? "s" : ""} hoy`,
        count: quinielasHoy,
        href: "/admin/quinielas",
      });
    }

    const totalUrgentes = preRegistrosPendientes + pagosPendientes + jornadasConResultadosPendientes + jornadasSinPremio;

    return NextResponse.json({
      totalUrgentes,
      quinielasHoy,
      items,
    });
  } catch (err) {
    console.error("[NOTIFICACIONES] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
