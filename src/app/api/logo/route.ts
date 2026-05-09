import { NextRequest, NextResponse } from "next/server";

// Proxy para imágenes de ESPN CDN — necesario porque canvas bloquea
// imágenes cross-origin sin CORS headers, y ESPN no los incluye.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Solo permitir URLs de ESPN
  if (!url.startsWith("https://a.espncdn.com/")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Error fetching logo", { status: 500 });
  }
}
