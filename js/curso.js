// Página: curso.html — ficha del curso.
// Se abre en /cursos/[slug]. Puede llegar de dos formas:
//  - Página generada /cursos/[slug].html (herramientas/generar_cursos.py), que
//    trae <body data-slug> y sus propias etiquetas Open Graph.
//  - Reescritura /cursos/:slug → curso.html (vercel.json), para cursos nuevos
//    que aún no tienen página generada.
// Si el slug no existe, se muestra el contenido de la página 404.

import {
  iniciarPagina, esc, boton, insignia, barraProgreso, placeholderFoto, urlWhatsApp,
  ajustarWhatsApp, activarBarras, activarApariciones, formatearPrecio
} from './componentes.js';
import {
  encabezado, datosFicha, htmlFicha, htmlSobre, htmlIncluye, htmlPensum, htmlPracticas,
  htmlRequisitos, htmlCertificado, htmlMiniGaleria, fotosParaVisor
} from './detalle-curso.js';
import { abrirVisor } from './visor.js';
import { icono } from './iconos.js';
import { obtenerCursoPorSlug } from './datos.js';
import { cuposDeCurso } from './cupos.js';
import { formatearFecha, rangoFechas } from './fechas.js';
import { CONFIG } from './config.js';
import { inscribirse, mensajeAvisame, mensajeDudas, mensajeRepetir } from './inscripcion.js';

const MARCA = 'Verónica Correa Makeup';

// [EJEMPLO] Preguntas frecuentes de muestra (iguales para todos los cursos por ahora).
const PREGUNTAS = [
  {
    pregunta: '¿Necesito experiencia previa?',
    respuesta: '[EJEMPLO] Depende del nivel. Los cursos básicos parten de cero; en los intermedios y avanzados revisa los requisitos de cada curso.'
  },
  {
    pregunta: '¿Qué pasa si falto a una clase?',
    respuesta: '[EJEMPLO] Avísale a Verónica con tiempo y te indicará cómo recuperar el contenido de esa clase.'
  },
  {
    pregunta: '¿Puedo pagar en partes?',
    respuesta: '[EJEMPLO] Algunos cursos permiten pagar en partes. Las condiciones de cada curso aparecen en la sección Inversión.'
  }
];

