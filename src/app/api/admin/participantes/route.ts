import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";
import { calcularFechaCierre } from "@/lib/fechas";

async function verificarAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return token?.role === "admin" || token?.role === "superadmin";
}

// GET /api/admin/participantes — lista todos los clientes con stats
export async function GET(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Jornadas abiertas actuales (para sobreventa por jornada)
  const jornadasAbiertas = await prisma.jornada.findMany({
    where: { estado: "abierta" },
    select: { id: true, nombre: true, numero: true, liga: true },
    orderBy: { numero: "asc" },
  });
  const idsAbiertas = new Set(jornadasAbiertas.map((j) => j.id));
  const idsAbiertasArr = jornadasAbiertas.map((j) => j.id);

  // Ligas de los partidos por jornada abierta (para Mixta — sin DateTime, Prisma ok)
  const partidosLigaRows = idsAbiertasArr.length > 0
    ? await prisma.partido.findMany({
        where: { jornadaId: { in: idsAbiertasArr } },
        select: { jornadaId: true, liga: true },
      })
    : [];
  const ligasDetalleMap = new Map<string, string[]>();
  for (const p of partidosLigaRows) {
    if (!ligasDetalleMap.has(p.jornadaId)) ligasDetalleMap.set(p.jornadaId, []);
    const arr = ligasDetalleMap.get(p.jornadaId)!;
    if (!arr.includes(p.liga)) arr.push(p.liga);
  }

  // Fecha de cierre de registro por jornada abierta (raw SQL para DateTime)
  const fechaCierreMap = new Map<string, string>();
  for (const jornada of jornadasAbiertas) {
    try {
      const rows = await sql`
        SELECT "fechaHora" FROM "Partido"
        WHERE "jornadaId" = ${jornada.id} AND "fechaHora" IS NOT NULL
        ORDER BY "fechaHora" ASC LIMIT 1
      `;
      const val = rows[0]?.fechaHora;
      if (val) {
        const d = val instanceof Date ? val : new Date(String(val));
        if (!isNaN(d.getTime())) {
          const cierre = calcularFechaCierre(d);
          fechaCierreMap.set(jornada.id, cierre.toISOString());
        }
      }
    } catch { /* silencioso */ }
  }

  // Enriquecer jornadasAbiertas con ligasDetalle y primerPartidoFecha
  const jornadasAbiertasEnriquecidas = jornadasAbiertas.map((j) => ({
    ...j,
    ligasDetalle: ligasDetalleMap.get(j.id) ?? [],
    primerPartidoFecha: fechaCierreMap.get(j.id) ?? null,
  }));

  const clientes = await prisma.cliente.findMany({
    select: {
      id: true,
      nombre: true,
      telefono: true,
      quinielas: {
        select: {
          id: true,
          folio: true,
          estado: true,
          estadoPago: true,
          aciertos: true,
          jornadaId: true,
          jornada: { select: { id: true, numero: true, temporada: true, estado: true } },
        },
      },
    },
  });

  const resultado = clientes.map((c) => {
    const confirmadas        = c.quinielas.filter((q) => q.estadoPago === "confirmado");
    const pendientesAbiertos = c.quinielas.filter((q) => q.estadoPago === "pendiente" && q.jornada.estado === "abierta");
    const pendientesCerrados = c.quinielas.filter((q) => q.estadoPago === "pendiente" && q.jornada.estado !== "abierta");

    // IDs de jornadas abiertas donde ya compró (confirmado o pendiente)
    const jornadasAbiertasCompradas = c.quinielas
      .filter((q) => idsAbiertas.has(q.jornadaId) && (q.estadoPago === "confirmado" || q.estadoPago === "pendiente"))
      .map((q) => q.jornadaId);

    return {
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      totalQuinielas: confirmadas.length,
      pendientes: pendientesAbiertos.length,
      pendientesCerrados: pendientesCerrados.length,
      ganadoras: c.quinielas.filter((q) => q.estado === "ganadora").length,
      ultimaJornada: confirmadas.length > 0
        ? Math.max(...confirmadas.map((q) => q.jornada.numero))
        : c.quinielas.length > 0
          ? Math.max(...c.quinielas.map((q) => q.jornada.numero))
          : null,
      jornadasAbiertasCompradas,
    };
  });

  // Solo clientes reales (al menos 1 quiniela confirmada)
  const soloClientes = resultado.filter((c) => c.totalQuinielas > 0);
  soloClientes.sort((a, b) => b.totalQuinielas - a.totalQuinielas);

  return NextResponse.json({ clientes: soloClientes, jornadasAbiertas: jornadasAbiertasEnriquecidas });
}

// PATCH /api/admin/participantes — editar nombre y/o teléfono
export async function PATCH(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, nombre, telefono } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const nombreVal = nombre !== undefined ? String(nombre).trim() : undefined;
  const telefonoVal = telefono !== undefined ? String(telefono).trim() : undefined;

  if (!nombreVal && !telefonoVal) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    // SQL directo: NeonHTTP no soporta transacciones implícitas de Prisma
    if (nombreVal && telefonoVal) {
      await sql`UPDATE "Cliente" SET nombre = ${nombreVal}, telefono = ${telefonoVal} WHERE id = ${id}`;
    } else if (nombreVal) {
      await sql`UPDATE "Cliente" SET nombre = ${nombreVal} WHERE id = ${id}`;
    } else if (telefonoVal) {
      await sql`UPDATE "Cliente" SET telefono = ${telefonoVal} WHERE id = ${id}`;
    }
    return NextResponse.json({ ok: true, id, nombre: nombreVal, telefono: telefonoVal });
  } catch (err) {
    console.error("PATCH /api/admin/participantes error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/participantes — eliminar cliente (desvincula sus quinielas)
export async function DELETE(req: NextRequest) {
  if (!(await verificarAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let id: string | undefined;
  try {
    const body = await req.json();
    id = body.id;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  try {
    // SQL directo: NeonHTTP no soporta transacciones implícitas de Prisma
    // 1. Desvincular quinielas (clienteId → null)
    await sql`UPDATE "Quiniela" SET "clienteId" = NULL WHERE "clienteId" = ${id}`;
    // 2. Eliminar el cliente
    await sql`DELETE FROM "Cliente" WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/participantes error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}
