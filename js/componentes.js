// Componentes compartidos. Las funciones de piezas devuelven HTML como texto
// para insertarlo con innerHTML / insertAdjacentHTML.
// Header, menú móvil, buscador, footer y botón flotante de WhatsApp se dibujan
// aquí con iniciarPagina(), para que sean idénticos en todo el sitio.

import { CONFIG } from './config.js';
import { icono } from './iconos.js';
import { calcularCupos } from './cupos.js';
import { ESTADOS_INSCRIPCION } from './inscripcion.js';
import { obtenerSesion, inicialAlumna } from './sesion.js';
import { buscarCursos, obtenerCursosVigentes, normalizar } from './datos.js';
import { formatearFecha } from './fechas.js';

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

/* ================================================================== */
/* ESTRUCTURA DEL SITIO                                                */
/* ================================================================== */

/** Enlaces principales. `id` coincide con <body data-pagina="…">. */
export const NAVEGACION = [
  { id: 'inicio', texto: 'Inicio', href: '/' },
  { id: 'cursos', texto: 'Cursos', href: '/cursos' },
  { id: 'sobre-veronica', texto: 'Sobre Verónica', href: '/sobre-veronica' },
  { id: 'galeria', texto: 'Galería', href: '/galeria' },
  { id: 'cursos-anteriores', texto: 'Cursos anteriores', href: '/cursos-anteriores' },
  { id: 'contacto', texto: 'Contacto', href: '/contacto' }
];

/** El detalle del curso marca "Cursos" como página activa. */
const ACTIVA_EQUIVALENTE = { curso: 'cursos' };

export const MENSAJE_WHATSAPP = 'Hola Verónica, vengo de tu web y quiero información sobre tus cursos.';

const actual = (id, activa) => (id === activa ? ' aria-current="page"' : '');

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function htmlCuenta(sesion) {
  return `
    <a class="cuenta" href="/mi-cuenta">
      <span class="cuenta__inicial" aria-hidden="true">${esc(inicialAlumna(sesion))}</span>
      <span>Mi cuenta</span>
    </a>`;
}

function htmlHeader(activa, sesion) {
  const enlaces = NAVEGACION.map((n) => `
        <li><a class="header__enlace" href="${n.href}"${actual(n.id, activa)}>${esc(n.texto)}</a></li>`).join('');

  const acciones = sesion
    ? htmlCuenta(sesion)
    : `<a class="header__enlace-texto" href="/ingresar">Iniciar sesión</a>
       ${boton({ texto: 'Registrarme', href: '/registro' })}`;

  return `
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  <header class="header" data-header>
    <div class="contenedor header__fila">
      ${logo({ version: 'horizontal' })}
      <nav class="header__nav" aria-label="Principal">
        <ul class="header__lista">${enlaces}
        </ul>
      </nav>
      <div class="header__acciones">
        <button class="header__icono" type="button" data-abrir-buscador
                aria-label="Buscar cursos" aria-haspopup="dialog" aria-controls="buscador">
          ${icono('buscar', { tamano: 22 })}
        </button>
        <div class="header__escritorio">${acciones}</div>
        <button class="header__icono header__abrir-menu" type="button" data-abrir-menu
                aria-label="Abrir menú" aria-haspopup="dialog" aria-expanded="false" aria-controls="menu-movil">
          ${icono('menu', { tamano: 24 })}
        </button>
      </div>
    </div>
  </header>`;
}

/* ------------------------------------------------------------------ */
/* Menú móvil                                                          */
/* ------------------------------------------------------------------ */

