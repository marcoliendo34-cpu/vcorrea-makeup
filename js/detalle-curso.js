// Secciones de la ficha de un curso que se reutilizan en varias páginas:
// - curso.html (ficha completa)
// - cursos-anteriores.html (resumen y pensum en modo lectura, dentro de cada tarjeta)
//
// Opciones comunes de cada función:
//   prefijo  antepone texto a los id (ej. 'pieles-perfectas-2026-') para que no
//            se repitan cuando hay varios cursos en la misma página.
//   nivel    nivel del título de la sección (2 en la ficha, 3 dentro de una tarjeta).
//   aparecer agrega data-aparecer (fundido al entrar en pantalla).

import { esc, textoDuracion, placeholderFoto } from './componentes.js';
import { icono } from './iconos.js';
import { formatearFecha } from './fechas.js';

const ops = ({ prefijo = '', nivel = 2, aparecer = true } = {}) => ({
  id: (base) => `${prefijo}${base}`,
  h: `h${nivel}`,
  hSub: `h${Math.min(nivel + 1, 6)}`,
  aparecer: aparecer ? ' data-aparecer' : ''
});

export const lista = (items, clase = 'lista-marcas') =>
  `<ul class="${clase}">${items.map((t) => `<li>${icono('check', { tamano: 18, clase: 'lista-marcas__marca' })}<span>${esc(t)}</span></li>`).join('')}</ul>`;

export const encabezado = ({ etiqueta, titulo, id, h = 'h2' }) => `
  <header class="curso-seccion__encabezado">
    ${etiqueta ? `<p class="etiqueta">${esc(etiqueta)}</p>` : ''}
    <${h}${id ? ` id="${id}"` : ''}>${esc(titulo)}</${h}>
  </header>`;

export function datosFicha(curso) {
  return [
    { icono: 'calendario', etiqueta: 'Inicio', valor: formatearFecha(curso.fechaInicio), detalle: curso.fechaFin !== curso.fechaInicio ? `Termina el ${formatearFecha(curso.fechaFin)}` : '' },
    { icono: 'reloj', etiqueta: 'Días y horario', valor: curso.dias, detalle: curso.horario },
    { icono: 'duracion', etiqueta: 'Duración', valor: textoDuracion(curso.semanas) },
    { icono: 'clases', etiqueta: 'Clases', valor: curso.totalClases === 1 ? '1 clase' : `${curso.totalClases} clases` },
    { icono: curso.modalidad === 'Online' ? 'video' : 'ubicacion', etiqueta: 'Modalidad', valor: curso.modalidad, detalle: curso.ubicacion },
    { icono: 'nivel', etiqueta: 'Nivel', valor: curso.nivel }
  ];
}

export function htmlFicha(curso, opciones) {
  const o = ops(opciones);
  return `
  <section class="curso-seccion" id="${o.id('detalles')}" aria-labelledby="${o.id('t-detalles')}"${o.aparecer}>
    ${encabezado({ etiqueta: 'Ficha rápida', titulo: 'Detalles del curso', id: o.id('t-detalles'), h: o.h })}
    <dl class="ficha">
      ${datosFicha(curso).map((d) => `
        <div class="ficha__item">
          <span class="ficha__icono">${icono(d.icono, { tamano: 22 })}</span>
          <dt>${esc(d.etiqueta)}</dt>
          <dd><span class="ficha__valor">${esc(d.valor)}</span>${d.detalle ? `<span class="ficha__detalle">${esc(d.detalle)}</span>` : ''}</dd>
        </div>`).join('')}
    </dl>
  </section>`;
}

export function htmlSobre(curso, opciones) {
  const o = ops(opciones);
  return `
  <section class="curso-seccion" aria-labelledby="${o.id('t-sobre')}"${o.aparecer}>
    ${encabezado({ titulo: 'Sobre el curso', id: o.id('t-sobre'), h: o.h })}
    <p class="curso-seccion__intro">${esc(curso.descripcion)}</p>
    ${curso.dirigidoA?.length ? `<${o.hSub} class="curso-seccion__subtitulo">Dirigido a</${o.hSub}>${lista(curso.dirigidoA)}` : ''}
  </section>`;
}

export function htmlIncluye(curso, opciones) {
  const o = ops(opciones);
  return `
  <section class="curso-seccion" id="${o.id('incluye')}" aria-labelledby="${o.id('t-incluye')}"${o.aparecer}>
    ${encabezado({ titulo: 'Qué incluye', id: o.id('t-incluye'), h: o.h })}
    ${lista(curso.incluye, 'lista-marcas lista-marcas--columnas')}
  </section>`;
}

