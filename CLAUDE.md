# CLAUDE.md — Vcorrea Makeup

Reglas permanentes del proyecto. Léelas completas antes de tocar código.

## Contexto

Web de **Verónica Correa (Vcorrea Makeup)**, maquilladora profesional en Venezuela. Plataforma de cursos y formaciones de maquillaje: las alumnas ven los cursos, se registran, ingresan y solicitan su inscripción por WhatsApp.

**Fase 1 (actual): VISTA PREVIA** para que la clienta apruebe la interfaz. Sin base de datos real, 3 cursos de ejemplo, sesión simulada.
**Fase 2 (después de la aprobación):** conectar Supabase y cargar los cursos reales.

Referencia de estructura: hipereventos.com (capturas en `/referencias`). Se toma: hero con imagen grande, buscador y tarjetas de "Próximos cursos" con fecha, datos clave, barra de inscripción en % y botón "Inscribirme". **No** se toman sus colores oscuros ni su tipografía gruesa: la estética es clara, minimalista y elegante.

## 1. Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, última versión estable.
- Sin base de datos en esta fase. Datos de ejemplo en `/src/data`.
- Sesión de alumna simulada con `localStorage`, en `/src/lib/sesion.ts`.
- Acceso a datos centralizado en `/src/lib/datos.ts`. Las páginas **nunca** importan `/src/data` directamente: así la fuente cambia a Supabase en la fase 2 sin tocar las páginas.
- Datos de contacto, redes y métodos de pago en `/src/config/sitio.ts`.
- Idioma de la interfaz: español de Venezuela. Moneda: USD. Fechas en formato "15 nov 2026".

## 2. Identidad visual

Paleta (tokens de Tailwind **y** variables CSS):

| Token | Hex | Uso |
|---|---|---|
| blanco | `#FFFFFF` | fondo principal |
| crema | `#F5EFE6` | secciones alternas y tarjetas |
| beige | `#E8DCC8` | bordes finos y fondo de barras |
| dorado | `#B8975A` | líneas, barras de progreso, detalles decorativos. **Nunca para texto pequeño** |
| dorado-profundo | `#7A5C30` | botón principal, enlaces y textos destacados |
| tinta | `#2B2622` | títulos y texto principal |
| gris-calido | `#6B625A` | texto secundario |

Tipografía (Google Fonts con `next/font`):
- **Cormorant Garamond** (300–600): nombre de marca y títulos.
- **Jost** (300–500): textos, botones y etiquetas.
- Etiquetas pequeñas en MAYÚSCULAS con tracking `0.2em` (ej. "PRÓXIMOS CURSOS").

Logotipo tipográfico (no hay logo): "Verónica Correa" en Cormorant Garamond Light y debajo "MAKEUP" en Jost, tamaño pequeño, tracking `0.35em`. Monograma "VC" para el favicon.

Estilo: mucho espacio en blanco, bordes de 1px en beige, esquinas suaves (16px en tarjetas, 10px en botones), sombras casi imperceptibles, animaciones sutiles de 200–300 ms que respeten `prefers-reduced-motion`. Contraste mínimo WCAG AA.

## 3. Mobile first

Diseñar primero a **375px**. Puntos de quiebre: 640, 768, 1024 y 1280px. Áreas táctiles de mínimo 44px. Nunca scroll horizontal.

## 4. Mapa del sitio

```
/                     Inicio
/cursos
/cursos/[slug]        Detalle del curso
/sobre-veronica
/galeria
/cursos-anteriores
/contacto
/registro
/ingresar
/mi-cuenta
/admin                Maqueta del panel de administradora
/privacidad           Texto provisional
```

## 5. Reglas del negocio

**Cupos**
- Porcentaje = inscritas / cupos totales × 100, redondeado a entero.
- Textos: "Inscripciones · 87%" y "Quedan 2 cupos".
- Etiqueta "Últimos cupos" desde 80% hasta 99%.
- "Agotado" al 100%: botón desactivado con el texto "Cupos agotados".

**Precio**
- Se muestra en USD **solo** en la ficha del curso, casi al final, después de todo lo que incluye.
- **Nunca** en tarjetas ni en barras fijas.

**Inscripción**
- El botón "Inscribirme" exige sesión.
- Sin sesión: lleva a `/registro` y luego regresa al curso.
- Con sesión: registra la inscripción como "Pendiente de confirmación" y abre WhatsApp (`wa.me`) con un mensaje prellenado. Verónica concreta la inscripción por WhatsApp.
- Estados de una inscripción: **Pendiente de confirmación**, **Confirmada**, **Finalizado**.

**Registro**
- Obligatorios: nombre, apellido, cédula (V o E + número), teléfono venezolano, correo y contraseña.
- Opcionales: Instagram y fecha de nacimiento.
- Una cuenta por cédula y por correo.

**Pagos y contacto**
- Métodos de pago: por definir. Se muestran desde `/src/config/sitio.ts` con el texto `[POR DEFINIR]`.
- WhatsApp de Verónica: **+58 414-5897775**, definido en `/src/config/sitio.ts`.

## 6. Reglas de trabajo

- Trabajar **paso por paso**. Al terminar cada paso: ejecutar `lint` y `build`, corregir errores y dar un resumen corto (qué se hizo, qué archivos cambiaron, cómo verlo en el navegador).
- No instalar librerías sin explicar por qué. Preferir lo nativo + Tailwind. Íconos: `lucide-react`, trazo fino (`strokeWidth={1.5}`).
- Componentes reutilizables en `/src/components`.
- Imágenes: usar las de `/public/fotos`. Si falta alguna, placeholder elegante (bloque crema con el texto "Foto: [descripción]" centrado). Nunca imágenes de terceros.
- Accesibilidad: `alt` en todas las imágenes, `label` en formularios, foco visible en dorado-profundo, navegación con teclado.
- **No inventar datos de Verónica** (años de experiencia, premios, testimonios, cifras). Usar textos de muestra marcados con `[EJEMPLO]` para poder encontrarlos después (`grep "\[EJEMPLO\]"`).
- Cuando se pida "haz commit de este paso": commit con mensaje claro **en español**. No hacer commit sin esa orden.
