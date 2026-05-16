import { NextResponse } from "next/server";

// Cache 15 minutos
let cache: { data: unknown; ts: number } | null = null;
const TTL = 15 * 60 * 1000;

type EspnArticle = {
  headline?: string;
  description?: string;
  published?: string;
  lastModified?: string;
  links?: {
    web?:    { href?: string };
    mobile?: { href?: string };
    app?:    { sportscenter?: { href?: string } };
  };
  images?: { url?: string; width?: number; height?: number }[];
  categories?: { description?: string; type?: string }[];
  byline?: string;
};

// Convierte una URL de ESPN en inglés a su equivalente en español
function toEspanolUrl(href: string): string {
  if (!href) return href;
  // espndeportes.espn.com ya es español
  if (href.includes("espndeportes") || href.includes("espn.com.mx")) return href;
  // www.espn.com/soccer/... → espndeportes.espn.com/futbol/...
  return href
    .replace("www.espn.com/soccer", "espndeportes.espn.com/futbol")
    .replace("www.espn.com/", "espndeportes.espn.com/");
}

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Endpoints en español (lang=es&region=mx), del más específico al más general
    const urls = [
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news?limit=20&lang=es&region=mx",
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news?limit=20",
      "https://site.api.espn.com/apis/site/v2/sports/soccer/news?limit=40&lang=es&region=mx",
      "https://site.api.espn.com/apis/site/v2/sports/soccer/news?limit=40",
    ];

    let articulos: unknown[] = [];

    for (const url of urls) {
      try {
        const res = await fetch(url, { next: { revalidate: 900 } });
        if (!res.ok) continue;
        const data = await res.json() as { articles?: EspnArticle[] };
        const arts = data.articles ?? [];

        const filtrados = arts
          .filter((a) => {
            if (url.includes("fifa.world")) return true;
            const texto = (
              (a.headline ?? "") + " " +
              (a.description ?? "") + " " +
              (a.categories?.map(c => c.description).join(" ") ?? "")
            ).toLowerCase();
            return (
              texto.includes("world cup") || texto.includes("mundial") ||
              texto.includes("fifa") || texto.includes("2026")
            );
          })
          .slice(0, 20)
          .map((a) => {
            const urlOriginal = a.links?.web?.href ?? "";
            return {
              titulo:      a.headline ?? "",
              descripcion: a.description ?? "",
              imagen:      a.images?.[0]?.url ?? null,
              url:         toEspanolUrl(urlOriginal),
              fecha:       a.published ?? a.lastModified ?? null,
              autor:       a.byline ?? null,
            };
          });

        if (filtrados.length >= 5) {
          articulos = filtrados;
          break;
        }
      } catch {
        continue;
      }
    }

    const resultado = { articulos, actualizado: new Date().toISOString() };
    cache = { data: resultado, ts: Date.now() };
    return NextResponse.json(resultado);
  } catch (err) {
    return NextResponse.json({ articulos: [], error: String(err) });
  }
}
