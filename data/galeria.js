// Galería de ejemplo para la vista previa (modo demo).
// Las páginas NUNCA leen este archivo directamente: piden los datos a js/datos.js.
//
// Fotos: cada foto se guarda en dos tamaños WebP dentro de /fotos/galeria/
//   {archivo}-600.webp   miniatura del mosaico (600 px de ancho)
//   {archivo}-1200.webp  versión grande del visor (1200 px de ancho)
// Mientras `archivo` sea null se muestra el placeholder crema con "Foto: {alt}".
// `ancho` y `alto` son la proporción de la foto original: reservan su espacio
// en el mosaico para que la página no salte mientras cargan.

/** Categorías de los chips, en orden. */
export const CATEGORIAS_GALERIA = [
  { id: 'social', nombre: 'Social' },
  { id: 'novias', nombre: 'Novias' },
  { id: 'editorial', nombre: 'Editorial' },
  { id: 'alumnas', nombre: 'Trabajos de alumnas' }
];

/**
 * @typedef {Object} FotoGaleria
 * @property {string} id
 * @property {string|null} archivo  Nombre base en /fotos/galeria (sin tamaño ni extensión) o null.
 * @property {'social'|'novias'|'editorial'|'alumnas'} categoria
 * @property {string} alt           Texto alternativo (y del placeholder).
 * @property {number} ancho         Proporción de la foto: ancho…
 * @property {number} alto          …y alto (ej. 4 y 5 para vertical 4:5).
 * @property {boolean} destacada    true para mostrarla en el avance de Inicio.
 */

/** @type {FotoGaleria[]} */
export const GALERIA = [
  { id: 'novia-luminosa', archivo: null, categoria: 'novias', alt: 'Maquillaje de novia con piel luminosa', ancho: 4, alto: 5, destacada: true },
  { id: 'ojos-ahumados', archivo: null, categoria: 'social', alt: 'Detalle de ojos ahumados', ancho: 1, alto: 1, destacada: true },
  { id: 'alumnas-en-clase', archivo: null, categoria: 'alumnas', alt: 'Alumnas practicando en clase', ancho: 4, alto: 3, destacada: true },
  { id: 'labios-nude', archivo: null, categoria: 'social', alt: 'Labios en tono nude', ancho: 4, alto: 5, destacada: true },
  { id: 'editorial-color', archivo: null, categoria: 'editorial', alt: 'Maquillaje editorial con color', ancho: 2, alto: 3, destacada: true },
  { id: 'noche-glam', archivo: null, categoria: 'social', alt: 'Maquillaje de noche glam', ancho: 3, alto: 4, destacada: true },
  { id: 'novia-clasica', archivo: null, categoria: 'novias', alt: 'Novia clásica con labios rojos', ancho: 3, alto: 4, destacada: false },
  { id: 'trabajo-alumna-1', archivo: null, categoria: 'alumnas', alt: 'Trabajo final de una alumna: maquillaje de día', ancho: 4, alto: 5, destacada: false },
  { id: 'editorial-mirada', archivo: null, categoria: 'editorial', alt: 'Mirada gráfica para sesión editorial', ancho: 1, alto: 1, destacada: false },
  { id: 'piel-natural', archivo: null, categoria: 'social', alt: 'Maquillaje natural de día', ancho: 4, alto: 5, destacada: false },
  { id: 'novia-detalle', archivo: null, categoria: 'novias', alt: 'Detalle de pestañas y piel de novia', ancho: 4, alto: 3, destacada: false },
  { id: 'trabajo-alumna-2', archivo: null, categoria: 'alumnas', alt: 'Trabajo final de una alumna: maquillaje de noche', ancho: 2, alto: 3, destacada: false }
];
