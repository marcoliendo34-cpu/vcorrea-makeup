#!/usr/bin/env python3
"""
Crea las páginas del mapa del sitio (BRIEF.md §4) con el mismo <head>,
su título y el JS de cada página. Header, footer y WhatsApp los dibuja
js/componentes.js con iniciarPagina().

Solo crea los archivos que faltan: nunca pisa una página ya trabajada,
salvo que se pida con --forzar archivo.html (o --forzar todo).

Uso (desde la raíz del repositorio):
  python3 herramientas/crear-paginas.py
  python3 herramientas/crear-paginas.py --forzar privacidad.html
"""

import argparse
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MARCA = 'Verónica Correa Makeup'

HEAD = '''<!doctype html>
<html lang="es-VE">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex, nofollow">
  <title>{titulo_doc}</title>
  <meta name="description" content="{descripcion}">
  <meta name="theme-color" content="#FFFFFF">

  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap">

  <link rel="stylesheet" href="/css/estilos.css">
  <link rel="modulepreload" href="/js/componentes.js">
</head>
<body data-pagina="{pagina}"{hero}>
  <main id="contenido" tabindex="-1">
{contenido}
  </main>

  <script type="module" src="/js/{js}.js"></script>
</body>
</html>
'''

JS_BASE = '''// Página: {nombre}
import {{ iniciarPagina }} from './componentes.js';

iniciarPagina({opciones});
'''


def encabezado(etiqueta, titulo, intro):
    return f'''    <div class="contenedor encabezado-pagina">
      <p class="etiqueta">{etiqueta}</p>
      <h1>{titulo}</h1>
      <p class="encabezado-pagina__intro">{intro}</p>
    </div>'''


def pendiente(texto):
    return f'''    <section class="seccion">
      <div class="contenedor">
        <div class="pendiente">
          <svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4.5 19.5 9.5 11 18a3.5 3.5 0 0 1-5-5Z"/><path d="m12.5 6.5 5 5"/><path d="M6 13c-1.5 1.5-1.5 4-2 6.5 2.5-.5 5-.5 6.5-2"/></svg>
          <p class="pendiente__titulo">Sección en preparación</p>
          <p>{texto}</p>
        </div>
      </div>
    </section>'''


