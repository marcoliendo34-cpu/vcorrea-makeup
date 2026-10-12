// Acceso a datos centralizado. Las páginas SOLO piden datos aquí.
//
// Fuente según js/modo.js:
//   - Web publicada (siempre): Supabase → js/datos-supabase.js
//   - Espacio de trabajo (capturas): data/*.js + localStorage → js/demo/datos-demo.js
// Las dos tienen la misma forma; aquí vive la lógica común (búsqueda, orden,
// filtros y armado del panel), así las páginas no cambian según la fuente.

import { MODO_DEMO } from './modo.js';
import { usuarioActual, esAdmin } from './sesion.js';
import { calcularCupos } from './cupos.js';
import { normalizar, ESTADOS_INSCRIPCION, CATEGORIAS_GALERIA } from './textos.js';

/** @typedef {import('../data/cursos.js').Curso} Curso */
/** @typedef {import('../data/galeria.js').FotoGaleria} FotoGaleria */

/**
 * @typedef {Object} FiltrosCursos
 * @property {string} [categoria]  Ej. "Pestañas".
 * @property {string} [nivel]
 * @property {string} [modalidad]  'Presencial' | 'Online'
 * @property {'vigente'|'finalizado'|'todos'} [estado='vigente']
 */

/* ------------------------------------------------------------------ */
/* Fuente                                                              */
/* ------------------------------------------------------------------ */

let motor = null;
/** Carga la fuente una sola vez (import dinámico: la web publicada nunca baja la demo). */
const fuente = () => (motor ??= MODO_DEMO ? import('./demo/datos-demo.js') : import('./datos-supabase.js'));

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

// normalizar() y ESTADOS_INSCRIPCION viven en js/textos.js (sin dependencias)
export { normalizar, ESTADOS_INSCRIPCION };

const copiar = (valor) => structuredClone(valor);
const porFechaAsc = (a, b) => a.fechaInicio.localeCompare(b.fechaInicio);
const porFechaDesc = (a, b) => b.fechaInicio.localeCompare(a.fechaInicio);

/** Texto donde se busca: nombre, subtítulo, categoría, nivel, modalidad, días, descripción y temas. */
function textoBuscable(curso) {
  return normalizar([
    curso.nombre, curso.subtitulo, curso.categoria, curso.nivel, curso.modalidad,
    curso.ubicacion, curso.dias, String(curso.descripcion || '').replace('[EJEMPLO]', ''),
    ...(curso.dirigidoA || []),
    ...(curso.pensum || []).flatMap((s) => [s.titulo, ...(s.temas || [])])
  ].join(' '));
}

const todosLosCursos = async () => (await fuente()).cursos();

/* ------------------------------------------------------------------ */
/* Cursos                                                              */
/* ------------------------------------------------------------------ */

/** Cursos vigentes, del más próximo al más lejano. @returns {Promise<Curso[]>} */
export async function obtenerCursosVigentes() {
  return (await todosLosCursos()).filter((c) => c.estado === 'vigente').sort(porFechaAsc);
}

/** Un curso por su slug (vigente o finalizado). null si no existe. */
export async function obtenerCursoPorSlug(slug) {
  const buscado = normalizar(slug).replace(/\/+$/, '');
  return (await todosLosCursos()).find((c) => c.slug === buscado) ?? null;
}

/** Cursos finalizados, del más reciente al más antiguo. */
export async function obtenerCursosAnteriores() {
  return (await todosLosCursos()).filter((c) => c.estado === 'finalizado').sort(porFechaDesc);
}

/**
 * Busca cursos por texto (sin importar mayúsculas ni acentos) y filtros.
 * Cada palabra del texto debe aparecer en el curso. Sin texto ni filtros: todos los vigentes.
 * @param {string} [texto]
 * @param {FiltrosCursos} [filtros]
 */
export async function buscarCursos(texto = '', filtros = {}) {
  const { categoria, nivel, modalidad, estado = 'vigente' } = filtros;
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  const igual = (a, b) => !b || normalizar(a) === normalizar(b);
  return (await todosLosCursos())
    .filter((c) => estado === 'todos' || c.estado === estado)
    .filter((c) => igual(c.categoria, categoria) && igual(c.nivel, nivel) && igual(c.modalidad, modalidad))
    .filter((c) => {
      if (!palabras.length) return true;
      const t = textoBuscable(c);
      return palabras.every((p) => t.includes(p));
    })
    .sort(estado === 'finalizado' ? porFechaDesc : porFechaAsc);
}

/** Valores disponibles para los filtros del buscador (según los cursos vigentes). */
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

/* ------------------------------------------------------------------ */
/* Galería                                                             */
/* ------------------------------------------------------------------ */

