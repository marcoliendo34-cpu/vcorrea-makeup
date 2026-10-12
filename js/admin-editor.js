// Panel: herramientas del SUPERADMIN (Marco). js/admin.js lo carga solo para
// ese rol: Verónica (admin) nunca descarga este archivo ni ve sus botones.
// La base hace cumplir lo mismo: solo superadmin escribe en cursos, galeria y
// los buckets (reglas RLS).
//
// Rutas que agrega al panel:
//   #curso-nuevo        formulario de curso vacío
//   #editar/[slug]      formulario completo del curso
//   #finalizar/[slug]   pasar a finalizado con egresadas y fotos
//   #galeria            subir, ordenar, categorizar y eliminar fotos
//
// Las fotos se comprimen en el navegador (js/imagenes.js) antes de subirlas.

import { esc, boton, insignia, abrirVentana, avisar, placeholderFoto } from './componentes.js';
import { icono } from './iconos.js';
import {
  obtenerCursoEditable, obtenerCursosAdmin, guardarCurso, duplicarCurso, publicarCurso, archivarCurso,
  finalizarCurso, reabrirCurso, subirFoto, obtenerGaleriaAdmin, agregarFotoGaleria,
  cambiarFotoGaleria, moverFotoGaleria, borrarFotoGaleria, normalizar
} from './datos.js';
import { prepararImagen, nombreUnico, peso, TIPOS_ACEPTADOS } from './imagenes.js';
import { CATEGORIAS_GALERIA } from './textos.js';

/* ------------------------------------------------------------------ */
/* Estado                                                              */
/* ------------------------------------------------------------------ */

let ctx = null;      // { zona, vista(), pintar() } que da admin.js
let ed = null;       // formulario de curso: { curso, original, porSemanas, slugManual, confirmadas }
let fin = null;      // finalizar: { curso, egresadas, galeria }
let galeria = [];    // fotos de la galería (vista #galeria)
let sucio = false;   // cambios sin guardar en el formulario

const ERRORES = {
  permiso: 'Tu cuenta no tiene permiso para hacer este cambio. Cierra sesión y vuelve a ingresar.',
  'solo-supabase': 'La edición solo funciona con la base de datos, no en la demo.',
  'slug-repetido': 'Ya existe otro curso con esa dirección. Cambia el campo "Dirección del curso".',
  datos: 'La base rechazó algún dato. Revisa fechas, números y campos obligatorios.',
  'no-existe': 'Ese curso ya no existe. Vuelve a la lista de cursos.',
  'muy-grande': 'La foto pesa más de 5 MB incluso comprimida. Prueba con otra.',
  formato: 'No se pudo leer esa imagen. Usa JPG, PNG o WebP.',
  servidor: 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'
};
const mensaje = (codigo) => ERRORES[codigo] || ERRORES.servidor;

const MODALIDADES = ['Presencial', 'Online'];
const MAX_FOTOS_CURSO = 24;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const partes = (ruta) => ruta.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p));
const leer = (obj, ruta) => partes(ruta).reduce((o, k) => o?.[k], obj);
function escribir(obj, ruta, valor) {
  const ps = partes(ruta);
  let o = obj;
  ps.slice(0, -1).forEach((k, i) => {
    if (o[k] == null) o[k] = typeof ps[i + 1] === 'number' ? [] : {};
    o = o[k];
  });
  o[ps.at(-1)] = valor;
}

