'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toRows, fromRows, guessSector, shortAddr, mapPlaces } = require('../lib/leads');

test('toRows aplana leads + statuses/notes/contacts en filas', () => {
  const rows = toRows({
    leads:    [{ id: 'a1', name: 'Bar Pepe', rating: 4.5 }],
    statuses: { a1: 'en proceso' },
    notes:    { a1: 'llamar lunes' },
    contacts: { a1: { phone: { done: true } } },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'a1');
  assert.equal(rows[0].status, 'en proceso');
  assert.equal(rows[0].note, 'llamar lunes');
  assert.deepEqual(rows[0].contacts, { phone: { done: true } });
  assert.equal(rows[0].priority, 'med');           // default
  assert.equal(rows[0].status && rows[0].name, 'Bar Pepe');
});

test('fromRows reconstruye el payload del frontend', () => {
  const payload = fromRows([
    { id: 'a1', name: 'Bar Pepe', status: 'cliente', note: 'ok', contacts: {}, created_at: 'x', updated_at: 'y' },
  ]);
  assert.equal(payload.leads.length, 1);
  assert.equal(payload.leads[0].status, undefined);       // status no viaja dentro del lead
  assert.equal(payload.leads[0].created_at, undefined);   // timestamps fuera
  assert.equal(payload.statuses.a1, 'cliente');
  assert.equal(payload.notes.a1, 'ok');
});

test('toRows ↔ fromRows es un viaje de ida y vuelta estable', () => {
  const original = {
    leads:    [{ id: 'x', name: 'Óptica Luz', sector: 'Óptica', loc: '', url: '', phone: '', email: '', priority: 'high', rating: null, reviews: 0, flaws: [], saas: [], source: 'manual', lat: null, lng: null, linkedin: '', instagram: '', facebook: '', twitter: '', tiktok: '' }],
    statuses: { x: 'mockup' },
    notes:    { x: '' },
    contacts: { x: {} },
  };
  const roundTrip = fromRows(toRows(original));
  assert.deepEqual(roundTrip.leads[0], original.leads[0]);
  assert.deepEqual(roundTrip.statuses, original.statuses);
});

test('guessSector clasifica por tipo de Google Places', () => {
  assert.equal(guessSector('veterinary_care'), 'Veterinaria');
  assert.equal(guessSector('dentist doctor'), 'Salud');
  assert.equal(guessSector('hair_care'), 'Belleza');
  assert.equal(guessSector('restaurant'), 'Hosteleria');
  assert.equal(guessSector('car_repair'), 'Mecanica');
  assert.equal(guessSector('algo desconocido'), 'Servicios');
});

test('shortAddr recorta el código postal y se queda con 2 partes', () => {
  assert.equal(shortAddr('Calle Mayor 5, 47001 Valladolid, España'), 'Calle Mayor 5,  Valladolid');
  assert.equal(shortAddr('Plaza España'), 'Plaza España');
});

test('mapPlaces filtra cerrados, marca sin-web como prioridad alta y deduplica flaws', () => {
  const leads = mapPlaces([
    { displayName: { text: 'Cerrado SL' }, businessStatus: 'CLOSED_PERMANENTLY' },
    { displayName: { text: 'Bar Sin Web' }, nationalPhoneNumber: '600111222' },
    { displayName: { text: 'Clínica Web' }, websiteUri: 'https://clinica.es', primaryType: 'dentist' },
  ], '');
  assert.equal(leads.length, 2);

  const sinWeb = leads.find(l => l.name === 'Bar Sin Web');
  assert.equal(sinWeb.priority, 'high');
  assert.ok(sinWeb.url.startsWith('Sin web'));
  assert.equal(sinWeb.flaws[0], 'Sin web propia');

  const conWeb = leads.find(l => l.name === 'Clínica Web');
  assert.equal(conWeb.priority, 'med');
  assert.equal(conWeb.url, 'https://clinica.es');
  assert.equal(conWeb.sector, 'Salud - Dental');
});

test('mapPlaces descarta webs que son redes sociales', () => {
  const [lead] = mapPlaces([
    { displayName: { text: 'Solo FB' }, websiteUri: 'https://facebook.com/solofb' },
  ], '');
  assert.ok(lead.url.startsWith('Sin web'));
});
