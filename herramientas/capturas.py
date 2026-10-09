#!/usr/bin/env python3
"""
Capturas y auditoría rápida con Chromium sin interfaz (Playwright).

Abre cada página a 375, 768 y 1280 px, guarda una captura de página completa
y reporta:
  - errores de consola y errores de JavaScript
  - recursos que no cargaron (las fuentes de Google se reportan aparte:
    en este espacio de trabajo no hay acceso a Google Fonts)
  - scroll horizontal, con los elementos que se salen del ancho

Uso (desde la raíz del repositorio):
  python3 herramientas/capturas.py /guia-de-estilo
  python3 herramientas/capturas.py / /cursos /cursos/ejemplo --anchos 375,1280
  python3 herramientas/capturas.py /guia-de-estilo --remoto https://vcorrea-makeup.vercel.app

Estados especiales (captura solo la pantalla visible, con un sufijo en el nombre):
  --clic "[data-abrir-menu]" --sufijo menu       abre el menú móvil antes de capturar
  --desplazar 600 --sufijo bajando               baja 600 px (header sólido en Inicio)
  --sesion                                       simula una alumna con sesión iniciada

Sin --remoto levanta un servidor local que imita a Vercel:
URLs limpias (/cursos → cursos.html), /cursos/:slug → curso.html y 404.html.

Las capturas quedan en herramientas/capturas/ (ignorado por git).
Código de salida 1 si hubo errores o scroll horizontal.
"""

import argparse
import http.server
import re
import socketserver
import sys
import threading
from pathlib import Path
from urllib.parse import urlparse, unquote

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'herramientas' / 'capturas'
NO_PUBLICADO = ('/BRIEF.md', '/README.md', '/referencias', '/herramientas', '/.git')
FUENTES_GOOGLE = ('fonts.googleapis.com', 'fonts.gstatic.com')


# ---------------------------------------------------------------------------
# Servidor local que imita vercel.json
# ---------------------------------------------------------------------------
class ManejadorVercel(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(RAIZ), **kw)

    def log_message(self, *a):  # silencioso
        pass

    def _resolver(self, ruta):
        ruta = unquote(urlparse(ruta).path)
        if any(ruta.startswith(p) for p in NO_PUBLICADO):
            return None
        if ruta == '/':
            return 'index.html'
        m = re.fullmatch(r'/cursos/([^/.]+)/?', ruta)
        if m:
            # Como Vercel: primero el archivo real (página generada), si no, la reescritura
            generada = f'cursos/{m.group(1)}.html'
            return generada if (RAIZ / generada).is_file() else 'curso.html'
        ruta = ruta.rstrip('/')
        archivo = RAIZ / ruta.lstrip('/')
        if archivo.is_file():
            return ruta.lstrip('/')
        if (RAIZ / (ruta.lstrip('/') + '.html')).is_file():
            return ruta.lstrip('/') + '.html'
        return None

    def do_GET(self):
        destino = self._resolver(self.path)
        if destino is None or not (RAIZ / destino).is_file():
            self.send_response(404)
            pagina404 = RAIZ / '404.html'
            cuerpo = pagina404.read_bytes() if pagina404.is_file() else b'404'
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(cuerpo)))
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        self.path = '/' + destino
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


ManejadorVercel.extensions_map.update({'.js': 'text/javascript', '.mjs': 'text/javascript',
                                       '.webp': 'image/webp', '.svg': 'image/svg+xml'})


def iniciar_servidor():
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), ManejadorVercel)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


# ---------------------------------------------------------------------------
# Auditoría
# ---------------------------------------------------------------------------
JS_DESBORDE = """
() => {
  const ancho = document.documentElement.clientWidth;
  const total = document.documentElement.scrollWidth;
  const culpables = [];
  if (total > ancho) {
    // Los carruseles con scroll propio (overflow-x auto/scroll) no cuentan:
    // su contenido se desplaza dentro de la caja, no en la página.
    const dentroDeCarrusel = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    for (const el of document.body.querySelectorAll('*')) {
      if (dentroDeCarrusel(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > ancho + 1 || r.left < -1)) {
        let sel = el.tagName.toLowerCase();
        if (el.id) sel += '#' + el.id;
        if (el.classList.length) sel += '.' + [...el.classList].slice(0, 2).join('.');
        culpables.push(`${sel} (${Math.round(r.left)}→${Math.round(r.right)}px)`);
        if (culpables.length >= 6) break;
      }
    }
  }
  return { ancho, total, culpables };
}
"""

