'use strict';
const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_KEY } = require('./config');

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

// Middleware: corta con 503 si Supabase no está configurado
function requireSupabase(_req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase no configurado. Añade SUPABASE_URL y SUPABASE_SERVICE_KEY en .env' });
  }
  next();
}

module.exports = { supabase, requireSupabase };
