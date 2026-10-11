-- Borra todo lo que crea pruebas_rls.sql
delete from public.inscripciones where curso_id in (select id from public.cursos where slug like 'prueba-%');
delete from public.cursos where slug like 'prueba-%';
delete from auth.users where email like '%@prueba.local';   -- borra también sus perfiles
select
  (select count(*) from auth.users where email like '%@prueba.local') as usuarios_prueba,
  (select count(*) from public.cursos where slug like 'prueba-%') as cursos_prueba,
  (select count(*) from storage.objects where name like 'prueba-%') as fotos_prueba;
