// Página temporal: guía de estilo. Dibuja todo con los componentes reales
// para comprobar que funcionan antes de construir las páginas del sitio.

import {
  boton, botonIcono, etiqueta, tituloSeccion, insignia, insigniaCupos,
  barraProgreso, activarBarras, placeholderFoto, logo, esc
} from './componentes.js';
import { icono, NOMBRES_ICONOS } from './iconos.js';
import { calcularCupos } from './cupos.js';
import { formatearFecha, partesFecha, fechaLarga, rangoFechas } from './fechas.js';

/* ----------------------------- utilidades ----------------------------- */

function luminancia(hex) {
  const c = hex.replace('#', '').match(/.{2}/g).map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return ((x + 0.05) / (y + 0.05)).toFixed(2);
}
const seccion = (contenido, { crema = false, id } = {}) =>
  `<section class="seccion${crema ? ' seccion--crema' : ''}"${id ? ` aria-labelledby="${id}"` : ''}>
     <div class="contenedor">${contenido}</div>
   </section>`;

/* ------------------------------- datos -------------------------------- */

const PALETA = [
  { nombre: 'Blanco', v: '--blanco', hex: '#FFFFFF', uso: 'Fondo principal.' },
  { nombre: 'Crema', v: '--crema', hex: '#F5EFE6', uso: 'Secciones alternas y tarjetas.' },
  { nombre: 'Beige', v: '--beige', hex: '#E8DCC8', uso: 'Bordes finos y fondo de barras.' },
  { nombre: 'Dorado', v: '--dorado', hex: '#B8975A', uso: 'Líneas, barras y detalles. Nunca texto pequeño.' },
  { nombre: 'Dorado profundo', v: '--dorado-profundo', hex: '#7A5C30', uso: 'Botón principal, enlaces y textos destacados.' },
  { nombre: 'Tinta', v: '--tinta', hex: '#2B2622', uso: 'Títulos y texto principal.' },
  { nombre: 'Gris cálido', v: '--gris-calido', hex: '#6B625A', uso: 'Texto secundario.' }
];

const ESCALA = [
  { nombre: 'Display', clase: 'display', v: '--t-display', fuente: 'Cormorant 300', rango: '44 → 72 px', texto: 'Formación en maquillaje' },
  { nombre: 'Título 1', etiquetaHtml: 'h1', v: '--t-h1', fuente: 'Cormorant 300', rango: '36 → 56 px', texto: 'Próximos cursos' },
  { nombre: 'Título 2', etiquetaHtml: 'h2', v: '--t-h2', fuente: 'Cormorant 400', rango: '30 → 42 px', texto: 'Lo que vas a aprender' },
  { nombre: 'Título 3', etiquetaHtml: 'h3', v: '--t-h3', fuente: 'Cormorant 400', rango: '24 → 30 px', texto: 'Maquillaje social [EJEMPLO]' },
  { nombre: 'Título 4', etiquetaHtml: 'h4', v: '--t-h4', fuente: 'Cormorant 500', rango: '20 → 22 px', texto: 'Qué incluye' },
  { nombre: 'Cuerpo grande', clase: 'texto-grande', v: '--t-cuerpo-grande', fuente: 'Jost 300', rango: '18 px', texto: 'Texto de introducción para presentar un curso o una sección. [EJEMPLO]' },
  { nombre: 'Cuerpo', v: '--t-cuerpo', fuente: 'Jost 400', rango: '16 px', texto: 'Texto corrido de lectura. Mucho aire entre líneas para que se lea cómodo en el teléfono. [EJEMPLO]' },
  { nombre: 'Pequeño', clase: 'texto-pequeno texto-secundario', v: '--t-pequeno', fuente: 'Jost 400', rango: '14 px', texto: 'Texto secundario, notas y datos de apoyo.' },
  { nombre: 'Etiqueta', clase: 'etiqueta', v: '--t-etiqueta', fuente: 'Jost 500 · mayúsculas · 0.2em', rango: '12 px', texto: 'Próximos cursos' }
];

const BARRAS = [
  { titulo: 'Recién abierto', inscritas: 0, cupos: 20 },
  { titulo: 'A mitad', inscritas: 9, cupos: 20 },
  { titulo: 'Últimos cupos', inscritas: 17, cupos: 20 },
  { titulo: 'Agotado', inscritas: 20, cupos: 20 }
];

/* ------------------------------ secciones ----------------------------- */