const texto = (v) => String(v ?? '').trim();
const entero = (v) => (v === '' || v == null ? null : Number(v));
/** "Visión Lash 2" → "vision-lash-2" */
const slugDe = (t) => normalizar(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const idCampo = (ruta) => `ed-${ruta.replace(/\./g, '-')}`;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function cabeza({ etiqueta, titulo, meta = '', volver }) {
  return `
    ${volver ? `<a class="vista__volver" href="${esc(volver.href)}">${icono('flecha-izquierda', { tamano: 18 })}<span>${esc(volver.texto)}</span></a>` : ''}
    <header class="vista__cabeza">
      <div class="vista__textos">
        <p class="etiqueta">${esc(etiqueta)}</p>
        <h1 class="vista__titulo" tabindex="-1">${esc(titulo)}</h1>
        ${meta ? `<p class="vista__meta">${meta}</p>` : ''}
      </div>
    </header>`;
}

/** Botón pequeño solo con ícono (mover, quitar). */
const botonMini = ({ nombre, etiqueta, atributos, desactivado = false }) => `
  <button class="boton boton--texto boton--icono boton-mini" type="button" aria-label="${esc(etiqueta)}"${desactivado ? ' disabled' : ''}
    ${Object.entries(atributos).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')}>${icono(nombre, { tamano: 20 })}</button>`;

function ventanaError(titulo, codigo) {
  abrirVentana({
    icono: 'informacion', titulo, texto: `<p>${esc(mensaje(codigo))}</p>`,
    acciones: boton({ texto: 'Entendido', tamano: 'grande', bloque: true, atributos: { 'data-cerrar-ventana': '' } })
  });
}

/** Ventana de confirmación. Resuelve true si se acepta. */
function preguntar({ titulo, texto: cuerpo, si }) {
  return new Promise((resolver) => {
    const d = abrirVentana({
      icono: 'informacion', titulo, texto: `<p>${cuerpo}</p>`,
      acciones: `
        ${boton({ texto: si, tamano: 'grande', bloque: true, atributos: { 'data-si': '' } })}
        ${boton({ texto: 'Volver', variante: 'secundario', tamano: 'grande', bloque: true, atributos: { 'data-cerrar-ventana': '' } })}`
    });
    let respuesta = false;
    d.querySelector('[data-si]').addEventListener('click', () => { respuesta = true; d.close(); }, { once: true });
    d.addEventListener('close', () => resolver(respuesta), { once: true });
  });
}

/** Comprime y sube una foto en 1200 y 600 px. */
async function subirImagen(bucket, carpeta, archivo) {
  const { versiones, error } = await prepararImagen(archivo, [1200, 600]);
  if (error) return { error };
  const base = `${carpeta}/${nombreUnico()}`;
  const [grande, mini] = versiones;
  const r1 = await subirFoto(bucket, `${base}-1200.${grande.extension}`, grande.blob);
  if (r1.error) return { error: r1.error };
  const r2 = await subirFoto(bucket, `${base}-600.${mini.extension}`, mini.blob);
  if (r2.error) return { error: r2.error };
  return {
    error: null, src: r1.url, miniatura: r2.url, ancho: grande.ancho, alto: grande.alto,
    peso: grande.blob.size + mini.blob.size
  };
}

/* ------------------------------------------------------------------ */
/* Campos                                                              */
/* ------------------------------------------------------------------ */

const opcional = (obligatorio) => (obligatorio ? '' : ' <span class="campo__opcional">(opcional)</span>');

function campo({ ruta, etiqueta, tipo = 'text', obligatorio = false, ayuda = '', marcador = '', extra = '' }) {
  const id = idCampo(ruta);
  const v = leer(ed.curso, ruta);
  const numero = tipo === 'number';
  return `
    <div class="campo">
      <label class="campo__etiqueta" for="${id}">${esc(etiqueta)}${opcional(obligatorio)}</label>
      <input class="campo__control" id="${id}" type="${tipo}" value="${esc(v ?? '')}" data-ruta="${esc(ruta)}"
        ${numero ? 'data-tipo="numero" inputmode="decimal"' : ''} ${marcador ? `placeholder="${esc(marcador)}"` : ''}
        ${ayuda ? `aria-describedby="${id}-ayuda"` : ''} ${extra}>
      ${ayuda ? `<p class="campo__ayuda" id="${id}-ayuda">${ayuda}</p>` : ''}
    </div>`;
}

function area({ ruta, etiqueta, obligatorio = false, ayuda = '', marcador = '', filas = 4 }) {
  const id = idCampo(ruta);
  return `
    <div class="campo">
      <label class="campo__etiqueta" for="${id}">${esc(etiqueta)}${opcional(obligatorio)}</label>
      <textarea class="campo__control campo__control--area" id="${id}" rows="${filas}" data-ruta="${esc(ruta)}"
        ${marcador ? `placeholder="${esc(marcador)}"` : ''} ${ayuda ? `aria-describedby="${id}-ayuda"` : ''}>${esc(leer(ed.curso, ruta) ?? '')}</textarea>
      ${ayuda ? `<p class="campo__ayuda" id="${id}-ayuda">${ayuda}</p>` : ''}
    </div>`;
}

function selector({ ruta, etiqueta, opciones }) {
  const id = idCampo(ruta);
  const v = leer(ed.curso, ruta);
  return `
    <div class="campo">
      <label class="campo__etiqueta" for="${id}">${esc(etiqueta)}</label>
      <select class="campo__control" id="${id}" data-ruta="${esc(ruta)}">
        ${opciones.map((o) => `<option value="${esc(o)}"${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}
      </select>
    </div>`;
}

function casilla({ ruta, etiqueta, ayuda = '' }) {
  return `
    <label class="casilla">
      <input type="checkbox" data-ruta="${esc(ruta)}" data-tipo="bool"${leer(ed.curso, ruta) ? ' checked' : ''}>
      <span>${esc(etiqueta)}${ayuda ? `<span class="casilla__ayuda">${esc(ayuda)}</span>` : ''}</span>
    </label>`;
}

/* ------------------------------------------------------------------ */
/* Listas editables (agregar, quitar y reordenar)                      */
/* ------------------------------------------------------------------ */

const LISTAS = {
  dirigidoA: { simple: true, nombre: 'Perfil', agregar: 'Agregar perfil', marcador: 'Ej. Principiantes sin experiencia' },
  'destacados.items': { simple: true, nombre: 'Punto', agregar: 'Agregar punto', marcador: 'Ej. Sales lista para atender clientas' },
  incluye: { simple: true, nombre: 'Elemento', agregar: 'Agregar elemento', marcador: 'Ej. Kit profesional de obsequio' },
  requisitos: { simple: true, nombre: 'Requisito', agregar: 'Agregar requisito', marcador: 'Ej. Traer tu propio kit de pinceles' },
  calendario: {
    nombre: 'Fecha', agregar: 'Agregar fecha', nuevo: () => ({ fecha: '', texto: '' }),
    campos: [
      { clave: 'fecha', etiqueta: 'Fecha', tipo: 'date' },
      { clave: 'texto', etiqueta: 'Qué pasa ese día', marcador: 'Ej. Clase 1' },
      { clave: 'destacada', etiqueta: 'Resaltar esta fecha (cierre, graduación)', tipo: 'bool' }
    ]
  },
  pensum: {
    nombre: () => (ed.porSemanas ? 'Semana' : 'Módulo'),
    agregar: () => (ed.porSemanas ? 'Agregar semana' : 'Agregar módulo'),
    nuevo: () => ({ titulo: '', temas: [] }),
    campos: [
      { clave: 'titulo', etiqueta: 'Título', marcador: 'Ej. Técnicas fundamentales' },
      { clave: 'temas', etiqueta: 'Temas (uno por línea)', tipo: 'lineas' }
    ]
  },
  practicas: {
    nombre: 'Práctica', agregar: 'Agregar práctica', nuevo: () => ({ titulo: '', descripcion: '', requiereModelo: false }),
    campos: [
      { clave: 'titulo', etiqueta: 'Título', marcador: 'Ej. Con modelos reales' },
      { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
      { clave: 'requiereModelo', etiqueta: 'La alumna debe traer modelo', tipo: 'bool' }
    ]
  },
  preguntas: {
    nombre: 'Pregunta', agregar: 'Agregar pregunta', nuevo: () => ({ pregunta: '', respuesta: '' }),
    campos: [
      { clave: 'pregunta', etiqueta: 'Pregunta', marcador: 'Ej. ¿Necesito experiencia previa?' },
      { clave: 'respuesta', etiqueta: 'Respuesta', tipo: 'area' }
    ]
  }
};

const valorDe = (v) => (typeof v === 'function' ? v() : v);

function campoDeItem(ruta, c) {
  const r = `${ruta}.${c.clave}`;
  const id = idCampo(r);
  const v = leer(ed.curso, r);
  if (c.tipo === 'bool') {
    return `<label class="casilla"><input type="checkbox" data-ruta="${esc(r)}" data-tipo="bool"${v ? ' checked' : ''}><span>${esc(c.etiqueta)}</span></label>`;
  }
  if (c.tipo === 'area' || c.tipo === 'lineas') {
    const valor = c.tipo === 'lineas' ? (v || []).join('\n') : (v ?? '');
    return `
      <div class="campo">
        <label class="campo__etiqueta" for="${id}">${esc(c.etiqueta)}</label>
        <textarea class="campo__control campo__control--area" id="${id}" rows="${c.tipo === 'lineas' ? 5 : 3}" data-ruta="${esc(r)}"${c.tipo === 'lineas' ? ' data-tipo="lineas"' : ''}>${esc(valor)}</textarea>
      </div>`;
  }
  return `
    <div class="campo">
      <label class="campo__etiqueta" for="${id}">${esc(c.etiqueta)}</label>
      <input class="campo__control" id="${id}" type="${c.tipo || 'text'}" value="${esc(v ?? '')}" data-ruta="${esc(r)}"${c.marcador ? ` placeholder="${esc(c.marcador)}"` : ''}>
    </div>`;
}

function htmlLista(ruta) {
  const def = LISTAS[ruta];
  const items = leer(ed.curso, ruta) || [];
  const nombre = valorDe(def.nombre);
  const botones = (i) => `
    <div class="lista-ed__botones">
      ${botonMini({ nombre: 'chevron-arriba', etiqueta: `Subir ${nombre.toLowerCase()} ${i + 1}`, desactivado: i === 0, atributos: { 'data-ed-lista': ruta, 'data-ed-op': 'subir', 'data-indice': i } })}
      ${botonMini({ nombre: 'chevron-abajo', etiqueta: `Bajar ${nombre.toLowerCase()} ${i + 1}`, desactivado: i === items.length - 1, atributos: { 'data-ed-lista': ruta, 'data-ed-op': 'bajar', 'data-indice': i } })}
      ${botonMini({ nombre: 'papelera', etiqueta: `Quitar ${nombre.toLowerCase()} ${i + 1}`, atributos: { 'data-ed-lista': ruta, 'data-ed-op': 'quitar', 'data-indice': i } })}
    </div>`;
  const item = (x, i) => (def.simple ? `
    <li class="lista-ed__item lista-ed__item--simple">
      <label class="solo-lectores" for="${idCampo(`${ruta}.${i}`)}">${esc(nombre)} ${i + 1}</label>
      <input class="campo__control" id="${idCampo(`${ruta}.${i}`)}" type="text" value="${esc(x)}" data-ruta="${esc(`${ruta}.${i}`)}" placeholder="${esc(def.marcador || '')}">
      ${botones(i)}
    </li>` : `
    <li class="lista-ed__item">
      <div class="lista-ed__cabeza">
        <span class="lista-ed__titulo">${esc(nombre)} ${i + 1}</span>
        ${botones(i)}
      </div>
      <div class="lista-ed__campos">${def.campos.map((c) => campoDeItem(`${ruta}.${i}`, c)).join('')}</div>
    </li>`);
  return `
    <div class="lista-ed" data-lista="${esc(ruta)}">
      ${items.length ? `<ol class="lista-ed__items">${items.map(item).join('')}</ol>` : ''}
      <button class="boton boton--secundario boton--compacto" type="button" data-ed-lista="${esc(ruta)}" data-ed-op="agregar">
        ${icono('mas', { tamano: 18 })}<span>${esc(valorDe(def.agregar))}</span>
      </button>
    </div>`;
}

function repintarLista(ruta, foco) {
  const zona = ctx.vista().querySelector(`[data-lista="${CSS.escape(ruta)}"]`);
  if (!zona) return;
  zona.outerHTML = htmlLista(ruta);
  const nueva = ctx.vista().querySelector(`[data-lista="${CSS.escape(ruta)}"]`);
  const items = nueva.querySelectorAll('.lista-ed__item');
  if (foco?.tipo === 'item') {
    items[foco.indice]?.querySelector('input, textarea')?.focus();
  } else if (foco?.tipo === 'boton') {
    const b = nueva.querySelector(`[data-ed-op="${foco.op}"][data-indice="${foco.indice}"]`);
    (b && !b.disabled ? b : items[foco.indice]?.querySelector('input, textarea'))?.focus();
  } else {
    nueva.querySelector('[data-ed-op="agregar"]')?.focus();
  }
}

function operarLista(ruta, op, i) {
  const def = LISTAS[ruta];
  let items = leer(ed.curso, ruta);
  if (!Array.isArray(items)) { items = []; escribir(ed.curso, ruta, items); }
  if (op === 'agregar') {
    items.push(def.simple ? '' : def.nuevo());
    marcarSucio();
    repintarLista(ruta, { tipo: 'item', indice: items.length - 1 });
    return;
  }
  if (op === 'quitar') {
    items.splice(i, 1);
    marcarSucio();
    repintarLista(ruta, items.length ? { tipo: 'item', indice: Math.min(i, items.length - 1) } : null);
    return;
  }
  const j = op === 'subir' ? i - 1 : i + 1;
  if (j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  marcarSucio();
  repintarLista(ruta, { tipo: 'boton', op, indice: j });
}

/* ------------------------------------------------------------------ */
/* Formulario de curso                                                 */
/* ------------------------------------------------------------------ */

function cursoVacio() {
  return {
    slug: '', nombre: '', nombreCorto: '', subtitulo: '', categoria: '', nivel: '', modalidad: 'Presencial',
    ubicacion: '', imagenPortada: null, fechaInicio: '', fechaFin: '', dias: '', horario: '',
    semanas: null, totalClases: null, calendario: [], cupos: null, descripcion: '', dirigidoA: [],
    destacados: { titulo: '', items: [], cierre: '' }, incluye: [], pensum: [], practicas: [], requisitos: [],
    certificado: { incluye: false, descripcion: '' }, precioUSD: null, condicionesPago: '', preguntas: [],
    estado: 'vigente', galeria: [], egresadas: null, publicado: false, archivado: false
  };
}

function seccion(id, titulo, ayuda, contenido) {
  return `
    <section class="editor__seccion" aria-labelledby="${id}">
      <h2 class="editor__titulo" id="${id}" tabindex="-1">${esc(titulo)}</h2>
      ${ayuda ? `<p class="editor__ayuda">${ayuda}</p>` : ''}
      ${contenido}
    </section>`;
}

function htmlPortada() {
  const p = ed.curso.imagenPortada;
  return `
    <div class="portada-ed" data-ed-portada>
      <div class="portada-ed__vista">
        ${p?.src
          ? `<img src="${esc(p.miniatura || p.src)}" alt="" width="${p.ancho || 600}" height="${p.alto || 450}">`
          : placeholderFoto({ descripcion: 'sin portada', proporcion: '4 / 5', sinBorde: true })}
      </div>
      <div class="portada-ed__datos">
        <div class="portada-ed__botones">
          <button class="boton boton--secundario boton--compacto" type="button" data-ed="elegir-portada">
            ${icono('subir', { tamano: 18 })}<span>${p?.src ? 'Cambiar foto' : 'Subir foto o flyer'}</span>
          </button>
          ${p?.src ? `<button class="boton boton--texto boton--compacto" type="button" data-ed="quitar-portada">Quitar</button>` : ''}
        </div>
        <input class="solo-lectores" type="file" accept="${TIPOS_ACEPTADOS}" data-ed-archivo="portada" tabindex="-1" aria-hidden="true">
        <p class="campo__ayuda" data-ed-portada-estado role="status">JPG, PNG o WebP. Se comprime aquí antes de subirla (1200 y 600 px de ancho).</p>
        ${p?.src ? `
          ${campo({ ruta: 'imagenPortada.alt', etiqueta: 'Descripción de la imagen', obligatorio: true, ayuda: 'Para lectores de pantalla. Ej. "Flyer de Visión Lash: inicia el 4 de noviembre".' })}
          ${casilla({ ruta: 'imagenPortada.flyer', etiqueta: 'Es un flyer (ya trae la fecha)', ayuda: 'La tarjeta no le pone encima la insignia de fecha.' })}` : ''}
      </div>
    </div>`;
}

function htmlBarraEditor() {
  const c = ed.curso;
  const guardado = Boolean(c.id);
  return `
    <div class="editor__barra" data-ed-barra>
      <p class="editor__estado" data-ed-estado role="status">${sucio ? 'Cambios sin guardar' : guardado ? 'Todo guardado' : 'Curso nuevo sin guardar'}</p>
      <div class="editor__acciones">
        ${boton({ texto: 'Vista previa', iconoIzquierda: 'ojo', variante: 'secundario', clase: 'boton--compacto', atributos: { 'data-ed': 'vista-previa', title: 'Vista previa' } })}
        ${!c.publicado && !c.archivado ? boton({ texto: 'Guardar y publicar', variante: 'secundario', clase: 'boton--compacto', atributos: { 'data-ed': 'guardar-publicar' } }) : ''}
        ${boton({ texto: 'Guardar', tipo: 'submit', clase: 'boton--compacto' })}
      </div>
    </div>`;
}

function estadoCurso(c) {
  if (c.archivado) return insignia('borrador', 'Archivado');
  if (!c.publicado) return insignia('borrador', 'Borrador');
  return insignia('disponible', 'Publicado');
}

async function vistaEditor(slug) {
  sucio = false;
  if (slug) {
    const curso = await obtenerCursoEditable(slug);
    if (!curso) {
      return {
        titulo: 'Curso no encontrado',
        html: `${cabeza({ etiqueta: 'Editar curso', titulo: 'No encontramos ese curso', volver: { href: '#cursos', texto: 'Cursos' } })}
               ${boton({ texto: 'Ver todos los cursos', href: '#cursos' })}`
      };
    }
    const admin = (await obtenerCursosAdmin({ archivados: curso.archivado })).find((c) => c.slug === slug);
    const { inscritas, actualizado, ...limpio } = curso;
    ed = {
      curso: { ...cursoVacio(), ...structuredClone(limpio) },
      porSemanas: (curso.pensum || []).some((s) => s.semana != null),
      slugManual: true,
      original: curso.slug,
      confirmadas: admin?.conteo?.confirmadas ?? 0
    };
    ed.curso.destacados ??= { titulo: '', items: [], cierre: '' };
    ed.curso.certificado ??= { incluye: false, descripcion: '' };
  } else {
    ed = { curso: cursoVacio(), porSemanas: false, slugManual: false, confirmadas: 0 };
  }
  const c = ed.curso;
  const titulo = slug ? c.nombre : 'Nuevo curso';

  const html = `
    ${cabeza({
      etiqueta: slug ? 'Editar curso' : 'Crear curso',
      titulo,
      meta: slug ? `${estadoCurso(c)} <span class="vista__meta-sep">·</span> /cursos/${esc(c.slug)}` : 'Se guarda como borrador: nadie lo ve hasta que lo publiques.',
      volver: slug ? { href: `#cursos/${encodeURIComponent(slug)}`, texto: c.nombre } : { href: '#cursos', texto: 'Cursos' }
    })}
    <form class="editor" data-editor novalidate>
      <div class="editor__errores" data-ed-errores tabindex="-1" hidden></div>

      ${seccion('ed-sec-generales', 'Datos generales', '', `
        ${campo({ ruta: 'nombre', etiqueta: 'Nombre del curso', obligatorio: true, marcador: 'Ej. Visión Lash' })}
        ${campo({ ruta: 'slug', etiqueta: 'Dirección del curso', obligatorio: true, ayuda: `La ficha queda en <strong>/cursos/<span data-ed-slug-vista>${esc(c.slug || '…')}</span></strong>. Minúsculas, números y guiones.${c.publicado ? ' Cambiarla rompe los enlaces que ya se compartieron.' : ''}`, extra: 'autocapitalize="off" spellcheck="false"' })}
        <div class="editor__fila">
          ${campo({ ruta: 'nombreCorto', etiqueta: 'Nombre corto', ayuda: 'Para la barra fija del celular.' })}
          ${campo({ ruta: 'subtitulo', etiqueta: 'Subtítulo', marcador: 'Una línea que resume el curso' })}
        </div>
        <div class="editor__fila">
          ${campo({ ruta: 'categoria', etiqueta: 'Categoría', obligatorio: true, marcador: 'Ej. Pestañas' })}
          ${campo({ ruta: 'nivel', etiqueta: 'Nivel', obligatorio: true, marcador: 'Ej. De cero a profesional' })}
        </div>
        <div class="editor__fila">
          ${selector({ ruta: 'modalidad', etiqueta: 'Modalidad', opciones: MODALIDADES })}
          ${campo({ ruta: 'ubicacion', etiqueta: 'Ubicación', marcador: 'Ciudad o plataforma' })}
        </div>
        ${area({ ruta: 'descripcion', etiqueta: 'Descripción', filas: 5 })}
        <div class="editor__grupo">
          <p class="campo__etiqueta">¿Para quién es?${opcional(false)}</p>
          ${htmlLista('dirigidoA')}
        </div>
        <div class="editor__grupo">
          <p class="campo__etiqueta">Lista destacada${opcional(false)}</p>
          <p class="campo__ayuda">Aparece en "Sobre el curso" (ej. "Porque tu éxito es nuestra meta").</p>
          ${campo({ ruta: 'destacados.titulo', etiqueta: 'Título de la lista' })}
          ${htmlLista('destacados.items')}
          ${area({ ruta: 'destacados.cierre', etiqueta: 'Frase de cierre', filas: 2 })}
        </div>`)}

      ${seccion('ed-sec-portada', 'Portada', 'Foto o flyer de la tarjeta y de la ficha. Un flyer 4:5 se ve completo, sin recortes.', htmlPortada())}

      ${seccion('ed-sec-fechas', 'Fechas y horario', '', `
        <div class="editor__fila">
          ${campo({ ruta: 'fechaInicio', etiqueta: 'Fecha de inicio', tipo: 'date', obligatorio: true })}
          ${campo({ ruta: 'fechaFin', etiqueta: 'Fecha de cierre', tipo: 'date', obligatorio: true })}
        </div>
        <div class="editor__fila">
          ${campo({ ruta: 'dias', etiqueta: 'Días', marcador: 'Ej. Miércoles y viernes' })}
          ${campo({ ruta: 'horario', etiqueta: 'Horario', marcador: 'Ej. 9:00 a. m. a 1:00 p. m.' })}
        </div>
        <div class="editor__fila">
          ${campo({ ruta: 'semanas', etiqueta: 'Semanas', tipo: 'number', obligatorio: true, extra: 'min="1" step="1"' })}
          ${campo({ ruta: 'totalClases', etiqueta: 'Total de clases', tipo: 'number', obligatorio: true, extra: 'min="1" step="1"' })}
        </div>
        <div class="editor__grupo">
          <p class="campo__etiqueta">Calendario${opcional(false)}</p>
          <p class="campo__ayuda">Fecha de cada clase. Se muestra en la ficha como "Calendario".</p>
          ${htmlLista('calendario')}
        </div>`)}

      ${seccion('ed-sec-cupos', 'Cupos y precio', 'El precio solo se ve en la ficha, después de todo lo que incluye.', `
        <div class="editor__fila">
          ${campo({ ruta: 'cupos', etiqueta: 'Cupos', tipo: 'number', obligatorio: true, extra: 'min="1" step="1"', ayuda: ed.confirmadas ? `Hay ${plural(ed.confirmadas, 'inscrita confirmada', 'inscritas confirmadas')}: no puede ser menos.` : '' })}
          ${campo({ ruta: 'precioUSD', etiqueta: 'Precio total (USD)', tipo: 'number', obligatorio: true, extra: 'min="0" step="0.01"' })}
        </div>
        ${area({ ruta: 'condicionesPago', etiqueta: 'Condiciones de pago', filas: 2, marcador: 'Ej. Reservas tu cupo con $140 y pagas 6 cuotas de $60.' })}`)}

      ${seccion('ed-sec-incluye', 'Qué incluye', '', htmlLista('incluye'))}

      ${seccion('ed-sec-pensum', 'Pensum', 'Por semanas se titula "Pensum" y numera cada semana; por módulos se titula "Qué aprenderás".', `
        <label class="casilla">
          <input type="checkbox" data-ed-semanas${ed.porSemanas ? ' checked' : ''}>
          <span>Organizar por semanas</span>
        </label>
        ${htmlLista('pensum')}`)}

      ${seccion('ed-sec-practicas', 'Prácticas', '', htmlLista('practicas'))}
      ${seccion('ed-sec-requisitos', 'Requisitos', '', htmlLista('requisitos'))}

      ${seccion('ed-sec-certificado', 'Certificado', '', `
        ${casilla({ ruta: 'certificado.incluye', etiqueta: 'Incluye certificado' })}
        ${area({ ruta: 'certificado.descripcion', etiqueta: 'Descripción del certificado', filas: 3 })}`)}

      ${seccion('ed-sec-preguntas', 'Preguntas frecuentes', 'Si no hay preguntas, la sección no aparece en la ficha.', htmlLista('preguntas'))}

      ${htmlBarraEditor()}
    </form>`;

  return { titulo: slug ? `Editar ${c.nombre}` : 'Nuevo curso', html };
}

/** Lo que se escribe en un campo pasa al estado del formulario. */
function alEscribir(campoEl) {
  const ruta = campoEl.dataset.ruta;
  const tipo = campoEl.dataset.tipo;
  const valor = tipo === 'bool' ? campoEl.checked
    : tipo === 'numero' ? entero(campoEl.value)
    : tipo === 'lineas' ? campoEl.value.split('\n')
    : campoEl.value;
  escribir(ed.curso, ruta, valor);
  campoEl.removeAttribute('aria-invalid');

  if (ruta === 'nombre' && !ed.slugManual) {
    ed.curso.slug = slugDe(campoEl.value);
    const s = ctx.vista().querySelector('[data-ruta="slug"]');
    if (s) s.value = ed.curso.slug;
  }
  if (ruta === 'slug') ed.slugManual = true;
  if (ruta === 'nombre' || ruta === 'slug') {
    const vistaSlug = ctx.vista().querySelector('[data-ed-slug-vista]');
    if (vistaSlug) vistaSlug.textContent = ed.curso.slug || '…';
  }
  marcarSucio();
}

function marcarSucio() {
  sucio = true;
  const e = ctx.vista().querySelector('[data-ed-estado]');
  if (e) e.textContent = 'Cambios sin guardar';
}

/** Valida y limpia el formulario. Devuelve el curso listo o la lista de errores. */
function limpiar() {
  const c = structuredClone(ed.curso);
  const errores = [];
  const falta = (ruta, textoError) => errores.push({ id: idCampo(ruta), texto: textoError });

  for (const k of ['nombre', 'slug', 'nombreCorto', 'subtitulo', 'categoria', 'nivel', 'ubicacion', 'dias', 'horario', 'descripcion', 'condicionesPago']) {
    c[k] = texto(c[k]);
  }
  c.slug = c.slug.toLowerCase();
  if (!c.nombre) falta('nombre', 'Escribe el nombre del curso.');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug)) falta('slug', 'La dirección solo admite minúsculas sin acentos, números y guiones (ej. vision-lash).');
  if (!c.categoria) falta('categoria', 'Escribe la categoría.');
  if (!c.nivel) falta('nivel', 'Escribe el nivel.');
  if (!MODALIDADES.includes(c.modalidad)) falta('modalidad', 'Elige la modalidad.');
  if (!c.fechaInicio) falta('fechaInicio', 'Elige la fecha de inicio.');
  if (!c.fechaFin) falta('fechaFin', 'Elige la fecha de cierre.');
  if (c.fechaInicio && c.fechaFin && c.fechaFin < c.fechaInicio) falta('fechaFin', 'La fecha de cierre no puede ser antes del inicio.');
  if (!Number.isInteger(c.semanas) || c.semanas < 1) falta('semanas', 'Las semanas deben ser un número entero mayor que 0.');
  if (!Number.isInteger(c.totalClases) || c.totalClases < 1) falta('totalClases', 'El total de clases debe ser un número entero mayor que 0.');
  if (!Number.isInteger(c.cupos) || c.cupos < 1) falta('cupos', 'Los cupos deben ser un número entero mayor que 0.');
  else if (c.cupos < ed.confirmadas) falta('cupos', `Hay ${plural(ed.confirmadas, 'inscrita confirmada', 'inscritas confirmadas')}: los cupos no pueden ser menos.`);
  if (c.precioUSD == null || Number.isNaN(c.precioUSD) || c.precioUSD < 0) falta('precioUSD', 'Escribe el precio en USD (0 si es gratis).');

  if (c.imagenPortada?.src) {
    c.imagenPortada.alt = texto(c.imagenPortada.alt);
    if (!c.imagenPortada.alt) falta('imagenPortada.alt', 'Describe la imagen de portada.');
    c.imagenPortada.flyer = Boolean(c.imagenPortada.flyer);
  } else {
    c.imagenPortada = null;
  }

  const simples = (l) => (l || []).map(texto).filter(Boolean);
  c.dirigidoA = simples(c.dirigidoA);
  c.incluye = simples(c.incluye);
  c.requisitos = simples(c.requisitos);

  const d = c.destacados || {};
  const destacados = { titulo: texto(d.titulo), items: simples(d.items), cierre: texto(d.cierre) };
  if (!destacados.titulo && destacados.items.length) falta('destacados.titulo', 'La lista destacada necesita un título.');
  c.destacados = destacados.titulo || destacados.items.length ? { titulo: destacados.titulo, items: destacados.items, ...(destacados.cierre ? { cierre: destacados.cierre } : {}) } : null;

  c.calendario = (c.calendario || []).map((x) => ({ fecha: x.fecha || '', texto: texto(x.texto), ...(x.destacada ? { destacada: true } : {}) }))
    .filter((x) => x.fecha || x.texto);
  c.calendario.forEach((x, i) => {
    if (!x.fecha) falta(`calendario.${i}.fecha`, `Calendario: a la fecha ${i + 1} le falta el día.`);
    if (!x.texto) falta(`calendario.${i}.texto`, `Calendario: escribe qué pasa en la fecha ${i + 1}.`);
  });
  c.calendario.sort((a, b) => a.fecha.localeCompare(b.fecha));

  c.pensum = (c.pensum || []).map((s) => ({ titulo: texto(s.titulo), temas: (s.temas || []).map(texto).filter(Boolean) }))
    .filter((s) => s.titulo || s.temas.length)
    .map((s, i) => (ed.porSemanas ? { semana: i + 1, ...s } : s));
  c.pensum.forEach((s, i) => { if (!s.titulo) falta(`pensum.${i}.titulo`, `Pensum: falta el título ${ed.porSemanas ? 'de la semana' : 'del módulo'} ${i + 1}.`); });

  c.practicas = (c.practicas || []).map((p) => ({ titulo: texto(p.titulo), descripcion: texto(p.descripcion), requiereModelo: Boolean(p.requiereModelo) }))
    .filter((p) => p.titulo || p.descripcion);
  c.practicas.forEach((p, i) => { if (!p.titulo) falta(`practicas.${i}.titulo`, `Prácticas: falta el título de la práctica ${i + 1}.`); });

  c.preguntas = (c.preguntas || []).map((p) => ({ pregunta: texto(p.pregunta), respuesta: texto(p.respuesta) }))
    .filter((p) => p.pregunta || p.respuesta);
  c.preguntas.forEach((p, i) => {
    if (!p.pregunta) falta(`preguntas.${i}.pregunta`, `Preguntas: falta la pregunta ${i + 1}.`);
    if (!p.respuesta) falta(`preguntas.${i}.respuesta`, `Preguntas: falta la respuesta ${i + 1}.`);
  });

  c.certificado = { incluye: Boolean(c.certificado?.incluye), descripcion: texto(c.certificado?.descripcion) };
  c.nombreCorto ||= null;
  c.condicionesPago ||= null;
  return { curso: c, errores };
}

function mostrarErrores(errores, titulo = 'Revisa estos datos antes de guardar') {
  const caja = ctx.vista().querySelector('[data-ed-errores]');
  ctx.vista().querySelectorAll('[aria-invalid="true"]').forEach((x) => x.removeAttribute('aria-invalid'));
  errores.forEach((e) => document.getElementById(e.id)?.setAttribute('aria-invalid', 'true'));
  caja.innerHTML = `
    <p class="editor__errores-titulo">${icono('informacion', { tamano: 20 })}<span>${esc(titulo)}</span></p>
    <ul>${errores.map((e) => `<li>${document.getElementById(e.id) ? `<a href="#${esc(e.id)}" data-ed-ir="${esc(e.id)}">${esc(e.texto)}</a>` : esc(e.texto)}</li>`).join('')}</ul>`;
  caja.hidden = false;
  caja.focus();
}

/**
 * Guarda el formulario. Devuelve el curso guardado o null.
 * @param {{publicar?: boolean}} [op]
 */
async function guardarFormulario({ publicar = false } = {}) {
  const { curso, errores } = limpiar();
  if (errores.length) { mostrarErrores(errores); return null; }
  if (publicar && !curso.archivado) curso.publicado = true;

  const barra = ctx.vista().querySelector('[data-ed-barra]');
  barra?.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  const estado = ctx.vista().querySelector('[data-ed-estado]');
  if (estado) estado.textContent = 'Guardando…';

  const slugAntes = ed.curso.id ? ed.original : null;
  const { curso: guardado, error } = await guardarCurso(curso);
  barra?.querySelectorAll('button').forEach((b) => { b.disabled = false; });
  if (error) {
    if (estado) estado.textContent = 'Cambios sin guardar';
    if (error === 'slug-repetido') mostrarErrores([{ id: idCampo('slug'), texto: mensaje(error) }], 'No se pudo guardar');
    else mostrarErrores([{ id: '', texto: mensaje(error) }], 'No se pudo guardar');
    return null;
  }

  sucio = false;
  ctx.vista().querySelector('[data-ed-errores]').hidden = true;
  const cambioDeRuta = !slugAntes || slugAntes !== guardado.slug || publicar;
  ed.original = guardado.slug;
  ed.curso = { ...ed.curso, id: guardado.id, slug: guardado.slug, publicado: guardado.publicado };
  avisar(publicar ? 'Curso guardado y publicado.' : 'Curso guardado.');
  if (cambioDeRuta) {
    // Vuelve a dibujar el formulario con la dirección nueva (y el estado publicado)
    if (location.hash === `#editar/${guardado.slug}`) await ctx.pintar();
    else location.hash = `#editar/${encodeURIComponent(guardado.slug)}`;
  } else if (estado) {
    estado.textContent = 'Todo guardado';
  }
  return guardado;
}

