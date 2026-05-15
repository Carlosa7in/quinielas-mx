export type Locale = "es" | "en";

export const translations = {
  es: {
    home: {
      subtitle: "Registra tus Quinielas",
      bolsa: "💰 Bolsa acumulada",
      quinielasOne: "quiniela registrada",
      quinielasOther: "quinielas registradas",
      cerrado: "🔒 Registro cerrado",
      cierre: "📅 Cierre",
      faltan: "⚡ Faltan",
      registrar: "Registrar mi Quiniela →",
      sinJornadas: "No hay jornadas activas en este momento.",
      vuelve: "Vuelve pronto",
      resultadosRecientes: "RESULTADOS RECIENTES",
      resultadosCta: "Ver cuadrícula completa de picks y ganadores 📊",
      hola: (name: string) => `¡Hola ${name}!`,
      pagoPendiente: "Tienes un pago pendiente, ¡no te quedes sin participar!",
      pagosPendientes: (n: number) => `Tienes ${n} pagos pendientes, ¡no te quedes sin participar!`,
      verInstrucciones: "Ver instrucciones →",
      completaPago: "Completa tu pago para confirmar tu registro. Cuando lo hagamos, desaparecerá este aviso.",
      consultar: "Consultar Quiniela",
      clasificacion: "Clasificación",
      costoLabel: "Costo por quiniela:",
      costoValor: "$20 MXN",
      aciertosLabel: "Aciertos para ganar:",
      aciertosValor: "9 de 9",
      modalidadLabel: "Modalidad:",
      modalidadValor: "En línea / Tienda",
      tiendaNota: "También puedes registrarte directamente en tienda y te damos tu ticket impreso.",
      reglamento: "📜 Ver reglamento",
      admin: "Acceso Administrador",
      bcp47: "es-MX",
    },
    flyer: {
      precio: "PRECIO: ",
      cierre: "CIERRE DE REGISTRO",
      verFecha: "VER FECHA EN APP",
      local: "LOCAL",
      visitante: "VISITANTE",
      bcp47: "es-MX",
    },
    wa: {
      promo: (liga: string, nombre: string, link: string) =>
        `🏆 ¡Ya están abiertas las quinielas!\n\n⚽ ${liga} · ${nombre}\n💰 Solo $20 por boleto — ¡gana premios en efectivo!\n\nRegistra la tuya aquí 👇\n${link}\n\n¡No te quedes sin la tuya! 🔥`,
      ganador: (
        nombre: string | null,
        aciertos: number,
        jornadaNombre: string,
        lugar: string,
        premio: string,
      ) =>
        [
          `🏆 ¡Felicidades ${nombre ?? "ganador/a"}!`,
          ``,
          `Obtuviste ${aciertos} aciertos en la jornada ${jornadaNombre} y ganaste el ${lugar} lugar.`,
          ``,
          `💰 Tu premio: ${premio}`,
          ``,
          `Tienes 7 días para reclamarlo. ¡Contáctanos para recibirlo!`,
          ``,
          `Tablitas Quinielas 🎯`,
        ].join("\n"),
    },
  },
  en: {
    home: {
      subtitle: "Register your Picks",
      bolsa: "💰 Prize pool",
      quinielasOne: "pick registered",
      quinielasOther: "picks registered",
      cerrado: "🔒 Registration closed",
      cierre: "📅 Closes",
      faltan: "⚡ Time left",
      registrar: "Register my Pick →",
      sinJornadas: "No active rounds at this time.",
      vuelve: "Check back soon",
      resultadosRecientes: "RECENT RESULTS",
      resultadosCta: "View full picks grid and winners 📊",
      hola: (name: string) => `Hi ${name}!`,
      pagoPendiente: "You have a pending payment — don't miss out!",
      pagosPendientes: (n: number) => `You have ${n} pending payments — don't miss out!`,
      verInstrucciones: "View instructions →",
      completaPago: "Complete your payment to confirm your entry. Once confirmed, this notice will disappear.",
      consultar: "Check My Pick",
      clasificacion: "Standings",
      costoLabel: "Cost per pick:",
      costoValor: "$20 MXN",
      aciertosLabel: "Correct picks to win:",
      aciertosValor: "9 of 9",
      modalidadLabel: "Mode:",
      modalidadValor: "Online / Store",
      tiendaNota: "You can also register in-store and get a printed ticket.",
      reglamento: "📜 View rules",
      admin: "Admin Access",
      bcp47: "en-US",
    },
    flyer: {
      precio: "PRICE: ",
      cierre: "REGISTRATION DEADLINE",
      verFecha: "SEE DATE IN APP",
      local: "HOME",
      visitante: "AWAY",
      bcp47: "en-US",
    },
    wa: {
      promo: (liga: string, nombre: string, link: string) =>
        `🏆 Picks are open!\n\n⚽ ${liga} · ${nombre}\n💰 Only $20 per ticket — win cash prizes!\n\nRegister yours here 👇\n${link}\n\nDon't miss out! 🔥`,
      ganador: (
        nombre: string | null,
        aciertos: number,
        jornadaNombre: string,
        lugar: string,
        premio: string,
      ) =>
        [
          `🏆 Congratulations ${nombre ?? "winner"}!`,
          ``,
          `You got ${aciertos} correct picks in round ${jornadaNombre} and won ${lugar} place.`,
          ``,
          `💰 Your prize: ${premio}`,
          ``,
          `You have 7 days to claim it. Contact us to receive it!`,
          ``,
          `Tablitas Quinielas 🎯`,
        ].join("\n"),
    },
  },
} as const;

export type HomeT = {
  subtitle: string;
  bolsa: string;
  quinielasOne: string;
  quinielasOther: string;
  cerrado: string;
  cierre: string;
  faltan: string;
  registrar: string;
  sinJornadas: string;
  vuelve: string;
  resultadosRecientes: string;
  resultadosCta: string;
  hola: (name: string) => string;
  pagoPendiente: string;
  pagosPendientes: (n: number) => string;
  verInstrucciones: string;
  completaPago: string;
  consultar: string;
  clasificacion: string;
  costoLabel: string;
  costoValor: string;
  aciertosLabel: string;
  aciertosValor: string;
  modalidadLabel: string;
  modalidadValor: string;
  tiendaNota: string;
  reglamento: string;
  admin: string;
  bcp47: string;
};

export type FlyerT = {
  precio: string;
  cierre: string;
  verFecha: string;
  local: string;
  visitante: string;
  bcp47: string;
};

export type WaT = {
  promo: (liga: string, nombre: string, link: string) => string;
  ganador: (nombre: string | null, aciertos: number, jornadaNombre: string, lugar: string, premio: string) => string;
};
