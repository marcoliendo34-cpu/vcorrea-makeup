-- Vcorrea Makeup · Pruebas de las reglas (RLS, permisos y triggers)
-- Simula cada rol con SET ROLE + request.jwt.claims (igual que hace la API de Supabase).
-- Crea usuarios y cursos de prueba (@prueba.local), corre las pruebas, muestra el
-- resultado y luego hay que correr pruebas_rls_limpieza.sql.
-- Uso: pegar en el editor SQL de Supabase (o con el conector) y revisar la columna "paso".

create temp table if not exists resultados (n serial, prueba text, obtenido text, paso boolean);
grant all on resultados to anon, authenticated;
grant usage on sequence resultados_n_seq to anon, authenticated;

begin;

-- Usuarias de prueba (el trigger al_registrarse crea cada perfil)
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
('00000000-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ana@prueba.local',
 '{"nombre":"Ana","apellido":"Prueba","cedula":"V-90000001","telefono":"+584140000001","instagram":"@ana.prueba"}', now(), now()),
('00000000-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bea@prueba.local',
 '{"nombre":"Bea","apellido":"Prueba","cedula":"V-90000002","telefono":"+584140000002"}', now(), now()),
('00000000-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@prueba.local',
 '{"nombre":"Admin","apellido":"Prueba","cedula":"V-90000003","telefono":"+584140000003"}', now(), now()),
('00000000-0000-4000-a000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'super@prueba.local',
 '{"nombre":"Super","apellido":"Prueba","cedula":"V-90000004","telefono":"+584140000004"}', now(), now()),
-- Intenta registrarse como superadmin desde los datos del registro
('00000000-0000-4000-a000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'eva@prueba.local',
 '{"nombre":"Eva","apellido":"Prueba","cedula":"V-90000005","telefono":"+584140000005","rol":"superadmin"}', now(), now());

-- Roles: solo desde la base de datos
update public.perfiles set rol = 'admin'      where id = '00000000-0000-4000-a000-000000000003';
update public.perfiles set rol = 'superadmin' where id = '00000000-0000-4000-a000-000000000004';

-- Cursos de prueba: uno publicado con 1 cupo y un borrador
insert into public.cursos (id, slug, nombre, categoria, nivel, modalidad, fecha_inicio, fecha_fin, semanas, total_clases, cupos, precio_usd, publicado) values
('00000000-0000-4000-b000-000000000001', 'prueba-un-cupo', 'Prueba un cupo', 'Prueba', 'Básico', 'Presencial', '2026-12-01', '2026-12-02', 1, 1, 1, 10, true),
('00000000-0000-4000-b000-000000000002', 'prueba-borrador', 'Prueba borrador', 'Prueba', 'Básico', 'Presencial', '2026-12-01', '2026-12-02', 1, 1, 5, 10, false),
('00000000-0000-4000-b000-000000000003', 'prueba-abierto', 'Prueba abierto', 'Prueba', 'Básico', 'Presencial', '2026-12-01', '2026-12-02', 1, 1, 5, 10, true);

insert into resultados (prueba, obtenido, paso)
select 'Registro con "rol":"superadmin" en los datos → queda alumna', rol, rol = 'alumna'
from public.perfiles where id = '00000000-0000-4000-a000-000000000005';

/* =========================== ALUMNA (Ana) =========================== */
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}', true);

insert into resultados (prueba, obtenido, paso)
select 'Alumna: ve solo su perfil', count(*)::text || ' perfil(es) visibles', count(*) = 1 from public.perfiles;

insert into resultados (prueba, obtenido, paso)
select 'Alumna: no ve el perfil de otra alumna', count(*)::text || ' filas', count(*) = 0
from public.perfiles where id = '00000000-0000-4000-a000-000000000002';

do $$ begin
  begin
    update public.perfiles set rol = 'superadmin' where id = '00000000-0000-4000-a000-000000000001';
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede cambiar su rol', 'lo cambió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede cambiar su rol', sqlerrm, true);
  end;
  begin
    update public.perfiles set cedula = 'V-12345678' where id = '00000000-0000-4000-a000-000000000001';
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede cambiar su cédula', 'la cambió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede cambiar su cédula', sqlerrm, true);
  end;
end $$;

with c as (update public.perfiles set telefono = '+584149999999' where id = '00000000-0000-4000-a000-000000000001' returning 1)
insert into resultados (prueba, obtenido, paso) select 'Alumna: sí edita su teléfono', count(*)::text || ' fila cambiada', count(*) = 1 from c;

