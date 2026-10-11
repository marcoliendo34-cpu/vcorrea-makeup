-- Vcorrea Makeup · Fase 2 · Migración 2: funciones y triggers
-- Todas con search_path vacío (nombres completos) para que nadie pueda suplantarlas.

/* ------------------------------------------------------------------ */
/* Roles (esquema privado: no se exponen por la API)                  */
/* ------------------------------------------------------------------ */
-- SECURITY DEFINER: leen perfiles sin pasar por RLS (si no, la regla de
-- perfiles se llamaría a sí misma).
create or replace function privado.es_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol in ('admin', 'superadmin')
  );
$$;

create or replace function privado.es_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'superadmin'
  );
$$;

revoke all on function privado.es_admin(), privado.es_superadmin() from public;
grant usage on schema privado to anon, authenticated;
grant execute on function privado.es_admin(), privado.es_superadmin() to anon, authenticated;

/* ------------------------------------------------------------------ */
/* Perfil automático al registrarse                                   */
/* ------------------------------------------------------------------ */
-- Toma los datos enviados en supabase.auth.signUp({ options: { data: {...} } }).
-- El rol SIEMPRE es 'alumna': lo que venga en los datos del registro se ignora.
create or replace function privado.crear_perfil()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  d jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.perfiles (id, nombre, apellido, cedula, telefono, correo, instagram, fecha_nacimiento)
  values (
    new.id,
    trim(d ->> 'nombre'),
    trim(d ->> 'apellido'),
    upper(trim(d ->> 'cedula')),
    trim(d ->> 'telefono'),
    lower(new.email),
    nullif(regexp_replace(trim(coalesce(d ->> 'instagram', '')), '^@', ''), ''),
    nullif(d ->> 'fecha_nacimiento', '')::date
  );
  return new;
end;
$$;

create trigger al_registrarse
  after insert on auth.users
  for each row execute function privado.crear_perfil();

-- Si cambia el correo en Auth, se copia al perfil.
create or replace function privado.copiar_correo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.perfiles set correo = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger al_cambiar_correo
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function privado.copiar_correo();

/* ------------------------------------------------------------------ */
/* cursos.actualizado_en automático                                   */
/* ------------------------------------------------------------------ */
create or replace function privado.marcar_actualizado()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger cursos_actualizado_en
  before update on public.cursos
  for each row execute function privado.marcar_actualizado();

/* ------------------------------------------------------------------ */
/* Reglas de las inscripciones                                        */
/* ------------------------------------------------------------------ */
-- Al crear: siempre 'pendiente', sin nota ni fecha de confirmación (salvo
-- desde la base de datos). Solo en cursos publicados y vigentes.
-- Al cambiar:
--   - La alumna (no admin) solo puede volver a pedir un curso cancelado:
--     'cancelada' → 'pendiente'. Nada más.
--   - Admin y superadmin cambian el estado y la nota.
--   - Confirmar exige cupo: cuenta las confirmadas con el curso bloqueado,
--     así dos confirmaciones al mismo tiempo no pasan del cupo.
create or replace function privado.validar_inscripcion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  desde_web boolean := coalesce((select auth.role()) in ('anon', 'authenticated'), false);
  admin     boolean := privado.es_admin();
  v_cupos   integer;
  v_ocupados integer;
begin
  if tg_op = 'INSERT' then
    if desde_web then
      new.estado := 'pendiente';
      new.nota := null;
      new.confirmada_en := null;
      new.creado_en := now();
      if not exists (
        select 1 from public.cursos c
        where c.id = new.curso_id and c.publicado and c.estado = 'vigente'
      ) then
        raise exception 'Este curso no está abierto a inscripciones.' using errcode = 'P0001';
      end if;
    end if;
  else -- UPDATE
    if desde_web and not admin then
      if not (old.estado = 'cancelada' and new.estado = 'pendiente')
         or new.nota is distinct from old.nota then
        raise exception 'Solo Verónica puede cambiar el estado de una inscripción.' using errcode = '42501';
      end if;
      new.creado_en := now();   -- la nueva solicitud cuenta desde hoy
    end if;
  end if;

  -- Fecha de confirmación
  if new.estado = 'confirmada' and (tg_op = 'INSERT' or old.estado <> 'confirmada') then
    new.confirmada_en := coalesce(new.confirmada_en, now());
  elsif new.estado in ('pendiente', 'cancelada') then
    new.confirmada_en := null;
  end if;

  -- Cupo lleno
  if new.estado = 'confirmada' and (tg_op = 'INSERT' or old.estado <> 'confirmada') then
    select c.cupos into v_cupos from public.cursos c where c.id = new.curso_id for update;
    select count(*) into v_ocupados from public.inscripciones i
      where i.curso_id = new.curso_id and i.estado = 'confirmada' and i.id <> new.id;
    if v_ocupados >= v_cupos then
      raise exception 'El curso ya está lleno: no quedan cupos para confirmar.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger inscripciones_validar
  before insert or update on public.inscripciones
  for each row execute function privado.validar_inscripcion();

/* ------------------------------------------------------------------ */
/* Cupos públicos: SOLO el número de confirmadas por curso            */
/* ------------------------------------------------------------------ */
-- La web (incluso sin sesión) llama a supabase.rpc('cupos_de_cursos').
-- Devuelve un conteo por curso publicado; nunca datos de alumnas.
create or replace function public.cupos_de_cursos()
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
comment on function public.cupos_de_cursos() is 'Cupos por curso publicado: solo el número de inscripciones confirmadas. Pública a propósito (no expone datos de alumnas).';

revoke all on function public.cupos_de_cursos() from public;
grant execute on function public.cupos_de_cursos() to anon, authenticated;