const htmlLogos = seccion(`
  ${tituloSeccion({ etiqueta: 'Marca', titulo: 'Logotipo tipográfico', id: 't-logo' })}
  <div class="guia-rejilla guia-rejilla--2">
    <div class="guia-tarjeta"><div class="guia-logo">${logo({ href: null })}</div>
      <span class="guia-rotulo">Horizontal · tinta · header</span></div>
    <div class="guia-tarjeta guia-tarjeta--crema"><div class="guia-logo">${logo({ version: 'apilado', href: null })}</div>
      <span class="guia-rotulo">Apilado · tinta · footer</span></div>
    <div class="guia-tarjeta guia-tarjeta--tinta"><div class="guia-logo">${logo({ color: 'blanco', href: null })}</div>
      <span class="guia-rotulo">Horizontal · blanco · sobre fotos</span></div>
    <div class="guia-tarjeta guia-tarjeta--tinta"><div class="guia-logo">${logo({ version: 'apilado', color: 'blanco', href: null })}</div>
      <span class="guia-rotulo">Apilado · blanco · sobre fotos</span></div>
  </div>
  <div class="guia-bloque">
    <h3 class="guia-subtitulo">Favicon y ícono de inicio</h3>
    <div class="guia-fila-botones">
      <img src="/favicon.svg" width="64" height="64" alt="Favicon: monograma VC en dorado profundo sobre crema">
      <img src="/favicon.svg" width="32" height="32" alt="Favicon a 32 px">
      <img src="/favicon.svg" width="16" height="16" alt="Favicon a 16 px">
      <img src="/apple-touch-icon.png" width="90" height="90" alt="Ícono para pantalla de inicio de iPhone" style="border-radius:20px">
    </div>
  </div>`, { id: 't-logo' });

const htmlPaleta = seccion(`
  ${tituloSeccion({ etiqueta: 'Color', titulo: 'Paleta', id: 't-paleta' })}
  <div class="guia-rejilla guia-rejilla--2 guia-rejilla--4">
    ${PALETA.map((c) => `
      <div class="guia-tarjeta muestra">
        <div class="muestra__color" style="background:var(${c.v})"></div>
        <div class="muestra__datos">
          <span class="muestra__nombre">${esc(c.nombre)}</span>
          <span class="muestra__codigo">${c.v} · ${c.hex}</span>
          <span class="muestra__uso">${esc(c.uso)}</span>
          <span class="muestra__contraste">Contraste sobre blanco: ${contraste(c.hex, '#FFFFFF')}:1</span>
        </div>
      </div>`).join('')}
  </div>`, { crema: true, id: 't-paleta' });

const htmlTipografia = seccion(`
  ${tituloSeccion({ etiqueta: 'Tipografía', titulo: 'Escala tipográfica', id: 't-tipo' })}
  <div data-escala>
    ${ESCALA.map((t) => {
      const tag = t.etiquetaHtml || 'p';
      return `
      <div class="tipo-fila">
        <div class="tipo-fila__dato"><strong>${esc(t.nombre)}</strong>${esc(t.fuente)} · ${esc(t.rango)}<br>
          <span data-medida="${t.v}"></span></div>
        <${tag} class="${t.clase || ''}" data-muestra>${esc(t.texto)}</${tag}>
      </div>`;
    }).join('')}
  </div>

  <div class="guia-bloque guia-rejilla guia-rejilla--2">
    <div class="guia-tarjeta">
      ${etiqueta('Cormorant Garamond · títulos')}
      <div class="tipo-pesos" style="font-family:var(--fuente-titulos);font-size:1.75rem;line-height:1.2;margin-top:var(--e-4)">
        <span style="font-weight:300">Light 300 — Verónica Correa</span>
        <span style="font-weight:400">Regular 400 — Verónica Correa</span>
        <span style="font-weight:500">Medium 500 — Verónica Correa</span>
        <span style="font-weight:600">SemiBold 600 — Verónica Correa</span>
        <span style="font-weight:400;font-style:italic">Itálica 400 — Verónica Correa</span>
      </div>
    </div>
    <div class="guia-tarjeta">
      ${etiqueta('Jost · textos, botones y etiquetas')}
      <div class="tipo-pesos" style="font-size:1.125rem;margin-top:var(--e-4)">
        <span style="font-weight:300">Light 300 — Inscripciones abiertas</span>
        <span style="font-weight:400">Regular 400 — Inscripciones abiertas</span>
        <span style="font-weight:500">Medium 500 — Inscripciones abiertas</span>
        <span class="etiqueta" style="margin-top:var(--e-2)">Mayúsculas espaciadas 0.2em</span>
        <span class="logo__sub" style="font-size:.75rem">MAKEUP · 0.35em</span>
      </div>
    </div>
  </div>`, { id: 't-tipo' });

