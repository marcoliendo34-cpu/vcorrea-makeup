#!/usr/bin/env python3
"""
Auditoría completa del sitio con Chromium sin interfaz (Playwright).

Revisa todas las páginas y escribe un informe en herramientas/capturas/auditoria/:

  1. Diseño (360, 375, 414, 768, 1024 y 1440 px): scroll horizontal, textos
     cortados, palabras que no caben (se parten letra por letra), textos
     encimados y áreas táctiles menores de 44 px.
  2. Consistencia: tamaños de títulos, espacio entre secciones, botones e íconos.
  3. Accesibilidad: contraste AA con los colores reales (CSS y, sobre fotos o
     degradados, píxeles de la pantalla), alt, labels, nombres de botones y
     enlaces, orden de títulos, orden de foco, foco visible y teclado en el
     menú, el buscador, la galería, los acordeones y las ventanas.
  4. Rendimiento: imágenes de más de 250 KB, sin ancho/alto, carga diferida,
     prioridad, display=swap, JavaScript sin usar y una simulación de móvil
     (4G lento + CPU 4x) con FCP, LCP, TBT, CLS y un puntaje aproximado.
  5. SEO: título y descripción por página, Open Graph, favicon, sitemap.xml.
  6. Enlaces internos rotos (incluye #anclas) y errores de consola.
  7. Movimiento: prefers-reduced-motion.

Uso (desde la raíz del repositorio):
  python3 herramientas/auditoria.py                  todo
  python3 herramientas/auditoria.py --bloques 1,3    solo diseño y accesibilidad
  python3 herramientas/auditoria.py --paginas / /galeria --anchos 375,1440

Usa el mismo servidor local que herramientas/capturas.py (imita a Vercel) y
sirve las fuentes reales desde herramientas/fuentes. El servidor comprime con
gzip como Vercel, para que la simulación de rendimiento sea realista.

Código de salida 1 si hay hallazgos de nivel "error".
"""

import argparse
import gzip
import json
import math
import re
import socketserver
import sys
import threading
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
import capturas  # noqa: E402
from capturas import ManejadorVercel, RAIZ, JS_DESBORDE, JS_CORTES, script_sesion  # noqa: E402
from fuentes_locales import activar_fuentes  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

try:
    from PIL import Image
except ImportError:  # el contraste sobre fotos queda sin medir
    Image = None

SALIDA = RAIZ / 'herramientas' / 'capturas' / 'auditoria'
ANCHOS = [360, 375, 414, 768, 1024, 1440]
DOMINIO = 'https://vcorrea-makeup.vercel.app'

# Páginas públicas (van en sitemap.xml) y privadas (no van)
def paginas_del_sitio():
    sys.path.insert(0, str(RAIZ / 'herramientas'))
    import generar_cursos  # noqa
    cursos = generar_cursos.leer_cursos()
    publicas = ['/', '/cursos', *[f"/cursos/{c['slug']}" for c in cursos],
                '/sobre-veronica', '/galeria', '/cursos-anteriores', '/contacto', '/privacidad']
    privadas = [('/registro', None), ('/ingresar', None), ('/mi-cuenta', 'alumna'), ('/admin', 'admin')]
    otras = [('/esta-pagina-no-existe', None)]
    return [(p, None) for p in publicas] + privadas + otras, publicas


# ---------------------------------------------------------------------------
# Servidor con gzip (como Vercel)
# ---------------------------------------------------------------------------
TIPOS_TEXTO = ('.html', '.css', '.js', '.svg', '.json', '.xml', '.txt')


class ManejadorComprimido(ManejadorVercel):
    def do_GET(self):
        destino = self._resolver(self.path)
        acepta = 'gzip' in (self.headers.get('Accept-Encoding') or '')
        if destino and (RAIZ / destino).is_file() and destino.endswith(TIPOS_TEXTO) and acepta:
            datos = gzip.compress((RAIZ / destino).read_bytes(), 6)
            tipo = self.guess_type(destino)
            if tipo.startswith('text/') or tipo in ('image/svg+xml', 'application/json'):
                tipo += '; charset=utf-8'
            self.send_response(200)
            self.send_header('Content-Type', tipo)
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(datos)))
            self.end_headers()
            self.wfile.write(datos)
            return
        return super().do_GET()


def iniciar_servidor():
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), ManejadorComprimido)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


# ---------------------------------------------------------------------------
# Hallazgos
# ---------------------------------------------------------------------------
class Informe:
    def __init__(self):
        self.items = []   # (bloque, nivel, pagina, ancho, texto)
        self.datos = {}

    def agregar(self, bloque, nivel, pagina, texto, ancho=None):
        self.items.append((bloque, nivel, pagina, ancho, texto))

    def errores(self):
        return [i for i in self.items if i[1] == 'error']


NOMBRES_BLOQUE = {
    1: 'Diseño', 2: 'Consistencia', 3: 'Accesibilidad', 4: 'Rendimiento',
    5: 'SEO', 6: 'Enlaces y consola', 7: 'Movimiento'
}


# ---------------------------------------------------------------------------
# JavaScript de las revisiones
# ---------------------------------------------------------------------------
JS_UTIL = r"""
window.__aud = (() => {
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = [...el.classList].filter((x) => !x.startsWith('es-')).slice(0, 2);
    if (c.length) s += '.' + c.join('.');
    return s;
  };
  const texto = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);
  const visible = (el) => {
    if (!el.isConnected) return false;
    if (el.closest('[hidden], dialog:not([open]), template')) return false;
    // contenido de un <details> cerrado (Chrome lo deja con tamaño pero no se ve)
    const cerrado = el.closest('details:not([open])');
    if (cerrado && !el.closest('summary')) return false;
    if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) return false;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let p = el; p; p = p.parentElement) {
      if (getComputedStyle(p).opacity === '0') return false;
    }
    // recortado a 1px (solo lectores de pantalla)
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const sp = getComputedStyle(p);
      if (sp.clipPath === 'inset(50%)' || (sp.position === 'absolute' && sp.clip && sp.clip.startsWith('rect(0'))) return false;
      if (p.classList.contains('solo-lectores')) return false;
    }
    return true;
  };
  const enContenedorFijo = (el) => {
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === 'fixed' || pos === 'sticky') return true;
    }
    return false;
  };
  // Elementos con texto propio (nodos de texto directos)
  const conTexto = () => [...document.body.querySelectorAll('*')].filter((el) =>
    !el.closest('script, style, svg, noscript, template') &&
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  return { desc, texto, visible, enContenedorFijo, conTexto };
})();
"""

# Palabras que no caben en su caja (quedan partidas letra por letra)
JS_PALABRAS = r"""
() => {
  const { desc, visible, conTexto } = window.__aud;
  const lienzo = document.createElement('canvas').getContext('2d');
  const malos = [];
  for (const el of conTexto()) {
    if (!visible(el)) continue;
    const st = getComputedStyle(el);
    if (st.whiteSpace.startsWith('nowrap') || st.whiteSpace === 'pre') continue;
    const propio = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
    let palabras = propio.split(/[\s ]+/).filter((p) => p.length > 1);
    if (!palabras.length) continue;
    if (st.textTransform === 'uppercase') palabras = palabras.map((p) => p.toUpperCase());
    lienzo.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    const ls = parseFloat(st.letterSpacing) || 0;
    const ancho = (p) => lienzo.measureText(p).width + ls * p.length;
    const larga = palabras.reduce((a, b) => (ancho(b) > ancho(a) ? b : a));
    // ancho disponible: el del bloque que contiene el texto
    let caja = el;
    while (caja && getComputedStyle(caja).display === 'inline') caja = caja.parentElement;
    const cs = getComputedStyle(caja);
    const disponible = caja.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (disponible > 0 && ancho(larga) > disponible + 2) {
      malos.push(`"${larga}" necesita ${Math.round(ancho(larga))}px y su caja (${desc(caja)}) tiene ${Math.round(disponible)}px`);
      if (malos.length >= 8) break;
    }
  }
  return malos;
}
"""

