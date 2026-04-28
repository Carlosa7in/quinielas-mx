/**
 * Genera un folio único para una quiniela.
 * Formato: QMX-JORNADA-YYYYMMDD-XXXXXX
 */
export function generarFolio(numeroJornada: number): string {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  const aleatorio = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `QMX-J${numeroJornada}-${anio}${mes}${dia}-${aleatorio}`;
}
