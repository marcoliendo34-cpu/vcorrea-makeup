# BRIEF — Web de Verónica Correa (Vcorrea Makeup)

Reglas permanentes del proyecto. Todo cambio de código debe respetar este documento. Si algo aquí entra en conflicto con un pedido nuevo, se pregunta antes de construir.

---

## 0. Contexto

- **Clienta:** Verónica Correa, maquilladora profesional en Venezuela. Marca: **Vcorrea Makeup**.
- **Qué es:** plataforma de cursos y formaciones de maquillaje. Las alumnas ven los cursos disponibles, se registran, ingresan y solicitan su inscripción por WhatsApp. Verónica concreta la inscripción por WhatsApp.
- **Lanzamiento (12 oct 2026):** sin franja de vista previa; los buscadores indexan las páginas públicas. Medición con Pixel de Meta y Vercel Web Analytics (`js/medicion.js`). Correos de cuenta con Resend (plantillas en `supabase/correos/`).
- **Fase 1 (terminada): VISTA PREVIA** para que la clienta aprobara la interfaz.
  - Sin base de datos real.
  - Cursos en `data/cursos.js`: Visión Lash es el primer curso real (11 oct 2026). Todavía no hay cursos finalizados cargados.
  - Galería (`data/galeria.js`): categorías Formaciones, Trabajos de alumnas y Trabajos propios. Las fotos con `destacada` van al inicio y las de `enAnteriores` a Cursos anteriores.
  - Sesión de alumna simulada.
- **Fase 2 (en curso desde el 11 oct 2026, vista previa aprobada):** Supabase.
  - Proyecto **VCORREA MAKEUP** (`sgcxjurhxycnhmsiqeid`, us-east-1, plan gratuito): https://sgcxjurhxycnhmsiqeid.supabase.co
  - Migraciones en `supabase/migraciones/` (mismo nombre y versión que en la base). Pruebas de reglas en `supabase/pruebas/`.
  - Tablas: `perfiles`, `cursos`, `inscripciones`, `galeria`. Buckets públicos `cursos` y `galeria`.
  - **La web publicada usa Supabase** (desde el 11 oct 2026): sesión con Supabase Auth y datos de las tablas. URL y llave publicable en `js/config.js`; la llave secreta nunca va en el código.
  - Cursos y galería se editan **desde el panel** (`/admin`, solo superadmin), que escribe en la base. `data/cursos.js` y `data/galeria.js` quedan solo para las capturas y para `generar_cursos.py` (páginas por curso con Open Graph propio). Un curso creado en el panel funciona sin página generada (reescritura `/cursos/:slug`), con la imagen para compartir de la marca.
- **Referencia de estructura:** hipereventos.com (capturas en `/referencias`).
  - **Sí tomamos:** hero con imagen grande, buscador, tarjetas de "Próximos cursos" con fecha, datos clave, barra de inscripción en % y botón "Inscribirme".
  - **No tomamos:** sus colores oscuros ni su tipografía gruesa. Nuestra estética es **clara, minimalista y elegante**.

---

## 1. Stack

- Sitio estático: **HTML, CSS y JavaScript moderno (módulos ES)**.
- **Sin compilación, sin npm y sin frameworks.** En la sesión de trabajo no se pueden instalar paquetes, y así cada página se revisa aquí antes de publicar.
- Fuentes desde Google Fonts con `preconnect` y `display=swap`, cargadas sin bloquear el primer pintado (bloque `<!-- fuentes -->` que escribe `herramientas/generar_paginas.py`).
- Íconos SVG propios en `js/iconos.js` (estilo lineal, trazo 1.5). Sin librerías externas de íconos.
- Idioma de la interfaz: **español de Venezuela**.
- Moneda: **USD**.
- Formato de fechas: **"15 nov 2026"** (día, mes abreviado en minúscula, año). Toda fecha pasa por `js/fechas.js`.

### Estructura de archivos

