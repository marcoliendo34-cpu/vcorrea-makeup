"""Prueba del panel por rol, con el cliente FALSO de Supabase (sin red).
Uso: python3 herramientas/prueba_panel.py [--capturas]

  - admin (Verónica): ve resumen, cursos, inscritas y alumnas; NUNCA botones de
    edición ni el archivo js/admin-editor.js.
  - superadmin (Marco): crea, edita (listas y pensum por semanas), sube portada,
    vista previa, publica, duplica, archiva, finaliza con egresadas y fotos, y
    gestiona la galería.
Con --capturas guarda imágenes a 375 y 1280 px en herramientas/capturas/panel/."""
import sys, json
from pathlib import Path
RAIZ = Path('/home/claude/vcorrea-makeup')
sys.path.insert(0, str(RAIZ / 'herramientas'))
import capturas  # noqa
from playwright.sync_api import sync_playwright

CAPTURAS = '--capturas' in sys.argv
SALIDA = RAIZ / 'herramientas' / 'capturas' / 'panel'
SALIDA.mkdir(parents=True, exist_ok=True)
FAKE = RAIZ / 'herramientas' / 'supabase_falso.js'
STORAGE = 'https://sgcxjurhxycnhmsiqeid.supabase.co/storage/**'
errores, pasos = [], []


def paso(nombre, ok, detalle=''):
    pasos.append((nombre, ok, detalle)); print(('✓' if ok else '✗'), nombre, detalle)


def servir_foto(r):
    archivo = 'fotos/cursos/vision-lash-600.webp' if '/cursos/portadas/' in r.request.url else 'fotos/galeria/formacion-03-600.webp'
    r.fulfill(path=str(RAIZ / archivo), content_type='image/webp')


