// Cliente de Supabase (supabase-js v2, módulo ES desde jsDelivr).
// Solo lo cargan js/sesion-supabase.js y js/datos-supabase.js, y solo fuera del
// modo demo: las páginas nunca lo importan directamente.
//
// La URL y la llave publicable viven en js/config.js. La llave publicable es
// pública por diseño; lo que protege los datos son las reglas RLS de la base
// (supabase/migraciones). La llave secreta NUNCA va en el código de la web.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';

export const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.llavePublica, {
  auth: {
    persistSession: true,      // la sesión queda en este navegador
    autoRefreshToken: true,
    detectSessionInUrl: true,  // enlaces de confirmación de correo (paso 19)
    storageKey: 'vcorrea:auth'
  }
});
