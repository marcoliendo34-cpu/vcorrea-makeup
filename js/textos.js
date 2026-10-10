// Textos y ayudas de texto compartidos. Sin dependencias: lo importan
// componentes.js (todas las páginas) y datos.js, así las páginas que no
// muestran cursos no tienen que cargar datos.js para pintar el header.

/** Textos de los estados de una inscripción (BRIEF.md §5). */
export const ESTADOS_INSCRIPCION = {
  pendiente: 'Pendiente de confirmación',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  finalizado: 'Finalizado'
};

/** Minúsculas y sin acentos, para buscar sin importar cómo se escriba. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
