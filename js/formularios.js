// Ayudas compartidas de formularios (registro e ingreso).
// Convención del HTML (ver registro.html):
//   <input class="campo__control" id="X" name="..." aria-describedby="X-error">
//   <p class="campo__error" id="X-error" hidden></p>
// Validación en vivo: al salir de un campo se revisa; si quedó marcado con
// error, se vuelve a revisar mientras se escribe, para que el mensaje se vaya
// apenas se corrige.

import { esc } from './componentes.js';
import { icono } from './iconos.js';

/** Muestra (o quita, con '') el mensaje de un campo. `html` permite un enlace. */
export function marcarCampo(campo, mensaje = '', { html = false } = {}) {
  const zona = document.getElementById(`${campo.id}-error`);
  const conError = Boolean(mensaje);
  campo.setAttribute('aria-invalid', String(conError));
  campo.closest('.campo')?.classList.toggle('campo--error', conError);
  if (!zona) return;
  zona.hidden = !conError;
  zona.innerHTML = conError ? `${icono('informacion', { tamano: 16 })}<span>${html ? mensaje : esc(mensaje)}</span>` : '';
}

/**
 * Conecta la validación en vivo.
 * @param {HTMLFormElement} form
 * @param {Record<string, (valor:string, form:HTMLFormElement, campo:HTMLElement) => string>} reglas
 *        Por nombre de campo; devuelven '' si está bien o el mensaje.
 * @returns {(campo: HTMLElement) => boolean}  Función para validar un campo a mano.
 */
export function validacionEnVivo(form, reglas) {
  const validar = (campo) => {
    const regla = reglas[campo.name];
    if (!regla) return true;
    const valor = campo.type === 'checkbox' ? (campo.checked ? 'si' : '') : campo.value;
    const mensaje = regla(valor, form, campo);
    marcarCampo(campo, mensaje);
    return !mensaje;
  };
  form.querySelectorAll('input, select, textarea').forEach((c) => {
    if (!reglas[c.name]) return;
    c.addEventListener('blur', () => { if (c.value || c.getAttribute('aria-invalid') === 'true') validar(c); });
    c.addEventListener(c.type === 'checkbox' || c.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (c.getAttribute('aria-invalid') === 'true' || c.type === 'checkbox') validar(c);
    });
  });
  return validar;
}

/** Valida una lista de campos; enfoca el primero con error. */
export function validarTodos(campos, validar) {
  const resultados = campos.map((c) => validar(c));
  const primero = campos[resultados.indexOf(false)];
  if (primero) primero.focus();
  return !primero;
}

/** Botones de ojo para mostrar u ocultar contraseñas: [data-mostrar-contrasena="id-del-campo"]. */
export function activarMostrarContrasena(raiz = document) {
  raiz.querySelectorAll('[data-mostrar-contrasena]').forEach((b) => {
    const campo = document.getElementById(b.dataset.mostrarContrasena);
    const pintar = () => {
      const visible = campo.type === 'text';
      b.innerHTML = icono(visible ? 'ojo-cerrado' : 'ojo', { tamano: 20 });
      b.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
      b.setAttribute('aria-pressed', String(visible));
    };
    b.addEventListener('click', () => {
      campo.type = campo.type === 'password' ? 'text' : 'password';
      pintar();
      campo.focus();
    });
    pintar();
  });
}

/* ------------------------------------------------------------------ */
/* Reglas comunes                                                      */
/* ------------------------------------------------------------------ */

const LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

export const reglas = {
  nombre: (v, etiqueta = 'tu nombre') => {
    const t = v.trim();
    if (!t) return `Escribe ${etiqueta}.`;
    if (t.length < 2) return `Revisa ${etiqueta}: parece muy corto.`;
    if (!LETRAS.test(t)) return `Usa solo letras en ${etiqueta}.`;
    return '';
  },
  correo: (v) => {
    const t = v.trim();
    if (!t) return 'Escribe tu correo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return 'Revisa tu correo, parece incompleto. Ejemplo: nombre@correo.com';
    return '';
  },
  contrasena: (v, minimo) => {
    if (!v) return 'Escribe una contraseña.';
    if (v.length < minimo) return `Tu contraseña debe tener al menos ${minimo} caracteres.`;
    return '';
  }
};

/** Solo números, máximo n. */
export function soloDigitos(campo, maximo) {
  campo.addEventListener('input', () => {
    const limpio = campo.value.replace(/\D/g, '').slice(0, maximo);
    if (limpio !== campo.value) campo.value = limpio;
  });
}

/** Destino seguro después de entrar: solo rutas internas del sitio. */
export function destinoTrasEntrar() {
  const p = new URLSearchParams(location.search);
  const curso = p.get('curso');
  if (curso && /^[a-z0-9-]+$/.test(curso)) return `/cursos/${curso}?inscribirme=1`;
  const volver = p.get('volver');
  if (volver && /^\/(?!\/)[\w\-/?=&.]*$/.test(volver)) return volver;
  return '/mi-cuenta';
}

/** Mantiene ?curso / ?volver al pasar entre registro e ingreso. */
export function conservarParametros(enlace) {
  const p = new URLSearchParams(location.search);
  const q = new URLSearchParams();
  ['curso', 'volver'].forEach((k) => { if (p.get(k)) q.set(k, p.get(k)); });
  const extra = q.toString();
  if (extra) enlace.href = `${enlace.getAttribute('href').split('?')[0]}?${extra}`;
}
