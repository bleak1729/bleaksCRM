'use strict';
const net = require('net');

// Rangos privados/reservados — el servidor nunca debe hacer fetch hacia ellos (SSRF)
function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const low = ip.toLowerCase();
    return low === '::1' || low === '::' || low.startsWith('fc') || low.startsWith('fd') ||
           low.startsWith('fe80') || low.startsWith('::ffff:');
  }
  const parts = ip.split('.').map(Number);
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 ||
         (a === 100 && b >= 64 && b <= 127) ||
         (a === 169 && b === 254) ||
         (a === 172 && b >= 16 && b <= 31) ||
         (a === 192 && b === 168);
}

// Normaliza una URL de usuario y la valida como http(s) pública.
// Devuelve la URL completa (con https:// si faltaba) o null si no es segura.
function toSafePublicUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // Si trae esquema explícito y no es http(s), fuera (file:, ftp:, gopher:...)
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && scheme !== 'http' && scheme !== 'https') return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  let u;
  try { u = new URL(candidate); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  if (net.isIP(host) && isPrivateIp(host)) return null;
  return u.href;
}

module.exports = { toSafePublicUrl, isPrivateIp };