with c as (update public.perfiles set nombre = 'Hackeada' where id = '00000000-0000-4000-a000-000000000002' returning 1)
insert into resultados (prueba, obtenido, paso) select 'Alumna: no edita el perfil de otra', count(*)::text || ' filas cambiadas', count(*) = 0 from c;

insert into resultados (prueba, obtenido, paso)
select 'Alumna: ve solo cursos publicados', count(*)::text || ' curso(s)', count(*) = 2 from public.cursos where slug like 'prueba-%';

-- Inscripción: aunque mande "confirmada", queda pendiente
do $$ begin
  begin
    insert into public.inscripciones (curso_id) values ('00000000-0000-4000-b000-000000000001');
    insert into resultados (prueba, obtenido, paso)
    select 'Alumna: se inscribe y queda "pendiente"', estado, estado = 'pendiente' from public.inscripciones
    where alumna_id = '00000000-0000-4000-a000-000000000001';
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: se inscribe y queda "pendiente"', sqlerrm, false);
  end;
  begin
    -- Curso publicado: lo que la frena es la regla RLS, no el estado del curso
    insert into public.inscripciones (curso_id, alumna_id) values ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000002');
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no inscribe a otra alumna', 'la inscribió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no inscribe a otra alumna', sqlerrm, sqlerrm like '%row-level security%');
  end;
  begin
    insert into public.inscripciones (curso_id) values ('00000000-0000-4000-b000-000000000001');
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no se inscribe dos veces en el mismo curso', 'se inscribió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no se inscribe dos veces en el mismo curso', sqlerrm, true);
  end;
  begin
    update public.inscripciones set nota = 'pagado' where alumna_id = '00000000-0000-4000-a000-000000000001';
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no escribe la nota de su inscripción', 'la escribió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no escribe la nota de su inscripción', sqlerrm, true);
  end;
  begin
    insert into public.inscripciones (curso_id) values ('00000000-0000-4000-b000-000000000002');
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no se inscribe en un curso sin publicar', 'se inscribió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no se inscribe en un curso sin publicar', sqlerrm, true);
  end;
  begin
    update public.inscripciones set estado = 'confirmada' where alumna_id = '00000000-0000-4000-a000-000000000001';
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede confirmar su propia inscripción', 'la confirmó', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede confirmar su propia inscripción', sqlerrm, true);
  end;
  begin
    insert into public.cursos (slug, nombre, categoria, nivel, modalidad, fecha_inicio, fecha_fin, semanas, total_clases, cupos, precio_usd)
    values ('prueba-alumna', 'X', 'X', 'X', 'Presencial', '2026-12-01', '2026-12-01', 1, 1, 1, 1);
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede crear cursos', 'lo creó', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede crear cursos', sqlerrm, true);
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('galeria', 'prueba-alumna.webp');
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede subir fotos', 'la subió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Alumna: no puede subir fotos', sqlerrm, true);
  end;
end $$;

reset role;

/* ============================ ALUMNA (Bea) ========================== */
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
insert into public.inscripciones (curso_id) values ('00000000-0000-4000-b000-000000000001');
insert into resultados (prueba, obtenido, paso)
select 'Otra alumna: ve solo su inscripción', count(*)::text || ' inscripción(es)', count(*) = 1 from public.inscripciones;
reset role;

/* =============================== ADMIN ============================== */
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}', true);

insert into resultados (prueba, obtenido, paso)
select 'Admin: ve todos los perfiles', count(*)::text || ' perfiles', count(*) = 5 from public.perfiles where correo like '%@prueba.local';
insert into resultados (prueba, obtenido, paso)
select 'Admin: ve todas las inscripciones', count(*)::text || ' inscripciones', count(*) = 2 from public.inscripciones;
insert into resultados (prueba, obtenido, paso)
select 'Admin: ve también cursos sin publicar', count(*)::text || ' cursos', count(*) = 3 from public.cursos where slug like 'prueba-%';

with c as (update public.inscripciones set estado = 'confirmada' where alumna_id = '00000000-0000-4000-a000-000000000001' returning confirmada_en)
insert into resultados (prueba, obtenido, paso)
select 'Admin: confirma la inscripción de Ana (anota la fecha)', case when bool_and(confirmada_en is not null) then 'confirmada, con fecha' else 'sin fecha' end, count(*) = 1 and bool_and(confirmada_en is not null) from c;

