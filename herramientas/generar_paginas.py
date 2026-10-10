#!/usr/bin/env python3
"""
Cabecera (<head>) de todas las páginas, en un solo lugar: SEO, fuentes y
precarga de módulos. No hay compilación: este script solo reescribe las
partes marcadas de los .html y genera sitemap.xml.

  python3 herramientas/generar_paginas.py                  títulos, descripciones, Open Graph,
                                                       sitemap.xml y páginas de curso
  python3 herramientas/generar_paginas.py --og-imagen      además rehace la imagen para compartir
  python3 herramientas/generar_paginas.py --dominio https://www.vcorreamakeup.com

Qué hace:
  1. Escribe en cada página su <title>, su meta description y el bloque
     <!-- og:inicio --> … <!-- og:fin --> (canonical, Open Graph y Twitter).
     Los textos están en PAGINAS (abajo): es el único lugar donde se editan.
  2. Genera sitemap.xml con las páginas públicas y una por curso.
  3. Fuentes de Google sin bloquear el primer pintado (media="print" pasa a
     "all" al cargar, con <noscript> de respaldo), con preconnect y display=swap.
  4. Precarga de módulos: lee los import de cada página y escribe un
     <link rel="modulepreload"> por archivo, para que el navegador los pida
     todos a la vez y no uno tras otro.
  5. Franja "Vista previa" según MODO_VISTA_PREVIA de js/config.js: la escribe
     en el HTML (o la quita) para que no haya salto al cargar la página.
  6. Llama a generar_cursos.py para rehacer cursos/[slug].html con lo nuevo.
  7. Con --og-imagen: crea fotos/og/vcorrea-og.jpg (1200×630, logotipo sobre
     crema) con el navegador sin interfaz y las fuentes reales del sitio.

Ejecútalo cada vez que cambie un título, una descripción, la lista de cursos
o el dominio. No hay compilación: los archivos resultantes se suben tal cual.
"""

import argparse
import html
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import generar_cursos  # noqa: E402

RAIZ = generar_cursos.RAIZ
MARCA = generar_cursos.MARCA
IMAGEN = generar_cursos.IMAGEN_MARCA
ALT_IMAGEN = 'Logotipo de Verónica Correa Makeup sobre fondo crema'

# archivo: (ruta pública, título, descripción, pública?)
#   pública = va en sitemap.xml y lleva canonical
PAGINAS = {
    'index.html': ('/', f'{MARCA} · Cursos y formaciones de maquillaje',
                   'Cursos y formaciones de maquillaje con Verónica Correa en Venezuela: automaquillaje, '
                   'maquillaje social, novias y eventos.', True),
    'cursos.html': ('/cursos', f'Próximos cursos · {MARCA}',
                    'Próximos cursos y formaciones de maquillaje de Verónica Correa: fechas, modalidad, '
                    'cupos disponibles e inscripción.', True),
    'sobre-veronica.html': ('/sobre-veronica', f'Sobre Verónica · {MARCA}',
                            'Conoce a Verónica Correa, maquilladora profesional en Venezuela, y cómo son sus '
                            'cursos y formaciones de maquillaje.', True),
    'galeria.html': ('/galeria', f'Galería de trabajos · {MARCA}',
                     'Galería de Verónica Correa Makeup: maquillaje social, novias, editorial y trabajos '
                     'de sus alumnas en clase.', True),
    'cursos-anteriores.html': ('/cursos-anteriores', f'Cursos anteriores · {MARCA}',
                               'Cursos y formaciones de maquillaje que Verónica Correa ya realizó, con su '
                               'contenido y fotos de las prácticas.', True),
    'contacto.html': ('/contacto', f'Contacto · {MARCA}',
                      'Escríbele a Verónica Correa por WhatsApp o por sus redes para resolver tus dudas '
                      'sobre los cursos de maquillaje.', True),
    'privacidad.html': ('/privacidad', f'Política de privacidad · {MARCA}',
                        'Qué datos se piden al registrarte e inscribirte en los cursos de Verónica Correa '
                        'Makeup y cómo se usan.', True),
    'registro.html': ('/registro', f'Crear cuenta · {MARCA}',
                      'Crea tu cuenta de alumna en Verónica Correa Makeup para inscribirte en los cursos '
                      'y seguir tus inscripciones.', False),
    'ingresar.html': ('/ingresar', f'Iniciar sesión · {MARCA}',
                      'Ingresa a tu cuenta de alumna de Verónica Correa Makeup para ver tus cursos y el '
                      'estado de tus inscripciones.', False),
    'mi-cuenta.html': ('/mi-cuenta', f'Mi cuenta · {MARCA}',
                       'Tus cursos y el estado de tus inscripciones en los cursos de maquillaje de '
                       'Verónica Correa Makeup.', False),
    'admin.html': ('/admin', f'Panel · {MARCA}',
                   'Panel de administración de Verónica Correa Makeup: cursos, inscritas y confirmación '
                   'de inscripciones.', False),
    '404.html': ('/404', f'Página no encontrada · {MARCA}',
                 'La página que buscas no existe o cambió de dirección. Mira los próximos cursos de '
                 'maquillaje de Verónica Correa.', False),
    'guia-de-estilo.html': ('/guia-de-estilo', f'Guía de estilo · {MARCA}',
                            'Guía de estilo temporal de la web de Verónica Correa Makeup: colores, '
                            'tipografía y componentes.', False),
    # Plantilla de la ficha: generar_cursos.py reemplaza estos textos en cada curso
    'curso.html': ('/cursos', f'Curso · {MARCA}',
                   'Detalle del curso de maquillaje: fechas, pensum, prácticas, requisitos e inscripción '
                   'con Verónica Correa.', False),
}


