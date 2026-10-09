// Acceso a datos centralizado. Las páginas SOLO piden datos aquí.
//
// Todas las funciones devuelven promesas, aunque en modo demo los datos
// sean locales: así, en la fase 2, la fuente Supabase entra aquí con las
// mismas funciones y las páginas no cambian.
//
// Fase 1: CONFIG.modoDatos = 'demo' → /data/cursos.js
// Fase 2: se agrega la fuente 'supabase'. El modo demo se mantiene siempre.

import { CONFIG } from './config.js';
import { CURSOS } from '../data/cursos.js';
import { GALERIA } from '../data/galeria.js';

/** @typedef {import('../data/cursos.js').Curso} Curso */
/** @typedef {import('../data/galeria.js').FotoGaleria} FotoGaleria */

/**
 * @typedef {Object} FiltrosCursos
 * @property {string} [categoria]  Ej. "Automaquillaje".
 * @property {string} [nivel]      'Básico' | 'Intermedio' | 'Avanzado'
 * @property {string} [modalidad]  'Presencial' | 'Online'
 * @property {'vigente'|'finalizado'|'todos'} [estado='vigente']
 */

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Minúsculas y sin acentos, para buscar sin importar cómo se escriba. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Copia profunda para que ninguna página modifique los datos de origen. */
const copiar = (valor) => structuredClone(valor);

const porFechaAsc = (a, b) => a.fechaInicio.localeCompare(b.fechaInicio);
const porFechaDesc = (a, b) => b.fechaInicio.localeCompare(a.fechaInicio);

/** Texto donde se busca: nombre, subtítulo, categoría, nivel, modalidad, días, descripción y temas. */
function textoBuscable(curso) {
  return normalizar([
    curso.nombre, curso.subtitulo, curso.categoria, curso.nivel, curso.modalidad,
    curso.ubicacion, curso.dias, curso.descripcion.replace('[EJEMPLO]', ''),
    ...curso.dirigidoA,
    ...curso.pensum.flatMap((s) => [s.titulo, ...s.temas])
  ].join(' '));
}

/* ------------------------------------------------------------------ */
/* Fuente demo (datos locales)                                         */
/* ------------------------------------------------------------------ */

const fuenteDemo = {
  async cursos() {
    return copiar(CURSOS);
  },
  async galeria() {
    return copiar(GALERIA);
  }
};

// Fase 2: const fuenteSupabase = { async cursos() { … } };

function fuente() {
  switch (CONFIG.modoDatos) {
    case 'demo':
      return fuenteDemo;
    default:
      console.warn(`[datos] Modo "${CONFIG.modoDatos}" no disponible; se usa el modo demo.`);
      return fuenteDemo;
  }
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

/**
 * Cursos vigentes, del más próximo al más lejano.
 * @returns {Promise<Curso[]>}
 */
export async function obtenerCursosVigentes() {
  const cursos = await fuente().cursos();
  return cursos.filter((c) => c.estado === 'vigente').sort(porFechaAsc);
}

/**
 * Un curso por su slug (vigente o finalizado). null si no existe.
 * @param {string} slug
 * @returns {Promise<Curso|null>}
 */
export async function obtenerCursoPorSlug(slug) {
  const buscado = normalizar(slug).replace(/\/+$/, '');
  const cursos = await fuente().cursos();
  return cursos.find((c) => c.slug === buscado) ?? null;
}

/**
 * Cursos finalizados, del más reciente al más antiguo.
 * @returns {Promise<Curso[]>}
 */
export async function obtenerCursosAnteriores() {
  const cursos = await fuente().cursos();
  return cursos.filter((c) => c.estado === 'finalizado').sort(porFechaDesc);
}

/**
 * Busca cursos por texto (sin importar mayúsculas ni acentos) y filtros.
 * Cada palabra del texto debe aparecer en el curso.
 * Sin texto ni filtros devuelve todos los vigentes.
 * @param {string} [texto]
 * @param {FiltrosCursos} [filtros]
 * @returns {Promise<Curso[]>}
 */
export async function buscarCursos(texto = '', filtros = {}) {
  const { categoria, nivel, modalidad, estado = 'vigente' } = filtros;
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  const igual = (a, b) => !b || normalizar(a) === normalizar(b);

  const cursos = await fuente().cursos();
  return cursos
    .filter((c) => estado === 'todos' || c.estado === estado)
    .filter((c) => igual(c.categoria, categoria) && igual(c.nivel, nivel) && igual(c.modalidad, modalidad))
    .filter((c) => {
      if (!palabras.length) return true;
      const t = textoBuscable(c);
      return palabras.every((p) => t.includes(p));
    })
    .sort(estado === 'finalizado' ? porFechaDesc : porFechaAsc);
}

/**
 * Valores disponibles para los filtros del buscador (según los cursos vigentes).
 * @returns {Promise<{categorias:string[], niveles:string[], modalidades:string[]}>}
 */
export async function obtenerOpcionesDeFiltro() {
  const vigentes = await obtenerCursosVigentes();
  const unicos = (campo) => [...new Set(vigentes.map((c) => c[campo]))];
  const ordenNivel = ['Básico', 'Intermedio', 'Avanzado'];
  return {
    categorias: unicos('categoria').sort((a, b) => a.localeCompare(b, 'es')),
    niveles: unicos('nivel').sort((a, b) => ordenNivel.indexOf(a) - ordenNivel.indexOf(b)),
    modalidades: unicos('modalidad').sort((a, b) => a.localeCompare(b, 'es'))
  };
}

/**
 * Fotos de la galería.
 * @param {object} [op]
 * @param {boolean} [op.soloDestacadas]  Solo las marcadas para el avance de Inicio.
 * @param {number} [op.limite]
 * @returns {Promise<FotoGaleria[]>}
 */
export async function obtenerGaleria({ soloDestacadas = false, limite } = {}) {
  const fotos = (await fuente().galeria()).filter((f) => !soloDestacadas || f.destacada);
  return limite ? fotos.slice(0, limite) : fotos;
}

export const modo = () => CONFIG.modoDatos;
