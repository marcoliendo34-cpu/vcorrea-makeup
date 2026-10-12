// Medición de la web publicada: Pixel de Meta y Vercel Web Analytics.
// Se configura en js/config.js (CONFIG.medicion). Nunca corre en localhost
// (capturas y pruebas) ni en el panel /admin (no llama a iniciarPagina).
//
// Eventos del Pixel:
//   PageView              al abrir cada página pública
//   Contact               al tocar "Inscribirme" (js/inscripcion.js)
//   CompleteRegistration  al terminar el registro (js/registro.js)

import { CONFIG } from './config.js';

const ajustes = CONFIG.medicion || {};
const PIXEL = /^\d{5,20}$/.test(String(ajustes.metaPixelId ?? '')) ? String(ajustes.metaPixelId) : null;
let iniciada = false;
/** En el espacio de trabajo (capturas y pruebas, incluso con ?supabase=1) nunca se mide. */
const LOCAL = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);

/** Código base del Pixel de Meta (el mismo que da Meta, sin la imagen noscript). */
function cargarPixel(id) {
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', id);
  window.fbq('track', 'PageView');
}

/** Vercel Web Analytics (script propio del dominio: /_vercel/insights/script.js). */
function cargarVercelAnalytics() {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const s = document.createElement('script');
  s.defer = true;
  s.src = '/_vercel/insights/script.js';
  document.head.append(s);
}

/** Una vez por página, desde iniciarPagina() de js/componentes.js. */
export function iniciarMedicion() {
  if (iniciada || LOCAL) return;
  iniciada = true;
  try {
    if (PIXEL) cargarPixel(PIXEL);
    if (ajustes.vercelAnalytics) cargarVercelAnalytics();
  } catch { /* la medición nunca rompe la página */ }
}

/**
 * Evento estándar del Pixel (si está activo).
 * @param {'Contact'|'CompleteRegistration'} nombre
 * @param {object} [datos]  ej. { content_name: 'Visión Lash' }
 */
export function medir(nombre, datos = {}) {
  try {
    if (PIXEL && typeof window.fbq === 'function') window.fbq('track', nombre, datos);
  } catch { /* nada */ }
}
