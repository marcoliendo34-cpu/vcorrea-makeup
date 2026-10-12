-- Vcorrea Makeup · Fase 2 · Migración 6: portada como objeto y avisos del registro
--
-- 1. Nueva columna cursos.portada (jsonb), con la misma forma que usa la web:
--    {src, miniatura, og, ancho, alto, flyer, alt}. Así un flyer 4:5 se ve
--    completo y la vista previa al compartir usa su JPEG.
--    imagen_portada e imagen_portada_alt quedan SIN USO (vacías). Se borran en
--    una migración de limpieza cuando se pueda aprobar un cambio destructivo.
-- 2. cedula_registrada() y correo_registrado(): el registro avisa con los mismos
--    mensajes amables de la vista previa ("Ya existe una cuenta con esta
--    cédula / este correo") antes de crear la cuenta. Solo responden sí o no.

alter table public.cursos add column portada jsonb;
comment on column public.cursos.portada is 'Foto o flyer del curso: {src, miniatura?, og?, ancho?, alto?, flyer?, alt}. null = sin foto (se ve el bloque crema).';
comment on column public.cursos.imagen_portada is 'SIN USO: reemplazada por portada (jsonb). Pendiente de borrar.';
comment on column public.cursos.imagen_portada_alt is 'SIN USO: el alt va dentro de portada. Pendiente de borrar.';

-- Conteo privilegiado en el esquema privado (no expuesto) + función pública que solo lo llama.
create or replace function privado.cedula_registrada(p_cedula text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where cedula = upper(regexp_replace(coalesce(p_cedula, ''), '\s', '', 'g'))
  );
$$;

create or replace function privado.correo_registrado(p_correo text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(coalesce(p_correo, '')))
  );
$$;

revoke all on function privado.cedula_registrada(text), privado.correo_registrado(text) from public;
grant execute on function privado.cedula_registrada(text), privado.correo_registrado(text) to anon, authenticated;

create or replace function public.cedula_registrada(p_cedula text)
returns boolean
language sql stable security invoker set search_path = ''
as $$ select privado.cedula_registrada(p_cedula); $$;

create or replace function public.correo_registrado(p_correo text)
returns boolean
language sql stable security invoker set search_path = ''
as $$ select privado.correo_registrado(p_correo); $$;

comment on function public.cedula_registrada(text) is 'Registro: ¿ya hay una cuenta con esta cédula? Solo sí/no.';
comment on function public.correo_registrado(text) is 'Registro: ¿ya hay una cuenta con este correo? Solo sí/no.';

revoke all on function public.cedula_registrada(text), public.correo_registrado(text) from public;
grant execute on function public.cedula_registrada(text), public.correo_registrado(text) to anon, authenticated;
