// Acceso a datos centralizado. Las páginas SOLO piden datos aquí.
//
// Fuente según js/modo.js:
//   - Web publicada (siempre): Supabase → js/datos-supabase.js
//   - Espacio de trabajo (capturas): data/*.js + localStorage → js/demo/datos-demo.js
// Las dos tienen la misma forma; aquí vive la lógica común (búsqueda, orden,
// filtros y armado del panel), así las páginas no cambian según la fuente.

import { MODO_DEMO } from './modo.js';
import { usuarioActual, esAdmin, esSuperadmin } from './sesion.js';
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
/** Lo que ve el público: publicados y no archivados. (La base ya oculta los no
 *  publicados a quien no es admin; esto evita que Verónica los vea en la web.) */
const esPublico = (c) => c.publicado !== false && !c.archivado;
const cursosPublicos = async () => (await todosLosCursos()).filter(esPublico);

/* ------------------------------------------------------------------ */
/* Cursos                                                              */
/* ------------------------------------------------------------------ */

/** Cursos vigentes, del más próximo al más lejano. @returns {Promise<Curso[]>} */
export async function obtenerCursosVigentes() {
  return (await cursosPublicos()).filter((c) => c.estado === 'vigente').sort(porFechaAsc);
}

/**
 * Un curso por su slug (vigente o finalizado). null si no existe.
 * Puede venir sin publicar: solo la administración lo recibe de la base, y la
 * ficha lo muestra como vista previa.
 */
export async function obtenerCursoPorSlug(slug) {
  const buscado = normalizar(slug).replace(/\/+$/, '');
  return (await todosLosCursos()).find((c) => c.slug === buscado) ?? null;
}

