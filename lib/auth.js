'use strict';
const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { JWT_SECRET } = require('./config');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada, inicia sesión de nuevo' });
  }
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Genera una clave de recuperación legible: XXXX-XXXX-XXXX-XXXX
function generateRecoveryKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('')
  );
  return groups.join('-');
}

module.exports = { requireAuth, signToken, generateRecoveryKey };
