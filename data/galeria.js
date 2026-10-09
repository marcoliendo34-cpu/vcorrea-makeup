// Galería de ejemplo para la vista previa (modo demo).
// Las páginas NUNCA leen este archivo directamente: piden los datos a js/datos.js.
// Mientras no lleguen las fotos reales, `src` es null y se muestra el
// placeholder crema con "Foto: {alt}".

/**
 * @typedef {Object} FotoGaleria
 * @property {string} id
 * @property {string|null} src       Ruta en /fotos (WebP, máx. 1200 px) o null.
 * @property {string|null} miniatura Ruta en /fotos (WebP, 600 px) o null.
 * @property {string} alt            Descripción de la foto (alt y texto del placeholder).
 * @property {string} categoria      Ej. "Novias", "Social", "Clases".
 * @property {boolean} destacada     true para mostrarla en el avance de Inicio.
 */

/** @type {FotoGaleria[]} */
export const GALERIA = [
  { id: 'novia-luminosa', src: null, miniatura: null, alt: 'Maquillaje de novia con piel luminosa', categoria: 'Novias', destacada: true },
  { id: 'ojos-ahumados', src: null, miniatura: null, alt: 'Detalle de ojos ahumados', categoria: 'Social', destacada: true },
  { id: 'alumnas-en-clase', src: null, miniatura: null, alt: 'Alumnas practicando en clase', categoria: 'Clases', destacada: true },
  { id: 'labios-nude', src: null, miniatura: null, alt: 'Labios en tono nude', categoria: 'Social', destacada: true },
  { id: 'brochas', src: null, miniatura: null, alt: 'Kit de brochas sobre la mesa', categoria: 'Clases', destacada: true },
  { id: 'noche-glam', src: null, miniatura: null, alt: 'Maquillaje de noche glam', categoria: 'Social', destacada: true },
  { id: 'piel-natural', src: null, miniatura: null, alt: 'Maquillaje natural de día', categoria: 'Social', destacada: false },
  { id: 'novia-clasica', src: null, miniatura: null, alt: 'Novia clásica con labios rojos', categoria: 'Novias', destacada: false },
  { id: 'demostracion', src: null, miniatura: null, alt: 'Verónica haciendo una demostración', categoria: 'Clases', destacada: false }
];
