import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxy para logos de ESPN.
// Cache-Control: private → el NAVEGADOR cachea, pero Netlify CDN NO.
// Esto evita que el CDN sirva el mismo logo para todos los equipos.
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
        // private = navegador cachea, CDN no
        "Cache-Control": "private, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
