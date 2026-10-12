// Sesión con Supabase Auth (web publicada). Misma forma que js/demo/sesion-demo.js:
// las páginas solo hablan con js/sesion.js.
//
// - registrar   → supabase.auth.signUp. El perfil lo crea la base con un trigger
//                 (al_registrarse) usando los datos enviados; siempre como 'alumna'.
// - ingresar    → supabase.auth.signInWithPassword
// - salir       → supabase.auth.signOut
// - usuarioActual → sesión de Supabase + fila de "perfiles"
// El perfil se copia en localStorage (CLAVES.perfil) solo para pintar el header
// al instante. Quién puede ver o cambiar qué lo deciden las reglas RLS de la base,
// nunca esta copia.

import { supabase } from './supabase.js';
import {
  CLAVES, MIN_CONTRASENA, leer, escribir, avisarCambio, normalizarCorreo, normalizarCedula, ERRORES, error
} from './sesion-base.js';

/** Fila de "perfiles" → Usuario (misma forma que la demo). */
const aUsuario = (p) => p && ({
  id: p.id,
  nombre: p.nombre,
  apellido: p.apellido,
  cedula: p.cedula,
  telefono: p.telefono,
  correo: p.correo,
  instagram: p.instagram,
  fechaNacimiento: p.fecha_nacimiento,
  rol: p.rol,
  creada: p.creado_en
});

const guardarPerfil = (usuario) => escribir(CLAVES.perfil, usuario || null);
const perfilGuardado = () => leer(CLAVES.perfil, null);

/** ¿El fallo es de red (sin internet, servidor caído)? */
const esDeRed = (e) => e instanceof TypeError || /fetch|network|failed to load/i.test(String(e?.message || ''))
  || e?.name === 'AuthRetryableFetchError';

/* ------------------------------ perfil ------------------------------- */

let perfilEnCurso = null;
let perfilDeId = null;

/** Lee el perfil una vez por carga de página (o al cambiar de usuaria). */
function cargarPerfil(id) {
  if (perfilEnCurso && perfilDeId === id) return perfilEnCurso;
  perfilDeId = id;
  perfilEnCurso = supabase.from('perfiles').select('*').eq('id', id).maybeSingle()
    .then(({ data, error: e }) => { if (e) throw e; return aUsuario(data); })
    .catch((e) => { perfilEnCurso = null; throw e; });
  return perfilEnCurso;
}

function olvidarPerfil() {
  perfilEnCurso = null;
  perfilDeId = null;
}

/** Guarda el perfil y avisa solo si cambió algo. */
function actualizarCopia(usuario) {
  const antes = JSON.stringify(perfilGuardado());
  guardarPerfil(usuario);
  if (antes !== JSON.stringify(usuario || null)) avisarCambio(usuario || null);
}

/* -------------------------------- API -------------------------------- */

/** @returns {Promise<import('./sesion-base.js').Usuario|null>} */
export async function usuarioActual() {
  const { data } = await supabase.auth.getSession();
  const sesion = data?.session;
  if (!sesion) {
    olvidarPerfil();
    actualizarCopia(null);
    return null;
  }
  try {
    const usuario = await cargarPerfil(sesion.user.id);
    actualizarCopia(usuario);
    return usuario;
  } catch (e) {
    // Sin conexión: se sigue con la copia si es de esta misma sesión.
    const copia = perfilGuardado();
    return copia?.id === sesion.user.id ? copia : null;
  }
}

/** ¿Ya hay una cuenta con esta cédula? (validación en vivo del registro) */
export async function existeCedula(cedula) {
  const { data, error: e } = await supabase.rpc('cedula_registrada', { p_cedula: normalizarCedula(cedula) });
  return !e && data === true;
}

/** ¿Ya hay una cuenta con este correo? */
export async function existeCorreo(correo) {
  const { data, error: e } = await supabase.rpc('correo_registrado', { p_correo: normalizarCorreo(correo) });
  return !e && data === true;
}

/** Error de Supabase Auth → error con los textos del sitio. */
function traducir(e) {
  const codigo = e?.code || '';
  const msj = String(e?.message || '');
  if (esDeRed(e)) return ERRORES.conexion();
  if (codigo === 'user_already_exists' || codigo === 'email_exists' || /already registered|already exists/i.test(msj)) return ERRORES.correo();
  if (codigo === 'invalid_credentials' || /invalid login credentials/i.test(msj)) return ERRORES.credenciales();
  if (codigo === 'email_not_confirmed' || /email not confirmed/i.test(msj)) {
    return error('correo-sin-confirmar', 'Aún no confirmas tu correo. Abre el enlace que te enviamos y vuelve a ingresar.');
  }
  if (codigo === 'weak_password' || /password/i.test(msj) && /weak|short|least/i.test(msj)) {
    return error('datos-invalidos', `La contraseña es muy débil. Usa al menos ${MIN_CONTRASENA} caracteres, con letras y números.`);
  }
  if (codigo === 'over_email_send_rate_limit' || codigo === 'over_request_rate_limit' || e?.status === 429) {
    return error('demasiados-intentos', 'Hubo demasiados intentos seguidos. Espera unos minutos y prueba de nuevo.');
  }
  if (codigo === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(msj)) {
    return error('datos-invalidos', 'Revisa tu correo: parece que tiene un error.');
  }
  return ERRORES.servidor();
}

