import { NextRequest, NextResponse } from "next/server";

// Proxy para imágenes de ESPN CDN — necesario porque canvas bloquea
// imágenes cross-origin sin CORS headers, y ESPN no los incluye.
// IMPORTANTE: NO usar `next: { revalidate }` aquí — causa que Next.js
// devuelva la misma respuesta cacheada para URLs distintas.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  if (!url.startsWith("https://a.espncdn.com/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/png",
        // El navegador cachea por URL — no necesitamos Next.js cache
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Error fetching logo", { status: 500 });
  }
}
