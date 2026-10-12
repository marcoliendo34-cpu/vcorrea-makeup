// Página: registro.html — crear cuenta en 2 pasos.
// SIMULADO: la cuenta se guarda en este navegador (ver js/sesion.js).
// Si llega con ?curso=slug, al terminar vuelve a ese curso y sigue la inscripción.
import { iniciarPagina, esc, desplazamiento } from './componentes.js';
import { icono } from './iconos.js';
import { registrar, reenviarConfirmacion, existeCedula, existeCorreo, usuarioEnCache, MIN_CONTRASENA } from './sesion.js';
import { medir } from './medicion.js';
import { obtenerCursoPorSlug } from './datos.js';
import {
  validacionEnVivo, validarTodos, marcarCampo, activarMostrarContrasena, reglas,
  soloDigitos, destinoTrasEntrar, conservarParametros
} from './formularios.js';

// Con sesión no tiene sentido registrarse otra vez
if (usuarioEnCache()) location.replace(destinoTrasEntrar(usuarioEnCache()));

iniciarPagina();

const form = document.querySelector('[data-registro]');
const pasos = [...form.querySelectorAll('[data-paso]')];
const enlaceIngresar = document.querySelector('[data-enlace-ingresar]');
conservarParametros(enlaceIngresar);

/* --------------------------- curso de origen --------------------------- */

const slugCurso = new URLSearchParams(location.search).get('curso');
if (slugCurso) {
  const curso = await obtenerCursoPorSlug(slugCurso);
  if (curso) {
    const zona = document.querySelector('[data-curso-contexto]');
    zona.innerHTML = `${icono('calendario', { tamano: 18 })}<span>Para inscribirte en <strong>${esc(curso.nombre)}</strong></span>`;
    zona.hidden = false;
  }
}

/* ------------------------------- reglas -------------------------------- */

const hoy = new Date().toISOString().slice(0, 10);
form.fechaNacimiento.max = hoy;

const validar = validacionEnVivo(form, {
  nombre: (v) => reglas.nombre(v, 'tu nombre'),
  apellido: (v) => reglas.nombre(v, 'tu apellido'),
  cedula: (v) => (!v ? 'Escribe tu número de cédula.'
    : !/^\d{6,9}$/.test(v) ? 'La cédula debe tener entre 6 y 9 números.' : ''),
  telefono: (v) => {
    const d = v.replace(/\D/g, '');
    if (!d) return 'Escribe tu número de teléfono.';
    return d.length === 7 ? '' : 'Faltan números: escribe los 7 que siguen al código. Ejemplo: 123-4567.';
  },
  correo: reglas.correo,
  contrasena: (v) => reglas.contrasena(v, MIN_CONTRASENA),
  confirmar: (v, f) => (!v ? 'Repite tu contraseña.'
    : v !== f.contrasena.value ? 'Las contraseñas no coinciden. Revisa que sean iguales.' : ''),
  instagram: (v) => {
    const t = v.trim().replace(/^@/, '');
    if (!t) return '';
    return /^[A-Za-z0-9._]{1,30}$/.test(t) ? '' : 'Tu usuario de Instagram solo puede tener letras, números, puntos y guiones bajos.';
  },
  fechaNacimiento: (v) => {
    if (!v) return '';
    if (v > hoy) return 'La fecha de nacimiento no puede ser futura.';
    if (v < '1930-01-01') return 'Revisa el año de tu fecha de nacimiento.';
    return '';
  },
  acepto: (v) => (v ? '' : 'Para crear tu cuenta necesitas aceptar el uso de tus datos.')
});

// Si cambia la contraseña, se revisa de nuevo la confirmación
form.contrasena.addEventListener('input', () => { if (form.confirmar.value) validar(form.confirmar); });

/* ------------------------- cédula y teléfono ---------------------------- */

soloDigitos(form.cedula, 9);

const vistaTelefono = document.querySelector('[data-telefono-vista]');
const AYUDA_TELEFONO = vistaTelefono.textContent;
function formatearTelefono() {
  const d = form.telefono.value.replace(/\D/g, '').slice(0, 7);
  form.telefono.value = d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
  vistaTelefono.textContent = d.length === 7
    ? `Así lo verá Verónica: ${form.operadora.value}-${d.slice(0, 3)}-${d.slice(3)}`
    : AYUDA_TELEFONO;
}
form.telefono.addEventListener('input', formatearTelefono);
form.operadora.addEventListener('change', formatearTelefono);

const cedulaCompleta = () => `${form.cedulaTipo.value}-${form.cedula.value}`;
const telefonoInternacional = () => `+58${form.operadora.value.slice(1)}${form.telefono.value.replace(/\D/g, '')}`;
const urlIngresar = () => enlaceIngresar.getAttribute('href');

/* ------------------------------ únicos ---------------------------------- */

