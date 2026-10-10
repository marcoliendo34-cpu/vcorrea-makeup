// Página: admin.html — panel de la administradora (Verónica).
//
// VISTA PREVIA: funciona con los datos de ejemplo guardados en este navegador
// (ver js/sesion.js y js/datos.js). El control de acceso de aquí es solo de
// interfaz; en la fase 2 lo hace cumplir Supabase (rol admin + RLS).
//
// Rutas (con #, para que el botón Atrás funcione):
//   #resumen          indicadores y "Pendientes por confirmar"
//   #cursos           lista de cursos
//   #cursos/[slug]    inscritas de un curso (filtro, buscador, exportar CSV)
//   #alumnas          listado general de alumnas
//
// La carga y edición de cursos la hace el desarrollador (fase 2): los botones
// "Crear curso" y "Editar curso" solo muestran un aviso.

import { esc, boton, insignia, logo, abrirVentana, avisar, urlWhatsAppA } from './componentes.js';
import { icono } from './iconos.js';
import {
  usuarioEnCache, salir, esAdmin, inicialDe, telefonoVisible, restablecerInscripcionesDemo, EVENTO
} from './sesion.js';
import {
  obtenerResumenAdmin, obtenerCursosAdmin, obtenerPendientes, obtenerInscritasDeCurso,
  obtenerAlumnas, cambiarEstadoInscripcion, normalizar, ESTADOS_INSCRIPCION
} from './datos.js';
import { formatearFecha } from './fechas.js';

/* ------------------------------------------------------------------ */
/* Acceso: sin sesión → ingresar; sin rol admin → inicio               */
/* ------------------------------------------------------------------ */

const usuario = usuarioEnCache();
// (la decisión se toma al final del archivo, cuando todo está definido)

/* ------------------------------------------------------------------ */
/* Textos y formatos                                                   */
/* ------------------------------------------------------------------ */

