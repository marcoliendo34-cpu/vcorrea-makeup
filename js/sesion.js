// =============================================================================
// SESIÓN DE ALUMNAS — SIMULADA, SOLO PARA LA VISTA PREVIA
// =============================================================================
// Todo se guarda en localStorage de ESTE navegador. No hay servidor, ni
// cifrado, ni seguridad real: sirve únicamente para que Verónica apruebe la
// interfaz. NO usar con datos reales.
//
// - Las contraseñas NO se guardan. En la demo, cualquier contraseña de 8 o más
//   caracteres es válida para un correo que esté registrado.
// - En la fase 2 este archivo se reemplaza por Supabase Auth con las MISMAS
//   funciones y la misma forma de respuesta ({ usuario, error }), así las
//   páginas no cambian:
//     registrar(datos)            → supabase.auth.signUp + tabla de perfiles
//     ingresar(correo, contrasena) → supabase.auth.signInWithPassword
//     salir()                     → supabase.auth.signOut
//     usuarioActual()             → supabase.auth.getUser + perfil
//     evento "cambio-de-sesion"   → supabase.auth.onAuthStateChange
// =============================================================================

export const CLAVES = {
  alumnas: 'vcorrea:alumnas',
  sesion: 'vcorrea:sesion',
  inscripciones: 'vcorrea:inscripciones',
  semilla: 'vcorrea:demo-v1'
};

export const EVENTO = 'cambio-de-sesion';
export const MIN_CONTRASENA = 8;

/**
 * Perfil de una alumna (sin contraseña).
 * @typedef {Object} Usuario
 * @property {string} id
 * @property {string} nombre
 * @property {string} apellido
 * @property {string} cedula          'V-12345678' o 'E-12345678'
 * @property {string} telefono        Internacional: '+584141234567'
 * @property {string} correo          En minúsculas.
 * @property {string|null} instagram  Sin @.
 * @property {string|null} fechaNacimiento  'AAAA-MM-DD'
 * @property {string} creada          Fecha ISO.
 */

/**
 * @typedef {'cedula-existe'|'correo-existe'|'credenciales'|'datos-invalidos'|'almacenamiento'} CodigoError
 * @typedef {{ codigo: CodigoError, mensaje: string }} ErrorSesion
 */

/* ------------------------------------------------------------------ */
/* localStorage protegido (modo privado, almacenamiento bloqueado…)    */
/* ------------------------------------------------------------------ */

function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? porDefecto : JSON.parse(v);
  } catch {
    return porDefecto;
  }
}

function escribir(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Cuenta demo precargada                                              */
/* ------------------------------------------------------------------ */

export const DEMO = { correo: 'alumna@demo.com', contrasena: 'demo1234' };

const ALUMNA_DEMO = {
  id: 'alumna-demo',
  nombre: 'María',
  apellido: 'Pérez',
  cedula: 'V-12345678',
  telefono: '+584121234567',
  correo: DEMO.correo,
  instagram: null,
  fechaNacimiento: null,
  creada: '2026-09-01T12:00:00.000Z'
};

const INSCRIPCIONES_DEMO = [
  { id: 'insc-demo-1', alumnaId: 'alumna-demo', cursoSlug: 'automaquillaje-esencial', estado: 'confirmada', creada: '2026-09-20T15:00:00.000Z' },
  { id: 'insc-demo-2', alumnaId: 'alumna-demo', cursoSlug: 'maquillaje-social-profesional', estado: 'pendiente', creada: '2026-10-02T18:30:00.000Z' }
];

/** Carga la cuenta demo una sola vez (si se borra a mano, vuelve a aparecer). */
function sembrarDemo() {
  const alumnas = leer(CLAVES.alumnas, []);
  if (!alumnas.some((a) => a.id === ALUMNA_DEMO.id)) {
    escribir(CLAVES.alumnas, [ALUMNA_DEMO, ...alumnas]);
  }
  if (!leer(CLAVES.semilla, false)) {
    const inscripciones = leer(CLAVES.inscripciones, []).filter((i) => i.alumnaId !== ALUMNA_DEMO.id);
    escribir(CLAVES.inscripciones, [...INSCRIPCIONES_DEMO, ...inscripciones]);
    escribir(CLAVES.semilla, true);
  }
}
sembrarDemo();

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const normalizarCorreo = (c) => String(c || '').trim().toLowerCase();
const normalizarCedula = (c) => String(c || '').toUpperCase().replace(/[^VE0-9]/g, '').replace(/^([VE])0*/, '$1-');
const alumnas = () => leer(CLAVES.alumnas, []);

function avisarCambio(usuario) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { usuario } }));
}

// Si la sesión cambia en otra pestaña, esta pestaña también se entera.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CLAVES.sesion) avisarCambio(usuarioEnCache());
  });
}

/* ------------------------------------------------------------------ */
/* API (misma forma que tendrá Supabase)                               */
/* ------------------------------------------------------------------ */

