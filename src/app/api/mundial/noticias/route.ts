import { NextResponse } from "next/server";

// Cache 15 minutos
let cache: { data: unknown; ts: number } | null = null;
const TTL = 15 * 60 * 1000;

type EspnArticle = {
  headline?: string;
  description?: string;
  published?: string;
  lastModified?: string;
  links?: { web?: { href?: string } };
  images?: { url?: string; width?: number; height?: number }[];
  categories?: { description?: string; type?: string }[];
  byline?: string;
};

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Intentar primero noticias específicas del Mundial
    const urls = [
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news?limit=8",
      "https://site.api.espn.com/apis/site/v2/sports/soccer/news?limit=20",
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
            // Si viene del endpoint específico del Mundial, aceptar todos
            if (url.includes("fifa.world")) return true;
            // Si viene del general, filtrar por palabras clave
            const texto = ((a.headline ?? "") + " " + (a.description ?? "") + " " + (a.categories?.map(c => c.description).join(" ") ?? "")).toLowerCase();
            return texto.includes("world cup") || texto.includes("mundial") || texto.includes("fifa") || texto.includes("2026");
          })
          .slice(0, 6)
          .map((a) => ({
            titulo: a.headline ?? "",
            descripcion: a.description ?? "",
            imagen: a.images?.[0]?.url ?? null,
            url: a.links?.web?.href ?? "",
            fecha: a.published ?? a.lastModified ?? null,
            autor: a.byline ?? null,
          }));

        if (filtrados.length >= 3) {
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
