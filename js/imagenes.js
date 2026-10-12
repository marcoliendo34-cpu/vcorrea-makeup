// Comprime fotos en el navegador antes de subirlas a Supabase Storage.
// Solo lo usa el panel del superadmin (js/admin-editor.js).
//
// Cada foto sale en WebP (BRIEF §6: grande 1200 px, miniatura 600 px). Si el
// navegador no sabe crear WebP (algunos Safari), sale en JPEG. Nunca se agranda
// una foto más chica que el ancho pedido.

export const TIPOS_ACEPTADOS = 'image/jpeg,image/png,image/webp';
const LIMITE = 4.5 * 1024 * 1024;   // el bucket acepta 5 MB

/** Abre la imagen respetando la orientación de la cámara. */
async function abrir(archivo) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* se intenta con <img> */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const aBlob = (canvas, tipo, calidad) => new Promise((ok) => canvas.toBlob(ok, tipo, calidad));

/** Dibuja la imagen a `ancho` px y la codifica (WebP o, si no se puede, JPEG). */
async function codificar(fuente, ancho, alto) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';   // un PNG con transparencia no queda negro en JPEG
  ctx.fillRect(0, 0, ancho, alto);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fuente, 0, 0, ancho, alto);
  for (const calidad of [0.82, 0.7, 0.55]) {
    let blob = await aBlob(canvas, 'image/webp', calidad);
    if (!blob || blob.type !== 'image/webp') blob = await aBlob(canvas, 'image/jpeg', calidad);
    if (blob && blob.size <= LIMITE) return blob;
  }
  return null;
}

/**
 * Prepara una foto en varios anchos.
 * @param {File} archivo
 * @param {number[]} [anchos=[1200, 600]]  Del más grande al más chico.
 * @returns {Promise<{versiones: {ancho:number, alto:number, blob:Blob, extension:string}[], error:null}|{versiones:null, error:'formato'|'muy-grande'}>}
 */
export async function prepararImagen(archivo, anchos = [1200, 600]) {
  if (!archivo || !/^image\/(jpeg|png|webp)$/.test(archivo.type)) return { versiones: null, error: 'formato' };
  let fuente;
  try { fuente = await abrir(archivo); } catch { return { versiones: null, error: 'formato' }; }
  const anchoOriginal = fuente.width;
  const altoOriginal = fuente.height;
  if (!anchoOriginal || !altoOriginal) return { versiones: null, error: 'formato' };

  const versiones = [];
  for (const pedido of anchos) {
    const ancho = Math.min(pedido, anchoOriginal);
    const alto = Math.round(altoOriginal * ancho / anchoOriginal);
    const blob = await codificar(fuente, ancho, alto);
    if (!blob) return { versiones: null, error: 'muy-grande' };
    versiones.push({ ancho, alto, blob, extension: blob.type === 'image/webp' ? 'webp' : 'jpg' });
  }
  fuente.close?.();
  return { versiones, error: null };
}

/** Nombre único para un archivo nuevo (sin acentos ni espacios). */
export function nombreUnico() {
  const azar = Math.random().toString(36).slice(2, 7);
  return `${Date.now().toString(36)}-${azar}`;
}

/** "1,2 MB" o "340 KB". */
export function peso(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString('es-VE', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
