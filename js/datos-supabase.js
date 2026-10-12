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
      enAnteriores: f.en_anteriores
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