const htmlTitulos = seccion(`
  ${tituloSeccion({ etiqueta: 'Componente', titulo: 'Título de sección', id: 't-titulos' })}
  <p class="texto-secundario" style="margin-bottom:var(--e-8);max-width:60ch">
    Etiqueta + título en Cormorant + línea dorada de 48 px. El enlace a la derecha es opcional.
  </p>
  <div class="guia-tarjeta" style="margin-bottom:var(--e-4)">
    ${tituloSeccion({ etiqueta: 'Calendario', titulo: 'Próximos cursos', enlace: { texto: 'Ver todos', href: '#' } })}
  </div>
  <div class="guia-tarjeta">
    ${tituloSeccion({ etiqueta: 'Galería', titulo: 'Trabajos recientes', centrado: true })}
  </div>`, { crema: true, id: 't-titulos' });

const htmlBotones = seccion(`
  ${tituloSeccion({ etiqueta: 'Componente', titulo: 'Botones', id: 't-botones' })}
  <div class="guia-bloque">
    <h3 class="guia-subtitulo">Principal</h3>
    <div class="guia-fila-botones">
      ${boton({ texto: 'Inscribirme', icono: 'flecha-derecha' })}
      ${boton({ texto: 'Inscribirme', icono: 'flecha-derecha', tamano: 'grande' })}
      ${boton({ texto: 'Cupos agotados', desactivado: true })}
    </div>
  </div>
  <div class="guia-bloque">
    <h3 class="guia-subtitulo">Secundario</h3>
    <div class="guia-fila-botones">
      ${boton({ texto: 'Ver detalles', variante: 'secundario' })}
      ${boton({ texto: 'Ver detalles', variante: 'secundario', tamano: 'grande' })}
      ${boton({ texto: 'Ver detalles', variante: 'secundario', desactivado: true })}
      ${botonIcono({ icono: 'marcador', etiqueta: 'Guardar curso' })}
    </div>
  </div>
  <div class="guia-bloque">
    <h3 class="guia-subtitulo">Texto</h3>
    <div class="guia-fila-botones">
      ${boton({ texto: 'Ver todos', variante: 'texto', icono: 'flecha-derecha', href: '#' })}
      ${boton({ texto: 'Ver todos', variante: 'texto', icono: 'flecha-derecha', tamano: 'grande', href: '#' })}
      ${boton({ texto: 'Ver todos', variante: 'texto', desactivado: true })}
    </div>
  </div>
  <div class="guia-bloque">
    <h3 class="guia-subtitulo">Claro, para usar sobre fotos</h3>
    <div class="guia-tarjeta guia-tarjeta--tinta">
      <div class="guia-fila-botones">
        ${boton({ texto: 'Ver cursos', variante: 'claro', icono: 'flecha-derecha' })}
        ${boton({ texto: 'Ver cursos', variante: 'claro', icono: 'flecha-derecha', tamano: 'grande' })}
        ${boton({ texto: 'Ver cursos', variante: 'claro', desactivado: true })}
      </div>
      <span class="guia-rotulo">Fondo tinta para simular una foto.</span>
    </div>
  </div>
  <div class="guia-bloque">
    <h3 class="guia-subtitulo">Ancho completo y con ícono</h3>
    <div style="max-width:420px;display:grid;gap:var(--e-3)">
      ${boton({ texto: 'Escribir por WhatsApp', iconoIzquierda: 'whatsapp', bloque: true, tamano: 'grande' })}
      ${boton({ texto: 'Ingresar', variante: 'secundario', iconoIzquierda: 'usuario', bloque: true })}
    </div>
  </div>`, { id: 't-botones' });

const htmlInsignias = seccion(`
  ${tituloSeccion({ etiqueta: 'Componente', titulo: 'Insignias', id: 't-insignias' })}
  <div class="guia-bloque">
    <h3 class="guia-subtitulo">Cupos y cursos</h3>
    <div class="guia-insignias">${insignia('ultimos')}${insignia('agotado')}${insignia('finalizado')}</div>
  </div>
  <div class="guia-bloque">
    <h3 class="guia-subtitulo">Estados de inscripción</h3>
    <div class="guia-insignias">${insignia('pendiente')}${insignia('confirmada')}${insignia('finalizado')}</div>
  </div>`, { crema: true, id: 't-insignias' });

const htmlBarras = seccion(`
  ${tituloSeccion({ etiqueta: 'Componente', titulo: 'Barra de inscripción', id: 't-barras' })}
  <p class="texto-secundario" style="margin-bottom:var(--e-8);max-width:60ch">
    6 px de alto, fondo beige y relleno dorado. Se llena al entrar en pantalla.
    Ejemplos con 20 cupos totales.
  </p>
  <div class="guia-rejilla guia-rejilla--2">
    ${BARRAS.map((b) => {
      const c = calcularCupos(b.inscritas, b.cupos);
      return `
      <div class="guia-tarjeta guia-barra">
        <div class="guia-barra__cabeza">
          <span class="guia-barra__cifras">${b.inscritas} de ${b.cupos} · ${c.porcentaje}%</span>
          ${insigniaCupos(b.inscritas, b.cupos)}
        </div>
        ${barraProgreso({ inscritas: b.inscritas, cupos: b.cupos })}
        ${c.estado === 'agotado'
          ? boton({ texto: 'Cupos agotados', desactivado: true, bloque: true })
          : boton({ texto: 'Inscribirme', icono: 'flecha-derecha', bloque: true })}
      </div>`;
    }).join('')}
  </div>`, { id: 't-barras' });