/** Estados cortos para las listas del panel (el texto largo va en el CSV y en Mi cuenta). */
const CORTO = { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada' };
const ESTADO_CUPOS = { disponible: 'Disponible', ultimos: 'Últimos cupos', agotado: 'Agotado' };

const nombreCompleto = (a) => `${a.nombre} ${a.apellido}`;
/** Fecha de solicitud (ISO con hora) en el formato del sitio, en hora local. */
const fechaSolicitud = (iso) => formatearFecha(new Date(iso));
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function mensajeParaAlumna(alumna, curso) {
  return curso
    ? `Hola ${alumna.nombre}, soy Verónica Correa. Te escribo por tu inscripción en *${curso.nombre}*.`
    : `Hola ${alumna.nombre}, soy Verónica Correa.`;
}

/** ¿La alumna coincide con lo buscado? Nombre, apellido o cédula (con o sin V-, puntos o guiones). */
function coincide(alumna, consulta) {
  const q = normalizar(consulta);
  if (!q) return true;
  const texto = normalizar(`${alumna.nombre} ${alumna.apellido} ${alumna.cedula}`);
  if (q.split(' ').every((p) => texto.includes(p))) return true;
  const digitos = consulta.replace(/\D/g, '');
  return digitos.length >= 3 && String(alumna.cedula).replace(/\D/g, '').includes(digitos);
}

/* ------------------------------------------------------------------ */
/* Piezas                                                              */
/* ------------------------------------------------------------------ */

function miniBarra(porcentaje, { grande = false } = {}) {
  return `<span class="mini-barra${grande ? ' mini-barra--grande' : ''}" style="--valor:${porcentaje / 100}" aria-hidden="true"><span></span></span>`;
}

function enlaceWhatsApp(alumna, curso, { compacto = false } = {}) {
  return `
    <a class="boton boton--secundario boton--compacto${compacto ? ' fila__wa' : ''}" href="${esc(urlWhatsAppA(alumna.telefono, mensajeParaAlumna(alumna, curso)))}"
       target="_blank" rel="noopener" aria-label="WhatsApp con ${esc(nombreCompleto(alumna))}">
      ${icono('whatsapp', { tamano: 18 })}<span>WhatsApp</span>
    </a>`;
}

function enlaceInstagram(alumna) {
  if (!alumna.instagram) return '<span class="fila__vacio">Sin Instagram</span>';
  return `<a class="fila__enlace" href="https://www.instagram.com/${encodeURIComponent(alumna.instagram)}/" target="_blank" rel="noopener">@${esc(alumna.instagram)}</a>`;
}

/**
 * Una inscripción en lista. En Resumen muestra el curso; en el curso, el contacto.
 * @param {import('./datos.js').InscripcionPanel} i
 */
function filaInscripcion(i, { conCurso = false } = {}) {
  const a = i.alumna;
  const c = i.curso;
  const nombre = esc(nombreCompleto(a));
  const segunda = conCurso
    ? `<div class="fila__celda">
         <span class="fila__etiqueta">Curso</span>
         <a class="fila__enlace" href="#cursos/${esc(c.slug)}">${esc(c.nombre)}</a>
         <span class="fila__sub">Inicia el ${esc(formatearFecha(c.fechaInicio))}</span>
       </div>`
    : `<div class="fila__celda">
         <span class="fila__etiqueta">Contacto</span>
         <span>${esc(telefonoVisible(a.telefono))}</span>
         <span class="fila__sub">${enlaceInstagram(a)}</span>
       </div>`;
  return `
    <li class="fila${conCurso ? ' fila--con-curso' : ''}" data-fila="${esc(i.id)}" tabindex="-1">
      <div class="fila__celda fila__persona">
        <span class="fila__nombre">${nombre}</span>
        <span class="fila__sub">${esc(a.cedula)}</span>
      </div>
      ${segunda}
      <div class="fila__celda">
        <span class="fila__etiqueta">Solicitud</span>
        <span>${esc(fechaSolicitud(i.creada))}</span>
      </div>
      <div class="fila__celda fila__estado">${insignia(i.estado, CORTO[i.estado])}</div>
      <div class="fila__acciones">
        ${enlaceWhatsApp(a, c, { compacto: true })}
        ${i.estado !== 'confirmada' ? `<button class="boton boton--principal boton--compacto" type="button" data-accion="confirmar" data-id="${esc(i.id)}" data-nombre="${nombre}" aria-label="Confirmar a ${nombre}">Confirmar</button>` : ''}
        ${i.estado !== 'cancelada' ? `<button class="boton boton--texto boton--compacto" type="button" data-accion="cancelar" data-id="${esc(i.id)}" data-nombre="${nombre}" aria-label="Cancelar la inscripción de ${nombre}">Cancelar</button>` : ''}
      </div>
    </li>`;
}

function titulosFilas(columnas, clase = '') {
  return `<div class="filas__titulos ${clase}" aria-hidden="true">${columnas.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`;
}

function vacio(texto, detalle = '') {
  return `
    <div class="panel-vacio">
      <span class="panel-vacio__icono">${icono('check', { tamano: 24 })}</span>
      <p class="panel-vacio__titulo">${esc(texto)}</p>
      ${detalle ? `<p>${esc(detalle)}</p>` : ''}
    </div>`;
}

function cabeza({ etiqueta, titulo, meta = '', botones = '' }) {
  return `
    <header class="vista__cabeza">
      <div class="vista__textos">
        <p class="etiqueta">${esc(etiqueta)}</p>
        <h1 class="vista__titulo" tabindex="-1">${esc(titulo)}</h1>
        ${meta ? `<p class="vista__meta">${meta}</p>` : ''}
      </div>
      ${botones ? `<div class="vista__botones">${botones}</div>` : ''}
    </header>`;
}

function avisoDesarrollador() {
  abrirVentana({
    icono: 'informacion',
    titulo: 'La carga de cursos la gestiona tu desarrollador',
    texto: '<p>Para publicar un curso nuevo o cambiar uno existente, envíale los datos (nombre, fechas, cupos, precio y fotos) y él lo actualiza en la web.</p>',
    acciones: boton({ texto: 'Entendido', tamano: 'grande', bloque: true, atributos: { 'data-cerrar-ventana': '' } })
  });
}

/* ------------------------------------------------------------------ */
/* Vistas                                                              */
/* ------------------------------------------------------------------ */

async function vistaResumen() {
  const [r, pendientes] = await Promise.all([obtenerResumenAdmin(), obtenerPendientes()]);
  const indicador = (valor, nombre, destacado = false) => `
    <li class="indicador${destacado ? ' indicador--destacado' : ''}">
      <span class="indicador__valor">${valor}</span>
      <span class="indicador__nombre">${esc(nombre)}</span>
    </li>`;
  return {
    titulo: 'Resumen',
    html: `
      ${cabeza({ etiqueta: 'Resumen', titulo: `Hola, ${usuario.nombre}` })}
      <ul class="indicadores" aria-label="Indicadores de los cursos vigentes">
        ${indicador(r.cursosVigentes, 'Cursos vigentes')}
        ${indicador(r.confirmadas, 'Inscritas confirmadas')}
        ${indicador(r.pendientes, 'Pendientes por confirmar', r.pendientes > 0)}
        ${indicador(r.cuposLibres, 'Cupos libres')}
      </ul>

      <section class="bloque-panel" aria-labelledby="titulo-pendientes">
        <div class="bloque-panel__cabeza">
          <h2 class="bloque-panel__titulo" id="titulo-pendientes">Pendientes por confirmar</h2>
          <span class="contador">${pendientes.length}</span>
        </div>
        <p class="bloque-panel__ayuda">Escríbele a cada alumna por WhatsApp y, cuando concrete su pago, confirma su cupo.</p>
        ${pendientes.length
          ? `${titulosFilas(['Alumna', 'Curso', 'Solicitud', 'Estado', ''], 'filas__titulos--con-curso')}
             <ul class="filas">${pendientes.map((i) => filaInscripcion(i, { conCurso: true })).join('')}</ul>`
          : vacio('No hay solicitudes pendientes', 'Cuando una alumna toque "Inscribirme", aparecerá aquí.')}
      </section>

      <div class="nota-demo">
        ${icono('informacion', { tamano: 18 })}
        <p>Vista previa con datos de ejemplo. Los cambios se guardan solo en este navegador.
          <button class="boton boton--texto" type="button" data-restablecer>Restablecer datos de ejemplo</button></p>
      </div>`
  };
}

async function vistaCursos() {
  const cursos = await obtenerCursosAdmin();
  const fila = (c) => {
    const finalizado = c.estado === 'finalizado';
    const estado = finalizado ? insignia('finalizado', 'Finalizado')
      : insignia(c.cuposCalc.estado === 'disponible' ? 'disponible' : c.cuposCalc.estado, ESTADO_CUPOS[c.cuposCalc.estado]);
    const ocupadas = Math.min(c.inscritas, c.cupos);
    return `
      <li>
        <a class="curso-panel" href="#cursos/${esc(c.slug)}">
          <span class="curso-panel__nombre">
            <span class="curso-panel__titulo">${esc(c.nombre)}</span>
            <span class="fila__sub">${esc(c.modalidad)} · ${esc(c.nivel)}</span>
          </span>
          <span class="curso-panel__dato"><span class="fila__etiqueta">Inicio</span>${esc(formatearFecha(c.fechaInicio))}</span>
          <span class="curso-panel__dato"><span class="fila__etiqueta">Cupos</span>${c.cupos}</span>
          <span class="curso-panel__dato"><span class="fila__etiqueta">Inscritas</span>${ocupadas}${c.conteo.pendientes ? `<span class="curso-panel__pendientes">${plural(c.conteo.pendientes, 'pendiente', 'pendientes')}</span>` : ''}</span>
          <span class="curso-panel__ocupacion">${miniBarra(c.cuposCalc.porcentaje)}<strong>${c.cuposCalc.porcentaje}%</strong></span>
          <span class="curso-panel__estado">${estado}</span>
          <span class="curso-panel__flecha" aria-hidden="true">${icono('chevron-derecha', { tamano: 20 })}</span>
        </a>
      </li>`;
  };
  const lista = (titulo, items) => (items.length ? `
    <section class="bloque-panel" aria-label="${esc(titulo)}">
      <h2 class="vista__subtitulo">${esc(titulo)}</h2>
      ${titulosFilas(['Curso', 'Inicio', 'Cupos', 'Inscritas', 'Ocupación', 'Estado', ''], 'filas__titulos--cursos')}
      <ul class="cursos-panel">${items.map(fila).join('')}</ul>
    </section>` : '');
  return {
    titulo: 'Cursos',
    html: `
      ${cabeza({
        etiqueta: 'Cursos', titulo: 'Cursos',
        botones: boton({ texto: 'Crear curso', iconoIzquierda: 'mas', variante: 'secundario', clase: 'boton--compacto', atributos: { 'data-aviso-desarrollador': '' } })
      })}
      ${lista('Vigentes', cursos.filter((c) => c.estado === 'vigente'))}
      ${lista('Finalizados', cursos.filter((c) => c.estado === 'finalizado'))}`
  };
}

async function vistaCurso(slug) {
  const curso = (await obtenerCursosAdmin()).find((c) => c.slug === slug);
  if (!curso) {
    return {
      titulo: 'Curso no encontrado',
      html: `
        <a class="vista__volver" href="#cursos">${icono('flecha-izquierda', { tamano: 18 })}<span>Cursos</span></a>
        ${cabeza({ etiqueta: 'Cursos', titulo: 'No encontramos ese curso' })}
        ${boton({ texto: 'Ver todos los cursos', href: '#cursos' })}`
    };
  }
  const inscritas = await obtenerInscritasDeCurso(slug);
  estado.inscritas = inscritas;
  estado.curso = curso;
  const cc = curso.cuposCalc;
  const ocupadas = Math.min(curso.inscritas, curso.cupos);
  const finalizado = curso.estado === 'finalizado';
  const cuenta = (e) => inscritas.filter((i) => e === 'todas' || i.estado === e).length;
  const chip = (id, texto) => `<button class="chip chip--panel" type="button" data-filtro="${id}" aria-pressed="${estado.filtro === id}">${esc(texto)} <span class="chip__numero">${cuenta(id)}</span></button>`;
  const detalle = [
    `${plural(curso.conteo.confirmadas, 'confirmada', 'confirmadas')} en la web`,
    curso.conteo.fuera ? `${plural(curso.conteo.fuera, 'inscrita', 'inscritas')} fuera de la web` : '',
    finalizado ? '' : plural(curso.conteo.pendientes, 'pendiente', 'pendientes'),
    finalizado ? 'Curso finalizado' : cc.textoRestantes
  ].filter(Boolean);

  return {
    titulo: curso.nombre,
    html: `
      <a class="vista__volver" href="#cursos">${icono('flecha-izquierda', { tamano: 18 })}<span>Cursos</span></a>
      ${cabeza({
        etiqueta: 'Inscritas por curso',
        titulo: curso.nombre,
        meta: `${finalizado ? 'Inició' : 'Inicia'} el ${esc(formatearFecha(curso.fechaInicio))} · ${esc(curso.modalidad)}`,
        botones: `
          ${boton({ texto: 'Editar curso', iconoIzquierda: 'editar', variante: 'secundario', clase: 'boton--compacto', atributos: { 'data-aviso-desarrollador': '' } })}
          ${boton({ texto: 'Exportar lista', iconoIzquierda: 'descargar', clase: 'boton--compacto', desactivado: !inscritas.length, atributos: { 'data-exportar': '' } })}`
      })}

      <div class="ocupacion-curso">
        <div class="ocupacion-curso__cifras">
          <p><strong>${ocupadas} de ${curso.cupos}</strong> cupos ocupados</p>
          <p class="ocupacion-curso__porcentaje">${cc.porcentaje}%</p>
        </div>
        ${miniBarra(cc.porcentaje, { grande: true })}
        <ul class="ocupacion-curso__detalle">${detalle.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
      </div>

      <div class="herramientas-lista">
        <div class="buscar-panel">
          <label class="solo-lectores" for="buscar-inscritas">Buscar inscritas por nombre o cédula</label>
          <span class="buscar-panel__icono" aria-hidden="true">${icono('buscar', { tamano: 20 })}</span>
          <input class="campo__control buscar-panel__campo" id="buscar-inscritas" type="search" autocomplete="off"
                 placeholder="Buscar por nombre o cédula" value="${esc(estado.texto)}" data-buscar="inscritas">
        </div>
        <div class="chips-panel" role="group" aria-label="Filtrar por estado">
          ${chip('todas', 'Todas')}${chip('pendiente', 'Pendientes')}${chip('confirmada', 'Confirmadas')}${chip('cancelada', 'Canceladas')}
        </div>
      </div>
      <p class="lista-conteo" role="status" data-conteo></p>
      <div data-lista-inscritas></div>`,
    despues: pintarInscritas
  };
}

/** Solo la lista del curso (se repinta al buscar o filtrar, sin tocar el buscador). */
function pintarInscritas() {
  const zonaLista = vista.querySelector('[data-lista-inscritas]');
  const conteo = vista.querySelector('[data-conteo]');
  if (!zonaLista) return;
  const visibles = estado.inscritas
    .filter((i) => estado.filtro === 'todas' || i.estado === estado.filtro)
    .filter((i) => coincide(i.alumna, estado.texto));
  const total = estado.inscritas.length;
  conteo.textContent = total === 0 ? ''
    : visibles.length === total ? `${plural(total, 'inscrita', 'inscritas')} en la web`
    : `Mostrando ${visibles.length} de ${plural(total, 'inscrita', 'inscritas')}`;
  zonaLista.innerHTML = !total
    ? vacio('Aún no hay inscritas en la web', 'Cuando una alumna solicite su cupo, aparecerá aquí.')
    : visibles.length
      ? `${titulosFilas(['Alumna', 'Contacto', 'Solicitud', 'Estado', ''])}
         <ul class="filas">${visibles.map((i) => filaInscripcion(i)).join('')}</ul>`
      : vacio('Ninguna inscrita coincide', 'Prueba con otro nombre, otra cédula u otro estado.');
}

async function vistaAlumnas() {
  estado.alumnas = await obtenerAlumnas();
  return {
    titulo: 'Alumnas',
    html: `
      ${cabeza({ etiqueta: 'Alumnas', titulo: 'Alumnas', meta: `${plural(estado.alumnas.length, 'cuenta registrada', 'cuentas registradas')}` })}
      <div class="herramientas-lista">
        <div class="buscar-panel">
          <label class="solo-lectores" for="buscar-alumnas">Buscar alumnas por nombre o cédula</label>
          <span class="buscar-panel__icono" aria-hidden="true">${icono('buscar', { tamano: 20 })}</span>
          <input class="campo__control buscar-panel__campo" id="buscar-alumnas" type="search" autocomplete="off"
                 placeholder="Buscar por nombre o cédula" value="${esc(estado.textoAlumnas)}" data-buscar="alumnas">
        </div>
      </div>
      <p class="lista-conteo" role="status" data-conteo></p>
      <div data-lista-alumnas></div>`,
    despues: pintarAlumnas
  };
}

function pintarAlumnas() {
  const zonaLista = vista.querySelector('[data-lista-alumnas]');
  if (!zonaLista) return;
  const visibles = estado.alumnas.filter((a) => coincide(a, estado.textoAlumnas));
  vista.querySelector('[data-conteo]').textContent = visibles.length === estado.alumnas.length
    ? '' : `Mostrando ${visibles.length} de ${estado.alumnas.length}`;
  const fila = (a) => `
    <li class="fila fila--alumna">
      <div class="fila__celda fila__persona">
        <span class="fila__nombre">${esc(nombreCompleto(a))}</span>
        <span class="fila__sub">${esc(a.cedula)}</span>
      </div>
      <div class="fila__celda">
        <span class="fila__etiqueta">Contacto</span>
        <span>${esc(telefonoVisible(a.telefono))}</span>
        <span class="fila__sub fila__correo">${esc(a.correo)}</span>
        <span class="fila__sub">${enlaceInstagram(a)}</span>
      </div>
      <div class="fila__celda">
        <span class="fila__etiqueta">Cursos</span>
        ${a.inscripciones.length
          ? `<ul class="fila__cursos">${a.inscripciones.map((i) => `
              <li><a class="fila__enlace" href="#cursos/${esc(i.curso.slug)}">${esc(i.curso.nombreCorto || i.curso.nombre)}</a>
                  <span class="fila__estado-texto fila__estado-texto--${esc(i.estado)}">${esc(CORTO[i.estado])}</span></li>`).join('')}</ul>`
          : '<span class="fila__vacio">Sin inscripciones</span>'}
      </div>
      <div class="fila__acciones">${enlaceWhatsApp(a, null)}</div>
    </li>`;
  zonaLista.innerHTML = visibles.length
    ? `${titulosFilas(['Alumna', 'Contacto', 'Cursos', ''], 'filas__titulos--alumnas')}
       <ul class="filas">${visibles.map(fila).join('')}</ul>`
    : vacio('Ninguna alumna coincide', 'Prueba con otro nombre o con el número de cédula.');
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

async function confirmar(id, nombre) {
  const { inscripcion, error } = await cambiarEstadoInscripcion(id, 'confirmada');
  if (error === 'sin-cupos') {
    abrirVentana({
      icono: 'informacion',
      titulo: 'Este curso ya no tiene cupos',
      texto: `<p>Para confirmar a ${esc(nombre)}, primero cancela otra inscripción o pídele a tu desarrollador que amplíe los cupos.</p>`,
      acciones: boton({ texto: 'Entendido', tamano: 'grande', bloque: true, atributos: { 'data-cerrar-ventana': '' } })
    });
    return;
  }
  if (error) { avisar('No se pudo guardar el cambio. Inténtalo de nuevo.'); return; }
  const curso = (await obtenerCursosAdmin()).find((c) => c.slug === inscripcion.cursoSlug);
  await pintar({ foco: id });
  avisar(`Confirmaste a ${nombre}. ${curso ? curso.cuposCalc.textoRestantes : ''}`.trim());
}

function preguntarCancelacion(id, nombre) {
  const d = abrirVentana({
    icono: 'informacion',
    titulo: '¿Cancelar esta inscripción?',
    texto: `<p>La inscripción de ${esc(nombre)} quedará como cancelada. Si estaba confirmada, su cupo vuelve a quedar libre.</p>`,
    acciones: `
      ${boton({ texto: 'Sí, cancelar inscripción', tamano: 'grande', bloque: true, atributos: { 'data-si-cancelar': '' } })}
      ${boton({ texto: 'Volver', variante: 'secundario', tamano: 'grande', bloque: true, atributos: { 'data-cerrar-ventana': '' } })}`
  });
  d.querySelector('[data-si-cancelar]').addEventListener('click', async () => {
    d.close();
    const { error } = await cambiarEstadoInscripcion(id, 'cancelada');
    if (error) { avisar('No se pudo guardar el cambio. Inténtalo de nuevo.'); return; }
    await pintar({ foco: id });
    avisar(`Cancelaste la inscripción de ${nombre}.`);
  }, { once: true });
}

/** CSV para Excel: UTF-8 con BOM (acentos correctos), separado por punto y coma. */
function exportarLista() {
  const { curso, inscritas } = estado;
  if (!curso || !inscritas.length) return;
  const dosDigitos = (n) => String(n).padStart(2, '0');
  const fechaCorta = (iso) => { const f = new Date(iso); return `${dosDigitos(f.getDate())}/${dosDigitos(f.getMonth() + 1)}/${f.getFullYear()}`; };
  const celda = (valor) => {
    let t = String(valor ?? '');
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;            // evita fórmulas al abrir en Excel
    return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const filas = [
    ['Nombre', 'Apellido', 'Cédula', 'Teléfono', 'Correo', 'Instagram', 'Fecha de solicitud', 'Estado'],
    ...inscritas.map((i) => [
      i.alumna.nombre, i.alumna.apellido, i.alumna.cedula, telefonoVisible(i.alumna.telefono),
      i.alumna.correo, i.alumna.instagram || '', fechaCorta(i.creada),   // sin @: Excel lo leería como fórmula
      ESTADOS_INSCRIPCION[i.estado] || i.estado
    ])
  ];
  const texto = `﻿${filas.map((f) => f.map(celda).join(';')).join('\r\n')}\r\n`;
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const hoy = new Date();
  const enlace = Object.assign(document.createElement('a'), {
    href: url,
    download: `inscritas-${curso.slug}-${hoy.getFullYear()}-${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}.csv`
  });
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  avisar(`Descargaste la lista (${plural(inscritas.length, 'inscrita', 'inscritas')}).`);
}

/* ------------------------------------------------------------------ */
/* Estructura y navegación                                             */
/* ------------------------------------------------------------------ */

const estado = { filtro: 'todas', texto: '', textoAlumnas: '', inscritas: [], curso: null, alumnas: [], slug: null };
let vista;
let saliendo = false;   // al cerrar sesión aquí se navega una sola vez

function htmlEstructura() {
  const enlaceNav = (id, nombreIcono, texto) => `
    <li><a class="panel__nav-enlace" href="#${id}" data-nav="${id}">
      ${icono(nombreIcono, { tamano: 22 })}<span>${texto}</span>${id === 'resumen' ? '<span class="panel__nav-contador" data-contador-pendientes hidden></span>' : ''}
    </a></li>`;
  return `
    <aside class="panel__lateral">
      <div class="panel__marca">
        ${logo({ href: '/' })}
        <span class="panel__rotulo">Panel</span>
      </div>
      <div class="panel__acciones-movil">
        <a class="boton boton--secundario boton--icono" href="/" aria-label="Ver el sitio">${icono('ojo', { tamano: 20 })}</a>
        <button class="boton boton--secundario boton--icono" type="button" data-salir aria-label="Cerrar sesión">${icono('salir', { tamano: 20 })}</button>
      </div>
      <nav class="panel__nav" aria-label="Secciones del panel">
        <ul>
          ${enlaceNav('resumen', 'nivel', 'Resumen')}
          ${enlaceNav('cursos', 'clases', 'Cursos')}
          ${enlaceNav('alumnas', 'usuarias', 'Alumnas')}
        </ul>
      </nav>
      <div class="panel__usuario">
        <div class="panel__persona">
          <span class="cuenta__inicial" aria-hidden="true">${esc(inicialDe(usuario))}</span>
          <span class="panel__persona-textos">
            <span class="panel__persona-nombre">${esc(nombreCompleto(usuario))}</span>
            <span class="panel__persona-rol">Administradora</span>
          </span>
        </div>
        <a class="panel__enlace-lateral" href="/">${icono('ojo', { tamano: 18 })}<span>Ver el sitio</span></a>
        <button class="panel__enlace-lateral" type="button" data-salir>${icono('salir', { tamano: 18 })}<span>Cerrar sesión</span></button>
      </div>
    </aside>
    <main class="panel__contenido" id="panel-contenido" tabindex="-1" data-vista></main>`;
}

function ruta() {
  const [nombre = 'resumen', slug = null] = decodeURIComponent(location.hash.slice(1)).split('/');
  return ['resumen', 'cursos', 'alumnas'].includes(nombre) ? [nombre, slug] : ['resumen', null];
}

/**
 * Dibuja la vista de la ruta actual.
 * @param {object} [op]
 * @param {boolean} [op.enfocar]  Lleva el foco al título (al cambiar de sección).
 * @param {string} [op.foco]      Id de la fila que recibe el foco (después de una acción).
 */
async function pintar({ enfocar = false, foco = null } = {}) {
  const [nombre, slug] = ruta();
  if (slug !== estado.slug) { estado.slug = slug; estado.filtro = 'todas'; estado.texto = ''; }

  const v = nombre === 'cursos' && slug ? await vistaCurso(slug)
    : nombre === 'cursos' ? await vistaCursos()
    : nombre === 'alumnas' ? await vistaAlumnas()
    : await vistaResumen();

  vista.innerHTML = v.html;
  v.despues?.();
  document.title = `${v.titulo} · Panel · Verónica Correa Makeup`;
  zona.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === nombre) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const pendientes = (await obtenerResumenAdmin()).pendientes;
  zona.querySelectorAll('[data-contador-pendientes]').forEach((c) => {
    c.hidden = !pendientes;
    // El número se ve; el lector de pantalla oye "5 pendientes"
    c.innerHTML = `<span aria-hidden="true">${pendientes}</span><span class="solo-lectores">, ${pendientes} pendientes</span>`;
  });

  if (foco) {
    const fila = vista.querySelector(`[data-fila="${CSS.escape(foco)}"]`);
    (fila || vista.querySelector('.vista__titulo'))?.focus({ preventScroll: Boolean(fila) });
  } else if (enfocar) {
    vista.querySelector('.vista__titulo')?.focus({ preventScroll: true });
  }
}

const zona = document.querySelector('[data-panel]');

function iniciar() {
  zona.innerHTML = htmlEstructura();
  zona.hidden = false;
  vista = zona.querySelector('[data-vista]');

  // Clics de toda la vista (las listas se vuelven a dibujar, por eso se delega)
  zona.addEventListener('click', (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.matches('[data-accion="confirmar"]')) confirmar(t.dataset.id, t.dataset.nombre);
    else if (t.matches('[data-accion="cancelar"]')) preguntarCancelacion(t.dataset.id, t.dataset.nombre);
    else if (t.matches('[data-aviso-desarrollador]')) avisoDesarrollador();
    else if (t.matches('[data-exportar]') && !t.disabled) exportarLista();
    else if (t.matches('[data-filtro]')) {
      estado.filtro = t.dataset.filtro;
      vista.querySelectorAll('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
      pintarInscritas();
    } else if (t.matches('[data-restablecer]')) {
      restablecerInscripcionesDemo();
      pintar().then(() => avisar('Listo: los datos de ejemplo volvieron al inicio.'));
    } else if (t.matches('[data-salir]')) {
      saliendo = true;
      salir().then(() => location.assign('/'));
    }
  });

  // Buscadores: solo se repinta la lista, el campo conserva el foco
  zona.addEventListener('input', (e) => {
    const campo = e.target.closest('[data-buscar]');
    if (!campo) return;
    if (campo.dataset.buscar === 'inscritas') { estado.texto = campo.value; pintarInscritas(); }
    else { estado.textoAlumnas = campo.value; pintarAlumnas(); }
  });

  window.addEventListener('hashchange', () => {
    window.scrollTo({ top: 0 });
    pintar({ enfocar: true });
  });

  // Si la sesión se cierra (aquí o en otra pestaña), vuelve al inicio
  window.addEventListener(EVENTO, (e) => {
    if (!esAdmin(e.detail?.usuario) && !saliendo) location.replace('/');
  });

  pintar();
}

if (!usuario) location.replace('/ingresar?volver=/admin');
else if (!esAdmin(usuario)) location.replace('/');
else iniciar();
