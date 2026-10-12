// Fuente de datos de la web publicada: tablas de Supabase.
// Misma forma que js/demo/datos-demo.js; js/datos.js elige cuál usar.
//
// Lo que cada quien puede leer o escribir lo deciden las reglas RLS de la base:
//   - cursos y galeria: lo publicado es público.
//   - cupos: la función pública cupos_de_cursos() da solo el número de confirmadas.
//   - inscripciones y perfiles: cada alumna las suyas; admin y superadmin, todas.

import { supabase } from './supabase.js';

/* ------------------------------ formas ------------------------------ */

/** Estado de la base → estado que muestra la web ('finalizada' se ve como 'finalizado'). */
const estadoWeb = (e) => (e === 'finalizada' ? 'finalizado' : e);

/** Fila de "cursos" → Curso (misma forma que data/cursos.js). */
function aCurso(r, confirmadas) {
  return {
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    nombreCorto: r.nombre_corto,
    subtitulo: r.subtitulo,
    categoria: r.categoria,
    nivel: r.nivel,
    modalidad: r.modalidad,
    ubicacion: r.ubicacion,
    imagenPortada: r.portada || { src: null, alt: r.nombre },
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    dias: r.dias,
    horario: r.horario,
    semanas: r.semanas,
    totalClases: r.total_clases,
    calendario: r.calendario || [],
    cupos: r.cupos,
    descripcion: r.descripcion || '',
    dirigidoA: r.dirigido_a || [],
    destacados: r.destacados,
    incluye: r.incluye || [],
    pensum: r.pensum || [],
    practicas: r.practicas || [],
    requisitos: r.requisitos || [],
    certificado: r.certificado || { incluye: false, descripcion: '' },
    precioUSD: Number(r.precio_usd),
    condicionesPago: r.condiciones_pago,
    preguntas: r.preguntas || [],
    estado: r.estado,
    galeria: r.galeria || [],
    egresadas: r.egresadas,
    publicado: r.publicado,
    archivado: Boolean(r.archivado),
    actualizado: r.actualizado_en,
    // Solo cuentan las confirmadas. En los finalizados se muestran las egresadas.
    inscritas: r.estado === 'finalizado' ? (r.egresadas || 0) : (confirmadas || 0)
  };
}

/** Fila de "inscripciones" (con su curso) → Inscripcion (misma forma que la demo). */
const aInscripcion = (r) => ({
  id: r.id,
  alumnaId: r.alumna_id,
  cursoSlug: r.cursos?.slug ?? null,
  estado: estadoWeb(r.estado),
  creada: r.creado_en,
  confirmada: r.confirmada_en
});

const COLUMNAS_INSCRIPCION = 'id, alumna_id, estado, creado_en, confirmada_en, cursos(slug)';

/** Lanza el error de Supabase para que js/datos.js y la página lo manejen. */
function exigir({ data, error }) {
  if (error) throw Object.assign(new Error(error.message), { supabase: error });
  return data;
}

/* ---------------------- cursos y galería (públicos) ---------------------- */

// Una sola consulta por carga de página; se olvida al confirmar o cancelar.
let cursosEnCurso = null;

export async function cursos() {
  cursosEnCurso ??= Promise.all([
    supabase.from('cursos').select('*'),
    supabase.rpc('cupos_de_cursos')
  ]).then(([filas, cupos]) => {
    const confirmadas = Object.fromEntries((exigir(cupos) || []).map((c) => [c.curso_id, c.confirmadas]));
    return exigir(filas).map((r) => aCurso(r, confirmadas[r.id]));
  }).catch((e) => { cursosEnCurso = null; throw e; });
  return structuredClone(await cursosEnCurso);
}

let galeriaEnCurso = null;

export async function galeria() {
  galeriaEnCurso ??= supabase.from('galeria').select('*').order('orden')
    .then((r) => exigir(r).map((f) => ({
      id: f.id,
      archivo: f.imagen || null,
      categoria: f.categoria,
      alt: f.texto_alternativo,
      ancho: f.ancho || 4,
      alto: f.alto || 3,
      destacada: f.destacada,
      enAnteriores: f.en_anteriores,
      orden: f.orden,
      publicado: f.publicado
    })))
    .catch((e) => { galeriaEnCurso = null; throw e; });
  return structuredClone(await galeriaEnCurso);
}

/** Cupos de un curso leídos en este momento (sin la copia de la página). */
export async function cuposAhora(cursoSlug) {
  const fila = (exigir(await supabase.rpc('cupos_de_cursos')) || []).find((c) => c.slug === cursoSlug);
  cursosEnCurso = null;   // la próxima lectura de cursos trae los cupos nuevos
  return fila ? { cupos: fila.cupos, confirmadas: fila.confirmadas } : null;
}

