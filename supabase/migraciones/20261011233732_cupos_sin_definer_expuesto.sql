-- Vcorrea Makeup · Fase 2 · Migración 5: cupos públicos sin función privilegiada expuesta
-- Aviso del asesor de Supabase (0028/0029): public.cupos_de_cursos era SECURITY DEFINER
-- y estaba expuesta por la API. Ahora el conteo privilegiado vive en el esquema
-- privado (no expuesto) y la función pública es SECURITY INVOKER: solo lo llama.
-- Sigue devolviendo únicamente el número de confirmadas por curso publicado.

create or replace function privado.contar_cupos()
returns table (curso_id uuid, slug text, cupos integer, confirmadas integer, restantes integer)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.slug, c.cupos,
         count(i.id) filter (where i.estado = 'confirmada')::integer,
         greatest(c.cupos - count(i.id) filter (where i.estado = 'confirmada'), 0)::integer
  from public.cursos c
  left join public.inscripciones i on i.curso_id = c.id
  where c.publicado
  group by c.id;
$$;
revoke all on function privado.contar_cupos() from public;
grant execute on function privado.contar_cupos() to anon, authenticated;

create or replace function public.cupos_de_cursos()
returns table (curso_id uuid, slug text, cupos integer, confirmadas integer, restantes integer)
language sql stable security invoker set search_path = ''
as $$
  select * from privado.contar_cupos();
$$;
comment on function public.cupos_de_cursos() is 'Cupos por curso publicado: solo el número de inscripciones confirmadas. Pública a propósito (no expone datos de alumnas).';
revoke all on function public.cupos_de_cursos() from public;
grant execute on function public.cupos_de_cursos() to anon, authenticated;
