// Cursos SOLO para el modo demo (capturas en el espacio de trabajo).
// La web publicada lee la tabla "cursos" de Supabase (cargada desde aquí con la
// migración cargar_cursos_y_galeria). Si cambias un curso aquí, cámbialo también
// en la base. Las páginas NUNCA leen este archivo: piden los datos a js/datos.js.
// Cursos reales de Verónica. Los finalizados (ediciones pasadas) se agregan
// cuando llegue su información.
// En la fase 2 estos datos vienen de Supabase con la misma forma.

/**
 * Foto con su texto alternativo. Si `src` es null se muestra el placeholder
 * crema con "Foto: {alt}".
 * @typedef {Object} Foto
 * @property {string|null} src  Ruta en /fotos (WebP) o null mientras falte la foto.
 * @property {string} alt       Descripción de la foto (alt y texto del placeholder).
 * @property {string} [miniatura] Versión de 600 px para las tarjetas.
 * @property {boolean} [flyer]    true si la imagen es un flyer con texto (fecha incluida).
 * @property {string} [og]        JPEG para la vista previa al compartir (WhatsApp, redes). Si falta, se usa src.
 * @property {number} [ancho]     Tamaño real de la foto: la tarjeta y la ficha toman su
 * @property {number} [alto]      proporción (ej. un flyer 4:5 se ve completo, sin recortes).
 */

/**
 * Una semana (o un módulo) del pensum.
 * @typedef {Object} SemanaPensum
 * @property {number} [semana]   Número de semana (1, 2, 3…). Sin semana, es un módulo
 *                               y la sección se titula "Qué aprenderás".
 * @property {string} titulo     Tema central de la semana o nombre del módulo.
 * @property {string[]} temas    Temas que se ven esa semana.
 */

/**
 * Una práctica del curso.
 * @typedef {Object} Practica
 * @property {string} titulo
 * @property {string} descripcion
 * @property {boolean} requiereModelo  true si la alumna debe traer modelo.
 */

/**
 * @typedef {Object} Certificado
 * @property {boolean} incluye
 * @property {string} descripcion
 */

/**
 * Un curso o formación.
 * @typedef {Object} Curso
 * @property {string} slug            Identificador de la URL: /cursos/{slug}. Minúsculas, sin acentos, con guiones.
 * @property {string} nombre
 * @property {string} [nombreCorto]  Para la barra fija del móvil. Si falta, se usa `nombre`.
 * @property {string} subtitulo       Una línea que resume el curso.
 * @property {string} categoria       Ej. "Automaquillaje", "Maquillaje social", "Novias y eventos".
 * @property {string} nivel           Ej. 'Básico', 'Intermedio', 'Avanzado', 'De cero a profesional'.
 * @property {'Presencial'|'Online'} modalidad
 * @property {string} ubicacion       Ciudad o sede (presencial) o plataforma (online).
 * @property {Foto} imagenPortada
 * @property {string} fechaInicio     'AAAA-MM-DD'
 * @property {string} fechaFin        'AAAA-MM-DD'
 * @property {string} dias            Ej. "Sábados", "Martes y jueves".
 * @property {string} horario         Ej. "9:00 a. m. a 1:00 p. m."
 * @property {{fecha: string, texto: string, destacada?: boolean}[]} [calendario]
 *                                   Fechas de cada clase ('AAAA-MM-DD'), opcional. Se muestra en la ficha.
 * @property {number} semanas
 * @property {number} totalClases
 * @property {number} cupos           Cupos totales.
 * @property {number} [inscritas]     Inscripciones confirmadas. NO va en este archivo: lo
 *                                   calcula la fuente de datos (solo cuentan las confirmadas).
 * @property {string} descripcion
 * @property {string[]} dirigidoA
 * @property {{titulo: string, items: string[], cierre?: string}} [destacados]
 *                                   Lista opcional bajo "Sobre el curso" (ej. "Porque tu éxito es nuestra meta").
 * @property {string[]} incluye
 * @property {SemanaPensum[]} pensum
 * @property {Practica[]} practicas
 * @property {string[]} requisitos
 * @property {Certificado} certificado
 * @property {number} precioUSD       Solo se muestra en la ficha del curso, después de lo que incluye.
 * @property {string|null} condicionesPago  Texto opcional (ej. pago en dos partes).
 * @property {{pregunta: string, respuesta: string}[]} [preguntas]  Preguntas frecuentes del curso (opcional).
 * @property {'vigente'|'finalizado'} estado
 * @property {Foto[]} galeria         Fotos opcionales del curso (mini galería en Cursos anteriores).
 *                                    `src` es la versión grande (1200 px) y `miniatura`, opcional, la de 600 px.
 * @property {number|null} egresadas  Cantidad de egresadas. Solo cursos finalizados; null en vigentes.
 */

