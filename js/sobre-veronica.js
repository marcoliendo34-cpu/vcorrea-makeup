// Página: sobre-veronica.html
import { iniciarPagina, placeholderFoto } from './componentes.js';

// Retrato: placeholder hasta que llegue la foto real.
document.querySelector('[data-retrato]').innerHTML =
  placeholderFoto({ descripcion: 'Retrato de Verónica', proporcion: '4 / 5' });

iniciarPagina();
