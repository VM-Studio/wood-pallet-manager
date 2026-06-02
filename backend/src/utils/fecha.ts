/**
 * Parsea una fecha string "YYYY-MM-DD" o Date como fecha LOCAL (sin conversión UTC).
 * Evita que "2026-03-10" se convierta a "2026-03-09T21:00:00-03:00" por el timezone de Argentina.
 */
export const parseFechaLocal = (s: string | Date): Date => {
  if (s instanceof Date) {
    return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  }
  // Tomar solo la parte de fecha (ignorar hora si viene en formato ISO)
  const fechaSolo = s.split('T')[0];
  const [y, m, d] = fechaSolo.split('-').map(Number);
  return new Date(y, m - 1, d);
};
