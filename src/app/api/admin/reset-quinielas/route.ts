import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/reset-quinielas — borra TODO (picks, quinielas, clientes, partidos, jornadas)
// Solo para limpieza de datos de prueba — ¡IRREVERSIBLE!
export async function POST() {
  try {
    const picks     = await prisma.pick.deleteMany({});
    const quinielas = await prisma.quiniela.deleteMany({});
    const clientes  = await prisma.cliente.deleteMany({});
    const partidos  = await prisma.partido.deleteMany({});
    const jornadas  = await prisma.jornada.deleteMany({});
    return NextResponse.json({
      ok: true,
      picks: picks.count,
      quinielas: quinielas.count,
      clientes: clientes.count,
      partidos: partidos.count,
      jornadas: jornadas.count,
    });
  } catch (err) {
    console.error("[reset-quinielas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
