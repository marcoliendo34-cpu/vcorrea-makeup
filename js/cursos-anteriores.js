// Página: cursos-anteriores.html
// 1. Cursos finalizados (si hay): cada tarjeta muestra fechas, egresadas y una
//    mini galería, y se despliega para ver el resumen y el pensum (secciones de
//    js/detalle-curso.js en modo lectura: sin inscripción ni precio).
// 2. Fotos de entregas de certificado (galería, `enAnteriores: true`) y el aviso
//    "Próximamente más información".
import { iniciarPagina, esc, insignia, boton, urlWhatsApp, activarApariciones, textoDuracion, tituloSeccion } from './componentes.js';
import { icono } from './iconos.js';
import { obtenerCursosAnteriores, obtenerGaleria } from './datos.js';
import { rangoFechas } from './fechas.js';
import { htmlSobre, htmlPensum, htmlMiniGaleria, fotosParaVisor } from './detalle-curso.js';
import { mensajeRepetir } from './inscripcion.js';
import { abrirVisor } from './visor.js';

document.querySelector('[data-boton-cierre]').innerHTML = boton({
  texto: 'Escríbele por WhatsApp', href: urlWhatsApp(mensajeRepetir()), iconoIzquierda: 'whatsapp',
  tamano: 'grande', atributos: { target: '_blank', rel: 'noopener' }
});

document.querySelector('[data-titulo-certificados]').innerHTML = tituloSeccion({
  etiqueta: 'Egresadas', titulo: 'Entregas de certificado', id: 'titulo-certificados'
});

iniciarPagina();

const lista = document.querySelector('[data-anteriores]');

function tarjeta(curso) {
  const prefijo = `${curso.slug}-`;
  const lectura = { prefijo, nivel: 3, aparecer: false };
  return `
    <li>
      <article class="anterior" aria-labelledby="${prefijo}nombre" data-aparecer>
        <div class="anterior__principal">
          <div class="anterior__info">
            <div class="anterior__cabeza">
              ${insignia('finalizado')}
              <span class="anterior__meta">${esc(curso.categoria)} · ${esc(curso.modalidad)}</span>
            </div>
            <h2 class="anterior__nombre" id="${prefijo}nombre">${esc(curso.nombre)}</h2>
            <p class="anterior__subtitulo">${esc(curso.subtitulo)}</p>
            <dl class="anterior__datos">
              <div><dt>Fechas</dt><dd>${esc(rangoFechas(curso.fechaInicio, curso.fechaFin))}</dd></div>
              <div><dt>Egresadas</dt><dd>${curso.egresadas ?? '—'}</dd></div>
              <div><dt>Duración</dt><dd>${esc(textoDuracion(curso.semanas))}</dd></div>
            </dl>
          </div>
          ${htmlMiniGaleria(curso)}
        </div>
        <details class="anterior__detalle">
          <summary class="anterior__abrir">
            <span class="anterior__abrir-texto" data-cerrado>Ver resumen y pensum</span>
            <span class="anterior__abrir-texto" data-abierto>Ocultar resumen y pensum</span>
            ${icono('chevron-abajo', { tamano: 20, clase: 'acordeon__flecha' })}
          </summary>
          <div class="anterior__contenido">
            ${htmlSobre(curso, lectura)}
            ${htmlPensum(curso, lectura)}
            ${boton({ texto: 'Ver ficha completa', href: `/cursos/${encodeURIComponent(curso.slug)}`, variante: 'texto', icono: 'flecha-derecha' })}
          </div>
        </details>
      </article>
    </li>`;
}

/* ----------------------------- fotos ---------------------------------- */

const zonaFotos = document.querySelector('[data-fotos-anteriores]');
const fotos = await obtenerGaleria({ soloAnteriores: true });
zonaFotos.innerHTML = fotos.map((f, i) => `
  <li class="masonry__item">
    <button class="masonry__boton" type="button" data-foto-anterior="${i}">
      <span class="solo-lectores">Ampliar: </span>
      <img src="${esc(f.miniatura)}" alt="${esc(f.alt)}" width="600" height="${Math.round(600 * f.alto / f.ancho)}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">
    </button>
  </li>`).join('');
zonaFotos.addEventListener('click', (e) => {
  const b = e.target.closest('[data-foto-anterior]');
  if (!b) return;
  abrirVisor(fotos.map((f) => ({ grande: f.grande, alt: f.alt, ancho: f.ancho, alto: f.alto, pie: f.alt })), Number(b.dataset.fotoAnterior), b);
});

/* ------------------------- cursos finalizados -------------------------- */

const cursos = await obtenerCursosAnteriores();
if (cursos.length) {
  lista.innerHTML = cursos.map(tarjeta).join('');
  document.querySelector('[data-seccion-anteriores]').hidden = false;
}
activarApariciones();

lista.addEventListener('click', (e) => {
  const b = e.target.closest('[data-mini-galeria]');
  if (!b) return;
  const curso = cursos.find((c) => c.slug === b.dataset.miniGaleria);
  abrirVisor(fotosParaVisor(curso), Number(b.dataset.indice), b);
});
