import Link from "next/link";

const secciones = [
  {
    titulo: "Participantes",
    icono: "👤",
    items: [
      "Solo pueden participar personas mayores de 18 años.",
      "Al registrarte en la quiniela aceptas todas las reglas del presente reglamento.",
    ],
  },
  {
    titulo: "Ganadores",
    icono: "🏆",
    items: [
      "El ganador o ganadores serán quienes obtengan el mayor número de aciertos al finalizar todos los partidos.",
      "Premio de 1.° lugar: el premio siempre se reparte en partes iguales entre todos los que empaten en primer lugar, sin importar cuántos sean.",
      "Premio de 2.° lugar: máximo 20 ganadores para repartir el premio. Si hay más de 20, la bolsa se acumula para la siguiente semana. A la tercera semana acumulada, el premio se repartirá sin importar el número de ganadores.",
      "Bolsa mínima: cuando la bolsa neta de la jornada sea menor a $1,000 MXN, únicamente se premia el 1.° lugar. En ese caso, cualquier monto acumulado del 2.° lugar se suma al premio del 1.° lugar.",
    ],
  },
  {
    titulo: "Partidos eliminatorios",
    icono: "⚔️",
    items: [
      "En partidos de fase eliminatoria únicamente cuenta el tiempo reglamentario (90 minutos más compensación).",
      "No se consideran tiempos extra ni penales.",
    ],
  },
  {
    titulo: "Lista de aclaraciones",
    icono: "📋",
    items: [
      "Cada semana se avisará la hora en que se publicará la lista de aclaraciones.",
      "Durante ese lapso los participantes deberán revisar que sus quinielas estén capturadas correctamente o reportar cualquier error.",
      "Una vez publicada la lista final no se aceptan reclamos ni quejas.",
      "Si una quiniela no fue capturada, se reembolsará el dinero o se guardará para la siguiente semana.",
      "Si una quiniela no capturada hubiera resultado ganadora, no se entregará ningún premio — únicamente se realiza el reembolso o se guarda para la siguiente semana. Por ello es muy importante revisar la lista de aclaraciones.",
    ],
  },
  {
    titulo: "Partidos suspendidos",
    icono: "🚫",
    items: [
      "Si un partido se suspende durante el encuentro, se tomará como resultado el marcador existente al momento de la suspensión.",
      "No contarán los partidos suspendidos antes de iniciar, excepto cuando dicho partido se reprograme para el mismo día en que se juegue el último partido de la quiniela — en ese caso sí contará.",
    ],
  },
  {
    titulo: "Entrega de premios",
    icono: "💰",
    items: [
      "El premio se entrega al día siguiente de finalizar todos los partidos.",
      "Los ganadores cuentan con un plazo máximo de 7 días naturales para reclamar su premio.",
    ],
  },
];

const premios = [
  {
    lugar: "1.° Lugar",
    icono: "🥇",
    color: "bg-yellow-50 border-yellow-200",
    titleColor: "text-yellow-700",
    descripcion:
      "Quienes obtengan el mayor número de aciertos. El premio se reparte en partes iguales entre todos los que empaten en primer lugar, sin importar cuántos sean.",
  },
  {
    lugar: "2.° Lugar",
    icono: "🥈",
    color: "bg-gray-50 border-gray-200",
    titleColor: "text-gray-600",
    descripcion:
      "Quienes tengan la segunda mayor cantidad de aciertos. Máximo 20 ganadores; si hay más, la bolsa se acumula hasta la semana siguiente. A la tercera semana acumulada se reparte sin importar el número de ganadores. Solo aplica cuando la bolsa neta de la jornada supere los $1,000 MXN.",
  },
];

export default function ReglamentoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand text-white py-6 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-amber-400 text-sm mb-1 inline-block">← Inicio</Link>
            <h1 className="text-2xl font-bold">Reglamento</h1>
            <p className="text-amber-300/70 text-sm">Tablitas Quinielas · Reglas oficiales</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="/" style={{flexShrink:0}}><img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "52px", objectFit: "contain", flexShrink: 0 }} /></a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Aviso de mayoría de edad */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">⚠️</span>
          <p className="text-sm text-amber-800 font-medium">
            Al participar confirmas que eres mayor de 18 años y aceptas las reglas del presente reglamento.
          </p>
        </div>

        {/* Secciones */}
        {secciones.map((sec) => (
          <div key={sec.titulo} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-brand text-white">
              <span className="text-xl">{sec.icono}</span>
              <h2 className="font-bold text-sm">{sec.titulo}</h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {sec.items.map((item, i) => (
                <li key={i} className="flex gap-3 px-4 py-3 text-sm text-gray-700">
                  <span className="text-green-500 font-bold shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Premiación */}
        <div>
          <h2 className="font-bold text-gray-700 px-1 mb-3 text-lg">🎖️ Premiación</h2>
          <div className="space-y-3">
            {premios.map((p) => (
              <div key={p.lugar} className={`rounded-2xl border-2 p-4 ${p.color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{p.icono}</span>
                  <h3 className={`font-bold text-sm ${p.titleColor}`}>{p.lugar}</h3>
                </div>
                <p className="text-sm text-gray-600 ml-9">{p.descripcion}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 pb-6">
          <Link
            href="/quiniela"
            className="block w-full text-center bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            ⚽ Registrar mi quiniela
          </Link>
          <Link
            href="/consultar"
            className="block w-full text-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Consultar mis resultados
          </Link>
        </div>
      </div>
    </div>
  );
}
