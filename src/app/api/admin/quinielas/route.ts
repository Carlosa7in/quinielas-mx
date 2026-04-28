import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/quinielas?jornadaId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jornadaId = searchParams.get("jornadaId");

  const quinielas = await prisma.quiniela.findMany({
    where: jornadaId ? { jornadaId } : undefined,
    include: {
      picks: true,
      jornada: { select: { numero: true, temporada: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quinielas);
}
