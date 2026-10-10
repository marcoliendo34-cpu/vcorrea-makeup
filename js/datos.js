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
import { GALERIA, CATEGORIAS_GALERIA } from '../data/galeria.js';
import { usuarioActual, esAdmin, almacen, CLAVES } from './sesion.js';
import { calcularCupos } from './cupos.js';
import { normalizar, ESTADOS_INSCRIPCION } from './textos.js';

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

// normalizar() y ESTADOS_INSCRIPCION viven en js/textos.js (sin dependencias)
export { normalizar, ESTADOS_INSCRIPCION };

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
  /** Cursos con `inscritas` = inscritasFuera + inscripciones confirmadas (localStorage). */
  async cursos() {
    const confirmadas = {};
    leerInscripciones()
      .filter((i) => i.estado === 'confirmada')
      .forEach((i) => { confirmadas[i.cursoSlug] = (confirmadas[i.cursoSlug] || 0) + 1; });
    return copiar(CURSOS).map((c) => ({
      ...c,
      inscritas: (c.inscritasFuera || 0) + (c.estado === 'finalizado' ? 0 : confirmadas[c.slug] || 0)
    }));
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
 * Rutas de una foto de la galería (convención en data/galeria.js).
 * @param {FotoGaleria} f
 * @returns {FotoGaleria & {miniatura: string|null, grande: string|null}}
 */
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
 * @param {boolean} [op.soloDestacadas]  Solo las marcadas para el avance de Inicio.
 * @param {string} [op.categoria]        'social' | 'novias' | 'editorial' | 'alumnas'
 * @param {number} [op.limite]
 */
export async function obtenerGaleria({ soloDestacadas = false, categoria, limite } = {}) {
  const fotos = (await fuente().galeria())
    .filter((f) => !soloDestacadas || f.destacada)
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
// Demo: se guardan en localStorage (ver js/sesion.js). Fase 2: tabla
// "inscripciones" en Supabase con las mismas funciones.

/**
 * @typedef {Object} Inscripcion
 * @property {string} id
 * @property {string} alumnaId
 * @property {string} cursoSlug
 * @property {'pendiente'|'confirmada'|'cancelada'} estado
 *           ('finalizado' solo se muestra: lo calcula obtenerMisInscripciones)
 * @property {string} creada  Fecha ISO.
 */


function leerInscripciones() { return almacen.leer(CLAVES.inscripciones, []); }

/**
 * Inscripciones de la alumna con sesión, con su curso, ordenadas por fecha de
 * inicio. Si el curso ya terminó, el estado visible pasa a 'finalizado'.
 * @returns {Promise<Array<Inscripcion & {curso: Curso|null, estadoVisible: string}>>}
 */
export async function obtenerMisInscripciones() {
  const usuario = await usuarioActual();
  if (!usuario) return [];
  const cursos = await fuente().cursos();
  return leerInscripciones()
    .filter((i) => i.alumnaId === usuario.id)
    .map((i) => {
      const curso = cursos.find((c) => c.slug === i.cursoSlug) || null;
      const estadoVisible = curso?.estado === 'finalizado' && i.estado === 'confirmada' ? 'finalizado' : i.estado;
      return { ...copiar(i), curso, estadoVisible };
    })
    .sort((a, b) => (a.curso?.fechaInicio || '').localeCompare(b.curso?.fechaInicio || ''));
}

/** Inscripción de la alumna con sesión en un curso, o null. */
export async function obtenerInscripcion(cursoSlug) {
  const usuario = await usuarioActual();
  if (!usuario) return null;
  return leerInscripciones().find((i) => i.alumnaId === usuario.id && i.cursoSlug === cursoSlug) || null;
}

/**
 * Registra la solicitud como "Pendiente de confirmación". Si ya existe, no la duplica.
 * @returns {Promise<{inscripcion: Inscripcion|null, nueva: boolean, error: string|null}>}
 */
export async function crearInscripcion(cursoSlug) {
  const usuario = await usuarioActual();
  if (!usuario) return { inscripcion: null, nueva: false, error: 'sin-sesion' };
  if (esAdmin(usuario)) return { inscripcion: null, nueva: false, error: 'admin' };
  const todas = leerInscripciones();
  const existente = todas.find((i) => i.alumnaId === usuario.id && i.cursoSlug === cursoSlug);
  if (existente?.estado === 'cancelada') {
    // Si la habían cancelado y vuelve a pedirla, queda pendiente otra vez.
    existente.estado = 'pendiente';
    existente.creada = new Date().toISOString();
    if (!almacen.escribir(CLAVES.inscripciones, todas)) return { inscripcion: null, nueva: false, error: 'almacenamiento' };
    return { inscripcion: existente, nueva: true, error: null };
  }
  if (existente) return { inscripcion: existente, nueva: false, error: null };
  const inscripcion = {
    id: `insc-${Date.now().toString(36)}`,
    alumnaId: usuario.id,
    cursoSlug,
    estado: 'pendiente',
    creada: new Date().toISOString()
  };
  if (!almacen.escribir(CLAVES.inscripciones, [...todas, inscripcion])) {
    return { inscripcion: null, nueva: false, error: 'almacenamiento' };
  }
  return { inscripcion, nueva: true, error: null };
}

/* ------------------------------------------------------------------ */
/* Panel de administradora (/admin)                                    */
/* ------------------------------------------------------------------ */
// Solo para la cuenta con rol "admin". Demo: lee y escribe localStorage.
// Fase 2: consultas a Supabase protegidas con RLS (solo el rol admin puede
// leer todas las inscripciones y cambiar su estado).

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

/**
 * @typedef {Inscripcion & {alumna: AlumnaPanel|null, curso: Curso|null}} InscripcionPanel
 */

async function exigirAdmin() {
  if (!esAdmin(await usuarioActual())) throw new Error('[datos] Esta función es solo para la administradora.');
}

const leerAlumnas = () => almacen.leer(CLAVES.alumnas, []).filter((a) => a.rol !== 'admin');

const porFechaSolicitud = (a, b) => (a.creada || '').localeCompare(b.creada || '');

/** Une cada inscripción con su alumna y su curso. */
async function inscripcionesCompletas() {
  const [cursos, alumnas] = [await fuente().cursos(), leerAlumnas()];
  return leerInscripciones().map((i) => ({
    ...copiar(i),
    alumna: alumnas.find((a) => a.id === i.alumnaId) || null,
    curso: cursos.find((c) => c.slug === i.cursoSlug) || null
  })).filter((i) => i.alumna && i.curso);
}

/**
 * Cursos para el panel: vigentes (del más próximo) y luego finalizados, con
 * sus conteos y el cálculo de cupos.
 * @returns {Promise<Array<Curso & {conteo:{confirmadas:number, pendientes:number, canceladas:number, fuera:number}, cuposCalc: ReturnType<typeof calcularCupos>}>>}
 */
export async function obtenerCursosAdmin() {
  await exigirAdmin();
  const cursos = await fuente().cursos();
  const inscripciones = leerInscripciones();
  const contar = (slug, estado) => inscripciones.filter((i) => i.cursoSlug === slug && i.estado === estado).length;
  const conDatos = (c) => ({
    ...c,
    conteo: {
      confirmadas: c.estado === 'finalizado' ? 0 : contar(c.slug, 'confirmada'),
      pendientes: c.estado === 'finalizado' ? 0 : contar(c.slug, 'pendiente'),
      canceladas: contar(c.slug, 'cancelada'),
      fuera: c.inscritasFuera || 0
    },
    cuposCalc: calcularCupos(c.inscritas, c.cupos)
  });
  return [
    ...cursos.filter((c) => c.estado === 'vigente').sort(porFechaAsc),
    ...cursos.filter((c) => c.estado === 'finalizado').sort(porFechaDesc)
  ].map(conDatos);
}

/**
 * Los 4 indicadores del resumen (solo cursos vigentes).
 * @returns {Promise<{cursosVigentes:number, confirmadas:number, pendientes:number, cuposLibres:number}>}
 */
export async function obtenerResumenAdmin() {
  const vigentes = (await obtenerCursosAdmin()).filter((c) => c.estado === 'vigente');
  return {
    cursosVigentes: vigentes.length,
    confirmadas: vigentes.reduce((s, c) => s + Math.min(c.inscritas, c.cupos), 0),
    pendientes: vigentes.reduce((s, c) => s + c.conteo.pendientes, 0),
    cuposLibres: vigentes.reduce((s, c) => s + c.cuposCalc.restantes, 0)
  };
}

/**
 * Solicitudes pendientes de los cursos vigentes, de la más antigua a la más nueva.
 * @returns {Promise<InscripcionPanel[]>}
 */
export async function obtenerPendientes() {
  await exigirAdmin();
  return (await inscripcionesCompletas())
    .filter((i) => i.estado === 'pendiente' && i.curso.estado === 'vigente')
    .sort(porFechaSolicitud);
}

/**
 * Inscritas de un curso (todas las de la web, cualquier estado), la más nueva primero.
 * @returns {Promise<InscripcionPanel[]>}
 */
export async function obtenerInscritasDeCurso(cursoSlug) {
  await exigirAdmin();
  return (await inscripcionesCompletas())
    .filter((i) => i.cursoSlug === cursoSlug)
    .sort((a, b) => porFechaSolicitud(b, a));
}

/**
 * Todas las alumnas con cuenta, por nombre, con sus inscripciones.
 * @returns {Promise<Array<AlumnaPanel & {inscripciones: InscripcionPanel[]}>>}
 */
export async function obtenerAlumnas() {
  await exigirAdmin();
  const inscripciones = await inscripcionesCompletas();
  return leerAlumnas()
    .map((a) => ({ ...copiar(a), inscripciones: inscripciones.filter((i) => i.alumnaId === a.id) }))
    .sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es'));
}

/**
 * Confirma o cancela una inscripción (o la vuelve a confirmar).
 * Al confirmar se ocupa un cupo: el % del curso sube en todo el sitio.
 * @param {string} id
 * @param {'confirmada'|'cancelada'|'pendiente'} estado
 * @returns {Promise<{inscripcion: Inscripcion|null, error: null|'no-existe'|'sin-cupos'|'curso-finalizado'|'almacenamiento'}>}
 */
export async function cambiarEstadoInscripcion(id, estado) {
  await exigirAdmin();
  if (!['confirmada', 'cancelada', 'pendiente'].includes(estado)) throw new Error(`[datos] Estado inválido: ${estado}`);
  const todas = leerInscripciones();
  const inscripcion = todas.find((i) => i.id === id);
  if (!inscripcion) return { inscripcion: null, error: 'no-existe' };
  if (inscripcion.estado === estado) return { inscripcion: copiar(inscripcion), error: null };

  const curso = (await fuente().cursos()).find((c) => c.slug === inscripcion.cursoSlug);
  if (!curso || curso.estado === 'finalizado') return { inscripcion: null, error: 'curso-finalizado' };
  if (estado === 'confirmada' && calcularCupos(curso.inscritas, curso.cupos).restantes === 0) {
    return { inscripcion: null, error: 'sin-cupos' };
  }
  inscripcion.estado = estado;
  inscripcion.actualizada = new Date().toISOString();
  if (!almacen.escribir(CLAVES.inscripciones, todas)) return { inscripcion: null, error: 'almacenamiento' };
  return { inscripcion: copiar(inscripcion), error: null };
}

export const modo = () => CONFIG.modoDatos;
