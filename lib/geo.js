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

module.exports = { normalizeText, parsePrediction, filterByRegion, dedupeSuggestions };
