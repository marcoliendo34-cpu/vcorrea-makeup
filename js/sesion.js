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
// - Roles: 'alumna' (por defecto) y 'admin' (Verónica). En la demo el rol vive
//   en el navegador y cualquiera podría cambiarlo: el panel /admin es solo una
//   maqueta. En la fase 2 el rol va en la tabla de perfiles y Supabase lo hace
//   cumplir con políticas RLS (la página nunca decide sola quién es admin).
// =============================================================================

export const CLAVES = {
  alumnas: 'vcorrea:alumnas',
  sesion: 'vcorrea:sesion',
  inscripciones: 'vcorrea:inscripciones',
  semilla: 'vcorrea:demo'
};

/** Versión de los datos de ejemplo. Subirla cuando cambien: se vuelven a cargar. */
const VERSION_SEMILLA = 3;

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
 * @property {'alumna'|'admin'} rol
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
/* Cuentas y datos de ejemplo                                          */
/* ------------------------------------------------------------------ */
// Todas las personas de aquí son FICTICIAS (nombres, cédulas, teléfonos y
// correos inventados para la vista previa).

export const DEMO = { correo: 'alumna@demo.com', contrasena: 'demo1234' };
export const DEMO_ADMIN = { correo: 'admin@demo.com', contrasena: 'demo1234' };

const ALUMNA_DEMO = {
  id: 'alumna-demo',
  nombre: 'María',
  apellido: 'Pérez',
  cedula: 'V-12345678',
  telefono: '+584121234567',
  correo: DEMO.correo,
  instagram: null,
  fechaNacimiento: null,
  rol: 'alumna',
  creada: '2026-09-01T12:00:00.000Z'
};

// Cuenta de administradora. Sin cédula ni teléfono: no se inventan datos de Verónica.
const ADMIN_DEMO = {
  id: 'admin-demo',
  nombre: 'Verónica',
  apellido: 'Correa',
  cedula: null,
  telefono: null,
  correo: DEMO_ADMIN.correo,
  instagram: null,
  fechaNacimiento: null,
  rol: 'admin',
  creada: '2026-08-01T12:00:00.000Z'
};

/** 8 alumnas de ejemplo (ficticias) para el panel. */
const ALUMNAS_EJEMPLO = [
  ['ejemplo-1', 'Andrea', 'Salazar', 'V-27845120', '+584145550101', 'andrea.salazar@ejemplo.com', 'andrea.ejemplo', '2026-09-10'],
  ['ejemplo-2', 'Gabriela', 'Mendoza', 'V-25310478', '+584245550102', 'gabi.mendoza@ejemplo.com', null, '2026-09-14'],
  ['ejemplo-3', 'Daniela', 'Rivas', 'V-28977341', '+584125550103', 'daniela.rivas@ejemplo.com', 'dani.ejemplo', '2026-10-03'],
  ['ejemplo-4', 'Valeria', 'Ortiz', 'V-26554890', '+584165550104', 'valeria.ortiz@ejemplo.com', null, '2026-10-05'],
  ['ejemplo-5', 'Carolina', 'Díaz', 'E-84512376', '+584265550105', 'carolina.diaz@ejemplo.com', 'caro.ejemplo', '2026-09-21'],
  ['ejemplo-6', 'Isabel', 'Romero', 'V-23198654', '+584145550106', 'isabel.romero@ejemplo.com', null, '2026-10-06'],
  ['ejemplo-7', 'Mariana', 'Castillo', 'V-29433017', '+584225550107', 'mariana.castillo@ejemplo.com', 'mariana.ejemplo', '2026-09-04'],
  ['ejemplo-8', 'Paola', 'Herrera', 'V-24876209', '+584245550108', 'paola.herrera@ejemplo.com', 'paola.ejemplo', '2026-10-07']
].map(([id, nombre, apellido, cedula, telefono, correo, instagram, dia]) => ({
  id, nombre, apellido, cedula, telefono, correo, instagram,
  fechaNacimiento: null, rol: 'alumna', creada: `${dia}T13:00:00.000Z`
}));

const CUENTAS_FIJAS = [ALUMNA_DEMO, ADMIN_DEMO, ...ALUMNAS_EJEMPLO];
const IDS_FIJOS = new Set(CUENTAS_FIJAS.map((a) => a.id));

const insc = (n, alumnaId, cursoSlug, estado, creada) => ({ id: `insc-demo-${n}`, alumnaId, cursoSlug, estado, creada });
// Todas pendientes (o cancelada): las pendientes no ocupan cupo, así la barra de
// Visión Lash (curso real) no muestra inscritas inventadas. Confirmar alguna en el
// panel demo solo cambia la barra en ese navegador.
const INSCRIPCIONES_DEMO = [
  insc(1, 'alumna-demo', 'vision-lash', 'pendiente', '2026-10-08T15:00:00.000Z'),
  insc(2, 'ejemplo-1', 'vision-lash', 'pendiente', '2026-10-09T14:10:00.000Z'),
  insc(3, 'ejemplo-2', 'vision-lash', 'pendiente', '2026-10-09T21:45:00.000Z'),
  insc(4, 'ejemplo-3', 'vision-lash', 'pendiente', '2026-10-10T16:20:00.000Z'),
  insc(5, 'ejemplo-4', 'vision-lash', 'cancelada', '2026-10-10T12:05:00.000Z')
];

/**
 * Carga las cuentas fijas (demo, admin y ejemplos) y sus inscripciones.
 * Las cuentas fijas vuelven si se borran; las inscripciones de ejemplo se
 * cargan una vez por versión. Lo que crean las visitantes no se toca.
 */
function sembrarDemo() {
  const actuales = leer(CLAVES.alumnas, []);
  const faltan = CUENTAS_FIJAS.some((f) => !actuales.some((a) => a.id === f.id && a.rol === f.rol));
  if (faltan) {
    escribir(CLAVES.alumnas, [...CUENTAS_FIJAS, ...actuales.filter((a) => !IDS_FIJOS.has(a.id))]);
  }
  if (leer(CLAVES.semilla, 0) !== VERSION_SEMILLA) restablecerInscripcionesDemo();
}

/** Vuelve a poner las inscripciones de ejemplo como al principio (botón del panel). */
export function restablecerInscripcionesDemo() {
  const propias = leer(CLAVES.inscripciones, []).filter((i) => !IDS_FIJOS.has(i.alumnaId));
  escribir(CLAVES.inscripciones, [...INSCRIPCIONES_DEMO, ...propias]);
  escribir(CLAVES.semilla, VERSION_SEMILLA);
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
    rol: 'alumna',   // las cuentas nuevas siempre son de alumna
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

/** ¿La cuenta es de administradora? */
export const esAdmin = (usuario) => usuario?.rol === 'admin';

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