const INDICE = [
  { id: 'detalles', texto: 'Detalles' },
  { id: 'incluye', texto: 'Incluye' },
  { id: 'pensum', texto: 'Pensum' },
  { id: 'practicas', texto: 'Prácticas' },
  { id: 'inversion', texto: 'Inversión' },
  { id: 'inscripcion', texto: 'Inscripción' }
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function slugActual() {
  if (document.body.dataset.slug) return document.body.dataset.slug;
  const m = /^\/cursos\/([^/]+?)(?:\.html)?\/?$/.exec(location.pathname);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Estado de inscripción del curso. */
function estadoDe(curso) {
  const cupos = cuposDeCurso(curso);
  const finalizado = curso.estado === 'finalizado';
  return {
    cupos,
    finalizado,
    abierto: !finalizado && cupos.estado !== 'agotado',
    textoCerrado: finalizado ? 'Curso finalizado' : 'Cupos agotados',
    insignia: finalizado ? 'finalizado' : (cupos.estado === 'disponible' ? null : cupos.estado)
  };
}

/** Botones de acción. `lugar` = 'resumen' | 'cierre' | 'barra'. */
function acciones(curso, est, lugar) {
  const tamano = lugar === 'barra' ? 'normal' : 'grande';
  if (est.abierto) {
    return boton({
      texto: 'Inscribirme', href: '#inscripcion', icono: 'flecha-derecha', tamano, bloque: lugar !== 'barra',
      atributos: { 'data-inscribirme': '' }
    });
  }
  if (est.finalizado) {
    return boton({
      texto: 'Quiero que se repita', href: urlWhatsApp(mensajeRepetir(curso)), variante: 'secundario',
      iconoIzquierda: 'whatsapp', tamano, bloque: lugar !== 'barra',
      atributos: { target: '_blank', rel: 'noopener' }
    });
  }
  const avisame = boton({
    texto: 'Avísame del próximo', href: urlWhatsApp(mensajeAvisame(curso)), variante: 'secundario',
    iconoIzquierda: 'whatsapp', tamano, bloque: lugar !== 'barra',
    atributos: { target: '_blank', rel: 'noopener' }
  });
  // En la barra móvil no cabe un botón muerto: el estado va como texto al lado.
  if (lugar === 'barra') return avisame;
  return `<div class="acciones-cerrado">
            ${boton({ texto: est.textoCerrado, desactivado: true, tamano, bloque: true })}
            ${avisame}
          </div>`;
}

/* ------------------------------------------------------------------ */
/* Secciones                                                           */
/* ------------------------------------------------------------------ */

function htmlPortada(curso, est) {
  const foto = curso.imagenPortada || { src: null, alt: curso.nombre };
  const media = foto.src
    ? `<img src="${esc(foto.src)}" alt="${esc(foto.alt)}" width="1200" height="900" fetchpriority="high" decoding="async">`
    : placeholderFoto({ descripcion: foto.alt, proporcion: '4 / 3', sinBorde: true });
  const fecha = est.finalizado
    ? `Se realizó del <strong>${esc(rangoFechas(curso.fechaInicio, curso.fechaFin))}</strong>`
    : `Inicia el <strong>${esc(formatearFecha(curso.fechaInicio))}</strong>`;

  return `
  <section class="curso-portada" aria-labelledby="curso-nombre">
    <div class="contenedor curso-portada__grid">
      <div class="curso-portada__media${est.abierto ? '' : ' curso-portada__media--cerrado'}">
        ${media}
        ${est.insignia ? `<span class="curso-portada__insignia">${insignia(est.insignia)}</span>` : ''}
      </div>
      <div class="curso-portada__texto">
        <p class="etiqueta">${esc(curso.categoria)} · ${esc(curso.modalidad)}</p>
        <h1 id="curso-nombre">${esc(curso.nombre)}</h1>
        <p class="curso-portada__subtitulo">${esc(curso.subtitulo)}</p>
        <p class="curso-portada__fecha">${icono('calendario', { tamano: 20 })}<span>${fecha}</span></p>
      </div>
    </div>
  </section>`;
}

function htmlIndice(ids) {
  return `
  <nav class="curso-indice" aria-label="Secciones del curso" data-indice>
    <div class="contenedor">
      <ul class="curso-indice__lista" data-indice-lista>
        ${INDICE.filter((s) => ids.includes(s.id)).map((s) => `<li><a class="chip chip--indice" href="#${s.id}" data-indice-enlace="${s.id}">${esc(s.texto)}</a></li>`).join('')}
      </ul>
    </div>
  </nav>`;
}

function htmlCupos(curso, est) {
  const contenido = est.finalizado
    ? `<p class="curso-cupos__finalizado">Este curso ya terminó${curso.egresadas ? ` · ${curso.egresadas} egresadas` : ''}.</p>`
    : barraProgreso({ inscritas: curso.inscritas, cupos: curso.cupos, grande: true });
  return `
  <section class="curso-cupos" aria-labelledby="t-cupos" data-aparecer>
    <div class="curso-cupos__cabeza">
      <h2 class="etiqueta" id="t-cupos">Cupos</h2>
      ${est.insignia ? insignia(est.insignia) : ''}
    </div>
    ${contenido}
  </section>`;
}

function htmlGaleriaCurso(curso) {
  if (!curso.galeria?.length) return '';
  return `
  <section class="curso-seccion" aria-labelledby="t-galeria" data-aparecer>
    ${encabezado({ titulo: 'Fotos del curso', id: 't-galeria' })}
    ${htmlMiniGaleria(curso, { max: 6 })}
  </section>`;
}

function htmlInversion(curso) {
  return `
  <section class="curso-inversion" id="inversion" aria-labelledby="t-inversion" data-aparecer>
    <h2 class="etiqueta" id="t-inversion">Inversión</h2>
    <p class="curso-inversion__precio">${esc(formatearPrecio(curso.precioUSD))}</p>
    <p class="curso-inversion__nota">Precio por persona en ${esc(CONFIG.moneda)}</p>
    ${curso.condicionesPago ? `<p class="curso-inversion__condiciones">${icono('informacion', { tamano: 20 })}<span>${esc(curso.condicionesPago)}</span></p>` : ''}
  </section>`;
}

function htmlInscripcion() {
  const pasos = [
    'Crea tu cuenta en la web.',
    'Toca <strong>“Inscribirme”</strong>: se abre WhatsApp con tu solicitud lista.',
    'Verónica confirma tu cupo y te envía los datos de pago.',
    'Envía tu comprobante por WhatsApp.',
    `Tu inscripción aparece como ${insignia('confirmada')} en Mi cuenta.`
  ];
  return `
  <section class="curso-seccion" id="inscripcion" aria-labelledby="t-inscripcion" data-aparecer>
    ${encabezado({ etiqueta: 'Paso a paso', titulo: 'Cómo inscribirte', id: 't-inscripcion' })}
    <ol class="pasos">
      ${pasos.map((p, i) => `<li class="paso"><span class="paso__numero" aria-hidden="true">${i + 1}</span><p>${p}</p></li>`).join('')}
    </ol>
  </section>`;
}

function htmlPagos() {
  return `
  <section class="curso-seccion" aria-labelledby="t-pagos" data-aparecer>
    ${encabezado({ titulo: 'Métodos de pago', id: 't-pagos' })}
    <ul class="metodos-pago">
      ${CONFIG.metodosPago.map((m) => `
        <li class="metodo-pago">
          <span class="metodo-pago__icono">${icono('tarjeta', { tamano: 22 })}</span>
          <span class="metodo-pago__texto"><strong>${esc(m.nombre)}</strong>${m.detalle ? `<span>${esc(m.detalle)}</span>` : ''}</span>
        </li>`).join('')}
    </ul>
    <p class="curso-seccion__nota">Verónica te envía los datos exactos por WhatsApp cuando confirma tu cupo.</p>
  </section>`;
}

function htmlPreguntas() {
  return `
  <section class="curso-seccion" aria-labelledby="t-preguntas" data-aparecer>
    ${encabezado({ titulo: 'Preguntas frecuentes', id: 't-preguntas' })}
    <div class="acordeon">
      ${PREGUNTAS.map((p) => `
        <details class="acordeon__item">
          <summary class="acordeon__resumen">
            <span class="acordeon__titulo">${esc(p.pregunta)}</span>
            ${icono('chevron-abajo', { tamano: 20, clase: 'acordeon__flecha' })}
          </summary>
          <div class="acordeon__contenido"><p>${esc(p.respuesta)}</p></div>
        </details>`).join('')}
    </div>
  </section>`;
}

function htmlResumen(curso, est) {
  const filas = datosFicha(curso).filter((d) => ['Inicio', 'Días y horario', 'Duración', 'Modalidad'].includes(d.etiqueta));
  return `
  <aside class="curso-resumen" aria-label="Resumen e inscripción">
    <div class="curso-resumen__tarjeta">
      <p class="etiqueta">${esc(curso.categoria)}</p>
      <p class="curso-resumen__nombre">${esc(curso.nombre)}</p>
      <dl class="curso-resumen__datos">
        ${filas.map((d) => `
          <div>
            ${icono(d.icono, { tamano: 18 })}
            <dt>${esc(d.etiqueta)}</dt>
            <dd>${esc(d.etiqueta === 'Días y horario' ? `${d.valor} · ${d.detalle}` : d.valor)}</dd>
          </div>`).join('')}
      </dl>
      ${est.finalizado ? '' : barraProgreso({ inscritas: curso.inscritas, cupos: curso.cupos })}
      ${acciones(curso, est, 'resumen')}
      <a class="curso-resumen__dudas" href="${urlWhatsApp(mensajeDudas(curso))}" target="_blank" rel="noopener">
        ${icono('whatsapp', { tamano: 18 })}<span>¿Tienes dudas? Escríbele a Verónica</span>
      </a>
    </div>
  </aside>`;
}

function htmlBarra(curso, est) {
  const meta = est.abierto
    ? `Inicia el ${formatearFecha(curso.fechaInicio)}`
    : est.textoCerrado;
  return `
  <div class="barra-inscripcion" data-barra-inscripcion aria-hidden="true" inert>
    <div class="contenedor barra-inscripcion__fila">
      <div class="barra-inscripcion__texto">
        <p class="barra-inscripcion__nombre">${esc(curso.nombreCorto || curso.nombre)}</p>
        <p class="barra-inscripcion__meta">${esc(meta)}</p>
      </div>
      ${acciones(curso, est, 'barra')}
    </div>
  </div>`;
}

function htmlCierre(curso, est) {
  const titulo = est.abierto ? 'Reserva tu cupo'
    : est.finalizado ? '¿Quieres que se repita?' : 'Este curso está agotado';
  const texto = est.abierto
    ? `Inicia el ${formatearFecha(curso.fechaInicio)} · ${est.cupos.textoRestantes.charAt(0).toLowerCase()}${est.cupos.textoRestantes.slice(1)}.`
    : est.finalizado
      ? 'Este curso ya terminó. Escríbele a Verónica si te gustaría que abra una nueva edición.'
      : 'Escríbele a Verónica y te avisa cuando abra la próxima edición.';
  return `
  <section class="seccion seccion--crema seccion--cierre" aria-labelledby="t-cierre" data-cierre>
    <div class="contenedor cierre">
      <p class="etiqueta">${esc(curso.nombre)}</p>
      <h2 id="t-cierre">${titulo}</h2>
      <p>${esc(texto)}</p>
      <div class="cierre__acciones">${est.finalizado ? acciones(curso, est, 'cierre').replace('boton--secundario', 'boton--principal') : acciones(curso, est, 'cierre')}</div>
      <a class="cierre__dudas" href="${urlWhatsApp(mensajeDudas(curso))}" target="_blank" rel="noopener">¿Tienes dudas? Escríbele a Verónica</a>
    </div>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* Comportamiento                                                      */
/* ------------------------------------------------------------------ */

/** Barra fija del móvil: aparece al pasar la portada y se oculta al llegar al cierre. */
function activarBarra() {
  const barra = document.querySelector('[data-barra-inscripcion]');
  const portada = document.querySelector('.curso-portada');
  const cierre = document.querySelector('[data-cierre]');
  const movil = window.matchMedia('(max-width: 1023px)');
  let pasoPortada = false, llegoCierre = false;

  const actualizar = () => {
    const mostrar = movil.matches && pasoPortada && !llegoCierre;
    barra.classList.toggle('es-visible', mostrar);
    barra.toggleAttribute('inert', !mostrar);
    barra.setAttribute('aria-hidden', String(!mostrar));
    ajustarWhatsApp(mostrar ? barra.offsetHeight : 0);
  };

  new IntersectionObserver(([e]) => {
    pasoPortada = !e.isIntersecting && e.boundingClientRect.top < 0;
    actualizar();
  }).observe(portada);
  new IntersectionObserver(([e]) => {
    llegoCierre = e.isIntersecting || e.boundingClientRect.top < 0;
    actualizar();
  }).observe(cierre);
  movil.addEventListener('change', actualizar);
  window.addEventListener('resize', () => { if (barra.classList.contains('es-visible')) ajustarWhatsApp(barra.offsetHeight); }, { passive: true });
}

/** Índice: marca la sección actual y la mantiene a la vista en la fila de chips. */
function activarIndice() {
  const listaEl = document.querySelector('[data-indice-lista]');
  const enlaces = [...document.querySelectorAll('[data-indice-enlace]')];
  const secciones = enlaces.map((a) => document.getElementById(a.dataset.indiceEnlace)).filter(Boolean);
  const indice = document.querySelector('[data-indice]');
  let actual = null, pendiente = false;

  const revisar = () => {
    pendiente = false;
    const limite = indice.getBoundingClientRect().bottom + 24;
    let nueva = null;
    for (const s of secciones) if (s.getBoundingClientRect().top <= limite) nueva = s.id;
    if (nueva === actual) return;
    actual = nueva;
    enlaces.forEach((a) => {
      const activo = a.dataset.indiceEnlace === actual;
      if (activo) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      if (activo && listaEl.scrollWidth > listaEl.clientWidth) {
        listaEl.scrollTo({ left: a.parentElement.offsetLeft - 16, behavior: 'smooth' });
      }
    });
  };
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); } }, { passive: true });
  revisar();
}

function activarInscripcion(curso) {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-inscribirme]');
    if (!b) return;
    e.preventDefault();
    inscribirse(curso);
  });
}

/* ------------------------------------------------------------------ */
/* Slug inexistente → contenido de la 404                              */
/* ------------------------------------------------------------------ */

async function mostrar404(main) {
  let contenido = '';
  try {
    const html = await (await fetch('/404')).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    contenido = doc.querySelector('main')?.innerHTML || '';
    document.title = doc.title || document.title;
  } catch { /* sin conexión: se usa el texto de respaldo */ }
  main.innerHTML = contenido || `
    <section class="contenedor error"><div>
      <h1>No encontramos este curso</h1>
      <p>Puede que ya no esté disponible.</p>
      <div class="error__acciones"><a class="boton boton--principal boton--grande" href="/cursos"><span>Ver cursos</span></a></div>
    </div></section>`;
  document.body.dataset.pagina = '404';
}

/* ------------------------------------------------------------------ */
/* Inicio                                                              */
/* ------------------------------------------------------------------ */

const main = document.querySelector('[data-curso]');
const slug = slugActual();
const curso = slug ? await obtenerCursoPorSlug(slug) : null;

if (!curso) {
  await mostrar404(main);
  iniciarPagina({ pagina: 'curso' });
} else {
  const est = estadoDe(curso);
  if (!document.body.dataset.slug) document.title = `${curso.nombre} · ${MARCA}`;
  main.removeAttribute('aria-busy');
  // Curso finalizado = modo lectura: sin precio, sin inscripción y sin barra fija.
  const lectura = est.finalizado;
  const secciones = [
    htmlFicha(curso),
    htmlCupos(curso, est),
    htmlSobre(curso),
    htmlIncluye(curso),
    htmlPensum(curso),
    htmlPracticas(curso),
    htmlGaleriaCurso(curso),
    htmlRequisitos(curso),
    htmlCertificado(curso),
    lectura ? '' : htmlInversion(curso),
    lectura ? '' : htmlInscripcion(),
    lectura ? '' : htmlPagos(),
    lectura ? '' : htmlPreguntas()
  ].join('');
  const ids = INDICE.map((x) => x.id).filter((id) => secciones.includes(`id="${id}"`));

  main.innerHTML = `
    ${htmlPortada(curso, est)}
    ${htmlIndice(ids)}
    <div class="contenedor curso-cuerpo">
      <div class="curso-contenido">${secciones}</div>
      ${htmlResumen(curso, est)}
    </div>
    ${lectura ? '' : htmlBarra(curso, est)}
    ${htmlCierre(curso, est)}`;

  iniciarPagina({ pagina: 'curso' });
  activarBarras(main);
  activarApariciones(main);
  activarIndice();
  if (!lectura) activarBarra();
  activarInscripcion(curso);
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mini-galeria]');
    if (b) abrirVisor(fotosParaVisor(curso), Number(b.dataset.indice), b);
  });

  // Si se llegó con un ancla (ej. desde "Inscribirme" en una tarjeta), ir a ella
  // ahora que el contenido existe.
  if (location.hash) {
    const destino = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (destino) requestAnimationFrame(() => destino.scrollIntoView({ block: 'start' }));
  }
}
