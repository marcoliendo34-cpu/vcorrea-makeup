// Galería SOLO para el modo demo (capturas en el espacio de trabajo).
// La web publicada lee la tabla "galeria" de Supabase (misma información).
// Las páginas NUNCA leen este archivo directamente: piden los datos a js/datos.js.
//
// Fotos: cada foto se guarda en dos tamaños WebP dentro de /fotos/galeria/
//   {archivo}-600.webp   miniatura del mosaico (600 px de ancho)
//   {archivo}-1200.webp  versión grande del visor (1200 px de ancho)
// Mientras `archivo` sea null se muestra el placeholder crema con "Foto: {alt}".
// `ancho` y `alto` son la proporción de la foto original: reservan su espacio
// en el mosaico para que la página no salte mientras cargan.

/** Categorías de los chips: viven en js/textos.js (las usa también la base). */
export { CATEGORIAS_GALERIA } from '../js/textos.js';

/**
 * @typedef {Object} FotoGaleria
 * @property {string} id
 * @property {string|null} archivo  Nombre base en /fotos/galeria (sin tamaño ni extensión) o null.
 * @property {'formaciones'|'alumnas'|'propios'} categoria
 * @property {string} alt           Texto alternativo (y del placeholder).
 * @property {number} ancho         Proporción de la foto: ancho…
 * @property {number} alto          …y alto (ej. 4 y 5 para vertical 4:5).
 * @property {boolean} destacada    true para mostrarla en el avance de Inicio.
 * @property {boolean} [enAnteriores] true para mostrarla en Cursos anteriores (entregas de certificado).
 */

/** @type {FotoGaleria[]} */
export const GALERIA = [
  // Fotos reales de formaciones anteriores (recibidas el 11 oct 2026). Las 6 destacadas van al inicio.
  { id: 'formacion-01', archivo: 'formacion-01', categoria: 'formaciones', alt: 'Alumnas de la Máster Class Brows con sus certificados', ancho: 960, alto: 1280, destacada: true },
  { id: 'formacion-02', enAnteriores: true, archivo: 'formacion-02', categoria: 'formaciones', alt: 'Grupo de la segunda edición de la Máster Class con sus certificados', ancho: 720, alto: 747, destacada: true },
  { id: 'formacion-03', enAnteriores: true, archivo: 'formacion-03', categoria: 'formaciones', alt: 'Alumnas mostrando sus certificados al terminar la formación', ancho: 960, alto: 1280, destacada: true },
  { id: 'formacion-04', archivo: 'formacion-04', categoria: 'formaciones', alt: 'Alumnas con sus certificados junto al equipo de la Máster Class Brows', ancho: 960, alto: 1280, destacada: true },
  { id: 'formacion-05', enAnteriores: true, archivo: 'formacion-05', categoria: 'formaciones', alt: 'Siete alumnas con sus certificados junto a globos negros y plateados', ancho: 960, alto: 1280, destacada: true },
  { id: 'formacion-06', enAnteriores: true, archivo: 'formacion-06', categoria: 'formaciones', alt: 'Grupo de la Máster Class Brows con sus certificados', ancho: 810, alto: 1080, destacada: true },
  { id: 'formacion-07', enAnteriores: true, archivo: 'formacion-07', categoria: 'formaciones', alt: 'Alumnas sonrientes con sus certificados en mano', ancho: 960, alto: 1280, destacada: false },
  { id: 'formacion-08', enAnteriores: true, archivo: 'formacion-08', categoria: 'formaciones', alt: 'Alumnas con sus certificados, de pie y agachadas sobre una alfombra gris', ancho: 810, alto: 1080, destacada: false },
  // Ejemplos sin foto todavía (placeholders).
  { id: 'alumnas-en-clase', archivo: null, categoria: 'alumnas', alt: 'Alumnas practicando en clase', ancho: 4, alto: 3, destacada: false },
  { id: 'trabajo-alumna-1', archivo: null, categoria: 'alumnas', alt: 'Trabajo final de una alumna: maquillaje de día', ancho: 4, alto: 5, destacada: false },
  { id: 'trabajo-alumna-2', archivo: null, categoria: 'alumnas', alt: 'Trabajo final de una alumna: maquillaje de noche', ancho: 2, alto: 3, destacada: false }
];
