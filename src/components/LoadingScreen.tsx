/**
 * Pantalla de carga con logo animado.
 * Úsalo como fullscreen (default) o inline (variant="inline").
 */

type Props = {
  texto?: string;
  variant?: "fullscreen" | "inline";
};

export default function LoadingScreen({ texto = "Cargando...", variant = "fullscreen" }: Props) {
  if (variant === "inline") {
    return (
      <div className="text-center py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-tablitas.png"
          alt="Tablitas"
          className="mx-auto mb-3 animate-pulse"
          style={{ height: "70px", objectFit: "contain" }}
        />
        <p className="text-gray-400 text-sm">{texto}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-tablitas.png"
        alt="Tablitas"
        className="animate-pulse"
        style={{ height: "90px", objectFit: "contain" }}
      />
      <p className="text-gray-400 text-sm">{texto}</p>
    </div>
  );
}
