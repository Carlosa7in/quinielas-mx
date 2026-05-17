import { NextRequest, NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";

// GET /api/admin/jornadas/:id — detalle completo: partidos, picks, stats
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const jornada = await prisma.jornada.findUnique({
    where: { id },
    select: {
      id: true, numero: true, nombre: true, temporada: true, liga: true, estado: true,
      partidos: {
        select: {
          id: true, equipoLocal: true, equipoVisita: true,
          resultado: true, golesLocal: true, golesVisita: true, orden: true,
          picks: {
            select: { prediccion: true, quiniela: { select: { estadoPago: true } } },
          },
        },
        orderBy: { orden: "asc" },
      },
      quinielas: {
        select: {
          folio: true, monto: true, estado: true, estadoPago: true, canal: true,
          aciertos: true, puntos: true,
          nombreCliente: true,
          cliente: { select: { nombre: true } },
          usuario: { select: { nombre: true } },
        },
      },
    },
  });

  if (!jornada) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // fechaHora via SQL (NeonDB bug con DateTime en Prisma ORM)
  let fechaHorasMap: Record<string, string> = {};
  try {
    const rows = await sql`SELECT id, "fechaHora" FROM "Partido" WHERE "jornadaId" = ${id}`;
    for (const r of rows) {
      if (r.fechaHora) fechaHorasMap[r.id] = r.fechaHora instanceof Date
        ? r.fechaHora.toISOString() : String(r.fechaHora);
    }
  } catch { /* ignorar */ }

  // Stats de quinielas — solo confirmadas para totales de dinero y conteo
  const confirmadas     = jornada.quinielas.filter(q => q.estadoPago === "confirmado");
  const totalQuinielas  = confirmadas.length;
  const recaudado       = confirmadas.reduce((s, q) => s + q.monto, 0);
  const ventas          = jornada.quinielas.filter(q => q.estadoPago !== "no_realizado").reduce((s, q) => s + q.monto, 0);
  const pendientes      = jornada.quinielas.filter(q => q.estadoPago === "pendiente").length;
  const ganadoras       = jornada.quinielas.filter(q => q.estado === "ganadora").length;
  const porCanal = {
    tienda: jornada.quinielas.filter(q => q.canal === "tienda").length,
    online:  jornada.quinielas.filter(q => q.canal !== "tienda").length,
  };

  // Distribución de picks — solo quinielas confirmadas, valores "1"/"X"/"2"
  const partidos = jornada.partidos.map((p) => {
    const confirmedPicks = p.picks.filter(pk => pk.quiniela.estadoPago === "confirmado");
    const total = confirmedPicks.length;
    const L = confirmedPicks.filter(pk => pk.prediccion === "1").length;
    const E = confirmedPicks.filter(pk => pk.prediccion === "X").length;
    const V = confirmedPicks.filter(pk => pk.prediccion === "2").length;
    return {
      id: p.id,
      equipoLocal: p.equipoLocal,
      equipoVisita: p.equipoVisita,
      resultado: p.resultado,
      golesLocal: p.golesLocal,
      golesVisita: p.golesVisita,
      orden: p.orden,
      fechaHora: fechaHorasMap[p.id] ?? null,
      picks: { total, L, E, V,
        pctL: total > 0 ? Math.round(L / total * 100) : 0,
        pctE: total > 0 ? Math.round(E / total * 100) : 0,
        pctV: total > 0 ? Math.round(V / total * 100) : 0,
      },
    };
  });

  // Ordenar partidos por fechaHora
  partidos.sort((a, b) => {
    if (!a.fechaHora && !b.fechaHora) return a.orden - b.orden;
    if (!a.fechaHora) return 1;
    if (!b.fechaHora) return -1;
    return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
  });

  // Tabla de resultados — quinielas confirmadas con aciertos
  const tablaResultados = jornada.quinielas
    .filter(q => q.estadoPago === "confirmado")
    .map(q => ({
      folio: q.folio,
      nombre: q.nombreCliente ?? q.cliente?.nombre ?? q.usuario?.nombre ?? "—",
      aciertos: q.aciertos ?? 0,
      puntos: q.puntos ?? 0,
      estado: q.estado,
    }))
    .sort((a, b) => (b.aciertos ?? 0) - (a.aciertos ?? 0));

  return NextResponse.json({
    id: jornada.id, numero: jornada.numero, nombre: jornada.nombre,
    temporada: jornada.temporada, liga: jornada.liga, estado: jornada.estado,
    partidos,
    stats: { totalQuinielas, recaudado, ventas, pendientes, ganadoras, porCanal },
    tablaResultados,
  });
}

// PATCH /api/admin/jornadas/:id — editar nombre y/o estado
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { nombre, estado } = body as { nombre?: string; estado?: string };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (nombre !== undefined) data.nombre = nombre.trim() || null;
    if (estado !== undefined) data.estado = estado;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    // Prisma update funciona bien para campos no-DateTime
    const updated = await prisma.jornada.update({
      where: { id },
      data,
      select: { id: true, nombre: true, estado: true },
    });

    return NextResponse.json({ ok: true, jornada: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/jornadas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/admin/jornadas/:id — borra jornada y sus partidos (solo si no tiene quinielas)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verificar que no tenga quinielas registradas
    const quinielas = await prisma.quiniela.count({ where: { jornadaId: id } });
    if (quinielas > 0) {
      return NextResponse.json(
        { error: `No se puede borrar: tiene ${quinielas} quiniela(s) registrada(s)` },
        { status: 400 }
      );
    }

    // Borrar picks de partidos de esta jornada (si hubiera)
    const partidos = await prisma.partido.findMany({
      where: { jornadaId: id },
      select: { id: true },
    });
    const partidoIds = partidos.map((p) => p.id);
    if (partidoIds.length > 0) {
      await prisma.pick.deleteMany({ where: { partidoId: { in: partidoIds } } });
    }

    // Usar raw SQL para evitar el bug de NeonDB con campos DateTime en Prisma ORM
    await prisma.$executeRaw`DELETE FROM "Partido" WHERE "jornadaId" = ${id}`;
    await prisma.$executeRaw`DELETE FROM "Jornada" WHERE id = ${id}`;

    return NextResponse.json({ ok: true, partidosBorrados: partidoIds.length });
  } catch (err) {
    console.error("[DELETE /api/admin/jornadas]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
