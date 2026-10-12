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

  // De dónde salen los datos: lo decide js/modo.js, no este archivo.
  // Web publicada → siempre Supabase. Espacio de trabajo (localhost) → demo
  // con data/*.js, solo para capturas.

  // Supabase (fase 2). Proyecto "VCORREA MAKEUP", us-east-1.
  // La llave publicable es pública por diseño: la seguridad la ponen las reglas
  // RLS de la base (supabase/migraciones). La llave secreta NUNCA va en el código.
  supabase: {
    url: 'https://sgcxjurhxycnhmsiqeid.supabase.co',
    llavePublica: 'sb_publishable_DAq2QDwfNAOCo4rb6pRtbg_X8GOIxpo'
  },

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

  // Métodos de pago (confirmados el 11 oct 2026). Se muestran tal cual en la ficha del curso.
  // `detalle` es opcional (ej. el banco o el correo de Binance); si es null no se muestra.
  metodosPago: [
    { nombre: 'Pago móvil', detalle: null },
    { nombre: 'Divisas en efectivo', detalle: 'USD' },
    { nombre: 'USDT', detalle: 'Binance' }
  ]
};
