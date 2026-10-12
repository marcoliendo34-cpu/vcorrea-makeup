// Usado por herramientas/prueba_flujos.py (modo supabase). No se publica.
// Cliente FALSO de supabase-js v2, solo para probar js/sesion-supabase.js y
// js/datos-supabase.js sin red. Imita la forma de las respuestas ({ data, error })
// y las reglas principales de la base (trigger de perfil, inscripción siempre
// pendiente, cupo lleno). Guarda todo en localStorage para sobrevivir a las
// navegaciones. NO se publica.
const { CURSOS } = await import(location.origin + '/data/cursos.js');
const { GALERIA } = await import(location.origin + '/data/galeria.js');

const CLAVE_DB = 'falso:db';
const uuid = () => crypto.randomUUID();

function semilla() {
  const cursos = CURSOS.map((c) => ({
    id: uuid(), slug: c.slug, nombre: c.nombre, nombre_corto: c.nombreCorto ?? null, subtitulo: c.subtitulo,
    categoria: c.categoria, nivel: c.nivel, modalidad: c.modalidad, ubicacion: c.ubicacion,
    portada: c.imagenPortada?.src ? c.imagenPortada : null, fecha_inicio: c.fechaInicio, fecha_fin: c.fechaFin,
    dias: c.dias, horario: c.horario, semanas: c.semanas, total_clases: c.totalClases, calendario: c.calendario ?? [],
    cupos: c.cupos, descripcion: c.descripcion, dirigido_a: c.dirigidoA ?? [], destacados: c.destacados ?? null,
    incluye: c.incluye, pensum: c.pensum, practicas: c.practicas, requisitos: c.requisitos, certificado: c.certificado,
    precio_usd: String(c.precioUSD), condiciones_pago: c.condicionesPago, preguntas: c.preguntas ?? [],
    estado: c.estado, galeria: c.galeria ?? [], egresadas: c.egresadas, publicado: true, archivado: false,
    creado_en: new Date().toISOString(), actualizado_en: new Date().toISOString()
  }));
  const galeria = GALERIA.filter((f) => f.archivo).map((f, i) => ({
    id: uuid(), imagen: f.archivo, categoria: f.categoria, texto_alternativo: f.alt, orden: i + 1,
    ancho: f.ancho, alto: f.alto, destacada: f.destacada, en_anteriores: !!f.enAnteriores, publicado: true
  }));
  const usuarios = [
    { id: uuid(), email: 'alumna@demo.com', password: 'demo1234' },
    { id: uuid(), email: 'admin@demo.com', password: 'demo1234' },
    { id: uuid(), email: 'super@demo.com', password: 'demo1234' }
  ];
  const perfiles = [
    { id: usuarios[0].id, nombre: 'María', apellido: 'Pérez', cedula: 'V-12345678', telefono: '+584121234567', correo: 'alumna@demo.com', instagram: null, fecha_nacimiento: null, rol: 'alumna', creado_en: new Date().toISOString() },
    { id: usuarios[1].id, nombre: 'Verónica', apellido: 'Correa', cedula: 'V-99999999', telefono: '+584145897775', correo: 'admin@demo.com', instagram: null, fecha_nacimiento: null, rol: 'admin', creado_en: new Date().toISOString() },
    { id: usuarios[2].id, nombre: 'Marco', apellido: 'Liendo', cedula: 'V-88888888', telefono: '+584120000000', correo: 'super@demo.com', instagram: null, fecha_nacimiento: null, rol: 'superadmin', creado_en: new Date().toISOString() }
  ];
  return { cursos, galeria, usuarios, perfiles, inscripciones: [], sesion: null, archivos: [] };
}

const leerDB = () => { try { return JSON.parse(localStorage.getItem(CLAVE_DB)) || semilla(); } catch { return semilla(); } };
const guardarDB = (db) => localStorage.setItem(CLAVE_DB, JSON.stringify(db));
const demora = (v) => new Promise((r) => setTimeout(() => r(v), 15));

/* ------------------------------ consultas ------------------------------ */