/** Cursos finalizados, del más reciente al más antiguo. */
export async function obtenerCursosAnteriores() {
  return (await cursosPublicos()).filter((c) => c.estado === 'finalizado').sort(porFechaDesc);
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
  return (await cursosPublicos())
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

/**
 * Rutas de una foto:
 *   - Fotos de la web: /fotos/galeria/{archivo}-600.webp y -1200.webp.
 *   - Subidas desde el panel: `archivo` es la URL pública de la versión de
 *     1200 px (…-1200.webp o .jpg); la de 600 px tiene el mismo nombre con -600.
 */
function conRutas(f) {
  if (/^https?:/.test(f.archivo || '')) {
    return { ...f, grande: f.archivo, miniatura: f.archivo.replace(/-1200(\.\w+)$/, '-600$1') };
  }
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
    .filter((f) => f.publicado !== false)
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
 * Cupos de un curso leídos en este momento (no la copia con que se pintó la
 * página): sirve para saber si se agotó mientras la alumna miraba.
 * @returns {Promise<{cupos:number, confirmadas:number}|null>}
 */
export async function obtenerCuposAhora(cursoSlug) {
  return (await fuente()).cuposAhora(cursoSlug);
}

/**
 * Registra la solicitud como "Pendiente de confirmación". Si ya existe, no la duplica.
 * error: 'sin-sesion' | 'admin' | 'agotado' (el curso se llenó) | 'cerrado' | 'servidor' | 'almacenamiento'
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

/**
 * Cursos para el panel: vigentes (del más próximo) y luego finalizados, con
 * conteos y cupos. Los archivados quedan fuera (ver obtenerCursosArchivados).
 * Las inscritas se cuentan aquí: la función pública de cupos solo cubre los publicados.
 */
export async function obtenerCursosAdmin({ archivados = false } = {}) {
  await exigirAdmin();
  const f = await fuente();
  const [todos, inscripciones] = await Promise.all([f.cursos(), f.todasLasInscripciones()]);
  const cursos = todos.filter((c) => Boolean(c.archivado) === archivados);
  const contar = (slug, estado) => inscripciones.filter((i) => i.cursoSlug === slug && i.estado === estado).length;
  const conDatos = (c) => ({
    ...c,
    inscritas: c.estado === 'finalizado' ? (c.egresadas || 0) : contar(c.slug, 'confirmada'),
    conteo: {
      confirmadas: c.estado === 'finalizado' ? 0 : contar(c.slug, 'confirmada'),
      pendientes: c.estado === 'finalizado' ? 0 : contar(c.slug, 'pendiente'),
      canceladas: contar(c.slug, 'cancelada'),
      fuera: 0   // ya no hay cupos "por fuera": se cargan como inscripciones confirmadas
    },
    cuposCalc: calcularCupos(c.estado === 'finalizado' ? (c.egresadas || 0) : contar(c.slug, 'confirmada'), c.cupos)
  });
  return [
    ...cursos.filter((c) => c.estado === 'vigente').sort(porFechaAsc),
    ...cursos.filter((c) => c.estado === 'finalizado').sort(porFechaDesc)
  ].map(conDatos);
}

/** Los 4 indicadores del resumen (solo cursos vigentes y publicados). */
export async function obtenerResumenAdmin() {
  const vigentes = (await obtenerCursosAdmin()).filter((c) => c.estado === 'vigente' && c.publicado !== false);
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

/* ------------------------------------------------------------------ */
/* Superadmin (Marco): cursos, fotos y galería                         */
/* ------------------------------------------------------------------ */
// La base solo deja escribir al rol superadmin (RLS en cursos, galeria y
// storage). Aquí se evita la consulta si la cuenta no lo es. En la demo no
// hay edición: responde { error: 'solo-supabase' }.
// Errores: 'permiso' | 'solo-supabase' | 'no-existe' | 'slug-repetido' | 'datos' | 'servidor' | 'muy-grande'

/** Fuente con escritura, o el código de error si no se puede. */
async function fuenteSuperadmin() {
  if (!esSuperadmin(await usuarioActual())) return { error: 'permiso' };
  const f = await fuente();
  return f.guardarCurso ? { f } : { error: 'solo-supabase' };
}

/** Todos los cursos tal como están en la base (incluye borradores y archivados). */
async function cursosCrudos(f) {
  f.olvidarCopias?.();
  return f.cursos();
}

/** Curso para el editor (cualquier estado). null si no existe. */
export async function obtenerCursoEditable(slug) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return null;
  return (await cursosCrudos(f)).find((c) => c.slug === slug) ?? null;
}

/** ¿Ese slug ya lo usa otro curso? */
export async function slugOcupado(slug, idPropio = null) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return false;
  return (await cursosCrudos(f)).some((c) => c.slug === slug && c.id !== idPropio);
}

/**
 * Crea (sin id) o guarda (con id) un curso con todos sus campos.
 * @returns {Promise<{curso: Curso|null, error: string|null}>}
 */
export async function guardarCurso(curso) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return { curso: null, error };
  const { inscritas, conteo, cuposCalc, actualizado, ...limpio } = curso;
  return f.guardarCurso(limpio);
}

async function cambiarCursoPorSlug(slug, cambios) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return { curso: null, error };
  const curso = (await cursosCrudos(f)).find((c) => c.slug === slug);
  if (!curso) return { curso: null, error: 'no-existe' };
  return f.cambiarCurso(curso.id, typeof cambios === 'function' ? cambios(curso) : cambios);
}

/** Copia un curso como borrador nuevo (sin publicar, vigente, sin egresadas ni fotos). */
export async function duplicarCurso(slug) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return { curso: null, error };
  const todos = await cursosCrudos(f);
  const original = todos.find((c) => c.slug === slug);
  if (!original) return { curso: null, error: 'no-existe' };
  const base = `${original.slug}-copia`;
  let nuevo = base;
  for (let n = 2; todos.some((c) => c.slug === nuevo); n += 1) nuevo = `${base}-${n}`;
  const { id, inscritas, actualizado, ...resto } = original;
  return f.guardarCurso({
    ...resto, slug: nuevo, nombre: `${original.nombre} (copia)`,
    publicado: false, archivado: false, estado: 'vigente', egresadas: null, galeria: []
  });
}

