// Flujo del botón "Inscribirme" (BRIEF.md §5):
// sin sesión → /registro y regreso al curso; con sesión → inscripción
// "Pendiente de confirmación" y WhatsApp con mensaje prellenado.
//
// PASO ACTUAL: inscribirse(curso) solo lleva a la sección #inscripcion de la
// ficha del curso. En el paso 09 se conecta con la sesión y WhatsApp.

export const ESTADOS_INSCRIPCION = {
  pendiente: 'Pendiente de confirmación',
  confirmada: 'Confirmada',
  finalizado: 'Finalizado'
};

/**
 * Acción del botón "Inscribirme".
 * @param {import('../data/cursos.js').Curso} curso
 */
export function inscribirse(curso) {
  const destino = document.getElementById('inscripcion');
  if (!destino) {
    // Fuera de la ficha (ej. una tarjeta): ir a la sección de inscripción del curso
    location.href = `/cursos/${encodeURIComponent(curso.slug)}#inscripcion`;
    return;
  }
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  destino.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', '#inscripcion');
  // Lleva el foco a la sección para lectores de pantalla y teclado
  destino.setAttribute('tabindex', '-1');
  destino.focus({ preventScroll: true });
}

/** Mensaje de WhatsApp para un curso agotado o finalizado. */
export function mensajeAvisame(curso) {
  return `Hola Verónica, vi que el curso ${curso.nombre} ya no tiene cupos. ¿Me avisas cuando abras el próximo?`;
}

/** Mensaje de WhatsApp para dudas sobre un curso. */
export function mensajeDudas(curso) {
  return `Hola Verónica, tengo dudas sobre el curso ${curso.nombre}.`;
}