# Textos encimados (rectángulos de texto de elementos distintos que se cruzan)
JS_ENCIMADOS = r"""
() => {
  const { desc, visible, conTexto, enContenedorFijo } = window.__aud;
  const cajas = [];
  const rango = document.createRange();
  for (const el of conTexto()) {
    if (!visible(el) || enContenedorFijo(el)) continue;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !n.textContent.trim()) continue;
      rango.selectNodeContents(n);
      for (const r of rango.getClientRects()) {
        if (r.width > 2 && r.height > 2) cajas.push({ el, r: { t: r.top + scrollY, b: r.bottom + scrollY, l: r.left, rt: r.right } });
      }
    }
  }
  cajas.sort((a, b) => a.r.t - b.r.t);
  const malos = [];
  const vistos = new Set();
  for (let i = 0; i < cajas.length; i++) {
    const a = cajas[i];
    for (let j = i + 1; j < cajas.length && cajas[j].r.t < a.r.b; j++) {
      const b = cajas[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = Math.min(a.r.rt, b.r.rt) - Math.max(a.r.l, b.r.l);
      const y = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
      // margen: las líneas de texto vecinas se tocan por el interlineado
      if (x > 3 && y > Math.min(a.r.b - a.r.t, b.r.b - b.r.t) * 0.35) {
        const k = desc(a.el) + '|' + desc(b.el);
        if (vistos.has(k)) continue;
        vistos.add(k);
        malos.push(`${desc(a.el)} "${a.el.textContent.trim().slice(0, 24)}" ⟷ ${desc(b.el)} "${b.el.textContent.trim().slice(0, 24)}"`);
        if (malos.length >= 8) return malos;
      }
    }
  }
  return malos;
}
"""

# Áreas táctiles: candidatos menores de 44 px (se confirma después con el puntero)
JS_TACTILES = r"""
async () => {
  const { desc, texto, visible } = window.__aud;
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [tabindex]:not([tabindex="-1"])';
  const malos = [], enTexto = [];
  const vistos = new Set();
  for (let el of document.querySelectorAll(sel)) {
    if (el.matches('input[type=checkbox], input[type=radio]')) {
      el = el.closest('label') || document.querySelector(`label[for="${el.id}"]`) || el;
    }
    if (vistos.has(el) || !visible(el)) continue;
    vistos.add(el);
    if (el.closest('.ventana, .visor, [data-capa]') && !el.closest('dialog[open]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 44 && r.height >= 44) continue;
    // Excepción WCAG 2.5.8: enlaces dentro de un párrafo de texto
    if (el.tagName === 'A') {
      const padre = el.parentElement;
      const conMasTexto = padre && [...padre.childNodes].some((n) => n !== el && n.nodeType === 3 && n.textContent.trim().length > 2);
      if (conMasTexto && getComputedStyle(el).display === 'inline') { enTexto.push(texto(el)); continue; }
    }
    // ¿El área real (con pseudo-elementos o etiqueta) alcanza 44 × 44?
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    await new Promise((ok) => requestAnimationFrame(ok));
    const q = el.getBoundingClientRect();
    const cx = q.left + q.width / 2, cy = q.top + q.height / 2;
    const puntos = [[cx, cy], [cx - 21, cy], [cx + 21, cy], [cx, cy - 21], [cx, cy + 21]];
    const alcanza = puntos.every(([x, y]) => {
      const t = document.elementFromPoint(x, y);
      return t && (t === el || el.contains(t) || (el.tagName === 'LABEL' && t.closest('label') === el));
    });
    if (!alcanza) malos.push(`${desc(el)} "${texto(el) || el.getAttribute('aria-label') || ''}" ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  scrollTo({ top: 0, behavior: 'instant' });
  return { malos, enTexto };
}
"""

# Datos para consistencia
JS_CONSISTENCIA = r"""
() => {
  const { desc, visible } = window.__aud;
  const px = (v) => Math.round(parseFloat(v) * 10) / 10;
  const st = (el) => getComputedStyle(el);
  const titulos = {};
  for (const n of ['h1', 'h2', 'h3']) {
    titulos[n] = [...document.querySelectorAll(`main ${n}`)].filter(visible).map((el) => {
      const s = st(el);
      return { clase: desc(el), tam: px(s.fontSize), peso: s.fontWeight, familia: s.fontFamily.split(',')[0].replace(/"/g, ''), alto: px(s.lineHeight) };
    });
  }
  const secciones = [...document.querySelectorAll('main .seccion')].filter(visible).map((el) => ({
    clase: desc(el), arriba: px(st(el).paddingTop), abajo: px(st(el).paddingBottom)
  }));
  const botones = [...document.querySelectorAll('.boton')].filter(visible).map((el) => {
    const s = st(el);
    const svg = el.querySelector('svg');
    return {
      clase: [...el.classList].filter((c) => c.startsWith('boton--')).sort().join(' ') || 'boton',
      alto: Math.round(el.getBoundingClientRect().height), radio: s.borderTopLeftRadius,
      letra: px(s.fontSize), peso: s.fontWeight, icono: svg ? Math.round(svg.getBoundingClientRect().width) : null
    };
  });
  const etiquetas = [...document.querySelectorAll('main .etiqueta')].filter(visible).map((el) => {
    const s = st(el);
    return { tam: px(s.fontSize), espaciado: s.letterSpacing, mayus: s.textTransform };
  });
  return { titulos, secciones, botones, etiquetas };
}
"""

# Contraste con CSS; devuelve además los textos sobre fotos/degradados para medir con píxeles
JS_CONTRASTE = r"""
() => {
  const { desc, visible, conTexto } = window.__aud;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 1;
  const cx = lienzo.getContext('2d', { willReadFrequently: true });
  const color = (c) => {
    // El navegador convierte cualquier formato (color(srgb…), color-mix, etc.) a píxeles
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000'; cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a: a / 255 };
  };
  const mezcla = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => {
    const k = [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

  // Fondo real: capas de los ancestros; si hay imagen/degradado o algo encima que no es ancestro → "complejo"
  const fondo = (el) => {
    const capas = [];
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.backgroundImage !== 'none' && !p.classList.contains('solo-lectores')) return { complejo: true };
      const c = color(s.backgroundColor);
      if (c.a > 0) { capas.push(c); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (const c of capas.reverse()) base = mezcla(c, base);
    // ¿Hay un elemento que no es ancestro debajo del texto (foto, superposición)?
    const r = el.getBoundingClientRect();
    const pila = document.elementsFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    for (const otro of pila) {
      if (otro === el || el.contains(otro) || otro.contains(el)) continue;
      const s = getComputedStyle(otro);
      if (s.backgroundImage !== 'none' || color(s.backgroundColor).a > 0 || otro.tagName === 'IMG') return { complejo: true };
    }
    return { color: base };
  };

  const resultados = [], complejos = [];
  let n = 0;
  for (const el of conTexto()) {
    if (!visible(el)) continue;
    if (el.closest('.logo, [aria-hidden="true"]')) continue;                    // logotipos y decoración
    if (el.closest('button:disabled, [aria-disabled="true"], :disabled')) continue;  // controles inactivos
    const s = getComputedStyle(el);
    const tam = parseFloat(s.fontSize), peso = parseInt(s.fontWeight, 10);
    const grande = tam >= 24 || (tam >= 18.66 && peso >= 700);
    const minimo = grande ? 3 : 4.5;
    let fg = color(s.color);
    let op = 1;
    for (let p = el; p; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity);
    fg = { ...fg, a: fg.a * op };
    // centrar el elemento en pantalla para mirar qué hay debajo
    const r0 = el.getBoundingClientRect();
    if (r0.top < 0 || r0.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const f = fondo(el);
    const textoEl = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (f.complejo) {
      el.dataset.audContraste = String(n);
      complejos.push({ id: n++, fg, minimo, texto: textoEl, desc: desc(el) });
      continue;
    }
    const real = mezcla(fg, f.color);
    const rz = ratio(real, f.color);
    if (rz < minimo) resultados.push({ desc: desc(el), texto: textoEl, ratio: Math.round(rz * 100) / 100, minimo, fg: hex(real), bg: hex(f.color), tam });
  }
  scrollTo({ top: 0, behavior: 'instant' });

  // Marcador de los campos (placeholder) y bordes de controles (contraste no textual 3:1)
  const campos = [];
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    const f = fondo(el.parentElement);
    const fondoCampo = mezcla(color(s.backgroundColor), f.complejo ? { r: 255, g: 255, b: 255, a: 1 } : f.color);
    const borde = mezcla(color(s.borderTopColor), fondoCampo);
    const exterior = f.complejo ? { r: 255, g: 255, b: 255, a: 1 } : f.color;
    const rb = Math.max(ratio(borde, exterior), ratio(fondoCampo, exterior));
    if (parseFloat(s.borderTopWidth) > 0 && rb < 3) campos.push({ desc: desc(el), tipo: 'borde', ratio: Math.round(rb * 100) / 100, minimo: 3, fg: hex(borde), bg: hex(exterior) });
    if (el.placeholder) {
      const ps = getComputedStyle(el, '::placeholder');
      const pc = color(ps.color);
      const real = mezcla({ ...pc, a: pc.a * parseFloat(ps.opacity || 1) }, fondoCampo);
      const rz = ratio(real, fondoCampo);
      if (rz < 4.5) campos.push({ desc: desc(el), tipo: 'placeholder', ratio: Math.round(rz * 100) / 100, minimo: 4.5, fg: hex(real), bg: hex(fondoCampo) });
    }
  }
  return { resultados, complejos, campos };
}
"""