/** Rutas de una foto: /fotos/galeria/{archivo}-600.webp y -1200.webp. */
function conRutas(f) {
  return {
    ...f,
    miniatura: f.archivo ? `/fotos/galeria/${f.archivo}-600.webp` : null,
    grande: f.archivo ? `/fotos/galeria/${f.archivo}-1200.webp` : null
  };
}

/**
 * Fotos de la galería, con sus rutas de miniatura (600 px) y grande (1200 px).
 * @param {object} [op]
 * @param {boolean} [op.soloDestacadas]  Avance de Inicio.
 * @param {boolean} [op.soloAnteriores]  Página Cursos anteriores.
 * @param {string} [op.categoria]        'formaciones' | 'alumnas' | 'propios'
 * @param {number} [op.limite]
 */
export async function obtenerGaleria({ soloDestacadas = false, soloAnteriores = false, categoria, limite } = {}) {
  const fotos = (await (await fuente()).galeria())
    .filter((f) => !soloDestacadas || f.destacada)
    .filter((f) => !soloAnteriores || f.enAnteriores)
    .filter((f) => !categoria || categoria === 'todas' || f.categoria === categoria)
    .map(conRutas);
  return limite ? fotos.slice(0, limite) : fotos;
}

/** Categorías de la galería para los chips: [{ id, nombre }]. */
export async function obtenerCategoriasGaleria() {
  return copiar(CATEGORIAS_GALERIA);
}

/* ------------------------------------------------------------------ */
/* Inscripciones de la alumna con sesión                               */
/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} Inscripcion
 * @property {string} id
 * @property {string} alumnaId
 * @property {string} cursoSlug
 * @property {'pendiente'|'confirmada'|'cancelada'|'finalizado'} estado
 * @property {string} creada  Fecha ISO.
 */

/**
 * Inscripciones de la alumna con sesión, con su curso, por fecha de inicio.
 * Si el curso ya terminó, el estado visible pasa a 'finalizado'.
 */
export async function obtenerMisInscripciones() {
  const usuario = await usuarioActual();
  if (!usuario) return [];
  const [mias, cursos] = await Promise.all([(await fuente()).inscripcionesDe(usuario.id), todosLosCursos()]);
  return mias
    .map((i) => {
      const curso = cursos.find((c) => c.slug === i.cursoSlug) || null;
      const estadoVisible = curso?.estado === 'finalizado' && i.estado === 'confirmada' ? 'finalizado' : i.estado;
      return { ...i, curso, estadoVisible };
    })
    .sort((a, b) => (a.curso?.fechaInicio || '').localeCompare(b.curso?.fechaInicio || ''));
}

/** Inscripción de la alumna con sesión en un curso, o null. */
export async function obtenerInscripcion(cursoSlug) {
  const usuario = await usuarioActual();
  if (!usuario) return null;
  return (await (await fuente()).inscripcionesDe(usuario.id)).find((i) => i.cursoSlug === cursoSlug) || null;
}

/**
 * Registra la solicitud como "Pendiente de confirmación". Si ya existe, no la duplica.
 * @returns {Promise<{inscripcion: Inscripcion|null, nueva: boolean, error: string|null}>}
 */
export async function crearInscripcion(cursoSlug) {
  const usuario = await usuarioActual();
  if (!usuario) return { inscripcion: null, nueva: false, error: 'sin-sesion' };
  if (esAdmin(usuario)) return { inscripcion: null, nueva: false, error: 'admin' };
  return (await fuente()).crearInscripcion(usuario, cursoSlug);
}

/* ------------------------------------------------------------------ */
/* Panel de administradora (/admin)                                    */
/* ------------------------------------------------------------------ */
// En la web publicada, las reglas RLS de Supabase son las que impiden que
// alguien sin rol admin lea o cambie estos datos; exigirAdmin() solo evita
// consultas inútiles.

/**
 * @typedef {Object} AlumnaPanel
 * @property {string} id
 * @property {string} nombre
 * @property {string} apellido
 * @property {string} cedula
 * @property {string} telefono
 * @property {string} correo
 * @property {string|null} instagram
 * @property {string} creada
 */

/** @typedef {Inscripcion & {alumna: AlumnaPanel|null, curso: Curso|null}} InscripcionPanel */

async function exigirAdmin() {
  if (!esAdmin(await usuarioActual())) throw new Error('[datos] Esta función es solo para la administradora.');
}

const porFechaSolicitud = (a, b) => (a.creada || '').localeCompare(b.creada || '');