/** @type {Curso[]} */
export const CURSOS = [
  /* ================================================================== */
  /* VIGENTES                                                           */
  /* ================================================================== */
  // Primer curso real (información de Verónica, 11 oct 2026).
  {
    slug: 'vision-lash',
    nombre: 'Visión Lash',
    subtitulo: 'Programa de Formación Profesional de Pestañas Pelo a Pelo',
    categoria: 'Pestañas',
    nivel: 'De cero a profesional',
    modalidad: 'Presencial',
    ubicacion: 'Caracas, Venezuela',
    imagenPortada: {
      src: '/fotos/cursos/vision-lash-1080.webp',
      miniatura: '/fotos/cursos/vision-lash-600.webp',
      og: '/fotos/cursos/vision-lash-og.jpg',   // JPEG para la vista previa al compartir (864×1080)
      ancho: 1080, alto: 1350,
      flyer: true,   // ya trae la fecha: la tarjeta no le pone encima su insignia de fecha
      alt: 'Flyer de Visión Lash con Verónica Correa: inicia el 4 de noviembre, 6 clases en 3 semanas, presencial en Caracas'
    },
    fechaInicio: '2026-11-04',
    fechaFin: '2026-12-05',
    dias: 'Miércoles y viernes',
    horario: 'Exclusivo alumnas',
    semanas: 3,
    totalClases: 6,
    calendario: [
      { fecha: '2026-11-04', texto: 'Clase 1' },
      { fecha: '2026-11-06', texto: 'Clase 2' },
      { fecha: '2026-11-11', texto: 'Clase 3' },
      { fecha: '2026-11-13', texto: 'Clase 4' },
      { fecha: '2026-11-18', texto: 'Clase 5' },
      { fecha: '2026-11-20', texto: 'Clase 6' },
      { fecha: '2026-12-05', texto: 'Exposiciones, certificaciones y brindis', destacada: true }
    ],
    cupos: 10,
    descripcion: 'Un programa de formación integral y práctico diseñado para transformarte de cero a profesional en el arte de las extensiones de pestañas. No solo aprendes técnicas, también construyes tu independencia económica.',
    dirigidoA: [],
    destacados: {
      titulo: 'Porque tu éxito es nuestra meta',
      items: [
        'Te enseñamos a ser independiente, no solo a hacer un servicio.',
        'Preparada para la temporada de mayor demanda.',
        'Sales lista para atender clientas con confianza y seguridad.',
        'Formas parte de una comunidad que crece contigo.'
      ],
      cierre: 'No es solo una formación. Es el comienzo de tu carrera, de tu independencia y de un futuro que construyes con tus propias manos.'
    },
    incluye: [
      'Kit profesional de obsequio',
      '80 % de los materiales',
      'Material POP',
      'Medalla de reconocimiento',
      'Certificado de aprobación con sello oficial',
      'Coffee break',
      'Guía',
      'Camisa para la formación',
      'Brindis',
      'Impulso en marketing',
      'Material audiovisual, teórico y práctico',
      'Práctica en esponja, maniquíes y 3 modelos reales',
      'Almuerzo (2 días)',
      'Tutoría ilimitada',
      'Regalos y patrocinios',
      'Premio a las 2 mejores prácticas',
      'Tu gran cierre: evaluación y exposición final'
    ],
    // Pensum por módulos (sin semana): se muestra como "Qué aprenderás".
    pensum: [
      { titulo: 'Técnicas fundamentales', temas: ['Técnica clásica 1:1', 'Efecto rímel', 'Híbridas', 'Inicio al volumen manual', 'Volumen tecnológico'] },
      { titulo: 'Fibras tecnológicas y sus efectos', temas: ['Volumen tecnológico', 'Volumen egipcio', 'Volumen griego', 'Volumen hawaiano'] },
      { titulo: 'Conocimientos esenciales', temas: [
        'Higiene correcta y bioseguridad',
        'Salud ocular y contraindicaciones',
        'El adhesivo: composición, manejo y retención',
        'Diseños de mirada, con aprendizaje gradual',
        'Tapping',
        'Aislamiento preciso',
        'Aislamiento unilateral: técnica infalible',
        'Mapping comercial',
        'Capping brasileño',
        'Productos y su uso correcto',
        'Ficha clínica del cliente',
        'Retiro normal y retiro químico',
        '¡Y mucho más para destacar en el mercado!'
      ] }
    ],
    practicas: [
      { titulo: 'En esponja y maniquíes', descripcion: 'Practicas cada técnica en esponja y en maniquíes antes de trabajar sobre una persona.', requiereModelo: false },
      { titulo: 'Con modelos reales', descripcion: 'Aplicas lo aprendido sobre 3 modelos reales.', requiereModelo: false },
      { titulo: 'Evaluación y exposición final', descripcion: 'Tu gran cierre. Las 2 mejores prácticas reciben un premio.', requiereModelo: false }
    ],
    requisitos: [],
    certificado: { incluye: true, descripcion: 'Certificado de aprobación con sello oficial y medalla de reconocimiento. Se entregan el 5 de diciembre, en el día de exposiciones, certificaciones y brindis.' },
    precioUSD: 500,
    condicionesPago: 'Reservas tu cupo con $140 y pagas 6 cuotas de $60, una en cada clase.',
    preguntas: [
      { pregunta: '¿Necesito experiencia previa?', respuesta: 'No. Visión Lash está diseñado para llevarte de cero a profesional en extensiones de pestañas.' },
      { pregunta: '¿Puedo pagar en partes?', respuesta: 'Sí. Reservas tu cupo con $140 y pagas 6 cuotas de $60, una en cada clase. El total es de $500.' },
      { pregunta: '¿Cuándo recibo mi certificado?', respuesta: 'El 5 de diciembre, en el día de exposiciones, certificaciones y brindis.' }
    ],
    estado: 'vigente',
    galeria: [],
    egresadas: null
  }

  // FINALIZADOS: aquí van las ediciones pasadas (estado: 'finalizado') cuando
  // Verónica envíe su información. Se muestran en Cursos anteriores.
];
