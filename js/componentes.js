// Componentes compartidos. Cada función devuelve HTML como texto
// para insertarlo con innerHTML / insertAdjacentHTML.
// Header, footer y botón flotante de WhatsApp se agregan aquí en el paso
// de páginas, para que sean idénticos en todo el sitio.

import { CONFIG } from './config.js';
import { icono } from './iconos.js';
import { calcularCupos } from './cupos.js';
import { ESTADOS_INSCRIPCION } from './inscripcion.js';

/** Escapa texto para insertarlo en HTML. */
export function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ------------------------------------------------------------------ */
/* Botón                                                               */
/* ------------------------------------------------------------------ */

/**
 * @param {object} op
 * @param {string} op.texto
 * @param {string} [op.href]           Si existe, se dibuja como enlace.
 * @param {'principal'|'secundario'|'claro'|'texto'} [op.variante='principal']
 * @param {'normal'|'grande'} [op.tamano='normal']
 * @param {string} [op.icono]           Ícono a la derecha.
 * @param {string} [op.iconoIzquierda]  Ícono a la izquierda.
 * @param {boolean} [op.desactivado]
 * @param {boolean} [op.bloque]         Ancho completo.
 * @param {'button'|'submit'} [op.tipo='button']
 * @param {string} [op.clase]
 * @param {object} [op.atributos]       Atributos extra (data-*, aria-*).
 */
export function boton({
  texto, href, variante = 'principal', tamano = 'normal', icono: iconoDer,
  iconoIzquierda, desactivado = false, bloque = false, tipo = 'button',
  clase = '', atributos = {}
}) {
  const clases = [
    'boton', `boton--${variante}`,
    tamano === 'grande' && 'boton--grande',
    bloque && 'boton--bloque',
    clase
  ].filter(Boolean).join(' ');

  const extra = Object.entries(atributos)
    .map(([k, v]) => ` ${k}="${esc(v)}"`).join('');

  const contenido =
    (iconoIzquierda ? icono(iconoIzquierda, { tamano: 18 }) : '') +
    `<span>${esc(texto)}</span>` +
    (iconoDer ? icono(iconoDer, { tamano: 18 }) : '');

  if (href && !desactivado) {
    return `<a class="${clases}" href="${esc(href)}"${extra}>${contenido}</a>`;
  }
  if (href && desactivado) {
    return `<a class="${clases}" aria-disabled="true" role="link"${extra}>${contenido}</a>`;
  }
  return `<button class="${clases}" type="${tipo}"${desactivado ? ' disabled' : ''}${extra}>${contenido}</button>`;
}

/** Botón cuadrado solo con ícono (ej. guardar curso). */
export function botonIcono({ icono: nombre, etiqueta, variante = 'secundario', clase = '', atributos = {} }) {
  const extra = Object.entries(atributos).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  return `<button class="boton boton--${variante} boton--icono ${clase}" type="button" aria-label="${esc(etiqueta)}"${extra}>${icono(nombre, { tamano: 20 })}</button>`;
}

/* ------------------------------------------------------------------ */
/* Etiqueta y título de sección                                        */
/* ------------------------------------------------------------------ */

/** Etiqueta pequeña en mayúsculas espaciadas (eyebrow). */
export function etiqueta(texto, { variante = '', etiquetaHtml = 'p' } = {}) {
  const clase = ['etiqueta', variante && `etiqueta--${variante}`].filter(Boolean).join(' ');
  return `<${etiquetaHtml} class="${clase}">${esc(texto)}</${etiquetaHtml}>`;
}

/**
 * Etiqueta + título en Cormorant + línea dorada de 48px y enlace opcional a la derecha.
 * @param {object} op
 * @param {string} [op.etiqueta]
 * @param {string} op.titulo
 * @param {{texto:string, href:string}} [op.enlace]
 * @param {number} [op.nivel=2]
 * @param {boolean} [op.centrado]
 * @param {string} [op.id]   id del título (para aria-labelledby de la sección).
 */