async function cedulaLibre() {
  if (!validar(form.cedula)) return false;
  if (await existeCedula(cedulaCompleta())) {
    marcarCampo(form.cedula, `Ya existe una cuenta con esta cédula. <a href="${esc(urlIngresar())}">¿Quieres iniciar sesión?</a>`, { html: true });
    return false;
  }
  return true;
}
async function correoLibre() {
  if (!validar(form.correo)) return false;
  if (await existeCorreo(form.correo.value)) {
    marcarCampo(form.correo, `Ya existe una cuenta con este correo. <a href="${esc(urlIngresar())}">¿Quieres iniciar sesión?</a>`, { html: true });
    return false;
  }
  return true;
}
form.cedula.addEventListener('blur', () => { if (form.cedula.value) cedulaLibre(); });
form.cedulaTipo.addEventListener('change', () => { if (form.cedula.value) cedulaLibre(); });
form.correo.addEventListener('blur', () => { if (form.correo.value) correoLibre(); });

/* ------------------------------- pasos ---------------------------------- */

const anuncio = document.querySelector('[data-anuncio-paso]');
function irAPaso(n) {
  pasos.forEach((p) => { p.hidden = Number(p.dataset.paso) !== n; });
  document.querySelectorAll('[data-indicador]').forEach((li) => {
    const i = Number(li.dataset.indicador);
    li.classList.toggle('es-hecho', i < n);
    if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  anuncio.textContent = n === 1 ? 'Paso 1 de 2: Tus datos' : 'Paso 2 de 2: Tu acceso';
  document.querySelector('.acceso__caja').scrollIntoView({ block: 'start', behavior: desplazamiento() });
  pasos[n - 1].querySelector('.campo__control').focus({ preventScroll: true });
}

const camposPaso = (n) => [...pasos[n - 1].querySelectorAll('input[name]')];

document.querySelector('[data-continuar]').addEventListener('click', async () => {
  if (!validarTodos(camposPaso(1), validar)) return;
  if (!(await cedulaLibre())) { form.cedula.focus(); return; }
  irAPaso(2);
});
document.querySelector('[data-volver]').addEventListener('click', () => irAPaso(1));

/* ------------------------------- enviar --------------------------------- */

const errorGeneral = form.querySelector('[data-error-general]');
const botonCrear = form.querySelector('[data-crear]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorGeneral.hidden = true;
  if (pasos[0].hidden === false) { document.querySelector('[data-continuar]').click(); return; }
  if (!validarTodos(camposPaso(2), validar)) return;
  if (!(await correoLibre())) { form.correo.focus(); return; }

  botonCrear.disabled = true;
  botonCrear.querySelector('span').textContent = 'Creando tu cuenta…';
  const { error } = await registrar({
    nombre: form.nombre.value,
    apellido: form.apellido.value,
    cedula: cedulaCompleta(),
    telefono: telefonoInternacional(),
    correo: form.correo.value,
    contrasena: form.contrasena.value,
    instagram: form.instagram.value.trim().replace(/^@/, '') || null,
    fechaNacimiento: form.fechaNacimiento.value || null,
    volver: destinoTrasEntrar()   // adonde lleva el enlace de confirmación del correo
  });
  if (!error || error.codigo === 'confirmar-correo') medir('CompleteRegistration', { status: true });
  if (!error) {
    location.assign(destinoTrasEntrar());
    return;
  }
  if (error.codigo === 'confirmar-correo') {
    mostrarRevisaTuCorreo(form.correo.value.trim().toLowerCase());
    return;
  }
  botonCrear.disabled = false;
  botonCrear.querySelector('span').textContent = 'Crear mi cuenta';
  if (error.codigo === 'cedula-existe') { irAPaso(1); await cedulaLibre(); return; }
  if (error.codigo === 'correo-existe') { await correoLibre(); form.correo.focus(); return; }
  errorGeneral.textContent = error.mensaje;
  errorGeneral.hidden = false;
});

activarMostrarContrasena(form);

/* --------------- Cuenta creada: falta confirmar el correo --------------- */

function mostrarRevisaTuCorreo(correo) {
  const caja = document.querySelector('.acceso__caja');
  const ingresar = document.querySelector('[data-enlace-ingresar]')?.getAttribute('href') || '/ingresar';
  caja.innerHTML = `
    <div class="acceso__listo">
      <span class="acceso__listo-icono">${icono('correo', { tamano: 26 })}</span>
      <p class="etiqueta">Cuenta creada</p>
      <h1 tabindex="-1">Revisa tu correo</h1>
      <p class="acceso__intro">Te enviamos un enlace a <strong>${esc(correo)}</strong>. Ábrelo para confirmar tu cuenta y entrarás directo.</p>
      <p class="campo__aviso">¿No te llega? Revisa las carpetas de spam y promociones. Puede tardar unos minutos.</p>
      <button class="boton boton--secundario boton--grande boton--bloque" type="button" data-reenviar><span>Reenviar el correo</span></button>
      <p class="acceso__reenvio" role="status" data-reenvio></p>
      <p class="acceso__alterno">¿Ya lo confirmaste? <a href="${esc(ingresar)}">Inicia sesión</a></p>
    </div>`;
  caja.querySelector('h1').focus();
  const botonReenviar = caja.querySelector('[data-reenviar]');
  botonReenviar.addEventListener('click', async () => {
    botonReenviar.disabled = true;
    const { error: e } = await reenviarConfirmacion(correo, destinoTrasEntrar());
    caja.querySelector('[data-reenvio]').textContent = e ? e.mensaje : 'Listo, te lo enviamos de nuevo.';
    setTimeout(() => { botonReenviar.disabled = false; }, 30000);   // evita reenvíos seguidos
  });
}
