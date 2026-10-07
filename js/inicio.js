// Página: index.html (Inicio)
import { iniciarPagina, placeholderFoto, boton } from './componentes.js';

// Foto del hero: placeholder hasta que llegue la foto real.
document.querySelector('[data-hero-media]').innerHTML =
  placeholderFoto({ descripcion: 'Verónica maquillando a una alumna (hero)', sinBorde: true });

document.querySelector('[data-hero-acciones]').innerHTML =
  boton({ texto: 'Ver cursos', href: '/cursos', variante: 'claro', tamano: 'grande', icono: 'flecha-derecha' });

iniciarPagina();