/**
 * Crea la cuenta e inicia sesión.
 * @returns {Promise<{usuario: import('./sesion-base.js').Usuario|null, error: import('./sesion-base.js').ErrorSesion|null}>}
 */
export async function registrar(datos) {
  if (!datos?.nombre || !datos?.apellido || !datos?.cedula || !datos?.telefono || !datos?.correo
      || String(datos.contrasena || '').length < MIN_CONTRASENA) {
    return { usuario: null, error: ERRORES.faltanDatos() };
  }
  const cedula = normalizarCedula(datos.cedula);
  const correo = normalizarCorreo(datos.correo);
  try {
    // Mismos avisos amables que la vista previa, antes de crear nada.
    if (await existeCedula(cedula)) return { usuario: null, error: ERRORES.cedula() };
    if (await existeCorreo(correo)) return { usuario: null, error: ERRORES.correo() };

    const { data, error: e } = await supabase.auth.signUp({
      email: correo,
      password: datos.contrasena,
      options: {
        // El trigger al_registrarse crea el perfil con esto. El rol NO se manda:
        // la base lo pone siempre en 'alumna'.
        data: {
          nombre: datos.nombre.trim(),
          apellido: datos.apellido.trim(),
          cedula,
          telefono: datos.telefono,
          instagram: datos.instagram ? String(datos.instagram).replace(/^@/, '').trim() : null,
          fecha_nacimiento: datos.fechaNacimiento || null
        }
      }
    });
    if (e) {
      // Si la base rechazó el perfil, lo más probable es la cédula (otra cuenta se adelantó).
      if (/database error/i.test(String(e.message)) && await existeCedula(cedula)) return { usuario: null, error: ERRORES.cedula() };
      return { usuario: null, error: traducir(e) };
    }
    // Con la confirmación por correo activa, Supabase no abre sesión todavía.
    if (!data.session) {
      return {
        usuario: null,
        error: error('confirmar-correo', `Te enviamos un correo a ${correo}. Ábrelo para confirmar tu cuenta y luego ingresa.`)
      };
    }
    olvidarPerfil();
    const usuario = await cargarPerfil(data.user.id);
    actualizarCopia(usuario);
    return { usuario, error: null };
  } catch (e) {
    return { usuario: null, error: traducir(e) };
  }
}

/** Inicia sesión con correo y contraseña. */
export async function ingresar(correo, contrasena) {
  try {
    const { data, error: e } = await supabase.auth.signInWithPassword({
      email: normalizarCorreo(correo),
      password: String(contrasena || '')
    });
    if (e) return { usuario: null, error: traducir(e) };
    olvidarPerfil();
    const usuario = await cargarPerfil(data.user.id);
    if (!usuario) {
      await supabase.auth.signOut({ scope: 'local' });
      return { usuario: null, error: ERRORES.servidor() };
    }
    actualizarCopia(usuario);
    return { usuario, error: null };
  } catch (e) {
    return { usuario: null, error: traducir(e) };
  }
}

/** Cierra la sesión (aunque falle la red, se cierra en este navegador). */
export async function salir() {
  try {
    await supabase.auth.signOut();
  } catch {
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* ya sin sesión */ }
  }
  olvidarPerfil();
  actualizarCopia(null);
  return { error: null };
}

/** En la web publicada no hay datos de ejemplo que restablecer. */
export function restablecerInscripcionesDemo() {}

/* ----------------- Cambios de sesión (otra pestaña, token vencido) ----------------- */
// Supabase avisa por aquí. Dentro de este aviso no se llama a Supabase
// directamente (puede trabarse): se deja para el siguiente turno.
supabase.auth.onAuthStateChange((evento, sesion) => {
  if (evento === 'SIGNED_OUT' || !sesion) {
    olvidarPerfil();
    setTimeout(() => actualizarCopia(null), 0);
  } else if (perfilGuardado()?.id !== sesion.user.id) {
    olvidarPerfil();
    setTimeout(() => { usuarioActual(); }, 0);
  }
});