/** Error de la base → código para la página. */
const codigoDeError = (e) => (/agotarse|lleno/i.test(e?.message || '') ? 'agotado'
  : /no está abierto/i.test(e?.message || '') ? 'cerrado' : 'servidor');

/* ------------------------------ inscripciones ------------------------------ */

export async function inscripcionesDe(usuarioId) {
  const filas = exigir(await supabase.from('inscripciones').select(COLUMNAS_INSCRIPCION).eq('alumna_id', usuarioId));
  return filas.map(aInscripcion);
}

export async function todasLasInscripciones() {
  const filas = exigir(await supabase.from('inscripciones').select(COLUMNAS_INSCRIPCION));
  return filas.map(aInscripcion);
}

/**
 * Pide un cupo (siempre queda "pendiente": lo impone la base). Si la había
 * cancelado Verónica y la vuelve a pedir, pasa otra vez a pendiente.
 */
export async function crearInscripcion(usuario, cursoSlug) {
  const curso = (await cursos()).find((c) => c.slug === cursoSlug);
  if (!curso) return { inscripcion: null, nueva: false, error: 'no-existe' };

  const buscar = () => supabase.from('inscripciones').select(COLUMNAS_INSCRIPCION)
    .eq('curso_id', curso.id).eq('alumna_id', usuario.id).maybeSingle();

  try {
    const existente = exigir(await buscar());
    if (existente?.estado === 'cancelada') {
      const { data: fila, error: e } = await supabase.from('inscripciones').update({ estado: 'pendiente' })
        .eq('id', existente.id).select(COLUMNAS_INSCRIPCION).single();
      if (e) return { inscripcion: null, nueva: false, error: codigoDeError(e) };
      return { inscripcion: aInscripcion(fila), nueva: true, error: null };
    }
    if (existente) return { inscripcion: aInscripcion(existente), nueva: false, error: null };

    const { data, error } = await supabase.from('inscripciones').insert({ curso_id: curso.id })
      .select(COLUMNAS_INSCRIPCION).single();
    if (error?.code === '23505') {   // la pidió en otra pestaña al mismo tiempo
      return { inscripcion: aInscripcion(exigir(await buscar())), nueva: false, error: null };
    }
    if (error) return { inscripcion: null, nueva: false, error: codigoDeError(error) };
    return { inscripcion: aInscripcion(data), nueva: true, error: null };
  } catch {
    return { inscripcion: null, nueva: false, error: 'servidor' };
  }
}

/* ------------------------------ panel ------------------------------ */

export async function alumnas() {
  const filas = exigir(await supabase.from('perfiles').select('*').eq('rol', 'alumna'));
  return filas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    cedula: p.cedula,
    telefono: p.telefono,
    correo: p.correo,
    instagram: p.instagram,
    fechaNacimiento: p.fecha_nacimiento,
    creada: p.creado_en
  }));
}

/** Confirma, cancela o deja pendiente. La base impide confirmar si el curso está lleno. */
export async function cambiarEstado(id, estado) {
  const { data, error } = await supabase.from('inscripciones').update({ estado })
    .eq('id', id).select(COLUMNAS_INSCRIPCION).maybeSingle();
  if (error) {
    if (/lleno|cupos/i.test(error.message)) return { inscripcion: null, error: 'sin-cupos' };
    return { inscripcion: null, error: 'servidor' };
  }
  if (!data) return { inscripcion: null, error: 'no-existe' };
  cursosEnCurso = null;   // los cupos cambiaron
  return { inscripcion: aInscripcion(data), error: null };
}

/* ------------------------- superadmin (Marco) ------------------------- */
// Solo el rol superadmin puede escribir en cursos, galeria y los buckets: lo
// imponen las reglas RLS. Aquí solo se traducen las formas y los errores.

/** Campo de la web → columna de "cursos". */
const COLUMNAS_CURSO = {
  slug: 'slug', nombre: 'nombre', nombreCorto: 'nombre_corto', subtitulo: 'subtitulo',
  categoria: 'categoria', nivel: 'nivel', modalidad: 'modalidad', ubicacion: 'ubicacion',
  imagenPortada: 'portada', fechaInicio: 'fecha_inicio', fechaFin: 'fecha_fin', dias: 'dias',
  horario: 'horario', semanas: 'semanas', totalClases: 'total_clases', calendario: 'calendario',
  cupos: 'cupos', descripcion: 'descripcion', dirigidoA: 'dirigido_a', destacados: 'destacados',
  incluye: 'incluye', pensum: 'pensum', practicas: 'practicas', requisitos: 'requisitos',
  certificado: 'certificado', precioUSD: 'precio_usd', condicionesPago: 'condiciones_pago',
  preguntas: 'preguntas', estado: 'estado', galeria: 'galeria', egresadas: 'egresadas',
  publicado: 'publicado', archivado: 'archivado'
};

