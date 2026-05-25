import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma, sql } from "@/lib/prisma";

// Solo superadmin puede ver/editar gastos
async function autorizar(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== "superadmin") return null;
  return token;
}

// GET /api/admin/gastos — lista de gastos + métricas de ROI
export async function GET(req: NextRequest) {
  if (!await autorizar(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Gastos via SQL directo (DateTime bug en NeonHTTP + Prisma)
  const rows = await sql`
    SELECT id, concepto, categoria, monto, moneda, recurrencia,
           "fechaPago", "fechaVence", notas, activo, "createdAt"
    FROM "Gasto"
    WHERE activo = true
    ORDER BY "createdAt" DESC
  `;

  const gastos = rows.map((r) => ({
    id:          String(r.id),
    concepto:    String(r.concepto),
    categoria:   String(r.categoria),
    monto:       Number(r.monto),
    moneda:      String(r.moneda),
    recurrencia: String(r.recurrencia),
    fechaPago:   r.fechaPago instanceof Date ? r.fechaPago.toISOString() : String(r.fechaPago ?? ""),
    fechaVence:  r.fechaVence ? (r.fechaVence instanceof Date ? r.fechaVence.toISOString() : String(r.fechaVence)) : null,
    notas:       r.notas ? String(r.notas) : null,
    activo:      Boolean(r.activo),
  }));

  // Ingresos del mes actual (quinielas confirmadas)
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

  let ingresosMes = 0;
  let ingresosTotal = 0;
  try {
    const [resM, resT] = await Promise.all([
      sql`SELECT COALESCE(SUM(monto),0)::float AS total FROM "Quiniela"
          WHERE "estadoPago" = 'confirmado'
            AND "createdAt" >= ${inicioMes} AND "createdAt" <= ${finMes}`,
      sql`SELECT COALESCE(SUM(monto),0)::float AS total FROM "Quiniela"
          WHERE "estadoPago" = 'confirmado'`,
    ]);
    ingresosMes   = Number(resM[0]?.total ?? 0);
    ingresosTotal = Number(resT[0]?.total ?? 0);
  } catch { /* ignorar */ }

  return NextResponse.json({ gastos, ingresosMes, ingresosTotal });
}

// POST /api/admin/gastos — crear gasto
export async function POST(req: NextRequest) {
  if (!await autorizar(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const { concepto, categoria, monto, moneda, recurrencia, fechaPago, fechaVence, notas } = body;

  if (!concepto || monto === undefined) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const id = `gasto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const fp = fechaPago ? new Date(fechaPago) : new Date();
  const fv = fechaVence ? new Date(fechaVence) : null;

  await sql`
    INSERT INTO "Gasto" (id, concepto, categoria, monto, moneda, recurrencia, "fechaPago", "fechaVence", notas, activo, "createdAt")
    VALUES (
      ${id}, ${concepto}, ${categoria ?? "otro"}, ${Number(monto)},
      ${moneda ?? "USD"}, ${recurrencia ?? "mensual"},
      ${fp}, ${fv}, ${notas ?? null}, true, NOW()
    )
  `;

  return NextResponse.json({ ok: true, id });
}

// PATCH /api/admin/gastos — actualizar gasto
export async function PATCH(req: NextRequest) {
  if (!await autorizar(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const { id, concepto, categoria, monto, moneda, recurrencia, fechaPago, fechaVence, notas } = body;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const fp = fechaPago ? new Date(fechaPago) : new Date();
  const fv = fechaVence ? new Date(fechaVence) : null;

  await sql`
    UPDATE "Gasto"
    SET concepto      = ${concepto},
        categoria     = ${categoria ?? "otro"},
        monto         = ${Number(monto)},
        moneda        = ${moneda ?? "USD"},
        recurrencia   = ${recurrencia ?? "mensual"},
        "fechaPago"   = ${fp},
        "fechaVence"  = ${fv},
        notas         = ${notas ?? null}
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/gastos — soft delete (activo = false)
export async function DELETE(req: NextRequest) {
  if (!await autorizar(req)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  await sql`UPDATE "Gasto" SET activo = false WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
