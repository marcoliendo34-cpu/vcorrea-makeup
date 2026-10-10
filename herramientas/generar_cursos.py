#!/usr/bin/env python3
"""
Genera una página por curso en /cursos/[slug].html a partir de curso.html,
con título, descripción e imagen Open Graph propios, para que el enlace se
vea bien al compartirlo por WhatsApp e Instagram.

Ejecútalo cada vez que cambien los cursos (data/cursos.js) o curso.html:
  python3 herramientas/generar_cursos.py
  python3 herramientas/generar_cursos.py --dominio https://www.vcorreamakeup.com
  python3 herramientas/generar_cursos.py --og-imagen      # rehace la imagen de marca

Cómo se sirve en Vercel: las páginas generadas son archivos reales, así que
/cursos/automaquillaje-esencial abre cursos/automaquillaje-esencial.html.
Un slug sin página generada cae en la reescritura /cursos/:slug → curso.html
de vercel.json (cursos nuevos de la fase 2 siguen funcionando).

Imagen para compartir: si el curso tiene foto de portada (imagenPortada.src)
se usa esa. Si no, la imagen de marca fotos/og/vcorrea-og.jpg (logotipo sobre
crema, ver herramientas/generar_paginas.py).

Necesita node (para leer data/cursos.js) y Playwright (solo para --og-imagen).
Lo normal es correr herramientas/generar_paginas.py, que también llama a este script.
"""

import argparse
import html
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
PLANTILLA = RAIZ / 'curso.html'
CARPETA = RAIZ / 'cursos'
IMAGEN_MARCA = 'fotos/og/vcorrea-og.jpg'
DOMINIO = 'https://vcorrea-makeup.vercel.app'
MARCA = 'Verónica Correa Makeup'
SELLO = '<!-- Generado por herramientas/generar_cursos.py a partir de curso.html. No editar a mano. -->'
MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                'septiembre', 'octubre', 'noviembre', 'diciembre']
MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']


def leer_cursos():
    """Importa data/cursos.js con node y devuelve la lista de cursos."""
    codigo = (
        "const { pathToFileURL } = await import('node:url');"
        f"const m = await import(pathToFileURL({json.dumps(str(RAIZ / 'data' / 'cursos.js'))}).href);"
        "process.stdout.write(JSON.stringify(m.CURSOS));"
    )
    salida = subprocess.run(['node', '--input-type=module', '-e', codigo],
                            capture_output=True, text=True, check=True)
    return json.loads(salida.stdout)


def fecha(valor):
    """'2026-11-07' → '7 nov 2026' (mismo formato que js/fechas.js)."""
    f = date.fromisoformat(valor[:10])
    return f'{f.day} {MESES[f.month - 1]} {f.year}'


def sin_marcas(texto):
    return re.sub(r'\s*\[(EJEMPLO|POR DEFINIR)\]\s*', ' ', texto or '').strip()


def atributo(texto):
    return html.escape(texto, quote=True)


def bloque_og(curso, dominio):
    url = f'{dominio}/cursos/{curso["slug"]}'
    foto = curso.get('imagenPortada') or {}
    if foto.get('src'):
        imagen = dominio + '/' + foto['src'].lstrip('/')
        dimensiones = ''
        alt_imagen = foto.get('alt') or curso['nombre']
    else:
        imagen = f'{dominio}/{IMAGEN_MARCA}'
        dimensiones = ('\n  <meta property="og:image:width" content="1200">'
                       '\n  <meta property="og:image:height" content="630">')
        alt_imagen = 'Logotipo de Verónica Correa Makeup sobre fondo crema'

    if curso['estado'] == 'finalizado':
        cuando = f'Se realizó del {fecha(curso["fechaInicio"])} al {fecha(curso["fechaFin"])}'
    else:
        cuando = f'Inicia el {fecha(curso["fechaInicio"])}'
    if curso['estado'] == 'finalizado':
        # Las ediciones pasadas comparten nombre con el curso vigente: el título lleva mes y año
        f = date.fromisoformat(curso['fechaInicio'][:10])
        titulo = f'{curso["nombre"]}, {MESES_LARGOS[f.month - 1]} {f.year} · {MARCA}'
    else:
        titulo = f'{curso["nombre"]} · {MARCA}'
    descripcion = f'{sin_marcas(curso["subtitulo"])}. {cuando} · {curso["modalidad"]} · Nivel {curso["nivel"].lower()}.'

    og = f'''<!-- og:inicio (herramientas/generar_cursos.py reemplaza este bloque en cada página de curso) -->
  <link rel="canonical" href="{atributo(url)}">
  <meta property="og:site_name" content="{atributo(MARCA)}">
  <meta property="og:locale" content="es_VE">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{atributo(url)}">
  <meta property="og:title" content="{atributo(titulo)}">
  <meta property="og:description" content="{atributo(descripcion)}">
  <meta property="og:image" content="{atributo(imagen)}">{dimensiones}
  <meta property="og:image:alt" content="{atributo(alt_imagen)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{atributo(titulo)}">
  <meta name="twitter:description" content="{atributo(descripcion)}">
  <meta name="twitter:image" content="{atributo(imagen)}">
  <!-- og:fin -->'''
    return titulo, descripcion, og