def a(texto):
    return html.escape(texto, quote=True)


def bloque(ruta, titulo, descripcion, publica, dominio, plantilla=False):
    url = dominio + ('' if ruta == '/' else ruta)
    imagen = f'{dominio}/{IMAGEN}'
    canonica = f'\n  <link rel="canonical" href="{a(url)}">' if publica else ''
    url_og = '' if plantilla else f'\n  <meta property="og:url" content="{a(url)}">'
    aviso = ('herramientas/generar_cursos.py reemplaza este bloque en cada página de curso' if plantilla
             else 'herramientas/generar_paginas.py escribe este bloque; no editar a mano')
    return f'''<!-- og:inicio ({aviso}) -->{canonica}
  <meta property="og:site_name" content="{a(MARCA)}">
  <meta property="og:locale" content="es_VE">
  <meta property="og:type" content="website">{url_og}
  <meta property="og:title" content="{a(titulo)}">
  <meta property="og:description" content="{a(descripcion)}">
  <meta property="og:image" content="{a(imagen)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{a(ALT_IMAGEN)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{a(titulo)}">
  <meta name="twitter:description" content="{a(descripcion)}">
  <meta name="twitter:image" content="{a(imagen)}">
  <!-- og:fin -->'''


def actualizar_pagina(archivo, datos, dominio):
    ruta, titulo, descripcion, publica = datos
    p = RAIZ / archivo
    texto = p.read_text(encoding='utf-8')
    nuevo = re.sub(r'<title>.*?</title>', f'<title>{html.escape(titulo)}</title>', texto, count=1, flags=re.S)
    nuevo = re.sub(r'<meta name="description" content="[^"]*">',
                   f'<meta name="description" content="{a(descripcion)}">', nuevo, count=1)
    og = bloque(ruta, titulo, descripcion, publica, dominio, plantilla=archivo == 'curso.html')
    if '<!-- og:inicio' in nuevo:
        nuevo = re.sub(r'<!-- og:inicio.*?<!-- og:fin -->', lambda _: og, nuevo, count=1, flags=re.S)
    else:
        nuevo, n = re.subn(r'(<meta name="description" content="[^"]*">)', lambda m: m.group(1) + '\n  ' + og,
                           nuevo, count=1)
        if n != 1:
            sys.exit(f'{archivo}: no tiene <meta name="description">')
    if nuevo != texto:
        p.write_text(nuevo, encoding='utf-8')
        print(f'  ~ {archivo}')
    else:
        print(f'  = {archivo}')


# ---------------------------------------------------------------------------
# Fuentes y módulos
# ---------------------------------------------------------------------------
FUENTES = ('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400'
           '&family=Jost:wght@300;400;500&display=swap')


def bloque_fuentes():
    url = html.escape(FUENTES, quote=True)
    return ('<!-- fuentes:inicio (Google Fonts sin bloquear el primer pintado) -->\n'
            '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
            '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'  <link rel="stylesheet" href="{url}" media="print" onload="this.media=\'all\'">\n'
            f'  <noscript><link rel="stylesheet" href="{url}"></noscript>\n'
            '  <!-- fuentes:fin -->')


IMPORT = re.compile(r'''(?:^|\n)\s*import\s+(?:[^'"]*?\s+from\s+)?['"](\.{1,2}/[^'"]+)['"]''')


def dependencias(entrada):
    """Todos los módulos que importa (directa o indirectamente) un archivo JS."""
    vistos, pendientes = [], [entrada]
    while pendientes:
        actual = pendientes.pop(0)
        for ruta in IMPORT.findall(actual.read_text(encoding='utf-8')):
            dep = (actual.parent / ruta).resolve()
            if dep not in vistos and dep != entrada:
                vistos.append(dep)
                pendientes.append(dep)
    return vistos


