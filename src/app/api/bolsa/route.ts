import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PORCENTAJE_DUENOS = 0.15;   // 15% para los dueños
const COMISION_TIENDA   = 2;      // $2 por quiniela vendida en tienda

// GET /api/bolsa — pública, sin auth
export async function GET() {
  // Primer partido de cualquier jornada abierta → fecha límite de registro
  // (findFirst top-level funciona bien con NeonHTTP, sin subquery lateral)
  const partidos = await prisma.partido.findMany({
    where: { jornada: { estado: "abierta" } },
    select: { fechaHora: true },
  });
  const primerPartidoFecha = partidos.length > 0
    ? partidos.reduce((min, p) => p.fechaHora < min ? p.fechaHora : min, partidos[0].fechaHora)
    : null;

  const quinielas = await prisma.quiniela.findMany({
    where: { jornada: { estado: "abierta" } },
    select: {
      monto: true,
      canal: true,
      jornada: { select: { id: true, nombre: true, numero: true, liga: true } },
    },
  });

  // Desglose por jornada
  const jornadasMap = new Map<string, {
    id: string; nombre: string | null; numero: number; liga: string;
    total: number; tienda: number; recaudado: number;
  }>();

  for (const q of quinielas) {
    const j = q.jornada;
    if (!jornadasMap.has(j.id)) {
      jornadasMap.set(j.id, { id: j.id, nombre: j.nombre, numero: j.numero, liga: j.liga, total: 0, tienda: 0, recaudado: 0 });
    }
    const entry = jornadasMap.get(j.id)!;
    entry.total++;
    entry.recaudado += q.monto;
    if (q.canal === "tienda") entry.tienda++;
  }

  const jornadas = [...jornadasMap.values()].map((j) => {
    const cutDuenos = j.recaudado * PORCENTAJE_DUENOS;
    const cutTienda = j.tienda * COMISION_TIENDA;
    const bolsa     = Math.max(j.recaudado - cutDuenos - cutTienda, 0);
    return { ...j, bolsa };
  });

  const totalRecaudado  = quinielas.reduce((s, q) => s + q.monto, 0);
  const quinielasTienda = quinielas.filter((q) => q.canal === "tienda").length;
  const cutDuenos       = totalRecaudado * PORCENTAJE_DUENOS;
  const cutTienda       = quinielasTienda * COMISION_TIENDA;
  const bolsa           = Math.max(totalRecaudado - cutDuenos - cutTienda, 0);

  return NextResponse.json({
    bolsa,
    totalRecaudado,
    totalQuinielas: quinielas.length,
    jornadas,
    primerPartidoFecha,
  });
}