srv, base = capturas.iniciar_servidor()
with sync_playwright() as p:
    nav = p.chromium.launch()
    ctx = nav.new_context(viewport={'width': 1280, 'height': 900})
    ctx.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=str(FAKE), content_type='application/javascript'))
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    ctx.route(STORAGE, servir_foto)
    pg = ctx.new_page()
    pedidos = []
    pg.on('request', lambda r: pedidos.append(r.url))
    pg.on('pageerror', lambda e: errores.append(f'pageerror {pg.url}: {e}'))
    pg.on('console', lambda m: m.type == 'error' and 'fonts.googleapis' not in m.text and 'ERR_FAILED' not in m.text and errores.append(f'console {pg.url}: {m.text}'))

    def ir(ruta, espera=900):
        pg.goto(base + ruta, wait_until='load'); pg.wait_for_timeout(espera)

    def hash_(h, espera=900):
        pg.evaluate(f"location.hash = {json.dumps(h)}"); pg.wait_for_timeout(espera)

    def texto(sel='body'):
        return pg.locator(sel).inner_text()

    def foto(nombre, completa=False):
        if not CAPTURAS:
            return
        for ancho in (375, 1280):
            pg.set_viewport_size({'width': ancho, 'height': 900 if ancho > 400 else 812})
            pg.wait_for_timeout(350)
            pg.screenshot(path=str(SALIDA / f'{nombre}-{ancho}.png'), full_page=completa)
            desborde = pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
            if desborde:
                errores.append(f'scroll horizontal en {nombre} a {ancho}px')
        pg.set_viewport_size({'width': 1280, 'height': 900})
        pg.wait_for_timeout(250)

    def entrar(correo):
        ir('/', 400)
        pg.evaluate("import('/js/sesion.js').then(m => m.salir())"); pg.wait_for_timeout(600)
        ir('/ingresar?volver=/admin')
        pg.fill('[name="correo"]', correo); pg.fill('[name="contrasena"]', 'demo1234')
        pg.locator('button[type="submit"]').click(); pg.wait_for_timeout(1800)

    ir('/?supabase=1')

    # ------------------------------ admin ------------------------------
    pedidos.clear()
    entrar('admin@demo.com')
    paso('Admin: entra al panel', '/admin' in pg.url, pg.url.replace(base, ''))
    paso('Admin: 3 secciones (sin Galería)', pg.locator('[data-nav]').count() == 3, str(pg.locator('[data-nav]').count()))
    hash_('#cursos')
    t = texto('[data-vista]')
    paso('Admin: lista de cursos sin "Crear curso"', 'Visión Lash' in t and 'Crear curso' not in t)
    hash_('#cursos/vision-lash')
    t = texto('[data-vista]')
    paso('Admin: curso sin botones de edición', 'Exportar lista' in t and 'Editar' not in t and 'Herramientas del desarrollador' not in t and 'Publicar' not in t)
    foto('admin-curso')
    hash_('#editar/vision-lash')
    paso('Admin: #editar no existe para ella (va al resumen)', 'Hola, Verónica' in texto('[data-vista]'))
    paso('Admin: nunca descarga admin-editor.js', not any('admin-editor' in u for u in pedidos))
    paso('Admin: rol "Administradora"', 'ADMINISTRADORA' in texto('.panel__usuario').upper())
    # Copia vieja en el navegador (registrada como alumna y luego hecha admin en la base)
    pg.evaluate("(() => { const k='vcorrea:perfil'; const u = JSON.parse(localStorage.getItem(k)); u.rol = 'alumna'; localStorage.setItem(k, JSON.stringify(u)); })()")
    ir('/admin', 1800)
    paso('Admin con copia vieja de "alumna": igual entra al panel', '/admin' in pg.url and 'Hola, Verónica' in texto('[data-vista]'), pg.url.replace(base, ''))

    # ---------------------------- superadmin ----------------------------
    entrar('super@demo.com')
    paso('Super: entra al panel', '/admin' in pg.url and 'Hola, Marco' in texto('[data-vista]'))
    paso('Super: sección Galería y rol Desarrollador', pg.locator('[data-nav="galeria"]').count() >= 1 and 'DESARROLLADOR' in texto('.panel__usuario').upper())
    hash_('#cursos/vision-lash')
    t = texto('[data-vista]')
    paso('Super: herramientas del curso', all(x in t for x in ['Editar', 'Vista previa', 'Despublicar', 'Finalizar curso', 'Duplicar', 'Archivar']))
    foto('super-curso')
    hash_('#cursos')
    paso('Super: botón "Crear curso"', 'Crear curso' in texto('[data-vista]'))
    pg.locator('a[href="#curso-nuevo"]').click(); pg.wait_for_timeout(900)
    paso('Super: formulario de curso nuevo', pg.locator('form[data-editor]').count() == 1)
    foto('editor-nuevo')

    # Guardar vacío → errores
    pg.locator('form[data-editor] button[type="submit"]').click(); pg.wait_for_timeout(400)
    caja = texto('[data-ed-errores]') if pg.locator('[data-ed-errores]:not([hidden])').count() else ''
    paso('Editor: guardar vacío muestra errores', 'Escribe el nombre del curso' in caja and 'fecha de inicio' in caja, caja[:80].replace('\n', ' '))
    foto('editor-errores')

    pg.fill('#ed-nombre', 'Curso de Prueba Ñandú')
    paso('Editor: dirección automática desde el nombre', pg.input_value('#ed-slug') == 'curso-de-prueba-nandu', pg.input_value('#ed-slug'))
    pg.fill('#ed-categoria', 'Pestañas'); pg.fill('#ed-nivel', 'Básico')
    pg.fill('#ed-fechaInicio', '2027-01-10'); pg.fill('#ed-fechaFin', '2027-01-31')
    pg.fill('#ed-semanas', '3'); pg.fill('#ed-totalClases', '6'); pg.fill('#ed-cupos', '8'); pg.fill('#ed-precioUSD', '250')
    pg.fill('#ed-descripcion', 'Descripción de prueba.')
    # Qué incluye: 2 elementos
    pg.locator('[data-lista="incluye"] [data-ed-op="agregar"]').click(); pg.keyboard.type('Kit de prueba')
    pg.locator('[data-lista="incluye"] [data-ed-op="agregar"]').click(); pg.keyboard.type('Certificado')
    # Pensum por semanas: 3 semanas, mover y quitar
    pg.check('[data-ed-semanas]')
    for titulo in ['Uno', 'Dos', 'Tres']:
        pg.locator('[data-lista="pensum"] [data-ed-op="agregar"]').click(); pg.keyboard.type(titulo)
    pg.fill('#ed-pensum-0-temas', 'Tema A\nTema B')
    pg.locator('[data-lista="pensum"] [data-ed-op="bajar"][data-indice="0"]').click()
    pg.locator('[data-lista="pensum"] [data-ed-op="quitar"][data-indice="2"]').click()
    titulos = [pg.input_value(f'#ed-pensum-{i}-titulo') for i in range(pg.locator('[data-lista="pensum"] .lista-ed__item').count())]
    paso('Pensum: agregar, bajar y quitar', titulos == ['Dos', 'Uno'], str(titulos))
    paso('Pensum: títulos "Semana 1/2"', 'SEMANA 2' in texto('[data-lista="pensum"]').upper())
    # Práctica y pregunta
    pg.locator('[data-lista="practicas"] [data-ed-op="agregar"]').click(); pg.keyboard.type('En maniquí')
    pg.check('[data-ruta="certificado.incluye"]')
    # Portada
    pg.locator('[data-ed-archivo="portada"]').set_input_files(str(RAIZ / 'fotos/cursos/vision-lash-og.jpg'))
    pg.wait_for_timeout(2500)
    est = texto('[data-ed-portada-estado]')
    paso('Portada: se comprime y sube', 'Foto lista' in est, est)
    paso('Portada: pide descripción', pg.locator('#ed-imagenPortada-alt').count() == 1)
    pg.locator('[data-lista="pensum"]').scroll_into_view_if_needed()
    foto('editor-pensum')
    pg.locator('form[data-editor] button[type="submit"]').click(); pg.wait_for_timeout(1500)
    paso('Guardar: queda en #editar/[slug]', pg.url.endswith('#editar/curso-de-prueba-nandu'), pg.url.replace(base, ''))
    fila = pg.evaluate("JSON.parse(localStorage.getItem('falso:db')).cursos.find(c => c.slug === 'curso-de-prueba-nandu')")
    paso('Guardar: borrador sin publicar', fila and fila['publicado'] is False)
    paso('Guardar: pensum con semanas 1 y 2', fila and [s.get('semana') for s in fila['pensum']] == [1, 2] and fila['pensum'][1]['temas'] == ['Tema A', 'Tema B'], json.dumps(fila and fila['pensum'], ensure_ascii=False)[:120])
    paso('Guardar: portada en el bucket "cursos" (webp)', fila and '/storage/v1/object/public/cursos/portadas/' in (fila['portada'] or {}).get('src', '') and fila['portada']['src'].endswith('-1200.webp'))
    archivos = pg.evaluate("JSON.parse(localStorage.getItem('falso:db')).archivos")
    paso('Storage: 1200 y 600 px subidos', len(archivos) == 2 and all(a['tipo'] == 'image/webp' and a['peso'] < 600000 for a in archivos), json.dumps(archivos)[:160])

    # Cambios sin guardar → pregunta
    pg.fill('#ed-subtitulo', 'Cambio sin guardar')
    pg.locator('[data-nav="resumen"]').first.click(); pg.wait_for_timeout(500)
    paso('Sin guardar: pregunta antes de salir', pg.locator('dialog[open]').count() == 1 and 'Salir sin guardar' in texto('dialog[open]'))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)

    # Vista previa (pestaña nueva)
    nuevas = []
    ctx.on('page', lambda np: nuevas.append(np))
    pg.locator('[data-ed="vista-previa"]').click(); pg.wait_for_timeout(2500)
    if nuevas:
        nuevas[0].wait_for_timeout(1500)
        prev = nuevas[0].locator('body').inner_text()
        paso('Vista previa: ficha con aviso "no está publicado"', 'todavía no está publicado' in prev and 'Curso de Prueba' in prev, nuevas[0].url.replace(base, ''))
        paso('Vista previa: guardó el cambio pendiente', 'Cambio sin guardar' in prev)
        if CAPTURAS:
            for ancho in (375, 1280):
                nuevas[0].set_viewport_size({'width': ancho, 'height': 900}); nuevas[0].wait_for_timeout(400)
                nuevas[0].screenshot(path=str(SALIDA / f'vista-previa-{ancho}.png'))
        nuevas[0].close()
    else:
        paso('Vista previa: abre pestaña', False)

    # Publicar
    hash_('#cursos/curso-de-prueba-nandu')
    pg.locator('[data-ed="publicar"]').click(); pg.wait_for_timeout(1200)
    paso('Publicar: el curso queda publicado', 'Despublicar' in texto('[data-vista]'))
    # Duplicar y archivar la copia
    pg.locator('[data-ed="duplicar"]').click(); pg.wait_for_timeout(1500)
    paso('Duplicar: abre la copia en el editor', pg.url.endswith('#editar/curso-de-prueba-nandu-copia') and 'Curso de Prueba Ñandú (copia)' in pg.input_value('#ed-nombre'))
    hash_('#cursos/curso-de-prueba-nandu-copia')
    pg.locator('[data-ed="archivar"]').click(); pg.wait_for_timeout(500)
    pg.locator('dialog[open] [data-si]').click(); pg.wait_for_timeout(1200)
    hash_('#cursos')
    t = texto('[data-vista]')
    paso('Archivar: la copia sale en "Archivados"', 'ARCHIVADOS' in t.upper() and t.upper().index('ARCHIVADOS') < t.index('(copia)'))
    foto('super-cursos', completa=True)

    # Finalizar con egresadas y fotos
    hash_('#finalizar/curso-de-prueba-nandu')
    pg.fill('[data-fin-egresadas]', '7')
    pg.locator('[data-ed-archivo="fotos-curso"]').set_input_files([str(RAIZ / 'fotos/galeria/formacion-01-1200.webp'), str(RAIZ / 'fotos/galeria/formacion-02-1200.webp')])
    pg.wait_for_timeout(3500)
    paso('Finalizar: 2 fotos subidas', pg.locator('[data-fin-fotos] .fotos-ed__item').count() == 2, texto('[data-fin-estado]'))
    foto('finalizar')
    pg.locator('form[data-finalizar] button[type="submit"]').click(); pg.wait_for_timeout(500)
    pg.locator('dialog[open] [data-si]').click(); pg.wait_for_timeout(1500)
    fila = pg.evaluate("JSON.parse(localStorage.getItem('falso:db')).cursos.find(c => c.slug === 'curso-de-prueba-nandu')")
    paso('Finalizar: estado, egresadas y fotos', fila['estado'] == 'finalizado' and fila['egresadas'] == 7 and len(fila['galeria']) == 2)

    # Galería
    hash_('#galeria')
    antes = pg.locator('[data-gal-lista] .fotos-ed__item').count()
    pg.select_option('[data-gal-nueva]', 'propios')
    pg.locator('[data-ed-archivo="galeria"]').set_input_files(str(RAIZ / 'fotos/galeria/formacion-04-1200.webp'))
    pg.wait_for_timeout(2500)
    despues = pg.locator('[data-gal-lista] .fotos-ed__item').count()
    paso('Galería: subir agrega una foto al final', despues == antes + 1, f'{antes} → {despues}')
    ultima = pg.locator('[data-gal-lista] .fotos-ed__item').last
    id_nueva = ultima.get_attribute('data-foto')
    paso('Galería: con la categoría elegida', ultima.locator('select').input_value() == 'propios')
    ultima.locator('input[data-gal-campo="alt"]').fill('Trabajo propio de prueba'); ultima.locator('input[data-gal-campo="alt"]').press('Tab'); pg.wait_for_timeout(600)
    pg.locator(f'[data-foto="{id_nueva}"] [data-gal-op="subir"]').click(); pg.wait_for_timeout(1200)
    orden = pg.evaluate("[...document.querySelectorAll('[data-gal-lista] [data-foto]')].map(e => e.dataset.foto)")
    paso('Galería: subir un lugar', orden.index(id_nueva) == despues - 2, f'posición {orden.index(id_nueva) + 1} de {despues}')
    pg.locator(f'[data-foto="{id_nueva}"] select').select_option('alumnas'); pg.wait_for_timeout(700)
    fdb = pg.evaluate(f"JSON.parse(localStorage.getItem('falso:db')).galeria.find(f => f.id === '{id_nueva}')")
    paso('Galería: guarda descripción y categoría', fdb['texto_alternativo'] == 'Trabajo propio de prueba' and fdb['categoria'] == 'alumnas')
    foto('galeria')
    pg.locator(f'[data-foto="{id_nueva}"] [data-gal-op="borrar"]').click(); pg.wait_for_timeout(400)
    pg.locator('dialog[open] [data-si]').click(); pg.wait_for_timeout(1200)
    paso('Galería: eliminar', pg.locator('[data-gal-lista] .fotos-ed__item').count() == antes)
    restantes = pg.evaluate("JSON.parse(localStorage.getItem('falso:db')).archivos.filter(a => a.bucket === 'galeria').length")
    paso('Galería: también borra sus archivos', restantes == 0, str(restantes))

    # Lo que ve el público
    ir('/', 400)
    pg.evaluate("import('/js/sesion.js').then(m => m.salir())"); pg.wait_for_timeout(600)
    ir('/cursos-anteriores')
    t = texto('main')
    paso('Público: el curso finalizado está en Cursos anteriores', 'Curso de Prueba Ñandú' in t and '7' in t)
    ir('/cursos')
    t = texto('main')
    paso('Público: la copia archivada no aparece', '(copia)' not in t)
    ir('/cursos/curso-de-prueba-nandu-copia')
    paso('Público: la ficha archivada da 404', 'no encontr' in texto('main').lower() or '404' in texto('main'))
    ctx.close(); nav.close()
srv.shutdown()
print('\nerrores:', json.dumps(errores, ensure_ascii=False, indent=1) if errores else 'ninguno')
print(f"{sum(1 for _, ok, _ in pasos if ok)}/{len(pasos)} pasos bien")