function htmlMenuMovil(activa, sesion) {
  const enlaces = NAVEGACION.map((n) => `
        <li><a class="menu-movil__enlace" href="${n.href}"${actual(n.id, activa)}>${esc(n.texto)}</a></li>`).join('');

  const acciones = sesion
    ? htmlCuenta(sesion)
    : `<div class="menu-movil__botones">
         ${boton({ texto: 'Iniciar sesión', href: '/ingresar', variante: 'secundario', tamano: 'grande', bloque: true })}
         ${boton({ texto: 'Registrarme', href: '/registro', tamano: 'grande', bloque: true })}
       </div>`;

  return `
  <div class="capa menu-movil" id="menu-movil" role="dialog" aria-modal="true" aria-label="Menú" data-menu>
    <div class="contenedor menu-movil__barra">
      ${logo({ version: 'horizontal' })}
      <button class="header__icono" type="button" data-cerrar-menu aria-label="Cerrar menú">
        ${icono('cerrar', { tamano: 24 })}
      </button>
    </div>
    <nav class="contenedor menu-movil__nav" aria-label="Menú principal">
      <ul class="menu-movil__lista">${enlaces}
      </ul>
    </nav>
    <div class="contenedor menu-movil__pie">
      ${acciones}
      <p class="menu-movil__contacto">WhatsApp ${esc(CONFIG.whatsapp.numeroVisible)}</p>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Buscador                                                            */
/* ------------------------------------------------------------------ */

function htmlBuscador() {
  return `
  <div class="capa buscador" id="buscador" role="dialog" aria-modal="true" aria-label="Buscar cursos" data-buscador>
    <div class="buscador__fondo" data-cerrar-buscador></div>
    <div class="buscador__panel">
      <div class="contenedor">
        <form class="buscador__form" action="/cursos" method="get" role="search" data-form-buscador>
          ${icono('buscar', { tamano: 24 })}
          <label class="solo-lectores" for="campo-buscador">¿Qué quieres aprender?</label>
          <input class="buscador__campo" id="campo-buscador" name="q" type="search"
                 placeholder="¿Qué quieres aprender?" autocomplete="off" enterkeyhint="search"
                 aria-describedby="estado-buscador">
          <button class="header__icono" type="button" data-cerrar-buscador aria-label="Cerrar buscador">
            ${icono('cerrar', { tamano: 24 })}
          </button>
        </form>
      </div>
      <div class="buscador__cuerpo">
        <div class="contenedor">
          <p class="solo-lectores" id="estado-buscador" aria-live="polite"></p>
          <div data-resultados></div>
        </div>
      </div>
    </div>
  </div>`;
}

/** Resalta las coincidencias en el nombre (sin importar acentos). */
function resaltar(nombre, consulta) {
  const palabras = normalizar(consulta).split(' ').filter((p) => p.length > 1);
  if (!palabras.length) return esc(nombre);
  const base = normalizar(nombre);
  const marcas = new Array(nombre.length).fill(false);
  palabras.forEach((p) => {
    let i = base.indexOf(p);
    while (i !== -1) { for (let k = i; k < i + p.length; k++) marcas[k] = true; i = base.indexOf(p, i + 1); }
  });
  // normalizar() conserva la longitud letra a letra en nombres de cursos (sin ligaduras).
  if (base.length !== nombre.length) return esc(nombre);
  let html = '', abierto = false;
  [...nombre].forEach((letra, i) => {
    if (marcas[i] && !abierto) { html += '<mark>'; abierto = true; }
    if (!marcas[i] && abierto) { html += '</mark>'; abierto = false; }
    html += esc(letra);
  });
  return html + (abierto ? '</mark>' : '');
}

function htmlResultado(c, consulta) {
  return `
    <li>
      <a class="resultado" href="/cursos/${encodeURIComponent(c.slug)}">
        <span class="resultado__texto">
          <span class="resultado__nombre">${resaltar(c.nombre, consulta)}</span>
          <span class="resultado__meta">${formatearFecha(c.fechaInicio)} · ${esc(c.modalidad)}</span>
        </span>
        ${icono('flecha-derecha', { tamano: 20 })}
      </a>
    </li>`;
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function htmlRedes() {
  const ig = CONFIG.redes.instagram;
  const instagram = ig
    ? `<a class="pie__red" href="${esc(ig.url)}" target="_blank" rel="noopener" aria-label="Instagram ${esc(ig.usuario)}">${icono('instagram')}</a>`
    : `<span class="pie__red pie__red--pendiente" role="img" aria-label="Instagram: [POR DEFINIR]" title="Instagram [POR DEFINIR]">${icono('instagram')}</span>`;
  const whatsapp = `<a class="pie__red" href="${urlWhatsApp(MENSAJE_WHATSAPP)}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(CONFIG.whatsapp.numeroVisible)}">${icono('whatsapp')}</a>`;
  return `<div class="pie__redes">${instagram}${whatsapp}</div>`;
}

function htmlFooter(sesion) {
  const anio = new Date().getFullYear();
  const ig = CONFIG.redes.instagram;
  const cuenta = sesion
    ? `<li><a href="/mi-cuenta">Mi cuenta</a></li>`
    : `<li><a href="/registro">Registrarme</a></li>
       <li><a href="/ingresar">Iniciar sesión</a></li>`;

  return `
  <footer class="pie">
    <div class="contenedor pie__principal">
      <div class="pie__marca">
        ${logo({ version: 'apilado' })}
        <p class="pie__frase">[EJEMPLO] Formación en maquillaje con técnica, paciencia y mucho cariño por los detalles.</p>
        ${htmlRedes()}
      </div>
      <div class="pie__columnas">
        <div class="pie__columna">
          <h2>El sitio</h2>
          <ul class="pie__lista">
            ${NAVEGACION.map((n) => `<li><a href="${n.href}">${esc(n.texto)}</a></li>`).join('')}
          </ul>
        </div>
        <div class="pie__columna">
          <h2>Alumnas</h2>
          <ul class="pie__lista">
            <li><a href="/cursos">Próximos cursos</a></li>
            ${cuenta}
          </ul>
        </div>
        <div class="pie__columna pie__contacto">
          <h2>Contacto</h2>
          <ul class="pie__lista">
            <li><a href="${urlWhatsApp(MENSAJE_WHATSAPP)}" target="_blank" rel="noopener">WhatsApp ${esc(CONFIG.whatsapp.numeroVisible)}</a></li>
            <li>${ig ? `<a href="${esc(ig.url)}" target="_blank" rel="noopener">Instagram ${esc(ig.usuario)}</a>` : '<span class="texto-secundario">Instagram [POR DEFINIR]</span>'}</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="contenedor">
      <div class="pie__legal">
        <p>© ${anio} ${esc(CONFIG.marca.nombre)}. Todos los derechos reservados.</p>
        <a href="/privacidad">Política de privacidad</a>
      </div>
    </div>
  </footer>`;
}

/* ------------------------------------------------------------------ */
/* Botón flotante de WhatsApp                                          */
/* ------------------------------------------------------------------ */

function htmlWhatsApp() {
  return `
  <a class="whatsapp-flotante" href="${urlWhatsApp(MENSAJE_WHATSAPP)}" target="_blank" rel="noopener"
     aria-label="Escribir a Verónica por WhatsApp" data-whatsapp>
    ${icono('whatsapp', { tamano: 28 })}
  </a>`;
}

/**
 * Sube el botón flotante (ej. para no tapar la barra fija de inscripción
 * en el detalle del curso). 0 lo devuelve a su sitio.
 * @param {number} px  Alto de la barra fija.
 */
export function ajustarWhatsApp(px = 0) {
  document.documentElement.style.setProperty('--wa-elevacion', `${Math.max(0, px)}px`);
}

/* ================================================================== */
/* COMPORTAMIENTO                                                      */
/* ================================================================== */

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let capaAbierta = null;   // { el, disparador, alCerrar }

function abrirCapa(el, disparador, { alAbrir, alCerrar } = {}) {
  if (capaAbierta) cerrarCapa({ devolverFoco: false });
  capaAbierta = { el, disparador, alCerrar };
  document.documentElement.classList.add('sin-scroll');
  el.classList.add('esta-abierta');
  disparador?.setAttribute('aria-expanded', 'true');
  // Lo que queda detrás no debe recibir foco ni lectura
  document.querySelectorAll('body > :not(.capa):not(script)').forEach((n) => { n.inert = true; });
  alAbrir?.();
}

function cerrarCapa({ devolverFoco = true } = {}) {
  if (!capaAbierta) return;
  const { el, disparador, alCerrar } = capaAbierta;
  capaAbierta = null;
  el.classList.remove('esta-abierta');
  disparador?.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('sin-scroll');
  document.querySelectorAll('body > [inert]').forEach((n) => { n.inert = false; });
  alCerrar?.();
  if (devolverFoco) disparador?.focus({ preventScroll: true });
}

function atraparFoco(e) {
  if (!capaAbierta || e.key !== 'Tab') return;
  const enfocables = [...capaAbierta.el.querySelectorAll(ENFOCABLES)].filter((n) => n.offsetParent !== null);
  if (!enfocables.length) return;
  const primero = enfocables[0], ultimo = enfocables[enfocables.length - 1];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
}

function activarMenu() {
  const menu = document.querySelector('[data-menu]');
  const abrir = document.querySelector('[data-abrir-menu]');
  abrir.addEventListener('click', () => abrirCapa(menu, abrir, {
    alAbrir: () => setTimeout(() => menu.querySelector('.menu-movil__enlace')?.focus({ preventScroll: true }), reducirMovimiento() ? 0 : 120)
  }));
  menu.querySelector('[data-cerrar-menu]').addEventListener('click', () => cerrarCapa());
  // Al tocar un enlace se cierra (la página cambia, pero también cubre anclas)
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => cerrarCapa({ devolverFoco: false })));
  // Si se agranda la ventana al escritorio, el menú no debe quedar abierto
  window.matchMedia('(min-width: 1280px)').addEventListener('change', (m) => {
    if (m.matches && capaAbierta?.el === menu) cerrarCapa({ devolverFoco: false });
  });
}

function activarBuscador() {
  const capa = document.querySelector('[data-buscador]');
  const abrir = document.querySelector('[data-abrir-buscador]');
  const campo = capa.querySelector('#campo-buscador');
  const zona = capa.querySelector('[data-resultados]');
  const estado = capa.querySelector('#estado-buscador');
  let turno = 0, espera;

  async function mostrar() {
    const consulta = campo.value.trim();
    const mio = ++turno;
    const cursos = consulta ? await buscarCursos(consulta) : await obtenerCursosVigentes();
    if (mio !== turno) return; // llegó una búsqueda más nueva

    if (!consulta) {
      zona.innerHTML = `
        <p class="etiqueta buscador__titulo">Próximos cursos</p>
        <ul class="buscador__lista">${cursos.map((c) => htmlResultado(c, '')).join('')}</ul>`;
      estado.textContent = '';
      return;
    }
    if (!cursos.length) {
      zona.innerHTML = `
        <p class="buscador__vacio">No encontramos cursos con <strong>“${esc(consulta)}”</strong>.</p>
        ${boton({ texto: 'Ver todos los cursos', href: '/cursos', variante: 'texto', icono: 'flecha-derecha' })}`;
      estado.textContent = 'Sin resultados.';
      return;
    }
    const total = cursos.length;
    zona.innerHTML = `
      <p class="etiqueta buscador__titulo">${total === 1 ? '1 curso' : `${total} cursos`}</p>
      <ul class="buscador__lista">${cursos.slice(0, 6).map((c) => htmlResultado(c, consulta)).join('')}</ul>
      <div class="buscador__todos">${boton({ texto: 'Ver todos los resultados', variante: 'texto', icono: 'flecha-derecha', href: `/cursos?q=${encodeURIComponent(consulta)}` })}</div>`;
    estado.textContent = total === 1 ? '1 curso encontrado.' : `${total} cursos encontrados.`;
  }

  abrir.addEventListener('click', () => abrirCapa(capa, abrir, {
    alAbrir: () => { mostrar(); setTimeout(() => campo.focus({ preventScroll: true }), 30); }
  }));
  capa.querySelectorAll('[data-cerrar-buscador]').forEach((b) => b.addEventListener('click', () => cerrarCapa()));
  campo.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(mostrar, 120); });
  capa.querySelector('[data-form-buscador]').addEventListener('submit', (e) => {
    // Enter → /cursos?q=…  (sin texto, a /cursos)
    if (!campo.value.trim()) { e.preventDefault(); location.href = '/cursos'; }
  });
}

function activarHeaderSobreFoto(header) {
  header.classList.add('header--sobre-foto');
  let pendiente = false;
  const revisar = () => {
    pendiente = false;
    header.classList.toggle('header--sobre-foto', window.scrollY < 24);
  };
  window.addEventListener('scroll', () => {
    if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); }
  }, { passive: true });
  revisar();
}

/**
 * Dibuja header, menú, buscador, footer y WhatsApp, y activa su comportamiento.
 * Se llama una vez desde el archivo JS de cada página.
 * @param {object} [op]
 * @param {string} [op.pagina]     Por defecto, <body data-pagina>.
 * @param {boolean} [op.whatsapp=true]  false en /admin.
 */
export function iniciarPagina({ pagina = document.body.dataset.pagina, whatsapp = true } = {}) {
  const activa = ACTIVA_EQUIVALENTE[pagina] || pagina;
  const sesion = obtenerSesion();

  document.body.insertAdjacentHTML('afterbegin', htmlHeader(activa, sesion) + htmlMenuMovil(activa, sesion) + htmlBuscador());
  document.body.insertAdjacentHTML('beforeend', htmlFooter(sesion) + (whatsapp ? htmlWhatsApp() : ''));

  const header = document.querySelector('[data-header]');
  if (document.body.hasAttribute('data-hero')) activarHeaderSobreFoto(header);

  activarMenu();
  activarBuscador();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && capaAbierta) { e.preventDefault(); cerrarCapa(); }
    atraparFoco(e);
  });
  activarBarras();
}