/** Abre la pestaña dentro del toque (si no, el navegador la bloquea) y luego guarda. */
async function vistaPrevia() {
  const pestana = window.open('', '_blank');
  try { if (pestana) pestana.document.body.innerHTML = '<p style="font:16px system-ui,sans-serif;color:#6B625A;padding:24px">Guardando y abriendo la vista previa…</p>'; } catch { /* nada */ }
  const guardado = sucio || !ed.curso.id ? await guardarFormulario() : { slug: ed.curso.slug };
  if (!guardado) { pestana?.close(); return; }
  const url = `/cursos/${encodeURIComponent(guardado.slug)}`;
  if (pestana) pestana.location.href = url;
  else window.open(url, '_blank', 'noopener');
}

async function subirPortada(archivo) {
  const estado = ctx.vista().querySelector('[data-ed-portada-estado]');
  const decir = (t) => { if (estado) estado.textContent = t; };
  decir('Comprimiendo la foto…');
  const carpeta = `portadas/${ed.curso.slug || 'curso-nuevo'}`;
  const r = await subirImagen('cursos', carpeta, archivo);
  if (r.error) { decir(mensaje(r.error)); return; }
  const anterior = ed.curso.imagenPortada || {};
  ed.curso.imagenPortada = {
    src: r.src, miniatura: r.miniatura, ancho: r.ancho, alto: r.alto,
    alt: anterior.alt || `Portada del curso ${ed.curso.nombre || ''}`.trim(),
    flyer: Boolean(anterior.flyer)
  };
  marcarSucio();
  ctx.vista().querySelector('[data-ed-portada]').outerHTML = htmlPortada();
  ctx.vista().querySelector('[data-ed-portada-estado]').textContent =
    `Foto lista (${r.ancho} × ${r.alto} px, ${peso(r.peso)} en total). Guarda el curso para aplicarla.`;
  ctx.vista().querySelector('[data-ruta="imagenPortada.alt"]')?.focus();
}

