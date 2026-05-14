/**
 * Detecta números de teléfono obviamente falsos:
 * - Todos los dígitos iguales: 5555555555, 1111111111
 * - 7+ dígitos idénticos consecutivos: 1555555551
 * - Secuencias ascendentes/descendentes: 1234567890, 9876543210
 * - Prefijo repetido (2–4 dígitos): 1231231241, 1212121212, 1234123412
 */
export function telefonoFalso(tel: string): boolean {
  const d = tel.replace(/\D/g, "");
  if (d.length !== 10) return false;

  // Todos los dígitos iguales: 0000000000 … 9999999999
  if (/^(\d)\1{9}$/.test(d)) return true;

  // 7+ dígitos idénticos consecutivos: 1555555551
  if (/(\d)\1{6}/.test(d)) return true;

  // Secuencias ascendentes/descendentes: 1234567890, 9876543210, etc.
  const asc  = "01234567890123456789";
  const desc = "09876543210987654321";
  for (let i = 0; i <= asc.length - 10; i++) {
    if (d === asc.slice(i, i + 10) || d === desc.slice(i, i + 10)) return true;
  }

  // Prefijo de 2–4 dígitos que se repite al inicio: 1231231241, 1212…, 1234123412
  for (let len = 2; len <= 4; len++) {
    const pat = d.slice(0, len);
    if (d.startsWith(pat + pat)) return true;
  }

  return false;
}
