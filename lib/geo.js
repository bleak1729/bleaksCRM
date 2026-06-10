'use strict';

// Normaliza para comparar sin tildes ni mayúsculas ("León" ≈ "leon")
function normalizeText(s = '') {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Convierte una predicción de Places Autocomplete (New) → { name, detail }
function parsePrediction(p = {}) {
  const sf = p.structuredFormat || {};
  return {
    name:   sf.mainText?.text || p.text?.text || '',
    detail: sf.secondaryText?.text || '',
  };
}

// Filtra sugerencias cuya descripción contenga la provincia seleccionada.
// Si el filtro deja la lista vacía se devuelven todas (Google no siempre
// incluye la provincia en el texto secundario) — mejor sugerir de más que bloquear.
function filterByRegion(suggestions, region) {
  if (!region) return suggestions;
  const target = normalizeText(region);
  const matched = suggestions.filter(s => normalizeText(s.detail).includes(target));
  return matched.length > 0 ? matched : suggestions;
}

// Dedup por nombre+detalle conservando el orden
function dedupeSuggestions(suggestions) {
  const seen = new Set();
  return suggestions.filter(s => {
    const key = normalizeText(s.name) + '|' + normalizeText(s.detail);
    if (!s.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Distancia haversine en km entre dos puntos { lat, lng }
function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

module.exports = { normalizeText, parsePrediction, filterByRegion, dedupeSuggestions, distanceKm };
