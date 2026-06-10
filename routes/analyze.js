'use strict';
const express = require('express');
const { GOOGLE_API_KEY } = require('../lib/config');
const { requireAuth } = require('../lib/auth');
const { FLAW_MAP, SAAS_MAP } = require('../lib/sector-data');
const { toSafePublicUrl } = require('../lib/url-guard');

const router = express.Router();

// ── ANÁLISIS DIGITAL DE LEAD ─────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
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
  const cleanUrl = hasRealWeb ? toSafePublicUrl(url) : null;
  if (GOOGLE_API_KEY && cleanUrl && flaws.length < 5) {
    try {
      const psRes = await fetch(
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

module.exports = router;
