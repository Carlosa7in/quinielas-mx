import { NextResponse } from "next/server";
import { prisma, sql } from "@/lib/prisma";

// Prize constants
const PORC_PRIMERO = 0.60;
const PORC_SEGUNDO = 0.25;
const PORC_ADMIN   = 0.15;
const COMISION_PCT = 0.10;

// GET /api/resultados/[jornadaId] — public, no auth required
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jornadaId: string }> }
) {
  const { jornadaId } = await params;

  try {
    const jornada = await prisma.jornada.findUnique({
      where: { id: jornadaId },
      select: {
        id: true,
        numero: true,
        nombre: true,
        temporada: true,
        liga: true,
        estado: true,
        bolsa2Acumulada: true,
        acumulaciones2: true,
      },
    });

    if (!jornada) {
      return NextResponse.json({ error: "Jornada no encontrada" }, { status: 404 });
    }

    // Partidos ordered by orden asc
    const partidos = await prisma.partido.findMany({
      where: { jornadaId },
      orderBy: { orden: "asc" },
      select: {
        id: true,
        orden: true,
        equipoLocal: true,
        equipoVisita: true,
        resultado: true,
        golesLocal: true,
        golesVisita: true,
      },
    });

    // fechaHora via SQL (NeonDB bug con DateTime en Prisma ORM)
    const fechaMap: Record<string, string> = {};
    try {
      const rows = await sql`SELECT id, "fechaHora" FROM "Partido" WHERE "jornadaId" = ${jornadaId}`;
      for (const r of rows) {
        if (r.fechaHora) {
          const d = r.fechaHora instanceof Date ? r.fechaHora : new Date(String(r.fechaHora));
          if (!isNaN(d.getTime())) fechaMap[String(r.id)] = d.toISOString();
        }
      }
    } catch { /* ignorar */ }

    // Fetch logos from Equipo table for all teams in this jornada
    const teamNames = [...new Set(partidos.flatMap((p) => [p.equipoLocal, p.equipoVisita]))];
    const equipos = await prisma.equipo.findMany({
      where: { nombre: { in: teamNames } },
      select: { nombre: true, logoUrl: true },
    });
    const logoMap: Record<string, string> = Object.fromEntries(
      equipos.map((e) => [e.nombre, e.logoUrl])
    );
    const partidosConLogos = partidos.map((p) => ({
      ...p,
      fechaHora: fechaMap[p.id] ?? null,
      logoLocal:  logoMap[p.equipoLocal]  ?? "",
      logoVisita: logoMap[p.equipoVisita] ?? "",
    }));

    // Ordenar partidos por fechaHora (nulls al final), fallback a orden
    partidosConLogos.sort((a, b) => {
      if (!a.fechaHora && !b.fechaHora) return a.orden - b.orden;
      if (!a.fechaHora) return 1;
      if (!b.fechaHora) return -1;
      return new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime();
    });

    // Prize pool: tienda (cash) + online confirmed
    const quinielas = await prisma.quiniela.findMany({
      where: {
        jornadaId,
        OR: [
          { canal: "tienda" },
          { estadoPago: "confirmado" },
        ],
        estadoPago: { not: "no_realizado" },
      },
      select: {
        id: true,
        folio: true,
        nombreCliente: true,
        aciertos: true,
        monto: true,
        picks: {
          select: {
            prediccion: true,
            acertado: true,
            partidoId: true,
            partido: {
              select: { orden: true },
            },
          },
          orderBy: { partido: { orden: "asc" } },
        },
      },
    });

    // Sort quinielas: aciertos desc (nulls last), then folio asc
    const sortedQuinielas = [...quinielas].sort((a, b) => {
      const aA = a.aciertos ?? -1;
      const bA = b.aciertos ?? -1;
      if (bA !== aA) return bA - aA;
      return a.folio.localeCompare(b.folio);
    });

    // Compute prize pool (misma lógica que premiacion y finalización)
    const totalRecaudado  = quinielas.reduce((s, q) => s + q.monto, 0);
    const fondoAdmin      = totalRecaudado * PORC_ADMIN;
    const totalComisiones = totalRecaudado * COMISION_PCT;
    const bolsaNeta       = totalRecaudado - fondoAdmin - totalComisiones;
    const bolsa1     = Math.floor(bolsaNeta * (PORC_PRIMERO / (PORC_PRIMERO + PORC_SEGUNDO)));
    const bolsa2Base = Math.floor(bolsaNeta * (PORC_SEGUNDO  / (PORC_PRIMERO + PORC_SEGUNDO)));
    const bolsa2 = bolsa2Base + (jornada.bolsa2Acumulada ?? 0);

    // Determine rank thresholds
    const aciertosUnicos = [
      ...new Set(quinielas.map((q) => q.aciertos).filter((a): a is number => a !== null)),
    ].sort((a, b) => b - a);

    const maxAciertos = aciertosUnicos[0] ?? null;
    const segundoAciertos = aciertosUnicos[1] ?? null;

    const primeroCount = maxAciertos !== null
      ? quinielas.filter((q) => q.aciertos === maxAciertos).length
      : 0;
    const segundoCount = segundoAciertos !== null
      ? quinielas.filter((q) => q.aciertos === segundoAciertos).length
      : 0;

    // Format quinielas for response — picks ordenados por fechaHora del partido
    const quinielasFormatted = sortedQuinielas.map((q) => ({
      id: q.id,
      folio: q.folio,
      nombreCliente: q.nombreCliente,
      aciertos: q.aciertos,
      picks: [...q.picks]
        .sort((a, b) => {
          const fa = fechaMap[a.partidoId] ?? null;
          const fb = fechaMap[b.partidoId] ?? null;
          if (!fa && !fb) return a.partido.orden - b.partido.orden;
          if (!fa) return 1;
          if (!fb) return -1;
          return new Date(fa).getTime() - new Date(fb).getTime();
        })
        .map((p) => ({
          prediccion: p.prediccion,
          acertado: p.acertado,
          partidoId: p.partidoId,
          orden: p.partido.orden,
        })),
    }));

    return NextResponse.json({
      jornada: {
        id: jornada.id,
        numero: jornada.numero,
        nombre: jornada.nombre,
        temporada: jornada.temporada,
        liga: jornada.liga,
        estado: jornada.estado,
        bolsa2Acumulada: jornada.bolsa2Acumulada,
        acumulaciones2: jornada.acumulaciones2,
      },
      partidos: partidosConLogos,
      quinielas: quinielasFormatted,
      premios: {
        bolsa1,
        bolsa2,
        primeroCount,
        segundoCount,
        maxAciertos,
        segundoAciertos,
      },
      constants: {
        PORC_PRIMERO,
        PORC_SEGUNDO,
      },
    });
  } catch (err) {
    console.error("[RESULTADOS] error:", err);
    return NextResponse.json({ error: "Error: " + String(err) }, { status: 500 });
  }
}
