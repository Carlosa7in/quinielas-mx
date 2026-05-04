/**
 * Calcula la fecha y hora de cierre de registro de quinielas.
 * Regla: el día ANTERIOR al primer partido a las 23:00 hora de Ciudad de México.
 *
 * Ejemplo: primer partido el sábado 9 de mayo a las 7pm
 *          → cierre: viernes 8 de mayo a las 11:00pm CDMX
 */
export function calcularFechaCierre(primerPartido: Date): Date {
  const TZ = "America/Mexico_City";

  // Extraer la fecha local en CDMX (día, mes, año del partido)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(primerPartido).map((p) => [p.type, p.value])
  );
  const year  = parseInt(parts.year);
  const month = parseInt(parts.month); // 1-based
  const day   = parseInt(parts.day);

  // Offset aproximado de CDMX:
  // CDT (UTC-5): segundo domingo de marzo al primer domingo de noviembre
  // CST (UTC-6): noviembre a marzo
  const month0  = month - 1; // 0-based
  const isDST   = month0 >= 2 && month0 <= 9; // marzo (2) a octubre (9)
  const offsetMs = (isDST ? -5 : -6) * 60 * 60 * 1000;

  // "Día anterior a las 23:00" como timestamp UTC base
  // Date.UTC con day-1 funciona correctamente aunque day === 1 (retorna último día del mes anterior)
  const base = new Date(Date.UTC(year, month - 1, day - 1, 23, 0, 0, 0));

  // Convertir de hora local a UTC: utc = local - offset
  // local 23:00 en UTC-5 → UTC 04:00 del mismo día (siguiente al base)
  return new Date(base.getTime() - offsetMs);
}
