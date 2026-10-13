// Página: mi-cuenta.html — solo con sesión (si no, va a /ingresar).
// Pestañas: "Mis cursos" y "Mis datos" (#datos): editar nombre, apellido,
// teléfono, Instagram y fecha de nacimiento, y cambiar la contraseña.
// La administradora solo ve "Mis datos" (aquí cambia su contraseña); su
// trabajo está en /admin.
import { iniciarPagina, esc, boton, insignia, urlWhatsApp, avisar } from './componentes.js';
import { icono } from './iconos.js';
import {
  usuarioEnCache, usuarioActual, salir, esAdmin, EVENTO, actualizarPerfil, cambiarContrasenaConActual, MIN_CONTRASENA
} from './sesion.js';
import { validacionEnVivo, validarTodos, activarMostrarContrasena, reglas } from './formularios.js';
import { obtenerMisInscripciones } from './datos.js';
import { formatearFecha } from './fechas.js';
import { mensajeSeguimiento } from './inscripcion.js';

if (!usuarioEnCache()) location.replace('/ingresar?volver=/mi-cuenta');

iniciarPagina();

const zona = document.querySelector('[data-mi-cuenta]');
let saliendo = false;   // al cerrar sesión desde aquí se va a Inicio, no a /ingresar

function tarjeta(i, usuario) {
  const c = i.curso;
  if (!c) return '';
  const foto = c.imagenPortada?.src
    ? `<img src="${esc(c.imagenPortada.src)}" alt="" width="96" height="96" loading="lazy">`
    : `<span class="mi-curso__sin-foto" aria-hidden="true">${icono('pincel', { tamano: 26 })}</span>`;
  const accion = i.estadoVisible === 'pendiente'
    ? boton({ texto: 'Escribir a Verónica', href: urlWhatsApp(mensajeSeguimiento(c, usuario)), iconoIzquierda: 'whatsapp', variante: 'secundario', atributos: { target: '_blank', rel: 'noopener' } })
    : boton({ texto: 'Ver curso', href: `/cursos/${encodeURIComponent(c.slug)}`, variante: 'secundario', icono: 'flecha-derecha' });
  return `
    <li class="mi-curso">
      <div class="mi-curso__estado">${insignia(i.estadoVisible)}</div>
      <div class="mi-curso__imagen">${foto}</div>
      <div class="mi-curso__texto">
        <h2 class="mi-curso__nombre">${esc(c.nombre)}</h2>
        <p class="mi-curso__meta">${c.estado === 'finalizado' ? 'Inició' : 'Inicia'} el ${esc(formatearFecha(c.fechaInicio))} · ${esc(c.modalidad)}</p>
      </div>
      <div class="mi-curso__accion">${accion}</div>
    </li>`;
}

/* ------------------------------ Mis datos ------------------------------ */

const OPERADORAS = ['0412', '0414', '0416', '0422', '0424', '0426'];
const hoy = new Date().toISOString().slice(0, 10);

/** '+584141234567' → { operadora: '0414', numero: '123-4567' } */
function partirTelefono(t) {
  const d = String(t || '').replace(/\D/g, '').replace(/^58/, '');
  const operadora = `0${d.slice(0, 3)}`;
  const resto = d.slice(3);
  return { operadora, numero: resto.length > 3 ? `${resto.slice(0, 3)}-${resto.slice(3)}` : resto };
}

function campo({ id, nombre, etiqueta, valor = '', tipo = 'text', opcional = false, extra = '', ayuda = '' }) {
  return `
    <div class="campo">
      <label class="campo__etiqueta" for="${id}">${esc(etiqueta)}${opcional ? ' <span class="campo__opcional">(opcional)</span>' : ''}</label>
      <input class="campo__control" id="${id}" name="${nombre}" type="${tipo}" value="${esc(valor)}" ${extra}
        aria-describedby="${ayuda ? `${id}-ayuda ` : ''}${id}-error">
      ${ayuda ? `<p class="campo__ayuda" id="${id}-ayuda">${ayuda}</p>` : ''}
      <p class="campo__error" id="${id}-error" hidden></p>
    </div>`;
}