```
/
├── index.html
├── cursos.html
├── curso.html
├── sobre-veronica.html
├── galeria.html
├── cursos-anteriores.html
├── contacto.html
├── registro.html
├── ingresar.html
├── mi-cuenta.html
├── admin.html
├── privacidad.html
├── 404.html
├── css/
│   └── estilos.css          tokens y componentes
├── js/
│   ├── config.js            contacto, redes, WhatsApp, métodos de pago, URL y llave pública de Supabase
│   ├── modo.js              decide demo (solo localhost) o Supabase (siempre en la web publicada)
│   ├── supabase.js          cliente supabase-js v2 (módulo ES desde jsDelivr)
│   ├── componentes.js       header, footer y botón flotante de WhatsApp
│   ├── iconos.js            íconos SVG propios
│   ├── datos.js             acceso a datos centralizado; usa datos-supabase.js o demo/datos-demo.js
│   ├── datos-supabase.js    consultas a las tablas de Supabase
│   ├── cupos.js             cálculo de % y etiquetas de cupos
│   ├── fechas.js            formato de fechas
│   ├── sesion.js            sesión: misma API para las páginas; usa sesion-supabase.js o demo/sesion-demo.js
│   ├── sesion-base.js       piezas comunes (claves, errores, evento)
│   ├── sesion-supabase.js   Supabase Auth + tabla perfiles
│   ├── demo/                sesión y datos de ejemplo (SOLO capturas en localhost)
│   ├── inscripcion.js       flujo "Inscribirme" → WhatsApp
│   ├── medicion.js          Pixel de Meta y Vercel Web Analytics (solo en la web publicada)
│   ├── nueva-contrasena.js  crear contraseña nueva desde el enlace del correo
│   ├── detalle-curso.js     secciones de la ficha del curso reutilizables (ficha y cursos anteriores)
│   ├── visor.js             visor de fotos a pantalla completa (galería y cursos anteriores)
│   ├── formularios.js       validación en vivo y ayudas de formularios (registro, ingreso)
│   ├── admin.js             panel de administración (rutas con #)
│   ├── admin-editor.js      herramientas del superadmin: cursos, fotos y galería (solo se descarga para ese rol)
│   ├── imagenes.js          compresión de fotos en el navegador antes de subirlas (WebP 1200 y 600 px)
│   ├── textos.js            estados de inscripción y normalizar(), sin dependencias
│   └── <un archivo por página>   ej. inicio.js, cursos.js, curso.js…
├── data/
│   ├── cursos.js
│   └── galeria.js
├── supabase/
│   ├── migraciones/         SQL de cada migración (NO se publica)
│   ├── correos/             plantillas HTML de los correos de Supabase Auth (se pegan en el panel de Supabase)
│   └── pruebas/             pruebas de RLS por rol y su limpieza
├── cursos/                  una página por curso, generada (NO editar a mano)
├── fotos/                   imágenes en WebP (galería: /fotos/galeria/{archivo}-600 y -1200)
├── referencias/             capturas de Hipereventos (NO se publican)
├── herramientas/            scripts que solo corren en el espacio de trabajo:
│                            capturas.py, auditoria.py (auditoría completa),
│                            generar_paginas.py (cabeceras, SEO, sitemap, imagen
│                            para compartir), generar_cursos.py, fuentes_locales.py
│                            y fuentes/ (copias OFL de las fuentes, solo para capturas)
│                            (NO se publican)
├── vercel.json
├── .vercelignore
└── BRIEF.md                 (NO se publica)
```

### Reglas de arquitectura

- **Header, footer y botón de WhatsApp** se dibujan desde `js/componentes.js`, para que sean idénticos en todas las páginas. Ninguna página los escribe a mano.
- **Acceso a datos centralizado en `js/datos.js`.** Las páginas nunca leen `data/*.js` directamente; siempre piden a `datos.js`. En la fase 2 se cambia la fuente a Supabase sin tocar las páginas.
- **Modo demo solo para capturas:** `js/modo.js` lo activa únicamente en localhost/127.0.0.1 (servidor del espacio de trabajo). En cualquier dominio publicado la web usa Supabase siempre; los módulos de la demo ni se descargan. En local, `?supabase=1` prueba el código de Supabase y `?demo=1` vuelve a la demo.
- **Pruebas de punta a punta:** `python3 herramientas/prueba_flujos.py demo|supabase` (registro, cédula y correo repetidos, ingreso, Mi cuenta, inscripción, panel y redirecciones). En modo supabase usa un cliente falso (`herramientas/supabase_falso.js`) porque el espacio de trabajo no tiene red.
- **Prueba del panel por rol:** `python3 herramientas/prueba_panel.py [--capturas]` (admin sin botones de edición; superadmin crea, edita, sube fotos, publica, duplica, archiva, finaliza y gestiona la galería). Cuenta de superadmin del cliente falso: super@demo.com / demo1234.
- **Sesión:** `js/sesion.js` da a las páginas `registrar(datos)`, `ingresar(correo, contrasena)`, `salir()`, `usuarioActual()`, `usuarioEnCache()`, `existeCedula()`, `existeCorreo()` y el evento `cambio-de-sesion`. En la web publicada es Supabase Auth; el perfil se copia en el navegador solo para pintar el header al instante.
  - Registro: antes de crear la cuenta se consulta `cedula_registrada()` y `correo_registrado()` para dar los mismos avisos amables de la vista previa.
  - Cuentas de la demo (solo capturas en localhost, contraseña demo1234): alumna@demo.com y admin@demo.com.
