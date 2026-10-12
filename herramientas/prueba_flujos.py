"""Prueba de punta a punta: registro, ingreso, Mi cuenta, inscripción y panel.
Uso: python3 herramientas/prueba_flujos.py demo|supabase
  demo      datos de ejemplo (como las capturas)
  supabase  js/sesion-supabase.js y js/datos-supabase.js con un cliente FALSO
            (herramientas/supabase_falso.js): prueba el código sin red. La prueba
            real contra Supabase se hace en la web publicada."""
import sys, json
from pathlib import Path
RAIZ = Path('/home/claude/vcorrea-makeup')
sys.path.insert(0, str(RAIZ / 'herramientas'))
import capturas  # noqa
from playwright.sync_api import sync_playwright

modo = sys.argv[1]
FAKE = RAIZ / 'herramientas' / 'supabase_falso.js'
errores, pasos = [], []
def paso(nombre, ok, detalle=''):
    pasos.append((nombre, ok, detalle)); print(('✓' if ok else '✗'), nombre, detalle)

srv, base = capturas.iniciar_servidor()
with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={'width': 1280, 'height': 900})
    if modo == 'supabase':
        ctx.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=str(FAKE), content_type='application/javascript'))
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errores.append(f'pageerror {pg.url}: {e}'))
    pg.on('console', lambda m: m.type == 'error' and 'fonts.googleapis' not in m.text and 'ERR_FAILED' not in m.text and errores.append(f'console {pg.url}: {m.text}'))
    sufijo = '?supabase=1' if modo == 'supabase' else '?demo=1'
    def ir(ruta, espera=900):
        pg.goto(base + ruta, wait_until='load'); pg.wait_for_timeout(espera)
    ir('/' + sufijo)
    paso('Inicio: tarjeta Visión Lash', 'Visión Lash' in pg.locator('#proximos-cursos').inner_text())
    paso('Inicio: 6 fotos en la galería', pg.locator('[data-mosaico] img').count() == 6, str(pg.locator('[data-mosaico] img').count()))
    ir('/cursos/vision-lash')
    paso('Ficha: carga y muestra cupos', '0 de 10' in pg.locator('.curso-cupos').inner_text())
    ir('/cursos?q=pesta%C3%B1as')
    paso('Búsqueda "pestañas"', pg.locator('.tarjeta-curso').count() == 1)
    ir('/galeria')
    paso('Galería: 8 fotos reales', pg.locator('[data-masonry] img').count() >= 8, str(pg.locator('[data-masonry] img').count()))
    ir('/mi-cuenta')
    paso('Mi cuenta sin sesión → /ingresar', '/ingresar' in pg.url, pg.url.replace(base, ''))
    ir('/admin')
    paso('Admin sin sesión → /ingresar', '/ingresar' in pg.url, pg.url.replace(base, ''))
    ir('/ingresar')
    paso('Ingresar sin nota de cuentas demo', 'demo1234' not in pg.locator('main').inner_text())

    # Registro
    ir('/registro?volver=/cursos/vision-lash')
    f = 'form'
    pg.fill('#registro-nombre', 'Laura'); pg.fill('#registro-apellido', 'Prueba')
    pg.fill('[name="cedula"]', '12345678')   # existe (María, demo) / existe en el falso
    pg.fill('[name="telefono"]', '1234567')
    pg.click('[data-continuar]'); pg.wait_for_timeout(600)
    paso('Registro: cédula repetida → mensaje amable', 'Ya existe una cuenta con esta cédula' in pg.locator('main').inner_text())
    pg.fill('[name="cedula"]', '23456789')
    pg.click('[data-continuar]'); pg.wait_for_timeout(600)
    pg.fill('[name="correo"]', 'alumna@demo.com'); pg.fill('[name="contrasena"]', 'clave12345')
    pg.fill('[name="confirmar"]', 'clave12345'); pg.check('[name="acepto"]')
    pg.locator('[data-crear]').click(); pg.wait_for_timeout(800)
    paso('Registro: correo repetido → mensaje amable', 'Ya existe una cuenta con este correo' in pg.locator('main').inner_text())
    pg.fill('[name="correo"]', 'laura@prueba.local')
    pg.locator('[data-crear]').click(); pg.wait_for_timeout(1500)
    paso('Registro: crea la cuenta y vuelve al curso', '/cursos/vision-lash' in pg.url, pg.url.replace(base, ''))
    paso('Header: muestra la cuenta', pg.locator('.header').inner_text().find('L') >= 0)
    ir('/mi-cuenta')
    txt = pg.locator('main').inner_text()
    paso('Mi cuenta: saluda a Laura', 'Hola, Laura' in txt)
    # Inscribirse
    ir('/cursos/vision-lash')
    ctx.on('page', lambda np: np.close())   # la ventana de WhatsApp
    pg.locator('[data-inscribirme]').first.click(); pg.wait_for_timeout(1200)
    ir('/mi-cuenta')
    paso('Inscripción: queda pendiente en Mi cuenta', 'PENDIENTE' in pg.locator('main').inner_text().upper())
    # Salir y volver a entrar
    pg.locator('[data-salir]').click(); pg.wait_for_timeout(1000)
    paso('Cerrar sesión → Inicio', pg.url.rstrip('/').endswith(base.rstrip('/')) or pg.url.endswith('/'), pg.url.replace(base, ''))
    ir('/mi-cuenta')
    paso('Sin sesión otra vez → /ingresar', '/ingresar' in pg.url)
    pg.fill('[name="correo"]', 'laura@prueba.local'); pg.fill('[name="contrasena"]', 'otraclave99' if modo == 'supabase' else 'x')
    pg.locator('button[type="submit"]').click(); pg.wait_for_timeout(900)
    paso('Ingresar con clave mala → error', 'no coinciden' in pg.locator('main').inner_text())
    pg.fill('[name="contrasena"]', 'clave12345')
    pg.locator('button[type="submit"]').click(); pg.wait_for_timeout(1500)
    paso('Ingresar → Mi cuenta', '/mi-cuenta' in pg.url or 'Hola, Laura' in pg.locator('main').inner_text(), pg.url.replace(base, ''))
    ir('/admin')
    paso('Alumna en /admin → Inicio', not '/admin' in pg.url, pg.url.replace(base, ''))
    pg.goto(base + '/'); pg.wait_for_timeout(300)
    pg.evaluate("import('/js/sesion.js').then(m => m.salir())"); pg.wait_for_timeout(600)
    # Admin
    ir('/ingresar?volver=/admin')
    pg.fill('[name="correo"]', 'admin@demo.com'); pg.fill('[name="contrasena"]', 'demo1234')
    pg.locator('button[type="submit"]').click(); pg.wait_for_timeout(1800)
    txt = pg.locator('body').inner_text()
    paso('Admin: entra al panel', '/admin' in pg.url and 'Hola, Verónica' in txt, pg.url.replace(base, ''))
    paso('Admin: ve la solicitud de Laura', 'Laura' in txt)
    paso('Admin: nota de datos de ejemplo solo en demo', ('Restablecer datos de ejemplo' in txt) == (modo == 'demo'))
    boton = pg.locator('[data-accion="confirmar"]').first
    if boton.count():
        boton.click(); pg.wait_for_timeout(800)
        conf = pg.locator('dialog[open] [data-confirmar], dialog[open] .boton--principal')
        if conf.count(): conf.first.click(); pg.wait_for_timeout(1000)
    ir('/cursos/vision-lash')
    paso('Tras confirmar: la ficha dice 1 de 10', '1 de 10' in pg.locator('.curso-cupos').inner_text(), pg.locator('.curso-cupos').inner_text().replace('\n', ' '))
    ctx.close(); nav.close()
srv.shutdown()
print('\nerrores:', json.dumps(errores, ensure_ascii=False, indent=1) if errores else 'ninguno')
print(f"{sum(1 for _, ok, _ in pasos if ok)}/{len(pasos)} pasos bien")
