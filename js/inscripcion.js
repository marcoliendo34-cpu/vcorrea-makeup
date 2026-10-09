// Flujo del botón "Inscribirme" (BRIEF.md §5). Todos los botones "Inscribirme"
// del sitio terminan aquí:
//  - Ficha del curso: llaman a inscribirse(curso) al tocarlos.
//  - Tarjetas (Inicio, Cursos): llevan a /cursos/[slug]?inscribirme=1 y la ficha
//    llama a inscribirse(curso, { automatico: true }) al cargar.
//
// Sin sesión  → ventana "Para inscribirte necesitas una cuenta" con
//               /registro?curso=slug y /ingresar?curso=slug.
// Con sesión  → guarda la solicitud como "Pendiente de confirmación" (sin
//               duplicar) y abre WhatsApp con el mensaje prellenado.
// Verónica confirma el cupo por WhatsApp.

import { abrirVentana, boton, urlWhatsApp, esc } from './componentes.js';
import { usuarioEnCache, telefonoVisible, esAdmin } from './sesion.js';
import { crearInscripcion, obtenerInscripcion, ESTADOS_INSCRIPCION } from './datos.js';
import { cuposDeCurso } from './cupos.js';
import { formatearFecha } from './fechas.js';

export { ESTADOS_INSCRIPCION };

/* ------------------------------------------------------------------ */
/* Mensajes de WhatsApp                                                */
/* ------------------------------------------------------------------ */

/** Solicitud de inscripción (BRIEF.md §5). */
export function mensajeInscripcion(curso, usuario) {
  return [
    `Hola Verónica, quiero inscribirme en *${curso.nombre}*, que inicia el ${formatearFecha(curso.fechaInicio)}.`,
    `Nombre: ${usuario.nombre} ${usuario.apellido}`,
    `Cédula: ${usuario.cedula}`,
    `Teléfono: ${telefonoVisible(usuario.telefono)}`,
    '¿Me confirmas disponibilidad y los datos de pago?'
  ].join('\n');
}

/** Para escribir sobre una inscripción pendiente (Mi cuenta). */
export function mensajeSeguimiento(curso, usuario) {
  return `Hola Verónica, soy ${usuario.nombre} ${usuario.apellido}. Te escribo por mi inscripción en *${curso.nombre}*.`;
}

/** Mensaje de WhatsApp para un curso agotado. */
export function mensajeAvisame(curso) {
  return `Hola Verónica, vi que el curso ${curso.nombre} ya no tiene cupos. ¿Me avisas cuando abras el próximo?`;
}

/** Mensaje de WhatsApp para dudas sobre un curso. */
export function mensajeDudas(curso) {
  return `Hola Verónica, tengo dudas sobre el curso ${curso.nombre}.`;
}

/** Mensaje de WhatsApp para pedir que se repita un curso finalizado. */
export function mensajeRepetir(curso) {
  return curso
    ? `Hola Verónica, me gustaría que repitieras el curso ${curso.nombre}.`
    : 'Hola Verónica, vi tus cursos anteriores y me gustaría que repitieras alguno.';
}

/* ------------------------------------------------------------------ */
/* Ventanas                                                            */
/* ------------------------------------------------------------------ */

function ventanaSinCuenta(curso) {
  const slug = encodeURIComponent(curso.slug);
  abrirVentana({
    icono: 'usuario',
    etiqueta: curso.nombre,
    titulo: 'Para inscribirte necesitas una cuenta',
    texto: '<p>Te toma 1 minuto. Después vuelves a este curso y terminas tu inscripción.</p>',
    acciones: `
      ${boton({ texto: 'Crear cuenta', href: `/registro?curso=${slug}`, tamano: 'grande', bloque: true })}
      ${boton({ texto: 'Ya tengo cuenta', href: `/ingresar?curso=${slug}`, variante: 'secundario', tamano: 'grande', bloque: true })}`
  });
}

