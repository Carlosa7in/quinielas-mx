import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/reset-quinielas — borra TODOS los picks y quinielas
// Solo para limpieza de datos de prueba
export async function POST() {
  try {
    const picks     = await prisma.pick.deleteMany({});
    const quinielas = await prisma.quiniela.deleteMany({});
    return NextResponse.json({
      ok: true,
      picksEliminados: picks.count,
      quinielasEliminadas: quinielas.count,
    });
  } catch (err) {
    console.error("[reset-quinielas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