def bloque_precargas(texto):
    m = re.search(r'<script type="module" src="(/[^"]+)"', texto)
    if not m:
        return None
    entrada = RAIZ / m.group(1).lstrip('/')
    rutas = [m.group(1)] + ['/' + d.relative_to(RAIZ).as_posix() for d in dependencias(entrada)]
    lineas = '\n'.join(f'  <link rel="modulepreload" href="{r}">' for r in rutas)
    return ('<!-- precargas:inicio (módulos de esta página: generar_paginas.py) -->\n'
            f'{lineas}\n  <!-- precargas:fin -->')


def actualizar_cabecera(archivo):
    p = RAIZ / archivo
    texto = p.read_text(encoding='utf-8')
    nuevo = texto
    # Fuentes: reemplaza el bloque marcado o las 3 líneas originales
    if '<!-- fuentes:inicio' in nuevo:
        nuevo = re.sub(r'<!-- fuentes:inicio.*?<!-- fuentes:fin -->', lambda _: bloque_fuentes(), nuevo, flags=re.S)
    else:
        nuevo, n = re.subn(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*'
                           r'<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\s*'
                           r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]+">',
                           lambda _: bloque_fuentes(), nuevo, count=1)
        if n != 1:
            print(f'  ! {archivo}: no encontré las fuentes de Google')
    # Precargas: quita las sueltas y escribe el bloque antes de </head>
    precargas = bloque_precargas(nuevo)
    nuevo = re.sub(r'\n?[ \t]*<!-- precargas:inicio.*?<!-- precargas:fin -->', '', nuevo, flags=re.S)
    nuevo = re.sub(r'\n[ \t]*<link rel="modulepreload" href="[^"]+">', '', nuevo)
    if precargas:
        nuevo = nuevo.replace('</head>', f'  {precargas}\n</head>', 1)
    if nuevo != texto:
        p.write_text(nuevo, encoding='utf-8')
    return nuevo != texto


# ---------------------------------------------------------------------------
# Franja "Vista previa" (MODO_VISTA_PREVIA en js/config.js)
# ---------------------------------------------------------------------------
SIN_FRANJA = {'guia-de-estilo.html'}   # página interna, sin header ni franja


def leer_vista_previa():
    texto = (RAIZ / 'js' / 'config.js').read_text(encoding='utf-8')
    modo = re.search(r'export const MODO_VISTA_PREVIA\s*=\s*(true|false)', texto)
    frase = re.search(r"export const TEXTO_VISTA_PREVIA\s*=\s*'([^']*)'", texto)
    if not modo or not frase:
        sys.exit('js/config.js: faltan MODO_VISTA_PREVIA o TEXTO_VISTA_PREVIA')
    return modo.group(1) == 'true', frase.group(1)


def actualizar_franja(archivo, activa, frase):
    """Escribe (o quita) la franja en el HTML, así no hay salto cuando carga el JS."""
    if archivo in SIN_FRANJA:
        return False
    p = RAIZ / archivo
    texto = p.read_text(encoding='utf-8')
    nuevo = re.sub(r'\n?[ \t]*<!-- franja:inicio.*?<!-- franja:fin -->', '', texto, flags=re.S)
    nuevo = nuevo.replace('<html lang="es-VE" class="vista-previa">', '<html lang="es-VE">')
    if activa:
        nuevo = nuevo.replace('<html lang="es-VE">', '<html lang="es-VE" class="vista-previa">', 1)
        bloque_franja = ('  <!-- franja:inicio (MODO_VISTA_PREVIA en js/config.js; la escribe generar_paginas.py) -->\n'
                         f'  <div class="franja-vista-previa" data-franja-vista-previa>{html.escape(frase)}</div>\n'
                         '  <!-- franja:fin -->')
        nuevo, n = re.subn(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + bloque_franja, nuevo, count=1)
        if n != 1:
            sys.exit(f'{archivo}: no tiene <body>')
    if nuevo != texto:
        p.write_text(nuevo, encoding='utf-8')
        return True
    return False


def generar_sitemap(dominio):
    hoy = date.today().isoformat()
    rutas = [d[0] for d in PAGINAS.values() if d[3]]
    cursos = generar_cursos.leer_cursos()
    # vigentes primero (más importantes), luego finalizados
    rutas += [f"/cursos/{c['slug']}" for c in sorted(cursos, key=lambda c: (c['estado'] != 'vigente', c['fechaInicio']))]
    filas = '\n'.join(f'  <url><loc>{html.escape(dominio + ("" if r == "/" else r))}</loc><lastmod>{hoy}</lastmod></url>'
                      for r in rutas)
    contenido = ('<?xml version="1.0" encoding="UTF-8"?>\n'
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                 f'{filas}\n</urlset>\n')
    (RAIZ / 'sitemap.xml').write_text(contenido, encoding='utf-8')
    print(f'  + sitemap.xml ({len(rutas)} páginas)')
    # robots.txt indica dónde está el sitemap
    robots = RAIZ / 'robots.txt'
    t = robots.read_text(encoding='utf-8')
    linea = f'Sitemap: {dominio}/sitemap.xml'
    t = re.sub(r'\n*Sitemap: .*\n?', '\n', t).rstrip('\n') + f'\n\n{linea}\n'
    robots.write_text(t, encoding='utf-8')