const htmlPlaceholders = seccion(`
  ${tituloSeccion({ etiqueta: 'Componente', titulo: 'Placeholder de imagen', id: 't-fotos' })}
  <div class="guia-rejilla guia-rejilla--3">
    <div>${placeholderFoto({ descripcion: 'Verónica maquillando a una alumna', proporcion: '16 / 9' })}<span class="guia-rotulo">16:9 · hero y portadas</span></div>
    <div>${placeholderFoto({ descripcion: 'Retrato de Verónica', proporcion: '4 / 5' })}<span class="guia-rotulo">4:5 · retratos y tarjetas</span></div>
    <div>${placeholderFoto({ descripcion: 'Detalle de maquillaje de ojos', proporcion: '1 / 1' })}<span class="guia-rotulo">1:1 · galería</span></div>
  </div>`, { crema: true, id: 't-fotos' });

const htmlIconos = seccion(`
  ${tituloSeccion({ etiqueta: 'Componente', titulo: 'Íconos', id: 't-iconos' })}
  <p class="texto-secundario" style="margin-bottom:var(--e-8)">Propios, lineales, trazo 1.5.</p>
  <div class="guia-iconos">
    ${NOMBRES_ICONOS.map((n) => `<div class="guia-icono">${icono(n)}<span>${n}</span></div>`).join('')}
  </div>`, { id: 't-iconos' });

const ejemplo = '2026-11-15';
const htmlReglas = seccion(`
  ${tituloSeccion({ etiqueta: 'Formato', titulo: 'Fechas y contenedor', id: 't-reglas' })}
  <div class="guia-rejilla guia-rejilla--2">
    <div class="guia-tarjeta">
      <h3 class="guia-subtitulo">Fechas</h3>
      <table class="guia-tabla">
        <tr><th>Fecha estándar</th><td>${formatearFecha(ejemplo)}</td></tr>
        <tr><th>Insignia de tarjeta</th><td>${(({ dia, mes, anio }) => `${dia} · ${mes} · ${anio}`)(partesFecha(ejemplo))}</td></tr>
        <tr><th>Rango mismo mes</th><td>${rangoFechas('2026-11-15', '2026-11-16')}</td></tr>
        <tr><th>Rango entre meses</th><td>${rangoFechas('2026-11-30', '2026-12-02')}</td></tr>
        <tr><th>Texto largo (WhatsApp)</th><td>${fechaLarga(ejemplo)}</td></tr>
      </table>
    </div>
    <div class="guia-tarjeta">
      <h3 class="guia-subtitulo">Contenedor</h3>
      <div class="guia-contenedor" data-contenedor>máx. 1200 px</div>
      <p class="texto-pequeno texto-secundario" style="margin-top:var(--e-4)">
        Márgenes laterales de 20 px en móvil y 32 px desde 1024 px.
        Puntos de quiebre: 640 · 768 · 1024 · 1280.
      </p>
    </div>
  </div>`, { crema: true, id: 't-reglas' });

/* ------------------------------- montaje ------------------------------ */

document.querySelector('[data-logo-cabecera]').innerHTML = logo({ href: '/guia-de-estilo' });
document.querySelector('[data-logo-pie]').innerHTML = logo({ version: 'apilado', href: null });

document.getElementById('guia').innerHTML = [
  htmlLogos, htmlPaleta, htmlTipografia, htmlTitulos, htmlBotones,
  htmlInsignias, htmlBarras, htmlPlaceholders, htmlIconos, htmlReglas
].join('');

// Tamaño real de cada nivel al ancho actual
document.querySelectorAll('[data-medida]').forEach((el) => {
  const muestra = el.closest('.tipo-fila').querySelector('[data-muestra]');
  const px = Math.round(parseFloat(getComputedStyle(muestra).fontSize));
  el.textContent = `${el.dataset.medida} · ahora ${px} px`;
});

// Aviso solo si las fuentes no cargaron
document.fonts.ready.then(() => {
  const cargada = (familia) => [...document.fonts].some((f) => f.family.replace(/"/g, '') === familia && f.status === 'loaded');
  const ok = cargada('Cormorant Garamond') && cargada('Jost');
  if (ok) document.querySelector('[data-aviso-fuentes]')?.remove();
});

activarBarras();
