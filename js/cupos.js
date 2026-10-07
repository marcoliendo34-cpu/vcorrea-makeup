// Reglas de cupos (BRIEF.md §5).
// - porcentaje = inscritas / cupos × 100, redondeado a entero
// - "Últimos cupos" de 80% a 99%
// - "Agotado" al 100%: botón desactivado "Cupos agotados"

export const UMBRAL_ULTIMOS = 80;

/**
 * @param {number} inscritas
 * @param {number} cupos  Cupos totales.
 * @returns {{ porcentaje:number, restantes:number, estado:'disponible'|'ultimos'|'agotado',
 *             textoPorcentaje:string, textoRestantes:string }}
 */
export function calcularCupos(inscritas, cupos) {
  const total = Math.max(0, Number(cupos) || 0);
  const ocupadas = Math.min(Math.max(0, Number(inscritas) || 0), total);
  const restantes = total - ocupadas;

  let porcentaje = total === 0 ? 100 : Math.round((ocupadas / total) * 100);
  // Si queda al menos un cupo, nunca mostrar 100% (ej. 199/200 = 99,5 → 99%).
  if (restantes > 0 && porcentaje >= 100) porcentaje = 99;

  const estado = restantes === 0 ? 'agotado'
    : porcentaje >= UMBRAL_ULTIMOS ? 'ultimos'
    : 'disponible';

  return {
    porcentaje,
    restantes,
    estado,
    textoPorcentaje: `Inscripciones · ${porcentaje}%`,
    textoRestantes: restantes === 0 ? 'Cupos agotados'
      : restantes === 1 ? 'Queda 1 cupo'
      : `Quedan ${restantes} cupos`
  };
}
