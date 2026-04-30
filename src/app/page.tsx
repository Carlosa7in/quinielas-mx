import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-800 to-green-900 text-white px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-tablitas.png" alt="Tablitas Quinielas" className="mx-auto mb-4" style={{ height: "120px", objectFit: "contain" }} />
          <p className="mt-2 text-green-200 text-lg">Liga MX · Temporada 2025</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/quiniela"
            className="block w-full bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold text-lg py-4 px-6 rounded-xl transition-colors shadow-lg"
          >
            Registrar mi Quiniela
          </Link>
          <Link
            href="/consultar"
            className="block w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold text-lg py-4 px-6 rounded-xl transition-colors"
          >
            Consultar Quiniela
          </Link>
          <Link
            href="/clasificacion"
            className="block w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
          >
            📊 Clasificación
          </Link>
        </div>

        <div className="bg-white/10 rounded-xl p-4 text-sm text-green-100 space-y-2">
          <div className="flex justify-between">
            <span>Costo por quiniela:</span>
            <span className="font-bold text-yellow-300">$20 MXN</span>
          </div>
          <div className="flex justify-between">
            <span>Aciertos para ganar:</span>
            <span className="font-bold text-yellow-300">9 de 9</span>
          </div>
          <div className="flex justify-between">
            <span>Modalidad:</span>
            <span className="font-bold text-yellow-300">En línea / Tienda</span>
          </div>
        </div>

        <p className="text-green-300 text-xs">
          También puedes registrarte directamente en tienda y te damos tu ticket impreso.
        </p>

        <Link
          href="/reglamento"
          className="block text-green-300 hover:text-white text-sm transition-colors underline underline-offset-2"
        >
          📜 Ver reglamento
        </Link>

        <Link href="/admin" className="block text-green-400 hover:text-green-200 text-xs transition-colors">
          Acceso Administrador
        </Link>
      </div>
    </main>
  );
}
