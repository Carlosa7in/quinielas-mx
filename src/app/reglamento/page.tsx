import Link from "next/link";

const secciones = [
  {
    titulo: "Registro y verificación",
    icono: "📋",
    items: [
      "Revisa tu quiniela en la pre-lista para verificar que esté bien escrita. En caso de no estarlo, da aviso al organizador para corregir.",
      "Una vez enviada la lista oficial ya no se puede corregir.",
      "Casilleros en blanco, no marcados o marcados con cualquier símbolo que no sea L, E o V serán tomados como E (Empate).",
    ],
  },
  {
    titulo: "Partidos pospuestos",
    icono: "⏸️",
    items: [
      "Los partidos pospuestos tienen un día de prórroga después del último partido de la misma quiniela.",
      "Pasando el día de prórroga, el partido queda anulado y la quiniela se jugará con los partidos restantes.",
      "Ejemplo: si el último partido termina en domingo, el lunes es el día de prórroga para que se juegue el partido pospuesto.",
      "No podrán anularse más de 3 partidos. Si se pospone un 4.° partido, se esperará hasta que se jueguen al menos 6 partidos, sin importar el tiempo de espera.",
    ],
  },
  {
    titulo: "Partidos suspendidos",
    icono: "🚫",
    items: [
      "Si un partido es suspendido después de empezar y no se reanuda antes del día de prórroga, se tomará como resultado el marcador en el minuto en que se suspendió.",
    ],
  },
  {
    titulo: "Partidos eliminatorios",
    icono: "🏆",
    items: [
      "En partidos de fase eliminatoria únicamente se toman en cuenta los primeros 90 minutos reglamentarios.",
      "No se consideran tiempos extra ni penales.",
    ],
  },
  {
    titulo: "Reglas generales",
    icono: "📌",
    items: [
      "En casos especiales, cualquier regla puede modificarse, siempre y cuando se haga mención con anticipación.",
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
      "Premio principal. Lo ganan quienes más aciertos tengan al terminar la jornada.",
  },
  {
    lugar: "2.° Lugar",
    icono: "🥈",
    color: "bg-gray-50 border-gray-200",
    titleColor: "text-gray-600",
    descripcion:
      "Lo ganan quienes tengan la segunda mayor cantidad de aciertos. Tope de 30 ganadores; si se superan, se acumula para la siguiente quiniela (máximo 2 veces, después se reparte sin tope).",
  },
  {
    lugar: "Quiniela Perfecta",
    icono: "🏅",
    color: "bg-green-50 border-green-200",
    titleColor: "text-green-700",
    descripcion:
      "Premio adicional para quien acierte todos los partidos de la jornada.",
  },
  {
    lugar: "Cero Aciertos",
    icono: "❌",
    color: "bg-red-50 border-red-200",
    titleColor: "text-red-600",
    descripcion:
      "Premio especial para participantes con cero aciertos. Tope de 25 ganadores; si se superan, se acumula para la siguiente quiniela.",
  },
];

export default function ReglamentoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-amber-950 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="text-amber-400 text-sm mb-2 inline-block">
            ← Inicio
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" style={{ height: "48px", objectFit: "contain", marginBottom: "6px" }} />
          <h1 className="text-2xl font-bold">Reglamento</h1>
          <p className="text-amber-300/70 text-sm">Tablitas Quinielas · Reglas oficiales</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Reglas */}
        {secciones.map((sec) => (
          <div key={sec.titulo} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-green-800 text-white">
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
            className="block w-full text-center bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors"
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