JS_CORTES = """
() => {
  // Texto que queda recortado por una caja con overflow hidden/clip
  // (ej. un nombre que no cabe en la tarjeta). Se mide cada texto con un Range.
  const cortes = [];
  const recorre = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const rango = document.createRange();
  for (let n = recorre.nextNode(); n; n = recorre.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest('.solo-lectores, svg, script, style')) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none') continue;
    rango.selectNodeContents(n);
    const t = rango.getBoundingClientRect();
    if (!t.width || !t.height) continue;
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const sp = getComputedStyle(p);
      // Dentro de una fila con scroll propio (ej. el índice del curso) el texto se desplaza, no se corta
      if (/(auto|scroll)/.test(sp.overflowX) || /(auto|scroll)/.test(sp.overflowY)) break;
      const cx = /(hidden|clip)/.test(sp.overflowX), cy = /(hidden|clip)/.test(sp.overflowY);
      const tieneTextoCortado = sp.textOverflow === 'ellipsis' && p.scrollWidth > p.clientWidth + 1;
      if (!cx && !cy && !tieneTextoCortado) continue;
      const r = p.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) break;   // oculto a propósito (solo lectores de pantalla)
      const fueraX = cx && (t.left < r.left - 1 || t.right > r.right + 1);
      const fueraY = cy && (t.top < r.top - 1 || t.bottom > r.bottom + 1);
      if (fueraX || fueraY || tieneTextoCortado) {
        cortes.push(`"${n.textContent.trim().slice(0, 40)}" en ${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
        break;
      }
    }
    if (cortes.length >= 8) break;
  }
  return cortes;
}
"""

JS_FUENTES = """
() => {
  const cargada = (familia) => [...document.fonts]
    .some((f) => f.family.replace(/"/g, '') === familia && f.status === 'loaded');
  return { cormorant: cargada('Cormorant Garamond'), jost: cargada('Jost') };
}
"""


def nombre_archivo(ruta, ancho, sufijo=''):
    limpio = ruta.strip('/').replace('/', '_') or 'inicio'
    return f'{limpio}-{ancho}{"-" + sufijo if sufijo else ""}.png'


SESION_DEMO = '''localStorage.setItem('vcorrea:sesion', JSON.stringify({
  alumna: { nombre: 'Valentina', apellido: 'Rojas', correo: 'valentina@ejemplo.com' },
  desde: new Date().toISOString()
}));'''


def recorrer(pagina):
    """Baja hasta el final para activar animaciones al entrar en pantalla.
    (behavior instant: el sitio usa scroll-behavior: smooth y lo frenaría.)"""
    alto = pagina.evaluate('document.documentElement.scrollHeight')
    y = 0
    while y < alto:
        y += 500
        pagina.evaluate(f"window.scrollTo({{top: {y}, behavior: 'instant'}})")
        pagina.wait_for_timeout(80)
    pagina.evaluate("window.scrollTo({top: 0, behavior: 'instant'})")
    pagina.wait_for_timeout(450)


