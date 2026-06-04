'use strict';
require('dotenv').config();

const express               = require('express');
const path                  = require('path');
const fs                    = require('fs');
const bcrypt                = require('bcryptjs');
const jwt                   = require('jsonwebtoken');
const PDFDocument            = require('pdfkit');
const { createClient }      = require('@supabase/supabase-js');
const { google }            = require('googleapis');

const app            = express();
const PORT           = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY  || '';
const SUPABASE_URL   = process.env.SUPABASE_URL         || '';
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY || '';
const JWT_SECRET     = process.env.JWT_SECRET           || 'bleaks-crm-secret';

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/^(?!\/api).*/, (_req, res, next) => {
  const idx = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(idx)) res.sendFile(idx); else next();
});

// ── JWT MIDDLEWARE ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada, inicia sesión de nuevo' });
  }
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

// Estado: ¿hay usuarios registrados?
app.get('/api/auth/status', async (_req, res) => {
  if (!supabase) return res.json({ hasUsers: false });
  const { data } = await supabase.from('users').select('id').limit(1);
  res.json({ hasUsers: (data || []).length > 0 });
});

// Primer acceso — crea el usuario admin (solo funciona si no hay ninguno)
app.post('/api/auth/setup', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  if (password.length < 6)    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const { data: existing } = await supabase.from('users').select('id').limit(1);
  if ((existing || []).length > 0) return res.status(403).json({ error: 'Ya existe una cuenta de administrador' });

  const hash = await bcrypt.hash(password, 12);
  const { error } = await supabase.from('users').insert({ username, password_hash: hash });
  if (error) return res.status(500).json({ error: error.message });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const { data: users } = await supabase
    .from('users').select('*').eq('username', username).limit(1);
  const user = users?.[0];
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username });
});

// ── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  let dbOk = false;
  if (supabase) {
    const { error } = await supabase.from('leads').select('id').limit(1);
    dbOk = !error;
  }
  res.json({ ok: true, googleMaps: !!GOOGLE_API_KEY, supabase: dbOk, version: '7.0.0' });
});

// ── HELPERS data ↔ Supabase ───────────────────────────────────────────────────

// Convierte el payload { leads, contacts, notes, statuses } → filas planas para Supabase
function toRows({ leads = [], contacts = {}, notes = {}, statuses = {} }) {
  return leads.map(l => ({
    id:       l.id,
    name:     l.name     || '',
    sector:   l.sector   || '',
    loc:      l.loc      || '',
    url:      l.url      || '',
    phone:    l.phone    || '',
    email:    l.email    || '',
    priority: l.priority || 'med',
    status:   statuses[l.id] || 'sin contactar',
    rating:   l.rating   ?? null,
    reviews:  l.reviews  || 0,
    flaws:    l.flaws    || [],
    saas:     l.saas     || [],
    source:   l.source   || 'manual',
    lat:      l.lat      ?? null,
    lng:      l.lng      ?? null,
    note:     notes[l.id]    || '',
    contacts: contacts[l.id] || {},
  }));
}

// Convierte filas de Supabase → el payload que espera el frontend
function fromRows(rows = []) {
  // Excluimos los campos que son solo de la DB del objeto lead
  const leads = rows.map(({ status, note, contacts, created_at, updated_at, ...rest }) => rest);
  const statuses = Object.fromEntries(rows.map(r => [r.id, r.status]));
  const notes    = Object.fromEntries(rows.map(r => [r.id, r.note || '']));
  const contacts = Object.fromEntries(rows.map(r => [r.id, r.contacts || {}]));
  return { leads, statuses, notes, contacts };
}

// ── DATOS — lectura ───────────────────────────────────────────────────────────
app.get('/api/data', requireAuth, async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase no configurado. Añade SUPABASE_URL y SUPABASE_SERVICE_KEY en .env' });
  }

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(fromRows(data || []));
});

