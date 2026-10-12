"""Prueba de lanzamiento: el sitio como si estuviera publicado (dominio que no es
localhost), con el cliente FALSO de Supabase y un Pixel de prueba.
Uso: python3 herramientas/prueba_lanzamiento.py [--capturas]

Revisa: sin franja ni noindex en lo público (sí en lo privado), Pixel de Meta
(PageView, Contact, CompleteRegistration), script de Vercel Analytics,
confirmación de cuenta por correo, "¿Olvidaste tu contraseña?" y
/nueva-contrasena (enlace válido y vencido)."""
import sys, json, re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
RAIZ = Path('/home/claude/vcorrea-makeup')
sys.path.insert(0, str(RAIZ / 'herramientas'))
import capturas  # noqa
from playwright.sync_api import sync_playwright

CAPTURAS = '--capturas' in sys.argv
SALIDA = RAIZ / 'herramientas' / 'capturas' / 'lanzamiento'
SALIDA.mkdir(parents=True, exist_ok=True)
FAKE = RAIZ / 'herramientas' / 'supabase_falso.js'
SITIO = 'https://vcorrea.test'
PIXEL_ID = '123456789012345'
# El fbevents.js de prueba manda cada llamada a https://pixel.test/?e=… para poder contarlas
FBEVENTS = """(function(){var q=window.fbq.queue||[];window.fbq.callMethod=function(){var a=[].slice.call(arguments);
navigator.sendBeacon('https://pixel.test/?e='+encodeURIComponent(JSON.stringify(a)));};q.forEach(function(a){window.fbq.callMethod.apply(null,a);});})();"""
errores, pasos, pixel, vercel = [], [], [], []


def paso(nombre, ok, detalle=''):
    pasos.append((nombre, ok, detalle)); print(('✓' if ok else '✗'), nombre, detalle)