function campoClave(id, nombre, etiqueta, autocompletar) {
  return `
    <div class="campo">
      <label class="campo__etiqueta" for="${id}">${esc(etiqueta)}</label>
      <div class="campo__grupo">
        <input class="campo__control" id="${id}" name="${nombre}" type="password" autocomplete="${autocompletar}" aria-describedby="${id}-error">
        <button class="campo__ojo" type="button" data-mostrar-contrasena="${id}"></button>
      </div>
      <p class="campo__error" id="${id}-error" hidden></p>
    </div>`;
}

function htmlDatos(u) {
  const tel = partirTelefono(u.telefono);
  const operadoras = OPERADORAS.includes(tel.operadora) ? OPERADORAS : [tel.operadora, ...OPERADORAS];
  return `
    <section class="mis-datos__bloque" aria-labelledby="titulo-datos">
      <h2 class="mis-datos__titulo" id="titulo-datos">Tus datos</h2>
      <form class="formulario" novalidate data-form-datos>
        <div class="formulario__fila">
          ${campo({ id: 'datos-nombre', nombre: 'nombre', etiqueta: 'Nombre', valor: u.nombre, extra: 'autocomplete="given-name" required' })}
          ${campo({ id: 'datos-apellido', nombre: 'apellido', etiqueta: 'Apellido', valor: u.apellido, extra: 'autocomplete="family-name" required' })}
        </div>
        <div class="campo">
          <label class="campo__etiqueta" for="datos-telefono">Teléfono</label>
          <div class="campo__union">
            <label class="solo-lectores" for="datos-operadora">Código de operadora</label>
            <select class="campo__selector" id="datos-operadora" name="operadora">
              ${operadoras.map((o) => `<option${o === tel.operadora ? ' selected' : ''}>${esc(o)}</option>`).join('')}
            </select>
            <input class="campo__control" id="datos-telefono" name="telefono" type="tel" inputmode="numeric" autocomplete="tel-local" maxlength="8" value="${esc(tel.numero)}" required aria-describedby="datos-telefono-error">
          </div>
          <p class="campo__error" id="datos-telefono-error" hidden></p>
        </div>
        <div class="formulario__fila">
          <div class="campo">
            <label class="campo__etiqueta" for="datos-instagram">Instagram <span class="campo__opcional">(opcional)</span></label>
            <div class="campo__union">
              <span class="campo__prefijo" aria-hidden="true">@</span>
              <input class="campo__control" id="datos-instagram" name="instagram" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="31" value="${esc(u.instagram || '')}" aria-describedby="datos-instagram-error">
            </div>
            <p class="campo__error" id="datos-instagram-error" hidden></p>
          </div>
          ${campo({ id: 'datos-nacimiento', nombre: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'date', valor: u.fechaNacimiento || '', opcional: true, extra: `min="1930-01-01" max="${hoy}"` })}
        </div>
        <dl class="mis-datos__fijos">
          <div><dt>Cédula</dt><dd>${esc(u.cedula)}</dd></div>
          <div><dt>Correo</dt><dd>${esc(u.correo)}</dd></div>
        </dl>
        <p class="campo__ayuda">La cédula y el correo no se cambian aquí. Si hay un error, escríbele a Verónica por WhatsApp.</p>
        <p class="formulario__resultado formulario__resultado--error" role="alert" data-error-datos hidden></p>
        ${boton({ texto: 'Guardar mis datos', tipo: 'submit', tamano: 'grande' })}
      </form>
    </section>

    <section class="mis-datos__bloque" aria-labelledby="titulo-clave">
      <h2 class="mis-datos__titulo" id="titulo-clave">Contraseña</h2>
      <form class="formulario" novalidate data-form-clave>
        ${campoClave('clave-actual', 'actual', 'Contraseña actual', 'current-password')}
        <div class="formulario__fila">
          ${campoClave('clave-nueva', 'contrasena', 'Contraseña nueva', 'new-password')}
          ${campoClave('clave-confirmar', 'confirmar', 'Confirmar contraseña nueva', 'new-password')}
        </div>
        <p class="campo__ayuda">Mínimo ${MIN_CONTRASENA} caracteres. Evita usar tu nombre o tu correo.</p>
        <p class="formulario__resultado formulario__resultado--error" role="alert" data-error-clave hidden></p>
        ${boton({ texto: 'Cambiar contraseña', tipo: 'submit', variante: 'secundario', tamano: 'grande' })}
      </form>
    </section>`;
}

