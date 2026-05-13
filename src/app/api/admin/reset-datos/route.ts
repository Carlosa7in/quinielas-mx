import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/reset-datos
// Borra TODO excepto Usuario y Equipo.
// Solo accesible con la clave correcta para evitar borrados accidentales.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body.clave !== process.env.RESET_CLAVE) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 403 });
  }

  try {
    // Orden: hijos primero, luego padres
    const picks          = await prisma.pick.deleteMany();
    const pagoComisiones = await prisma.pagoComision.deleteMany();
    const quinielas      = await prisma.quiniela.deleteMany();
    const partidos       = await prisma.partido.deleteMany();
    const jornadas       = await prisma.jornada.deleteMany();
    const clientes       = await prisma.cliente.deleteMany();
    const vendedores     = await prisma.vendedor.deleteMany();

    return NextResponse.json({
      ok: true,
      borrados: {
        picks:          picks.count,
        pagoComisiones: pagoComisiones.count,
        quinielas:      quinielas.count,
        partidos:       partidos.count,
        jornadas:       jornadas.count,
        clientes:       clientes.count,
        vendedores:     vendedores.count,
      },
    });
  } catch (err) {
    console.error("[RESET-DATOS]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
