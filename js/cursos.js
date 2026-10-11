// Página: cursos.html — próximos cursos (vigentes) con su tarjeta.
// Si llega una búsqueda del header (/cursos?q=...), muestra solo los que coinciden.
import { iniciarPagina, esc, boton, tarjetaCurso, activarBarras } from './componentes.js';
import { obtenerCursosVigentes, buscarCursos } from './datos.js';

iniciarPagina();

const rejilla = document.querySelector('[data-rejilla-cursos]');
const estado = document.querySelector('[data-estado-cursos]');
const consulta = new URLSearchParams(location.search).get('q')?.trim();

if (consulta) {
  document.querySelector('[data-consulta]').innerHTML =
    `<p class="texto-secundario" style="padding-top:var(--e-8)">Resultados para <strong class="texto-destacado">“${esc(consulta)}”</strong></p>`;
}

try {
  const cursos = consulta ? await buscarCursos(consulta) : await obtenerCursosVigentes();
  rejilla.innerHTML = cursos.length
    ? cursos.map((c) => `<li>${tarjetaCurso(c, { nivelTitulo: 2 })}</li>`).join('')
    : `<li class="sin-resultados">
         <p>${consulta ? 'No encontramos próximos cursos con esa búsqueda.' : 'Por ahora no hay cursos abiertos.'}</p>
         ${consulta ? boton({ texto: 'Ver todos los cursos', href: '/cursos', variante: 'texto', icono: 'flecha-derecha' }) : ''}
       </li>`;
  estado.textContent = cursos.length === 1 ? '1 curso' : `${cursos.length} cursos`;
  activarBarras(rejilla);
} catch (e) {
  console.error(e);
  rejilla.innerHTML = '<li class="sin-resultados">No pudimos cargar los cursos. Intenta de nuevo en un momento.</li>';
}