function activarDatos() {
  const form = zona.querySelector('[data-form-datos]');
  const validar = validacionEnVivo(form, {
    nombre: (v) => reglas.nombre(v, 'tu nombre'),
    apellido: (v) => reglas.nombre(v, 'tu apellido'),
    telefono: (v) => {
      const d = v.replace(/\D/g, '');
      if (!d) return 'Escribe tu número de teléfono.';
      return d.length === 7 ? '' : 'Faltan números: escribe los 7 que siguen al código. Ejemplo: 123-4567.';
    },
    instagram: (v) => {
      const t = v.trim().replace(/^@/, '');
      return !t || /^[A-Za-z0-9._]{1,30}$/.test(t) ? '' : 'Tu usuario de Instagram solo puede tener letras, números, puntos y guiones bajos.';
    },
    fechaNacimiento: (v) => (!v ? '' : v > hoy ? 'La fecha de nacimiento no puede ser futura.'
      : v < '1930-01-01' ? 'Revisa el año de tu fecha de nacimiento.' : '')
  });
  form.telefono.addEventListener('input', () => {
    const d = form.telefono.value.replace(/\D/g, '').slice(0, 7);
    form.telefono.value = d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
  });
  const errorDatos = form.querySelector('[data-error-datos]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDatos.hidden = true;
    if (!validarTodos([form.nombre, form.apellido, form.telefono, form.instagram, form.fechaNacimiento], validar)) return;
    const b = form.querySelector('button[type="submit"]');
    b.disabled = true;
    const { error } = await actualizarPerfil({
      nombre: form.nombre.value,
      apellido: form.apellido.value,
      telefono: `+58${form.operadora.value.slice(1)}${form.telefono.value.replace(/\D/g, '')}`,
      instagram: form.instagram.value.trim().replace(/^@/, '') || null,
      fechaNacimiento: form.fechaNacimiento.value || null
    });
    b.disabled = false;
    if (error) { errorDatos.textContent = error.mensaje; errorDatos.hidden = false; return; }
    zona.querySelector('#titulo-cuenta').textContent = `Hola, ${form.nombre.value.trim()}`;
    avisar('Tus datos quedaron guardados.');
  });

  const formClave = zona.querySelector('[data-form-clave]');
  const validarClave = validacionEnVivo(formClave, {
    actual: (v) => (v ? '' : 'Escribe tu contraseña actual.'),
    contrasena: (v) => reglas.contrasena(v, MIN_CONTRASENA),
    confirmar: (v, f) => (!v ? 'Repite tu contraseña nueva.'
      : v !== f.contrasena.value ? 'Las contraseñas no coinciden. Revisa que sean iguales.' : '')
  });
  const errorClave = formClave.querySelector('[data-error-clave]');
  formClave.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorClave.hidden = true;
    if (!validarTodos([formClave.actual, formClave.contrasena, formClave.confirmar], validarClave)) return;
    const b = formClave.querySelector('button[type="submit"]');
    b.disabled = true;
    const { error } = await cambiarContrasenaConActual(formClave.actual.value, formClave.contrasena.value);
    b.disabled = false;
    if (error) {
      if (error.codigo === 'contrasena-actual') {
        formClave.actual.setAttribute('aria-invalid', 'true');
        formClave.actual.focus();
      }
      errorClave.textContent = error.mensaje;
      errorClave.hidden = false;
      return;
    }
    formClave.reset();
    avisar('Tu contraseña quedó cambiada.');
  });
  activarMostrarContrasena(formClave);
}

/* ------------------------------- pestañas ------------------------------- */

