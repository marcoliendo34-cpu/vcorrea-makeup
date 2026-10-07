// Formato de fechas del sitio: "15 nov 2026". Toda fecha visible pasa por aquí.
// Las fechas se guardan como texto 'AAAA-MM-DD' y se leen como fecha local
// (sin zona horaria) para que nunca se corran un día.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Convierte 'AAAA-MM-DD' (o Date) en Date local a medianoche. */
export function leerFecha(valor) {
  if (valor instanceof Date) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
  if (!m) throw new Error(`[fechas] Fecha inválida: ${valor}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "15 nov 2026" */
export function formatearFecha(valor) {
  const f = leerFecha(valor);
  return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

/** Partes para la insignia de fecha de las tarjetas: { dia: '15', mes: 'nov', anio: '2026' } */
export function partesFecha(valor) {
  const f = leerFecha(valor);
  return { dia: String(f.getDate()).padStart(2, '0'), mes: MESES[f.getMonth()], anio: String(f.getFullYear()) };
}

/**
 * Formato corto para la insignia de fecha de las tarjetas:
 * { dia: '15', mesAnio: 'NOV 2026' } (el mes se guarda en mayúsculas para
 * que la insignia no dependa de CSS).
 */
export function fechaTarjeta(valor) {
  const f = leerFecha(valor);
  return {
    dia: String(f.getDate()).padStart(2, '0'),
    mesAnio: `${MESES[f.getMonth()].toUpperCase()} ${f.getFullYear()}`
  };
}

/** "sábado 15 de noviembre de 2026" (para textos largos y WhatsApp) */
export function fechaLarga(valor) {
  const f = leerFecha(valor);
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES_LARGOS[f.getMonth()]} de ${f.getFullYear()}`;
}

/** Rango: "15 – 16 nov 2026", "30 nov – 2 dic 2026" o fecha simple si son iguales. */
export function rangoFechas(inicio, fin) {
  if (!fin || inicio === fin) return formatearFecha(inicio);
  const a = leerFecha(inicio), b = leerFecha(fin);
  if (a.getFullYear() !== b.getFullYear()) return `${formatearFecha(a)} – ${formatearFecha(b)}`;
  if (a.getMonth() !== b.getMonth()) return `${a.getDate()} ${MESES[a.getMonth()]} – ${formatearFecha(b)}`;
  return `${a.getDate()} – ${formatearFecha(b)}`;
}

/** true si la fecha ya pasó (antes de hoy). */
export function yaPaso(valor, hoy = new Date()) {
  return leerFecha(valor) < leerFecha(hoy);
}
