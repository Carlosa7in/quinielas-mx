import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generarFolio } from "@/lib/folio";
import { calcularFechaCierre } from "@/lib/fechas";

// Calcula cuántas combinaciones hay (producto cartesiano de opciones) — para el monto
function numeroCombinaciones(picks: { predicciones: string[] }[]): number {
  return picks.reduce((prod, p) => prod * Math.max(1, p.predicciones.length), 1);
}

// POST /api/quinielas - registrar quiniela (sencilla, reventado o múltiples boletos)
export async function POST(req: Request) {
  const body = await req.json();
  const { jornadaId, picks, nombre, telefono, canal = "online", usuarioId, cantidad = 1 } = body;

  if (!jornadaId || !picks || picks.length === 0) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  // Normalizar picks: aceptar formato viejo {partidoId, prediccion} y nuevo {partidoId, predicciones}
  const picksNorm: { partidoId: string; predicciones: string[] }[] = picks.map(
    (p: { partidoId: string; prediccion?: string; predicciones?: string[] }) => ({
      partidoId: p.partidoId,
      predicciones: p.predicciones ?? (p.prediccion ? [p.prediccion] : []),
    })
  );

  try {
    const jornada = await prisma.jornada.findUnique({
      where: { id: jornadaId },
      select: { id: true, numero: true, estado: true },
    });

    if (!jornada || jornada.estado !== "abierta") {
      return NextResponse.json({ error: "Jornada no disponible" }, { status: 400 });
    }

    // Verificar que no haya pasado la fecha de cierre (día anterior al primer partido a las 23:00 CDMX)
    try {
      const rows = await prisma.$queryRaw<{ minFecha: Date | null }[]>`
        SELECT MIN("fechaHora") AS "minFecha"
        FROM "Partido"
        WHERE "jornadaId" = ${jornadaId}
          AND "fechaHora" IS NOT NULL
      `;
      const primerPartido = rows[0]?.minFecha;
      if (primerPartido) {
        const fechaCierre = calcularFechaCierre(new Date(primerPartido));
        if (new Date() >= fechaCierre) {
          return NextResponse.json(
            { error: "El registro ya cerró — las quinielas cierran a las 11pm del día anterior al primer partido." },
            { status: 400 }
          );
        }
      }
    } catch (e) {
      console.error("[QUINIELAS POST] fechaHora check failed:", e);
      // Si no podemos verificar la fecha, dejamos pasar (la jornada está abierta según el estado)
    }

    const folio = generarFolio(jornada.numero);

    // Buscar o crear cliente por teléfono
    let clienteId: string | null = null;
    if (telefono) {
      const telefonoLimpio = telefono.replace(/\D/g, "");
      const clienteExistente = await prisma.cliente.findUnique({
        where: { telefono: telefonoLimpio },
        select: { id: true },
      });
      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else if (nombre) {
        const nuevoCliente = await prisma.cliente.create({
          data: {
            id: `cli_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            telefono: telefonoLimpio,
            nombre,
          },
          select: { id: true },
        });
        clienteId = nuevoCliente.id;
      }
    }

    const estadoPago = canal === "tienda" ? "confirmado" : "pendiente";
    const BASE_PRICE = 20;

    // Monto = número de combinaciones × precio (doble = 2 combos = $40)
    const numCombos = numeroCombinaciones(picksNorm);
    const monto = numCombos * BASE_PRICE;

    // Una sola quiniela con múltiples picks por partido (doble/triple)
    const folioQ = generarFolio(jornada.numero);
    const quiniela = await prisma.quiniela.create({
      data: {
        folio: folioQ,
        jornadaId,
        usuarioId: usuarioId || null,
        clienteId,
        nombreCliente: nombre || null,
        telefonoCliente: telefono || null,
        canal,
        estadoPago,
        monto,
      },
      select: { id: true, folio: true },
    });

    // Un Pick por cada opción seleccionada en cada partido
    for (const pick of picksNorm) {
      for (const prediccion of pick.predicciones) {
        await prisma.pick.create({
          data: {
            quinielaId: quiniela.id,
            partidoId: pick.partidoId,
            prediccion,
          },
          select: { id: true },
        });
      }
    }

    return NextResponse.json(
      { folio: folioQ, folios: [folioQ], total: 1 },
      { status: 201 }
    );
  } catch (err) {
    console.error("[QUINIELAS POST] error:", err);
    return NextResponse.json({ error: "Error al registrar: " + String(err) }, { status: 500 });
  }
}

// GET /api/quinielas?folio=xxx - buscar por folio (para ticket)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folio = searchParams.get("folio");
  const telefono = searchParams.get("telefono");

  // Buscar por teléfono — devuelve lista de quinielas
  if (telefono) {
    const telefonoLimpio = telefono.replace(/\D/g, "");
    try {
      const quinielas = await prisma.quiniela.findMany({
        where: { telefonoCliente: telefonoLimpio },
        select: {
          folio: true,
          nombreCliente: true,
          estado: true,
          aciertos: true,
          monto: true,
          jornada: { select: { numero: true, nombre: true, temporada: true, liga: true } },
          picks: {
            select: {
              id: true,
              partidoId: true,
              prediccion: true,
              acertado: true,
              partido: {
                select: {
                  equipoLocal: true,
                  equipoVisita: true,
                  orden: true,
                  resultado: true,
                  golesLocal: true,
                  golesVisita: true,
                },
              },
            },
          },
        },
        orderBy: { folio: "desc" },
      });
      return NextResponse.json({ quinielas });
    } catch (err) {
      console.error("[QUINIELAS GET telefono] error:", err);
      return NextResponse.json({ error: "Error al buscar: " + String(err) }, { status: 500 });
    }
  }

  if (!folio) {
    return NextResponse.json({ error: "Folio o teléfono requerido" }, { status: 400 });
  }

  try {
    const quiniela = await prisma.quiniela.findUnique({
      where: { folio },
      select: {
        folio: true,
        nombreCliente: true,
        telefonoCliente: true,
        canal: true,
        monto: true,
        estado: true,
        estadoPago: true,
        puntos: true,
        aciertos: true,
        jornada: { select: { numero: true, nombre: true, temporada: true, liga: true } },
        picks: {
          select: {
            id: true,
            prediccion: true,
            acertado: true,
            partido: {
              select: {
                equipoLocal: true,
                equipoVisita: true,
                orden: true,
                resultado: true,
                golesLocal: true,
                golesVisita: true,
              },
            },
          },
        },
      },
    });

    if (!quiniela) {
      return NextResponse.json({ error: "Quiniela no encontrada" }, { status: 404 });
    }

    return NextResponse.json(quiniela);
  } catch (err) {
    console.error("[QUINIELAS GET] error:", err);
    return NextResponse.json({ error: "Error al buscar: " + String(err) }, { status: 500 });
  }
}
