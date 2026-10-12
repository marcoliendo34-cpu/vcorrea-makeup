# Supabase · Vcorrea Makeup

Proyecto **VCORREA MAKEUP** (`sgcxjurhxycnhmsiqeid`, us-east-1, plan gratuito).
URL: https://sgcxjurhxycnhmsiqeid.supabase.co

Cada archivo de `migraciones/` es una migración aplicada, con la misma versión que tiene en la base. Para cambiar algo, se agrega una migración nueva; las que ya están aplicadas no se editan.

## Tablas

| Tabla | Qué guarda | Lectura | Escritura desde la web |
|---|---|---|---|
| `perfiles` | Datos de cada usuaria (nombre, apellido, cédula única, teléfono, correo, instagram, fecha de nacimiento, rol) | Cada una el suyo; admin y superadmin, todos | Cada una edita solo nombre, apellido, teléfono, instagram y fecha de nacimiento del suyo. **Nunca** rol, cédula ni correo |
| `cursos` | Todos los campos de `data/cursos.js` + `publicado` y `archivado` (un archivado nunca está publicado). La foto o flyer va en `portada` (jsonb: src, miniatura, og, ancho, alto, flyer, alt). `imagen_portada` e `imagen_portada_alt` quedaron sin uso y se borran en una limpieza | Público: solo publicados. Admin: todos | Solo superadmin |
| `inscripciones` | curso, alumna, estado, nota, fechas. Una por alumna y curso | Cada alumna las suyas; admin y superadmin, todas | La alumna crea las suyas (siempre `pendiente`) y puede volver a pedir una cancelada. Admin y superadmin cambian estado y nota |
| `galeria` | Fotos de la galería (imagen, categoría, texto alternativo, orden, destacada, en_anteriores). `imagen` es el nombre base de `/fotos/galeria` o, si se subió desde el panel, la URL pública de la versión de 1200 px (la de 600 px tiene el mismo nombre con `-600`) | Público: solo publicadas | Solo superadmin |

## Reglas clave

- **Perfil automático:** el trigger `al_registrarse` crea el perfil con los datos de `signUp(... options.data)`. El rol siempre empieza en `alumna`, aunque el registro mande otro.
- **Roles:** solo se cambian desde la base de datos (SQL o panel de Supabase). Nadie puede cambiarlos desde la web, ni siquiera superadmin.
- **Cupos:** solo cuentan las inscripciones `confirmada`. `cupos_de_cursos()` (pública) devuelve por curso únicamente cupos, confirmadas y restantes. La base no deja confirmar si el curso está lleno, y bloquea el curso al confirmar para que dos confirmaciones simultáneas no pasen del cupo.
- **Storage:** buckets públicos `cursos` y `galeria` (máx. 5 MB, WebP/JPEG/PNG). Solo superadmin sube, reemplaza o borra.
- **Registro:** `cedula_registrada(texto)` y `correo_registrado(texto)` son públicas y solo responden sí o no, para los avisos amables del formulario.
- Las funciones con privilegios viven en el esquema `privado`, que la API no expone.

## Datos cargados

La migración `cargar_cursos_y_galeria` copió Visión Lash y las 8 fotos reales de la galería desde `data/*.js`. Esas fotos siguen en `/fotos` de la web (`galeria.imagen` = nombre base).

Desde el 12 oct 2026 el superadmin carga cursos y fotos desde el panel (`/admin`). Las fotos se comprimen en el navegador y van a los buckets:
- `cursos/portadas/[slug]/…-1200.webp` y `-600.webp`: portada del curso (`cursos.portada`).
- `cursos/fotos/[slug]/…`: fotos de un curso finalizado (`cursos.galeria`).
- `galeria/[categoría]/…`: fotos de la galería.

## Pruebas

`pruebas/pruebas_rls.sql` simula cada rol: dos alumnas, admin, superadmin y visitante sin sesión. Hay que correrlo completo en el editor SQL y revisar que toda la columna `paso` diga `true`. Después se corre `pruebas/pruebas_rls_limpieza.sql` para borrar los datos de prueba (`@prueba.local` y cursos `prueba-…`).

## Asignar un rol

```sql
update public.perfiles set rol = 'admin' where correo = 'correo@deveronica.com';
update public.perfiles set rol = 'superadmin' where correo = 'correo@delprogramador.com';
```