// ── DATOS — escritura (sincronización completa) ───────────────────────────────
app.post('/api/data', requireAuth, async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase no configurado' });
  }

  try {
    const rows        = toRows(req.body);
    const incomingIds = new Set(rows.map(r => r.id));

    // 1. IDs actuales en la DB
    const { data: existing, error: fetchErr } = await supabase
      .from('leads')
      .select('id');
    if (fetchErr) throw new Error(fetchErr.message);

    // 2. Borrar leads que ya no existen en el cliente
    const toDelete = (existing || []).map(r => r.id).filter(id => !incomingIds.has(id));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('leads').delete().in('id', toDelete);
      if (delErr) throw new Error(delErr.message);
    }

    // 3. Upsert en lotes de 500
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await supabase
        .from('leads')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── SECTOR → 3 queries distintas (paralelas) × 2 páginas = hasta ~120 resultados
const SECTOR_QUERIES = {
  'Salud':        ['clínica médica salud',          'fisioterapia rehabilitación',    'dentista clínica dental'],
  'Veterinaria':  ['clínica veterinaria mascotas',  'veterinario animales',           'tienda animales acuario'],
  'Belleza':      ['peluquería salón belleza',       'estética spa masajes',           'barbería nail uñas'],
  'Hosteleria':   ['restaurante cocina comida',      'bar pub taberna',                'cafetería pastelería panadería'],
  'Retail':       ['tienda ropa moda complementos',  'comercio local boutique',        'zapatería calzado'],
  'Servicios':    ['fontanero electricista reformas','asesoría gestoría abogado',      'limpieza lavandería'],
  'Mecanica':     ['taller mecánico coches',         'reparación vehículos automóvil', 'taller chapa pintura'],
  'Optica':       ['óptica optometrista gafas',      'lentes contacto visión',         'audiología audífono'],
  'Inmobiliaria': ['inmobiliaria agencia pisos',     'alquiler apartamentos',          'promotora inmobiliaria'],
  'Academia':     ['academia formación clases',      'autoescuela carnet conducir',    'academia idiomas inglés'],
  '':             ['negocio comercio local',         'empresa servicios profesional',  'tienda establecimiento'],
};

// ── FLAW / SAAS maps (idénticos al original) ──────────────────────────────────
const FLAW_MAP = {
  'Veterinaria':  ['Sin cita online','Sin historial digital mascota','Sin recordatorio vacunas','Sin tienda online','Sin ficha Google'],
  'Salud':        ['Sin reserva online','Sin portal paciente','Sin recordatorio cita','Sin historial digital','Sin formulario valoración'],
  'Belleza':      ['Sin booking online','Sin catálogo precios','Sin galería trabajos','Sin fidelización','Solo WhatsApp manual'],
  'Hosteleria':   ['Sin menú digital','Sin reservas online','Sin pedidos online','Sin fidelización','Sin Google Business'],
  'Retail':       ['Sin tienda online','Sin catálogo digital','Sin gestión stock','Sin e-commerce','Sin presencia digital'],
  'Mecanica':     ['Sin cita online','Sin presupuesto digital','Sin historial reparaciones','Sin recordatorio ITV','Sin portal cliente'],
  'Optica':       ['Sin cita de graduación','Sin catálogo monturas online','Sin historial óptico','Sin tienda online','Web desactualizada'],
  'Inmobiliaria': ['Sin portal propio','Sin tour virtual','Sin calculadora hipotecaria','Sin CRM de leads','Sin automatización'],
  'Academia':     ['Sin gestión de alumnos','Sin reserva de clases online','Sin aula virtual','Sin pagos online','Web obsoleta'],
  'Servicios':    ['Sin web moderna','Sin solicitud presupuesto online','Sin CRM','Sin automatización','Sin Google Reviews'],
};

