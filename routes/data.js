'use strict';
const express = require('express');
const { supabase, requireSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');
const { toRows, fromRows } = require('../lib/leads');

const router = express.Router();

// ── DATOS — lectura ───────────────────────────────────────────────────────────
router.get('/', requireAuth, requireSupabase, async (_req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(fromRows(data || []));
});

// ── DATOS — escritura ─────────────────────────────────────────────────────────
// Upsert de los leads recibidos + borrado SOLO de los ids que el cliente marca
// explícitamente en `deletedIds`. Nunca se borra por omisión: un cliente con
// datos desactualizados (otra pestaña/dispositivo) ya no puede vaciar la DB.
router.post('/', requireAuth, requireSupabase, async (req, res) => {
  try {
    const rows       = toRows(req.body);
    const deletedIds = Array.isArray(req.body.deletedIds) ? req.body.deletedIds.filter(Boolean) : [];

    if (deletedIds.length > 0) {
      const { error: delErr } = await supabase.from('leads').delete().in('id', deletedIds);
      if (delErr) throw new Error(delErr.message);
    }

    // Upsert en lotes de 500
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await supabase
        .from('leads')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }

    return res.json({ ok: true, deleted: deletedIds.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