/* ------------------------------------------------------------------ */
/* Herramientas en la ficha del curso del panel (#cursos/[slug])       */
/* ------------------------------------------------------------------ */

/** Botones del superadmin para un curso. admin.js los pone bajo el título. */
export function htmlHerramientasCurso(curso) {
  const s = encodeURIComponent(curso.slug);
  const finalizado = curso.estado === 'finalizado';
  const atr = (accion, valor) => ({ 'data-ed': accion, 'data-slug': curso.slug, ...(valor != null ? { 'data-valor': valor } : {}) });
  return `
    <section class="herramientas-curso" aria-labelledby="titulo-herramientas">
      <div class="herramientas-curso__cabeza">
        <h2 class="vista__subtitulo" id="titulo-herramientas">Herramientas del desarrollador</h2>
        ${estadoCurso(curso)}
      </div>
      <div class="herramientas-curso__botones">
        ${boton({ texto: 'Editar', iconoIzquierda: 'editar', clase: 'boton--compacto', href: `#editar/${s}` })}
        ${boton({ texto: 'Vista previa', iconoIzquierda: 'ojo', variante: 'secundario', clase: 'boton--compacto', href: `/cursos/${s}`, atributos: { target: '_blank', rel: 'noopener' } })}
        ${curso.archivado ? '' : curso.publicado
          ? boton({ texto: 'Despublicar', variante: 'secundario', clase: 'boton--compacto', atributos: atr('publicar', '0') })
          : boton({ texto: 'Publicar', variante: 'secundario', clase: 'boton--compacto', atributos: atr('publicar', '1') })}
        ${curso.archivado ? '' : boton({ texto: finalizado ? 'Egresadas y fotos' : 'Finalizar curso', iconoIzquierda: 'certificado', variante: 'secundario', clase: 'boton--compacto', href: `#finalizar/${s}` })}
        ${boton({ texto: 'Duplicar', iconoIzquierda: 'copiar', variante: 'secundario', clase: 'boton--compacto', atributos: atr('duplicar') })}
        ${boton({ texto: curso.archivado ? 'Sacar del archivo' : 'Archivar', iconoIzquierda: 'archivar', variante: 'texto', clase: 'boton--compacto', atributos: atr('archivar', curso.archivado ? '0' : '1') })}
      </div>
    </section>`;
}

/** Botón "Crear curso" de la lista de cursos. */
export const botonCrearCurso = () =>
  boton({ texto: 'Crear curso', iconoIzquierda: 'mas', clase: 'boton--compacto', href: '#curso-nuevo' });

async function accionPublicar(slug, publicar) {
  if (!publicar && !(await preguntar({
    titulo: '¿Despublicar este curso?',
    texto: 'La ficha deja de verse en la web y no recibe solicitudes nuevas. Las inscripciones se conservan.',
    si: 'Sí, despublicar'
  }))) return;
  const { error } = await publicarCurso(slug, publicar);
  if (error) { ventanaError('No se pudo cambiar', error); return; }
  await ctx.pintar();
  avisar(publicar ? 'Curso publicado: ya se ve en la web.' : 'Curso despublicado.');
}

async function accionArchivar(slug, archivar) {
  if (archivar && !(await preguntar({
    titulo: '¿Archivar este curso?',
    texto: 'Se despublica y pasa a "Archivados". Las inscripciones se conservan y puedes sacarlo del archivo cuando quieras.',
    si: 'Sí, archivar'
  }))) return;
  const { error } = await archivarCurso(slug, archivar);
  if (error) { ventanaError('No se pudo cambiar', error); return; }
  await ctx.pintar();
  avisar(archivar ? 'Curso archivado.' : 'El curso salió del archivo como borrador.');
}

async function accionDuplicar(slug) {
  const { curso, error } = await duplicarCurso(slug);
  if (error) { ventanaError('No se pudo duplicar', error); return; }
  location.hash = `#editar/${encodeURIComponent(curso.slug)}`;
  avisar('Copia creada como borrador. Cambia nombre, dirección y fechas.');
}

