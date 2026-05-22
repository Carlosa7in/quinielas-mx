import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// GET /api/admin/clientes?q=Car — busca clientes por nombre para autocompletar (solo staff)
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const rol = (token?.role as string) ?? "";
  if (!["admin", "superadmin", "tienda", "vendedor"].includes(rol)) {
    return NextResponse.json([], { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  try {
    const rows = await prisma.quiniela.findMany({
      where: {
        nombreCliente: { contains: q, mode: "insensitive" },
        telefonoCliente: { not: null },
      },
      select: { nombreCliente: true, telefonoCliente: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Deduplicar por teléfono — conserva el registro más reciente
    const seen = new Map<string, { nombre: string; telefono: string }>();
    for (const r of rows) {
      if (!r.nombreCliente || !r.telefonoCliente) continue;
      if (!seen.has(r.telefonoCliente)) {
        seen.set(r.telefonoCliente, {
          nombre: r.nombreCliente,
          telefono: r.telefonoCliente,
        });
      }
    }

    return NextResponse.json([...seen.values()].slice(0, 6));
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