do $$ begin
  begin
    update public.inscripciones set estado = 'confirmada' where alumna_id = '00000000-0000-4000-a000-000000000002';
    insert into resultados (prueba, obtenido, paso) values ('Curso lleno (1 cupo): no deja confirmar a Bea', 'la confirmó', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Curso lleno (1 cupo): no deja confirmar a Bea', sqlerrm, true);
  end;
  begin
    update public.perfiles set rol = 'admin' where id = '00000000-0000-4000-a000-000000000001';
    insert into resultados (prueba, obtenido, paso) values ('Admin: no puede cambiar roles desde la web', 'lo cambió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Admin: no puede cambiar roles desde la web', sqlerrm, true);
  end;
  begin
    insert into public.cursos (slug, nombre, categoria, nivel, modalidad, fecha_inicio, fecha_fin, semanas, total_clases, cupos, precio_usd)
    values ('prueba-admin', 'X', 'X', 'X', 'Presencial', '2026-12-01', '2026-12-01', 1, 1, 1, 1);
    insert into resultados (prueba, obtenido, paso) values ('Admin: no puede crear cursos (solo superadmin)', 'lo creó', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Admin: no puede crear cursos (solo superadmin)', sqlerrm, true);
  end;
end $$;

-- Cancela a Bea para probar que ella puede volver a pedir el curso
update public.inscripciones set estado = 'cancelada' where alumna_id = '00000000-0000-4000-a000-000000000002';
reset role;

/* ===================== ALUMNA (Bea) vuelve a pedir =================== */
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}', true);
with c as (update public.inscripciones set estado = 'pendiente' where alumna_id = '00000000-0000-4000-a000-000000000002' returning estado)
insert into resultados (prueba, obtenido, paso)
select 'Alumna cancelada: puede volver a pedir el curso (→ pendiente)', coalesce(max(estado), 'sin cambio'), count(*) = 1 from c;
reset role;

/* ============================ SUPERADMIN ============================ */
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}', true);
do $$ begin
  begin
    insert into public.cursos (slug, nombre, categoria, nivel, modalidad, fecha_inicio, fecha_fin, semanas, total_clases, cupos, precio_usd)
    values ('prueba-super', 'X', 'X', 'X', 'Presencial', '2026-12-01', '2026-12-01', 1, 1, 1, 1);
    insert into resultados (prueba, obtenido, paso) values ('Superadmin: crea cursos', 'creado', true);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Superadmin: crea cursos', sqlerrm, false);
  end;
  -- La subida se deshace enseguida (Supabase no deja borrar archivos con SQL).
  begin
    insert into storage.objects (bucket_id, name) values ('galeria', 'prueba-super.webp');
    raise exception 'subida-ok';
  exception when others then
    insert into resultados (prueba, obtenido, paso)
    values ('Superadmin: sube fotos al bucket galeria', case when sqlerrm = 'subida-ok' then 'subida (y deshecha)' else sqlerrm end, sqlerrm = 'subida-ok');
  end;
  begin
    update public.perfiles set rol = 'alumna' where id = '00000000-0000-4000-a000-000000000004';
    insert into resultados (prueba, obtenido, paso) values ('Superadmin: tampoco cambia roles desde la web', 'lo cambió', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Superadmin: tampoco cambia roles desde la web', sqlerrm, true);
  end;
end $$;
reset role;

/* ====================== VISITANTE SIN SESIÓN (anon) ================= */
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin
    perform 1 from public.perfiles;
    insert into resultados (prueba, obtenido, paso) values ('Visitante: no puede leer perfiles', 'los leyó', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Visitante: no puede leer perfiles', sqlerrm, true);
  end;
  begin
    perform 1 from public.inscripciones;
    insert into resultados (prueba, obtenido, paso) values ('Visitante: no puede leer inscripciones', 'las leyó', false);
  exception when others then
    insert into resultados (prueba, obtenido, paso) values ('Visitante: no puede leer inscripciones', sqlerrm, true);
  end;
end $$;
insert into resultados (prueba, obtenido, paso)
select 'Visitante: ve solo cursos publicados', count(*)::text || ' curso(s)', count(*) = 2 from public.cursos where slug like 'prueba-%';
insert into resultados (prueba, obtenido, paso)
select 'Visitante: cupos_de_cursos() da solo conteos', 'confirmadas ' || confirmadas || ', restantes ' || restantes || ' de ' || cupos,
       confirmadas = 1 and restantes = 0
from public.cupos_de_cursos() where slug = 'prueba-un-cupo';
reset role;

commit;

select n, paso, prueba, obtenido from resultados order by n;
