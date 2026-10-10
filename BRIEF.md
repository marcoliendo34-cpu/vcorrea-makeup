# BRIEF — Web de Verónica Correa (Vcorrea Makeup)

Reglas permanentes del proyecto. Todo cambio de código debe respetar este documento. Si algo aquí entra en conflicto con un pedido nuevo, se pregunta antes de construir.

---

## 0. Contexto

- **Clienta:** Verónica Correa, maquilladora profesional en Venezuela. Marca: **Vcorrea Makeup**.
- **Qué es:** plataforma de cursos y formaciones de maquillaje. Las alumnas ven los cursos disponibles, se registran, ingresan y solicitan su inscripción por WhatsApp. Verónica concreta la inscripción por WhatsApp.
- **Fase 1 (actual): VISTA PREVIA** para que la clienta apruebe la interfaz.
  - Sin base de datos real.
  - 3 cursos de ejemplo.
  - Sesión de alumna simulada.
- **Fase 2 (después de la aprobación):** conectar Supabase y cargar los cursos reales.
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
│   ├── config.js            contacto, redes, WhatsApp, métodos de pago
│   ├── componentes.js       header, footer y botón flotante de WhatsApp
│   ├── iconos.js            íconos SVG propios
│   ├── datos.js             acceso a datos centralizado (demo / Supabase)
│   ├── cupos.js             cálculo de % y etiquetas de cupos
│   ├── fechas.js            formato de fechas
│   ├── sesion.js            sesión simulada con localStorage
│   ├── inscripcion.js       flujo "Inscribirme" → WhatsApp
│   ├── detalle-curso.js     secciones de la ficha del curso reutilizables (ficha y cursos anteriores)
│   ├── visor.js             visor de fotos a pantalla completa (galería y cursos anteriores)
│   ├── formularios.js       validación en vivo y ayudas de formularios (registro, ingreso)
│   ├── admin.js             panel de la administradora (rutas con #)
│   ├── textos.js            estados de inscripción y normalizar(), sin dependencias
│   └── <un archivo por página>   ej. inicio.js, cursos.js, curso.js…
├── data/
│   ├── cursos.js
│   └── galeria.js
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
- **Modo demo permanente:** aunque exista Supabase, siempre debe haber un modo demo con datos locales para poder hacer capturas en el espacio de trabajo.
- **Sesión de alumna simulada** con `localStorage` en `js/sesion.js`, con la misma forma que tendrá Supabase: `registrar(datos)`, `ingresar(correo, contrasena)`, `salir()`, `usuarioActual()` y el evento `cambio-de-sesion`. En la demo no se guardan contraseñas. Cuentas demo (contraseña demo1234):
  - alumna@demo.com, rol `alumna`.
  - admin@demo.com, rol `admin`.
- **Roles:** `alumna` (por defecto) y `admin` (Verónica). Las cuentas nuevas siempre son de alumna. En la demo el rol vive en el navegador, así que el panel es solo una maqueta. En la fase 2, Supabase hace cumplir el rol con RLS.
- **Datos de ejemplo** (8 alumnas e inscripciones ficticias) en `js/sesion.js`. Se recargan al subir `VERSION_SEMILLA`, y el panel tiene el botón "Restablecer datos de ejemplo".
- **Datos de contacto, redes y métodos de pago** solo en `js/config.js`. Ningún número, usuario de red o dato de pago escrito en otro archivo.
- **Franja "Vista previa · Los cursos y datos son de ejemplo"** arriba de todo el sitio, incluido el panel. Se controla con `MODO_VISTA_PREVIA` en `js/config.js`:
  - Después de cambiarlo se corre `herramientas/generar_paginas.py`, que la escribe en el HTML para que no haya salto al cargar.
  - Si se olvida, `componentes.js` la pone o la quita al abrir la página.
  - Su alto (`--alto-franja`) entra en `--tope`, la variable que despeja el contenido de lo fijo de arriba.
- **Bloqueo a buscadores** durante la vista previa, aparte de la franja: meta robots `noindex, nofollow` en cada página, `X-Robots-Tag` en `vercel.json` y `robots.txt`. Para lanzar hay que quitar los tres.

### Vercel

- `vercel.json`:
  - URLs limpias (`/cursos` en lugar de `/cursos.html`).
  - Reescritura `/cursos/:slug` → `curso.html`.
  - Encabezado `X-Robots-Tag: noindex` mientras dure la vista previa.
  - `404.html` como página de error.
- `.vercelignore`: excluye `BRIEF.md`, `/referencias` y `/herramientas`.
- `robots.txt`: bloquea a los buscadores durante la vista previa, pero deja pasar a los lectores de enlaces (WhatsApp, Meta, etc.) para que las vistas previas al compartir funcionen.
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
| `/galeria` | galeria.html | Galería de trabajos |
| `/cursos-anteriores` | cursos-anteriores.html | Cursos ya realizados |
| `/contacto` | contacto.html | Contacto, WhatsApp y redes |
| `/registro` | registro.html | Crear cuenta de alumna |
| `/ingresar` | ingresar.html | Iniciar sesión |
| `/mi-cuenta` | mi-cuenta.html | Datos de la alumna y sus inscripciones |
| `/admin` | admin.html | Panel de la administradora (solo rol admin; noindex, sin header público ni botón flotante) |
| `/privacidad` | privacidad.html | Texto provisional |
| (cualquier otra) | 404.html | Página no encontrada |

---

## 5. Reglas del negocio

### Cupos

- **Porcentaje** = inscritas / cupos totales × 100, **redondeado a entero**.
- Textos: **"Inscripciones · 87%"** y **"Quedan 2 cupos"** (en singular: "Queda 1 cupo").
- Etiqueta **"Últimos cupos"** desde 80% hasta 99%.
- **"Agotado"** al 100%: botón desactivado con el texto **"Cupos agotados"**.
- Todo este cálculo vive en `js/cupos.js`.
- **Inscritas de un curso** = `inscritasFuera` (cupos ocupados por fuera de la web, dato del curso) + inscripciones **confirmadas** en la web. Lo calcula `js/datos.js`. Las pendientes no ocupan cupo.

### Precio

- Se muestra en **USD SOLO en la ficha del curso**, casi al final, **después de todo lo que incluye**.
- **Nunca** en las tarjetas ni en barras fijas.

### Inscripción

- El botón **"Inscribirme"** exige sesión.
- **Sin sesión:** lleva a `/registro` y, al terminar, regresa al curso.
- **Con sesión:** registra la inscripción como **"Pendiente de confirmación"** y abre WhatsApp (`wa.me`) con un mensaje prellenado.
- Verónica concreta la inscripción por WhatsApp.
- **Estados de una inscripción:**
  - Pendiente de confirmación.
  - Confirmada.
  - Cancelada: la cancela la administradora. Si la alumna vuelve a pedir el curso, la inscripción pasa otra vez a pendiente.
  - Finalizado: no se guarda; se muestra cuando el curso ya terminó.

### Panel de administradora (`/admin`)

- **Acceso:** sin sesión lleva a `/ingresar?volver=/admin`; una cuenta sin rol admin va al inicio.
- **Secciones:**
  - **Resumen:** cursos vigentes, inscritas confirmadas, pendientes por confirmar, cupos libres y la lista "Pendientes por confirmar".
  - **Cursos:** la lista de cursos. Cada curso abre sus inscritas, con filtro por estado, buscador por nombre o cédula y "Exportar lista".
  - **Alumnas:** listado general con buscador.
- **Acciones sobre una inscripción:**
  - "WhatsApp" abre el chat con la alumna.
  - "Confirmar" está bloqueado si el curso no tiene cupos.
  - "Cancelar" pide confirmación.
  - Confirmar o cancelar cambia el % en todo el sitio.
- **CSV:** UTF-8 con BOM, separado por `;` y con fechas dd/mm/aaaa, para Excel en español. Lleva solo las inscritas de la web.
- **Crear y editar cursos** lo hace el desarrollador. En el panel, esos botones solo muestran "La carga de cursos la gestiona tu desarrollador".
- **Diseño:** misma identidad, más compacta. En móvil tiene barra superior y pestañas abajo; desde 1024px, menú lateral. Las listas se ven como tabla desde 1280px.

### Registro

- **Obligatorios:** nombre, apellido, cédula (V o E + número), teléfono venezolano, correo y contraseña.
- **Opcionales:** Instagram y fecha de nacimiento.
- **Una cuenta por cédula y una por correo.**

### Pagos y contacto

- **Métodos de pago:** por definir. Se muestran desde `js/config.js` con el texto **[POR DEFINIR]**.
- **WhatsApp de Verónica:** +58 414-5897775, en `js/config.js`.

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