srv, base = capturas.iniciar_servidor()
with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={'width': 390, 'height': 844})

    def sitio(r):
        url = r.request.url.replace(SITIO, base)
        if urlparse(url).path == '/js/config.js':
            texto = (RAIZ / 'js/config.js').read_text().replace('metaPixelId: null', f"metaPixelId: '{PIXEL_ID}'").replace('vercelAnalytics: false', 'vercelAnalytics: true')
            return r.fulfill(status=200, content_type='application/javascript', body=texto)
        if urlparse(url).path == '/_vercel/insights/script.js':
            vercel.append(1)
            return r.fulfill(status=200, content_type='application/javascript', body='window.__vercel = true;')
        resp = r.fetch(url=url)
        r.fulfill(response=resp)

    def baliza(r):
        e = parse_qs(urlparse(r.request.url).query).get('e', ['[]'])[0]
        pixel.append(json.loads(e))
        r.fulfill(status=204, body='')

    ctx.route(f'{SITIO}/**', sitio)
    ctx.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=str(FAKE), content_type='application/javascript'))
    ctx.route('https://connect.facebook.net/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=FBEVENTS))
    ctx.route('https://pixel.test/**', baliza)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    ctx.route('https://wa.me/**', lambda r: r.fulfill(status=200, content_type='text/html', body='ok'))
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errores.append(f'pageerror {pg.url}: {e}'))
    pg.on('console', lambda m: m.type == 'error' and 'fonts.googleapis' not in m.text and 'ERR_FAILED' not in m.text and errores.append(f'console {pg.url}: {m.text}'))

    def ir(ruta, espera=1000):
        pg.goto(SITIO + ruta, wait_until='load'); pg.wait_for_timeout(espera)

    def eventos(nombre):
        return [e for e in pixel if len(e) > 1 and e[0] == 'track' and e[1] == nombre]

    def foto(nombre):
        if CAPTURAS:
            for ancho in (375, 1280):
                pg.set_viewport_size({'width': ancho, 'height': 812 if ancho < 400 else 900}); pg.wait_for_timeout(300)
                pg.screenshot(path=str(SALIDA / f'{nombre}-{ancho}.png'))
                if pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'):
                    errores.append(f'scroll horizontal en {nombre} a {ancho}px')
            pg.set_viewport_size({'width': 390, 'height': 844})

    # Público: sin franja ni noindex; Pixel y Analytics
    ir('/')
    robots = pg.locator('meta[name="robots"]').count()
    paso('Inicio: sin franja de vista previa', pg.locator('[data-franja-vista-previa]').count() == 0 and 'vista-previa' not in (pg.locator('html').get_attribute('class') or ''))
    paso('Inicio: sin noindex', robots == 0)
    paso('Pixel: init y PageView', any(e[:2] == ['init', PIXEL_ID] for e in pixel) and len(eventos('PageView')) >= 1, json.dumps(pixel)[:120])
    paso('Vercel Analytics: carga su script', len(vercel) >= 1)
    foto('inicio')
    for ruta, privada in [('/cursos', False), ('/cursos/vision-lash', False), ('/privacidad', False), ('/registro', True), ('/ingresar', True), ('/mi-cuenta', True), ('/nueva-contrasena', True)]:
        pg.goto(SITIO + ruta, wait_until='domcontentloaded')
        tiene = pg.locator('meta[name="robots"][content*="noindex"]').count() > 0
        paso(f'{ruta}: {"noindex" if privada else "indexable"}', tiene == privada)

    # Registro con confirmación de correo activa
    ir('/registro?curso=vision-lash')
    pg.evaluate("(() => { const k='falso:db'; const db = JSON.parse(localStorage.getItem(k)); db.confirmar = true; localStorage.setItem(k, JSON.stringify(db)); })()")
    pixel.clear()
    pg.fill('#registro-nombre', 'Ana'); pg.fill('#registro-apellido', 'Lanzamiento')
    pg.fill('[name="cedula"]', '45678901'); pg.fill('[name="telefono"]', '1112233')
    pg.click('[data-continuar]'); pg.wait_for_timeout(600)
    pg.fill('[name="correo"]', 'ana@prueba.local'); pg.fill('[name="contrasena"]', 'clave12345')
    pg.fill('[name="confirmar"]', 'clave12345'); pg.check('[name="acepto"]')
    pg.locator('[data-crear]').click(); pg.wait_for_timeout(1500)
    paso('Registro con confirmación: pantalla "Revisa tu correo"', 'Revisa tu correo' in pg.locator('main').inner_text())
    paso('Pixel: CompleteRegistration', len(eventos('CompleteRegistration')) == 1)
    correos = pg.evaluate("JSON.parse(localStorage.getItem('falso:db')).correos || []")
    enlace = (correos[-1].get('enlace') or '') if correos else ''
    paso('Correo de confirmación lleva a /ingresar?confirmada=1 con el curso', '/ingresar?confirmada=1' in enlace and 'inscribirme' in enlace, enlace.replace(SITIO, ''))
    foto('revisa-tu-correo')
    pg.locator('[data-reenviar]').click(); pg.wait_for_timeout(600)
    paso('Reenviar el correo', 'te lo enviamos de nuevo' in pg.locator('[data-reenvio]').inner_text())

    # Vuelve del enlace: el falso no abre sesión, así que muestra el aviso
    ir('/ingresar?confirmada=1')
    paso('Ingresar: aviso "Tu correo quedó confirmado"', 'quedó confirmado' in pg.locator('[data-confirmada]').inner_text())
    ir('/', 300)
    ir('/ingresar?confirmada=1#error=access_denied&error_code=otp_expired')
    paso('Ingresar: enlace de confirmación vencido', 'venció' in pg.locator('[data-confirmada]').inner_text())

    # ¿Olvidaste tu contraseña?
    ir('/ingresar')
    pg.click('[data-olvido]'); pg.fill('#ingresar-correo', 'alumna@demo.com')
    pg.click('[data-enviar-enlace]'); pg.wait_for_timeout(700)
    paso('Olvidé mi contraseña: confirma el envío', 'te llegará un correo' in pg.locator('[data-estado-olvido]').inner_text())
    correos = pg.evaluate("JSON.parse(localStorage.getItem('falso:db')).correos")
    paso('Olvidé mi contraseña: enlace a /nueva-contrasena', correos[-1]['tipo'] == 'recuperar' and correos[-1]['enlace'].endswith('/nueva-contrasena'), correos[-1]['enlace'].replace(SITIO, ''))
    foto('olvide-contrasena')

    # Enlace vencido
    ir('/nueva-contrasena#error=access_denied&error_code=otp_expired')
    paso('Nueva contraseña: enlace vencido', pg.locator('[data-vencido]').is_visible() and not pg.locator('[data-nueva]').is_visible())
    foto('enlace-vencido')
    # Enlace válido (en el falso: la sesión ya abierta)
    pg.evaluate("(() => { const k='falso:db'; const db = JSON.parse(localStorage.getItem(k)); const u = db.usuarios.find(x => x.email === 'alumna@demo.com'); db.sesion = { user: { id: u.id, email: u.email }, access_token: 'falso' }; localStorage.setItem(k, JSON.stringify(db)); })()")
    ir('/nueva-contrasena')
    paso('Nueva contraseña: formulario', pg.locator('[data-nueva]').is_visible() and 'alumna@demo.com' in pg.locator('[data-intro]').inner_text())
    foto('nueva-contrasena')
    pg.fill('#nueva-contrasena', 'nueva12345'); pg.fill('#nueva-confirmar', 'otra')
    pg.click('[data-nueva] button[type="submit"]'); pg.wait_for_timeout(400)
    paso('Nueva contraseña: avisa si no coinciden', 'no coinciden' in pg.locator('#nueva-confirmar-error').inner_text())
    pg.fill('#nueva-confirmar', 'nueva12345')
    pg.click('[data-nueva] button[type="submit"]'); pg.wait_for_timeout(2000)
    clave = pg.evaluate("JSON.parse(localStorage.getItem('falso:db')).usuarios.find(x => x.email === 'alumna@demo.com').password")
    paso('Nueva contraseña: guarda y entra a Mi cuenta', clave == 'nueva12345' and '/mi-cuenta' in pg.url, pg.url.replace(SITIO, ''))

    # Inscribirme → Contact
    pixel.clear()
    ir('/cursos/vision-lash')
    pg.locator('[data-inscribirme]:visible').first.click(); pg.wait_for_timeout(1500)
    for np in ctx.pages[1:]:
        np.close()
    paso('Pixel: Contact al tocar Inscribirme', any(e[2].get('content_name') == 'Visión Lash' for e in eventos('Contact') if len(e) > 2))

    # El panel no mide
    ir('/', 400)
    pg.evaluate("import('/js/sesion.js').then(m => m.salir())"); pg.wait_for_timeout(600)
    ir('/ingresar?volver=/admin')
    pg.fill('[name="correo"]', 'admin@demo.com'); pg.fill('[name="contrasena"]', 'demo1234')
    pg.locator('button[type="submit"]').click(); pg.wait_for_timeout(1800)
    pixel.clear(); vercel.clear()
    ir('/admin', 1500)
    paso('Panel: abre con la cuenta admin', '/admin' in pg.url and pg.locator('[data-panel]').is_visible(), pg.url.replace(SITIO, ''))
    paso('Panel: sin Pixel ni Analytics', not pixel and not vercel)
    ctx.close(); nav.close()
srv.shutdown()
print('\nerrores:', json.dumps(errores, ensure_ascii=False, indent=1) if errores else 'ninguno')
print(f"{sum(1 for _, ok, _ in pasos if ok)}/{len(pasos)} pasos bien")