function elegirPestana(id, { enfocar = false } = {}) {
  zona.querySelectorAll('[role="tab"]').forEach((t) => {
    const activa = t.id === `pestana-${id}`;
    t.setAttribute('aria-selected', String(activa));
    t.tabIndex = activa ? 0 : -1;
    if (activa && enfocar) t.focus();
  });
  zona.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = p.id !== `panel-${id}`; });
  history.replaceState(null, '', id === 'datos' ? '#datos' : location.pathname);
}

async function pintar() {
  const usuario = await usuarioActual();
  if (!usuario) { location.replace('/ingresar?volver=/mi-cuenta'); return; }
  const admin = esAdmin(usuario);
  const inscripciones = admin ? [] : await obtenerMisInscripciones();
  document.title = `Mi cuenta · Verónica Correa Makeup`;
  zona.innerHTML = `
    <div class="contenedor">
      <div class="mi-cuenta__cabeza">
        <div>
          <p class="etiqueta">Mi cuenta</p>
          <h1 class="mi-cuenta__saludo" id="titulo-cuenta">Hola, ${esc(usuario.nombre)}</h1>
          <p class="mi-cuenta__correo">${esc(usuario.correo)}</p>
        </div>
        <div class="mi-cuenta__botones">
          ${admin ? boton({ texto: 'Ir al panel', href: '/admin', iconoIzquierda: 'nivel' }) : ''}
          ${boton({ texto: 'Cerrar sesión', variante: 'secundario', iconoIzquierda: 'salir', atributos: { 'data-salir': '' } })}
        </div>
      </div>

      <div class="pestanas" role="tablist" aria-label="Secciones de mi cuenta">
        ${admin ? '' : '<button class="pestanas__pestana" type="button" role="tab" id="pestana-cursos" aria-selected="true" aria-controls="panel-cursos">Mis cursos</button>'}
        <button class="pestanas__pestana" type="button" role="tab" id="pestana-datos" aria-selected="false" aria-controls="panel-datos" tabindex="-1">Mis datos</button>
      </div>

      <div class="pestanas__panel" role="tabpanel" id="panel-datos" aria-labelledby="pestana-datos" hidden>
        <div class="mis-datos">${htmlDatos(usuario)}</div>
      </div>

      ${admin ? '' : `
      <div class="pestanas__panel" role="tabpanel" id="panel-cursos" aria-labelledby="pestana-cursos">
        ${inscripciones.length
          ? `<ul class="mis-cursos">${inscripciones.map((i) => tarjeta(i, usuario)).join('')}</ul>`
          : `<div class="sin-cursos">
               <span class="sin-cursos__icono">${icono('clases', { tamano: 28 })}</span>
               <h2>Aún no tienes cursos</h2>
               <p>Cuando solicites tu inscripción, aquí verás su estado.</p>
               ${boton({ texto: 'Ver cursos disponibles', href: '/cursos', tamano: 'grande' })}
             </div>`}
      </div>`}
    </div>`;

  activarDatos();
  const pestanas = [...zona.querySelectorAll('[role="tab"]')];
  pestanas.forEach((t, i) => {
    t.addEventListener('click', () => elegirPestana(t.id.replace('pestana-', '')));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const otra = pestanas[(i + (e.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length];
      elegirPestana(otra.id.replace('pestana-', ''), { enfocar: true });
    });
  });
  elegirPestana(admin || location.hash === '#datos' ? 'datos' : 'cursos');

  zona.querySelector('[data-salir]').addEventListener('click', async () => {
    saliendo = true;
    await salir();
    location.assign('/');
  });
}

await pintar();
// Un enlace a #datos (o de vuelta) con la página ya abierta cambia de pestaña
window.addEventListener('hashchange', () => {
  if (zona.querySelector('#pestana-cursos')) elegirPestana(location.hash === '#datos' ? 'datos' : 'cursos');
});
// Si la sesión se cierra en otra pestaña, esta también sale
window.addEventListener(EVENTO, (e) => {
  if (!e.detail?.usuario && !saliendo) location.replace('/ingresar?volver=/mi-cuenta');
});
