'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeText, parsePrediction, filterByRegion, dedupeSuggestions } = require('../lib/geo');

test('normalizeText quita tildes y mayúsculas', () => {
  assert.equal(normalizeText('León'), 'leon');
  assert.equal(normalizeText('  CASTILLA Y LEÓN '), 'castilla y leon');
  assert.equal(normalizeText('São Paulo'), 'sao paulo');
});

test('parsePrediction extrae nombre y detalle del formato de Google', () => {
  const p = {
    text: { text: 'Valladolid, España' },
    structuredFormat: {
      mainText:      { text: 'Valladolid' },
      secondaryText: { text: 'España' },
    },
  };
  assert.deepEqual(parsePrediction(p), { name: 'Valladolid', detail: 'España' });
  // Sin structuredFormat cae al texto completo
  assert.deepEqual(parsePrediction({ text: { text: 'Lima, Perú' } }), { name: 'Lima, Perú', detail: '' });
});

test('filterByRegion prioriza ciudades de la provincia (sin tildes)', () => {
  const all = [
    { name: 'Medina del Campo', detail: 'Valladolid, España' },
    { name: 'Medina de Pomar',  detail: 'Burgos, España' },
  ];
  assert.deepEqual(filterByRegion(all, 'valladolid'), [all[0]]);
  // Si ninguna coincide, devuelve todas (no bloquear al usuario)
  assert.deepEqual(filterByRegion(all, 'Sevilla'), all);
  // Sin provincia seleccionada no filtra
  assert.deepEqual(filterByRegion(all, ''), all);
});

test('dedupeSuggestions elimina duplicados y entradas sin nombre', () => {
  const out = dedupeSuggestions([
    { name: 'Lima', detail: 'Perú' },
    { name: 'LIMA', detail: 'perú' },
    { name: '', detail: 'x' },
    { name: 'Lima', detail: 'Ohio, EE. UU.' },
  ]);
  assert.equal(out.length, 2);
});

test('distanceKm calcula distancias reales', () => {
  const { distanceKm } = require('../lib/geo');
  const valladolid = { lat: 41.6523, lng: -4.7245 };
  const madrid     = { lat: 40.4168, lng: -3.7038 };
  const d = distanceKm(valladolid, madrid);
  assert.ok(d > 150 && d < 175, `Valladolid-Madrid debería ser ~161 km, dio ${d}`);
  assert.equal(distanceKm(valladolid, valladolid), 0);
});
