import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

// GET /api/admin/notificaciones — conteos filtrados por rol del usuario
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.id ? String(token.id) : null;
    const rol = (token?.role as string) ?? "user";
    const esAdmin = ["admin", "superadmin"].includes(rol);
    const esVendedor = rol === "vendedor";
    const esTienda = rol === "tienda";

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const items: { tipo: string; texto: string; count: number; href: string }[] = [];

    // ── TIENDA / KIOSKO: pre-registros pendientes propios ──────────────────
    let preRegistrosPendientes = 0;
    if ((esAdmin || esTienda) && userId) {
      try {
        const rows = await sql`
          SELECT COUNT(*) AS total FROM "PreRegistro"
          WHERE "vendedorId" = ${userId}
            AND usado = false
            AND "createdAt" > NOW() - INTERVAL '60 minutes'
        `;
        preRegistrosPendientes = Number(rows[0]?.total ?? 0);
      } catch { /* tabla puede no existir aún */ }
      if (preRegistrosPendientes > 0) {
        items.push({
          tipo: "kiosko",
          texto: `${preRegistrosPendientes} cliente${preRegistrosPendientes !== 1 ? "s" : ""} esperando en kiosko`,
          count: preRegistrosPendientes,
          href: "/admin/tienda?bandeja=1",
        });
      }
    }

    // ── PAGOS PENDIENTES ────────────────────────────────────────────────────
    // Admin: todos | Vendedor: solo de sus referidos | Tienda: ninguno
    if (esAdmin || esVendedor) {
      const pagosPendientes = await prisma.quiniela.count({
        where: {
          canal: { not: "tienda" },
          estadoPago: "pendiente",
          ...(esVendedor && userId ? { usuarioId: userId } : {}),
        },
      });
      if (pagosPendientes > 0) {
        items.push({
          tipo: "pago",
          texto: `${pagosPendientes} pago${pagosPendientes !== 1 ? "s" : ""} pendiente${pagosPendientes !== 1 ? "s" : ""} de confirmar`,
          count: pagosPendientes,
          href: "/admin/quinielas",
        });
      }
    }

    // ── RESULTADOS PENDIENTES (solo admin) ──────────────────────────────────
    if (esAdmin) {
      const jornadasCerradas = await prisma.jornada.findMany({
        where: { estado: "cerrada" },
        select: {
          partidos: { where: { resultado: null }, select: { id: true } },
        },
      });
      const jornadasConResultadosPendientes = jornadasCerradas.filter((j) => j.partidos.length > 0).length;
      if (jornadasConResultadosPendientes > 0) {
        items.push({
          tipo: "resultados",
          texto: `${jornadasConResultadosPendientes} jornada${jornadasConResultadosPendientes !== 1 ? "s" : ""} con resultados pendientes`,
          count: jornadasConResultadosPendientes,
          href: "/admin/resultados",
        });
      }
    }

    // ── PREMIACIÓN PENDIENTE (solo admin) ───────────────────────────────────
    if (esAdmin) {
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
      if (jornadasSinPremio > 0) {
        items.push({
          tipo: "premio",
          texto: `${jornadasSinPremio} jornada${jornadasSinPremio !== 1 ? "s" : ""} finalizada${jornadasSinPremio !== 1 ? "s" : ""} sin revisar premios`,
          count: jornadasSinPremio,
          href: "/admin/premiacion",
        });
      }
    }

    // ── QUINIELAS NUEVAS HOY ────────────────────────────────────────────────
    // Admin: todas | Vendedor: solo las suyas | Tienda: las de su canal
    {
      const quinielasHoy = await prisma.quiniela.count({
        where: {
          createdAt: { gte: hoy },
          ...(esVendedor && userId ? { usuarioId: userId } : {}),
          ...(esTienda ? { canal: "tienda" } : {}),
        },
      });
      if (quinielasHoy > 0) {
        items.push({
          tipo: "nuevo",
          texto: `${quinielasHoy} quiniela${quinielasHoy !== 1 ? "s" : ""} nueva${quinielasHoy !== 1 ? "s" : ""} hoy`,
          count: quinielasHoy,
          href: "/admin/quinielas",
        });
      }
    }

    const totalUrgentes = items
      .filter((i) => i.tipo !== "nuevo")
      .reduce((s, i) => s + i.count, 0);

    return NextResponse.json({ totalUrgentes, items });
  } catch (err) {
    console.error("[NOTIFICACIONES] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