JS_SEMANTICA = r"""
() => {
  const { desc, texto, visible } = window.__aud;
  const h = [];
  // alt
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) h.push(['error', `imagen sin alt: ${img.getAttribute('src')}`]);
  for (const s of document.querySelectorAll('svg[role="img"]')) if (!s.getAttribute('aria-label') && !s.querySelector('title')) h.push(['error', `svg role=img sin nombre: ${desc(s)}`]);
  // nombre accesible
  const nombre = (el) => {
    if (el.getAttribute('aria-labelledby')) return el.getAttribute('aria-labelledby').split(' ').map((i) => document.getElementById(i)?.textContent || '').join(' ').trim();
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
    if (el.labels && el.labels.length) return [...el.labels].map((l) => l.textContent).join(' ').trim();
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return (el.getAttribute('title') || '').trim();
    const t = (el.textContent || '').trim();
    if (t) return t;
    const img = el.querySelector('img[alt]');
    return img ? img.alt.trim() : (el.getAttribute('title') || '').trim();
  };
  for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    if (!nombre(el)) h.push(['error', `campo sin label: ${desc(el)}${el.placeholder ? ` (solo placeholder "${el.placeholder}")` : ''}`]);
  }
  for (const el of document.querySelectorAll('a[href], button, [role=button], [role=tab], summary')) {
    if (!nombre(el)) h.push(['error', `${el.tagName.toLowerCase()} sin nombre accesible: ${desc(el)}`]);
  }
  // La etiqueta visible debe estar dentro del nombre accesible (WCAG 2.5.3)
  for (const el of document.querySelectorAll('a[href][aria-label], button[aria-label]')) {
    const copia = el.cloneNode(true);
    copia.querySelectorAll('[aria-hidden="true"], .solo-lectores').forEach((x) => x.remove());
    document.body.append(copia); copia.style.cssText += ';position:absolute;left:-9999px';
    const vis = (copia.innerText || '').trim().replace(/\s+/g, ' ').toLowerCase();
    copia.remove();
    const acc = el.getAttribute('aria-label').toLowerCase();
    if (vis && vis.length > 2 && !acc.includes(vis)) h.push(['aviso', `el nombre accesible "${el.getAttribute('aria-label')}" no incluye el texto visible "${vis}" (${desc(el)})`]);
  }
  // títulos
  const hs = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((x) => !x.closest('[hidden], dialog:not([open]), template'));
  const h1 = hs.filter((x) => x.tagName === 'H1');
  if (h1.length !== 1) h.push(['error', `${h1.length} títulos h1 (debe haber 1)`]);
  let prev = 0;
  for (const x of hs) {
    const n = +x.tagName[1];
    if (prev && n > prev + 1) h.push(['error', `salto de título: h${prev} → h${n} ("${texto(x)}")`]);
    prev = n;
  }
  // estructura
  if (!document.documentElement.lang) h.push(['error', 'falta lang en <html>']);
  const mains = document.querySelectorAll('main');
  if (mains.length !== 1) h.push(['error', `${mains.length} elementos <main>`]);
  const ids = {};
  for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
  for (const [id, n] of Object.entries(ids)) if (n > 1) h.push(['error', `id repetido: #${id} (${n} veces)`]);
  for (const el of document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls]')) {
    for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      const v = el.getAttribute(a);
      if (v) for (const id of v.split(/\s+/)) if (!document.getElementById(id)) h.push(['error', `${a}="${id}" no existe (${desc(el)})`]);
    }
  }
  // aria-label en elementos sin rol (axe: aria-prohibited-attr)
  for (const el of document.querySelectorAll('div[aria-label], span[aria-label], p[aria-label]')) {
    if (!el.getAttribute('role')) h.push(['error', `aria-label en ${el.tagName.toLowerCase()} sin rol (no se anuncia): ${desc(el)}`]);
  }
  // listas: ul/ol solo con li
  for (const l of document.querySelectorAll('ul, ol')) {
    for (const c of l.children) if (!['LI', 'SCRIPT', 'TEMPLATE'].includes(c.tagName)) { h.push(['error', `${l.tagName.toLowerCase()} con hijo ${c.tagName.toLowerCase()} (${desc(l)})`]); break; }
  }
  // tabindex positivo
  for (const el of document.querySelectorAll('[tabindex]')) if (+el.getAttribute('tabindex') > 0) h.push(['error', `tabindex positivo: ${desc(el)}`]);
  // enlaces sin href (no se pueden rastrear ni enfocar)
  for (const a of document.querySelectorAll('a:not([href])')) h.push(['aviso', `<a> sin href: ${desc(a)} "${texto(a)}"`]);
  return h;
}
"""

# Foco: estilos sin foco de todos los elementos enfocables (para comparar)
JS_ESTILO_SIN_FOCO = r"""
() => {
  const props = ['outlineStyle', 'outlineWidth', 'outlineColor', 'boxShadow', 'backgroundColor', 'borderColor', 'textDecorationLine', 'color'];
  window.__sinFoco = new Map();
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')) {
    // el elemento y hasta 3 contenedores (anillo en la tarjeta o en el grupo del campo)
    for (let p = el, n = 0; p && n < 4; p = p.parentElement, n++) {
      if (window.__sinFoco.has(p)) continue;
      const s = getComputedStyle(p);
      window.__sinFoco.set(p, props.map((k) => s[k]).join('|'));
    }
  }
}
"""

JS_FOCO_ACTUAL = r"""
() => {
  const { desc, texto, enContenedorFijo } = window.__aud;
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  const props = ['outlineStyle', 'outlineWidth', 'outlineColor', 'boxShadow', 'backgroundColor', 'borderColor', 'textDecorationLine', 'color'];
  const ahora = props.map((p) => s[p]).join('|');
  const antes = window.__sinFoco?.get(el);
  let contorno = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  // ¿Cambió el contorno, la sombra o el borde de algún contenedor cercano?
  for (let p = el.parentElement, n = 0; p && n < 3 && !contorno; p = p.parentElement, n++) {
    const sp = getComputedStyle(p);
    const ahoraP = props.map((k) => sp[k]).join('|');
    const antesP = window.__sinFoco?.get(p);
    if (antesP !== undefined && antesP !== ahoraP) contorno = true;
  }
  const r = el.getBoundingClientRect();
  let oculto = r.width < 1 || r.height < 1 || s.visibility === 'hidden';
  for (let p = el; p && !oculto; p = p.parentElement) {
    const sp = getComputedStyle(p);
    if (sp.opacity === '0' || sp.visibility === 'hidden' || sp.display === 'none') oculto = true;
  }
  const fuera = r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth;
  return {
    desc: desc(el), texto: texto(el) || el.getAttribute('aria-label') || '',
    visibleFoco: contorno || (antes !== undefined && antes !== ahora),
    oculto, fuera, y: r.top + scrollY, fijo: enContenedorFijo(el)
  };
}
"""

# Imágenes y recursos (rendimiento)
JS_IMAGENES = r"""
() => {
  const h = [];
  const alto = innerHeight;
  for (const img of document.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (!img.getAttribute('width') || !img.getAttribute('height')) h.push(['error', `imagen sin width/height: ${src}`]);
    const r = img.getBoundingClientRect();
    const arriba = r.top + scrollY < alto;
    if (!arriba && img.loading !== 'lazy') h.push(['aviso', `imagen fuera de la primera pantalla sin loading="lazy": ${src}`]);
    if (arriba && img.loading === 'lazy') h.push(['aviso', `imagen en la primera pantalla con loading="lazy" (retrasa el LCP): ${src}`]);
  }
  const prioridad = [...document.querySelectorAll('[fetchpriority="high"]')];
  const fuentes = [...document.querySelectorAll('link[href*="fonts.googleapis.com/css"]')].map((l) => l.href);
  const preconnect = [...document.querySelectorAll('link[rel=preconnect]')].map((l) => l.href);
  // carga sin bloquear: media="print" que pasa a "all" con onload (al terminar ya dice "all")
  const bloqueantes = [...document.querySelectorAll('link[rel=stylesheet]')].filter((l) => (!l.media || l.media === 'all') && !(l.getAttribute('onload') || '').includes('media')).map((l) => l.href);
  return {
    hallazgos: h,
    prioridad: prioridad.map((e) => `${e.tagName.toLowerCase()} ${e.getAttribute('src') || e.getAttribute('href') || ''}`),
    fuentes, preconnect, bloqueantes,
    modulos: [...document.querySelectorAll('script[type=module]')].map((s) => s.getAttribute('src')),
    precargas: [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => l.getAttribute('href'))
  };
}
"""

