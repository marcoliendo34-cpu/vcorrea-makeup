// Cursos de ejemplo para la vista previa (modo demo).
// Las páginas NUNCA leen este archivo directamente: piden los datos a js/datos.js.
// Todo el contenido es de muestra y está marcado con [EJEMPLO]
// (fechas, precios, cifras, ubicación y textos). En la fase 2 estos datos
// vienen de Supabase con la misma forma.

/**
 * Foto con su texto alternativo. Si `src` es null se muestra el placeholder
 * crema con "Foto: {alt}".
 * @typedef {Object} Foto
 * @property {string|null} src  Ruta en /fotos (WebP) o null mientras falte la foto.
 * @property {string} alt       Descripción de la foto (alt y texto del placeholder).
 */

/**
 * Una semana del pensum.
 * @typedef {Object} SemanaPensum
 * @property {number} semana     Número de semana (1, 2, 3…).
 * @property {string} titulo     Tema central de la semana.
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
 * @property {string} subtitulo       Una línea que resume el curso.
 * @property {string} categoria       Ej. "Automaquillaje", "Maquillaje social", "Novias y eventos".
 * @property {'Básico'|'Intermedio'|'Avanzado'} nivel
 * @property {'Presencial'|'Online'} modalidad
 * @property {string} ubicacion       Ciudad o sede (presencial) o plataforma (online).
 * @property {Foto} imagenPortada
 * @property {string} fechaInicio     'AAAA-MM-DD'
 * @property {string} fechaFin        'AAAA-MM-DD'
 * @property {string} dias            Ej. "Sábados", "Martes y jueves".
 * @property {string} horario         Ej. "9:00 a. m. a 1:00 p. m."
 * @property {number} semanas
 * @property {number} totalClases
 * @property {number} cupos           Cupos totales.
 * @property {number} inscritas       Inscripciones confirmadas.
 * @property {string} descripcion
 * @property {string[]} dirigidoA
 * @property {string[]} incluye
 * @property {SemanaPensum[]} pensum
 * @property {Practica[]} practicas
 * @property {string[]} requisitos
 * @property {Certificado} certificado
 * @property {number} precioUSD       Solo se muestra en la ficha del curso, después de lo que incluye.
 * @property {string|null} condicionesPago  Texto opcional (ej. pago en dos partes).
 * @property {'vigente'|'finalizado'} estado
 * @property {Foto[]} galeria         Fotos opcionales del curso.
 * @property {number|null} egresadas  Cantidad de egresadas. Solo cursos finalizados; null en vigentes.
 */