export function htmlPensum(curso, opciones) {
  const o = ops(opciones);
  const semanas = curso.pensum.map((s, i) => `
    <details class="acordeon__item"${i === 0 ? ' open' : ''}>
      <summary class="acordeon__resumen">
        <span class="acordeon__titulo"><span class="acordeon__numero">Semana ${s.semana}</span> · ${esc(s.titulo)}</span>
        <span class="acordeon__meta">${s.temas.length === 1 ? '1 tema' : `${s.temas.length} temas`}</span>
        ${icono('chevron-abajo', { tamano: 20, clase: 'acordeon__flecha' })}
      </summary>
      <div class="acordeon__contenido">
        <ul class="lista-temas">${s.temas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>
    </details>`).join('');
  return `
  <section class="curso-seccion" id="${o.id('pensum')}" aria-labelledby="${o.id('t-pensum')}"${o.aparecer}>
    ${encabezado({ etiqueta: `${textoDuracion(curso.semanas)} · ${curso.totalClases} clases`, titulo: 'Pensum', id: o.id('t-pensum'), h: o.h })}
    <div class="acordeon">${semanas}</div>
  </section>`;
}

export function htmlPracticas(curso, opciones) {
  if (!curso.practicas?.length) return '';
  const o = ops(opciones);
  return `
  <section class="curso-seccion" id="${o.id('practicas')}" aria-labelledby="${o.id('t-practicas')}"${o.aparecer}>
    ${encabezado({ titulo: 'Prácticas', id: o.id('t-practicas'), h: o.h })}
    <ul class="practicas">
      ${curso.practicas.map((p) => `
        <li class="practica">
          <${o.hSub}>${esc(p.titulo)}</${o.hSub}>
          <p>${esc(p.descripcion)}</p>
          ${p.requiereModelo ? `<p class="practica__modelo">${icono('usuario', { tamano: 18 })}<span>Trae tu modelo</span></p>` : ''}
        </li>`).join('')}
    </ul>
  </section>`;
}

export function htmlRequisitos(curso, opciones) {
  if (!curso.requisitos?.length) return '';
  const o = ops(opciones);
  return `
  <section class="curso-seccion" aria-labelledby="${o.id('t-requisitos')}"${o.aparecer}>
    ${encabezado({ titulo: 'Requisitos y qué traer', id: o.id('t-requisitos'), h: o.h })}
    <ul class="lista-puntos">${curso.requisitos.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  </section>`;
}

export function htmlCertificado(curso, opciones) {
  if (!curso.certificado?.incluye) return '';
  const o = ops(opciones);
  return `
  <section class="curso-certificado" aria-labelledby="${o.id('t-certificado')}"${o.aparecer}>
    <span class="curso-certificado__icono">${icono('certificado', { tamano: 24 })}</span>
    <div>
      <${o.h} id="${o.id('t-certificado')}">Certificado</${o.h}>
      <p>${esc(curso.certificado.descripcion)}</p>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* Mini galería del curso (abre el visor)                              */
/* ------------------------------------------------------------------ */

/** Fotos del curso en el formato del visor. */
export const fotosParaVisor = (curso) => (curso.galeria || []).map((f) => ({
  grande: f.src, alt: f.alt, pie: `${f.alt} · ${curso.nombre}`, ancho: 4, alto: 3
}));

/**
 * Fila de miniaturas cuadradas. Cada una es un botón con data-mini-galeria y
 * data-indice; la página abre el visor con abrirVisor(fotosParaVisor(curso), i).
 */
export function htmlMiniGaleria(curso, { max = 3 } = {}) {
  const fotos = (curso.galeria || []).slice(0, max);
  if (!fotos.length) return '';
  return `
    <ul class="mini-galeria" aria-label="Fotos de ${esc(curso.nombre)}">
      ${fotos.map((f, i) => `
        <li>
          <button class="mini-galeria__boton" type="button" data-mini-galeria="${esc(curso.slug)}" data-indice="${i}">
            <span class="solo-lectores">Ampliar: </span>
            ${(f.miniatura || f.src)
              ? `<img src="${esc(f.miniatura || f.src)}" alt="${esc(f.alt)}" width="300" height="300" loading="lazy" decoding="async">`
              : placeholderFoto({ descripcion: f.alt, proporcion: '1 / 1', sinBorde: true })}
          </button>
        </li>`).join('')}
    </ul>`;
}