export function tituloSeccion({ etiqueta: eyebrow, titulo, enlace, nivel = 2, centrado = false, id }) {
  const h = `h${nivel}`;
  return `
    <div class="titulo-seccion${centrado ? ' titulo-seccion--centrado' : ''}">
      <div class="titulo-seccion__texto">
        ${eyebrow ? etiqueta(eyebrow) : ''}
        <${h} class="titulo-seccion__titulo"${id ? ` id="${esc(id)}"` : ''}>${esc(titulo)}</${h}>
      </div>
      ${enlace && !centrado ? `<div class="titulo-seccion__enlace">${boton({ texto: enlace.texto, href: enlace.href, variante: 'texto', icono: 'flecha-derecha' })}</div>` : ''}
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Insignias                                                           */
/* ------------------------------------------------------------------ */

const INSIGNIAS = {
  ultimos: 'Últimos cupos',
  agotado: 'Agotado',
  finalizado: ESTADOS_INSCRIPCION.finalizado,
  pendiente: ESTADOS_INSCRIPCION.pendiente,
  confirmada: ESTADOS_INSCRIPCION.confirmada
};

/**
 * @param {'ultimos'|'agotado'|'finalizado'|'pendiente'|'confirmada'} tipo
 * @param {string} [texto]  Para sobrescribir el texto por defecto.
 */
export function insignia(tipo, texto) {
  const t = texto ?? INSIGNIAS[tipo] ?? tipo;
  return `<span class="insignia insignia--${esc(tipo)}">${esc(t)}</span>`;
}

/** Insignia según el estado de cupos: solo hay insignia para "ultimos" y "agotado". */
export function insigniaCupos(inscritas, cupos) {
  const { estado } = calcularCupos(inscritas, cupos);
  return estado === 'disponible' ? '' : insignia(estado);
}

/* ------------------------------------------------------------------ */
/* Barra de progreso de inscripción                                    */
/* ------------------------------------------------------------------ */

/**
 * Barra de 6px que se llena al entrar en pantalla (ver activarBarras()).
 * Texto: "Inscripciones · 87%" y "Quedan 2 cupos".
 */
export function barraProgreso({ inscritas, cupos, mostrarRestantes = true }) {
  const c = calcularCupos(inscritas, cupos);
  return `
    <div class="progreso progreso--${c.estado}" style="--valor:${c.porcentaje / 100}">
      <div class="progreso__barra" role="progressbar" aria-valuemin="0" aria-valuemax="100"
           aria-valuenow="${c.porcentaje}" aria-label="Inscripciones">
        <div class="progreso__relleno"></div>
      </div>
      <div class="progreso__datos">
        <span class="progreso__porcentaje">Inscripciones · <strong>${c.porcentaje}%</strong></span>
        ${mostrarRestantes ? `<span class="progreso__restantes">${esc(c.textoRestantes)}</span>` : ''}
      </div>
    </div>`;
}

/** Activa la animación de las barras cuando entran en pantalla. */
export function activarBarras(raiz = document) {
  const barras = raiz.querySelectorAll('.progreso:not(.es-visible)');
  if (!barras.length) return;
  if (!('IntersectionObserver' in window)) {
    barras.forEach((b) => b.classList.add('es-visible'));
    return;
  }
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('es-visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  barras.forEach((b) => obs.observe(b));
}

/* ------------------------------------------------------------------ */
/* Placeholder de imagen                                               */
/* ------------------------------------------------------------------ */

/**
 * Bloque crema con "Foto: [descripción]" centrado. Se usa mientras falte la foto real.
 * @param {object} op
 * @param {string} op.descripcion
 * @param {string} [op.proporcion='4 / 3']  ej. '16 / 9', '4 / 5', '1 / 1'
 * @param {boolean} [op.sinBorde]
 */
export function placeholderFoto({ descripcion, proporcion = '4 / 3', sinBorde = false, clase = '' }) {
  const texto = `Foto: ${descripcion}`;
  return `
    <div class="placeholder-foto${sinBorde ? ' placeholder-foto--sin-borde' : ''} ${clase}"
         style="--proporcion:${esc(proporcion)}" role="img" aria-label="${esc(texto)}">
      <span class="placeholder-foto__texto" aria-hidden="true">${esc(texto)}</span>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* Logotipo tipográfico                                                */
/* ------------------------------------------------------------------ */

/**
 * @param {object} [op]
 * @param {'horizontal'|'apilado'} [op.version='horizontal']  Header u footer.
 * @param {'tinta'|'blanco'} [op.color='tinta']
 * @param {string|null} [op.href='/']  null para dibujarlo sin enlace.
 */
export function logo({ version = 'horizontal', color = 'tinta', href = '/' } = {}) {
  const { nombre, sub, monograma } = CONFIG.marca;
  const clases = ['logo', `logo--${version}`, color === 'blanco' && 'logo--blanco'].filter(Boolean).join(' ');
  const interior = `
      <span class="logo__monograma" aria-hidden="true">${esc(monograma)}</span>
      <span class="logo__texto">
        <span class="logo__nombre">${esc(nombre)}</span>
        <span class="logo__sub">${esc(sub.toUpperCase())}</span>
      </span>`;
  return href
    ? `<a class="${clases}" href="${esc(href)}" aria-label="${esc(`${nombre} Makeup, inicio`)}">${interior}</a>`
    : `<span class="${clases}" role="img" aria-label="${esc(`${nombre} Makeup`)}">${interior}</span>`;
}

/* ------------------------------------------------------------------ */
/* Enlace de WhatsApp                                                  */
/* ------------------------------------------------------------------ */

/** URL de wa.me con mensaje prellenado opcional. */
export function urlWhatsApp(mensaje = '') {
  const base = `https://wa.me/${CONFIG.whatsapp.numero}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