function ventanaWhatsApp(curso, url, { abierta, yaPendiente }) {
  const d = abrirVentana({
    icono: 'whatsapp',
    etiqueta: curso.nombre,
    titulo: 'Te llevamos a WhatsApp para completar tu inscripción',
    texto: `
      <p>${yaPendiente ? 'Tu solicitud ya estaba' : 'Tu solicitud quedó'} como <strong>${esc(ESTADOS_INSCRIPCION.pendiente)}</strong> en Mi cuenta.
      Envía el mensaje y Verónica te confirmará el cupo y los datos de pago.</p>
      ${abierta ? '' : '<p class="ventana__nota">Toca el botón para abrir WhatsApp con tu mensaje listo.</p>'}`,
    acciones: `
      ${boton({ texto: abierta ? 'Abrir WhatsApp de nuevo' : 'Continuar en WhatsApp', href: url, iconoIzquierda: 'whatsapp', tamano: 'grande', bloque: true, atributos: { target: '_blank', rel: 'noopener', 'data-enlace-whatsapp': '' } })}
      ${boton({ texto: 'Ver Mi cuenta', href: '/mi-cuenta', variante: 'secundario', tamano: 'grande', bloque: true })}`
  });
  d.querySelector('[data-enlace-whatsapp]')?.addEventListener('click', () => setTimeout(() => d.close(), 300));
}

function ventanaInfo(curso, { titulo, texto, acciones }) {
  abrirVentana({ icono: 'informacion', etiqueta: curso.nombre, titulo, texto: `<p>${texto}</p>`, acciones });
}

/* ------------------------------------------------------------------ */
/* Acción principal                                                    */
/* ------------------------------------------------------------------ */

/**
 * Acción de todos los botones "Inscribirme".
 * @param {import('../data/cursos.js').Curso} curso
 * @param {object} [op]
 * @param {boolean} [op.automatico]  true al volver de registro/ingreso: no hubo
 *   toque de la alumna, así que WhatsApp se abre con un botón (los navegadores
 *   bloquean las ventanas que se abren solas).
 * @param {object|null} [op.previa]  Inscripción previa ya leída (null si no hay).
 * @returns {Promise<{resultado:'sin-sesion'|'cerrado'|'confirmada'|'whatsapp', url?:string}>}  ('cerrado' también para la cuenta admin)
 */
export async function inscribirse(curso, opciones = {}) {
  const { automatico = false } = opciones;
  // Lectura inmediata de la sesión: así WhatsApp se abre dentro del mismo toque.
  const usuario = usuarioEnCache();
  if (!usuario) {
    ventanaSinCuenta(curso);
    return { resultado: 'sin-sesion' };
  }
  if (esAdmin(usuario)) {
    ventanaInfo(curso, {
      titulo: 'Estás en la cuenta de administradora',
      texto: 'Las inscripciones se hacen desde una cuenta de alumna. Las solicitudes de este curso las ves en tu panel.',
      acciones: boton({ texto: 'Ir al panel', href: `/admin#cursos/${encodeURIComponent(curso.slug)}`, tamano: 'grande', bloque: true })
    });
    return { resultado: 'cerrado' };
  }

  const cupos = cuposDeCurso(curso);
  if (curso.estado === 'finalizado' || cupos.estado === 'agotado') {
    ventanaInfo(curso, {
      titulo: curso.estado === 'finalizado' ? 'Este curso ya terminó' : 'Este curso no tiene cupos',
      texto: 'Puedes pedirle a Verónica que te avise cuando abra la próxima edición.',
      acciones: boton({ texto: 'Ver otros cursos', href: '/cursos', tamano: 'grande', bloque: true })
    });
    return { resultado: 'cerrado' };
  }

  // La ficha precarga la inscripción previa para no esperar aquí: window.open
  // tiene que ocurrir dentro del mismo toque o el navegador lo bloquea.
  const previa = opciones.previa !== undefined ? opciones.previa : await obtenerInscripcion(curso.slug);
  if (previa?.estado === 'confirmada') {
    ventanaInfo(curso, {
      titulo: 'Ya tienes tu cupo confirmado',
      texto: 'Tu inscripción en este curso está confirmada. Puedes verla en Mi cuenta.',
      acciones: boton({ texto: 'Ver Mi cuenta', href: '/mi-cuenta', tamano: 'grande', bloque: true })
    });
    return { resultado: 'confirmada' };
  }

  const url = urlWhatsApp(mensajeInscripcion(curso, usuario));
  let abierta = false;
  if (!automatico) {
    const v = window.open(url, '_blank');
    if (v) { v.opener = null; abierta = true; }
  }

  await crearInscripcion(curso.slug);
  ventanaWhatsApp(curso, url, { abierta, yaPendiente: Boolean(previa) });
  return { resultado: 'whatsapp', url };
}