const SAAS_MAP = {
  'Veterinaria':  ['Cita online','Recordatorio vacunas SMS','Historial mascota SaaS','Tienda online','WhatsApp Business'],
  'Salud':        ['Agenda online','Recordatorio WhatsApp','Portal del paciente','Historial clínico SaaS','Email marketing'],
  'Belleza':      ['Booking Fresha/Treatwell','Recordatorio SMS','Galería Instagram','Programa puntos','Email marketing'],
  'Hosteleria':   ['Reservas CoverManager','Menú digital QR','Pedidos online','Fidelización digital','Google Business'],
  'Retail':       ['Tienda WooCommerce','Gestión inventario','Pago online','Email marketing','Catálogo digital'],
  'Mecanica':     ['Cita online','Presupuestador digital','Recordatorio ITV','Portal cliente','WhatsApp seguimiento'],
  'Optica':       ['Cita graduación online','Catálogo monturas web','Recordatorio revisión','Tienda online','Historial óptico'],
  'Inmobiliaria': ['Portal propiedades propio','Tour virtual 360°','CRM compradores','Calculadora hipoteca','Email marketing'],
  'Academia':     ['Plataforma e-learning','Reserva de clases','Pagos online','App alumnos','Seguimiento progreso'],
  'Servicios':    ['Web moderna','Presupuesto online','CRM clientes','Email marketing','Google Reviews automation'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function guessSector(type = '') {
  const t = type.toLowerCase();
  if (t.includes('veterinar') || t.includes('animal'))                   return 'Veterinaria';
  if (t.includes('fisio') || t.includes('clinic') || t.includes('dent') || t.includes('doctor') || t.includes('health')) return 'Salud';
  if (t.includes('hair') || t.includes('beauty') || t.includes('nail') || t.includes('spa'))  return 'Belleza';
  if (t.includes('restaurant') || t.includes('bar') || t.includes('cafe') || t.includes('food')) return 'Hosteleria';
  if (t.includes('car_repair') || t.includes('mechanic') || t.includes('auto'))               return 'Mecanica';
  if (t.includes('optic') || t.includes('optometr'))                     return 'Optica';
  if (t.includes('real_estate') || t.includes('inmob'))                  return 'Inmobiliaria';
  if (t.includes('school') || t.includes('driving') || t.includes('academ')) return 'Academia';
  if (t.includes('store') || t.includes('shop') || t.includes('retail')) return 'Retail';
  return 'Servicios';
}

const TYPE_LABEL = {
  veterinary_care:     'Salud - Veterinaria',
  dentist:             'Salud - Dental',
  doctor:              'Salud - Médico',
  physiotherapist:     'Salud - Fisioterapia',
  hair_care:           'Belleza - Peluquería',
  beauty_salon:        'Belleza - Estética',
  nail_salon:          'Belleza - Uñas',
  spa:                 'Belleza - Spa',
  restaurant:          'Hostelería - Restaurante',
  bar:                 'Hostelería - Bar',
  cafe:                'Hostelería - Cafetería',
  car_repair:          'Mecánica - Taller',
  optician:            'Óptica',
  real_estate_agency:  'Inmobiliaria',
  school:              'Academia - Colegio',
  driving_school:      'Academia - Autoescuela',
  clothing_store:      'Retail - Moda',
  grocery_store:       'Retail - Alimentación',
  pharmacy:            'Salud - Farmacia',
};

function shortAddr(address = '') {
  const clean = address.replace(/\d{5}/, '').trim();
  const parts = clean.split(',');
  return parts.length >= 2 ? parts.slice(0, 2).join(',').trim() : clean;
}

function mapPlaces(places, sector) {
  return places
    .filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .map((p, i) => {
      const name      = p.displayName?.text || 'Negocio ' + (i + 1);
      const rawWeb    = p.websiteUri || '';
      const web       = rawWeb && !rawWeb.match(/facebook|instagram|tripadvisor|google\.com/i) ? rawWeb : null;
      const phone     = p.nationalPhoneNumber || '';
      const typeKey   = p.primaryType || '';
      const detSector = sector || guessSector(typeKey + ' ' + (p.types || []).join(' '));
      const label     = TYPE_LABEL[typeKey] || p.displayName?.text?.split(' ')[0] || detSector;

      const flaws = [...(FLAW_MAP[detSector] || FLAW_MAP['Servicios'])];
      if (!web) flaws.unshift('Sin web propia');

      return {
        id:       'gm-' + Date.now() + '-' + i,
        name,
        sector:   label,
        loc:      shortAddr(p.formattedAddress || ''),
        url:      web || ('Sin web — ' + (phone || 'sin teléfono')),
        priority: web ? 'med' : 'high',
        flaws:    [...new Set(flaws)].slice(0, 5),
        saas:     (SAAS_MAP[detSector] || SAAS_MAP['Servicios']).slice(0, 5),
        phone,
        rating:   p.rating   || null,
        reviews:  p.userRatingCount || 0,
        lat:      p.location?.latitude  ?? null,
        lng:      p.location?.longitude ?? null,
        source:   'google_maps',
      };
    });
}

// ── Tipos de lugar por sector (para Nearby Search por proximidad) ─────────────
// Nearby Search con DISTANCE devuelve negocios poco visibles que Text Search omite
const SECTOR_TYPES = {
  'Salud':        ['doctor','dentist','physiotherapist','pharmacy','hospital','medical_clinic'],
  'Veterinaria':  ['veterinary_care','pet_store','pet_supplies_store'],
  'Belleza':      ['hair_care','beauty_salon','nail_salon','spa','barber_shop','massage_therapist'],
  'Hosteleria':   ['restaurant','bar','cafe','bakery','meal_takeaway','meal_delivery','food'],
  'Retail':       ['clothing_store','shoe_store','book_store','gift_shop','boutique','jewelry_store'],
  'Servicios':    ['plumber','electrician','moving_company','laundry','locksmith','painter','roofing_contractor'],
  'Mecanica':     ['car_repair','auto_parts_store','car_wash','tire_shop'],
  'Optica':       ['optician','eyeglass_store'],
  'Inmobiliaria': ['real_estate_agency'],
  'Academia':     ['school','driving_school','tutoring_center','language_school','music_school'],
  '':             ['store','restaurant','health','finance','real_estate_agency','school'],
};

// ── BÚSQUEDA — Google Places API (New) ───────────────────────────────────────
const PLACES_FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.nationalPhoneNumber', 'places.websiteUri',
  'places.rating', 'places.userRatingCount',
  'places.primaryType', 'places.types', 'places.businessStatus',
  'places.location',
].join(',');

app.post('/api/search', requireAuth, async (req, res) => {
  if (!GOOGLE_API_KEY) {
    return res.status(400).json({
      error: 'GOOGLE_MAPS_API_KEY no configurado. Añádela en el fichero .env',
    });
  }

  const { city = 'Valladolid', radius = 10, sector = '' } = req.body;
  const queries = SECTOR_QUERIES[sector] || SECTOR_QUERIES[''];

  try {
    // 1. Obtener coordenadas de la ciudad (para filtro de radio)
    let locationBias;
    const radiusKm = Number(radius);
    if (radiusKm > 0) {
      const cityRes  = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method:  'POST',
        headers: {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.location',
        },
        body: JSON.stringify({ textQuery: city + ', España', maxResultCount: 1 }),
      });
      const cityData = await cityRes.json();
      const loc      = cityData.places?.[0]?.location;
      if (loc) {
        locationBias = {
          circle: {
            center: { latitude: loc.latitude, longitude: loc.longitude },
            radius: Math.min(radiusKm * 1000, 50000),
          },
        };
      }
    }

    // 2. Helper: busca una query con paginación (hasta 2 páginas = 40 resultados)
    const fetchQuery = async (q) => {
      const places = [];
      let pageToken = null;

      for (let page = 0; page < 2; page++) {
        const body = {
          textQuery:      q + ' en ' + city,
          languageCode:   'es',
          regionCode:     'ES',
          maxResultCount: 20,
        };
        if (locationBias) body.locationBias = locationBias;
        if (pageToken)    body.pageToken    = pageToken;

        const r    = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method:  'POST',
          headers: {
            'Content-Type':     'application/json',
            'X-Goog-Api-Key':   GOOGLE_API_KEY,
            'X-Goog-FieldMask': PLACES_FIELD_MASK,
          },
          body: JSON.stringify(body),
        });

        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error?.message || `HTTP ${r.status}`);
        }

        const data = await r.json();
        places.push(...(data.places || []));
        pageToken = data.nextPageToken;
        if (!pageToken) break;          // no hay más páginas
      }

      return places;
    };

    // 3. Lanzar las 3 Text Search queries en paralelo
    const textResults = await Promise.all(queries.map(fetchQuery));

    // 4. Nearby Search por PROXIMIDAD (rankPreference: DISTANCE)
    //    Devuelve negocios con poca visibilidad que Text Search omite por baja relevancia
    let nearbyPlaces = [];
    const nearbyTypes = SECTOR_TYPES[sector] || SECTOR_TYPES[''];
    if (locationBias) {
      try {
        // Lanzar 2 rondas de Nearby Search con subconjuntos de tipos
        const CHUNK = 5; // máx tipos por petición para mayor cobertura
        const chunks = [];
        for (let i = 0; i < nearbyTypes.length; i += CHUNK)
          chunks.push(nearbyTypes.slice(i, i + CHUNK));

        const nearbyBase = {
          maxResultCount:      20,
          rankPreference:      'DISTANCE',
          locationRestriction: { circle: locationBias.circle },
        };
        const placesHeaders = {
          'Content-Type':     'application/json',
          'X-Goog-Api-Key':   GOOGLE_API_KEY,
          'X-Goog-FieldMask': PLACES_FIELD_MASK,
        };

        const nearbyResults = await Promise.all([
          // a) búsquedas por tipo específico del sector
          ...chunks.map(async (types) => {
            const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
              method: 'POST', headers: placesHeaders,
              body: JSON.stringify({ ...nearbyBase, includedTypes: types }),
            });
            if (!r.ok) return [];
            return (await r.json()).places || [];
          }),
          // b) catch-all SIN filtro de tipo — devuelve CUALQUIER negocio cercano
          //    incluyendo los de baja visibilidad que no tienen tipo asignado
          (async () => {
            const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
              method: 'POST', headers: placesHeaders,
              body: JSON.stringify(nearbyBase),   // sin includedTypes
            });
            if (!r.ok) return [];
            return (await r.json()).places || [];
          })(),
        ]);

        nearbyPlaces = nearbyResults.flat();
      } catch (_) { /* silencioso si falla nearby */ }
    }

    // 5. Combinar Text Search + Nearby Search y deduplicar por place id
    const seen      = new Set();
    const allPlaces = [...textResults.flat(), ...nearbyPlaces].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const leads = mapPlaces(allPlaces, sector);
    const label = queries[0] + ' en ' + city;

    res.json({ leads, total: allPlaces.length, query: label });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ANÁLISIS DIGITAL DE LEAD ─────────────────────────────────────────────────