/** Une cada inscripción con su alumna y su curso. */
async function inscripcionesCompletas() {
  const f = await fuente();
  const [inscripciones, cursos, alumnas] = await Promise.all([f.todasLasInscripciones(), f.cursos(), f.alumnas()]);
  return inscripciones.map((i) => ({
    ...i,
    alumna: alumnas.find((a) => a.id === i.alumnaId) || null,
    curso: cursos.find((c) => c.slug === i.cursoSlug) || null
  })).filter((i) => i.alumna && i.curso);
}

/** Cursos para el panel: vigentes (del más próximo) y luego finalizados, con conteos y cupos. */
export async function obtenerCursosAdmin() {
  await exigirAdmin();
  const f = await fuente();
  const [cursos, inscripciones] = await Promise.all([f.cursos(), f.todasLasInscripciones()]);
  const contar = (slug, estado) => inscripciones.filter((i) => i.cursoSlug === slug && i.estado === estado).length;
  const conDatos = (c) => ({
    ...c,
    conteo: {
      confirmadas: c.estado === 'finalizado' ? 0 : contar(c.slug, 'confirmada'),
      pendientes: c.estado === 'finalizado' ? 0 : contar(c.slug, 'pendiente'),
      canceladas: contar(c.slug, 'cancelada'),
      fuera: 0   // ya no hay cupos "por fuera": se cargan como inscripciones confirmadas
    },
    cuposCalc: calcularCupos(c.inscritas, c.cupos)
  });
  return [
    ...cursos.filter((c) => c.estado === 'vigente').sort(porFechaAsc),
    ...cursos.filter((c) => c.estado === 'finalizado').sort(porFechaDesc)
  ].map(conDatos);
}

/** Los 4 indicadores del resumen (solo cursos vigentes). */
export async function obtenerResumenAdmin() {
  const vigentes = (await obtenerCursosAdmin()).filter((c) => c.estado === 'vigente');
  return {
    cursosVigentes: vigentes.length,
    confirmadas: vigentes.reduce((s, c) => s + Math.min(c.inscritas, c.cupos), 0),
    pendientes: vigentes.reduce((s, c) => s + c.conteo.pendientes, 0),
    cuposLibres: vigentes.reduce((s, c) => s + c.cuposCalc.restantes, 0)
  };
}

/** Solicitudes pendientes de los cursos vigentes, de la más antigua a la más nueva. */
export async function obtenerPendientes() {
  await exigirAdmin();
  return (await inscripcionesCompletas())
    .filter((i) => i.estado === 'pendiente' && i.curso.estado === 'vigente')
    .sort(porFechaSolicitud);
}

/** Inscritas de un curso (todas las de la web, cualquier estado), la más nueva primero. */
export async function obtenerInscritasDeCurso(cursoSlug) {
  await exigirAdmin();
  return (await inscripcionesCompletas())
    .filter((i) => i.cursoSlug === cursoSlug)
    .sort((a, b) => porFechaSolicitud(b, a));
}

/** Todas las alumnas con cuenta, por nombre, con sus inscripciones. */
export async function obtenerAlumnas() {
  await exigirAdmin();
  const [inscripciones, alumnas] = await Promise.all([inscripcionesCompletas(), (await fuente()).alumnas()]);
  return alumnas
    .map((a) => ({ ...a, inscripciones: inscripciones.filter((i) => i.alumnaId === a.id) }))
    .sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es'));
}

/**
 * Confirma o cancela una inscripción (o la vuelve a dejar pendiente).
 * Al confirmar se ocupa un cupo: el % del curso sube en todo el sitio.
 * @param {string} id
 * @param {'confirmada'|'cancelada'|'pendiente'} estado
 * @returns {Promise<{inscripcion: Inscripcion|null, error: null|'no-existe'|'sin-cupos'|'curso-finalizado'|'almacenamiento'|'servidor'}>}
 */
export async function cambiarEstadoInscripcion(id, estado) {
  await exigirAdmin();
  if (!['confirmada', 'cancelada', 'pendiente'].includes(estado)) throw new Error(`[datos] Estado inválido: ${estado}`);
  const f = await fuente();
  const inscripcion = (await f.todasLasInscripciones()).find((i) => i.id === id);
  if (!inscripcion) return { inscripcion: null, error: 'no-existe' };
  if (inscripcion.estado === estado) return { inscripcion, error: null };
  const curso = (await f.cursos()).find((c) => c.slug === inscripcion.cursoSlug);
  if (!curso || curso.estado === 'finalizado') return { inscripcion: null, error: 'curso-finalizado' };
  if (estado === 'confirmada' && calcularCupos(curso.inscritas, curso.cupos).restantes === 0) {
    return { inscripcion: null, error: 'sin-cupos' };
  }
  return f.cambiarEstado(id, estado, curso);
}

/** 'demo' (capturas en el espacio de trabajo) o 'supabase' (web publicada). */
export const modo = () => (MODO_DEMO ? 'demo' : 'supabase');