/** Publica o despublica. Un curso archivado no se publica. */
export async function publicarCurso(slug, publicar) {
  return cambiarCursoPorSlug(slug, (c) => (publicar && c.archivado ? { publicado: false } : { publicado: Boolean(publicar) }));
}

/** Archiva (y despublica) o saca del archivo (queda como borrador). */
export async function archivarCurso(slug, archivar) {
  return cambiarCursoPorSlug(slug, archivar ? { archivado: true, publicado: false } : { archivado: false });
}

/**
 * Pasa el curso a finalizado con sus egresadas y fotos: aparece en Cursos anteriores.
 * @param {{egresadas: number, galeria: {src: string, miniatura?: string, alt: string, ancho?: number, alto?: number}[]}} datos
 */
export async function finalizarCurso(slug, { egresadas, galeria }) {
  return cambiarCursoPorSlug(slug, { estado: 'finalizado', egresadas, galeria });
}

/** Vuelve a vigente un curso finalizado por error (conserva egresadas y fotos). */
export async function reabrirCurso(slug) {
  return cambiarCursoPorSlug(slug, { estado: 'vigente' });
}

/** Sube una imagen ya comprimida al bucket ('cursos' o 'galeria'). */
export async function subirFoto(bucket, ruta, blob) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return { url: null, error };
  return f.subirArchivo(bucket, ruta, blob);
}

/** Fotos de la galería para el panel (todas, en su orden). */
export async function obtenerGaleriaAdmin() {
  const { f, error } = await fuenteSuperadmin();
  if (error) return [];
  f.olvidarCopias?.();
  return (await f.galeria()).map(conRutas).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

/** Agrega una foto al final de la galería. */
export async function agregarFotoGaleria(foto) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return { error };
  const fotos = await obtenerGaleriaAdmin();
  const orden = fotos.reduce((m, x) => Math.max(m, x.orden ?? 0), 0) + 1;
  return f.crearFoto({ destacada: false, enAnteriores: false, publicado: true, ...foto, orden });
}

/** Cambia categoría, texto alternativo, destacada o "Cursos anteriores". */
export async function cambiarFotoGaleria(id, cambios) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return { error };
  return f.cambiarFoto(id, cambios);
}

/** Sube (-1) o baja (+1) una foto un lugar. Renumera el orden 1, 2, 3… */
export async function moverFotoGaleria(id, paso) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return { error };
  const fotos = await obtenerGaleriaAdmin();
  const i = fotos.findIndex((x) => x.id === id);
  const j = i + paso;
  if (i < 0 || j < 0 || j >= fotos.length) return { error: null };
  [fotos[i], fotos[j]] = [fotos[j], fotos[i]];
  for (const [k, foto] of fotos.entries()) {
    if (foto.orden === k + 1) continue;
    const r = await f.cambiarFoto(foto.id, { orden: k + 1 });
    if (r.error) return r;
  }
  return { error: null };
}

/** Borra la foto de la galería y, si se subió desde el panel, sus archivos. */
export async function borrarFotoGaleria(id) {
  const { f, error } = await fuenteSuperadmin();
  if (error) return { error };
  const foto = (await obtenerGaleriaAdmin()).find((x) => x.id === id);
  if (!foto) return { error: 'no-existe' };
  const r = await f.borrarFoto(id);
  if (!r.error && /^https?:/.test(foto.archivo || '')) await f.borrarArchivos('galeria', [foto.grande, foto.miniatura]);
  return r;
}

/** 'demo' (capturas en el espacio de trabajo) o 'supabase' (web publicada). */
export const modo = () => (MODO_DEMO ? 'demo' : 'supabase');
