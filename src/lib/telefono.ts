/**
 * Detecta números de teléfono obviamente falsos:
 * - Todos los dígitos iguales: 5555555555, 1111111111
 * - 7+ dígitos idénticos consecutivos: 1555555551
 * - Secuencias ascendentes/descendentes: 1234567890, 9876543210
 */
export function telefonoFalso(tel: string): boolean {
  const d = tel.replace(/\D/g, "");
  if (d.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(d)) return true;
  if (/(\d)\1{6}/.test(d)) return true;
  const asc  = "01234567890123456789";
  const desc = "09876543210987654321";
  for (let i = 0; i <= asc.length - 10; i++) {
    if (d === asc.slice(i, i + 10) || d === desc.slice(i, i + 10)) return true;
  }
  return false;
}
