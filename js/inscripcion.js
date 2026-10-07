// Flujo del botón "Inscribirme" (BRIEF.md §5):
// sin sesión → /registro y regreso al curso; con sesión → inscripción
// "Pendiente de confirmación" y WhatsApp con mensaje prellenado.
// [Se completa en el paso de la ficha del curso.]

export const ESTADOS_INSCRIPCION = {
  pendiente: 'Pendiente de confirmación',
  confirmada: 'Confirmada',
  finalizado: 'Finalizado'
};