def auditar(rutas, anchos, base, salida, clic=None, desplazar=0, sesion=False, sufijo='', escribir=None):
    salida.mkdir(parents=True, exist_ok=True)
    problemas = 0
    sin_fuentes = False
    with sync_playwright() as p:
        nav = p.chromium.launch()
        for ruta in rutas:
            print(f'\n▸ {ruta}')
            for ancho in anchos:
                ctx = nav.new_context(viewport={'width': ancho, 'height': 900},
                                      device_scale_factor=2 if ancho < 768 else 1,
                                      locale='es-VE')
                if sesion:
                    ctx.add_init_script(SESION_DEMO)
                pg = ctx.new_page()
                errores, fallidos = [], []
                def en_consola(m, errores=errores):
                    if m.type != 'error':
                        return
                    origen = (m.location or {}).get('url', '')
                    if any(f in origen for f in FUENTES_GOOGLE):
                        return  # fuentes de Google bloqueadas aquí: se reporta aparte
                    errores.append(f'consola: {m.text}')
                pg.on('console', en_consola)
                pg.on('pageerror', lambda e: errores.append(f'JS: {e}'))
                pg.on('requestfailed', lambda r: fallidos.append(r.url))
                # Las fuentes de Google no son accesibles aquí: se cortan rápido para no esperar.
                pg.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda r: r.abort())

                resp = pg.goto(base.rstrip('/') + ruta, wait_until='load', timeout=30000)
                estado = resp.status if resp else '—'
                recorrer(pg)
                es_404 = pg.evaluate("document.body.dataset.pagina") == '404'
                if es_404 and estado == 404:
                    # Página de error a propósito: el 404 del documento es lo esperado.
                    estado = '404 (página de error)'
                    errores = [e for e in errores if 'status of 404' not in e]
                desborde = pg.evaluate(JS_DESBORDE)
                cortes = pg.evaluate(JS_CORTES)
                fuentes = pg.evaluate(JS_FUENTES)
                archivo = salida / nombre_archivo(ruta, ancho, sufijo)
                especial = bool(clic or desplazar or escribir)
                if desplazar:
                    pg.evaluate(f"window.scrollTo({{top: {desplazar}, behavior: 'instant'}})")
                    pg.wait_for_timeout(450)
                if clic:
                    pg.locator(clic).first.click()
                    pg.wait_for_timeout(500)
                if escribir:
                    pg.keyboard.type(escribir, delay=40)
                    pg.wait_for_timeout(500)
                pg.screenshot(path=str(archivo), full_page=not especial)
                ctx.close()

                propios = [u for u in fallidos if not any(f in u for f in FUENTES_GOOGLE)]
                if len(propios) < len(fallidos):
                    sin_fuentes = True
                if not (fuentes['cormorant'] and fuentes['jost']):
                    sin_fuentes = True

                hay_desborde = desborde['total'] > desborde['ancho']
                ok = estado in (200, '404 (página de error)') and not errores and not cortes and not propios and not hay_desborde
                problemas += 0 if ok else 1
                marca = '✓' if ok else '✗'
                print(f'  {marca} {ancho:>4}px  HTTP {estado}  →  {archivo.relative_to(RAIZ)}')
                for e in errores:
                    print(f'      · {e}')
                for u in propios:
                    print(f'      · no cargó: {u}')
                for c in cortes:
                    print(f'      · TEXTO CORTADO: {c}')
                if hay_desborde:
                    print(f"      · SCROLL HORIZONTAL: {desborde['total']}px > {desborde['ancho']}px")
                    for c in desborde['culpables']:
                        print(f'        - {c}')
        nav.close()

    if sin_fuentes:
        print('\nAviso: las fuentes de Google no cargan aquí; las capturas usan la tipografía de respaldo.')
    print(f"\n{'Sin problemas.' if problemas == 0 else f'{problemas} captura(s) con problemas.'}")
    return problemas


def main():
    ap = argparse.ArgumentParser(description='Capturas y auditoría con Chromium sin interfaz.')
    ap.add_argument('rutas', nargs='+', help='Rutas a revisar, ej. / /cursos /guia-de-estilo')
    ap.add_argument('--anchos', default='375,768,1280', help='Anchos en px separados por coma')
    ap.add_argument('--remoto', help='URL base publicada (si no, se usa un servidor local)')
    ap.add_argument('--salida', default=str(SALIDA), help='Carpeta de capturas')
    ap.add_argument('--clic', help='Selector a pulsar antes de capturar (ej. "[data-abrir-menu]")')
    ap.add_argument('--escribir', help='Texto a escribir después del clic (ej. en el buscador)')
    ap.add_argument('--desplazar', type=int, default=0, help='Píxeles a bajar antes de capturar')
    ap.add_argument('--sesion', action='store_true', help='Simular alumna con sesión iniciada')
    ap.add_argument('--sufijo', default='', help='Sufijo para el nombre del archivo')
    a = ap.parse_args()

    anchos = [int(x) for x in a.anchos.split(',') if x.strip()]
    rutas = ['/' + r.lstrip('/') for r in a.rutas]
    srv = None
    base = a.remoto
    if not base:
        srv, base = iniciar_servidor()
    try:
        problemas = auditar(rutas, anchos, base, Path(a.salida), clic=a.clic, desplazar=a.desplazar,
                            sesion=a.sesion, sufijo=a.sufijo, escribir=a.escribir)
    finally:
        if srv:
            srv.shutdown()
    sys.exit(1 if problemas else 0)


if __name__ == '__main__':
    main()
