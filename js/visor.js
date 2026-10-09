// Visor de fotos a pantalla completa (galería y cursos anteriores).
// - Móvil: deslizar con el dedo. Escritorio: flechas del teclado o botones.
// - Esc o el botón ✕ lo cierran. Contador "3 / 12".
// - Fondo claro (crema), como pide la identidad: nada de fondos oscuros.
//
// Uso: abrirVisor(fotos, indice, disparador)
//   fotos: [{ grande, alt, pie?, ancho?, alto? }]  (grande null → placeholder)

import { esc, placeholderFoto } from './componentes.js';
import { icono } from './iconos.js';

let visor = null;        // elemento del visor (se crea una sola vez)
let estado = null;       // { fotos, i, disparador, inertes }
const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function crear() {
  visor = document.createElement('div');
  visor.className = 'visor';
  visor.setAttribute('role', 'dialog');
  visor.setAttribute('aria-modal', 'true');
  visor.setAttribute('aria-label', 'Visor de fotos');
  visor.hidden = true;
  visor.innerHTML = `
    <div class="visor__barra">
      <p class="visor__contador" data-visor-contador aria-live="polite"></p>
      <button class="visor__boton" type="button" data-visor-cerrar aria-label="Cerrar visor">${icono('cerrar', { tamano: 24 })}</button>
    </div>
    <div class="visor__escenario" data-visor-escenario>
      <figure class="visor__figura" data-visor-figura></figure>
    </div>
    <button class="visor__boton visor__boton--anterior" type="button" data-visor-anterior aria-label="Foto anterior">${icono('flecha-izquierda', { tamano: 24 })}</button>
    <button class="visor__boton visor__boton--siguiente" type="button" data-visor-siguiente aria-label="Foto siguiente">${icono('flecha-derecha', { tamano: 24 })}</button>`;
  document.body.append(visor);

  visor.querySelector('[data-visor-cerrar]').addEventListener('click', cerrarVisor);
  visor.querySelector('[data-visor-anterior]').addEventListener('click', () => mover(-1));
  visor.querySelector('[data-visor-siguiente]').addEventListener('click', () => mover(1));
  // Tocar el fondo (fuera de la foto) también cierra
  visor.querySelector('[data-visor-escenario]').addEventListener('click', (e) => {
    if (e.target === e.currentTarget && !arrastre.movio) cerrarVisor();
  });
  activarDeslizar(visor.querySelector('[data-visor-escenario]'));

  document.addEventListener('keydown', (e) => {
    if (!estado) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrarVisor(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
    else if (e.key === 'Tab') atraparFoco(e);
  });
}

function htmlFoto(f) {
  const ancho = f.ancho || 4, alto = f.alto || 5;
  const media = f.grande
    ? `<img class="visor__media" src="${esc(f.grande)}" alt="${esc(f.alt)}" width="1200" height="${Math.round(1200 * alto / ancho)}" decoding="async">`
    : placeholderFoto({ descripcion: f.alt, proporcion: `${ancho} / ${alto}`, sinBorde: true, clase: 'visor__media' });
  return `
    <div class="visor__marco" style="--relacion:${ancho / alto}">${media}</div>
    <figcaption class="visor__pie">${esc(f.pie || f.alt)}</figcaption>`;
}

function mostrar(i) {
  const { fotos } = estado;
  estado.i = (i + fotos.length) % fotos.length;
  const figura = visor.querySelector('[data-visor-figura]');
  figura.style.transform = '';
  figura.innerHTML = htmlFoto(fotos[estado.i]);
  figura.classList.remove('es-visible');
  requestAnimationFrame(() => figura.classList.add('es-visible'));
  visor.querySelector('[data-visor-contador]').textContent = `${estado.i + 1} / ${fotos.length}`;
  const varias = fotos.length > 1;
  visor.querySelector('[data-visor-anterior]').hidden = !varias;
  visor.querySelector('[data-visor-siguiente]').hidden = !varias;
  // Precarga las vecinas para que el paso sea inmediato
  [-1, 1].forEach((d) => {
    const v = fotos[(estado.i + d + fotos.length) % fotos.length];
    if (v?.grande) { const img = new Image(); img.src = v.grande; }
  });
}

function mover(paso) {
  if (estado && estado.fotos.length > 1) mostrar(estado.i + paso);
}

/**
 * Abre el visor.
 * @param {{grande:string|null, alt:string, pie?:string, ancho?:number, alto?:number}[]} fotos
 * @param {number} indice
 * @param {HTMLElement} [disparador]  Recibe el foco al cerrar.
 */
export function abrirVisor(fotos, indice = 0, disparador = document.activeElement) {
  if (!fotos?.length) return;
  if (!visor) crear();
  const inertes = [...document.body.children].filter((n) => n !== visor && !n.inert && n.tagName !== 'SCRIPT');
  inertes.forEach((n) => { n.inert = true; });
  estado = { fotos, i: indice, disparador, inertes };
  document.documentElement.classList.add('sin-scroll');
  visor.hidden = false;
  mostrar(indice);
  requestAnimationFrame(() => {
    visor.classList.add('esta-abierto');
    visor.querySelector('[data-visor-cerrar]').focus({ preventScroll: true });
  });
}

export function cerrarVisor() {
  if (!estado) return;
  const { disparador, inertes } = estado;
  estado = null;
  inertes.forEach((n) => { n.inert = false; });
  document.documentElement.classList.remove('sin-scroll');
  visor.classList.remove('esta-abierto');
  const ocultar = () => { if (!estado) visor.hidden = true; };
  if (reducir()) ocultar(); else setTimeout(ocultar, 260);
  disparador?.focus?.({ preventScroll: true });
}

function atraparFoco(e) {
  const enfocables = [...visor.querySelectorAll('button:not([hidden])')];
  const primero = enfocables[0], ultimo = enfocables[enfocables.length - 1];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
}

/* --------------------------- deslizar con el dedo -------------------------- */

const arrastre = { x0: 0, y0: 0, dx: 0, activo: false, movio: false };

function activarDeslizar(zona) {
  zona.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    Object.assign(arrastre, { x0: e.clientX, y0: e.clientY, dx: 0, activo: true, movio: false });
  });
  zona.addEventListener('pointermove', (e) => {
    if (!arrastre.activo || !estado) return;
    arrastre.dx = e.clientX - arrastre.x0;
    const dy = e.clientY - arrastre.y0;
    if (Math.abs(arrastre.dx) > 8 && Math.abs(arrastre.dx) > Math.abs(dy)) {
      arrastre.movio = true;
      const figura = visor.querySelector('[data-visor-figura]');
      figura.style.transform = `translateX(${arrastre.dx * 0.6}px)`;
    }
  });
  const soltar = () => {
    if (!arrastre.activo) return;
    arrastre.activo = false;
    const figura = visor.querySelector('[data-visor-figura]');
    if (Math.abs(arrastre.dx) > 50 && estado?.fotos.length > 1) mover(arrastre.dx < 0 ? 1 : -1);
    else figura.style.transform = '';
    // el "click" que sigue a un arrastre no debe cerrar el visor
    setTimeout(() => { arrastre.movio = false; }, 0);
  };
  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);
}
