import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// GET /api/admin/equipos?liga=Liga+MX  →  { equipos: [{id, nombre, liga, logoUrl}] }
// GET /api/admin/equipos               →  { equipos: [...todos...] }
export async function GET(req: NextRequest) {
  const liga = req.nextUrl.searchParams.get("liga");
  const equipos = await prisma.equipo.findMany({
    where: liga ? { liga } : undefined,
    orderBy: [{ liga: "asc" }, { nombre: "asc" }],
  });
  return NextResponse.json({ equipos });
}

// POST /api/admin/equipos  body: { nombre, liga, logoUrl? }
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!["superadmin", "admin"].includes(token?.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { nombre, liga, logoUrl } = await req.json();
  if (!nombre?.trim() || !liga?.trim()) {
    return NextResponse.json({ error: "nombre y liga son requeridos" }, { status: 400 });
  }
  try {
    const equipo = await prisma.equipo.upsert({
      where: { nombre_liga: { nombre: nombre.trim(), liga: liga.trim() } },
      update: { logoUrl: logoUrl ?? "" },
      create: { nombre: nombre.trim(), liga: liga.trim(), logoUrl: logoUrl ?? "" },
    });
    return NextResponse.json(equipo);
  } catch {
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}

// DELETE /api/admin/equipos?id=xxx
export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!["superadmin", "admin"].includes(token?.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await prisma.equipo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
