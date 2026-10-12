// =============================================================================
// SESIÓN SIMULADA — SOLO PARA CAPTURAS EN EL ESPACIO DE TRABAJO
// =============================================================================
// Se carga únicamente cuando js/modo.js dice MODO_DEMO (servidor local). En el
// dominio publicado nunca se usa: ahí la sesión es Supabase Auth
// (js/sesion-supabase.js).
//
// Todo se guarda en localStorage de ESTE navegador. No hay servidor ni
// seguridad real. Las contraseñas NO se guardan: cualquier contraseña de 8 o
// más caracteres vale para un correo registrado.
// Cuentas de prueba (contraseña demo1234): alumna@demo.com y admin@demo.com.
// =============================================================================

import {
  CLAVES, MIN_CONTRASENA, leer, escribir, avisarCambio, normalizarCorreo, normalizarCedula, ERRORES
} from '../sesion-base.js';

/** Versión de los datos de ejemplo. Subirla cuando cambien: se vuelven a cargar. */
const VERSION_SEMILLA = 3;

/* ------------------------------------------------------------------ */
/* Cuentas y datos de ejemplo                                          */
/* ------------------------------------------------------------------ */
// Todas las personas de aquí son FICTICIAS (nombres, cédulas, teléfonos y
// correos inventados para las capturas).

const ALUMNA_DEMO = {
  id: 'alumna-demo',
  nombre: 'María',
  apellido: 'Pérez',
  cedula: 'V-12345678',
  telefono: '+584121234567',
  correo: 'alumna@demo.com',
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
  correo: 'admin@demo.com',
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
// Todas pendientes (o cancelada): las pendientes no ocupan cupo.
const INSCRIPCIONES_DEMO = [
  insc(1, 'alumna-demo', 'vision-lash', 'pendiente', '2026-10-08T15:00:00.000Z'),
  insc(2, 'ejemplo-1', 'vision-lash', 'pendiente', '2026-10-09T14:10:00.000Z'),
  insc(3, 'ejemplo-2', 'vision-lash', 'pendiente', '2026-10-09T21:45:00.000Z'),
  insc(4, 'ejemplo-3', 'vision-lash', 'pendiente', '2026-10-10T16:20:00.000Z'),
  insc(5, 'ejemplo-4', 'vision-lash', 'cancelada', '2026-10-10T12:05:00.000Z')
];

/** Carga las cuentas fijas y, una vez por versión, sus inscripciones. */
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

const alumnas = () => leer(CLAVES.alumnas, []);

/* ------------------------------------------------------------------ */
/* API (misma forma que js/sesion-supabase.js)                         */
/* ------------------------------------------------------------------ */

/** Usuario con sesión, leído al instante (también lo usa js/sesion.js). */
export function usuarioEnCacheDemo() {
  const s = leer(CLAVES.sesion, null);
  if (!s?.usuarioId) return null;
  return alumnas().find((a) => a.id === s.usuarioId) || null;
}

export async function usuarioActual() {
  return usuarioEnCacheDemo();
}

export async function existeCedula(cedula) {
  const buscada = normalizarCedula(cedula);
  return alumnas().some((a) => normalizarCedula(a.cedula) === buscada);
}

export async function existeCorreo(correo) {
  const buscado = normalizarCorreo(correo);
  return alumnas().some((a) => a.correo === buscado);
}

export async function registrar(datos) {
  if (!datos?.nombre || !datos?.apellido || !datos?.cedula || !datos?.telefono || !datos?.correo
      || String(datos.contrasena || '').length < MIN_CONTRASENA) {
    return { usuario: null, error: ERRORES.faltanDatos() };
  }
  if (await existeCedula(datos.cedula)) return { usuario: null, error: ERRORES.cedula() };
  if (await existeCorreo(datos.correo)) return { usuario: null, error: ERRORES.correo() };
  const usuario = {
    id: `alumna-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    cedula: normalizarCedula(datos.cedula),
    telefono: datos.telefono,
    correo: normalizarCorreo(datos.correo),
    instagram: datos.instagram ? datos.instagram.replace(/^@/, '').trim() : null,
    fechaNacimiento: datos.fechaNacimiento || null,
    rol: 'alumna',
    creada: new Date().toISOString()
  };
  const ok = escribir(CLAVES.alumnas, [...alumnas(), usuario])
    && escribir(CLAVES.sesion, { usuarioId: usuario.id, desde: new Date().toISOString() });
  if (!ok) return { usuario: null, error: ERRORES.almacenamiento() };
  avisarCambio(usuario);
  return { usuario, error: null };
}

export async function ingresar(correo, contrasena) {
  const usuario = alumnas().find((a) => a.correo === normalizarCorreo(correo));
  if (!usuario || String(contrasena || '').length < MIN_CONTRASENA) {
    return { usuario: null, error: ERRORES.credenciales() };
  }
  if (!escribir(CLAVES.sesion, { usuarioId: usuario.id, desde: new Date().toISOString() })) {
    return { usuario: null, error: ERRORES.almacenamiento() };
  }
  avisarCambio(usuario);
  return { usuario, error: null };
}

export async function salir() {
  escribir(CLAVES.sesion, null);
  avisarCambio(null);
  return { error: null };
}

/* ------------------- Acceso de bajo nivel para js/demo/datos-demo.js ------------------- */

export const almacen = { leer, escribir };
/** Alumnas (sin administradoras) para el panel. */
export const leerAlumnas = () => alumnas().filter((a) => a.rol === 'alumna');