class Consulta {
  constructor(tabla) { this.tabla = tabla; this.filtros = []; this.op = 'select'; this.columnas = '*'; this.uno = null; this.devolver = false; }
  select(columnas = '*') { if (this.op === 'select') this.columnas = columnas; else { this.devolver = true; this.columnas = columnas; } return this; }
  eq(c, v) { this.filtros.push((f) => f[c] === v); return this; }
  order(c) { this.orden = c; return this; }
  insert(obj) { this.op = 'insert'; this.datos = obj; return this; }
  update(obj) { this.op = 'update'; this.datos = obj; return this; }
  delete() { this.op = 'delete'; return this; }
  single() { this.uno = 'single'; return this; }
  maybeSingle() { this.uno = 'maybe'; return this; }
  forma(db, fila) {
    const r = { ...fila };
    if (this.tabla === 'inscripciones' && /cursos\(/.test(this.columnas)) {
      const c = db.cursos.find((x) => x.id === fila.curso_id);
      r.cursos = c ? { slug: c.slug } : null;
    }
    return r;
  }
  ejecutar() {
    const db = leerDB();
    const filas = db[this.tabla];
    const yoPerfil = db.perfiles.find((p) => p.id === db.sesion?.user?.id);
    const esAdmin = yoPerfil && (yoPerfil.rol === 'admin' || yoPerfil.rol === 'superadmin');
    const esSuper = yoPerfil?.rol === 'superadmin';
    const publicas = ['cursos', 'galeria'].includes(this.tabla);
    let res;
    // RLS de cursos y galeria: lectura de lo publicado (admin ve todo); escritura solo superadmin
    if (publicas && this.op !== 'select') {
      if (this.op === 'insert' && !esSuper) return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
      if (this.op === 'insert') {
        const fila = { id: uuid(), creado_en: new Date().toISOString(), ...(this.tabla === 'cursos' ? { publicado: false, archivado: false, galeria: [], calendario: [], preguntas: [] } : { publicado: true }), ...this.datos };
        if (this.tabla === 'cursos' && filas.some((c) => c.slug === fila.slug)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "cursos_slug_key"' } };
        if (fila.archivado && fila.publicado) return { data: null, error: { code: '23514', message: 'check constraint cursos_archivado_no_publicado' } };
        filas.push(fila); guardarDB(db);
        res = [fila];
      } else {
        const blanco = esSuper ? filas.filter((x) => this.filtros.every((fn) => fn(x))) : [];
        if (this.op === 'delete') {
          db[this.tabla] = filas.filter((x) => !blanco.includes(x));
        } else {
          for (const f of blanco) {
            const nuevo = { ...f, ...this.datos };
            if (this.tabla === 'cursos' && filas.some((c) => c !== f && c.slug === nuevo.slug)) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "cursos_slug_key"' } };
            if (nuevo.archivado && nuevo.publicado) return { data: null, error: { code: '23514', message: 'check constraint cursos_archivado_no_publicado' } };
            Object.assign(f, this.datos, this.tabla === 'cursos' ? { actualizado_en: new Date().toISOString() } : {});
          }
        }
        guardarDB(db);
        res = blanco;
      }
    } else if (this.op === 'select') {
      res = filas.filter((f) => this.filtros.every((fn) => fn(f)))
        .filter((f) => !publicas || esAdmin || f.publicado);
      if (this.orden) res.sort((a, b) => (a[this.orden] > b[this.orden] ? 1 : -1));
    } else if (this.op === 'insert') {
      const yo = db.sesion?.user?.id;
      if (this.tabla === 'inscripciones') {
        const curso = db.cursos.find((c) => c.id === this.datos.curso_id);
        if (!curso?.publicado || curso.estado !== 'vigente') return { data: null, error: { code: 'P0001', message: 'Este curso no está abierto a inscripciones.' } };
        const alumna = this.datos.alumna_id ?? yo;
        if (alumna !== yo) return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
        if (db.inscripciones.some((i) => i.curso_id === curso.id && i.alumna_id === alumna)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        if (db.inscripciones.filter((i) => i.curso_id === curso.id && i.estado === 'confirmada').length >= curso.cupos) return { data: null, error: { code: 'P0001', message: 'Este curso acaba de agotarse.' } };
        const fila = { id: uuid(), curso_id: curso.id, alumna_id: alumna, estado: 'pendiente', nota: null, creado_en: new Date().toISOString(), confirmada_en: null };
        db.inscripciones.push(fila); guardarDB(db);
        res = [fila];
      }
    } else if (this.op === 'update') {
      const yo = db.perfiles.find((p) => p.id === db.sesion?.user?.id);
      const admin = yo && (yo.rol === 'admin' || yo.rol === 'superadmin');
      res = [];
      for (const f of filas.filter((x) => this.filtros.every((fn) => fn(x)))) {
        if (this.tabla === 'inscripciones') {
          if (!admin && !(f.alumna_id === yo?.id && f.estado === 'cancelada' && this.datos.estado === 'pendiente')) {
            return { data: null, error: { code: '42501', message: 'Solo Verónica puede cambiar el estado de una inscripción.' } };
          }
          if (!admin && f.estado === 'cancelada' && this.datos.estado === 'pendiente') {
            const curso = db.cursos.find((c) => c.id === f.curso_id);
            if (db.inscripciones.filter((i) => i.curso_id === f.curso_id && i.estado === 'confirmada').length >= curso.cupos) {
              return { data: null, error: { code: 'P0001', message: 'Este curso acaba de agotarse.' } };
            }
          }
          if (this.datos.estado === 'confirmada' && f.estado !== 'confirmada') {
            const curso = db.cursos.find((c) => c.id === f.curso_id);
            const ocupados = db.inscripciones.filter((i) => i.curso_id === f.curso_id && i.estado === 'confirmada').length;
            if (ocupados >= curso.cupos) return { data: null, error: { code: 'P0001', message: 'El curso ya está lleno: no quedan cupos para confirmar.' } };
            f.confirmada_en = new Date().toISOString();
          }
        }
        Object.assign(f, this.datos); res.push(f);
      }
      guardarDB(db);
    }
    res = (res || []).map((f) => this.forma(db, f));
    if (this.uno === 'single') return res.length === 1 ? { data: res[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    if (this.uno === 'maybe') return { data: res[0] ?? null, error: null };
    return { data: res, error: null };
  }
  then(ok, mal) { return demora(this.ejecutar()).then(ok, mal); }
}

/* -------------------------------- auth -------------------------------- */

const oyentes = new Set();
const avisar = (evento, sesion) => oyentes.forEach((cb) => cb(evento, sesion));

export function createClient(url) {
  return {
    from: (t) => new Consulta(t),
    // Storage: guarda solo la ruta (prueba_flujos.py sirve una foto cualquiera en la URL pública)
    storage: {
      from: (bucket) => ({
        async upload(ruta, blob) {
          const db = leerDB();
          const yo = db.perfiles.find((x) => x.id === db.sesion?.user?.id);
          if (yo?.rol !== 'superadmin') return demora({ data: null, error: { statusCode: '403', message: 'new row violates row-level security policy' } });
          if (blob.size > 5242880) return demora({ data: null, error: { statusCode: '413', message: 'The object exceeded the maximum allowed size' } });
          db.archivos.push({ bucket, ruta, tipo: blob.type, peso: blob.size }); guardarDB(db);
          return demora({ data: { path: ruta }, error: null });
        },
        getPublicUrl(ruta) { return { data: { publicUrl: `${url}/storage/v1/object/public/${bucket}/${ruta}` } }; },
        async remove(rutas) {
          const db = leerDB();
          db.archivos = db.archivos.filter((a) => !(a.bucket === bucket && rutas.includes(a.ruta))); guardarDB(db);
          return demora({ data: rutas.map((r) => ({ name: r })), error: null });
        }
      })
    },
    rpc: async (nombre, args) => {
      const db = leerDB();
      if (nombre === 'cupos_de_cursos') {
        return demora({ data: db.cursos.filter((c) => c.publicado).map((c) => {
          const n = db.inscripciones.filter((i) => i.curso_id === c.id && i.estado === 'confirmada').length;
          return { curso_id: c.id, slug: c.slug, cupos: c.cupos, confirmadas: n, restantes: Math.max(c.cupos - n, 0) };
        }), error: null });
      }
      if (nombre === 'cedula_registrada') return demora({ data: db.perfiles.some((p) => p.cedula === args.p_cedula), error: null });
      if (nombre === 'correo_registrado') return demora({ data: db.usuarios.some((u) => u.email === args.p_correo), error: null });
      return { data: null, error: { message: `rpc ${nombre} no existe` } };
    },
    auth: {
      async getSession() { return demora({ data: { session: leerDB().sesion }, error: null }); },
      async signUp({ email, password, options }) {
        const db = leerDB();
        if (db.usuarios.some((u) => u.email === email)) return { data: { user: null, session: null }, error: { code: 'user_already_exists', message: 'User already registered' } };
        const d = options?.data || {};
        if (db.perfiles.some((p) => p.cedula === d.cedula)) return { data: { user: null, session: null }, error: { message: 'Database error saving new user' } };
        const user = { id: uuid(), email };
        db.usuarios.push({ ...user, password });
        // trigger al_registrarse: siempre alumna
        db.perfiles.push({ id: user.id, nombre: d.nombre, apellido: d.apellido, cedula: d.cedula, telefono: d.telefono, correo: email, instagram: d.instagram || null, fecha_nacimiento: d.fecha_nacimiento || null, rol: 'alumna', creado_en: new Date().toISOString() });
        db.sesion = { user, access_token: 'falso' };
        guardarDB(db);
        avisar('SIGNED_IN', db.sesion);
        return demora({ data: { user, session: db.sesion }, error: null });
      },
      async signInWithPassword({ email, password }) {
        const db = leerDB();
        const u = db.usuarios.find((x) => x.email === email && x.password === password);
        if (!u) return demora({ data: { user: null, session: null }, error: { code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 } });
        db.sesion = { user: { id: u.id, email }, access_token: 'falso' };
        guardarDB(db);
        avisar('SIGNED_IN', db.sesion);
        return demora({ data: { user: db.sesion.user, session: db.sesion }, error: null });
      },
      async signOut() {
        const db = leerDB(); db.sesion = null; guardarDB(db);
        avisar('SIGNED_OUT', null);
        return demora({ error: null });
      },
      onAuthStateChange(cb) {
        oyentes.add(cb);
        setTimeout(() => cb('INITIAL_SESSION', leerDB().sesion), 0);
        return { data: { subscription: { unsubscribe: () => oyentes.delete(cb) } } };
      }
    }
  };
}