JS_SEO = r"""
() => {
  const m = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
  return {
    titulo: document.title,
    descripcion: m('meta[name=description]'),
    robots: m('meta[name=robots]'),
    ogTitulo: m('meta[property="og:title"]'), ogDesc: m('meta[property="og:description"]'),
    ogImagen: m('meta[property="og:image"]'), ogAncho: m('meta[property="og:image:width"]'), ogAlto: m('meta[property="og:image:height"]'),
    ogUrl: m('meta[property="og:url"]'), ogTipo: m('meta[property="og:type"]'),
    twitter: m('meta[name="twitter:card"]'),
    canonica: document.querySelector('link[rel=canonical]')?.href || '',
    favicon: [...document.querySelectorAll('link[rel~=icon]')].map((l) => l.getAttribute('href')),
    apple: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href') || '',
    viewport: m('meta[name=viewport]'),
    lang: document.documentElement.lang,
    pagina: document.body.dataset.pagina || ''
  };
}
"""

JS_ENLACES = r"""
() => ({
  enlaces: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
  ids: [...document.querySelectorAll('[id]')].map((e) => e.id)
})
"""

JS_MOVIMIENTO = r"""
() => {
  const { desc } = window.__aud;
  const malos = [];
  const seg = (v) => Math.max(...v.split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x))));
  for (const el of document.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const s = getComputedStyle(el, pseudo);
      const t = seg(s.transitionDuration), a = s.animationName !== 'none' ? seg(s.animationDuration) : 0;
      if (t > 0.02 || a > 0.02) { malos.push(`${desc(el)}${pseudo || ''}: transición ${s.transitionDuration}, animación ${s.animationName} ${s.animationDuration}`); break; }
    }
    if (malos.length >= 8) break;
  }
  const ocultos = [...document.querySelectorAll('[data-aparecer]')].filter((el) => parseFloat(getComputedStyle(el).opacity) < 1).map(desc);
  return { malos, ocultos: ocultos.slice(0, 6), scroll: getComputedStyle(document.documentElement).scrollBehavior };
}
"""

JS_MARCAS = r"""
() => {
  // Textos [EJEMPLO] y [POR DEFINIR] visibles o en atributos, con su contexto
  const out = [];
  const re = /\[(EJEMPLO|POR DEFINIR)\]/;
  const caminante = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let n = caminante.nextNode(); n; n = caminante.nextNode()) {
    if (!re.test(n.textContent) || n.parentElement.closest('script, style, noscript')) continue;
    let bloque = n.parentElement.closest('p, li, h1, h2, h3, h4, dd, dt, td, figcaption, summary, label, button, a, span, div') || n.parentElement;
    const seccion = n.parentElement.closest('section, header, footer, aside, dialog, details, [data-seccion]');
    let titulo = '';
    if (seccion) titulo = (seccion.querySelector('h1, h2, h3, summary')?.textContent || seccion.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const zona = n.parentElement.closest('[data-header], .pie, footer') ? 'header/footer' : (titulo || '');
    out.push({ zona, texto: bloque.textContent.trim().replace(/\s+/g, ' ').slice(0, 220) });
  }
  for (const el of document.querySelectorAll('[alt], [title], [aria-label], meta[content], [placeholder]')) {
    for (const a of ['alt', 'title', 'aria-label', 'content', 'placeholder']) {
      const v = el.getAttribute(a);
      if (v && re.test(v)) out.push({ zona: `atributo ${a}`, texto: v.slice(0, 220) });
    }
  }
  return out;
}
"""


# ---------------------------------------------------------------------------
# Ayudas
# ---------------------------------------------------------------------------
def nuevo_contexto(nav, ancho, sesion=None, movimiento=None, alto=None):
    ctx = nav.new_context(viewport={'width': ancho, 'height': alto or (800 if ancho < 768 else 900)},
                          device_scale_factor=1, locale='es-VE', reduced_motion=movimiento or 'no-preference',
                          has_touch=ancho < 768)
    activar_fuentes(ctx)
    if sesion:
        ctx.add_init_script(script_sesion(sesion))
    ctx.add_init_script(JS_UTIL)
    return ctx


def abrir(ctx, base, ruta, consola=None):
    pg = ctx.new_page()
    if consola is not None:
        pg.on('console', lambda m: m.type == 'error' and consola.append(f'consola: {m.text}'))
        pg.on('pageerror', lambda e: consola.append(f'JS: {e}'))
    resp = pg.goto(base + ruta, wait_until='load', timeout=30000)
    pg.wait_for_timeout(350)
    try:
        pg.evaluate('document.fonts.ready')
    except Exception:
        pass
    return pg, (resp.status if resp else None)


def recorrer(pg):
    capturas.recorrer(pg)


def lum(c):
    def k(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * k(c[0]) + 0.7152 * k(c[1]) + 0.0722 * k(c[2])


def razon(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)


def contraste_pixeles(pg, item):
    """Mide el contraste de un texto sobre foto/degradado con los píxeles reales."""
    if Image is None:
        return None
    sel = f'[data-aud-contraste="{item["id"]}"]'
    loc = pg.locator(sel)
    if not loc.count():
        return None
    try:
        loc.scroll_into_view_if_needed(timeout=3000)
        caja = loc.bounding_box()
    except Exception:
        return None
    if not caja:
        return None
    tapado = pg.evaluate(f"""() => {{ const e = document.querySelector('{sel}'); const r = e.getBoundingClientRect();
        const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !(t && (t === e || e.contains(t) || t.contains(e))); }}""")
    if tapado:
        return None
    # recortar al área visible (textos en barras fijas o más altos que la pantalla)
    vista = pg.viewport_size
    x, y = max(0, caja['x']), max(0, caja['y'])
    ancho = min(caja['x'] + caja['width'], vista['width']) - x
    alto = min(caja['y'] + caja['height'], vista['height']) - y
    if ancho < 2 or alto < 2:
        return None
    caja = {'x': x, 'y': y, 'width': ancho, 'height': alto}
    pg.evaluate(f"""() => {{ const e = document.querySelector('{sel}');
        e.dataset.audColor = e.style.color; e.style.setProperty('color', 'transparent', 'important');
        e.style.setProperty('text-shadow', 'none', 'important'); }}""")
    png = pg.screenshot(clip=caja, animations='disabled')
    pg.evaluate(f"""() => {{ const e = document.querySelector('{sel}');
        e.style.color = e.dataset.audColor; e.style.removeProperty('text-shadow'); }}""")
    im = Image.open(BytesIO(png)).convert('RGB')
    im.thumbnail((120, 60))
    fg = item['fg']
    valores = []
    for px in im.getdata():
        real = tuple(fg[c] * fg['a'] + px[i] * (1 - fg['a']) for i, c in enumerate('rgb'))
        valores.append(razon(real, px))
    valores.sort()
    return valores[max(0, int(len(valores) * 0.1) - 1)]   # percentil 10: el peor fondo real


def cobertura_js(cdp, tamanos):
    """Bytes de JavaScript cargados y sin usar durante la carga (como Lighthouse)."""
    res = cdp.send('Profiler.takePreciseCoverage')['result']
    salida = []
    for script in res:
        url = script['url']
        if not url or url.startswith('chrome') or 'fonts.' in url:
            continue
        total = tamanos.get(url)
        if not total:
            continue
        usado = bytearray(total)
        rangos = sorted((r for f in script['functions'] for r in f['ranges']),
                        key=lambda r: (r['startOffset'], -r['endOffset']))
        for r in rangos:
            v = 1 if r['count'] > 0 else 0
            usado[r['startOffset']:min(r['endOffset'], total)] = bytes([v]) * (min(r['endOffset'], total) - r['startOffset'])
        sin_usar = usado.count(0)
        salida.append((urlparse(url).path, total, sin_usar))
    return salida


# Curvas de Lighthouse (móvil) para un puntaje aproximado
CURVAS = {'FCP': (1800, 3000, 0.10), 'SI': (3387, 5800, 0.10), 'LCP': (2500, 4000, 0.25),
          'TBT': (200, 600, 0.30), 'CLS': (0.1, 0.25, 0.25)}


def puntaje_metrica(valor, p10, mediana):
    if valor <= 0:
        return 1.0
    # log-normal: puntaje = 1 - CDF
    mu = math.log(mediana)
    sigma = (math.log(mediana) - math.log(p10)) / 1.2815515655446004   # z del percentil 10
    z = (math.log(valor) - mu) / sigma
    return max(0.0, min(1.0, 0.5 * math.erfc(z / math.sqrt(2))))


JS_METRICAS_INICIO = r"""
window.__met = { lcp: 0, cls: 0, tbt: 0, fcp: 0, largas: [] };
new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__met.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__met.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__met.largas.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__met.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
"""


def simular_movil(nav, base, ruta, sesion=None):
    """Carga en frío con 4G lento (150 ms, 1,6 Mbps) y CPU 4x, como el móvil de PageSpeed."""
    ctx = nav.new_context(viewport={'width': 412, 'height': 823}, device_scale_factor=1.75, is_mobile=True,
                          has_touch=True, locale='es-VE')
    activar_fuentes(ctx)
    if sesion:
        ctx.add_init_script(script_sesion(sesion))
    ctx.add_init_script(JS_METRICAS_INICIO)
    pg = ctx.new_page()
    cdp = ctx.new_cdp_session(pg)
    cdp.send('Network.enable')
    cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
    cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150,
                                                  'downloadThroughput': 1.6 * 1024 * 1024 / 8,
                                                  'uploadThroughput': 750 * 1024 / 8})
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    pesos = {'total': 0, 'n': 0}

    def al_terminar(params):
        pesos['total'] += params.get('encodedDataLength', 0)
        pesos['n'] += 1
    cdp.on('Network.loadingFinished', al_terminar)
    pg.goto(base + ruta, wait_until='load', timeout=60000)
    pg.wait_for_timeout(3500)
    m = pg.evaluate('window.__met')
    ctx.close()
    fcp, lcp, cls = m['fcp'], m['lcp'] or m['fcp'], m['cls']
    tbt = sum(max(0, d - 50) for (t, d) in m['largas'] if t >= fcp)
    si = (fcp + lcp) / 2   # aproximación del Speed Index
    valores = {'FCP': fcp, 'LCP': lcp, 'TBT': tbt, 'CLS': cls, 'SI': si}
    puntaje = sum(puntaje_metrica(valores[k], p10, med) * peso for k, (p10, med, peso) in CURVAS.items())
    return {**valores, 'puntaje': round(puntaje * 100), 'kb': round(pesos['total'] / 1024), 'peticiones': pesos['n']}


