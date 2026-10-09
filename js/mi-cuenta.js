// Página: mi-cuenta.html — solo con sesión (si no, va a /ingresar).
import { iniciarPagina, esc, boton, insignia, urlWhatsApp } from './componentes.js';
import { icono } from './iconos.js';
import { usuarioEnCache, usuarioActual, salir, EVENTO } from './sesion.js';
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

async function pintar() {
  const usuario = await usuarioActual();
  if (!usuario) { location.replace('/ingresar?volver=/mi-cuenta'); return; }
  const inscripciones = await obtenerMisInscripciones();
  document.title = `Mi cuenta · Verónica Correa Makeup`;
  zona.innerHTML = `
    <div class="contenedor">
      <div class="mi-cuenta__cabeza">
        <div>
          <p class="etiqueta">Mi cuenta</p>
          <h1 class="mi-cuenta__saludo" id="titulo-cuenta">Hola, ${esc(usuario.nombre)}</h1>
          <p class="mi-cuenta__correo">${esc(usuario.correo)}</p>
        </div>
        ${boton({ texto: 'Cerrar sesión', variante: 'secundario', iconoIzquierda: 'salir', atributos: { 'data-salir': '' } })}
      </div>

      <div class="pestanas" role="tablist" aria-label="Secciones de mi cuenta">
        <button class="pestanas__pestana" type="button" role="tab" id="pestana-cursos" aria-selected="true" aria-controls="panel-cursos">Mis cursos</button>
        <button class="pestanas__pestana" type="button" role="tab" id="pestana-datos" aria-selected="false" aria-disabled="true" tabindex="-1">
          Mis datos <span class="pestanas__pronto">Próximamente</span>
        </button>
      </div>

      <div class="pestanas__panel" role="tabpanel" id="panel-cursos" aria-labelledby="pestana-cursos">
        ${inscripciones.length
          ? `<ul class="mis-cursos">${inscripciones.map((i) => tarjeta(i, usuario)).join('')}</ul>`
          : `<div class="sin-cursos">
               <span class="sin-cursos__icono">${icono('clases', { tamano: 28 })}</span>
               <h2>Aún no tienes cursos</h2>
               <p>Cuando solicites tu inscripción, aquí verás su estado.</p>
               ${boton({ texto: 'Ver cursos disponibles', href: '/cursos', tamano: 'grande' })}
             </div>`}
      </div>
    </div>`;

  zona.querySelector('[data-salir]').addEventListener('click', async () => {
    saliendo = true;
    await salir();
    location.assign('/');
  });
}

await pintar();
// Si la sesión se cierra en otra pestaña, esta también sale
window.addEventListener(EVENTO, (e) => {
  if (!e.detail?.usuario && !saliendo) location.replace('/ingresar?volver=/mi-cuenta');
});
