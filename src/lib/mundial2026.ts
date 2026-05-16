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
  { ciudad: "Ciudad de México", pais: "México", estadio: "Estadio Azteca",      capacidad: 87500, emoji: "🇲🇽", nota: "Semifinal" },
  { ciudad: "Guadalajara",      pais: "México", estadio: "Estadio Akron",        capacidad: 46000, emoji: "🇲🇽" },
  { ciudad: "Monterrey",        pais: "México", estadio: "Estadio BBVA",          capacidad: 51000, emoji: "🇲🇽" },
  // USA
  { ciudad: "Nueva York / NJ",  pais: "USA",    estadio: "MetLife Stadium",       capacidad: 82500, emoji: "🇺🇸", nota: "FINAL 🏆" },
  { ciudad: "Los Ángeles",      pais: "USA",    estadio: "SoFi Stadium",           capacidad: 70000, emoji: "🇺🇸" },
  { ciudad: "Dallas",           pais: "USA",    estadio: "AT&T Stadium",           capacidad: 80000, emoji: "🇺🇸" },
  { ciudad: "San Francisco",    pais: "USA",    estadio: "Levi's Stadium",         capacidad: 68500, emoji: "🇺🇸" },
  { ciudad: "Atlanta",          pais: "USA",    estadio: "Mercedes-Benz Stadium",  capacidad: 71000, emoji: "🇺🇸" },
  { ciudad: "Seattle",          pais: "USA",    estadio: "Lumen Field",            capacidad: 68000, emoji: "🇺🇸" },
  { ciudad: "Houston",          pais: "USA",    estadio: "NRG Stadium",            capacidad: 70000, emoji: "🇺🇸" },
  { ciudad: "Filadelfia",       pais: "USA",    estadio: "Lincoln Financial Field", capacidad: 69000, emoji: "🇺🇸" },
  { ciudad: "Kansas City",      pais: "USA",    estadio: "Arrowhead Stadium",      capacidad: 76000, emoji: "🇺🇸" },
  { ciudad: "Miami",            pais: "USA",    estadio: "Hard Rock Stadium",      capacidad: 65000, emoji: "🇺🇸" },
  { ciudad: "Boston",           pais: "USA",    estadio: "Gillette Stadium",       capacidad: 65000, emoji: "🇺🇸" },
  // Canadá
  { ciudad: "Toronto",          pais: "Canadá", estadio: "BMO Field",             capacidad: 45000, emoji: "🇨🇦" },
  { ciudad: "Vancouver",        pais: "Canadá", estadio: "BC Place",              capacidad: 54000, emoji: "🇨🇦" },
];

export type Jugador = {
  nombre: string;
  posicion: string;
  club: string;
  edad?: number;
  dorsal?: number;
};

export type EquipoDestacado = {
  slug: string;
  pais: string;
  bandera: string;
  confederation: string;
  dt: string;
  dtNacionalidad?: string;
  color: string;        // Tailwind bg class — siempre fondo oscuro para que el texto blanco sea visible
  colorHex: string;     // Para gradientes CSS
  rankingFIFA?: number;
  mundiales: number;
  apariciones: number;
  mejorResultado: string;
  titulos: string[];
  jugadores: Jugador[];
  historia: string;
  curiosidad: string;
  esAnfitrion?: boolean;
};