# ---------------------------------------------------------------------------
# Revisiones por bloque
# ---------------------------------------------------------------------------
def bloque_diseno(nav, base, paginas, anchos, inf):
    for ruta, sesion in paginas:
        for ancho in anchos:
            ctx = nuevo_contexto(nav, ancho, sesion)
            consola = []
            pg, estado = abrir(ctx, base, ruta, consola)
            recorrer(pg)
            d = pg.evaluate(JS_DESBORDE)
            if d['total'] > d['ancho']:
                inf.agregar(1, 'error', ruta, f"scroll horizontal {d['total']}px > {d['ancho']}px: {', '.join(d['culpables'])}", ancho)
            for c in pg.evaluate(JS_CORTES):
                inf.agregar(1, 'error', ruta, f'texto cortado: {c}', ancho)
            for c in pg.evaluate(JS_PALABRAS):
                inf.agregar(1, 'error', ruta, f'palabra que no cabe: {c}', ancho)
            for c in pg.evaluate(JS_ENCIMADOS):
                inf.agregar(1, 'error', ruta, f'textos encimados: {c}', ancho)
            t = pg.evaluate(JS_TACTILES)
            for c in t['malos']:
                inf.agregar(1, 'error', ruta, f'área táctil menor de 44px: {c}', ancho)
            if t['enTexto'] and ancho == 375:
                inf.agregar(1, 'info', ruta, f"enlaces dentro de texto (exentos, WCAG 2.5.8): {len(t['enTexto'])}", ancho)
            if ancho in (375, 1440):
                inf.datos.setdefault('consistencia', {})[(ruta, ancho)] = pg.evaluate(JS_CONSISTENCIA)
            es404 = ruta == '/esta-pagina-no-existe'
            for e in consola:
                if es404 and '404' in e:
                    continue
                inf.agregar(6, 'error', ruta, e, ancho)
            if estado not in (200, 304) and not (es404 and estado == 404):
                inf.agregar(6, 'error', ruta, f'HTTP {estado}', ancho)
            ctx.close()
        print(f'  diseño ✓ {ruta}')


def bloque_consistencia(inf):
    datos = inf.datos.get('consistencia', {})
    if not datos:
        return
    for ancho in (375, 1440):
        por_titulo = defaultdict(lambda: defaultdict(set))
        for (ruta, a), d in datos.items():
            if a != ancho or ruta in ('/admin',):
                continue
            for n, lista in d['titulos'].items():
                for t in lista:
                    clave = f"{t['tam']}px {t['familia']} {t['peso']}"
                    por_titulo[n][clave].add(f"{ruta} {t['clase']}")
        for n, variantes in por_titulo.items():
            if len(variantes) > 1:
                detalle = '; '.join(f"{k} ← {', '.join(sorted(v)[:4])}{'…' if len(v) > 4 else ''}" for k, v in sorted(variantes.items(), key=lambda x: -len(x[1])))
                inf.agregar(2, 'aviso', '(todo el sitio)', f'{n} con {len(variantes)} estilos: {detalle}', ancho)
        secciones = defaultdict(set)
        for (ruta, a), d in datos.items():
            if a != ancho:
                continue
            for s in d['secciones']:
                secciones[f"{s['arriba']}/{s['abajo']}px"].add(ruta)
        if len(secciones) > 2:
            inf.agregar(2, 'aviso', '(todo el sitio)', 'espacio entre secciones (arriba/abajo): ' + '; '.join(f"{k} ← {', '.join(sorted(v)[:5])}" for k, v in secciones.items()), ancho)
        botones = defaultdict(lambda: defaultdict(set))
        for (ruta, a), d in datos.items():
            if a != ancho or ruta == '/admin':
                continue
            for b in d['botones']:
                botones[b['clase']][f"alto {b['alto']} · radio {b['radio']} · letra {b['letra']} · ícono {b['icono']}"].add(ruta)
        for clase, variantes in botones.items():
            if len(variantes) > 1:
                inf.agregar(2, 'aviso', '(todo el sitio)', f'botón "{clase}" con {len(variantes)} medidas: ' + '; '.join(f"{k} ← {', '.join(sorted(v)[:3])}" for k, v in variantes.items()), ancho)
        etiquetas = defaultdict(set)
        for (ruta, a), d in datos.items():
            if a != ancho:
                continue
            for e in d['etiquetas']:
                etiquetas[f"{e['tam']}px {e['espaciado']} {e['mayus']}"].add(ruta)
        if len(etiquetas) > 1:
            inf.agregar(2, 'aviso', '(todo el sitio)', 'etiquetas (.etiqueta) con estilos distintos: ' + '; '.join(f"{k} ← {', '.join(sorted(v)[:4])}" for k, v in etiquetas.items()), ancho)
    # tabla completa para revisar a mano
    inf.datos['consistencia_tabla'] = {f'{r} @{a}': d for (r, a), d in datos.items()}


def bloque_accesibilidad(nav, base, paginas, inf):
    for ruta, sesion in paginas:
        for ancho in (375, 1440):
            ctx = nuevo_contexto(nav, ancho, sesion)
            pg, _ = abrir(ctx, base, ruta)
            recorrer(pg)
            if ancho == 375:
                for nivel, texto in pg.evaluate(JS_SEMANTICA):
                    inf.agregar(3, nivel, ruta, texto)
            c = pg.evaluate(JS_CONTRASTE)
            for r in c['resultados']:
                inf.agregar(3, 'error', ruta, f"contraste {r['ratio']}:1 (mín. {r['minimo']}) {r['fg']} sobre {r['bg']} · {r['desc']} \"{r['texto']}\"", ancho)
            for r in c['campos']:
                nombre = 'borde de campo' if r['tipo'] == 'borde' else 'placeholder'
                inf.agregar(3, 'error', ruta, f"contraste de {nombre} {r['ratio']}:1 (mín. {r['minimo']}) {r['fg']} sobre {r['bg']} · {r['desc']}", ancho)
            for item in c['complejos']:
                rz = contraste_pixeles(pg, item)
                if rz is not None and rz < item['minimo']:
                    inf.agregar(3, 'error', ruta, f"contraste sobre foto/degradado {rz:.2f}:1 (mín. {item['minimo']}) · {item['desc']} \"{item['texto']}\"", ancho)
            # Orden de foco y foco visible
            pg.evaluate('scrollTo(0, 0)')
            pg.evaluate(JS_ESTILO_SIN_FOCO)
            pg.mouse.click(1, 1)
            vistos, anterior, sin_foco, ocultos, saltos = [], None, [], [], []
            for _ in range(160):
                pg.keyboard.press('Tab')
                f = pg.evaluate(JS_FOCO_ACTUAL)
                if not f:
                    continue
                clave = f['desc'] + f['texto']
                if vistos and clave == vistos[0]:
                    break
                vistos.append(clave)
                if f['oculto']:
                    ocultos.append(f"{f['desc']} \"{f['texto']}\"")
                elif not f['visibleFoco']:
                    sin_foco.append(f"{f['desc']} \"{f['texto']}\"")
                if anterior and not f['fijo'] and not anterior['fijo'] and f['y'] < anterior['y'] - 150:
                    saltos.append(f"{anterior['desc']} → {f['desc']} \"{f['texto']}\" (sube {round(anterior['y'] - f['y'])}px)")
                anterior = f
            for x in dict.fromkeys(ocultos):
                inf.agregar(3, 'error', ruta, f'el foco llega a un elemento invisible: {x}', ancho)
            for x in dict.fromkeys(sin_foco):
                inf.agregar(3, 'error', ruta, f'foco sin indicador visible: {x}', ancho)
            for x in saltos[:5]:
                inf.agregar(3, 'aviso', ruta, f'orden de foco salta hacia arriba: {x}', ancho)
            inf.datos.setdefault('tabs', {})[f'{ruta} @{ancho}'] = len(vistos)
            ctx.close()
        print(f'  accesibilidad ✓ {ruta}')


