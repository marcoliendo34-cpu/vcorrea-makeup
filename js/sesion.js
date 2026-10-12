// Sesión de alumnas y administradora. Las páginas SOLO usan este archivo.
//
// Motor según js/modo.js:
//   - Web publicada (siempre): Supabase Auth → js/sesion-supabase.js
//   - Espacio de trabajo (capturas): sesión simulada → js/demo/sesion-demo.js
// Los dos se cargan bajo demanda (import dinámico), así la web publicada nunca
// descarga la demo y las capturas nunca dependen de internet.
//
// Mismas funciones y misma forma de respuesta ({ usuario, error }) en los dos:
//   registrar(datos), ingresar(correo, contrasena), salir(), usuarioActual(),
//   usuarioEnCache(), existeCedula(), existeCorreo() y el evento "cambio-de-sesion".
//
// Roles: 'alumna' (por defecto), 'admin' (Verónica) y 'superadmin'. En Supabase
// el rol vive en la tabla perfiles y solo se cambia desde la base de datos; las
// reglas RLS deciden qué ve cada quien. Esta página nunca decide sola.

import { MODO_DEMO } from './modo.js';
import { CLAVES, EVENTO, MIN_CONTRASENA, leer, avisarCambio } from './sesion-base.js';

export { EVENTO, MIN_CONTRASENA };

let motor = null;
/** Carga el motor una sola vez. */
const cargar = () => (motor ??= MODO_DEMO ? import('./demo/sesion-demo.js') : import('./sesion-supabase.js'));

/* ------------------------------------------------------------------ */
/* Lectura inmediata (para pintar el header sin esperar)               */
/* ------------------------------------------------------------------ */

function demoEnCache() {
  const s = leer(CLAVES.sesion, null);
  if (!s?.usuarioId) return null;
  return leer(CLAVES.alumnas, []).find((a) => a.id === s.usuarioId) || null;
}

/**
 * Usuario con sesión, leído al instante del navegador. Sirve para pintar el
 * header y decidir redirecciones sin parpadeo; usuarioActual() lo confirma.
 * @returns {import('./sesion-base.js').Usuario|null}
 */
export function usuarioEnCache() {
  return MODO_DEMO ? demoEnCache() : leer(CLAVES.perfil, null);
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/** @returns {Promise<import('./sesion-base.js').Usuario|null>} */
export async function usuarioActual() { return (await cargar()).usuarioActual(); }

/** ¿Ya hay una cuenta con esta cédula? (para validar en vivo) */
export async function existeCedula(cedula) { return (await cargar()).existeCedula(cedula); }

/** ¿Ya hay una cuenta con este correo? (para validar en vivo) */
export async function existeCorreo(correo) { return (await cargar()).existeCorreo(correo); }

/**
 * Crea la cuenta e inicia sesión.
 * @param {{nombre:string, apellido:string, cedula:string, telefono:string, correo:string,
 *          contrasena:string, instagram?:string|null, fechaNacimiento?:string|null}} datos
 */
export async function registrar(datos) { return (await cargar()).registrar(datos); }

/** Inicia sesión. El error es el mismo si falla el correo o la contraseña. */
export async function ingresar(correo, contrasena) { return (await cargar()).ingresar(correo, contrasena); }

/** Cierra la sesión. */
export async function salir() { return (await cargar()).salir(); }

/** Solo capturas: vuelve a poner las inscripciones de ejemplo (en la web publicada no hace nada). */
export async function restablecerInscripcionesDemo() {
  if (MODO_DEMO) (await cargar()).restablecerInscripcionesDemo();
}

/** ¿Estamos en el modo de capturas? (para ocultar avisos de la demo en la web publicada) */
export const esModoDemo = () => MODO_DEMO;

/* ------------------------------------------------------------------ */
/* Al cargar la página                                                 */
/* ------------------------------------------------------------------ */

if (typeof window !== 'undefined') {
  if (MODO_DEMO) {
    cargar();   // siembra las cuentas y los datos de ejemplo
  } else if (usuarioEnCache()) {
    // Hay una copia del perfil: se confirma con Supabase (sesión vencida, rol
    // cambiado…). Si algo cambió, usuarioActual() avisa con el evento y las
    // páginas protegidas redirigen. Sin copia no se carga nada todavía.
    cargar().then((m) => m.usuarioActual()).catch(() => {});
  }
  // Si la sesión cambia en otra pestaña, esta pestaña también se entera.
  window.addEventListener('storage', (e) => {
    if (e.key === CLAVES.sesion || e.key === CLAVES.perfil) avisarCambio(usuarioEnCache());
  });
}

/* ------------------------------------------------------------------ */
/* Formato para mostrar                                                */
/* ------------------------------------------------------------------ */

/** ¿La cuenta es de administradora? (admin o superadmin) */
export const esAdmin = (usuario) => usuario?.rol === 'admin' || usuario?.rol === 'superadmin';

/** Solo el desarrollador: crea y edita cursos, galería y fotos. La base lo hace cumplir (RLS). */
export const esSuperadmin = (usuario) => usuario?.rol === 'superadmin';

/** Inicial para el círculo de "Mi cuenta". */
export const inicialDe = (usuario) => (usuario?.nombre || '').trim().charAt(0).toUpperCase();

/** '+584141234567' → '0414-123-4567' */
export function telefonoVisible(internacional) {
  const d = String(internacional || '').replace(/\D/g, '').replace(/^58/, '');
  const m = /^(4\d{2}|2\d{2})(\d{3})(\d{4})$/.exec(d);
  return m ? `0${m[1]}-${m[2]}-${m[3]}` : String(internacional || '');
}