/** Lista "Archivados" bajo los cursos (solo superadmin). */
export async function htmlArchivados(fila) {
  const archivados = await obtenerCursosAdmin({ archivados: true });
  if (!archivados.length) return '';
  return `
    <section class="bloque-panel" aria-label="Archivados">
      <h2 class="vista__subtitulo">Archivados</h2>
      <ul class="cursos-panel">${archivados.map(fila).join('')}</ul>
    </section>`;
}

/* ------------------------------------------------------------------ */
/* Finalizar: egresadas y fotos (#finalizar/[slug])                    */
/* ------------------------------------------------------------------ */

function htmlFotosCurso() {
  const fotos = fin.galeria;
  if (!fotos.length) return '<p class="editor__ayuda" data-fin-fotos>Todavía no hay fotos.</p>';
  return `
    <ol class="fotos-ed" data-fin-fotos>
      ${fotos.map((f, i) => `
        <li class="fotos-ed__item">
          <img class="fotos-ed__img" src="${esc(f.miniatura || f.src)}" alt="" width="120" height="120" loading="lazy">
          <div class="fotos-ed__datos">
            <div class="campo">
              <label class="campo__etiqueta" for="fin-alt-${i}">Descripción de la foto ${i + 1}</label>
              <input class="campo__control" id="fin-alt-${i}" type="text" value="${esc(f.alt)}" data-fin-alt="${i}">
            </div>
            <div class="lista-ed__botones">
              ${botonMini({ nombre: 'chevron-arriba', etiqueta: `Subir foto ${i + 1}`, desactivado: i === 0, atributos: { 'data-fin-op': 'subir', 'data-indice': i } })}
              ${botonMini({ nombre: 'chevron-abajo', etiqueta: `Bajar foto ${i + 1}`, desactivado: i === fotos.length - 1, atributos: { 'data-fin-op': 'bajar', 'data-indice': i } })}
              ${botonMini({ nombre: 'papelera', etiqueta: `Quitar foto ${i + 1}`, atributos: { 'data-fin-op': 'quitar', 'data-indice': i } })}
            </div>
          </div>
        </li>`).join('')}
    </ol>`;
}

