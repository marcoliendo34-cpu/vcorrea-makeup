// Fuente de datos SOLO para capturas en el espacio de trabajo (modo demo).
// Lee data/cursos.js y data/galeria.js y guarda las inscripciones en
// localStorage. Misma forma que js/datos-supabase.js; js/datos.js elige.

import { CURSOS } from '../../data/cursos.js';
import { GALERIA } from '../../data/galeria.js';
import { almacen, leerAlumnas } from './sesion-demo.js';
import { CLAVES } from '../sesion-base.js';
import { calcularCupos } from '../cupos.js';

const copiar = (v) => structuredClone(v);
const leerInscripciones = () => almacen.leer(CLAVES.inscripciones, []);

/** Cursos con `inscritas` = inscripciones confirmadas (en los finalizados, las egresadas). */
export async function cursos() {
  const confirmadas = {};
  leerInscripciones()
    .filter((i) => i.estado === 'confirmada')
    .forEach((i) => { confirmadas[i.cursoSlug] = (confirmadas[i.cursoSlug] || 0) + 1; });
  return copiar(CURSOS).map((c) => ({
    ...c,
    inscritas: c.estado === 'finalizado' ? (c.egresadas || 0) : (confirmadas[c.slug] || 0)
  }));
}

export async function galeria() {
  return copiar(GALERIA);
}

export async function inscripcionesDe(usuarioId) {
  return copiar(leerInscripciones().filter((i) => i.alumnaId === usuarioId));
}

export async function todasLasInscripciones() {
  return copiar(leerInscripciones());
}

export async function alumnas() {
  return copiar(leerAlumnas());
}

/** Cupos de un curso en este momento. */
export async function cuposAhora(cursoSlug) {
  const c = (await cursos()).find((x) => x.slug === cursoSlug);
  return c ? { cupos: c.cupos, confirmadas: c.inscritas } : null;
}

export async function crearInscripcion(usuario, cursoSlug) {
  const todas = leerInscripciones();
  // Igual que la base: no se piden cupos de un curso lleno.
  const ahora = await cuposAhora(cursoSlug);
  const lleno = ahora && ahora.confirmadas >= ahora.cupos;
  const existente = todas.find((i) => i.alumnaId === usuario.id && i.cursoSlug === cursoSlug);
  if (existente?.estado === 'cancelada') {
    if (lleno) return { inscripcion: null, nueva: false, error: 'agotado' };
    existente.estado = 'pendiente';
    existente.creada = new Date().toISOString();
    if (!almacen.escribir(CLAVES.inscripciones, todas)) return { inscripcion: null, nueva: false, error: 'almacenamiento' };
    return { inscripcion: copiar(existente), nueva: true, error: null };
  }
  if (existente) return { inscripcion: copiar(existente), nueva: false, error: null };
  if (lleno) return { inscripcion: null, nueva: false, error: 'agotado' };
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

/** Cambia el estado. `curso` ya viene con sus inscritas (para el control de cupos). */
export async function cambiarEstado(id, estado, curso) {
  const todas = leerInscripciones();
  const inscripcion = todas.find((i) => i.id === id);
  if (!inscripcion) return { inscripcion: null, error: 'no-existe' };
  if (estado === 'confirmada' && calcularCupos(curso.inscritas, curso.cupos).restantes === 0) {
    return { inscripcion: null, error: 'sin-cupos' };
  }
  inscripcion.estado = estado;
  inscripcion.actualizada = new Date().toISOString();
  if (!almacen.escribir(CLAVES.inscripciones, todas)) return { inscripcion: null, error: 'almacenamiento' };
  return { inscripcion: copiar(inscripcion), error: null };
}
