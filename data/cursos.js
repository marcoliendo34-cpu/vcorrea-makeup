// Cursos del sitio (modo demo).
// Las páginas NUNCA leen este archivo directamente: piden los datos a js/datos.js.
// Vigentes: cursos reales de Verónica. Finalizados: de ejemplo, marcados con
// [EJEMPLO], hasta que llegue la lista real de ediciones pasadas.
// En la fase 2 estos datos vienen de Supabase con la misma forma.

/**
 * Foto con su texto alternativo. Si `src` es null se muestra el placeholder
 * crema con "Foto: {alt}".
 * @typedef {Object} Foto
 * @property {string|null} src  Ruta en /fotos (WebP) o null mientras falte la foto.
 * @property {string} alt       Descripción de la foto (alt y texto del placeholder).
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
 * @property {number} inscritasFuera  Cupos ya ocupados por inscritas confirmadas que NO están
 *                                   en la lista de la web (inscritas por WhatsApp antes de
 *                                   abrir la web, por ejemplo). js/datos.js le suma las
 *                                   inscripciones confirmadas en el panel y entrega el total
 *                                   como `inscritas`. En los cursos finalizados es el total.
 * @property {number} [inscritas]     Total de inscritas confirmadas. NO va en este archivo:
 *                                   lo calcula js/datos.js (inscritasFuera + confirmadas).
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
  // Pendiente de Verónica: horario, dirección exacta y foto de portada.
  {
    slug: 'vision-lash',
    nombre: 'Visión Lash',
    subtitulo: 'Programa de Formación Profesional de Pestañas Pelo a Pelo',
    categoria: 'Pestañas',
    nivel: 'De cero a profesional',
    modalidad: 'Presencial',
    ubicacion: 'Caracas [POR DEFINIR]',
    imagenPortada: { src: null, alt: 'Extensiones de pestañas pelo a pelo' },
    fechaInicio: '2026-11-04',
    fechaFin: '2026-12-05',
    dias: 'Miércoles y viernes',
    horario: '[POR DEFINIR]',
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
    inscritasFuera: 0,
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
  },

  /* ================================================================== */
  /* FINALIZADOS (página "Cursos anteriores")                           */
  /* ================================================================== */
  {
    slug: 'pieles-perfectas-2026',
    nombre: 'Pieles Perfectas',
    nombreCorto: 'Pieles Perfectas',
    subtitulo: 'Taller de preparación, corrección y acabados de piel',
    categoria: 'Maquillaje social',
    nivel: 'Intermedio',
    modalidad: 'Presencial',
    ubicacion: 'Caracas [EJEMPLO]',
    imagenPortada: { src: null, alt: 'Detalle de piel luminosa' },
    fechaInicio: '2026-02-07',
    fechaFin: '2026-02-28',
    dias: 'Sábados',
    horario: '9:00 a. m. a 1:00 p. m.',
    semanas: 4,
    totalClases: 4,
    cupos: 12,
    inscritasFuera: 12,
    descripcion: '[EJEMPLO] Taller enfocado solo en la piel: preparación, corrección con color, acabados mate, satinado y luminoso, y cómo hacer que el maquillaje dure en el clima de Caracas.',
    dirigidoA: ['Maquilladoras que quieren perfeccionar la piel', 'Egresadas de cursos básicos'],
    incluye: ['4 clases presenciales', 'Productos para usar en clase', 'Certificado de participación'],
    pensum: [
      { semana: 1, titulo: 'Preparación', temas: ['Skincare previo al maquillaje', 'Primers según tipo de piel'] },
      { semana: 2, titulo: 'Corrección', temas: ['Colorimetría', 'Ojeras y manchas'] },
      { semana: 3, titulo: 'Acabados', temas: ['Mate, satinado y luminoso', 'Sellado'] },
      { semana: 4, titulo: 'Duración', temas: ['Pieles grasas en clima cálido', 'Retoques'] }
    ],
    practicas: [{ titulo: 'Piel completa', descripcion: 'Preparación, corrección y acabado sobre modelo.', requiereModelo: true }],
    requisitos: ['Conocimientos básicos de maquillaje'],
    certificado: { incluye: true, descripcion: 'Certificado de participación.' },
    precioUSD: 90,
    condicionesPago: null,
    estado: 'finalizado',
    galeria: [
      { src: null, alt: 'Alumnas preparando la piel en clase' },
      { src: null, alt: 'Detalle de piel satinada' },
      { src: null, alt: 'Grupo de egresadas de Pieles Perfectas' }
    ],
    egresadas: 12
  },

  {
    slug: 'ojos-de-impacto-2026',
    nombre: 'Ojos de Impacto',
    nombreCorto: 'Ojos de Impacto',
    subtitulo: 'Masterclass de smokey eye, cut crease y pestañas',
    categoria: 'Maquillaje social',
    nivel: 'Avanzado',
    modalidad: 'Presencial',
    ubicacion: 'Caracas [EJEMPLO]',
    imagenPortada: { src: null, alt: 'Maquillaje de ojos ahumado' },
    fechaInicio: '2026-05-11',
    fechaFin: '2026-05-15',
    dias: 'Lunes a viernes',
    horario: '2:00 p. m. a 6:00 p. m.',
    semanas: 1,
    totalClases: 5,
    cupos: 10,
    inscritasFuera: 9,
    descripcion: '[EJEMPLO] Semana intensiva dedicada a la mirada: difuminados limpios, cut crease, smokey eye en distintos colores y colocación de pestañas para todo tipo de ojo.',
    dirigidoA: ['Maquilladoras con experiencia que quieren dominar los ojos'],
    incluye: ['5 clases presenciales', 'Pestañas para práctica', 'Certificado de participación'],
    pensum: [
      { semana: 1, titulo: 'La mirada de impacto', temas: ['Morfología del ojo', 'Difuminados', 'Cut crease', 'Smokey eye', 'Pestañas postizas'] }
    ],
    practicas: [{ titulo: 'Smokey eye sobre modelo', descripcion: 'Trabajo final fotografiado.', requiereModelo: true }],
    requisitos: ['Experiencia previa en maquillaje', 'Kit personal de brochas'],
    certificado: { incluye: true, descripcion: 'Certificado de participación.' },
    precioUSD: 150,
    condicionesPago: null,
    estado: 'finalizado',
    galeria: [
      { src: null, alt: 'Smokey eye terminado por una alumna' },
      { src: null, alt: 'Colocación de pestañas en clase' },
      { src: null, alt: 'Grupo de egresadas de Ojos de Impacto' }
    ],
    egresadas: 9
  },

  {
    slug: 'automaquillaje-esencial-julio-2026',
    nombre: 'Automaquillaje Esencial',
    nombreCorto: 'Automaquillaje',
    subtitulo: 'Edición de julio',
    categoria: 'Automaquillaje',
    nivel: 'Básico',
    modalidad: 'Presencial',
    ubicacion: 'Caracas [EJEMPLO]',
    imagenPortada: { src: null, alt: 'Grupo de alumnas en clase de automaquillaje' },
    fechaInicio: '2026-07-04',
    fechaFin: '2026-07-25',
    dias: 'Sábados',
    horario: '9:00 a. m. a 12:00 m.',
    semanas: 4,
    totalClases: 4,
    cupos: 12,
    inscritasFuera: 11,
    descripcion: '[EJEMPLO] Edición presencial del curso de automaquillaje: piel, cejas, ojos y labios para el día a día, con tus propios productos.',
    dirigidoA: ['Mujeres que quieren aprender a maquillarse desde cero'],
    incluye: ['4 clases presenciales', 'Revisión de neceser', 'Certificado de participación'],
    pensum: [
      { semana: 1, titulo: 'Conoce tu piel', temas: ['Tipos de piel', 'Elección de base'] },
      { semana: 2, titulo: 'Piel natural', temas: ['Base y corrector', 'Rubor'] },
      { semana: 3, titulo: 'Cejas y ojos', temas: ['Cejas', 'Sombras neutras'] },
      { semana: 4, titulo: 'Rutina completa', temas: ['Labios', 'Día a noche'] }
    ],
    practicas: [{ titulo: 'Rutina completa', descripcion: 'Maquillaje de día con devolución personalizada.', requiereModelo: false }],
    requisitos: ['Tus productos de maquillaje'],
    certificado: { incluye: true, descripcion: 'Certificado de participación.' },
    precioUSD: 80,
    condicionesPago: null,
    estado: 'finalizado',
    galeria: [
      { src: null, alt: 'Alumnas maquillándose frente al espejo' },
      { src: null, alt: 'Revisión de neceser en clase' },
      { src: null, alt: 'Grupo de egresadas de Automaquillaje' }
    ],
    egresadas: 11
  }
];