function repintarFotosCurso(foco) {
  ctx.vista().querySelector('[data-fin-fotos]').outerHTML = htmlFotosCurso();
  if (foco) {
    const b = ctx.vista().querySelector(`[data-fin-op="${foco.op}"][data-indice="${foco.indice}"]`);
    (b && !b.disabled ? b : ctx.vista().querySelector(`[data-fin-alt="${foco.indice}"]`) || ctx.vista().querySelector('[data-ed="elegir-fotos-curso"]'))?.focus();
  }
}

async function vistaFinalizar(slug) {
  sucio = false;
  const curso = await obtenerCursoEditable(slug);
  if (!curso) {
    return {
      titulo: 'Curso no encontrado',
      html: `${cabeza({ etiqueta: 'Finalizar curso', titulo: 'No encontramos ese curso', volver: { href: '#cursos', texto: 'Cursos' } })}`
    };
  }
  const admin = (await obtenerCursosAdmin({ archivados: curso.archivado })).find((c) => c.slug === slug);
  const finalizado = curso.estado === 'finalizado';
  fin = { curso, egresadas: curso.egresadas ?? admin?.conteo?.confirmadas ?? 0, galeria: structuredClone(curso.galeria || []) };

  const html = `
    ${cabeza({
      etiqueta: finalizado ? 'Curso finalizado' : 'Finalizar curso',
      titulo: curso.nombre,
      meta: finalizado
        ? 'Se ve en Cursos anteriores con sus egresadas y fotos.'
        : 'Al finalizarlo deja de recibir inscripciones y aparece en Cursos anteriores.',
      volver: { href: `#cursos/${encodeURIComponent(slug)}`, texto: curso.nombre }
    })}
    <form class="editor" data-finalizar novalidate>
      <div class="editor__errores" data-ed-errores tabindex="-1" hidden></div>
      ${seccion('fin-sec-egresadas', 'Egresadas', admin ? `Confirmadas en la web: ${admin.conteo.confirmadas}.` : '', `
        <div class="editor__fila">
          <div class="campo">
            <label class="campo__etiqueta" for="fin-egresadas">Número de egresadas</label>
            <input class="campo__control" id="fin-egresadas" type="number" min="0" step="1" inputmode="numeric" value="${esc(fin.egresadas)}" data-fin-egresadas>
          </div>
        </div>`)}
      ${seccion('fin-sec-fotos', 'Fotos del curso', 'Las 3 primeras salen en la tarjeta de Cursos anteriores; todas se ven al ampliar. Se comprimen aquí antes de subirlas.', `
        <div class="portada-ed__botones">
          <button class="boton boton--secundario boton--compacto" type="button" data-ed="elegir-fotos-curso">
            ${icono('subir', { tamano: 18 })}<span>Subir fotos</span>
          </button>
        </div>
        <input class="solo-lectores" type="file" accept="${TIPOS_ACEPTADOS}" multiple data-ed-archivo="fotos-curso" tabindex="-1" aria-hidden="true">
        <p class="campo__ayuda" data-fin-estado role="status">Hasta ${MAX_FOTOS_CURSO} fotos. JPG, PNG o WebP.</p>
        ${htmlFotosCurso()}`)}
      <div class="editor__barra">
        <p class="editor__estado" data-ed-estado role="status">${finalizado ? 'Curso finalizado' : `Curso ${curso.publicado ? 'publicado' : 'sin publicar'} y vigente`}</p>
        <div class="editor__acciones">
          ${finalizado ? boton({ texto: 'Volver a vigente', variante: 'texto', clase: 'boton--compacto', atributos: { 'data-ed': 'reabrir', 'data-slug': slug } }) : ''}
          ${boton({ texto: finalizado ? 'Guardar cambios' : 'Pasar a finalizado', tipo: 'submit', clase: 'boton--compacto' })}
        </div>
      </div>
    </form>`;
  return { titulo: `Finalizar ${curso.nombre}`, html };
}

async function subirFotosCurso(archivos) {
  const estado = ctx.vista().querySelector('[data-fin-estado]');
  const lista = [...archivos].slice(0, Math.max(0, MAX_FOTOS_CURSO - fin.galeria.length));
  if (!lista.length) { estado.textContent = `Ya hay ${MAX_FOTOS_CURSO} fotos: quita alguna para subir otra.`; return; }
  let fallidas = 0;
  for (const [i, archivo] of lista.entries()) {
    estado.textContent = `Comprimiendo y subiendo ${i + 1} de ${lista.length}…`;
    const r = await subirImagen('cursos', `fotos/${fin.curso.slug}`, archivo);
    if (r.error) { fallidas += 1; continue; }
    fin.galeria.push({ src: r.src, miniatura: r.miniatura, ancho: r.ancho, alto: r.alto, alt: `${fin.curso.nombre}: foto ${fin.galeria.length + 1}` });
    sucio = true;
  }
  repintarFotosCurso();
  estado.textContent = fallidas
    ? `Se subieron ${lista.length - fallidas} de ${lista.length}. Las demás no se pudieron leer o pesan demasiado.`
    : `${plural(lista.length, 'foto lista', 'fotos listas')}. Revisa sus descripciones y guarda.`;
}

async function guardarFinalizar() {
  const campoEgresadas = ctx.vista().querySelector('[data-fin-egresadas]');
  const egresadas = Number(campoEgresadas.value);
  const errores = [];
  if (campoEgresadas.value === '' || !Number.isInteger(egresadas) || egresadas < 0) {
    errores.push({ id: 'fin-egresadas', texto: 'Escribe el número de egresadas (0 o más).' });
  }
  fin.galeria.forEach((f, i) => { f.alt = texto(f.alt); if (!f.alt) errores.push({ id: `fin-alt-${i}`, texto: `Describe la foto ${i + 1}.` }); });
  if (errores.length) { mostrarErrores(errores); return; }

  const yaFinalizado = fin.curso.estado === 'finalizado';
  if (!yaFinalizado && !(await preguntar({
    titulo: '¿Pasar a finalizado?',
    texto: `${esc(fin.curso.nombre)} deja de recibir inscripciones y aparece en Cursos anteriores con ${plural(egresadas, 'egresada', 'egresadas')}${fin.curso.publicado ? '' : '. Como no estaba publicado, también se publica'}.`,
    si: 'Sí, finalizar'
  }))) return;

  const { error } = await finalizarCurso(fin.curso.slug, { egresadas, galeria: fin.galeria });
  if (error) { mostrarErrores([{ id: '', texto: mensaje(error) }], 'No se pudo guardar'); return; }
  sucio = false;
  location.hash = `#cursos/${encodeURIComponent(fin.curso.slug)}`;
  avisar(yaFinalizado ? 'Cambios guardados.' : 'Curso finalizado: ya está en Cursos anteriores.');
}

