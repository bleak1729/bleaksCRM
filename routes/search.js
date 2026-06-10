'use strict';
const express = require('express');
const { GOOGLE_API_KEY } = require('../lib/config');
const { requireAuth } = require('../lib/auth');
const { SECTOR_QUERIES, SECTOR_TYPES } = require('../lib/sector-data');
const { mapPlaces } = require('../lib/leads');
const { distanceKm } = require('../lib/geo');

const router = express.Router();

// ── BÚSQUEDA — Google Places API (New) ───────────────────────────────────────
const PLACES_FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.nationalPhoneNumber', 'places.websiteUri',
  'places.rating', 'places.userRatingCount',
  'places.primaryType', 'places.types', 'places.businessStatus',
  'places.location',
].join(',');

router.post('/', requireAuth, async (req, res) => {
  if (!GOOGLE_API_KEY) {
    return res.status(400).json({
      error: 'GOOGLE_MAPS_API_KEY no configurado. Añádela en el fichero .env',
    });
  }

  const { country = 'España', region = '', city = '', radius = 10, sector = '' } = req.body;
  if (!city.trim()) {
    return res.status(400).json({ error: 'Indica una ciudad donde buscar' });
  }
  // "Ciudad, Provincia, País" — desambigua ciudades repetidas entre países
  const placeLabel = [city, region, country].map(s => s.trim()).filter(Boolean).join(', ');
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
        body: JSON.stringify({ textQuery: placeLabel, maxResultCount: 1 }),
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
          textQuery:      q + ' en ' + placeLabel,
          languageCode:   'es',
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
      } catch { /* silencioso si falla nearby */ }
    }

    // 5. Combinar Text Search + Nearby Search y deduplicar por place id
    const seen      = new Set();
    let   allPlaces = [...textResults.flat(), ...nearbyPlaces].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // 6. Hacer el radio estricto: locationBias del Text Search solo *prefiere*
    //    resultados cercanos, no los limita. Filtramos por distancia real al
    //    centro con un 10% de margen (no descartar negocios por unos metros).
    //    Los lugares sin coordenadas se conservan — no se puede juzgar su distancia.
    if (locationBias) {
      const center = locationBias.circle.center;
      const maxKm  = (locationBias.circle.radius / 1000) * 1.1;
      allPlaces = allPlaces.filter(p => {
        const loc = p.location;
        if (!loc?.latitude || !loc?.longitude) return true;
        return distanceKm(
          { lat: center.latitude, lng: center.longitude },
          { lat: loc.latitude,   lng: loc.longitude }
        ) <= maxKm;
      });
    }

    const leads = mapPlaces(allPlaces, sector, { country, region, city });
    const label = queries[0] + ' en ' + placeLabel;

    res.json({ leads, total: allPlaces.length, query: label });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
