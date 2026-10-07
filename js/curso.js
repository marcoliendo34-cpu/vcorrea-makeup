// Página: curso.html — se sirve en /cursos/:slug (ver vercel.json)
import { iniciarPagina, esc } from './componentes.js';
import { obtenerCursoPorSlug } from './datos.js';
import { rangoFechas } from './fechas.js';

iniciarPagina();

const slug = decodeURIComponent(location.pathname.replace(/^\/cursos\//, '').replace(/\/$/, ''));
const zona = document.querySelector('[data-encabezado-curso]');
const curso = slug && slug !== location.pathname ? await obtenerCursoPorSlug(slug) : null;

if (curso) {
  document.title = `${curso.nombre} · Verónica Correa Makeup`;
  zona.innerHTML = `
    <p class="etiqueta">${esc(curso.categoria)} · ${esc(curso.nivel)}</p>
    <h1>${esc(curso.nombre)}</h1>
    <p class="encabezado-pagina__intro">${esc(curso.subtitulo)}</p>
    <p class="texto-secundario" style="margin-top:var(--e-3)">${rangoFechas(curso.fechaInicio, curso.fechaFin)} · ${esc(curso.modalidad)}</p>`;
} else {
  document.title = 'Curso no encontrado · Verónica Correa Makeup';
  zona.innerHTML = `
    <p class="etiqueta">Curso</p>
    <h1>No encontramos este curso</h1>
    <p class="encabezado-pagina__intro">Puede que ya no esté disponible. <a href="/cursos">Ver todos los cursos</a>.</p>`;
}
