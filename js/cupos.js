// Reglas de cupos (BRIEF.md §5). Único lugar donde se calculan.
// - porcentaje = inscritas / cupos × 100, redondeado a entero
// - "ultimos" (Últimos cupos) de 80% a 99%
// - "agotado" al 100%: botón desactivado "Cupos agotados"

export const UMBRAL_ULTIMOS = 80;

/** Normaliza los números de un curso (o de un par inscritas/cupos). */
function numeros(inscritas, cupos) {
  const total = Math.max(0, Math.floor(Number(cupos) || 0));
  const ocupadas = Math.min(Math.max(0, Math.floor(Number(inscritas) || 0)), total);
  return { total, ocupadas, restantes: total - ocupadas };
}

/**
 * Cálculo completo a partir de inscritas y cupos totales.
 * @returns {{ porcentaje:number, restantes:number, estado:'disponible'|'ultimos'|'agotado',
 *             textoPorcentaje:string, textoRestantes:string }}
 */
export function calcularCupos(inscritas, cupos) {
  const { total, ocupadas, restantes } = numeros(inscritas, cupos);

  let pct = total === 0 ? 100 : Math.round((ocupadas / total) * 100);
  // Mientras quede al menos un cupo nunca se muestra 100% (ej. 199/200 = 99,5 → 99%).
  if (restantes > 0 && pct >= 100) pct = 99;

  const estado = restantes === 0 ? 'agotado'
    : pct >= UMBRAL_ULTIMOS ? 'ultimos'
    : 'disponible';

  return {
    porcentaje: pct,
    restantes,
    estado,
    textoPorcentaje: `Inscripciones · ${pct}%`,
    textoRestantes: restantes === 0 ? 'Cupos agotados'
      : restantes === 1 ? 'Queda 1 cupo'
      : `Quedan ${restantes} cupos`
  };
}

/* ---- Atajos por curso (reciben un objeto Curso de data/cursos.js) ---- */

/** Porcentaje de inscripción, entero de 0 a 100. */
export const porcentaje = (curso) => calcularCupos(curso.inscritas, curso.cupos).porcentaje;

/** Cupos que quedan libres. */
export const cuposRestantes = (curso) => calcularCupos(curso.inscritas, curso.cupos).restantes;

/** 'disponible' | 'ultimos' | 'agotado' */
export const estadoCupos = (curso) => calcularCupos(curso.inscritas, curso.cupos).estado;

/** Cálculo completo de un curso (incluye los textos). */
export const cuposDeCurso = (curso) => calcularCupos(curso.inscritas, curso.cupos);