app.post('/api/analyze', requireAuth, async (req, res) => {
  const { url = '', sector = '', phone = '', email = '' } = req.body;
  const flaws  = [];
  const u      = url.toLowerCase();
  const hasSocialOnly = (u.includes('facebook.com') || u.includes('instagram.com') || u.includes('twitter.com'));
  const hasRealWeb    = url && !url.startsWith('Sin web') && !hasSocialOnly;

  // ── Análisis de presencia web ──
  if (!url || url.startsWith('Sin web')) {
    flaws.push('Sin web propia');
    flaws.push('Sin presencia digital');
  } else if (hasSocialOnly) {
    flaws.push('Sin web propia — solo redes sociales');
  } else {
    if (!u.startsWith('https'))                        flaws.push('Web sin HTTPS (no segura)');
    if (u.includes('blogspot'))                        flaws.push('Web obsoleta (Blogspot)');
    if (u.includes('wix.com') || u.includes('wixsite')) flaws.push('Web básica en Wix gratuito');
    if (u.includes('wordpress.com'))                   flaws.push('Web básica en WordPress.com');
    if (u.includes('jimdo') || u.includes('weebly'))   flaws.push('Web en constructor básico');
    if (u.includes('negocio.site') || u.includes('business.site')) flaws.push('Web provisional de Google');
  }

  // ── Datos de contacto ──
  if (!phone) flaws.push('Sin teléfono registrado');
  if (!email) flaws.push('Sin email de contacto');

  // ── PageSpeed Insights (velocidad móvil) ──────────────────────────────────
  // Requiere: PageSpeed Insights API activada en console.cloud.google.com
  if (GOOGLE_API_KEY && hasRealWeb && flaws.length < 5) {
    try {
      const cleanUrl = url.startsWith('http') ? url : 'https://' + url;
      const psRes    = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
        `?url=${encodeURIComponent(cleanUrl)}&strategy=mobile&key=${GOOGLE_API_KEY}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (psRes.ok) {
        const ps    = await psRes.json();
        const perf  = ps.lighthouseResult?.categories?.performance?.score;
        const https = ps.lighthouseResult?.audits?.['is-on-https']?.score;
        if (https === 0 && !flaws.includes('Web sin HTTPS (no segura)'))
          flaws.push('Web sin HTTPS (no segura)');
        if (perf !== undefined && perf < 0.5)
          flaws.push(`Web muy lenta en móvil (score: ${Math.round(perf * 100)})`);
        else if (perf !== undefined && perf < 0.7)
          flaws.push(`Web lenta en móvil (score: ${Math.round(perf * 100)})`);
      }
    } catch { /* silencioso — PageSpeed puede tardar o no estar activada */ }
  }

  // ── Completar con fallos del sector hasta máx 5 ──
  const sectorFlaws = FLAW_MAP[sector] || FLAW_MAP['Servicios'];
  for (const f of sectorFlaws) {
    if (flaws.length >= 5) break;
    if (!flaws.includes(f)) flaws.push(f);
  }

  const saas = (SAAS_MAP[sector] || SAAS_MAP['Servicios']).slice(0, 5);
  res.json({ flaws: [...new Set(flaws)].slice(0, 5), saas });
});

// ── CUSTOMERS ────────────────────────────────────────────────────────────────

app.get('/api/customers', requireAuth, async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { data, error } = await supabase
    .from('customers').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/api/customers', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { id, created_at, updated_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('customers').insert(fields).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

app.put('/api/customers/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { id, created_at, updated_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('customers').update(fields).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.delete('/api/customers/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { error } = await supabase.from('customers').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// ── PROJECTS ──────────────────────────────────────────────────────────────────

app.get('/api/projects', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  let q = supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (req.query.customer_id) q = q.eq('customer_id', req.query.customer_id);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

app.post('/api/projects', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { id, created_at, updated_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('projects').insert(fields).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

app.put('/api/projects/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { id, created_at, updated_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('projects').update(fields).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase no configurado' });
  const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// ── EXPORT para Vercel serverless / START para desarrollo local ───────────────
module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n  ╔══════════════════════════════════════════╗');
    console.log("  ║   Bleak's Solutions CRM — v7.0.0        ║");
    console.log('  ╚══════════════════════════════════════════╝\n');
    console.log(`  URL:  http://localhost:${PORT}\n`);
    if (GOOGLE_API_KEY) {
      console.log('  Google Maps API:  ✓ OK\n');
    } else {
      console.log('  Google Maps API:  ✗ NO CONFIGURADA');
      console.log('  Añade GOOGLE_MAPS_API_KEY=AIza... en el fichero .env\n');
    }
  });
}
