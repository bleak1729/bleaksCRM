'use strict';
const express = require('express');
const { GOOGLE_API_KEY } = require('../lib/config');
const { requireAuth } = require('../lib/auth');
const { parsePrediction, filterByRegion, dedupeSuggestions } = require('../lib/geo');

const router = express.Router();

// Tipos de lugar por nivel: provincias/estados vs ciudades
const TYPE_FILTERS = {
  region: ['administrative_area_level_1', 'administrative_area_level_2'],
  city:   ['locality'],
};

// Cache en memoria — el autocompletado repite muchísimo las mismas consultas
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 h
const CACHE_MAX = 500;

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) { cache.delete(key); return null; }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); // FIFO
  cache.set(key, { value, at: Date.now() });
}

// GET /api/geo/suggest?type=region|city&country=ES&region=Lima&q=mira
router.get('/suggest', requireAuth, async (req, res) => {
  if (!GOOGLE_API_KEY) return res.status(400).json({ error: 'GOOGLE_MAPS_API_KEY no configurado' });

  const { type = 'city', country = '', region = '', q = '' } = req.query;
  const includedPrimaryTypes = TYPE_FILTERS[type];
  if (!includedPrimaryTypes) return res.status(400).json({ error: 'type debe ser region o city' });
  if (!q.trim() || q.trim().length < 2) return res.json({ suggestions: [] });

  const cc = String(country).toUpperCase().slice(0, 2);
  const cacheKey = [type, cc, String(region).toLowerCase(), q.trim().toLowerCase()].join('|');
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ suggestions: cached, cached: true });

  try {
    const body = {
      input: q.trim(),
      languageCode: 'es',
      includedPrimaryTypes,
    };
    if (cc.length === 2) body.includedRegionCodes = [cc];

    const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.error?.message || `HTTP ${r.status}`);
    }

    const data = await r.json();
    let suggestions = dedupeSuggestions(
      (data.suggestions || [])
        .map(s => parsePrediction(s.placePrediction))
    );

    // Ciudades: priorizar las de la provincia seleccionada
    if (type === 'city') suggestions = filterByRegion(suggestions, String(region));

    suggestions = suggestions.slice(0, 8);
    cacheSet(cacheKey, suggestions);
    res.json({ suggestions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
