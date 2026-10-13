-- Vcorrea Makeup · Limpieza del lanzamiento (12 oct 2026)
-- Correr UNA vez en Supabase → SQL Editor → New query → Run.
-- (El conector de Claude no puede aprobar borrados; por eso va aquí.)

begin;

-- 1. Inscripción de prueba de Marco en Visión Lash (pendiente). Es el único
--    dato de prueba que queda en la base.
delete from public.inscripciones i
using public.perfiles p, public.cursos c
where i.alumna_id = p.id
  and i.curso_id = c.id
  and p.correo = 'marco.liendo34@gmail.com'
  and c.slug = 'vision-lash';

-- 2. Columnas viejas de portada, sin uso desde la migración 6 (la foto va en "portada").
alter table public.cursos
  drop column if exists imagen_portada,
  drop column if exists imagen_portada_alt;

commit;

-- Comprobación: debe decir 0 inscripciones y no listar las columnas viejas.
select count(*) as inscripciones from public.inscripciones;
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'cursos' and column_name like 'imagen_portada%';
