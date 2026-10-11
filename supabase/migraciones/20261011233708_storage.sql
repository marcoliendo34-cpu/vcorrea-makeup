-- Vcorrea Makeup · Fase 2 · Migración 4: Storage
-- Buckets públicos "cursos" y "galeria": cualquiera ve las fotos por su URL
-- pública; solo superadmin sube, cambia o borra. Sin regla de lectura general
-- para que nadie pueda listar el contenido de los buckets.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cursos',  'cursos',  true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('galeria', 'galeria', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "fotos: superadmin lista sus archivos"
  on storage.objects for select to authenticated
  using (bucket_id in ('cursos', 'galeria') and (select privado.es_superadmin()));

create policy "fotos: superadmin sube"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('cursos', 'galeria') and (select privado.es_superadmin()));

create policy "fotos: superadmin reemplaza"
  on storage.objects for update to authenticated
  using (bucket_id in ('cursos', 'galeria') and (select privado.es_superadmin()))
  with check (bucket_id in ('cursos', 'galeria') and (select privado.es_superadmin()));

create policy "fotos: superadmin borra"
  on storage.objects for delete to authenticated
  using (bucket_id in ('cursos', 'galeria') and (select privado.es_superadmin()));