/**
 * Usuario con sesión, leído al instante del almacenamiento (Supabase también
 * guarda la sesión en el navegador). Sirve para pintar el header sin parpadeo.
 * @returns {Usuario|null}
 */
export function usuarioEnCache() {
  const s = leer(CLAVES.sesion, null);
  if (!s?.usuarioId) return null;
  return alumnas().find((a) => a.id === s.usuarioId) || null;
}

/** @returns {Promise<Usuario|null>} */
export async function usuarioActual() {
  return usuarioEnCache();
}

/** ¿Ya hay una cuenta con esta cédula? (para validar en vivo) */
export async function existeCedula(cedula) {
  const buscada = normalizarCedula(cedula);
  return alumnas().some((a) => normalizarCedula(a.cedula) === buscada);
}

/** ¿Ya hay una cuenta con este correo? (para validar en vivo) */
export async function existeCorreo(correo) {
  const buscado = normalizarCorreo(correo);
  return alumnas().some((a) => a.correo === buscado);
}

/**
 * Crea la cuenta e inicia sesión.
 * @param {{nombre:string, apellido:string, cedula:string, telefono:string, correo:string,
 *          contrasena:string, instagram?:string, fechaNacimiento?:string}} datos
 * @returns {Promise<{usuario: Usuario|null, error: ErrorSesion|null}>}
 */
export async function registrar(datos) {
  if (!datos?.nombre || !datos?.apellido || !datos?.cedula || !datos?.telefono || !datos?.correo
      || String(datos.contrasena || '').length < MIN_CONTRASENA) {
    return { usuario: null, error: { codigo: 'datos-invalidos', mensaje: 'Faltan datos para crear la cuenta.' } };
  }
  if (await existeCedula(datos.cedula)) {
    return { usuario: null, error: { codigo: 'cedula-existe', mensaje: 'Ya existe una cuenta con esta cédula.' } };
  }
  if (await existeCorreo(datos.correo)) {
    return { usuario: null, error: { codigo: 'correo-existe', mensaje: 'Ya existe una cuenta con este correo.' } };
  }
  /** @type {Usuario} */
  const usuario = {
    id: `alumna-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    cedula: normalizarCedula(datos.cedula),
    telefono: datos.telefono,
    correo: normalizarCorreo(datos.correo),
    instagram: datos.instagram ? datos.instagram.replace(/^@/, '').trim() : null,
    fechaNacimiento: datos.fechaNacimiento || null,
    creada: new Date().toISOString()
    // La contraseña NO se guarda (vista previa).
  };
  const ok = escribir(CLAVES.alumnas, [...alumnas(), usuario])
    && escribir(CLAVES.sesion, { usuarioId: usuario.id, desde: new Date().toISOString() });
  if (!ok) {
    return { usuario: null, error: { codigo: 'almacenamiento', mensaje: 'Tu navegador no permite guardar datos. Prueba fuera del modo privado.' } };
  }
  avisarCambio(usuario);
  return { usuario, error: null };
}

/**
 * Inicia sesión. DEMO: cualquier contraseña de 8 o más caracteres vale para un
 * correo registrado. El error es el mismo en ambos casos, como en Supabase.
 * @returns {Promise<{usuario: Usuario|null, error: ErrorSesion|null}>}
 */
export async function ingresar(correo, contrasena) {
  const usuario = alumnas().find((a) => a.correo === normalizarCorreo(correo));
  if (!usuario || String(contrasena || '').length < MIN_CONTRASENA) {
    return { usuario: null, error: { codigo: 'credenciales', mensaje: 'El correo o la contraseña no coinciden.' } };
  }
  if (!escribir(CLAVES.sesion, { usuarioId: usuario.id, desde: new Date().toISOString() })) {
    return { usuario: null, error: { codigo: 'almacenamiento', mensaje: 'Tu navegador no permite guardar datos. Prueba fuera del modo privado.' } };
  }
  avisarCambio(usuario);
  return { usuario, error: null };
}

/** Cierra la sesión. @returns {Promise<{error: null}>} */
export async function salir() {
  escribir(CLAVES.sesion, null);
  avisarCambio(null);
  return { error: null };
}

/* ------------------------------------------------------------------ */
/* Formato para mostrar                                                */
/* ------------------------------------------------------------------ */

/** Inicial para el círculo de "Mi cuenta". */
export const inicialDe = (usuario) => (usuario?.nombre || '').trim().charAt(0).toUpperCase();

/** '+584141234567' → '0414-123-4567' */
export function telefonoVisible(internacional) {
  const d = String(internacional || '').replace(/\D/g, '').replace(/^58/, '');
  const m = /^(4\d{2}|2\d{2})(\d{3})(\d{4})$/.exec(d);
  return m ? `0${m[1]}-${m[2]}-${m[3]}` : String(internacional || '');
}

/* ------------------------------------------------------------------ */
/* Acceso de bajo nivel para datos.js (inscripciones de la demo)        */
/* ------------------------------------------------------------------ */

export const almacen = { leer, escribir };
