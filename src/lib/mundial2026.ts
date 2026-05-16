export const MUNDIAL_FECHAS = {
  inicio: "2026-06-11T00:00:00-05:00",
  final:  "2026-07-19T00:00:00-05:00",
};

export type Sede = {
  ciudad: string;
  pais: "México" | "USA" | "Canadá";
  estadio: string;
  capacidad: number;
  emoji: string;
  nota?: string;
};

export const SEDES: Sede[] = [
  // México
  { ciudad: "Ciudad de México", pais: "México", estadio: "Estadio Azteca",     capacidad: 87500, emoji: "🇲🇽", nota: "Semifinal" },
  { ciudad: "Guadalajara",      pais: "México", estadio: "Estadio Akron",       capacidad: 46000, emoji: "🇲🇽" },
  { ciudad: "Monterrey",        pais: "México", estadio: "Estadio BBVA",         capacidad: 51000, emoji: "🇲🇽" },
  // USA
  { ciudad: "Nueva York / NJ",  pais: "USA",    estadio: "MetLife Stadium",      capacidad: 82500, emoji: "🇺🇸", nota: "FINAL 🏆" },
  { ciudad: "Los Ángeles",      pais: "USA",    estadio: "SoFi Stadium",          capacidad: 70000, emoji: "🇺🇸" },
  { ciudad: "Dallas",           pais: "USA",    estadio: "AT&T Stadium",          capacidad: 80000, emoji: "🇺🇸" },
  { ciudad: "San Francisco",    pais: "USA",    estadio: "Levi's Stadium",        capacidad: 68500, emoji: "🇺🇸" },
  { ciudad: "Atlanta",          pais: "USA",    estadio: "Mercedes-Benz Stadium", capacidad: 71000, emoji: "🇺🇸" },
  { ciudad: "Seattle",          pais: "USA",    estadio: "Lumen Field",           capacidad: 68000, emoji: "🇺🇸" },
  { ciudad: "Houston",          pais: "USA",    estadio: "NRG Stadium",           capacidad: 70000, emoji: "🇺🇸" },
  { ciudad: "Filadelfia",       pais: "USA",    estadio: "Lincoln Financial Field",capacidad: 69000, emoji: "🇺🇸" },
  { ciudad: "Kansas City",      pais: "USA",    estadio: "Arrowhead Stadium",     capacidad: 76000, emoji: "🇺🇸" },
  { ciudad: "Miami",            pais: "USA",    estadio: "Hard Rock Stadium",     capacidad: 65000, emoji: "🇺🇸" },
  { ciudad: "Boston",           pais: "USA",    estadio: "Gillette Stadium",      capacidad: 65000, emoji: "🇺🇸" },
  // Canadá
  { ciudad: "Toronto",          pais: "Canadá", estadio: "BMO Field",            capacidad: 45000, emoji: "🇨🇦" },
  { ciudad: "Vancouver",        pais: "Canadá", estadio: "BC Place",             capacidad: 54000, emoji: "🇨🇦" },
];

export type EquipoDestacado = {
  pais: string;
  bandera: string;
  confederation: string;
  dt: string;
  color: string; // Tailwind bg class
  jugadores: { nombre: string; posicion: string; club: string }[];
  curiosidad: string;
};

