// Página: ingresar.html — iniciar sesión.
// SIMULADO: en la vista previa cualquier contraseña de 8 o más caracteres vale
// para un correo registrado (ver js/sesion.js). Cuentas demo: alumna@demo.com y admin@demo.com (rol admin → /admin).
import { iniciarPagina, esc } from './componentes.js';
import { icono } from './iconos.js';
import { ingresar, usuarioEnCache, MIN_CONTRASENA } from './sesion.js';
import { obtenerCursoPorSlug } from './datos.js';
import {
  validacionEnVivo, validarTodos, activarMostrarContrasena, reglas, destinoTrasEntrar, conservarParametros
} from './formularios.js';

if (usuarioEnCache()) location.replace(destinoTrasEntrar(usuarioEnCache()));

iniciarPagina();

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

// "¿Olvidaste tu contraseña?" → Disponible pronto
const aviso = document.querySelector('[data-aviso-olvido]');
document.querySelector('[data-olvido]').addEventListener('click', (e) => {
  aviso.hidden = false;
  e.currentTarget.setAttribute('aria-expanded', 'true');
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
    : esc(error.mensaje);
  errorGeneral.hidden = false;
});

activarMostrarContrasena(form);
