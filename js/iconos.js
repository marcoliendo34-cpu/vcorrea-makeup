// Íconos SVG propios. Estilo lineal, trazo 1.5, caja de 24×24.
// Sin librerías externas. Uso: icono('buscar') o icono('cerrar', { etiqueta: 'Cerrar menú' }).

const TRAZOS = {
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  'flecha-derecha': '<path d="M4.5 12h15"/><path d="m13.5 6 6 6-6 6"/>',
  'flecha-izquierda': '<path d="M19.5 12h-15"/><path d="m10.5 6-6 6 6 6"/>',
  'chevron-abajo': '<path d="m6 9 6 6 6-6"/>',
  'chevron-derecha': '<path d="m9 6 6 6-6 6"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/>',
  cerrar: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  calendario: '<rect x="3.75" y="5" width="16.5" height="15" rx="2.5"/><path d="M3.75 10h16.5"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  reloj: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/>',
  ubicacion: '<path d="M12 21s-6.75-6.1-6.75-11.25a6.75 6.75 0 0 1 13.5 0C18.75 14.9 12 21 12 21Z"/><circle cx="12" cy="9.75" r="2.25"/>',
  usuario: '<circle cx="12" cy="8.5" r="3.75"/><path d="M4.75 20c.9-3.6 3.75-5.5 7.25-5.5s6.35 1.9 7.25 5.5"/>',
  usuarias: '<circle cx="9" cy="8.5" r="3.25"/><path d="M2.75 19.5c.75-3.1 3.2-4.75 6.25-4.75s5.5 1.65 6.25 4.75"/><path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8"/><path d="M17.5 14.9c1.9.6 3.25 2.1 3.75 4.6"/>',
  marcador: '<path d="M6.75 4.5h10.5v15.75L12 16.5l-5.25 3.75Z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  'check-circulo': '<circle cx="12" cy="12" r="8.25"/><path d="m8.25 12.25 2.5 2.5 5-5"/>',
  candado: '<rect x="5" y="10.5" width="14" height="10" rx="2.25"/><path d="M8.25 10.5V7.75a3.75 3.75 0 0 1 7.5 0v2.75"/>',
  correo: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.25"/><path d="m4 7 8 6 8-6"/>',
  telefono: '<path d="M6.6 3.75h2.2l1.4 4.1-2 1.45a11.5 11.5 0 0 0 6.5 6.5l1.45-2 4.1 1.4v2.2a1.85 1.85 0 0 1-2 1.85C11.2 18.7 5.3 12.8 4.75 5.75a1.85 1.85 0 0 1 1.85-2Z"/>',
  whatsapp: '<path d="M4.2 19.8 5.3 16A8.25 8.25 0 1 1 8.4 19Z"/><path d="M9.3 8.4c.2-.4.5-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .4-.1.6l-.5.6c.6 1.1 1.5 2 2.6 2.6l.6-.5c.2-.1.4-.2.6-.1l1.4.6c.3.1.4.3.4.5v.5c0 .2 0 .5-.4.7-.5.3-1.3.5-2.2.2a7.6 7.6 0 0 1-4.6-4.6c-.3-.9-.1-1.7.2-2.2Z"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.75"/><circle cx="12" cy="12" r="3.75"/><circle cx="16.9" cy="7.1" r=".6" fill="currentColor" stroke="none"/>',
  tiktok: '<path d="M14 4v10.25a3.75 3.75 0 1 1-3.75-3.75"/><path d="M14 4c.4 2.6 2.2 4.4 5 4.75"/>',
  pincel: '<path d="M14.5 4.5 19.5 9.5 11 18a3.5 3.5 0 0 1-5-5Z"/><path d="m12.5 6.5 5 5"/><path d="M6 13c-1.5 1.5-1.5 4-2 6.5 2.5-.5 5-.5 6.5-2"/>',
  estrella: '<path d="m12 4.5 2.3 4.7 5.2.75-3.75 3.65.9 5.15L12 16.3l-4.65 2.45.9-5.15L4.5 9.95l5.2-.75Z"/>',
  salir: '<path d="M14.5 4.5h3.25A1.75 1.75 0 0 1 19.5 6.25v11.5a1.75 1.75 0 0 1-1.75 1.75H14.5"/><path d="M10.5 16.5 6 12l4.5-4.5"/><path d="M6 12h9.5"/>',
  ojo: '<path d="M2.75 12S6 5.75 12 5.75 21.25 12 21.25 12 18 18.25 12 18.25 2.75 12 2.75 12Z"/><circle cx="12" cy="12" r="2.75"/>',
  'ojo-cerrado': '<path d="M4 4l16 16"/><path d="M9.9 6.05A9.7 9.7 0 0 1 12 5.75c6 0 9.25 6.25 9.25 6.25a16 16 0 0 1-2.7 3.4"/><path d="M6.2 7.6A15.6 15.6 0 0 0 2.75 12S6 18.25 12 18.25a9.5 9.5 0 0 0 4.1-.9"/><path d="M10.1 10.1a2.75 2.75 0 0 0 3.8 3.8"/>',
  informacion: '<circle cx="12" cy="12" r="8.25"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  mas: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  editar: '<path d="M15.5 5.5 18.5 8.5 9 18l-4 1 1-4Z"/><path d="m13.5 7.5 3 3"/>',
  imagen: '<rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2.5"/><circle cx="9" cy="10" r="1.75"/><path d="m20.25 16-4.5-4.5L6 19.25"/>',
  certificado: '<circle cx="12" cy="9.5" r="5.25"/><path d="m8.75 13.6-1.5 6.65L12 18l4.75 2.25-1.5-6.65"/>',
  compartir: '<path d="M12 14.5V3.75"/><path d="m8 7.5 4-3.75 4 3.75"/><path d="M8.5 10.5H6.75A1.75 1.75 0 0 0 5 12.25v6.5c0 .97.78 1.75 1.75 1.75h10.5c.97 0 1.75-.78 1.75-1.75v-6.5c0-.97-.78-1.75-1.75-1.75H15.5"/>',
  neceser: '<path d="M4.75 9.25h14.5l-.9 9.4a1.75 1.75 0 0 1-1.74 1.6H7.39a1.75 1.75 0 0 1-1.74-1.6Z"/><path d="M8.75 9.25V7.5a3.25 3.25 0 0 1 6.5 0v1.75"/>',
  duracion: '<path d="M7 3.75h10"/><path d="M7 20.25h10"/><path d="M8 3.75v2.6c0 1.3.6 2.5 1.6 3.3L12 12l2.4-2.35c1-.8 1.6-2 1.6-3.3v-2.6"/><path d="M8 20.25v-2.6c0-1.3.6-2.5 1.6-3.3L12 12l2.4 2.35c1 .8 1.6 2 1.6 3.3v2.6"/>',
  clases: '<path d="M12 6.5c-1.9-1.4-4.6-1.9-7.75-1.5v13c3.15-.4 5.85.1 7.75 1.5 1.9-1.4 4.6-1.9 7.75-1.5V5c-3.15-.4-5.85.1-7.75 1.5Z"/><path d="M12 6.5v13"/>',
  video: '<rect x="3.25" y="6.5" width="12.5" height="11" rx="2.25"/><path d="m15.75 10.5 5-2.75v8.5l-5-2.75"/>',
  nivel: '<path d="M6 19.5v-4"/><path d="M12 19.5v-8"/><path d="M18 19.5v-12"/>',
  tarjeta: '<rect x="3" y="5.75" width="18" height="12.5" rx="2.25"/><path d="M3 9.75h18"/><path d="M6.5 14.75h4"/>',
  billete: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v.01"/><path d="M17.5 14.5v.01"/>'
};

/**
 * Devuelve el SVG de un ícono como texto.
 * @param {string} nombre  Clave en TRAZOS.
 * @param {object} [op]
 * @param {number} [op.tamano=24]   Ancho y alto en px.
 * @param {string} [op.clase='']    Clases extra.
 * @param {string} [op.etiqueta]    Texto para lectores de pantalla. Sin etiqueta, el ícono es decorativo.
 */
export function icono(nombre, { tamano = 24, clase = '', etiqueta } = {}) {
  const trazo = TRAZOS[nombre];
  if (!trazo) {
    console.warn(`[iconos] No existe el ícono "${nombre}"`);
    return '';
  }
  const accesible = etiqueta
    ? `role="img" aria-label="${etiqueta.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true" focusable="false"';
  const clases = ['icono', clase].filter(Boolean).join(' ');
  return `<svg class="${clases}" width="${tamano}" height="${tamano}" viewBox="0 0 24 24" ${accesible}>${trazo}</svg>`;
}

export const NOMBRES_ICONOS = Object.keys(TRAZOS);
