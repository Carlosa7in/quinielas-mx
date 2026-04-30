/**
 * POST /api/admin/equipos-seed
 * Inserta todos los equipos de equipos.ts en la tabla Equipo.
 * Idempotente: usa upsert, se puede llamar varias veces sin duplicar.
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

  return NextResponse.json({ ok: true, insertados: total });
}