- **Roles:** `alumna` (por defecto), `admin` (Verónica) y `superadmin` (Marco, desarrollador: cursos, galería y fotos). Las cuentas nuevas siempre son de alumna. **Los roles solo se cambian desde la base de datos**, nunca desde la web. En la demo el rol vive en el navegador; en Supabase lo hacen cumplir las reglas RLS.
- **Datos de ejemplo de la demo** (8 alumnas e inscripciones ficticias) en `js/demo/sesion-demo.js`. Se recargan al subir `VERSION_SEMILLA`. El aviso "Restablecer datos de ejemplo" del panel solo aparece en la demo.
- **Datos de contacto, redes y métodos de pago** solo en `js/config.js`. Ningún número, usuario de red o dato de pago escrito en otro archivo.
- **Franja "Vista previa · Los cursos y datos son de ejemplo"**: apagada desde el lanzamiento (`MODO_VISTA_PREVIA = false` en `js/config.js`). Si se vuelve a encender:
  - Después de cambiarlo se corre `herramientas/generar_paginas.py`, que la escribe en el HTML para que no haya salto al cargar.
  - Si se olvida, `componentes.js` la pone o la quita al abrir la página.
  - Su alto (`--alto-franja`) entra en `--tope`, la variable que despeja el contenido de lo fijo de arriba.
- **Buscadores (desde el lanzamiento):** las páginas públicas se indexan. Llevan `noindex, nofollow` (meta robots, lo escribe `generar_paginas.py` según `PRIVADAS`) solo `/admin`, `/mi-cuenta`, `/ingresar`, `/registro`, `/nueva-contrasena`, la 404 y la guía de estilo. `vercel.json` manda además `X-Robots-Tag` en esas rutas. `robots.txt` deja pasar todo (si bloqueara las privadas, los buscadores no leerían su noindex).
- **Medición (`js/medicion.js`, configurada en `CONFIG.medicion`):** nunca en localhost ni en `/admin`.
  - Pixel de Meta (`metaPixelId`): `PageView` en cada página, `Contact` al tocar "Inscribirme" y `CompleteRegistration` al terminar el registro. Sin datos personales.
  - Vercel Web Analytics (`vercelAnalytics: true`): script `/_vercel/insights/script.js`; se activa en el panel de Vercel.
- **Correos de cuenta (Supabase Auth + Resend por SMTP):** confirmación de cuenta (el enlace lleva a `/ingresar?confirmada=1`, que entra directo) y "¿Olvidaste tu contraseña?" (enlace a `/nueva-contrasena`). Si el enlace vence, se ofrece otro. Plantillas en `supabase/correos/`.
- **Prueba de lanzamiento:** `python3 herramientas/prueba_lanzamiento.py [--capturas]` simula la web publicada (dominio que no es localhost): sin franja, noindex correcto, Pixel, Analytics, confirmación de correo y cambio de contraseña.

### Vercel

- `vercel.json`:
  - URLs limpias (`/cursos` en lugar de `/cursos.html`).
  - Reescritura `/cursos/:slug` → `curso.html`.
  - Encabezado `X-Robots-Tag: noindex` solo en las páginas privadas.
  - `404.html` como página de error.
- `.vercelignore`: excluye `BRIEF.md`, `/referencias`, `/herramientas`, `/supabase` y la guía de estilo.
- `robots.txt`: deja pasar a todos e indica el sitemap.
- **Cabeceras de las páginas:** `herramientas/generar_paginas.py` es el único lugar donde se editan títulos y descripciones. El script:
  - Escribe el bloque Open Graph y canonical de cada página.
  - Escribe el bloque de fuentes y el de precarga de módulos (`modulepreload` de todo lo que importa cada página).
  - Genera `sitemap.xml`.
  - Con `--og-imagen`, rehace `fotos/og/vcorrea-og.jpg` (1200×630, logotipo sobre crema).
  - Llama a `generar_cursos.py`.
  - Se ejecuta cada vez que cambian cursos, títulos, imports o `curso.html`.
