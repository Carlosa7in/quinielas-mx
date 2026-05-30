/**
 * Calcula la fecha y hora de cierre de registro de quinielas.
 * Regla: el día ANTERIOR al primer partido a las 23:00 hora de Ciudad de México.
 *
 * Ejemplo: primer partido el sábado 9 de mayo a las 7pm CDMX
 *          → cierre: viernes 8 de mayo a las 11:00pm CDMX = sábado 9 a las 05:00 UTC
 *
 * México abolió el horario de verano en 2023 → CDMX es UTC-6 permanente.
 * Usamos la IANA timezone database via Intl para ser inmunes a cambios futuros.
 */
export function calcularFechaCierre(primerPartido: Date): Date {
  const TZ = "America/Mexico_City";

  // 1. Extraer año/mes/día del partido en hora CDMX
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
    }).formatToParts(primerPartido).map((p) => [p.type, p.value])
  );
  const year  = parseInt(partes.year);
  const month = parseInt(partes.month); // 1-based
  const day   = parseInt(partes.day);

  // 2. Construir "día anterior a las 23:00 CDMX" como timestamp UTC.
  //    Estrategia: tomar medianoche UTC del día anterior y calcular el offset
  //    real de CDMX en esa fecha via Intl (cubre cualquier cambio de regla futuro).
  const medianoche = new Date(Date.UTC(year, month - 1, day - 1, 0, 0, 0));

  const localPartes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(medianoche).map((p) => [p.type, p.value])
  );

  // offset en horas: local = UTC + offset  →  offset = local - UTC
  // medianoche UTC (0h) aparece como localH en CDMX; offset = localH - 0 = localH
  // Para CDMX UTC-6: medianoche UTC = 18:00 del día anterior → localH = 18, offset = 18-24 = -6
  const localH = parseInt(localPartes.hour ?? "0");
  const offsetH = localH >= 12 ? localH - 24 : localH; // ajuste si cruza medianoche

  // 3. 23:00 CDMX = 23:00 UTC - offsetH = 23 + |offsetH| cuando offset es negativo
  //    Para UTC-6: 23:00 CDMX = 23 - (-6) = 29:00 UTC = 05:00 UTC del día del partido
  return new Date(Date.UTC(year, month - 1, day - 1, 23 - offsetH, 0, 0));
}