/** Curso (o parte de él) → fila. Solo copia los campos presentes. */
function aFila(cambios) {
  const fila = {};
  for (const [web, columna] of Object.entries(COLUMNAS_CURSO)) {
    if (cambios[web] === undefined) continue;
    let v = cambios[web];
    if (web === 'imagenPortada') v = v?.src ? v : null;
    fila[columna] = v;
  }
  return fila;
}

/** Error de la base al guardar un curso → código para el panel. */
function errorDeCurso(e) {
  if (e?.code === '23505') return 'slug-repetido';
  if (e?.code === '23514' || e?.code === '22P02' || e?.code === '23502') return 'datos';
  if (e?.code === '42501') return 'permiso';
  return 'servidor';
}

/** Crea (sin id) o actualiza (con id) un curso completo. */
export async function guardarCurso(curso) {
  const fila = aFila(curso);
  const consulta = curso.id
    ? supabase.from('cursos').update(fila).eq('id', curso.id)
    : supabase.from('cursos').insert(fila);
  const { data, error } = await consulta.select('*').maybeSingle();
  cursosEnCurso = null;
  if (error) return { curso: null, error: errorDeCurso(error), detalle: error.message };
  if (!data) return { curso: null, error: 'permiso' };   // RLS: ninguna fila cambió
  return { curso: aCurso(data, 0), error: null };
}

/** Cambia solo algunos campos (publicar, archivar, finalizar…). */
export async function cambiarCurso(id, cambios) {
  return guardarCurso({ ...cambios, id });
}

/** Sube un archivo a un bucket público y devuelve su URL pública. */
export async function subirArchivo(bucket, ruta, blob) {
  const { error } = await supabase.storage.from(bucket)
    .upload(ruta, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) {
    const t = `${error.statusCode || ''} ${error.message || ''}`;
    return { url: null, error: /413|large|size/i.test(t) ? 'muy-grande' : /403|policy|security/i.test(t) ? 'permiso' : 'servidor' };
  }
  return { url: supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl, error: null };
}

/** Borra archivos del bucket a partir de sus URLs públicas (las demás se ignoran). */
export async function borrarArchivos(bucket, urls) {
  const marca = `/storage/v1/object/public/${bucket}/`;
  const rutas = urls.filter((u) => typeof u === 'string' && u.includes(marca))
    .map((u) => decodeURIComponent(u.split(marca)[1].split('?')[0]));
  if (!rutas.length) return { error: null };
  const { error } = await supabase.storage.from(bucket).remove(rutas);
  return { error: error ? 'servidor' : null };
}

/** Foto de la galería (forma de la web) → fila. */
function aFilaFoto(f) {
  const mapa = { archivo: 'imagen', categoria: 'categoria', alt: 'texto_alternativo', ancho: 'ancho', alto: 'alto',
    destacada: 'destacada', enAnteriores: 'en_anteriores', orden: 'orden', publicado: 'publicado' };
  return Object.fromEntries(Object.entries(mapa).filter(([w]) => f[w] !== undefined).map(([w, c]) => [c, f[w]]));
}

export async function crearFoto(foto) {
  const { error } = await supabase.from('galeria').insert(aFilaFoto(foto));
  galeriaEnCurso = null;
  return { error: error ? (error.code === '42501' ? 'permiso' : 'servidor') : null };
}

export async function cambiarFoto(id, cambios) {
  const { data, error } = await supabase.from('galeria').update(aFilaFoto(cambios)).eq('id', id).select('id');
  galeriaEnCurso = null;
  if (error) return { error: 'servidor' };
  return { error: data?.length ? null : 'permiso' };
}

export async function borrarFoto(id) {
  const { data, error } = await supabase.from('galeria').delete().eq('id', id).select('id');
  galeriaEnCurso = null;
  if (error) return { error: 'servidor' };
  return { error: data?.length ? null : 'permiso' };
}

/** Olvida la copia de cursos y galería (el panel quiere ver lo último). */
export function olvidarCopias() { cursosEnCurso = null; galeriaEnCurso = null; }