- **Páginas por curso:** `herramientas/generar_cursos.py` crea `cursos/[slug].html` con título, descripción e imagen Open Graph propios. Los cursos finalizados se muestran en modo lectura (sin precio ni inscripción).
- **Auditoría:** `python3 herramientas/auditoria.py` revisa diseño, consistencia, accesibilidad, rendimiento, SEO, enlaces y movimiento antes de cada entrega grande. El informe queda en `herramientas/capturas/auditoria/`.
- **Rendimiento:** solo las páginas que muestran cursos cargan `datos.js`. El buscador del header lo pide al abrirse.

---

## 2. Identidad visual

### Paleta (variables CSS en `:root`)

| Variable | Valor | Uso |
|---|---|---|
| `--blanco` | `#FFFFFF` | Fondo principal |
| `--crema` | `#F5EFE6` | Secciones alternas y tarjetas |
| `--beige` | `#E8DCC8` | Bordes finos y fondo de barras |
| `--dorado` | `#B8975A` | Líneas, barras de progreso y detalles decorativos. **Nunca para texto pequeño.** |
| `--dorado-profundo` | `#7A5C30` | Botón principal, enlaces y textos destacados |
| `--tinta` | `#2B2622` | Títulos y texto principal |
| `--gris-calido` | `#6B625A` | Texto secundario |

Ningún color fuera de esta paleta sin aprobación. Nada de fondos oscuros.

### Tipografía

- **Cormorant Garamond (300 a 600):** nombre de marca y títulos.
- **Jost (300 a 500):** textos, botones y etiquetas.
- **Etiquetas pequeñas** en MAYÚSCULAS con `letter-spacing: 0.2em`. Ejemplo: "PRÓXIMOS CURSOS".

### Logotipo (tipográfico, no hay logo gráfico)

- "Verónica Correa" en Cormorant Garamond Light.
- Debajo, "MAKEUP" en Jost, tamaño pequeño, `letter-spacing: 0.35em`.
- **Favicon:** monograma "VC".

### Estilo

- Mucho espacio en blanco.
- Bordes de 1px en `--beige`.
- Esquinas suaves: **16px en tarjetas, 10px en botones**.
- Sombras casi imperceptibles.
- Animaciones sutiles de **200 a 300 ms**, siempre respetando `prefers-reduced-motion`.
- Contraste mínimo **WCAG AA**.

---

## 3. Mobile first

- Se diseña primero a **375px** de ancho.
- Puntos de quiebre: **640, 768, 1024 y 1280px** (`min-width`).
- Áreas táctiles de **mínimo 44px**.
- **Nunca scroll horizontal**, en ningún ancho.

---

## 4. Mapa del sitio (URLs públicas)

| URL | Archivo | Contenido |
|---|---|---|
| `/` | index.html | Inicio: hero con imagen grande, buscador, "Próximos cursos" |
| `/cursos` | cursos.html | Listado de cursos con buscador |
| `/cursos/[slug]` | curso.html | Ficha del curso |
| `/sobre-veronica` | sobre-veronica.html | Perfil de Verónica |
| `/galeria` | galeria.html | Galería: formaciones, trabajos de alumnas y trabajos propios |
| `/cursos-anteriores` | cursos-anteriores.html | Cursos ya realizados |
| `/contacto` | contacto.html | Contacto, WhatsApp y redes |
| `/registro` | registro.html | Crear cuenta de alumna |
| `/ingresar` | ingresar.html | Iniciar sesión |
| `/mi-cuenta` | mi-cuenta.html | Datos de la alumna y sus inscripciones |
| `/nueva-contrasena` | nueva-contrasena.html | Crear contraseña nueva desde el enlace del correo |
| `/admin` | admin.html | Panel de la administradora (solo rol admin; noindex, sin header público ni botón flotante) |
| `/privacidad` | privacidad.html | Política de privacidad (12 oct 2026; menciona Supabase, Vercel, Resend, Pixel de Meta y Vercel Analytics) |
| (cualquier otra) | 404.html | Página no encontrada |

---

## 5. Reglas del negocio

### Cupos

