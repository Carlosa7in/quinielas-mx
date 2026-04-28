import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/admin/seed - crear datos iniciales (solo en desarrollo)
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 403 });
  }

  // Crear superadmin
  const existe = await prisma.usuario.findUnique({ where: { email: "admin@quinielas.mx" } });
  if (!existe) {
    await prisma.usuario.create({
      data: {
        nombre: "Super Admin",
        email: "admin@quinielas.mx",
        password: await bcrypt.hash("admin123", 10),
        rol: "superadmin",
      },
    });
  } else if (existe.rol !== "superadmin") {
    await prisma.usuario.update({
      where: { email: "admin@quinielas.mx" },
      data: { rol: "superadmin" },
    });
  }

  // Crear jornada de ejemplo
  const jornadaExistente = await prisma.jornada.findFirst({ where: { numero: 1 } });
  if (!jornadaExistente) {
    await prisma.jornada.create({
      data: {
        numero: 1,
        temporada: "2025-C",
        estado: "abierta",
        fechaInicio: new Date("2025-01-25"),
        fechaFin: new Date("2025-01-27"),
        partidos: {
          create: [
            { equipoLocal: "América", equipoVisita: "Guadalajara", fechaHora: new Date("2025-01-25T20:00:00"), orden: 1 },
            { equipoLocal: "Cruz Azul", equipoVisita: "Pumas", fechaHora: new Date("2025-01-25T22:00:00"), orden: 2 },
            { equipoLocal: "Tigres", equipoVisita: "Monterrey", fechaHora: new Date("2025-01-26T18:00:00"), orden: 3 },
            { equipoLocal: "León", equipoVisita: "Santos", fechaHora: new Date("2025-01-26T20:00:00"), orden: 4 },
            { equipoLocal: "Toluca", equipoVisita: "Atlas", fechaHora: new Date("2025-01-26T22:00:00"), orden: 5 },
            { equipoLocal: "Pachuca", equipoVisita: "Necaxa", fechaHora: new Date("2025-01-27T18:00:00"), orden: 6 },
            { equipoLocal: "Querétaro", equipoVisita: "FC Juárez", fechaHora: new Date("2025-01-27T18:00:00"), orden: 7 },
            { equipoLocal: "Mazatlán", equipoVisita: "Tijuana", fechaHora: new Date("2025-01-27T20:00:00"), orden: 8 },
            { equipoLocal: "San Luis", equipoVisita: "Puebla", fechaHora: new Date("2025-01-27T20:00:00"), orden: 9 },
          ],
        },
      },
    });
  }

  return NextResponse.json({ message: "Datos iniciales creados correctamente" });
}
