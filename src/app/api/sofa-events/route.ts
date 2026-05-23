import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Intentar varias estrategias para sortear el bloqueo de SofaScore
const HEADERS_LIST = [
  // Chrome en Mac
  {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
    "Referer": "https://www.sofascore.com/",
    "Origin": "https://www.sofascore.com",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "Cache-Control": "no-cache",
  },
  // iPhone Safari
  {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Accept": "application/json",
    "Accept-Language": "es-MX,es;q=0.9",
    "Referer": "https://www.sofascore.com/",
  },
  // App móvil de SofaScore
  {
    "User-Agent": "SofaScore/5.0 (iPhone; iOS 17.4; Scale/3.00)",
    "Accept": "application/json",
    "Referer": "https://www.sofascore.com/",
  },
];

/** GET /api/sofa-events?fecha=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const fecha = req.nextUrl.searchParams.get("fecha");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "fecha requerida (YYYY-MM-DD)" }, { status: 400 });
  }

  const url = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${fecha}`;

  for (const headers of HEADERS_LIST) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json() as { events?: unknown[] };
      const events = data.events ?? [];
      if (events.length > 0) {
        return NextResponse.json({ events, fecha, source: "sofascore" });
      }
    } catch { /* probar siguiente */ }
  }

  return NextResponse.json({ events: [], fecha, source: "blocked" });
}
