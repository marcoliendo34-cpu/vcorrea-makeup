"""
Fuentes reales del sitio para el navegador sin interfaz.

En el espacio de trabajo no hay acceso a Google Fonts. Este módulo intercepta
las peticiones a fonts.googleapis.com y fonts.gstatic.com y responde con las
mismas familias (Cormorant Garamond y Jost) desde herramientas/fuentes/.

Los archivos vienen del repositorio oficial de Google Fonts (github.com/google/fonts),
licencia SIL Open Font License (ver OFL-*.txt). Están recortados al alfabeto
latino. Son solo para capturas y para generar imágenes; el sitio publicado sigue
cargando las fuentes desde Google Fonts.

Uso:
    from fuentes_locales import activar_fuentes
    contexto = navegador.new_context(...)
    activar_fuentes(contexto)
"""

from pathlib import Path

CARPETA = Path(__file__).resolve().parent / 'fuentes'

ARCHIVOS = {
    'cormorant.ttf': 'CormorantGaramond-wght.ttf',
    'cormorant-italic.ttf': 'CormorantGaramond-Italic-wght.ttf',
    'jost.ttf': 'Jost-wght.ttf',
}

# El mismo CSS que entregaría Google (rango de pesos variable + display=swap)
CSS = """
@font-face { font-family: 'Cormorant Garamond'; font-style: normal; font-weight: 300 700; font-display: swap;
  src: url(https://fonts.gstatic.com/local/cormorant.ttf) format('truetype'); }
@font-face { font-family: 'Cormorant Garamond'; font-style: italic; font-weight: 300 700; font-display: swap;
  src: url(https://fonts.gstatic.com/local/cormorant-italic.ttf) format('truetype'); }
@font-face { font-family: 'Jost'; font-style: normal; font-weight: 100 900; font-display: swap;
  src: url(https://fonts.gstatic.com/local/jost.ttf) format('truetype'); }
"""


def _css(ruta):
    ruta.fulfill(status=200, body=CSS, headers={
        'content-type': 'text/css; charset=utf-8',
        'access-control-allow-origin': '*',
    })


def _fuente(ruta):
    nombre = ruta.request.url.rsplit('/', 1)[-1]
    archivo = ARCHIVOS.get(nombre)
    if not archivo:
        ruta.fulfill(status=404, body='')
        return
    ruta.fulfill(status=200, body=(CARPETA / archivo).read_bytes(), headers={
        'content-type': 'font/ttf',
        'access-control-allow-origin': '*',
        'cache-control': 'max-age=31536000',
    })


def activar_fuentes(contexto):
    """Sirve Cormorant Garamond y Jost locales en lugar de Google Fonts."""
    contexto.route('https://fonts.googleapis.com/**', _css)
    contexto.route('https://fonts.gstatic.com/**', _fuente)
    return contexto
