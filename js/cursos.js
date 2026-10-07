// Página: cursos.html
import { iniciarPagina, esc } from './componentes.js';

iniciarPagina();

// Búsqueda que llega desde el buscador del header: /cursos?q=...
const consulta = new URLSearchParams(location.search).get('q')?.trim();
if (consulta) {
  document.querySelector('[data-consulta]').innerHTML =
    `<p class="texto-secundario" style="padding-top:var(--e-8)">Resultados para <strong class="texto-destacado">“${esc(consulta)}”</strong></p>`;
}