export const EQUIPOS_DESTACADOS: EquipoDestacado[] = [
  {
    pais: "México",
    bandera: "🇲🇽",
    confederation: "CONCACAF",
    dt: "Javier Aguirre",
    color: "bg-green-700",
    jugadores: [
      { nombre: "Guillermo Ochoa", posicion: "Portero", club: "Salernitana" },
      { nombre: "Edson Álvarez",   posicion: "Mediocampista", club: "West Ham" },
      { nombre: "Santi Giménez",   posicion: "Delantero", club: "AC Milan" },
      { nombre: "Hirving Lozano",  posicion: "Extremo",   club: "PSV" },
    ],
    curiosidad: "Sede anfitriona. El Azteca será el único estadio en haber albergado 3 Mundiales (1970, 1986, 2026).",
  },
  {
    pais: "Argentina",
    bandera: "🇦🇷",
    confederation: "CONMEBOL",
    dt: "Lionel Scaloni",
    color: "bg-sky-600",
    jugadores: [
      { nombre: "Lionel Messi",      posicion: "Delantero",     club: "Inter Miami" },
      { nombre: "Julián Álvarez",    posicion: "Delantero",     club: "Atlético Madrid" },
      { nombre: "Rodrigo De Paul",   posicion: "Mediocampista", club: "Atlético Madrid" },
      { nombre: "Emiliano Martínez", posicion: "Portero",       club: "Aston Villa" },
    ],
    curiosidad: "Bicampeones del mundo (2022). Lionel Messi busca ganar un segundo título.",
  },
  {
    pais: "Brasil",
    bandera: "🇧🇷",
    confederation: "CONMEBOL",
    dt: "Dorival Júnior",
    color: "bg-yellow-500",
    jugadores: [
      { nombre: "Vinicius Jr.",  posicion: "Extremo",       club: "Real Madrid" },
      { nombre: "Rodrygo",       posicion: "Extremo",       club: "Real Madrid" },
      { nombre: "Endrick",       posicion: "Delantero",     club: "Real Madrid" },
      { nombre: "Casemiro",      posicion: "Mediocampista", club: "Manchester United" },
    ],
    curiosidad: "5 veces campeones del mundo. Brasil no gana desde 2002 y busca saldar esa deuda.",
  },
  {
    pais: "USA",
    bandera: "🇺🇸",
    confederation: "CONCACAF",
    dt: "Mauricio Pochettino",
    color: "bg-blue-700",
    jugadores: [
      { nombre: "Christian Pulisic", posicion: "Extremo",       club: "AC Milan" },
      { nombre: "Gio Reyna",         posicion: "Mediocampista", club: "Borussia Dortmund" },
      { nombre: "Tyler Adams",       posicion: "Mediocampista", club: "Bournemouth" },
      { nombre: "Folarin Balogun",   posicion: "Delantero",     club: "Monaco" },
    ],
    curiosidad: "Sede anfitriona en casa. La presión local será su mayor desafío y motivación.",
  },
  {
    pais: "Francia",
    bandera: "🇫🇷",
    confederation: "UEFA",
    dt: "Didier Deschamps",
    color: "bg-blue-900",
    jugadores: [
      { nombre: "Kylian Mbappé",     posicion: "Delantero",     club: "Real Madrid" },
      { nombre: "Antoine Griezmann", posicion: "Mediocampista", club: "Atlético Madrid" },
      { nombre: "Ousmane Dembélé",   posicion: "Extremo",       club: "PSG" },
      { nombre: "N'Golo Kanté",      posicion: "Mediocampista", club: "Al-Ittihad" },
    ],
    curiosidad: "Finalistas en 2022. Mbappé llega al Madrid y con hambre de ganar con Francia.",
  },
  {
    pais: "España",
    bandera: "🇪🇸",
    confederation: "UEFA",
    dt: "Luis de la Fuente",
    color: "bg-red-700",
    jugadores: [
      { nombre: "Lamine Yamal",   posicion: "Extremo",       club: "FC Barcelona" },
      { nombre: "Pedri",          posicion: "Mediocampista", club: "FC Barcelona" },
      { nombre: "Rodri",          posicion: "Mediocampista", club: "Manchester City" },
      { nombre: "Álvaro Morata",  posicion: "Delantero",     club: "AC Milan" },
    ],
    curiosidad: "Campeones de la Eurocopa 2024 con el joven Lamine Yamal como figura.",
  },
  {
    pais: "Alemania",
    bandera: "🇩🇪",
    confederation: "UEFA",
    dt: "Julian Nagelsmann",
    color: "bg-gray-800",
    jugadores: [
      { nombre: "Jamal Musiala",   posicion: "Mediocampista", club: "Bayern München" },
      { nombre: "Florian Wirtz",   posicion: "Mediocampista", club: "Bayer Leverkusen" },
      { nombre: "Kai Havertz",     posicion: "Delantero",     club: "Arsenal" },
      { nombre: "Manuel Neuer",    posicion: "Portero",       club: "Bayern München" },
    ],
    curiosidad: "Eliminados en grupos en 2018 y 2022 — buscan la redención en tierra americana.",
  },
  {
    pais: "Inglaterra",
    bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    confederation: "UEFA",
    dt: "Lee Carsley",
    color: "bg-white border border-gray-200",
    jugadores: [
      { nombre: "Jude Bellingham",  posicion: "Mediocampista", club: "Real Madrid" },
      { nombre: "Phil Foden",       posicion: "Mediocampista", club: "Manchester City" },
      { nombre: "Bukayo Saka",      posicion: "Extremo",       club: "Arsenal" },
      { nombre: "Harry Kane",       posicion: "Delantero",     club: "Bayern München" },
    ],
    curiosidad: "Finalistas en la Euro 2024. Llevan 60 años sin ganar un Mundial.",
  },
  {
    pais: "Marruecos",
    bandera: "🇲🇦",
    confederation: "CAF",
    dt: "Walid Regragui",
    color: "bg-red-800",
    jugadores: [
      { nombre: "Hakim Ziyech",    posicion: "Extremo",       club: "Galatasaray" },
      { nombre: "Achraf Hakimi",   posicion: "Lateral Der.", club: "PSG" },
      { nombre: "Youssef En-Nesyri", posicion: "Delantero",  club: "Fenerbahçe" },
      { nombre: "Sofyan Amrabat",  posicion: "Mediocampista", club: "Fiorentina" },
    ],
    curiosidad: "Semifinalistas en Qatar 2022. La sorpresa del continente africano.",
  },
  {
    pais: "Japón",
    bandera: "🇯🇵",
    confederation: "AFC",
    dt: "Hajime Moriyasu",
    color: "bg-blue-600",
    jugadores: [
      { nombre: "Takumi Minamino", posicion: "Mediocampista", club: "Monaco" },
      { nombre: "Daichi Kamada",   posicion: "Mediocampista", club: "Crystal Palace" },
      { nombre: "Ritsu Doan",      posicion: "Extremo",       club: "SC Freiburg" },
      { nombre: "Kaoru Mitoma",    posicion: "Extremo",       club: "Brighton" },
    ],
    curiosidad: "Eliminaron a Alemania y España en Qatar 2022. El equipo más en forma de Asia.",
  },
];

export const FORMATO = {
  equipos: 48,
  grupos: 12,
  equiposPorGrupo: 4,
  clasificanPorGrupo: 2,
  mejoresTerceros: 8,
  totalFaseGrupos: 64,
  rondas: ["Fase de Grupos", "Ronda de 32", "Octavos", "Cuartos", "Semis", "Final"],
};
