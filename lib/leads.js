'use strict';
const { FLAW_MAP, SAAS_MAP, TYPE_LABEL } = require('./sector-data');

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
    linkedin:  l.linkedin  || '',
    instagram: l.instagram || '',
    facebook:  l.facebook  || '',
    twitter:   l.twitter   || '',
    tiktok:    l.tiktok    || '',
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

module.exports = { toRows, fromRows, guessSector, shortAddr, mapPlaces };