- **Porcentaje** = inscritas / cupos totales × 100, **redondeado a entero**.
- Textos: **"Inscripciones · 87%"** y **"Quedan 2 cupos"** (en singular: "Queda 1 cupo").
- Etiqueta **"Últimos cupos"** desde 80% hasta 99%.
- **"Agotado"** al 100%: botón desactivado con el texto **"Cupos agotados"**.
- Todo este cálculo vive en `js/cupos.js`.
- **Inscritas de un curso** = solo las inscripciones **confirmadas** (decidido el 11 oct 2026). Las pendientes no ocupan cupo. Quien se inscriba por fuera de la web se carga como inscripción confirmada. `inscritasFuera` desaparece al conectar Supabase.
- En Supabase, la función pública `cupos_de_cursos()` da por curso solo el número de confirmadas, y la base **no deja confirmar** si el curso está lleno.

### Ficha del curso (campos opcionales)

- `calendario`: fecha de cada clase; se muestra como "Calendario".
- `pensum` sin número de semana: se muestra por módulos con el título "Qué aprenderás".
- `destacados`: lista extra en "Sobre el curso" (ej. "Porque tu éxito es nuestra meta") con una frase de remate.
- `preguntas`: preguntas frecuentes propias del curso. Si no tiene, la sección no aparece.
- `imagenPortada` con `ancho` y `alto`: la tarjeta y la ficha toman la proporción de la foto (un flyer 4:5 se ve completo, sin recortes). `flyer: true` quita la insignia de fecha de la tarjeta (el flyer ya la trae). `og`: JPEG para la vista previa al compartir. Flyers en `/fotos/cursos/` (600 y 1080 px).
- Datos que aún no da Verónica van con **[POR DEFINIR]** (en la tarjeta se ocultan las marcas).

### Precio

- Se muestra en **USD SOLO en la ficha del curso**, casi al final, **después de todo lo que incluye**.
- **Nunca** en las tarjetas ni en barras fijas.

### Inscripción

- El botón **"Inscribirme"** exige sesión.
- **Sin sesión:** lleva a `/registro` y, al terminar, regresa al curso.
- **Con sesión:** primero revisa los cupos en ese momento; luego guarda la inscripción como **"Pendiente de confirmación"** en la base (sin duplicar) y recién entonces abre WhatsApp (`wa.me`) con el mensaje prellenado.
- **Curso lleno al tocar "Inscribirme":** ventana **"Este curso acaba de agotarse"** con **"Avísame del próximo"**. La base tampoco acepta solicitudes nuevas (ni reabrir una cancelada) en un curso lleno.
- Verónica concreta la inscripción por WhatsApp.
- **Estados de una inscripción:**
  - Pendiente de confirmación.
  - Confirmada.
  - Cancelada: la cancela la administradora. Si la alumna vuelve a pedir el curso, la inscripción pasa otra vez a pendiente.
  - Finalizada: en Supabase es un estado guardado (`finalizada`), lo marca la administradora.

### Panel de administradora (`/admin`)

- **Acceso:** sin sesión lleva a `/ingresar?volver=/admin`; una cuenta sin rol admin ni superadmin va al inicio.
- **Secciones (admin y superadmin):**
  - **Resumen:** cursos vigentes, inscritas confirmadas, pendientes por confirmar, cupos libres y la lista "Pendientes por confirmar".
  - **Cursos:** la lista de cursos. Cada curso abre sus inscritas, con filtro por estado, buscador por nombre o cédula y "Exportar lista".
  - **Alumnas:** listado general con buscador.
- **Acciones sobre una inscripción:**
  - "WhatsApp" abre el chat con la alumna.
  - "Confirmar" está bloqueado si el curso no tiene cupos.
  - "Cancelar" pide confirmación.
  - Confirmar o cancelar cambia el % en todo el sitio.
