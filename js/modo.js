// ¿Datos de demostración o Supabase?
//
// El modo demo existe SOLO en el espacio de trabajo: el servidor local de las
// capturas y la auditoría (localhost / 127.0.0.1). En cualquier dominio
// publicado (vcorrea-makeup.vercel.app o el dominio propio) la web usa
// Supabase siempre: este archivo no tiene forma de activar la demo ahí.
//
// En local se puede probar Supabase con ?supabase=1 (vale para esa pestaña;
// ?demo=1 vuelve a la demo).

const LOCALES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const CLAVE = 'vcorrea:forzar-supabase';

function calcularModoDemo() {
  if (typeof location === 'undefined') return false;
  if (!LOCALES.has(location.hostname)) return false;   // publicado: nunca demo
  try {
    const p = new URLSearchParams(location.search);
    if (p.has('supabase')) sessionStorage.setItem(CLAVE, '1');
    if (p.has('demo')) sessionStorage.removeItem(CLAVE);
    return sessionStorage.getItem(CLAVE) !== '1';
  } catch {
    return true;
  }
}

/** true solo en el espacio de trabajo (capturas). */
export const MODO_DEMO = calcularModoDemo();
