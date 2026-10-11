// Configuración del sitio. ÚNICO lugar con datos de contacto, redes y pagos.
// Ningún otro archivo debe escribir estos datos a mano.

// Vista previa para la clienta: muestra arriba la franja
// "Vista previa · Los cursos y datos son de ejemplo" en todo el sitio.
// Para quitarla: false y luego `python3 herramientas/generar_paginas.py`
// (escribe la franja en el HTML para que no haya salto al cargar; si se
// olvida, js/componentes.js igual la pone o la quita al abrir cada página).
// El bloqueo a buscadores (meta robots, X-Robots-Tag y robots.txt) es aparte.
export const MODO_VISTA_PREVIA = true;
export const TEXTO_VISTA_PREVIA = 'Vista previa · Los cursos y datos son de ejemplo';

export const CONFIG = {
  marca: {
    nombre: 'Verónica Correa',
    sub: 'Makeup',
    monograma: 'VC',
    nombreCorto: 'Vcorrea Makeup'
  },

  // Modo de datos: 'demo' usa /data/*.js. En la fase 2 se agrega 'supabase'.
  // El modo demo se mantiene siempre para poder hacer capturas sin conexión.
  modoDatos: 'demo',

  // Igual que MODO_VISTA_PREVIA (arriba), por compatibilidad.
  vistaPrevia: MODO_VISTA_PREVIA,

  whatsapp: {
    numero: '584145897775',          // formato internacional para wa.me, sin + ni espacios
    numeroVisible: '0414-589-77-75'  // como lo escribe Verónica
  },

  // Redes de Verónica (confirmadas el 11 oct 2026). Si una es null, no se muestra.
  redes: {
    instagram: { usuario: '@vcorrea_makeup', url: 'https://www.instagram.com/vcorrea_makeup/' },
    tiktok: { usuario: '@vcorrea_makeup', url: 'https://www.tiktok.com/@vcorrea_makeup' }
  },

  correo: null,       // [POR DEFINIR] ej. 'hola@vcorreamakeup.com'. Si es null, no se muestra.
  ciudad: null,       // [POR DEFINIR]

  // Atención (página de contacto). Confirmado con Verónica el 11 oct 2026.
  atencion: {
    zona: 'Caracas, Venezuela',
    horario: 'Toda la semana, previa cita'
  },

  moneda: 'USD',

  // Métodos de pago: [POR DEFINIR]. Se muestran tal cual en la ficha del curso.
  metodosPago: [
    { nombre: '[POR DEFINIR]', detalle: '[POR DEFINIR]' }
  ]
};
