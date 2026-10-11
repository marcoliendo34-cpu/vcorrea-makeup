// Página: contacto.html
// El formulario NO guarda nada: arma el mensaje y abre WhatsApp.
import { iniciarPagina, esc, boton, urlWhatsApp, MENSAJE_WHATSAPP } from './componentes.js';
import { icono } from './iconos.js';
import { CONFIG } from './config.js';

/* ------------------------------ canales ------------------------------- */

const ig = CONFIG.redes.instagram;
const tt = CONFIG.redes.tiktok;
const canal = (nombreIcono, titulo, contenido) => `
  <li class="canal">
    <span class="canal__icono">${icono(nombreIcono, { tamano: 22 })}</span>
    <div class="canal__texto"><p class="canal__titulo">${esc(titulo)}</p>${contenido}</div>
  </li>`;

document.querySelector('[data-canales]').innerHTML = `
  <div class="contacto__whatsapp">
    <p class="etiqueta">La forma más rápida</p>
    <p class="contacto__numero">${esc(CONFIG.whatsapp.numeroVisible)}</p>
    ${boton({ texto: 'Escribir por WhatsApp', href: urlWhatsApp(MENSAJE_WHATSAPP), iconoIzquierda: 'whatsapp', tamano: 'grande', bloque: true, atributos: { target: '_blank', rel: 'noopener' } })}
  </div>
  <ul class="canales">
    ${canal('instagram', 'Instagram', ig
      ? `<a href="${esc(ig.url)}" target="_blank" rel="noopener">${esc(ig.usuario)}</a>`
      : '<p class="canal__dato">[POR DEFINIR]</p>')}
    ${tt ? canal('tiktok', 'TikTok', `<a href="${esc(tt.url)}" target="_blank" rel="noopener">${esc(tt.usuario)}</a>`) : ''}
    ${CONFIG.correo ? canal('correo', 'Correo', `<a href="mailto:${esc(CONFIG.correo)}">${esc(CONFIG.correo)}</a>`) : ''}
    ${canal('ubicacion', 'Zona de atención', `<p class="canal__dato">${esc(CONFIG.atencion.zona)}</p>`)}
    ${canal('reloj', 'Horario', `<p class="canal__dato">${esc(CONFIG.atencion.horario)}</p>`)}
  </ul>`;

iniciarPagina();

/* ----------------------------- formulario ----------------------------- */

const form = document.querySelector('[data-formulario-contacto]');
const resultado = form.querySelector('[data-resultado]');

/** Teléfono venezolano: 0414-1234567, 04141234567, +58 414 1234567 o 4141234567. */
function telefonoValido(texto) {
  const d = texto.replace(/\D/g, '');
  return /^(58)?0?(4(12|14|16|24|26|22)|2\d{2})\d{7}$/.test(d);
}

const reglas = {
  nombre: (v) => (v.trim().length >= 2 ? '' : 'Escribe tu nombre.'),
  telefono: (v) => (!v.trim() ? 'Escribe tu teléfono.'
    : telefonoValido(v) ? '' : 'Revisa el número. Ejemplo: 0414-1234567.'),
  mensaje: (v) => (v.trim().length >= 5 ? '' : 'Cuéntale a Verónica en qué te puede ayudar.')
};

function validar(campo) {
  const error = reglas[campo.name]?.(campo.value) || '';
  const zona = document.getElementById(`${campo.id}-error`);
  campo.setAttribute('aria-invalid', String(Boolean(error)));
  zona.hidden = !error;
  zona.innerHTML = error ? `${icono('informacion', { tamano: 16 })}<span>${esc(error)}</span>` : '';
  return !error;
}

// Se valida al salir de cada campo, y se corrige en vivo una vez marcado.
form.querySelectorAll('.campo__control').forEach((c) => {
  c.addEventListener('blur', () => { if (c.value) validar(c); });
  c.addEventListener('input', () => { if (c.getAttribute('aria-invalid') === 'true') validar(c); });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const campos = [...form.querySelectorAll('.campo__control')];
  const validos = campos.map(validar);
  if (validos.includes(false)) {
    campos[validos.indexOf(false)].focus();
    return;
  }
  const { nombre, telefono, mensaje } = Object.fromEntries(new FormData(form));
  const texto = `Hola Verónica, soy ${nombre.trim()}.\n\n${mensaje.trim()}\n\nMi teléfono: ${telefono.trim()}`;
  const url = urlWhatsApp(texto);
  // Sin "noopener" en las opciones: con él, window.open siempre devuelve null
  // y no se podría saber si el navegador bloqueó la ventana.
  const ventana = window.open(url, '_blank');
  if (ventana) ventana.opener = null;
  resultado.hidden = false;
  resultado.innerHTML = ventana === null
    ? `Tu navegador bloqueó la ventana. <a href="${esc(url)}" target="_blank" rel="noopener">Toca aquí para abrir WhatsApp</a>.`
    : `Se abrió WhatsApp con tu mensaje. Si no lo ves, <a href="${esc(url)}" target="_blank" rel="noopener">toca aquí</a>.`;
});
