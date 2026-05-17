// Descarga logos de equipos desde ESPN CDN y los guarda en /public/logos/
// Uso: node scripts/descargar-logos.mjs

import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public", "logos");

const EQUIPOS = [
  // ── Liga MX ────────────────────────────────────────────────────────
  { carpeta: "liga-mx", archivo: "america",      id: 193   },
  { carpeta: "liga-mx", archivo: "guadalajara",  id: 194   },
  { carpeta: "liga-mx", archivo: "cruz-azul",    id: 195   },
  { carpeta: "liga-mx", archivo: "atlas",        id: 196   },
  { carpeta: "liga-mx", archivo: "necaxa",       id: 197   },
  { carpeta: "liga-mx", archivo: "pumas",        id: 198   },
  { carpeta: "liga-mx", archivo: "pachuca",      id: 199   },
  { carpeta: "liga-mx", archivo: "toluca",       id: 200   },
  { carpeta: "liga-mx", archivo: "tigres",       id: 2017  },
  { carpeta: "liga-mx", archivo: "monterrey",    id: 2018  },
  { carpeta: "liga-mx", archivo: "tijuana",      id: 3993  },
  { carpeta: "liga-mx", archivo: "queretaro",    id: 3994  },
  { carpeta: "liga-mx", archivo: "santos",       id: 3991  },
  { carpeta: "liga-mx", archivo: "leon",         id: 3992  },
  { carpeta: "liga-mx", archivo: "san-luis",     id: 16649 },
  { carpeta: "liga-mx", archivo: "mazatlan",     id: 16759 },
  { carpeta: "liga-mx", archivo: "juarez",       id: 16855 },

  // ── Champions League ───────────────────────────────────────────────
  { carpeta: "champions", archivo: "real-madrid",  id: 86   },
  { carpeta: "champions", archivo: "barcelona",    id: 83   },
  { carpeta: "champions", archivo: "atletico",     id: 1068 },
  { carpeta: "champions", archivo: "bayern",       id: 132  },
  { carpeta: "champions", archivo: "dortmund",     id: 124  },
  { carpeta: "champions", archivo: "leverkusen",   id: 163  },
  { carpeta: "champions", archivo: "psg",          id: 160  },
  { carpeta: "champions", archivo: "man-city",     id: 382  },
  { carpeta: "champions", archivo: "arsenal",      id: 359  },
  { carpeta: "champions", archivo: "liverpool",    id: 364  },
  { carpeta: "champions", archivo: "chelsea",      id: 363  },
  { carpeta: "champions", archivo: "aston-villa",  id: 362  },
  { carpeta: "champions", archivo: "inter",        id: 110  },
  { carpeta: "champions", archivo: "milan",        id: 103  },
  { carpeta: "champions", archivo: "juventus",     id: 111  },
  { carpeta: "champions", archivo: "porto",        id: 235  },
  { carpeta: "champions", archivo: "benfica",      id: 234  },
  { carpeta: "champions", archivo: "ajax",         id: 210  },
  { carpeta: "champions", archivo: "sporting",     id: 237  },
  { carpeta: "champions", archivo: "brugge",       id: 248  },

  // ── Premier League ─────────────────────────────────────────────────
  { carpeta: "premier", archivo: "tottenham",      id: 367  },
  { carpeta: "premier", archivo: "man-united",     id: 360  },
  { carpeta: "premier", archivo: "newcastle",      id: 361  },
  { carpeta: "premier", archivo: "west-ham",       id: 371  },
  { carpeta: "premier", archivo: "brighton",       id: 331  },
  { carpeta: "premier", archivo: "wolves",         id: 380  },
  { carpeta: "premier", archivo: "nottingham",     id: 393  },
  { carpeta: "premier", archivo: "leicester",      id: 375  },
  { carpeta: "premier", archivo: "bournemouth",    id: 349  },
  { carpeta: "premier", archivo: "everton",        id: 368  },
  { carpeta: "premier", archivo: "fulham",         id: 370  },
  { carpeta: "premier", archivo: "crystal-palace", id: 384  },
  { carpeta: "premier", archivo: "brentford",      id: 337  },

  // ── La Liga ────────────────────────────────────────────────────────
  { carpeta: "la-liga", archivo: "real-sociedad",  id: 89   },
  { carpeta: "la-liga", archivo: "sevilla",        id: 243  },
  { carpeta: "la-liga", archivo: "villarreal",     id: 102  },
  { carpeta: "la-liga", archivo: "valencia",       id: 94   },
  { carpeta: "la-liga", archivo: "athletic",       id: 93   },
  { carpeta: "la-liga", archivo: "betis",          id: 244  },
  { carpeta: "la-liga", archivo: "celta",          id: 251  },
  { carpeta: "la-liga", archivo: "getafe",         id: 3842 },
  { carpeta: "la-liga", archivo: "osasuna",        id: 3841 },
  { carpeta: "la-liga", archivo: "rayo",           id: 3847 },
];

function descargar(url, destino) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destino);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destino);
        descargar(res.headers.location, destino).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destino);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (e) => {
      fs.unlink(destino, () => {});
      reject(e);
    });
  });
}

async function main() {
  let ok = 0, fail = 0;

  for (const equipo of EQUIPOS) {
    const dir = path.join(PUBLIC, equipo.carpeta);
    fs.mkdirSync(dir, { recursive: true });

    const destino = path.join(dir, `${equipo.archivo}.png`);
    const url = `https://a.espncdn.com/i/teamlogos/soccer/500/${equipo.id}.png`;

    process.stdout.write(`  Descargando ${equipo.carpeta}/${equipo.archivo}.png ... `);
    try {
      await descargar(url, destino);
      console.log("✅");
      ok++;
    } catch (e) {
      console.log(`❌ (${e.message})`);
      fail++;
    }
  }

  console.log(`\nListo: ${ok} descargados, ${fail} fallidos.`);
  if (fail > 0) {
    console.log("Los que fallaron probablemente tienen ID incorrecto — revisa el logo manualmente.");
  }
}

main();