def generar_imagen(destino=None):
    """1200×630: logotipo (monograma, nombre y MAKEUP) sobre crema, con las fuentes reales."""
    from playwright.sync_api import sync_playwright
    from fuentes_locales import activar_fuentes
    destino = Path(destino) if destino else RAIZ / IMAGEN
    documento = '''<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@400;500&display=swap">
<style>
  html, body { margin: 0; }
  .og { position: relative; box-sizing: border-box; width: 1200px; height: 630px; background: #F5EFE6;
        display: flex; flex-direction: column; align-items: center; justify-content: center; color: #2B2622; }
  .og::before, .og::after { content: ""; position: absolute; pointer-events: none; }
  .og::before { inset: 32px; border: 1.5px solid #B8975A; }
  .og::after { inset: 44px; border: 1px solid #E8DCC8; }
  .mono { display: grid; place-items: center; width: 132px; height: 132px; border: 1.5px solid #B8975A;
          border-radius: 50%; background: #FFFFFF; font: 400 52px/1 "Cormorant Garamond", serif;
          letter-spacing: .04em; color: #2B2622; margin-bottom: 40px; }
  .nombre { font: 300 104px/1 "Cormorant Garamond", serif; letter-spacing: .01em; margin: 0; }
  .sub { font: 500 24px/1 "Jost", sans-serif; letter-spacing: .35em; margin: 26px 0 0 .35em; color: #2B2622; }
  .linea { width: 72px; height: 2px; background: #B8975A; border-radius: 2px; margin: 44px 0 30px; }
  .lema { font: 500 20px/1 "Jost", sans-serif; letter-spacing: .2em; text-transform: uppercase; color: #7A5C30; margin: 0 0 0 .2em; }
</style></head><body>
<div class="og">
  <div class="mono">VC</div>
  <p class="nombre">Verónica Correa</p>
  <p class="sub">MAKEUP</p>
  <div class="linea"></div>
  <p class="lema">Cursos y formaciones de maquillaje</p>
</div></body></html>'''
    destino.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        nav = p.chromium.launch()
        ctx = nav.new_context(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
        activar_fuentes(ctx)
        pg = ctx.new_page()
        pg.set_content(documento, wait_until='networkidle')
        pg.evaluate('document.fonts.ready')
        cargadas = pg.evaluate("[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family)")
        if not any('Cormorant' in f for f in cargadas) or not any('Jost' in f for f in cargadas):
            sys.exit(f'Las fuentes no cargaron ({cargadas}); la imagen saldría con otra tipografía.')
        pg.locator('.og').screenshot(path=str(destino), type='jpeg', quality=90)
        nav.close()
    print(f'  + {destino.relative_to(RAIZ) if destino.is_relative_to(RAIZ) else destino} '
          f'({destino.stat().st_size // 1024} KB, 1200×630)')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dominio', default=generar_cursos.DOMINIO)
    ap.add_argument('--og-imagen', action='store_true', help='Rehacer fotos/og/vcorrea-og.jpg')
    ap.add_argument('--solo-imagen', metavar='ARCHIVO', help='Solo generar la imagen en ARCHIVO (para probar)')
    x = ap.parse_args()
    if x.solo_imagen:
        generar_imagen(x.solo_imagen)
        return
    dominio = x.dominio.rstrip('/')
    if x.og_imagen or not (RAIZ / IMAGEN).exists():
        generar_imagen()
    vista_previa, frase = leer_vista_previa()
    print(f'Franja de vista previa: {"activa" if vista_previa else "desactivada"} (MODO_VISTA_PREVIA en js/config.js)')
    for archivo, datos in PAGINAS.items():
        actualizar_pagina(archivo, datos, dominio)
        if actualizar_franja(archivo, vista_previa, frase):
            print(f'    franja al día: {archivo}')
        if actualizar_cabecera(archivo):
            print(f'    fuentes y precargas al día: {archivo}')
    generar_sitemap(dominio)
    print('Páginas de curso:')
    sys.argv = [sys.argv[0], '--dominio', dominio]
    generar_cursos.main()


if __name__ == '__main__':
    main()
