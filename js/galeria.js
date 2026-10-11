// Página: galeria.html — mosaico tipo masonry, chips de categoría y visor.
import { iniciarPagina, esc, placeholderFoto, boton } from './componentes.js';
import { obtenerGaleria, obtenerCategoriasGaleria } from './datos.js';
import { abrirVisor } from './visor.js';

iniciarPagina();

const zonaChips = document.querySelector('[data-chips-galeria]');
const lista = document.querySelector('[data-masonry]');
const estado = document.querySelector('[data-estado-galeria]');

const categorias = await obtenerCategoriasGaleria();
const nombreCategoria = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
let fotosVisibles = [];

/* ------------------------------ chips -------------------------------- */

const inicial = new URLSearchParams(location.search).get('categoria');
let actual = categorias.some((c) => c.id === inicial) ? inicial : 'todas';

zonaChips.innerHTML = [{ id: 'todas', nombre: 'Todos' }, ...categorias].map((c) =>
  `<button class="chip" type="button" data-categoria="${esc(c.id)}" aria-pressed="${c.id === actual}">${esc(c.nombre)}</button>`
).join('');

zonaChips.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-categoria]');
  if (!chip || chip.dataset.categoria === actual) return;
  actual = chip.dataset.categoria;
  zonaChips.querySelectorAll('[data-categoria]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  // La categoría queda en la dirección para poder compartirla
  const url = new URL(location.href);
  if (actual === 'todas') url.searchParams.delete('categoria'); else url.searchParams.set('categoria', actual);
  history.replaceState(null, '', url);
  pintar();
});

/* ----------------------------- mosaico -------------------------------- */

// La primera foto carga de inmediato: es lo primero que se ve (LCP).
function htmlFoto(f, i) {
  const alto600 = Math.round(600 * f.alto / f.ancho);
  const media = f.miniatura
    ? `<img src="${esc(f.miniatura)}" alt="${esc(f.alt)}" width="600" height="${alto600}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`
    : placeholderFoto({ descripcion: f.alt, proporcion: `${f.ancho} / ${f.alto}`, sinBorde: true });
  return `
    <li class="masonry__item">
      <button class="masonry__boton" type="button" data-foto="${i}">
        <span class="solo-lectores">Ampliar: </span>
        ${media}
        <span class="masonry__categoria" aria-hidden="true">${esc(nombreCategoria[f.categoria] || '')}</span>
      </button>
    </li>`;
}

async function pintar() {
  fotosVisibles = await obtenerGaleria({ categoria: actual });
  lista.innerHTML = fotosVisibles.length
    ? fotosVisibles.map(htmlFoto).join('')
    : `<li class="sin-resultados">
         <p>Aún no hay fotos en esta categoría.</p>
         ${boton({ texto: 'Ver todas las fotos', href: '/galeria', variante: 'texto', icono: 'flecha-derecha' })}
       </li>`;
  const n = fotosVisibles.length;
  estado.textContent = `${n === 1 ? '1 foto' : `${n} fotos`}${actual === 'todas' ? '' : ` en ${nombreCategoria[actual]}`}`;
}

lista.addEventListener('click', (e) => {
  const b = e.target.closest('[data-foto]');
  if (!b) return;
  const fotos = fotosVisibles.map((f) => ({
    grande: f.grande, alt: f.alt, ancho: f.ancho, alto: f.alto,
    pie: `${f.alt} · ${nombreCategoria[f.categoria] || ''}`
  }));
  abrirVisor(fotos, Number(b.dataset.foto), b);
});

await pintar();