PAGINAS = [
    dict(archivo='index.html', pagina='inicio', js='inicio', hero=True,
         titulo_doc=f'{MARCA} · Cursos y formaciones de maquillaje',
         descripcion='Cursos y formaciones de maquillaje con Verónica Correa en Venezuela.',
         contenido='''    <section class="hero" aria-labelledby="titulo-hero">
      <div class="hero__media" data-hero-media></div>
      <div class="contenedor">
        <p class="etiqueta etiqueta--clara">Cursos y formaciones</p>
        <h1 class="display" id="titulo-hero" style="margin-top:var(--e-4)">Aprende a maquillar con técnica y elegancia</h1>
        <p class="hero__texto">[EJEMPLO] Formaciones presenciales y online para que domines el maquillaje, desde tu rutina diaria hasta novias y eventos.</p>
        <div class="hero__acciones" data-hero-acciones></div>
      </div>
    </section>
''' + pendiente('Aquí irán el buscador y las tarjetas de “Próximos cursos”. Se construyen en el próximo paso.')),

    dict(archivo='cursos.html', pagina='cursos', js='cursos',
         titulo_doc=f'Cursos · {MARCA}',
         descripcion='Próximos cursos y formaciones de maquillaje de Verónica Correa.',
         contenido=encabezado('Formaciones', 'Cursos',
                              '[EJEMPLO] Elige tu formación: automaquillaje, maquillaje social, novias y eventos.')
         + '\n    <div class="contenedor" data-consulta></div>\n'
         + pendiente('Aquí irán el buscador, los filtros y todas las tarjetas de cursos.')),

    dict(archivo='curso.html', pagina='curso', js='curso',
         titulo_doc=f'Curso · {MARCA}',
         descripcion='Detalle del curso: fechas, pensum, prácticas, requisitos e inscripción.',
         contenido='''    <div class="contenedor encabezado-pagina" data-encabezado-curso>
      <p class="etiqueta">Curso</p>
      <h1>Cargando…</h1>
    </div>
''' + pendiente('Aquí irá la ficha completa del curso: fechas, pensum, prácticas, requisitos, precio e inscripción.')),

    dict(archivo='sobre-veronica.html', pagina='sobre-veronica', js='sobre-veronica',
         titulo_doc=f'Sobre Verónica · {MARCA}',
         descripcion='Conoce a Verónica Correa, maquilladora profesional.',
         contenido=encabezado('Conoce a', 'Sobre Verónica',
                              '[EJEMPLO] Maquilladora profesional y formadora. Su historia, su forma de enseñar y lo que la inspira.')
         + '\n' + pendiente('Aquí irán la foto de Verónica, su historia y su forma de enseñar.')),

    dict(archivo='galeria.html', pagina='galeria', js='galeria',
         titulo_doc=f'Galería · {MARCA}',
         descripcion='Trabajos de maquillaje y momentos de clase.',
         contenido=encabezado('Portafolio', 'Galería',
                              '[EJEMPLO] Trabajos de Verónica y de sus alumnas, y momentos de clase.')
         + '\n' + pendiente('Aquí irá la galería de fotos.')),

    dict(archivo='cursos-anteriores.html', pagina='cursos-anteriores', js='cursos-anteriores',
         titulo_doc=f'Cursos anteriores · {MARCA}',
         descripcion='Cursos y formaciones ya realizados.',
         contenido=encabezado('Trayectoria', 'Cursos anteriores',
                              '[EJEMPLO] Formaciones que ya terminaron y las alumnas que egresaron.')
         + '\n' + pendiente('Aquí irá el listado de cursos finalizados.')),

    dict(archivo='contacto.html', pagina='contacto', js='contacto',
         titulo_doc=f'Contacto · {MARCA}',
         descripcion='Escríbele a Verónica Correa por WhatsApp.',
         contenido=encabezado('Hablemos', 'Contacto',
                              '[EJEMPLO] ¿Tienes dudas sobre un curso? Escríbeme y te respondo personalmente.')
         + '\n' + pendiente('Aquí irán WhatsApp, redes y preguntas frecuentes.')),

    dict(archivo='registro.html', pagina='registro', js='registro',
         titulo_doc=f'Crear cuenta · {MARCA}',
         descripcion='Crea tu cuenta de alumna para inscribirte en los cursos.',
         contenido=encabezado('Alumnas', 'Crea tu cuenta',
                              'Con tu cuenta puedes solicitar tu inscripción y ver tus cursos.')
         + '\n' + pendiente('Aquí irá el formulario de registro.')),

    dict(archivo='ingresar.html', pagina='ingresar', js='ingresar',
         titulo_doc=f'Iniciar sesión · {MARCA}',
         descripcion='Ingresa a tu cuenta de alumna.',
         contenido=encabezado('Alumnas', 'Iniciar sesión',
                              'Ingresa con tu correo y contraseña.')
         + '\n' + pendiente('Aquí irá el formulario para ingresar.')),

    dict(archivo='mi-cuenta.html', pagina='mi-cuenta', js='mi-cuenta',
         titulo_doc=f'Mi cuenta · {MARCA}',
         descripcion='Tus datos y tus inscripciones.',
         contenido=encabezado('Alumnas', 'Mi cuenta',
                              'Tus datos y el estado de tus inscripciones.')
         + '\n' + pendiente('Aquí irán tus datos y tus inscripciones.')),

    dict(archivo='admin.html', pagina='admin', js='admin', opciones='{ whatsapp: false }',
         titulo_doc=f'Panel de administración · {MARCA}',
         descripcion='Maqueta del panel de administración.',
         contenido=encabezado('Maqueta', 'Panel de administración',
                              'Vista previa del panel donde Verónica gestionará cursos, alumnas e inscripciones.')
         + '\n' + pendiente('Aquí irá la maqueta del panel de administradora.')),

    dict(archivo='privacidad.html', pagina='privacidad', js='privacidad',
         titulo_doc=f'Política de privacidad · {MARCA}',
         descripcion='Política de privacidad (texto provisional).',
         contenido=encabezado('Legal', 'Política de privacidad', 'Texto provisional. [EJEMPLO]') + '''
    <section class="seccion">
      <div class="contenedor" style="max-width:760px">
        <div style="display:grid;gap:var(--e-5)">
          <p>[EJEMPLO] Este texto es provisional y debe ser revisado antes de publicar el sitio.</p>
          <h2 style="font-size:var(--t-h3)">Qué datos pedimos</h2>
          <p>[EJEMPLO] Para crear tu cuenta pedimos tu nombre, apellido, cédula, teléfono y correo. De forma opcional, tu Instagram y tu fecha de nacimiento.</p>
          <h2 style="font-size:var(--t-h3)">Para qué los usamos</h2>
          <p>[EJEMPLO] Solo para gestionar tus inscripciones, contactarte sobre los cursos y emitir tu certificado. No vendemos ni compartimos tus datos con terceros.</p>
          <h2 style="font-size:var(--t-h3)">Tus derechos</h2>
          <p>[EJEMPLO] Puedes pedir que corrijamos o eliminemos tus datos escribiendo por WhatsApp.</p>
        </div>
      </div>
    </section>'''),

    dict(archivo='404.html', pagina='404', js='error-404',
         titulo_doc=f'Página no encontrada · {MARCA}',
         descripcion='La página que buscas no existe.',
         contenido='''    <section class="contenedor error" aria-labelledby="titulo-error">
      <div>
        <p class="error__numero" aria-hidden="true">404</p>
        <div class="error__linea"></div>
        <p class="etiqueta">Página no encontrada</p>
        <h1 id="titulo-error" style="margin-top:var(--e-3)">Esta página se nos corrió</h1>
        <p>Puede que el enlace esté incompleto o que el curso ya no esté disponible. Te ayudamos a volver.</p>
        <div class="error__acciones">
          <a class="boton boton--principal boton--grande" href="/"><span>Volver al inicio</span></a>
          <a class="boton boton--secundario boton--grande" href="/cursos"><span>Ver cursos</span></a>
        </div>
      </div>
    </section>'''),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--forzar', action='append', default=[], help='Archivo a sobrescribir, o "todo"')
    a = ap.parse_args()
    forzar_todo = 'todo' in a.forzar

    for p in PAGINAS:
        destino = RAIZ / p['archivo']
        if destino.exists() and not (forzar_todo or p['archivo'] in a.forzar):
            print(f'  = {p["archivo"]} (ya existe)')
        else:
            destino.write_text(HEAD.format(
                titulo_doc=p['titulo_doc'], descripcion=p['descripcion'], pagina=p['pagina'],
                hero=' data-hero' if p.get('hero') else '', contenido=p['contenido'], js=p['js']),
                encoding='utf-8')
            print(f'  + {p["archivo"]}')

        js = RAIZ / 'js' / f'{p["js"]}.js'
        if not js.exists():
            js.write_text(JS_BASE.format(nombre=p['archivo'], opciones=p.get('opciones', '')), encoding='utf-8')
            print(f'  + js/{p["js"]}.js')


if __name__ == '__main__':
    main()