def bloque_teclado(nav, base, inf):
    """Recorridos con teclado: menú, buscador, galería, acordeones y ventanas."""
    def foco(pg):
        return pg.evaluate('document.activeElement && (document.activeElement.getAttribute("aria-label") || document.activeElement.className || document.activeElement.tagName)')

    def tab_hasta(pg, selector, maximo=60):
        pg.evaluate('scrollTo(0,0)')
        pg.mouse.click(1, 1)
        for _ in range(maximo):
            pg.keyboard.press('Tab')
            if pg.evaluate(f'document.activeElement && document.activeElement.matches({json.dumps(selector)})'):
                return True
        return False

    # Menú móvil
    ctx = nuevo_contexto(nav, 375)
    pg, _ = abrir(ctx, base, '/')
    if not tab_hasta(pg, '[data-abrir-menu]'):
        inf.agregar(3, 'error', '/', 'teclado: no se llega con Tab al botón del menú', 375)
    else:
        pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        abierto = pg.evaluate('document.querySelector("[data-abrir-menu]").getAttribute("aria-expanded")') == 'true'
        dentro = pg.evaluate('!!document.activeElement.closest("#menu-movil")')
        fuera = 0
        for _ in range(25):
            pg.keyboard.press('Tab')
            if not pg.evaluate('!!document.activeElement.closest("#menu-movil")'):
                fuera += 1
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        vuelve = pg.evaluate('document.activeElement.matches("[data-abrir-menu]")')
        cerrado = pg.evaluate('document.querySelector("[data-abrir-menu]").getAttribute("aria-expanded")') == 'false'
        estado = {'se abre con Enter': abierto, 'el foco entra al menú': dentro, 'el foco no se escapa': fuera == 0,
                  'Esc lo cierra': cerrado, 'el foco vuelve al botón': vuelve}
        for k, ok in estado.items():
            if not ok:
                inf.agregar(3, 'error', '/', f'teclado en menú móvil: falla "{k}"', 375)
        inf.datos.setdefault('teclado', {})['menú móvil'] = estado
    # Buscador
    if tab_hasta(pg, '[data-abrir-buscador]'):
        pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        en_campo = pg.evaluate('document.activeElement.matches("input[type=search], #campo-buscador")')
        pg.keyboard.type('novias'); pg.wait_for_timeout(400)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        vuelve = pg.evaluate('document.activeElement.matches("[data-abrir-buscador]")')
        estado = {'el foco va al campo': en_campo, 'Esc cierra y devuelve el foco': vuelve}
        for k, ok in estado.items():
            if not ok:
                inf.agregar(3, 'error', '/', f'teclado en buscador: falla "{k}"', 375)
        inf.datos.setdefault('teclado', {})['buscador'] = estado
    ctx.close()

    # Galería y visor
    for ancho in (375, 1440):
        ctx = nuevo_contexto(nav, ancho)
        pg, _ = abrir(ctx, base, '/galeria')
        sel_foto = '.galeria-masonry button, [data-abrir-visor], .foto-galeria button, .foto-galeria'
        disparador = pg.evaluate("""() => { const b = document.querySelector('[data-indice], .galeria__foto button, .foto button, main button[data-foto]'); return b ? (b.className || b.tagName) : null }""")
        if not tab_hasta(pg, '[data-indice], main .galeria__boton, main button[data-foto]', 80):
            inf.agregar(3, 'error', '/galeria', f'teclado: no se llega con Tab a una foto de la galería ({disparador})', ancho)
            ctx.close()
            continue
        pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
        abierto = pg.evaluate('!!document.querySelector("dialog[open], .visor:not([hidden]), [data-visor][open]")')
        contador1 = pg.evaluate('document.querySelector("[data-visor-contador]")?.textContent || ""')
        pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(400)
        contador2 = pg.evaluate('document.querySelector("[data-visor-contador]")?.textContent || ""')
        dentro = pg.evaluate('!!document.activeElement.closest("dialog[open], .visor")')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        cerrado = not pg.evaluate('!!document.querySelector("dialog[open]")')
        vuelve = pg.evaluate('document.activeElement.matches("[data-indice], main .galeria__boton, main button[data-foto]")')
        estado = {'Enter abre el visor': abierto, 'flecha → pasa a la siguiente': contador1 != contador2 and bool(contador2),
                  'el foco queda en el visor': dentro, 'Esc cierra': cerrado, 'el foco vuelve a la foto': vuelve}
        for k, ok in estado.items():
            if not ok:
                inf.agregar(3, 'error', '/galeria', f'teclado en galería: falla "{k}"', ancho)
        inf.datos.setdefault('teclado', {})[f'galería @{ancho}'] = estado
        # chips de filtro
        if tab_hasta(pg, 'main .chip', 40):
            antes = pg.evaluate('document.activeElement.getAttribute("aria-pressed")')
            pg.keyboard.press('Space'); pg.wait_for_timeout(200)
            if tab_hasta(pg, 'main .chip:not([aria-pressed="true"])', 40):
                pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
                ok = pg.evaluate('document.activeElement.getAttribute("aria-pressed")') == 'true'
                inf.datos['teclado'][f'chips galería @{ancho}'] = {'Enter filtra': ok}
                if not ok:
                    inf.agregar(3, 'error', '/galeria', 'teclado: los chips de la galería no se activan con Enter', ancho)
        ctx.close()

    # Acordeones (ficha del curso) y desplegables (cursos anteriores)
    slug = paginas_del_sitio()[1][2].split('/')[-1]
    for ruta, sel in ((f'/cursos/{slug}', 'summary.acordeon__resumen'), ('/cursos-anteriores', 'summary.anterior__abrir')):
        ctx = nuevo_contexto(nav, 375)
        pg, _ = abrir(ctx, base, ruta)
        if not tab_hasta(pg, sel, 120):
            inf.agregar(3, 'error', ruta, f'teclado: no se llega con Tab a {sel}', 375)
            ctx.close()
            continue
        estado0 = pg.evaluate('document.activeElement.parentElement.open')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
        estado1 = pg.evaluate('document.activeElement.parentElement.open')
        pg.keyboard.press('Space'); pg.wait_for_timeout(300)
        estado2 = pg.evaluate('document.activeElement.parentElement.open')
        estado = {'Enter abre/cierra': estado0 != estado1, 'Espacio abre/cierra': estado1 != estado2}
        for k, ok in estado.items():
            if not ok:
                inf.agregar(3, 'error', ruta, f'teclado en acordeón: falla "{k}"', 375)
        inf.datos.setdefault('teclado', {})[f'acordeón {ruta}'] = estado
        ctx.close()

    # Ventana "Inscribirme" sin sesión
    ctx = nuevo_contexto(nav, 375)
    pg, _ = abrir(ctx, base, f'/cursos/{slug}')
    if tab_hasta(pg, '[data-inscribirme]', 150):
        pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
        abierto = pg.evaluate('!!document.querySelector("dialog[open]")')
        dentro = pg.evaluate('!!document.activeElement.closest("dialog[open]")')
        for _ in range(6):
            pg.keyboard.press('Tab')
        sigue = pg.evaluate('!!document.activeElement.closest("dialog[open]")')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        vuelve = pg.evaluate('document.activeElement.matches("[data-inscribirme]")')
        estado = {'Enter abre la ventana': abierto, 'el foco entra': dentro, 'el foco no se escapa': sigue, 'Esc cierra y devuelve el foco': vuelve}
        for k, ok in estado.items():
            if not ok:
                inf.agregar(3, 'error', f'/cursos/{slug}', f'teclado en ventana Inscribirme: falla "{k}"', 375)
        inf.datos.setdefault('teclado', {})['ventana Inscribirme'] = estado
    ctx.close()
    print('  teclado ✓')