async function accionReabrir(slug) {
  if (!(await preguntar({
    titulo: '¿Volver a vigente?',
    texto: 'Sale de Cursos anteriores y vuelve a recibir inscripciones. Las egresadas y fotos se conservan.',
    si: 'Sí, volver a vigente'
  }))) return;
  const { error } = await reabrirCurso(slug);
  if (error) { ventanaError('No se pudo cambiar', error); return; }
  sucio = false;
  location.hash = `#cursos/${encodeURIComponent(slug)}`;
  avisar('El curso volvió a vigente.');
}

/* ------------------------------------------------------------------ */
/* Galería (#galeria)                                                  */
/* ------------------------------------------------------------------ */

let categoriaNueva = 'formaciones';

function htmlFotosGaleria() {
  if (!galeria.length) {
    return `<div class="panel-vacio" data-gal-lista><p class="panel-vacio__titulo">La galería está vacía</p><p>Sube la primera foto con el botón de arriba.</p></div>`;
  }
  return `
    <ol class="fotos-ed fotos-ed--galeria" data-gal-lista>
      ${galeria.map((f, i) => `
        <li class="fotos-ed__item" data-foto="${esc(f.id)}">
          <img class="fotos-ed__img" src="${esc(f.miniatura)}" alt="" width="120" height="${Math.round(120 * (f.alto || 3) / (f.ancho || 4))}" loading="lazy">
          <div class="fotos-ed__datos">
            <div class="campo">
              <label class="campo__etiqueta" for="gal-alt-${i}">Descripción</label>
              <input class="campo__control" id="gal-alt-${i}" type="text" value="${esc(f.alt)}" data-gal-campo="alt" data-id="${esc(f.id)}">
            </div>
            <div class="campo">
              <label class="campo__etiqueta" for="gal-cat-${i}">Categoría</label>
              <select class="campo__control" id="gal-cat-${i}" data-gal-campo="categoria" data-id="${esc(f.id)}">
                ${CATEGORIAS_GALERIA.map((c) => `<option value="${esc(c.id)}"${c.id === f.categoria ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}
              </select>
            </div>
            <div class="fotos-ed__casillas">
              <label class="casilla"><input type="checkbox" data-gal-campo="destacada" data-id="${esc(f.id)}"${f.destacada ? ' checked' : ''}><span>Avance del inicio</span></label>
              <label class="casilla"><input type="checkbox" data-gal-campo="enAnteriores" data-id="${esc(f.id)}"${f.enAnteriores ? ' checked' : ''}><span>Cursos anteriores</span></label>
            </div>
            <div class="lista-ed__botones">
              <span class="fotos-ed__orden">${i + 1} de ${galeria.length}</span>
              ${botonMini({ nombre: 'chevron-arriba', etiqueta: `Subir foto ${i + 1}`, desactivado: i === 0, atributos: { 'data-gal-op': 'subir', 'data-id': f.id } })}
              ${botonMini({ nombre: 'chevron-abajo', etiqueta: `Bajar foto ${i + 1}`, desactivado: i === galeria.length - 1, atributos: { 'data-gal-op': 'bajar', 'data-id': f.id } })}
              ${botonMini({ nombre: 'papelera', etiqueta: `Eliminar foto ${i + 1}`, atributos: { 'data-gal-op': 'borrar', 'data-id': f.id } })}
            </div>
          </div>
        </li>`).join('')}
    </ol>`;
}

async function repintarGaleria(foco) {
  galeria = await obtenerGaleriaAdmin();
  const zona = ctx.vista().querySelector('[data-gal-lista]');
  if (zona) zona.outerHTML = htmlFotosGaleria();
  const meta = ctx.vista().querySelector('.vista__meta');
  if (meta) meta.textContent = plural(galeria.length, 'foto', 'fotos');
  if (foco) {
    const b = ctx.vista().querySelector(`[data-gal-op="${foco.op}"][data-id="${CSS.escape(foco.id)}"]`);
    (b && !b.disabled ? b : ctx.vista().querySelector(`[data-foto="${CSS.escape(foco.id)}"] input`) || ctx.vista().querySelector('[data-ed="elegir-fotos-galeria"]'))?.focus();
  }
}

async function vistaGaleria() {
  sucio = false;
  galeria = await obtenerGaleriaAdmin();
  return {
    titulo: 'Galería',
    html: `
      ${cabeza({ etiqueta: 'Galería', titulo: 'Galería', meta: plural(galeria.length, 'foto', 'fotos') })}
      <section class="editor__seccion" aria-labelledby="gal-subir">
        <h2 class="editor__titulo" id="gal-subir">Subir fotos</h2>
        <p class="editor__ayuda">Se comprimen aquí antes de subirlas (1200 y 600 px). Después puedes cambiar la descripción, la categoría y el orden.</p>
        <div class="editor__fila editor__fila--subir">
          <div class="campo">
            <label class="campo__etiqueta" for="gal-categoria-nueva">Categoría de las fotos nuevas</label>
            <select class="campo__control" id="gal-categoria-nueva" data-gal-nueva>
              ${CATEGORIAS_GALERIA.map((c) => `<option value="${esc(c.id)}"${c.id === categoriaNueva ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="portada-ed__botones">
            ${boton({ texto: 'Subir fotos', iconoIzquierda: 'subir', clase: 'boton--compacto', atributos: { 'data-ed': 'elegir-fotos-galeria' } })}
          </div>
        </div>
        <input class="solo-lectores" type="file" accept="${TIPOS_ACEPTADOS}" multiple data-ed-archivo="galeria" tabindex="-1" aria-hidden="true">
        <p class="campo__ayuda" data-gal-estado role="status"></p>
      </section>
      <section class="bloque-panel" aria-labelledby="gal-titulo-lista">
        <h2 class="vista__subtitulo" id="gal-titulo-lista">Orden de la galería</h2>
        ${htmlFotosGaleria()}
      </section>`
  };
}

async function subirFotosGaleria(archivos) {
  const estado = ctx.vista().querySelector('[data-gal-estado]');
  const lista = [...archivos];
  const nombreCategoria = CATEGORIAS_GALERIA.find((c) => c.id === categoriaNueva)?.nombre || 'Galería';
  let fallidas = 0;
  for (const [i, archivo] of lista.entries()) {
    estado.textContent = `Comprimiendo y subiendo ${i + 1} de ${lista.length}…`;
    const r = await subirImagen('galeria', categoriaNueva, archivo);
    if (r.error) { fallidas += 1; continue; }
    const { error } = await agregarFotoGaleria({
      archivo: r.src, categoria: categoriaNueva, alt: `${nombreCategoria}: foto nueva`, ancho: r.ancho, alto: r.alto
    });
    if (error) fallidas += 1;
  }
  await repintarGaleria();
  estado.textContent = fallidas
    ? `Se subieron ${lista.length - fallidas} de ${lista.length}. Las demás no se pudieron leer, pesan demasiado o falló la conexión.`
    : `${plural(lista.length, 'foto subida', 'fotos subidas')} al final de la lista. Cambia su descripción para que no diga "foto nueva".`;
}

async function cambiarCampoGaleria(el) {
  const campoGal = el.dataset.galCampo;
  const valor = el.type === 'checkbox' ? el.checked : el.value;
  if (campoGal === 'alt' && !texto(valor)) {
    el.setAttribute('aria-invalid', 'true');
    avisar('La descripción no puede quedar vacía.');
    return;
  }
  el.removeAttribute('aria-invalid');
  const { error } = await cambiarFotoGaleria(el.dataset.id, { [campoGal]: campoGal === 'alt' ? texto(valor) : valor });
  if (error) { ventanaError('No se pudo guardar', error); return; }
  const foto = galeria.find((f) => f.id === el.dataset.id);
  if (foto) foto[campoGal] = valor;
  avisar('Guardado.');
}

async function borrarDeGaleria(id) {
  const foto = galeria.find((f) => f.id === id);
  if (!foto) return;
  if (!(await preguntar({
    titulo: '¿Eliminar esta foto?',
    texto: `Se borra de la galería y de la web: “${esc(foto.alt)}”. No se puede deshacer.`,
    si: 'Sí, eliminar'
  }))) return;
  const i = galeria.indexOf(foto);
  const { error } = await borrarFotoGaleria(id);
  if (error) { ventanaError('No se pudo eliminar', error); return; }
  await repintarGaleria();
  const siguiente = galeria[Math.min(i, galeria.length - 1)];
  (siguiente ? ctx.vista().querySelector(`[data-foto="${CSS.escape(siguiente.id)}"] input`) : ctx.vista().querySelector('[data-ed="elegir-fotos-galeria"]'))?.focus();
  avisar('Foto eliminada.');
}

/* ------------------------------------------------------------------ */
/* Rutas y eventos                                                     */
/* ------------------------------------------------------------------ */

export const RUTAS = {
  'curso-nuevo': () => vistaEditor(null),
  editar: (slug) => vistaEditor(slug),
  finalizar: (slug) => vistaFinalizar(slug),
  galeria: () => vistaGaleria()
};

/** admin.js lo llama al cambiar de vista. */
export function alSalirDeVista() { sucio = false; }

/** Pregunta antes de salir del formulario con cambios sin guardar. */
async function salirSinGuardar(destino) {
  if (await preguntar({
    titulo: '¿Salir sin guardar?',
    texto: 'Hay cambios en el formulario que todavía no guardaste.',
    si: 'Salir sin guardar'
  })) {
    sucio = false;
    location.assign(destino);
  }
}

/**
 * Conecta los eventos del superadmin al panel.
 * @param {{zona: HTMLElement, vista: () => HTMLElement, pintar: () => Promise<void>}} contexto
 */
export function instalar(contexto) {
  ctx = contexto;
  const { zona } = ctx;

  // Enlaces del panel con cambios sin guardar: primero se pregunta
  zona.addEventListener('click', (e) => {
    if (!sucio) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.closest('[data-ed-errores]')) return;
    e.preventDefault();
    e.stopPropagation();
    salirSinGuardar(a.href);
  }, true);
  zona.addEventListener('click', (e) => {
    if (!sucio || !e.target.closest('[data-salir]')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    salirSinGuardar('/');
  }, true);
  window.addEventListener('beforeunload', (e) => { if (sucio) { e.preventDefault(); e.returnValue = ''; } });

  zona.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    const v = ctx.vista();
    if (t.dataset.edIr) {
      e.preventDefault();
      const destino = document.getElementById(t.dataset.edIr);
      destino?.scrollIntoView({ block: 'center' });
      destino?.focus({ preventScroll: true });
    } else if (t.dataset.edLista) {
      operarLista(t.dataset.edLista, t.dataset.edOp, Number(t.dataset.indice));
    } else if (t.dataset.finOp) {
      const i = Number(t.dataset.indice);
      const op = t.dataset.finOp;
      if (op === 'quitar') { fin.galeria.splice(i, 1); repintarFotosCurso({ op: 'quitar', indice: Math.min(i, fin.galeria.length - 1) }); }
      else {
        const j = op === 'subir' ? i - 1 : i + 1;
        [fin.galeria[i], fin.galeria[j]] = [fin.galeria[j], fin.galeria[i]];
        repintarFotosCurso({ op, indice: j });
      }
      sucio = true;
    } else if (t.dataset.galOp) {
      const id = t.dataset.id;
      if (t.dataset.galOp === 'borrar') borrarDeGaleria(id);
      else {
        moverFotoGaleria(id, t.dataset.galOp === 'subir' ? -1 : 1).then(({ error }) => {
          if (error) ventanaError('No se pudo mover', error);
          return repintarGaleria({ op: t.dataset.galOp, id });
        });
      }
    } else switch (t.dataset.ed) {
      case 'elegir-portada': v.querySelector('[data-ed-archivo="portada"]').click(); break;
      case 'quitar-portada':
        ed.curso.imagenPortada = null;
        marcarSucio();
        v.querySelector('[data-ed-portada]').outerHTML = htmlPortada();
        v.querySelector('[data-ed="elegir-portada"]').focus();
        break;
      case 'vista-previa': vistaPrevia(); break;
      case 'guardar-publicar': guardarFormulario({ publicar: true }); break;
      case 'publicar': accionPublicar(t.dataset.slug, t.dataset.valor === '1'); break;
      case 'archivar': accionArchivar(t.dataset.slug, t.dataset.valor === '1'); break;
      case 'duplicar': accionDuplicar(t.dataset.slug); break;
      case 'reabrir': accionReabrir(t.dataset.slug); break;
      case 'elegir-fotos-curso': v.querySelector('[data-ed-archivo="fotos-curso"]').click(); break;
      case 'elegir-fotos-galeria': v.querySelector('[data-ed-archivo="galeria"]').click(); break;
      default: break;
    }
  });

  zona.addEventListener('input', (e) => {
    const el = e.target;
    if (el.closest('[data-editor]') && el.dataset.ruta) alEscribir(el);
    else if (el.dataset.finAlt != null) { fin.galeria[Number(el.dataset.finAlt)].alt = el.value; sucio = true; }
    else if (el.matches('[data-fin-egresadas]')) sucio = true;
  });

  zona.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('[data-ed-semanas]')) {
      ed.porSemanas = el.checked;
      marcarSucio();
      repintarLista('pensum', null);
      el.focus();
    } else if (el.closest('[data-editor]') && el.dataset.ruta && (el.type === 'checkbox' || el.tagName === 'SELECT')) {
      alEscribir(el);
    } else if (el.dataset.edArchivo && el.files?.length) {
      const archivos = [...el.files];
      el.value = '';
      if (el.dataset.edArchivo === 'portada') subirPortada(archivos[0]);
      else if (el.dataset.edArchivo === 'fotos-curso') subirFotosCurso(archivos);
      else subirFotosGaleria(archivos);
    } else if (el.matches('[data-gal-nueva]')) {
      categoriaNueva = el.value;
    } else if (el.dataset.galCampo) {
      cambiarCampoGaleria(el);
    }
  });

  zona.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.matches('[data-editor]')) guardarFormulario();
    else if (e.target.matches('[data-finalizar]')) guardarFinalizar();
  });
}

/** Etiqueta del rol en el menú lateral. */
export const NOMBRE_ROL = 'Desarrollador';
