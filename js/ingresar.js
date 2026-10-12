// Página: ingresar.html — iniciar sesión.
// - ?confirmada=1: llega desde el enlace de confirmación del correo. Supabase
//   abre la sesión con ese enlace y se entra directo; si no, se avisa.
// - "¿Olvidaste tu contraseña?": manda el enlace a /nueva-contrasena.
// - Correo sin confirmar: ofrece reenviar el correo de confirmación.
// En la demo (localhost) cualquier contraseña de 8+ caracteres vale (js/sesion.js).
import { iniciarPagina, esc } from './componentes.js';
import { icono } from './iconos.js';
import { ingresar, usuarioEnCache, usuarioActual, enviarRecuperacion, reenviarConfirmacion, MIN_CONTRASENA } from './sesion.js';
import { obtenerCursoPorSlug } from './datos.js';
import {
  validacionEnVivo, validarTodos, activarMostrarContrasena, reglas, destinoTrasEntrar, conservarParametros
} from './formularios.js';

if (usuarioEnCache()) location.replace(destinoTrasEntrar(usuarioEnCache()));

iniciarPagina();

// Vuelve del enlace de confirmación del correo
const parametros = new URLSearchParams(location.search);
if (parametros.get('confirmada')) {
  const aviso = document.querySelector('[data-confirmada]');
  const fallo = /error/.test(location.hash);
  aviso.textContent = fallo
    ? 'Ese enlace de confirmación venció o ya se usó. Ingresa con tu correo y contraseña; si hace falta, te enviamos otro.'
    : '¡Listo! Tu correo quedó confirmado.';
  aviso.classList.toggle('formulario__resultado--error', fallo);
  aviso.hidden = false;
  if (!fallo) {
    usuarioActual().then((u) => { if (u) location.replace(destinoTrasEntrar(u)); }).catch(() => {});
  }
}

const form = document.querySelector('[data-ingresar]');
const enlaceRegistro = document.querySelector('[data-enlace-registro]');
conservarParametros(enlaceRegistro);

const slugCurso = new URLSearchParams(location.search).get('curso');
if (slugCurso) {
  const curso = await obtenerCursoPorSlug(slugCurso);
  if (curso) {
    const zona = document.querySelector('[data-curso-contexto]');
    zona.innerHTML = `${icono('calendario', { tamano: 18 })}<span>Para inscribirte en <strong>${esc(curso.nombre)}</strong></span>`;
    zona.hidden = false;
  }
}

const validar = validacionEnVivo(form, {
  correo: reglas.correo,
  contrasena: (v) => (v ? reglas.contrasena(v, MIN_CONTRASENA) : 'Escribe tu contraseña.')
});

// "¿Olvidaste tu contraseña?" → enlace por correo a /nueva-contrasena
const aviso = document.querySelector('[data-aviso-olvido]');
const estadoOlvido = aviso.querySelector('[data-estado-olvido]');
const botonEnlace = aviso.querySelector('[data-enviar-enlace]');
document.querySelector('[data-olvido]').addEventListener('click', (e) => {
  aviso.hidden = false;
  e.currentTarget.setAttribute('aria-expanded', 'true');
  if (!form.correo.value) form.correo.focus();
});
botonEnlace.addEventListener('click', async () => {
  const problema = reglas.correo(form.correo.value);
  if (problema) {
    validarTodos([form.correo], validar);
    form.correo.focus();
    return;
  }
  botonEnlace.disabled = true;
  estadoOlvido.textContent = 'Enviando…';
  const { error } = await enviarRecuperacion(form.correo.value);
  // Mismo mensaje exista o no la cuenta (así nadie averigua qué correos están registrados)
  estadoOlvido.textContent = error && error.codigo !== 'datos-invalidos'
    ? error.mensaje
    : `Si hay una cuenta con ${form.correo.value.trim()}, te llegará un correo con el enlace en unos minutos. Revisa también spam y promociones.`;
  setTimeout(() => { botonEnlace.disabled = false; }, 30000);   // evita envíos seguidos
});

const errorGeneral = form.querySelector('[data-error-general]');
const boton = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorGeneral.hidden = true;
  if (!validarTodos([form.correo, form.contrasena], validar)) return;
  boton.disabled = true;
  boton.querySelector('span').textContent = 'Entrando…';
  const { usuario, error } = await ingresar(form.correo.value, form.contrasena.value);
  if (!error) {
    location.assign(destinoTrasEntrar(usuario));
    return;
  }
  boton.disabled = false;
  boton.querySelector('span').textContent = 'Ingresar';
  errorGeneral.innerHTML = error.codigo === 'credenciales'
    ? `${esc(error.mensaje)} Revisa los datos o <a href="${esc(enlaceRegistro.getAttribute('href'))}">crea tu cuenta</a>.`
    : error.codigo === 'correo-sin-confirmar'
      ? `${esc(error.mensaje)} <button class="boton-enlace" type="button" data-reenviar-confirmacion>Reenviar el correo</button>`
      : esc(error.mensaje);
  errorGeneral.hidden = false;
});

// Correo sin confirmar: reenviar el enlace
errorGeneral.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-reenviar-confirmacion]');
  if (!b) return;
  b.disabled = true;
  const { error } = await reenviarConfirmacion(form.correo.value, destinoTrasEntrar());
  b.replaceWith(document.createTextNode(error ? error.mensaje : 'Listo, te lo enviamos de nuevo. Revisa también spam.'));
});

activarMostrarContrasena(form);