def pagina(plantilla, curso, dominio):
    titulo, descripcion, og = bloque_og(curso, dominio)
    p = plantilla
    p = p.replace('<!doctype html>', '<!doctype html>\n' + SELLO, 1)
    p = re.sub(r'<title>.*?</title>', f'<title>{html.escape(titulo)}</title>', p, count=1, flags=re.S)
    p = re.sub(r'<meta name="description" content="[^"]*">',
               f'<meta name="description" content="{atributo(descripcion)}">', p, count=1)
    p, n = re.subn(r'<!-- og:inicio.*?<!-- og:fin -->', og, p, count=1, flags=re.S)
    if n != 1:
        sys.exit('curso.html no tiene el bloque <!-- og:inicio --> … <!-- og:fin -->')
    p, n = re.subn(r'<body data-pagina="curso">',
                   f'<body data-pagina="curso" data-slug="{atributo(curso["slug"])}">', p, count=1)
    if n != 1:
        sys.exit('curso.html no tiene <body data-pagina="curso">')
    return p


def generar_imagen_marca():
    """Imagen 1200×630 de marca: la genera herramientas/generar_paginas.py (logotipo sobre crema)."""
    import generar_paginas
    generar_paginas.generar_imagen()


def main():
    ap = argparse.ArgumentParser(description='Genera /cursos/[slug].html con Open Graph propio.')
    ap.add_argument('--dominio', default=DOMINIO, help=f'Dominio público (por defecto {DOMINIO})')
    ap.add_argument('--og-imagen', action='store_true', help='Rehacer la imagen de marca para compartir')
    a = ap.parse_args()
    dominio = a.dominio.rstrip('/')

    if a.og_imagen or not (RAIZ / IMAGEN_MARCA).exists():
        generar_imagen_marca()

    plantilla = PLANTILLA.read_text(encoding='utf-8')
    cursos = leer_cursos()
    CARPETA.mkdir(exist_ok=True)

    slugs = set()
    for c in cursos:
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', c['slug']):
            sys.exit(f'Slug inválido: {c["slug"]!r} (solo minúsculas, números y guiones)')
        slugs.add(c['slug'])
        destino = CARPETA / f'{c["slug"]}.html'
        nuevo = pagina(plantilla, c, dominio)
        anterior = destino.read_text(encoding='utf-8') if destino.exists() else None
        if anterior != nuevo:
            destino.write_text(nuevo, encoding='utf-8')
            print(f'  {"+" if anterior is None else "~"} cursos/{destino.name}')
        else:
            print(f'  = cursos/{destino.name}')

    # Borra páginas generadas de cursos que ya no existen (solo las que llevan el sello)
    for archivo in CARPETA.glob('*.html'):
        if archivo.stem not in slugs and SELLO in archivo.read_text(encoding='utf-8'):
            archivo.unlink()
            print(f'  - cursos/{archivo.name} (el curso ya no existe)')

    print(f'{len(slugs)} páginas de curso al día. Dominio: {dominio}')


if __name__ == '__main__':
    main()