def bloque_rendimiento(nav, base, paginas, inf):
    # Imágenes del repositorio
    for f in sorted((RAIZ / 'fotos').rglob('*')) if (RAIZ / 'fotos').exists() else []:
        if f.is_file() and f.stat().st_size > 250 * 1024:
            inf.agregar(4, 'error', '(archivos)', f'imagen de {f.stat().st_size // 1024} KB (> 250 KB): {f.relative_to(RAIZ)}')
    # Plantillas que generan <img> sin width/height
    for f in list(RAIZ.glob('js/*.js')) + list(RAIZ.glob('*.html')):
        for m in re.finditer(r'<img\b[^>]*>', f.read_text(encoding='utf-8')):
            etiqueta = m.group(0)
            if 'width=' not in etiqueta or 'height=' not in etiqueta:
                inf.agregar(4, 'error', '(código)', f'{f.name}: <img> sin width/height: {etiqueta[:90]}')
            if 'loading="lazy"' not in etiqueta and 'fetchpriority' not in etiqueta and 'visor' not in etiqueta and f.name != 'guia-de-estilo.js':
                inf.agregar(4, 'aviso', '(código)', f'{f.name}: <img> sin loading="lazy" ni fetchpriority: {etiqueta[:90]}')

    resumen_js = {}
    for ruta, sesion in paginas:
        ctx = nuevo_contexto(nav, 375, sesion)
        pg = ctx.new_page()
        cdp = ctx.new_cdp_session(pg)
        cdp.send('Profiler.enable')
        cdp.send('Profiler.startPreciseCoverage', {'callCount': True, 'detailed': True})
        tamanos, grandes = {}, []

        def respuesta(r, tamanos=tamanos, grandes=grandes):
            try:
                cuerpo = r.body()
            except Exception:
                return
            tamanos[r.url] = len(cuerpo)
            tipo = r.headers.get('content-type', '')
            if tipo.startswith('image/') and len(cuerpo) > 250 * 1024:
                grandes.append(f'{urlparse(r.url).path} ({len(cuerpo) // 1024} KB)')
        pg.on('response', respuesta)
        pg.goto(base + ruta, wait_until='load')
        pg.wait_for_timeout(600)
        info = pg.evaluate(JS_IMAGENES)
        for nivel, texto in info['hallazgos']:
            inf.agregar(4, nivel, ruta, texto)
        for g in grandes:
            inf.agregar(4, 'error', ruta, f'imagen de más de 250 KB: {g}')
        heroe = [p for p in info['prioridad']]
        if ruta == '/' and not heroe:
            if pg.locator('.hero__media img').count():
                inf.agregar(4, 'error', ruta, 'la foto del hero no tiene fetchpriority="high"')
            else:
                inf.agregar(4, 'info', ruta, 'el hero aún no tiene foto (placeholder); cuando llegue va con fetchpriority="high" (ver index.html)')
        if len(heroe) > 1:
            inf.agregar(4, 'error', ruta, f'fetchpriority="high" en más de un elemento: {heroe}')
        if ruta != '/' and heroe and not ruta.startswith('/cursos/'):
            inf.agregar(4, 'aviso', ruta, f'fetchpriority="high" fuera del hero: {heroe}')
        for href in info['fuentes']:
            if 'display=swap' not in href:
                inf.agregar(4, 'error', ruta, 'Google Fonts sin display=swap')
        if info['fuentes'] and not any('fonts.gstatic.com' in p for p in info['preconnect']):
            inf.agregar(4, 'aviso', ruta, 'falta preconnect a fonts.gstatic.com')
        for b in info['bloqueantes']:
            if 'fonts.googleapis.com' in b:
                inf.agregar(4, 'aviso', ruta, 'la hoja de Google Fonts bloquea el primer pintado (se puede cargar sin bloquear)')
        for c in info['precargas']:
            pass
        for archivo, total, sin_usar in cobertura_js(cdp, tamanos):
            resumen_js.setdefault(archivo, []).append((ruta, total, sin_usar))
        ctx.close()
    # JavaScript: archivos cargados y porcentaje sin usar en la carga
    lineas = []
    for archivo, usos in sorted(resumen_js.items()):
        total = usos[0][1]
        peor = max(u[2] for u in usos)
        lineas.append(f'{archivo}: {total // 1024 or 1} KB sin comprimir, hasta {round(100 * peor / total)}% sin usar al cargar ({len(usos)} páginas)')
        if peor > 20 * 1024 * 3.5:   # Lighthouse avisa desde ~20 KB transferidos (≈ 70 KB sin comprimir)
            inf.agregar(4, 'aviso', '(JS)', f'{archivo}: más de 20 KB comprimidos sin usar en la carga')
    inf.datos['js'] = lineas
    # Simulación móvil
    inf.datos['movil'] = {}
    for ruta, sesion in paginas:
        if ruta == '/esta-pagina-no-existe':
            continue
        m = simular_movil(nav, base, ruta, sesion)
        inf.datos['movil'][ruta] = m
        nivel = 'error' if m['puntaje'] < 90 else 'info'
        inf.agregar(4, nivel, ruta, f"simulación móvil ≈ {m['puntaje']}: FCP {m['FCP'] / 1000:.1f}s · LCP {m['LCP'] / 1000:.1f}s · TBT {m['TBT']:.0f}ms · CLS {m['CLS']:.3f} · {m['kb']} KB en {m['peticiones']} peticiones")
    print('  rendimiento ✓')


