// Página: nueva-contrasena.html — llega desde el correo "Restablece tu contraseña".
// Supabase abre una sesión con el enlace del correo; aquí se guarda la
// contraseña nueva y se entra directo. Si el enlace venció o ya se usó, se
// ofrece pedir otro desde /ingresar.
import { iniciarPagina, avisar } from './componentes.js';
import { prepararRecuperacion, cambiarContrasena, MIN_CONTRASENA } from './sesion.js';
import { validacionEnVivo, validarTodos, activarMostrarContrasena, reglas, destinoTrasEntrar } from './formularios.js';

iniciarPagina();

const form = document.querySelector('[data-nueva]');
const intro = document.querySelector('[data-intro]');
const vencido = document.querySelector('[data-vencido]');

const { listo, correo } = await prepararRecuperacion();
// El enlace trae llaves en la dirección: se quitan para que no queden en el historial
if (location.hash) history.replaceState(null, '', location.pathname);

if (!listo) {
  intro.textContent = 'No pudimos abrir tu enlace.';
  vencido.hidden = false;
} else {
  intro.textContent = correo ? `Para tu cuenta ${correo}.` : 'Escríbela dos veces para confirmarla.';
  form.hidden = false;
  form.contrasena.focus();
}

const validar = validacionEnVivo(form, {
  contrasena: (v) => reglas.contrasena(v, MIN_CONTRASENA),
  confirmar: (v, f) => (!v ? 'Repite tu contraseña.'
    : v !== f.contrasena.value ? 'Las contraseñas no coinciden. Revisa que sean iguales.' : '')
});
form.contrasena.addEventListener('input', () => { if (form.confirmar.value) validar(form.confirmar); });

const errorGeneral = form.querySelector('[data-error-general]');
const boton = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorGeneral.hidden = true;
  if (!validarTodos([form.contrasena, form.confirmar], validar)) return;
  boton.disabled = true;
  boton.querySelector('span').textContent = 'Guardando…';
  const { usuario, error } = await cambiarContrasena(form.contrasena.value);
  if (!error) {
    avisar('Tu contraseña quedó guardada.');
    setTimeout(() => location.assign(destinoTrasEntrar(usuario)), 900);
    return;
  }
  boton.disabled = false;
  boton.querySelector('span').textContent = 'Guardar contraseña';
  if (error.codigo === 'enlace-vencido') {
    form.hidden = true;
    intro.textContent = 'No pudimos guardar tu contraseña.';
    vencido.hidden = false;
    return;
  }
  errorGeneral.textContent = error.mensaje;
  errorGeneral.hidden = false;
});

activarMostrarContrasena(form);
