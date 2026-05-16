import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    
    // Contar todas las jornadas sin filtro
    const todas = await prisma.jornada.findMany({
      select: { id: true, numero: true, liga: true, estado: true, fechaInicio: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      ok: true,
      total: todas.length,
      jornadas: todas,
      env: {
        hasDB: !!process.env.DATABASE_URL,
        hasDirect: !!process.env.DIRECT_URL,
        node: process.version,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 });
  }
}
