import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const jornadaExistente = await prisma.jornada.findFirst({
      where: { numero: 1 },
      select: { id: true },
    });

    if (!jornadaExistente) {
      // Crear jornada sin anidamiento (NeonHTTP no soporta transacciones)
      const jornada = await prisma.jornada.create({
        data: {
          numero: 1,
          temporada: "2025-C",
          estado: "abierta",
          fechaInicio: new Date("2025-01-25"),
          fechaFin: new Date("2025-01-27"),
        },
        select: { id: true },
      });

      const partidos = [
        { equipoLocal: "América",          equipoVisita: "Guadalajara",   fechaHora: new Date("2025-01-25T20:00:00"), orden: 1 },
        { equipoLocal: "Cruz Azul",        equipoVisita: "Pumas UNAM",    fechaHora: new Date("2025-01-25T22:00:00"), orden: 2 },
        { equipoLocal: "Tigres UANL",      equipoVisita: "Monterrey",     fechaHora: new Date("2025-01-26T18:00:00"), orden: 3 },
        { equipoLocal: "León",             equipoVisita: "Santos Laguna", fechaHora: new Date("2025-01-26T20:00:00"), orden: 4 },
        { equipoLocal: "Toluca",           equipoVisita: "Atlas",         fechaHora: new Date("2025-01-26T22:00:00"), orden: 5 },
        { equipoLocal: "Pachuca",          equipoVisita: "Necaxa",        fechaHora: new Date("2025-01-27T18:00:00"), orden: 6 },
        { equipoLocal: "Querétaro",        equipoVisita: "FC Juárez",     fechaHora: new Date("2025-01-27T18:00:00"), orden: 7 },
        { equipoLocal: "Mazatlán",         equipoVisita: "Tijuana",       fechaHora: new Date("2025-01-27T20:00:00"), orden: 8 },
        { equipoLocal: "Atlético San Luis",equipoVisita: "Puebla",        fechaHora: new Date("2025-01-27T20:00:00"), orden: 9 },
      ];

      for (const p of partidos) {
        await prisma.partido.create({
          data: { jornadaId: jornada.id, ...p },
          select: { id: true },
        });
      }
    }

    return NextResponse.json({ message: "Datos de ejemplo creados correctamente" });
  } catch (err) {
    console.error("[SEED] error:", err);
    return NextResponse.json({ error: "Error: " + String(err) }, { status: 500 });
  }
}
