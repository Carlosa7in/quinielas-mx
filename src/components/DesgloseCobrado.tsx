// Desglose compacto debajo de las stats de cobrado
// bolsa ≈ 75%, casa ≈ 15%, comisiones ≈ 10%
const BOLSA_PCT  = 0.75;
const CASA_PCT   = 0.15;

function fmt(n: number) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function DesgloseCobrado({
  cobrado,
  ventas,
}: {
  cobrado: number;   // solo confirmadas
  ventas?: number;   // todas (confirmadas + pendientes)
}) {
  if (cobrado <= 0 && (!ventas || ventas <= 0)) return null;

  const bolsa  = Math.round(cobrado * BOLSA_PCT);
  const casa   = Math.round(cobrado * CASA_PCT);
  const pendientes = ventas != null ? ventas - cobrado : null;

  return (
    <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-0.5">
      <span className="text-[10px] text-green-600 font-semibold">
        💰 bolsa ${fmt(bolsa)}
      </span>
      <span className="text-[10px] text-gray-400">·</span>
      <span className="text-[10px] text-blue-500 font-semibold">
        🏠 casa ${fmt(casa)}
      </span>
      {pendientes != null && pendientes > 0 && (
        <>
          <span className="text-[10px] text-gray-400">·</span>
          <span className="text-[10px] text-yellow-600 font-semibold">
            ⏳ ${fmt(pendientes)} sin confirmar
          </span>
        </>
      )}
    </div>
  );
}
