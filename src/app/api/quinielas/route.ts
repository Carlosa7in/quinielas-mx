import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";
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

    // Verificar fecha de cierre usando sql directo (prisma.$queryRaw devuelve {} para DateTime en NeonDB)
    // Modo estricto: si no se puede verificar, SE BLOQUEA el registro.
    {
      let primerPartidoFecha: Date | null = null;
      let errorVerificacion = false;
      try {
        const rows = await sql`
          SELECT "fechaHora" FROM "Partido"
          WHERE "jornadaId" = ${jornadaId}
            AND "fechaHora" IS NOT NULL
          ORDER BY "fechaHora" ASC
          LIMIT 1
        `;
        const val = rows[0]?.fechaHora;
        if (val) {
          const d = val instanceof Date ? val : new Date(String(val));
          if (!isNaN(d.getTime())) primerPartidoFecha = d;
        }
      } catch (e) {
        console.error("[QUINIELAS POST] fechaHora check failed:", e);
        errorVerificacion = true;
      }

      if (errorVerificacion) {
        return NextResponse.json(
          { error: "No se pudo verificar la fecha de cierre. Intenta de nuevo." },
          { status: 503 }
        );
      }

      if (primerPartidoFecha) {
        const fechaCierre = calcularFechaCierre(primerPartidoFecha);
        if (new Date() >= fechaCierre) {
          return NextResponse.json(
            { error: "El registro ya cerró. Las quinielas cierran a las 11:00 pm del día anterior al primer partido." },
            { status: 400 }
          );
        }
      }
      // Si no hay partidos con fecha aún, se permite el registro (jornada recién creada)
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

// PATCH /api/quinielas?folio=xxx - guardar referencia de pago
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const folio = searchParams.get("folio");
  if (!folio) return NextResponse.json({ error: "Folio requerido" }, { status: 400 });

  const body = await req.json();
  const { referenciaPago } = body;
  if (!referenciaPago || !String(referenciaPago).trim()) {
    return NextResponse.json({ error: "Referencia requerida" }, { status: 400 });
  }

  try {
    const ref = String(referenciaPago).trim().slice(0, 60);
    await sql`
      UPDATE "Quiniela"
      SET "referenciaPago" = ${ref}
      WHERE "folio" = ${folio}
        AND "estadoPago" = 'pendiente'
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[QUINIELAS PATCH] error:", err);
    return NextResponse.json({ error: "Error al guardar: " + String(err) }, { status: 500 });
  }
}

// GET /api/quinielas?folio=xxx - buscar por folio (para ticket)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folio = searchParams.get("folio");
  const telefono = searchParams.get("telefono");

  // Buscar por teléfono — requiere nombre para verificar identidad
  if (telefono) {
    const nombre = searchParams.get("nombre") ?? "";
    if (!nombre.trim()) {
      return NextResponse.json(
        { error: "Se requiere tu nombre además del teléfono para buscar tus quinielas." },
        { status: 400 }
      );
    }
    const telefonoLimpio = telefono.replace(/\D/g, "");
    try {
      // Buscar quinielas que coincidan con el teléfono
      const candidatas = await prisma.quiniela.findMany({
        where: { telefonoCliente: telefonoLimpio },
        select: {
          folio: true,
          nombreCliente: true,
          estado: true,
          estadoPago: true,
          aciertos: true,
          monto: true,
          canal: true,
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

      if (candidatas.length === 0) {
        return NextResponse.json({ error: "No se encontraron quinielas con ese teléfono." }, { status: 404 });
      }

      // Verificar que al menos una quiniela tiene un nombre que coincida
      const nombreBusqueda = nombre.trim().toLowerCase();
      const verificadas = candidatas.filter((q) => {
        if (!q.nombreCliente) return false;
        const nombreGuardado = q.nombreCliente.toLowerCase();
        // Coincidencia parcial: el nombre buscado aparece en el guardado o viceversa
        return nombreGuardado.includes(nombreBusqueda) || nombreBusqueda.includes(nombreGuardado.split(" ")[0]);
      });

      if (verificadas.length === 0) {
        return NextResponse.json(
          { error: "El nombre no coincide con el registrado. Verifica cómo te registraste." },
          { status: 403 }
        );
      }

      return NextResponse.json({ quinielas: verificadas });
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
        jornada: { select: { id: true, numero: true, nombre: true, temporada: true, liga: true } },
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
