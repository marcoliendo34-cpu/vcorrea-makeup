// Configuración del sitio. ÚNICO lugar con datos de contacto, redes y pagos.
// Ningún otro archivo debe escribir estos datos a mano.

// Franja "Vista previa · Los cursos y datos son de ejemplo" arriba de todo el
// sitio. Apagada desde el lanzamiento (12 oct 2026). Si se vuelve a encender,
// correr `python3 herramientas/generar_paginas.py` (la escribe en el HTML).
// Qué páginas se ocultan a los buscadores lo decide generar_paginas.py (PRIVADAS).
export const MODO_VISTA_PREVIA = false;
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

  correo: null,       // Correo de contacto público (ej. 'hola@dominio.com'). Si es null, no se muestra.

  // Atención (página de contacto). Confirmado con Verónica el 11 oct 2026.
  atencion: {
    zona: 'Caracas, Venezuela',
    horario: 'Toda la semana, previa cita'
  },

  moneda: 'USD',

  // Medición (solo en la web publicada; nunca en localhost):
  //   metaPixelId: ID del Pixel de Meta (solo números). null = sin Pixel.
  //     Eventos: PageView en cada página, Contact al tocar "Inscribirme" y
  //     CompleteRegistration al terminar el registro (js/medicion.js).
  //   vercelAnalytics: true = script de Vercel Web Analytics (hay que activarlo
  //     en el panel de Vercel → proyecto → Analytics).
  medicion: {
    metaPixelId: null,
    vercelAnalytics: true
  },

  // Métodos de pago (confirmados el 11 oct 2026). Se muestran tal cual en la ficha del curso.
  // `detalle` es opcional (ej. el banco o el correo de Binance); si es null no se muestra.
  metodosPago: [
    { nombre: 'Pago móvil', detalle: null },
    { nombre: 'Divisas en efectivo', detalle: 'USD' },
    { nombre: 'USDT', detalle: 'Binance' }
  ]
};
