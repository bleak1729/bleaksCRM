'use strict';
const express = require('express');
const { GOOGLE_API_KEY } = require('../lib/config');
const { requireAuth } = require('../lib/auth');
const { SOCIAL_PATTERNS, extractSocialLinks, fetchHtml, scanSiteForSocials } = require('../lib/social-scan');
const { toSafePublicUrl } = require('../lib/url-guard');

const router = express.Router();

// ── DETECCIÓN AUTOMÁTICA DE REDES SOCIALES ───────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { url = '', name = '' } = req.body;

  let found = {};
  const rawUrl = url && !url.startsWith('Sin') ? toSafePublicUrl(url) : null;

  if (rawUrl) {
    found = await scanSiteForSocials(rawUrl);
  }

  // Búsqueda en Google Places si tenemos API key y falta alguna red
  if (GOOGLE_API_KEY && name && Object.keys(found).length < SOCIAL_PATTERNS.length) {
    try {
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.websiteUri',
        },
        body: JSON.stringify({ textQuery: name, maxResultCount: 1 }),
      });
      if (r.ok) {
        const data = await r.json();
        const siteUri = data.places?.[0]?.websiteUri;
        // Si Google Maps tiene una web diferente a la que ya tenemos, escanearla también
        if (siteUri && toSafePublicUrl(siteUri) && toSafePublicUrl(siteUri) !== rawUrl) {
          const html = await fetchHtml(siteUri);
          if (html) {
            const partial = extractSocialLinks(html);
            for (const [k, v] of Object.entries(partial)) {
              if (!found[k]) found[k] = v;
            }
          }
        }
      }
    } catch { /* silencioso */ }
  }

  // Devolver también search URLs para las redes no encontradas
  const searchUrls = {};
  if (name) {
    const q = encodeURIComponent(name);
    if (!found.instagram) searchUrls.instagram = `https://www.google.com/search?q=${q}+site:instagram.com`;
    if (!found.facebook)  searchUrls.facebook  = `https://www.google.com/search?q=${q}+site:facebook.com`;
    if (!found.linkedin)  searchUrls.linkedin  = `https://www.google.com/search?q=${q}+site:linkedin.com`;
    if (!found.twitter)   searchUrls.twitter   = `https://www.google.com/search?q=${q}+site:x.com+OR+site:twitter.com`;
    if (!found.tiktok)    searchUrls.tiktok    = `https://www.google.com/search?q=${q}+site:tiktok.com`;
  }

  res.json({ found, searchUrls });
});

module.exports = router;
