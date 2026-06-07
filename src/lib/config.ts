// ─── Configuración central de Tablitas Quinielas ───────────────
// Actualiza estos valores cuando cambien los datos del negocio

/** Número WhatsApp del administrador (formato internacional sin +) */
export const ADMIN_WHATSAPP = "527551018496"; // WhatsApp personal Tablitas Quinielas

/** Datos bancarios para recibir pagos */
export const CLABE        = "012180015525085351";
export const BANCO        = "BBVA";
export const TITULAR      = "Juan Carlos Arias Ariza";
export const TARJETA_OXXO = "4152 3114 5198 2124"; // Tarjeta BBVA para depósito en OXXO

/** Comisiones */
export const PORCENTAJE_DUENOS  = 0.15; // 15% del total para los dueños
export const COMISION_PCT       = 0.10; // 10% del monto por venta (vendedor/tienda/directa)
/** @deprecated usar COMISION_PCT */
export const COMISION_TIENDA    = 2;    // legacy — no usar en código nuevo
export const PRECIO_BOLETO      = 20;   // $20 MXN por boleto
