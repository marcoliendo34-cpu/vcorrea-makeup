-- Vcorrea Makeup · Fase 2 · Migración 8: no se piden cupos de un curso lleno
-- Si el curso ya tiene todas sus confirmadas, la web no puede crear una
-- solicitud nueva ni reabrir una cancelada: la base responde
-- "Este curso acaba de agotarse." y la página ofrece "Avísame del próximo".
-- Desde la base de datos (SQL) se puede seguir cargando lo que haga falta.

create or replace function privado.validar_inscripcion()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  desde_web  boolean := coalesce((select auth.role()) in ('anon', 'authenticated'), false);
  admin      boolean := privado.es_admin();
  v_cupos    integer;
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

  -- Solicitud nueva desde la web (o reabrir una cancelada) en un curso lleno
  if desde_web and new.estado = 'pendiente'
     and (tg_op = 'INSERT' or old.estado = 'cancelada') then
    select c.cupos into v_cupos from public.cursos c where c.id = new.curso_id;
    select count(*) into v_ocupados from public.inscripciones i
      where i.curso_id = new.curso_id and i.estado = 'confirmada';
    if v_ocupados >= v_cupos then
      raise exception 'Este curso acaba de agotarse.' using errcode = 'P0001';
    end if;
  end if;

  -- Fecha de confirmación
  if new.estado = 'confirmada' and (tg_op = 'INSERT' or old.estado <> 'confirmada') then
    new.confirmada_en := coalesce(new.confirmada_en, now());
  elsif new.estado in ('pendiente', 'cancelada') then
    new.confirmada_en := null;
  end if;

  -- Cupo lleno al confirmar (con el curso bloqueado: dos confirmaciones a la vez no pasan del cupo)
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