def bloque_seo(nav, base, paginas, publicas, inf):
    titulos = defaultdict(list)
    ctx = nuevo_contexto(nav, 1440)
    for ruta, sesion in paginas:
        if sesion:
            continue
        pg, _ = abrir(ctx, base, ruta)
        d = pg.evaluate(JS_SEO)
        pg.close()
        privada = ruta in ('/registro', '/ingresar', '/esta-pagina-no-existe')
        titulos[d['titulo']].append(ruta)
        if not d['titulo']:
            inf.agregar(5, 'error', ruta, 'sin <title>')
        elif len(d['titulo']) > 65:
            inf.agregar(5, 'aviso', ruta, f"título largo ({len(d['titulo'])} caracteres): {d['titulo']}")
        if not d['descripcion']:
            inf.agregar(5, 'error', ruta, 'sin meta description')
        elif not 50 <= len(d['descripcion']) <= 160:
            inf.agregar(5, 'aviso', ruta, f"descripción de {len(d['descripcion'])} caracteres (ideal 50–160): {d['descripcion']}")
        if not privada:
            for k in ('ogTitulo', 'ogDesc', 'ogImagen', 'ogUrl', 'twitter'):
                if not d[k]:
                    inf.agregar(5, 'error', ruta, f'falta {k}')
            if d['ogImagen'] and not d['ogImagen'].startswith('https://'):
                inf.agregar(5, 'error', ruta, f"og:image no es una URL absoluta: {d['ogImagen']}")
            if not d['canonica']:
                inf.agregar(5, 'aviso', ruta, 'sin link rel=canonical')
        if not d['favicon']:
            inf.agregar(5, 'error', ruta, 'sin favicon')
        if not d['apple']:
            inf.agregar(5, 'aviso', ruta, 'sin apple-touch-icon')
        if 'noindex' not in d['robots']:
            inf.agregar(5, 'info', ruta, 'sin meta robots noindex (la vista previa lo bloquea por encabezado)')
    ctx.close()
    for t, rutas in titulos.items():
        if len(rutas) > 1:
            inf.agregar(5, 'error', '(todo el sitio)', f'título repetido "{t}": {", ".join(rutas)}')
    # Archivos
    for archivo in ('favicon.svg', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml'):
        if not (RAIZ / archivo).is_file():
            inf.agregar(5, 'error', '(archivos)', f'falta /{archivo}')
    og = RAIZ / 'fotos' / 'og' / 'vcorrea-og.jpg'
    if og.is_file() and Image:
        tam = Image.open(og).size
        if tam != (1200, 630):
            inf.agregar(5, 'error', '(archivos)', f'imagen Open Graph de {tam[0]}x{tam[1]} (debe ser 1200x630)')
    mapa = RAIZ / 'sitemap.xml'
    if mapa.is_file():
        try:
            ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            urls = [u.text for u in ET.parse(mapa).getroot().findall('s:url/s:loc', ns)]
            rutas = {urlparse(u).path or '/' for u in urls}
            for p in publicas:
                if p not in rutas:
                    inf.agregar(5, 'error', '(sitemap)', f'falta {p} en sitemap.xml')
            for r in rutas - set(publicas):
                inf.agregar(5, 'error', '(sitemap)', f'sitemap.xml incluye una página que no es pública: {r}')
            for r in rutas:
                code = urllib.request.urlopen(base + r).status
                if code != 200:
                    inf.agregar(5, 'error', '(sitemap)', f'{r} responde {code}')
        except Exception as e:
            inf.agregar(5, 'error', '(sitemap)', f'sitemap.xml inválido: {e}')
    robots = (RAIZ / 'robots.txt').read_text() if (RAIZ / 'robots.txt').is_file() else ''
    if 'Sitemap:' not in robots:
        inf.agregar(5, 'aviso', '(archivos)', 'robots.txt no indica la ubicación de sitemap.xml')
    print('  SEO ✓')


def bloque_enlaces(nav, base, paginas, inf):
    ids_por_ruta, enlaces = {}, defaultdict(set)
    for ruta, sesion in paginas:
        ctx = nuevo_contexto(nav, 1440, sesion)
        pg, _ = abrir(ctx, base, ruta)
        recorrer(pg)
        d = pg.evaluate(JS_ENLACES)
        ids_por_ruta[ruta] = set(d['ids'])
        for h in d['enlaces']:
            enlaces[h].add(ruta)
        ctx.close()
    externos = set()
    for href, origen in sorted(enlaces.items()):
        if href.startswith(('mailto:', 'tel:')):
            continue
        u = urlparse(href)
        if u.scheme in ('http', 'https') and u.netloc and '127.0.0.1' not in u.netloc:
            externos.add(u.netloc)
            continue
        if href.startswith('#'):
            for o in origen:
                if href != '#' and href[1:].split('/')[0] not in ids_por_ruta.get(o, set()) and o != '/admin':
                    inf.agregar(6, 'error', o, f'ancla rota: {href}')
            continue
        ruta = u.path or '/'
        try:
            code = urllib.request.urlopen(base + ruta).status
        except urllib.error.HTTPError as e:
            code = e.code
        if code != 200:
            inf.agregar(6, 'error', ', '.join(sorted(origen)), f'enlace roto ({code}): {href}')
        elif u.fragment:
            destino = ruta.rstrip('/') or '/'
            if destino in ids_por_ruta and u.fragment not in ids_por_ruta[destino]:
                inf.agregar(6, 'error', ', '.join(sorted(origen)), f'ancla rota: {href}')
    inf.datos['externos'] = sorted(externos)
    print('  enlaces ✓')


def bloque_movimiento(nav, base, paginas, inf):
    for ruta, sesion in paginas:
        ctx = nuevo_contexto(nav, 375, sesion, movimiento='reduce')
        pg, _ = abrir(ctx, base, ruta)
        d = pg.evaluate(JS_MOVIMIENTO)
        for m in d['malos']:
            inf.agregar(7, 'error', ruta, f'con movimiento reducido sigue animando: {m}')
        if d['ocultos']:
            inf.agregar(7, 'error', ruta, f"con movimiento reducido hay contenido que espera una animación para aparecer: {', '.join(d['ocultos'])}")
        if d['scroll'] == 'smooth':
            inf.agregar(7, 'error', ruta, 'scroll-behavior: smooth con movimiento reducido')
        ctx.close()
    # JavaScript que desplaza con animación
    for f in RAIZ.glob('js/*.js'):
        t = f.read_text(encoding='utf-8')
        if re.search(r"behavior:\s*'smooth'", t) and 'prefers-reduced-motion' not in t and 'reducirMovimiento' not in t:
            inf.agregar(7, 'error', '(código)', f"{f.name}: usa behavior: 'smooth' sin revisar prefers-reduced-motion")
        if re.search(r'\.animate\(', t) and 'prefers-reduced-motion' not in t and 'reducirMovimiento' not in t:
            inf.agregar(7, 'error', '(código)', f'{f.name}: usa element.animate() sin revisar prefers-reduced-motion')
    print('  movimiento ✓')


def inventario_marcas(nav, base, paginas):
    """[EJEMPLO] y [POR DEFINIR] por página (incluye ventanas y desplegables cerrados)."""
    salida = {}
    ctx = nuevo_contexto(nav, 1440)
    for ruta, sesion in paginas:
        if ruta == '/esta-pagina-no-existe':
            continue
        c = nuevo_contexto(nav, 1440, sesion) if sesion else ctx
        pg, _ = abrir(c, base, ruta)
        recorrer(pg)
        salida[ruta] = pg.evaluate(JS_MARCAS)
        pg.close()
        if sesion:
            c.close()
    ctx.close()
    return salida


# ---------------------------------------------------------------------------
# Informe
# ---------------------------------------------------------------------------
def escribir_informe(inf, marcas, bloques, nombre='informe'):
    SALIDA.mkdir(parents=True, exist_ok=True)
    lineas = ['# Auditoría del sitio', '']
    total = defaultdict(int)
    for b, nivel, *_ in inf.items:
        total[(b, nivel)] += 1
    lineas.append('| Bloque | Errores | Avisos |')
    lineas.append('|---|---|---|')
    for b in bloques:
        lineas.append(f"| {b}. {NOMBRES_BLOQUE[b]} | {total[(b, 'error')]} | {total[(b, 'aviso')]} |")
    lineas.append('')
    for b in bloques:
        items = [i for i in inf.items if i[0] == b]
        lineas.append(f'## {b}. {NOMBRES_BLOQUE[b]}')
        if not items:
            lineas.append('Sin hallazgos.')
        agrupado = defaultdict(list)
        for _, nivel, pagina, ancho, texto in items:
            agrupado[(nivel, texto)].append(f'{pagina}{f" @{ancho}" if ancho else ""}')
        for (nivel, texto), donde in sorted(agrupado.items(), key=lambda x: {'error': 0, 'aviso': 1, 'info': 2}[x[0][0]]):
            marca = {'error': '✗', 'aviso': '!', 'info': '·'}[nivel]
            lineas.append(f"- {marca} {texto}  \n  _{', '.join(donde[:6])}{f' y {len(donde) - 6} más' if len(donde) > 6 else ''}_")
        if b == 3 and inf.datos.get('teclado'):
            lineas.append('\n**Teclado:**')
            for k, v in inf.datos['teclado'].items():
                lineas.append(f"- {k}: " + ', '.join(f"{'✓' if ok else '✗'} {n}" for n, ok in v.items()))
        if b == 4 and inf.datos.get('js'):
            lineas.append('\n**JavaScript por archivo:**')
            lineas += [f'- {x}' for x in inf.datos['js']]
        if b == 6 and inf.datos.get('externos'):
            lineas.append(f"\nDominios externos enlazados: {', '.join(inf.datos['externos'])}")
        lineas.append('')
    if marcas:
        lineas.append('## Textos [EJEMPLO] y [POR DEFINIR]')
        for ruta, lista in marcas.items():
            unicos = list(dict.fromkeys((m['zona'], m['texto']) for m in lista))
            if not unicos:
                continue
            lineas.append(f'\n### {ruta}')
            for zona, texto in unicos:
                lineas.append(f'- {f"({zona}) " if zona else ""}{texto}')
    (SALIDA / f'{nombre}.md').write_text('\n'.join(lineas) + '\n', encoding='utf-8')
    (SALIDA / f'{nombre}.json').write_text(json.dumps({'hallazgos': inf.items, 'datos': {k: v for k, v in inf.datos.items() if k != 'consistencia'},
                                                   'marcas': marcas}, ensure_ascii=False, indent=1, default=str), encoding='utf-8')
    return SALIDA / f'{nombre}.md'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--bloques', default='1,2,3,4,5,6,7', help='Bloques a revisar, ej. 1,3')
    ap.add_argument('--paginas', nargs='*', help='Solo estas rutas')
    ap.add_argument('--anchos', default=','.join(map(str, ANCHOS)))
    ap.add_argument('--sin-marcas', action='store_true', help='No listar [EJEMPLO]/[POR DEFINIR]')
    ap.add_argument('--informe', default='informe', help='Nombre del informe (para correr bloques en paralelo)')
    a = ap.parse_args()
    bloques = [int(x) for x in a.bloques.split(',')]
    anchos = [int(x) for x in a.anchos.split(',')]
    paginas, publicas = paginas_del_sitio()
    if a.paginas:
        paginas = [p for p in paginas if p[0] in a.paginas]
    srv, base = iniciar_servidor()
    inf = Informe()
    with sync_playwright() as p:
        nav = p.chromium.launch()
        if 1 in bloques or 2 in bloques or 6 in bloques:
            print('▸ Diseño, consistencia y consola')
            bloque_diseno(nav, base, paginas, anchos, inf)
            bloque_consistencia(inf)
        if 3 in bloques:
            print('▸ Accesibilidad')
            bloque_accesibilidad(nav, base, paginas, inf)
            bloque_teclado(nav, base, inf)
        if 4 in bloques:
            print('▸ Rendimiento')
            bloque_rendimiento(nav, base, paginas, inf)
        if 5 in bloques:
            print('▸ SEO')
            bloque_seo(nav, base, paginas, publicas, inf)
        if 6 in bloques:
            print('▸ Enlaces')
            bloque_enlaces(nav, base, paginas, inf)
        if 7 in bloques:
            print('▸ Movimiento')
            bloque_movimiento(nav, base, paginas, inf)
        marcas = {} if a.sin_marcas else inventario_marcas(nav, base, paginas)
        nav.close()
    srv.shutdown()
    archivo = escribir_informe(inf, marcas, bloques, a.informe)
    errores = inf.errores()
    print(f'\n{len(errores)} errores, {sum(1 for i in inf.items if i[1] == "aviso")} avisos → {archivo.relative_to(RAIZ)}')
    return 1 if errores else 0


if __name__ == '__main__':
    sys.exit(main())