export const EQUIPOS_DESTACADOS: EquipoDestacado[] = [
  {
    slug: "mexico",
    pais: "México",
    bandera: "🇲🇽",
    confederation: "CONCACAF",
    dt: "Javier Aguirre",
    dtNacionalidad: "Mexicano",
    color: "bg-green-800",
    colorHex: "#166534",
    rankingFIFA: 15,
    mundiales: 0,
    apariciones: 17,
    mejorResultado: "Cuartos de final (1970, 1986)",
    titulos: [],
    jugadores: [
      { nombre: "Guillermo Ochoa",   posicion: "Portero",       club: "Salernitana",       edad: 39, dorsal: 1  },
      { nombre: "Johan Vásquez",     posicion: "Defensa Central",club: "Genoa",            edad: 26, dorsal: 3  },
      { nombre: "Edson Álvarez",     posicion: "Mediocampista",  club: "West Ham",          edad: 27, dorsal: 6  },
      { nombre: "Santi Giménez",     posicion: "Delantero",      club: "AC Milan",          edad: 24, dorsal: 9  },
      { nombre: "Hirving Lozano",    posicion: "Extremo Der.",   club: "PSV",               edad: 30, dorsal: 22 },
      { nombre: "Julián Quiñones",   posicion: "Extremo Izq.",   club: "Club América",      edad: 27, dorsal: 11 },
      { nombre: "Orbelin Pineda",    posicion: "Mediocampista",  club: "AEK Atenas",        edad: 28, dorsal: 8  },
      { nombre: "Luis Romo",         posicion: "Mediocampista",  club: "Cruz Azul",         edad: 29, dorsal: 16 },
      { nombre: "Kevin Álvarez",     posicion: "Lateral Der.",   club: "Club América",      edad: 25, dorsal: 2  },
    ],
    historia: "La Selección Mexicana lleva 17 participaciones en Copas del Mundo, más que cualquier otra selección de la CONCACAF. Su apodo 'El Tri' viene de los tres colores de su bandera. En 1970 y 1986 llegó a cuartos de final como local, pero jamás ha ido más allá. En 2026 juega de nuevo en casa, con el Estadio Azteca como escenario — el único estadio del mundo en albergar tres mundiales.",
    curiosidad: "El Azteca será el único estadio en haber albergado 3 Mundiales: 1970, 1986 y 2026.",
    esAnfitrion: true,
  },
  {
    slug: "argentina",
    pais: "Argentina",
    bandera: "🇦🇷",
    confederation: "CONMEBOL",
    dt: "Lionel Scaloni",
    dtNacionalidad: "Argentino",
    color: "bg-sky-700",
    colorHex: "#0369a1",
    rankingFIFA: 1,
    mundiales: 3,
    apariciones: 19,
    mejorResultado: "Campeón (1978, 1986, 2022)",
    titulos: ["Argentina 1978", "México 1986", "Qatar 2022"],
    jugadores: [
      { nombre: "Emiliano Martínez", posicion: "Portero",        club: "Aston Villa",       edad: 32, dorsal: 23 },
      { nombre: "Nahuel Molina",     posicion: "Lateral Der.",    club: "Atlético Madrid",   edad: 26, dorsal: 26 },
      { nombre: "Cristian Romero",   posicion: "Defensa Central", club: "Tottenham",         edad: 26, dorsal: 13 },
      { nombre: "Lisandro Martínez", posicion: "Defensa Central", club: "Man. United",       edad: 27, dorsal: 25 },
      { nombre: "Rodrigo De Paul",   posicion: "Mediocampista",   club: "Atlético Madrid",   edad: 30, dorsal: 7  },
      { nombre: "Enzo Fernández",    posicion: "Mediocampista",   club: "Chelsea",           edad: 24, dorsal: 24 },
      { nombre: "Lionel Messi",      posicion: "Delantero",       club: "Inter Miami",       edad: 38, dorsal: 10 },
      { nombre: "Julián Álvarez",    posicion: "Delantero",       club: "Atlético Madrid",   edad: 25, dorsal: 9  },
      { nombre: "Lautaro Martínez",  posicion: "Delantero",       club: "Inter Milán",       edad: 27, dorsal: 22 },
    ],
    historia: "Argentina es una de las grandes potencias del fútbol mundial. Tricampeones del mundo, su historia incluye a Diego Maradona como máxima leyenda y a Lionel Messi, quien cerró su leyenda ganando el Mundial de Qatar 2022. Con Scaloni en el banquillo, el equipo ha construido una identidad colectiva que va más allá de cualquier figura individual.",
    curiosidad: "Lionel Messi, a sus 38 años, podría disputar su último Mundial. Busca el bicampeonato que nadie esperaba.",
  },
  {
    slug: "brasil",
    pais: "Brasil",
    bandera: "🇧🇷",
    confederation: "CONMEBOL",
    dt: "Dorival Júnior",
    dtNacionalidad: "Brasileño",
    color: "bg-yellow-600",
    colorHex: "#d97706",
    rankingFIFA: 4,
    mundiales: 5,
    apariciones: 22,
    mejorResultado: "Campeón (1958, 1962, 1970, 1994, 2002)",
    titulos: ["Suecia 1958", "Chile 1962", "México 1970", "USA 1994", "Japón/Corea 2002"],
    jugadores: [
      { nombre: "Alisson Becker",   posicion: "Portero",        club: "Liverpool",         edad: 32, dorsal: 1  },
      { nombre: "Danilo",           posicion: "Lateral Der.",    club: "Juventus",          edad: 33, dorsal: 2  },
      { nombre: "Marquinhos",       posicion: "Defensa Central", club: "PSG",               edad: 30, dorsal: 4  },
      { nombre: "Casemiro",         posicion: "Mediocampista",   club: "Man. United",       edad: 34, dorsal: 5  },
      { nombre: "Bruno Guimarães",  posicion: "Mediocampista",   club: "Newcastle",         edad: 27, dorsal: 8  },
      { nombre: "Vinicius Jr.",     posicion: "Extremo Izq.",    club: "Real Madrid",       edad: 25, dorsal: 7  },
      { nombre: "Rodrygo",          posicion: "Extremo Der.",    club: "Real Madrid",       edad: 24, dorsal: 11 },
      { nombre: "Richarlison",      posicion: "Delantero",       club: "Tottenham",         edad: 28, dorsal: 9  },
      { nombre: "Endrick",          posicion: "Delantero",       club: "Real Madrid",       edad: 19, dorsal: 22 },
    ],
    historia: "La Canarinha es el único equipo en haber participado en todos los Mundiales de la historia (22 de 22). Con 5 títulos son los máximos campeones del planeta. Desde 2002 no levantan la copa, su mayor sequía histórica, lo que genera una presión enorme en cada torneo.",
    curiosidad: "Brasil es el único país que ha jugado TODOS los Mundiales de la historia — los 22.",
  },
  {
    slug: "usa",
    pais: "USA",
    bandera: "🇺🇸",
    confederation: "CONCACAF",
    dt: "Mauricio Pochettino",
    dtNacionalidad: "Argentino",
    color: "bg-blue-800",
    colorHex: "#1e40af",
    rankingFIFA: 11,
    mundiales: 0,
    apariciones: 11,
    mejorResultado: "Tercer lugar (1930)",
    titulos: [],
    jugadores: [
      { nombre: "Matt Turner",        posicion: "Portero",        club: "Nottingham Forest", edad: 30, dorsal: 1  },
      { nombre: "Sergino Dest",       posicion: "Lateral Der.",   club: "PSV",               edad: 24, dorsal: 2  },
      { nombre: "Miles Robinson",     posicion: "Defensa Central",club: "FC Cincinnati",     edad: 28, dorsal: 4  },
      { nombre: "Tyler Adams",        posicion: "Mediocampista",  club: "Bournemouth",       edad: 26, dorsal: 4  },
      { nombre: "Weston McKennie",    posicion: "Mediocampista",  club: "Juventus",          edad: 27, dorsal: 8  },
      { nombre: "Christian Pulisic",  posicion: "Mediocampista",  club: "AC Milan",          edad: 27, dorsal: 10 },
      { nombre: "Gio Reyna",          posicion: "Mediocampista",  club: "Dortmund",          edad: 23, dorsal: 7  },
      { nombre: "Folarin Balogun",    posicion: "Delantero",      club: "Monaco",            edad: 24, dorsal: 9  },
      { nombre: "Timothy Weah",       posicion: "Extremo",        club: "Juventus",          edad: 25, dorsal: 21 },
    ],
    historia: "La USMNT llegó a la semifinal del Mundial de 1930 como sorpresa. En los últimos años ha construido una generación dorada de jugadores europeos (Pulisic, Reyna, Adams, McKennie) con el potencial de ir muy lejos. Con Pochettino al frente y la presión de ser local, 2026 puede ser su gran momento.",
    curiosidad: "La generación 2026 es la más talentosa en la historia de USA — casi todos juegan en Europa.",
    esAnfitrion: true,
  },
  {
    slug: "francia",
    pais: "Francia",
    bandera: "🇫🇷",
    confederation: "UEFA",
    dt: "Didier Deschamps",
    dtNacionalidad: "Francés",
    color: "bg-blue-900",
    colorHex: "#1e3a8a",
    rankingFIFA: 2,
    mundiales: 2,
    apariciones: 16,
    mejorResultado: "Campeón (1998, 2018)",
    titulos: ["Francia 1998", "Rusia 2018"],
    jugadores: [
      { nombre: "Mike Maignan",       posicion: "Portero",        club: "AC Milan",          edad: 29, dorsal: 16 },
      { nombre: "Jules Koundé",       posicion: "Lateral Der.",   club: "FC Barcelona",      edad: 26, dorsal: 5  },
      { nombre: "Dayot Upamecano",    posicion: "Defensa Central",club: "Bayern München",    edad: 26, dorsal: 4  },
      { nombre: "William Saliba",     posicion: "Defensa Central",club: "Arsenal",           edad: 24, dorsal: 17 },
      { nombre: "Aurelien Tchouameni",posicion: "Mediocampista",  club: "Real Madrid",       edad: 25, dorsal: 8  },
      { nombre: "N'Golo Kanté",       posicion: "Mediocampista",  club: "Al-Ittihad",        edad: 35, dorsal: 13 },
      { nombre: "Antoine Griezmann",  posicion: "Mediocampista",  club: "Atlético Madrid",   edad: 35, dorsal: 7  },
      { nombre: "Kylian Mbappé",      posicion: "Delantero",      club: "Real Madrid",       edad: 27, dorsal: 10 },
      { nombre: "Ousmane Dembélé",    posicion: "Extremo",        club: "PSG",               edad: 29, dorsal: 11 },
    ],
    historia: "Les Bleus son bicampeones del mundo. Su talento es multicultural y refrescante: desde Platini y Zidane hasta Mbappé. En Qatar 2022 llegaron a la final con una actuación memorable de Mbappé, quien marcó 8 goles incluyendo un hat-trick en la final. Deschamps busca su tercera estrella como DT.",
    curiosidad: "Deschamps es el único francés en ganar el Mundial tanto como jugador (1998) como entrenador (2018).",
  },
  {
    slug: "espana",
    pais: "España",
    bandera: "🇪🇸",
    confederation: "UEFA",
    dt: "Luis de la Fuente",
    dtNacionalidad: "Español",
    color: "bg-red-700",
    colorHex: "#b91c1c",
    rankingFIFA: 3,
    mundiales: 1,
    apariciones: 16,
    mejorResultado: "Campeón (2010)",
    titulos: ["Sudáfrica 2010"],
    jugadores: [
      { nombre: "Unai Simón",       posicion: "Portero",         club: "Athletic Bilbao",   edad: 27, dorsal: 1  },
      { nombre: "Dani Carvajal",    posicion: "Lateral Der.",    club: "Real Madrid",        edad: 32, dorsal: 2  },
      { nombre: "Aymeric Laporte",  posicion: "Defensa Central", club: "Al-Nassr",          edad: 31, dorsal: 14 },
      { nombre: "Robin Le Normand", posicion: "Defensa Central", club: "Atlético Madrid",   edad: 28, dorsal: 24 },
      { nombre: "Rodri",            posicion: "Pivote",          club: "Manchester City",   edad: 29, dorsal: 16 },
      { nombre: "Pedri",            posicion: "Mediocampista",   club: "FC Barcelona",      edad: 23, dorsal: 8  },
      { nombre: "Fabián Ruiz",      posicion: "Mediocampista",   club: "PSG",               edad: 28, dorsal: 7  },
      { nombre: "Lamine Yamal",     posicion: "Extremo Der.",    club: "FC Barcelona",      edad: 18, dorsal: 19 },
      { nombre: "Álvaro Morata",    posicion: "Delantero",       club: "AC Milan",          edad: 33, dorsal: 9  },
    ],
    historia: "La Roja dominó el fútbol mundial entre 2008 y 2012 ganando dos Eurocopas y un Mundial con el revolucionario 'tiki-taka'. Después de años de reconstrucción, encontraron la siguiente gran generación con Gavi, Pedri y Lamine Yamal, ganando la Eurocopa 2024. Son nuevamente candidatos serios.",
    curiosidad: "Lamine Yamal cumplió 17 años el día antes de la final de la Euro 2024 — y la ganó siendo figura.",
  },
  {
    slug: "alemania",
    pais: "Alemania",
    bandera: "🇩🇪",
    confederation: "UEFA",
    dt: "Julian Nagelsmann",
    dtNacionalidad: "Alemán",
    color: "bg-zinc-800",
    colorHex: "#27272a",
    rankingFIFA: 12,
    mundiales: 4,
    apariciones: 20,
    mejorResultado: "Campeón (1954, 1974, 1990, 2014)",
    titulos: ["Suiza 1954", "Alemania Occ. 1974", "Italia 1990", "Brasil 2014"],
    jugadores: [
      { nombre: "Manuel Neuer",     posicion: "Portero",         club: "Bayern München",    edad: 40, dorsal: 1  },
      { nombre: "Joshua Kimmich",   posicion: "Lateral Der.",    club: "Bayern München",    edad: 31, dorsal: 6  },
      { nombre: "Antonio Rüdiger",  posicion: "Defensa Central", club: "Real Madrid",       edad: 33, dorsal: 2  },
      { nombre: "Jonathan Tah",     posicion: "Defensa Central", club: "Bayer Leverkusen",  edad: 29, dorsal: 4  },
      { nombre: "Toni Kroos",       posicion: "Mediocampista",   club: "Real Madrid",       edad: 35, dorsal: 8  },
      { nombre: "Jamal Musiala",    posicion: "Mediocampista",   club: "Bayern München",    edad: 22, dorsal: 10 },
      { nombre: "Florian Wirtz",    posicion: "Mediocampista",   club: "Bayer Leverkusen",  edad: 23, dorsal: 17 },
      { nombre: "Leroy Sané",       posicion: "Extremo",         club: "Bayern München",    edad: 30, dorsal: 19 },
      { nombre: "Kai Havertz",      posicion: "Delantero",       club: "Arsenal",           edad: 26, dorsal: 7  },
    ],
    historia: "Die Mannschaft es la selección europea más laureada del mundo con 4 títulos. Conocidos por su disciplina táctica y su capacidad de reinventarse, sufrieron la peor eliminación de su historia al caer en grupos en 2018 y 2022. Nagelsmann apuesta por la juventud de Musiala y Wirtz para recuperar la gloria.",
    curiosidad: "Alemania es la única selección en haber llegado a la semifinal en 4 Mundiales consecutivos (1982–1990).",
  },
  {
    slug: "inglaterra",
    pais: "Inglaterra",
    bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    confederation: "UEFA",
    dt: "Lee Carsley",
    dtNacionalidad: "Irlandés/Inglés",
    color: "bg-slate-700",    // ← oscuro para que el texto blanco sea visible
    colorHex: "#334155",
    rankingFIFA: 5,
    mundiales: 1,
    apariciones: 16,
    mejorResultado: "Campeón (1966)",
    titulos: ["Inglaterra 1966"],
    jugadores: [
      { nombre: "Jordan Pickford",   posicion: "Portero",         club: "Everton",           edad: 32, dorsal: 1  },
      { nombre: "Trent A-Arnold",    posicion: "Lateral Der.",    club: "Real Madrid",       edad: 27, dorsal: 2  },
      { nombre: "John Stones",       posicion: "Defensa Central", club: "Manchester City",   edad: 32, dorsal: 5  },
      { nombre: "Marc Guéhi",        posicion: "Defensa Central", club: "Crystal Palace",    edad: 24, dorsal: 6  },
      { nombre: "Jude Bellingham",   posicion: "Mediocampista",   club: "Real Madrid",       edad: 23, dorsal: 10 },
      { nombre: "Phil Foden",        posicion: "Mediocampista",   club: "Manchester City",   edad: 26, dorsal: 7  },
      { nombre: "Declan Rice",       posicion: "Pivote",          club: "Arsenal",           edad: 27, dorsal: 4  },
      { nombre: "Bukayo Saka",       posicion: "Extremo Der.",    club: "Arsenal",           edad: 24, dorsal: 7  },
      { nombre: "Harry Kane",        posicion: "Delantero",       club: "Bayern München",    edad: 33, dorsal: 9  },
    ],
    historia: "Los Three Lions ganaron su único Mundial en 1966, en casa, con el legendario Geoff Hurst marcando hat-trick en la final. Desde entonces, 60 años de sueños rotos — eliminados en penales más veces que ninguna otra selección. La generación actual de Bellingham, Kane y Saka es posiblemente la más talentosa desde 1966.",
    curiosidad: "Inglaterra ha sido eliminada en penales 7 veces en Mundiales y Eurocopas — más que cualquier otro país.",
  },
  {
    slug: "marruecos",
    pais: "Marruecos",
    bandera: "🇲🇦",
    confederation: "CAF",
    dt: "Walid Regragui",
    dtNacionalidad: "Marroquí-Francés",
    color: "bg-red-900",
    colorHex: "#7f1d1d",
    rankingFIFA: 14,
    mundiales: 0,
    apariciones: 7,
    mejorResultado: "Semifinal (2022)",
    titulos: [],
    jugadores: [
      { nombre: "Yassine Bounou",     posicion: "Portero",         club: "Al-Hilal",          edad: 33, dorsal: 1  },
      { nombre: "Achraf Hakimi",      posicion: "Lateral Der.",    club: "PSG",               edad: 27, dorsal: 2  },
      { nombre: "Nayef Aguerd",       posicion: "Defensa Central", club: "West Ham",          edad: 28, dorsal: 5  },
      { nombre: "Romain Saïss",       posicion: "Defensa Central", club: "Besiktas",          edad: 34, dorsal: 13 },
      { nombre: "Sofyan Amrabat",     posicion: "Pivote",          club: "Fiorentina",        edad: 28, dorsal: 4  },
      { nombre: "Azzedine Ounahi",    posicion: "Mediocampista",   club: "Marseille",         edad: 24, dorsal: 8  },
      { nombre: "Hakim Ziyech",       posicion: "Extremo",         club: "Galatasaray",       edad: 33, dorsal: 7  },
      { nombre: "Youssef En-Nesyri",  posicion: "Delantero",       club: "Fenerbahçe",        edad: 27, dorsal: 9  },
      { nombre: "Soufiane Rahimi",    posicion: "Extremo",         club: "Al-Ain",            edad: 27, dorsal: 11 },
    ],
    historia: "Los Leones del Atlas escribieron historia en Qatar 2022 al convertirse en la primera selección africana en llegar a las semifinales de un Mundial. Eliminaron a España y Portugal en el camino. Su mezcla de jugadores formados en Europa con profundo sentido de identidad marroquí los hace un equipo fascinante.",
    curiosidad: "En Qatar 2022 fueron la primera selección africana en llegar a semis — y lo hicieron sin recibir un solo gol en tiempo regular.",
  },
  {
    slug: "japon",
    pais: "Japón",
    bandera: "🇯🇵",
    confederation: "AFC",
    dt: "Hajime Moriyasu",
    dtNacionalidad: "Japonés",
    color: "bg-blue-700",
    colorHex: "#1d4ed8",
    rankingFIFA: 17,
    mundiales: 0,
    apariciones: 8,
    mejorResultado: "Ronda de 16 (2002, 2010, 2018, 2022)",
    titulos: [],
    jugadores: [
      { nombre: "Shuichi Gonda",    posicion: "Portero",         club: "Shimizu S-Pulse",   edad: 35, dorsal: 12 },
      { nombre: "Hiroki Sakai",     posicion: "Lateral Der.",    club: "Urawa Reds",         edad: 34, dorsal: 5  },
      { nombre: "Ko Itakura",       posicion: "Defensa Central", club: "Borussia Mönchengladbach", edad: 27, dorsal: 3 },
      { nombre: "Wataru Endo",      posicion: "Pivote",          club: "Liverpool",          edad: 31, dorsal: 17 },
      { nombre: "Daichi Kamada",    posicion: "Mediocampista",   club: "Crystal Palace",    edad: 28, dorsal: 14 },
      { nombre: "Kaoru Mitoma",     posicion: "Extremo Izq.",    club: "Brighton",           edad: 27, dorsal: 10 },
      { nombre: "Ritsu Doan",       posicion: "Extremo Der.",    club: "SC Freiburg",        edad: 26, dorsal: 9  },
      { nombre: "Takumi Minamino",  posicion: "Mediocampista",   club: "Monaco",             edad: 29, dorsal: 10 },
      { nombre: "Ayase Ueda",       posicion: "Delantero",       club: "Feyenoord",          edad: 26, dorsal: 16 },
    ],
    historia: "La Samurai Blue se ha convertido en la potencia asiática del fútbol. Eliminaron a Alemania y España en Qatar 2022, quedando subcampeones del grupo de la muerte. Sus jugadores están cada vez más presentes en las grandes ligas europeas, y Japón sigue levantando el nivel competitivo de la AFC.",
    curiosidad: "En Qatar 2022 remontaron 0-1 a Alemania y 0-1 a España en el mismo grupo — impresionante.",
  },
];

export const FORMATO = {
  equipos: 48,
  grupos: 12,
  equiposPorGrupo: 4,
  clasificanPorGrupo: 2,
  mejoresTerceros: 8,
  totalFaseGrupos: 64,
  rondas: ["Fase de Grupos", "Ronda de 32", "Octavos", "Cuartos de final", "Semifinal", "Final"],
};
