// Piezas comunes de la sesión (sin dependencias): las usan js/sesion.js y sus
// dos motores, js/sesion-supabase.js (web publicada) y js/demo/sesion-demo.js
// (solo capturas en el espacio de trabajo).

export const EVENTO = 'cambio-de-sesion';
export const MIN_CONTRASENA = 8;

/** Claves de localStorage. */
export const CLAVES = {
  perfil: 'vcorrea:perfil',             // Supabase: copia del perfil para pintar sin esperar
  alumnas: 'vcorrea:alumnas',           // demo
  sesion: 'vcorrea:sesion',             // demo
  inscripciones: 'vcorrea:inscripciones', // demo
  semilla: 'vcorrea:demo'               // demo
};

/**
 * Perfil de una usuaria (sin contraseña).
 * @typedef {Object} Usuario
 * @property {string} id
 * @property {string} nombre
 * @property {string} apellido
 * @property {string} cedula          'V-12345678' o 'E-12345678'
 * @property {string} telefono        Internacional: '+584141234567'
 * @property {string} correo          En minúsculas.
 * @property {string|null} instagram  Sin @.
 * @property {string|null} fechaNacimiento  'AAAA-MM-DD'
 * @property {'alumna'|'admin'|'superadmin'} rol
 * @property {string} creada          Fecha ISO.
 */

/**
 * @typedef {'cedula-existe'|'correo-existe'|'credenciales'|'datos-invalidos'|'almacenamiento'
 *   |'confirmar-correo'|'correo-sin-confirmar'|'enlace-vencido'|'sin-sesion'|'contrasena-actual'|'conexion'|'demasiados-intentos'|'servidor'} CodigoError
 * @typedef {{ codigo: CodigoError, mensaje: string }} ErrorSesion
 */

/* ---------------- localStorage protegido (modo privado, bloqueos…) ---------------- */

export function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? porDefecto : JSON.parse(v);
  } catch {
    return porDefecto;
  }
}

export function escribir(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------- utilidades ---------------------------------- */

export const normalizarCorreo = (c) => String(c || '').trim().toLowerCase();
export const normalizarCedula = (c) => String(c || '').toUpperCase().replace(/[^VE0-9]/g, '').replace(/^([VE])0*/, '$1-');

/** Avisa a la página (y a sus componentes) que la sesión cambió. */
export function avisarCambio(usuario) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { usuario } }));
}

/** Errores con la misma forma en los dos motores. */
export const error = (codigo, mensaje) => ({ codigo, mensaje });
export const ERRORES = {
  faltanDatos: () => error('datos-invalidos', 'Faltan datos para crear la cuenta.'),
  cedula: () => error('cedula-existe', 'Ya existe una cuenta con esta cédula.'),
  correo: () => error('correo-existe', 'Ya existe una cuenta con este correo.'),
  credenciales: () => error('credenciales', 'El correo o la contraseña no coinciden.'),
  almacenamiento: () => error('almacenamiento', 'Tu navegador no permite guardar datos. Prueba fuera del modo privado.'),
  conexion: () => error('conexion', 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.'),
  servidor: () => error('servidor', 'Algo salió mal de nuestro lado. Intenta de nuevo en un momento.')
};