- **CSV:** UTF-8 con BOM, separado por `;` y con fechas dd/mm/aaaa, para Excel en español. Lleva solo las inscritas de la web.
- **Los botones de edición NO se muestran a Verónica (admin).** Su panel no tiene "Crear curso", "Editar", publicar, archivar ni Galería, y su navegador ni descarga `js/admin-editor.js`.
- **Superadmin (Marco), además** (`js/admin-editor.js`, decidido el 12 oct 2026):
  - **Crear y editar cursos** (`#curso-nuevo`, `#editar/[slug]`) con formulario completo: datos generales, dirección (slug, se arma sola desde el nombre), portada, fechas, horario, calendario, cupos, precio y condiciones, "Qué incluye", pensum (agregar, quitar y reordenar; por semanas o por módulos), prácticas, requisitos, certificado y preguntas frecuentes. Los cupos no pueden quedar por debajo de las confirmadas.
  - Un curso nuevo se guarda como **borrador** (sin publicar). **Vista previa** guarda y abre la ficha en otra pestaña con el aviso "Este curso todavía no está publicado". **Publicar / Despublicar** desde el curso o "Guardar y publicar" en el formulario.
  - **Duplicar** crea una copia en borrador (`[slug]-copia`). **Archivar** despublica y lo pasa a "Archivados" (columna `archivado`; los cursos no se borran porque tienen inscripciones).
  - **Finalizar** (`#finalizar/[slug]`): número de egresadas y fotos del curso. Pasa a `finalizado`, se publica y aparece en Cursos anteriores. "Volver a vigente" lo deshace.
  - **Galería** (`#galeria`): subir (con categoría), cambiar descripción y categoría, marcar "Avance del inicio" y "Cursos anteriores", ordenar y eliminar (también borra sus archivos del bucket).
  - **Fotos:** se comprimen en el navegador (`js/imagenes.js`) a WebP de 1200 y 600 px (JPEG si el navegador no sabe WebP) antes de subirlas a los buckets `cursos` (portadas y fotos de cursos) y `galeria`.
  - Con cambios sin guardar, el panel pregunta antes de salir del formulario.
- **Diseño:** misma identidad, más compacta. En móvil tiene barra superior y pestañas abajo; desde 1024px, menú lateral. Las listas se ven como tabla desde 1280px.

### Registro

- **Obligatorios:** nombre, apellido, cédula (V o E + número), teléfono venezolano, correo y contraseña.
- **Opcionales:** Instagram y fecha de nacimiento.
- **Una cuenta por cédula y una por correo.**
- **Confirmación por correo:** con "Confirm email" activo en Supabase, al crear la cuenta se ve "Revisa tu correo" (con "Reenviar el correo"). Ingresar con un correo sin confirmar también ofrece reenviarlo.
- **Contraseña olvidada:** en `/ingresar`, "¿Olvidaste tu contraseña?" manda el enlace (mismo mensaje exista o no la cuenta).

### Pagos y contacto

- **Métodos de pago:** Pago móvil, divisas en efectivo (USD) y USDT (Binance), en `js/config.js`.
- **WhatsApp de Verónica:** 0414-589-77-75 (enlace wa.me/584145897775), en `js/config.js`.
- **Redes de Verónica:** Instagram @vcorrea_makeup y TikTok @vcorrea_makeup, en `js/config.js`.

---

## 6. Reglas de trabajo

### Paso por paso

Al terminar cada paso:

1. Abrir las páginas tocadas en el navegador sin interfaz (Chromium de Playwright) y revisar **errores de consola** y **scroll horizontal a 375px**.
2. Enviar **capturas a 375px y a 1280px** de lo que cambió.
3. Hacer **commit** con un mensaje claro en español y subirlo a **GitHub**. Vercel publica solo.
4. Confirmar con el **conector de Vercel** que la publicación quedó lista y dar el enlace.
5. Dar un **resumen corto**: qué se hizo y qué debe revisar Marco.

- En las capturas **no cargan las fuentes de Google**: avisar si algo depende de la tipografía real.

### Imágenes

- Cuando Marco adjunte fotos: convertirlas a **WebP**.
  - Hero: máximo **1600px** de ancho.
  - Resto: máximo **1200px**.
  - Miniaturas: **600px**.
- Nombres en minúsculas, sin espacios ni acentos. Se guardan en `/fotos`.
- Si falta una foto: **placeholder elegante** (bloque crema con el texto "Foto: [descripción]" centrado).
- **Nunca** usar imágenes de terceros.

### Accesibilidad

- `alt` en todas las imágenes.
- `label` en todos los campos de formulario.
- Foco visible en `--dorado-profundo`.
- Todo navegable con teclado.

### Contenido

- **No inventar datos de Verónica:** años de experiencia, premios, testimonios, cifras.
- Usar textos de muestra marcados con **[EJEMPLO]** para encontrarlos fácil después.

### Continuidad

- Si la conversación se reinicia, todo se recupera desde **GitHub** y desde la copia de este brief en el Proyecto (**vcorrea-brief.md**).