/** @type {Curso[]} */
export const CURSOS = [
  /* ================================================================== */
  /* VIGENTES                                                           */
  /* ================================================================== */
  {
    slug: 'automaquillaje-esencial',
    nombre: 'Automaquillaje Esencial',
    subtitulo: 'Aprende a maquillarte para el día a día con tus propios productos',
    categoria: 'Automaquillaje',
    nivel: 'Básico',
    modalidad: 'Online',
    ubicacion: 'En vivo por videollamada [EJEMPLO]',
    imagenPortada: { src: null, alt: 'Alumna maquillándose frente al espejo' },
    fechaInicio: '2026-11-07',
    fechaFin: '2026-11-28',
    dias: 'Sábados',
    horario: '9:00 a. m. a 12:00 m.',
    semanas: 4,
    totalClases: 4,
    cupos: 12,
    inscritas: 6,
    descripcion: '[EJEMPLO] Un curso pensado para que pierdas el miedo a maquillarte. Partimos de cero: cómo preparar la piel, elegir el tono de base correcto y lograr un maquillaje natural y duradero en menos de 15 minutos, usando los productos que ya tienes en casa.',
    dirigidoA: [
      'Mujeres que quieren aprender a maquillarse desde cero',
      'Quienes ya se maquillan pero quieren resultados más prolijos',
      'Personas que buscan una rutina rápida para el trabajo o la universidad'
    ],
    incluye: [
      '4 clases en vivo de 3 horas',
      'Grabación de cada clase por 30 días',
      'Revisión de tu neceser y lista de compras personalizada',
      'Guía digital de rutinas paso a paso',
      'Grupo de consultas durante el curso',
      'Certificado de participación'
    ],
    pensum: [
      { semana: 1, titulo: 'Conoce tu piel', temas: ['Tipos de piel y cuidado previo', 'Hidratación y primer', 'Cómo elegir tu tono y subtono de base'] },
      { semana: 2, titulo: 'Piel uniforme y natural', temas: ['Base, corrector y polvo', 'Técnicas con brocha, esponja y dedos', 'Rubor y bronceador según tu rostro'] },
      { semana: 3, titulo: 'Cejas y ojos', temas: ['Diseño y relleno de cejas', 'Sombras neutras en tres pasos', 'Delineado sencillo y máscara de pestañas'] },
      { semana: 4, titulo: 'Tu rutina completa', temas: ['Labios: perfilado y elección de tonos', 'Maquillaje de día en 15 minutos', 'Transición de día a noche'] }
    ],
    practicas: [
      { titulo: 'Rutina de piel en vivo', descripcion: 'Aplicas tu base y corrector con correcciones de Verónica en tiempo real.', requiereModelo: false },
      { titulo: 'Maquillaje de día completo', descripcion: 'Práctica final: tu rutina completa, de principio a fin, con devolución personalizada.', requiereModelo: false }
    ],
    requisitos: [
      'Conexión a internet estable y cámara',
      'Espejo y buena iluminación (luz natural o aro de luz)',
      'Tus productos de maquillaje actuales'
    ],
    certificado: { incluye: true, descripcion: 'Certificado digital de participación al completar las 4 clases.' },
    precioUSD: 80,
    condicionesPago: null,
    estado: 'vigente',
    galeria: [],
    egresadas: null
  },

  {
    slug: 'masterclass-novias-y-eventos',
    nombre: 'Masterclass Novias y Eventos',
    subtitulo: 'Una semana intensiva para dominar el maquillaje nupcial de larga duración',
    categoria: 'Novias y eventos',
    nivel: 'Avanzado',
    modalidad: 'Presencial',
    ubicacion: 'Caracas [EJEMPLO]',
    imagenPortada: { src: null, alt: 'Maquillaje de novia con piel luminosa' },
    fechaInicio: '2026-11-23',
    fechaFin: '2026-11-27',
    dias: 'Lunes a viernes',
    horario: '2:00 p. m. a 7:00 p. m.',
    semanas: 1,
    totalClases: 5,
    cupos: 10,
    inscritas: 10,
    descripcion: '[EJEMPLO] Formación intensiva para maquilladoras que quieren especializarse en novias y eventos. Trabajamos pieles que resisten 12 horas, fotografía con flash, prueba de maquillaje con la clienta y cómo organizar la agenda del gran día.',
    dirigidoA: [
      'Maquilladoras con experiencia en maquillaje social',
      'Profesionales que quieren sumar novias a sus servicios',
      'Egresadas del curso de Maquillaje Social Profesional'
    ],
    incluye: [
      '5 clases presenciales de 5 horas',
      'Demostración completa de maquillaje de novia',
      'Kit de productos para usar en clase',
      'Plantilla de prueba de maquillaje y contrato para clientas',
      'Sesión de fotos de tu trabajo final',
      'Certificado de especialización'
    ],
    pensum: [
      { semana: 1, titulo: 'Semana intensiva', temas: ['Pieles de larga duración y a prueba de llanto', 'Maquillaje para fotografía con flash y video', 'Novia clásica, natural y glam', 'Pestañas postizas y peinado: cómo coordinar', 'Prueba de maquillaje, precios y agenda del día de la boda'] }
    ],
    practicas: [
      { titulo: 'Novia natural', descripcion: 'Maquillaje completo con revisión de la piel a las 4 horas.', requiereModelo: true },
      { titulo: 'Novia glam con fotografía', descripcion: 'Trabajo final fotografiado con flash para tu portafolio.', requiereModelo: true }
    ],
    requisitos: [
      'Haber hecho un curso de maquillaje social o tener experiencia comprobable',
      'Kit personal de brochas',
      'Traer una modelo los días de práctica (jueves y viernes)'
    ],
    certificado: { incluye: true, descripcion: 'Certificado de especialización en maquillaje de novias y eventos.' },
    precioUSD: 180,
    condicionesPago: 'Se reserva el cupo con el 50 % y el resto se paga el primer día. [EJEMPLO]',
    estado: 'vigente',
    galeria: [],
    egresadas: null
  },

  {
    slug: 'maquillaje-social-profesional',
    nombre: 'Maquillaje Social Profesional',
    subtitulo: 'Formación completa para empezar a maquillar a clientas',
    categoria: 'Maquillaje social',
    nivel: 'Intermedio',
    modalidad: 'Presencial',
    ubicacion: 'Caracas [EJEMPLO]',
    imagenPortada: { src: null, alt: 'Verónica maquillando a una modelo en clase' },
    fechaInicio: '2027-01-12',
    fechaFin: '2027-03-04',
    dias: 'Martes y jueves',
    horario: '6:00 p. m. a 9:00 p. m.',
    semanas: 8,
    totalClases: 16,
    cupos: 15,
    inscritas: 13,
    descripcion: '[EJEMPLO] La formación para quienes quieren maquillar a otras personas. Aprendes a leer cada rostro, corregir con color y luz, y crear maquillajes de día, de noche y para eventos con acabado profesional, además de cómo atender y cobrar a tus primeras clientas.',
    dirigidoA: [
      'Quienes quieren empezar a trabajar como maquilladoras',
      'Egresadas de Automaquillaje Esencial que quieren dar el siguiente paso',
      'Estilistas y profesionales de la belleza que quieren sumar maquillaje'
    ],
    incluye: [
      '16 clases presenciales de 3 horas',
      'Demostraciones en vivo en cada clase',
      'Productos profesionales para usar en clase',
      'Manual digital del curso',
      'Asesoría para armar tu primer kit profesional',
      'Fotos de tus trabajos para tu portafolio',
      'Certificado de formación'
    ],
    pensum: [
      { semana: 1, titulo: 'Bases del oficio', temas: ['Higiene y bioseguridad', 'Herramientas y productos profesionales', 'Preparación de la piel según su tipo'] },
      { semana: 2, titulo: 'Colorimetría', temas: ['Círculo cromático aplicado al maquillaje', 'Subtonos y elección de base', 'Corrección de ojeras, manchas y rojeces'] },
      { semana: 3, titulo: 'Visagismo', temas: ['Tipos de rostro', 'Contorno e iluminación', 'Diseño de cejas según el rostro'] },
      { semana: 4, titulo: 'Ojos I', temas: ['Morfología del ojo', 'Difuminado y transiciones', 'Delineados clásicos'] },
      { semana: 5, titulo: 'Ojos II', temas: ['Cut crease y smokey eye', 'Pestañas postizas en tira e individuales', 'Glitter y pigmentos'] },
      { semana: 6, titulo: 'Maquillaje de día y de noche', temas: ['Maquillaje natural para fotos', 'Maquillaje de noche', 'Labios de larga duración'] },
      { semana: 7, titulo: 'Eventos', temas: ['Graduaciones y quince años', 'Pieles maduras', 'Maquillaje en distintos tonos de piel'] },
      { semana: 8, titulo: 'Tu negocio', temas: ['Atención y prueba con la clienta', 'Precios y presupuestos', 'Fotografía de tus trabajos para redes'] }
    ],
    practicas: [
      { titulo: 'Corrección con colorimetría', descripcion: 'Práctica guiada de corrección y unificación de la piel.', requiereModelo: true },
      { titulo: 'Maquillaje de noche', descripcion: 'Smokey eye y labios de larga duración sobre modelo.', requiereModelo: true },
      { titulo: 'Examen final', descripcion: 'Maquillaje de evento completo evaluado por Verónica.', requiereModelo: true }
    ],
    requisitos: [
      'Ser mayor de 16 años',
      'Kit básico de brochas (se da una lista antes de empezar)',
      'Traer modelo en las clases de práctica'
    ],
    certificado: { incluye: true, descripcion: 'Certificado de formación en maquillaje social profesional.' },
    precioUSD: 250,
    condicionesPago: 'Puede pagarse en dos partes: 50 % para reservar y 50 % en la semana 4. [EJEMPLO]',
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
    inscritas: 12,
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
    galeria: [],
    egresadas: 12
  },

  {
    slug: 'ojos-de-impacto-2026',
    nombre: 'Ojos de Impacto',
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
    inscritas: 9,
    descripcion: '[EJEMPLO] Semana intensiva dedicada a la mirada: difuminados limpios, cut crease, smokey eye en distintos colores y colocación de pestañas para todo tipo de ojo.',
    dirigidoA: ['Maquilladoras con experiencia que quieren dominar los ojos'],
    incluye: ['5 clases presenciales', 'Pestañas para práctica', 'Certificado de participación'],
    pensum: [
      { semana: 1, titulo: 'Semana intensiva', temas: ['Morfología del ojo', 'Difuminados', 'Cut crease', 'Smokey eye', 'Pestañas postizas'] }
    ],
    practicas: [{ titulo: 'Smokey eye sobre modelo', descripcion: 'Trabajo final fotografiado.', requiereModelo: true }],
    requisitos: ['Experiencia previa en maquillaje', 'Kit personal de brochas'],
    certificado: { incluye: true, descripcion: 'Certificado de participación.' },
    precioUSD: 150,
    condicionesPago: null,
    estado: 'finalizado',
    galeria: [],
    egresadas: 9
  },

  {
    slug: 'automaquillaje-esencial-julio-2026',
    nombre: 'Automaquillaje Esencial',
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
    inscritas: 11,
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
    galeria: [],
    egresadas: 11
  }
];
