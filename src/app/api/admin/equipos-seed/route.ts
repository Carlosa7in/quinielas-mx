/**
 * POST /api/admin/equipos-seed
 * Inserta todos los equipos de equipos.ts en la tabla Equipo.
 * Idempotente: usa upsert, se puede llamar varias veces sin duplicar.
 * También actualiza logos de equipos ya existentes en BD (ej. importados vía ESPN).
 * Solo superadmin.
 */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { EQUIPOS_POR_LIGA, getLogoUrl } from "@/lib/equipos";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let total = 0;

  // 1. Upsert todos los equipos del catálogo estático
  for (const [liga, equipos] of Object.entries(EQUIPOS_POR_LIGA)) {
    for (const nombre of equipos) {
      await prisma.equipo.upsert({
        where: { nombre_liga: { nombre, liga } },
        update: { logoUrl: getLogoUrl(nombre) },
        create: { nombre, liga, logoUrl: getLogoUrl(nombre) },
      });
      total++;
    }
  }

  // 2. Actualizar logos de equipos ya en BD que NO están en el catálogo
  //    (ej. equipos importados desde ESPN de ligas o divisiones extra)
  const todosEnDb = await prisma.equipo.findMany({ select: { id: true, nombre: true, logoUrl: true } });
  let actualizados = 0;
  for (const eq of todosEnDb) {
    const logoNuevo = getLogoUrl(eq.nombre);
    if (logoNuevo && logoNuevo !== eq.logoUrl) {
      await prisma.equipo.update({
        where: { id: eq.id },
        data: { logoUrl: logoNuevo },
      });
      actualizados++;
    }
  }

  return NextResponse.json({ ok: true, insertados: total, actualizados });
}
