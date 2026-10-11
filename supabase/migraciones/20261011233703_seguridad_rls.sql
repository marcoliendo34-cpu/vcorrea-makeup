-- Vcorrea Makeup · Fase 2 · Migración 3: seguridad por filas (RLS) y permisos
-- Dos capas:
--   1. Permisos por columna (GRANT): qué columnas se pueden escribir desde la web.
--      Así nadie puede cambiar rol, cédula ni correo, ni mover una inscripción
--      de curso o de alumna, aunque una regla lo permitiera.
--   2. Reglas RLS: qué filas ve y escribe cada quien.
-- Los roles (alumna/admin/superadmin) solo se cambian desde la base de datos.

alter table public.perfiles      enable row level security;
alter table public.cursos        enable row level security;
alter table public.inscripciones enable row level security;
alter table public.galeria       enable row level security;

-- Se parte de cero: Supabase da todos los permisos por defecto a anon y authenticated.
revoke all on public.perfiles, public.cursos, public.inscripciones, public.galeria from anon, authenticated;

/* ------------------------------ cursos ------------------------------ */
grant select on public.cursos to anon, authenticated;
grant insert, update, delete on public.cursos to authenticated;

create policy "cursos: lectura de publicados (admin ve todos)"
  on public.cursos for select to anon, authenticated
  using (publicado or (select privado.es_admin()));

create policy "cursos: alta solo superadmin"
  on public.cursos for insert to authenticated
  with check ((select privado.es_superadmin()));

create policy "cursos: edición solo superadmin"
  on public.cursos for update to authenticated
  using ((select privado.es_superadmin()))
  with check ((select privado.es_superadmin()));

create policy "cursos: borrado solo superadmin"
  on public.cursos for delete to authenticated
  using ((select privado.es_superadmin()));

/* ------------------------------ galeria ----------------------------- */
grant select on public.galeria to anon, authenticated;
grant insert, update, delete on public.galeria to authenticated;

create policy "galeria: lectura de publicadas (admin ve todas)"
  on public.galeria for select to anon, authenticated
  using (publicado or (select privado.es_admin()));

create policy "galeria: alta solo superadmin"
  on public.galeria for insert to authenticated
  with check ((select privado.es_superadmin()));

create policy "galeria: edición solo superadmin"
  on public.galeria for update to authenticated
  using ((select privado.es_superadmin()))
  with check ((select privado.es_superadmin()));

create policy "galeria: borrado solo superadmin"
  on public.galeria for delete to authenticated
  using ((select privado.es_superadmin()));

/* ------------------------------ perfiles ---------------------------- */
-- Sin INSERT ni DELETE desde la web: el perfil lo crea el trigger del registro
-- y se borra junto con el usuario de Auth.
grant select on public.perfiles to authenticated;
grant update (nombre, apellido, telefono, instagram, fecha_nacimiento) on public.perfiles to authenticated;

create policy "perfiles: cada una ve el suyo; admin ve todos"
  on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select privado.es_admin()));

create policy "perfiles: cada una edita solo el suyo"
  on public.perfiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

/* ---------------------------- inscripciones ------------------------- */
-- Escritura limitada por columna: al crear solo curso_id (y alumna_id, que
-- debe ser la propia); al cambiar solo estado y nota. El trigger
-- inscripciones_validar decide qué cambios de estado vale cada rol.
grant select on public.inscripciones to authenticated;
grant insert (curso_id, alumna_id) on public.inscripciones to authenticated;
grant update (estado, nota) on public.inscripciones to authenticated;

create policy "inscripciones: cada alumna ve las suyas; admin ve todas"
  on public.inscripciones for select to authenticated
  using (alumna_id = (select auth.uid()) or (select privado.es_admin()));

create policy "inscripciones: la alumna crea solo las suyas"
  on public.inscripciones for insert to authenticated
  with check (alumna_id = (select auth.uid()));

create policy "inscripciones: admin cambia el estado; la alumna solo vuelve a pedir"
  on public.inscripciones for update to authenticated
  using (alumna_id = (select auth.uid()) or (select privado.es_admin()))
  with check (alumna_id = (select auth.uid()) or (select privado.es_admin()));
