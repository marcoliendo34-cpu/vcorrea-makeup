// Página: index.html (Inicio)
import {
  iniciarPagina, placeholderFoto, boton, tituloSeccion, tarjetaCurso,
  activarBarras, activarApariciones, urlWhatsApp, esc
} from './componentes.js';
import { obtenerCursosVigentes, buscarCursos, obtenerGaleria } from './datos.js';

const MAX_CURSOS = 6;
const MENSAJE_ELEGIR = 'Hola Verónica, vengo de tu web y no sé qué curso elegir. ¿Me ayudas?';

/* ---------------------------- piezas fijas ---------------------------- */

// Foto del hero: placeholder hasta que llegue la foto real.
document.querySelector('[data-hero-media]').innerHTML =
  placeholderFoto({ descripcion: 'Verónica maquillando a una alumna (hero)', sinBorde: true });

document.querySelector('[data-titulo-proximos]').innerHTML = tituloSeccion({
  etiqueta: 'Calendario', titulo: 'Próximos cursos', id: 'titulo-proximos',
  enlace: { texto: 'Ver todos', href: '/cursos' }
});
document.querySelector('[data-titulo-por-que]').innerHTML = tituloSeccion({
  etiqueta: 'La experiencia', titulo: 'Por qué aprender con Verónica', id: 'titulo-por-que'
});
document.querySelector('[data-titulo-sobre]').innerHTML = tituloSeccion({
  etiqueta: 'Sobre Verónica', titulo: 'Hola, soy Verónica Correa', id: 'titulo-sobre'
});
document.querySelector('[data-enlace-sobre]').innerHTML =
  boton({ texto: 'Conoce su historia', href: '/sobre-veronica', variante: 'texto', icono: 'flecha-derecha', tamano: 'grande' });
document.querySelector('[data-retrato]').innerHTML =
  placeholderFoto({ descripcion: 'Retrato de Verónica', proporcion: '4 / 5' });
document.querySelector('[data-titulo-galeria]').innerHTML = tituloSeccion({
  etiqueta: 'Galería', titulo: 'Trabajos y momentos de clase', id: 'titulo-galeria',
  enlace: { texto: 'Ver galería', href: '/galeria' }
});
document.querySelector('[data-boton-cierre]').innerHTML = boton({
  texto: 'Escríbeme por WhatsApp', href: urlWhatsApp(MENSAJE_ELEGIR), iconoIzquierda: 'whatsapp',
  tamano: 'grande', atributos: { target: '_blank', rel: 'noopener' }
});

iniciarPagina();

/* ------------------------------ buscador ------------------------------ */

const formBusqueda = document.querySelector('[data-busqueda-inicio]');
formBusqueda.addEventListener('submit', (e) => {
  // Con texto el formulario va a /cursos?q=… ; vacío, a /cursos
  if (!formBusqueda.q.value.trim()) { e.preventDefault(); location.href = '/cursos'; }
});

/* ------------------------- cursos y filtros --------------------------- */

const rejilla = document.querySelector('[data-rejilla-cursos]');
const estado = document.querySelector('[data-estado-filtro]');
const chips = [...document.querySelectorAll('[data-filtro]')];

function pintarCursos(cursos, filtroActivo) {
  const lista = cursos.slice(0, MAX_CURSOS);
  rejilla.classList.toggle('rejilla-cursos--carrusel', lista.length > 3);
  rejilla.innerHTML = lista.length
    ? lista.map((c) => `<li>${tarjetaCurso(c)}</li>`).join('')
    : `<li class="sin-resultados">
         <p>No hay próximos cursos con este filtro.</p>
         ${boton({ texto: 'Ver todos los cursos', href: '/cursos', variante: 'texto', icono: 'flecha-derecha' })}
       </li>`;
  activarBarras(rejilla);
  estado.textContent = filtroActivo
    ? `${lista.length === 1 ? '1 curso' : `${lista.length} cursos`} con el filtro ${filtroActivo}.`
    : '';
}

async function aplicarFiltro(chip) {
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  const [campo, valor] = chip.dataset.filtro.split(':');
  rejilla.classList.add('esta-cambiando');
  const cursos = campo === 'todos'
    ? await obtenerCursosVigentes()
    : await buscarCursos('', { [campo]: valor });
  pintarCursos(cursos, campo === 'todos' ? 'Todos' : valor);
  requestAnimationFrame(() => rejilla.classList.remove('esta-cambiando'));
}

chips.forEach((chip) => chip.addEventListener('click', () => aplicarFiltro(chip)));

/* ------------------------------ galería ------------------------------- */

async function pintarGaleria() {
  const fotos = await obtenerGaleria({ soloDestacadas: true, limite: 6 });
  document.querySelector('[data-mosaico]').innerHTML = fotos.map((f) => `
    <li class="mosaico__item">
      ${f.src
        ? `<img src="${esc(f.miniatura || f.src)}" alt="${esc(f.alt)}" loading="lazy" decoding="async">`
        : placeholderFoto({ descripcion: f.alt, sinBorde: true })}
    </li>`).join('');
}

/* ------------------------------- inicio -------------------------------- */

try {
  const [cursos] = await Promise.all([obtenerCursosVigentes(), pintarGaleria()]);
  pintarCursos(cursos);
} catch (e) {
  console.error(e);
  rejilla.innerHTML = '<li class="sin-resultados">No pudimos cargar los cursos. Intenta de nuevo en un momento.</li>';
}
activarApariciones();
