'use strict';
const express   = require('express');
const bcrypt    = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { supabase, requireSupabase } = require('../lib/supabase');
const { requireAuth, signToken, generateRecoveryKey } = require('../lib/auth');

const router = express.Router();

// Frena fuerza bruta contra login / clave de recuperación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.' },
});

// Estado: ¿hay usuarios registrados?
router.get('/status', async (_req, res) => {
  if (!supabase) return res.json({ hasUsers: false });
  const { data } = await supabase.from('users').select('id').limit(1);
  res.json({ hasUsers: (data || []).length > 0 });
});

// Primer acceso — crea el usuario admin (solo funciona si no hay ninguno)
router.post('/setup', authLimiter, requireSupabase, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  if (password.length < 6)    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const { data: existing } = await supabase.from('users').select('id').limit(1);
  if ((existing || []).length > 0) return res.status(403).json({ error: 'Ya existe una cuenta de administrador' });

  const recoveryKey  = generateRecoveryKey();
  const hash         = await bcrypt.hash(password, 12);
  const recoveryHash = await bcrypt.hash(recoveryKey, 10);

  const { error } = await supabase.from('users').insert({ username, password_hash: hash, recovery_key_hash: recoveryHash });
  if (error) return res.status(500).json({ error: error.message });

  const token = signToken({ username });
  res.json({ token, username, recoveryKey });
});

// Login
router.post('/login', authLimiter, requireSupabase, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  const { data: users } = await supabase
    .from('users').select('*').eq('username', username).limit(1);
  const user = users?.[0];
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const token = signToken({ id: user.id, username: user.username });
  res.json({ token, username: user.username });
});

// Recuperar contraseña con clave de recuperación
router.post('/recover', authLimiter, requireSupabase, async (req, res) => {
  const { username, recoveryKey, newPassword } = req.body;
  if (!username || !recoveryKey || !newPassword)
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const { data: users } = await supabase
    .from('users').select('*').eq('username', username).limit(1);
  const user = users?.[0];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (!user.recovery_key_hash)
    return res.status(400).json({ error: 'Este usuario no tiene clave de recuperación configurada' });

  const valid = await bcrypt.compare(recoveryKey.toUpperCase().replace(/\s/g, ''), user.recovery_key_hash);
  if (!valid) return res.status(401).json({ error: 'Clave de recuperación incorrecta' });

  const newHash = await bcrypt.hash(newPassword, 12);
  const { error } = await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
});

// Regenerar clave de recuperación (requiere auth)
router.post('/recovery-key/regenerate', requireAuth, requireSupabase, async (req, res) => {
  const { data: users } = await supabase
    .from('users').select('id').eq('username', req.user.username).limit(1);
  const user = users?.[0];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const recoveryKey  = generateRecoveryKey();
  const recoveryHash = await bcrypt.hash(recoveryKey, 10);
  const { error } = await supabase.from('users').update({ recovery_key_hash: recoveryHash }).eq('id', user.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ recoveryKey });
});

module.exports = router;
