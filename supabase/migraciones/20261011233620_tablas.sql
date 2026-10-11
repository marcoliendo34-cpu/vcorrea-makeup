-- Vcorrea Makeup · Fase 2 · Migración 1: tablas
-- perfiles, cursos, inscripciones y galeria. Las reglas (RLS) van en la migración 3.

-- Esquema privado para funciones auxiliares: NO se expone por la API.
create schema if not exists privado;

/* ------------------------------------------------------------------ */
/* perfiles: un registro por usuario de Auth                          */
/* ------------------------------------------------------------------ */
create table public.perfiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  nombre           text not null check (length(trim(nombre)) between 1 and 60),
  apellido         text not null check (length(trim(apellido)) between 1 and 60),
  cedula           text not null unique check (cedula ~ '^[VE]-[0-9]{5,9}$'),
  telefono         text not null check (telefono ~ '^\+58[0-9]{10}$'),
  -- Copia del correo de Auth (el panel y el CSV lo muestran). Lo mantiene un trigger.
  correo           text not null,
  instagram        text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  fecha_nacimiento date,
  rol              text not null default 'alumna' check (rol in ('alumna', 'admin', 'superadmin')),
  creado_en        timestamptz not null default now()
);
comment on table public.perfiles is 'Datos de cada alumna o administradora. Se crea solo al registrarse (trigger). El rol solo se cambia desde la base de datos.';

/* ------------------------------------------------------------------ */
/* cursos: mismos campos que data/cursos.js                           */
/* ------------------------------------------------------------------ */
create table public.cursos (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre               text not null,
  nombre_corto         text,
  subtitulo            text not null default '',
  categoria            text not null,
  nivel                text not null,
  modalidad            text not null check (modalidad in ('Presencial', 'Online')),
  ubicacion            text not null default '',
  imagen_portada       text,                       -- URL pública (bucket "cursos") o null
  imagen_portada_alt   text not null default '',
  fecha_inicio         date not null,
  fecha_fin            date not null,
  dias                 text not null default '',
  horario              text not null default '',
  semanas              integer not null check (semanas > 0),
  total_clases         integer not null check (total_clases > 0),
  calendario           jsonb not null default '[]'::jsonb,   -- [{fecha, texto, destacada?}]
  cupos                integer not null check (cupos > 0),
  descripcion          text not null default '',
  dirigido_a           text[] not null default '{}',
  destacados           jsonb,                                -- {titulo, items[], cierre?}
  incluye              text[] not null default '{}',
  pensum               jsonb not null default '[]'::jsonb,   -- [{semana?, titulo, temas[]}]
  practicas            jsonb not null default '[]'::jsonb,   -- [{titulo, descripcion, requiereModelo}]
  requisitos           text[] not null default '{}',
  certificado          jsonb not null default '{"incluye": false, "descripcion": ""}'::jsonb,
  precio_usd           numeric(10, 2) not null check (precio_usd >= 0),
  condiciones_pago     text,
  preguntas            jsonb not null default '[]'::jsonb,   -- [{pregunta, respuesta}]
  estado               text not null default 'vigente' check (estado in ('vigente', 'finalizado')),
  galeria              jsonb not null default '[]'::jsonb,   -- fotos del curso [{src, miniatura?, alt}]
  egresadas            integer check (egresadas is null or egresadas >= 0),
  publicado            boolean not null default false,
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);
comment on table public.cursos is 'Cursos. Lectura pública solo de los publicados. Los cupos ocupados = inscripciones confirmadas (función public.cupos_de_cursos).';

/* ------------------------------------------------------------------ */
/* inscripciones                                                      */
/* ------------------------------------------------------------------ */
create table public.inscripciones (
  id             uuid primary key default gen_random_uuid(),
  curso_id       uuid not null references public.cursos (id) on delete restrict,
  alumna_id      uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  estado         text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'finalizada', 'cancelada')),
  nota           text,
  creado_en      timestamptz not null default now(),
  confirmada_en  timestamptz,
  unique (curso_id, alumna_id)   -- una sola inscripción por alumna y curso
);
create index inscripciones_alumna_idx on public.inscripciones (alumna_id);
create index inscripciones_curso_estado_idx on public.inscripciones (curso_id, estado);

/* ------------------------------------------------------------------ */
/* galeria                                                            */
/* ------------------------------------------------------------------ */
create table public.galeria (
  id                 uuid primary key default gen_random_uuid(),
  imagen             text not null,             -- nombre base o URL en el bucket "galeria"
  categoria          text not null check (categoria in ('formaciones', 'alumnas', 'propios')),
  texto_alternativo  text not null check (length(trim(texto_alternativo)) > 0),
  orden              integer not null default 0,
  ancho              integer check (ancho is null or ancho > 0),   -- proporción: evita saltos al cargar
  alto               integer check (alto is null or alto > 0),
  destacada          boolean not null default false,  -- avance del inicio
  en_anteriores      boolean not null default false,  -- página Cursos anteriores
  publicado          boolean not null default true,
  creado_en          timestamptz not null default now()
);
create index galeria_orden_idx on public.galeria (categoria, orden);
