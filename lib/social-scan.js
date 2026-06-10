'use strict';
const { toSafePublicUrl } = require('./url-guard');

const SOCIAL_PATTERNS = [
  { key: 'linkedin',  re: /(https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in|showcase)\/[^"'\s<>(){}[\]]+)/gi },
  { key: 'instagram', re: /(https?:\/\/(?:www\.)?instagram\.com\/(?!explore|p\/|reel\/)[^"'\s<>(){}[\]]+)/gi },
  { key: 'facebook',  re: /(https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|share|dialog|tr[/?]|plugins|legal|photo)[^"'\s<>(){}[\]]+)/gi },
  { key: 'twitter',   re: /(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!intent|share|home|hashtag|i\/)[^"'\s<>(){}[\]]+)/gi },
  { key: 'tiktok',    re: /(https?:\/\/(?:www\.)?tiktok\.com\/@[^"'\s<>(){}[\]]+)/gi },
];

// Extrae la primera URL de cada red social presente en el HTML
function extractSocialLinks(html) {
  const result = {};
  for (const { key, re } of SOCIAL_PATTERNS) {
    if (result[key]) continue;
    re.lastIndex = 0;
    const m = re.exec(html);
    // Recorta basura tras la URL (comillas, backslash) y el slash final.
    // OJO: '/' no puede ir en la clase — truncaría la URL en 'https:'
    if (m) result[key] = m[1].replace(/["'\\].*$/, '').replace(/\/$/, '');
  }
  return result;
}

// Fetch de HTML con timeout; solo URLs http(s) públicas (anti-SSRF)
async function fetchHtml(pageUrl, timeoutMs = 8000) {
  const full = toSafePublicUrl(pageUrl);
  if (!full) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(full, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Escanea la home + páginas de contacto típicas de una web buscando redes sociales.
// `known` permite partir de redes ya detectadas; solo rellena las que falten.
async function scanSiteForSocials(siteUrl, { known = {}, extraPages = true, timeoutMs = 8000 } = {}) {
  const found = { ...known };
  const base = toSafePublicUrl(siteUrl);
  if (!base) return found;

  const origin = new URL(base).origin;
  const pages = extraPages
    ? [base, `${origin}/contacto`, `${origin}/contact`, `${origin}/sobre-nosotros`, `${origin}/quienes-somos`]
    : [base, `${origin}/contacto`, `${origin}/contact`];

  for (const page of pages) {
    const html = await fetchHtml(page, timeoutMs);
    if (!html) continue;
    const partial = extractSocialLinks(html);
    for (const [k, v] of Object.entries(partial)) {
      if (!found[k]) found[k] = v;
    }
    if (Object.keys(found).filter(k => found[k]).length === SOCIAL_PATTERNS.length) break;
  }
  return found;
}

module.exports = { SOCIAL_PATTERNS, extractSocialLinks, fetchHtml, scanSiteForSocials };
