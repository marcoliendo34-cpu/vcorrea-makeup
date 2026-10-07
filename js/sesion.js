// Sesión de alumna simulada con localStorage (fase 1).
// En la fase 2 se reemplaza por Supabase Auth con las mismas funciones.
// [El registro y el ingreso se completan en su paso.]

export const CLAVE_SESION = 'vcorrea:sesion';

/**
 * @typedef {Object} Alumna
 * @property {string} nombre
 * @property {string} apellido
 * @property {string} correo
 */

/** localStorage puede fallar (modo privado, almacenamiento bloqueado). */
function leer(clave) {
  try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch { return null; }
}
function escribir(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch { return false; }
}

/** @returns {{alumna: Alumna, desde: string} | null} */
export function obtenerSesion() {
  const s = leer(CLAVE_SESION);
  return s && s.alumna && s.alumna.nombre ? s : null;
}

export function haySesion() {
  return obtenerSesion() !== null;
}

/** Inicial para el círculo de "Mi cuenta". */
export function inicialAlumna(sesion = obtenerSesion()) {
  return sesion ? sesion.alumna.nombre.trim().charAt(0).toUpperCase() : '';
}

/** @param {Alumna} alumna */
export function guardarSesion(alumna) {
  return escribir(CLAVE_SESION, { alumna, desde: new Date().toISOString() });
}

export function cerrarSesion() {
  escribir(CLAVE_SESION, null);
}
