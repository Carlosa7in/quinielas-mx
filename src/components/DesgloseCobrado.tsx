// Desglose compacto debajo de las stats de cobrado
// bolsa = 75%, casa = 15%, ventas (comisiones vendedores) = 10%
const BOLSA_PCT  = 0.75;
const CASA_PCT   = 0.15;
const VENTAS_PCT = 0.10;

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DesgloseCobrado({ cobrado }: { cobrado: number }) {
  if (cobrado <= 0) return null;

  const bolsa  = Math.round(cobrado * BOLSA_PCT);
  const casa   = Math.round(cobrado * CASA_PCT);
  const ventas = Math.round(cobrado * VENTAS_PCT);

  return (
    <div className="mt-1.5 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
      <span className="text-[10px] text-green-600 font-semibold">💰 bolsa ${fmt(bolsa)}</span>
      <span className="text-[10px] text-gray-300">·</span>
      <span className="text-[10px] text-blue-500 font-semibold">🏠 casa ${fmt(casa)}</span>
      <span className="text-[10px] text-gray-300">·</span>
      <span className="text-[10px] text-amber-600 font-semibold">🤝 ${fmt(ventas)} ventas</span>
    </div>
  );
}
