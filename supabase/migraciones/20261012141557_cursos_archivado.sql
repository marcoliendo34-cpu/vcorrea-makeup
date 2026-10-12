-- Vcorrea Makeup · Fase 2 · Migración 9: cursos archivados
-- El superadmin no borra cursos (las inscripciones los referencian): los archiva.
-- Un curso archivado no se publica nunca y el panel lo muestra aparte.

alter table public.cursos add column archivado boolean not null default false;
alter table public.cursos add constraint cursos_archivado_no_publicado check (not (archivado and publicado));
comment on column public.cursos.archivado is 'true = archivado por el superadmin: no se publica y el panel lo muestra en "Archivados".';
