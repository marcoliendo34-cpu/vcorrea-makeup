// Acceso a datos centralizado. Las páginas SOLO piden datos aquí.
// Fase 1: modo 'demo' con /data/*.js. Fase 2: se agrega la fuente Supabase
// con las mismas funciones, sin tocar las páginas.
// [Se completa en el paso de cursos.]

import { CONFIG } from './config.js';

export const modo = () => CONFIG.modoDatos;
