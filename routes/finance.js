'use strict';
const express = require('express');
const { supabase, requireSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth, requireSupabase);

// ── Finance Projects ──────────────────────────────────────────────

router.get('/projects', async (_req, res) => {
  const { data, error } = await supabase
    .from('finance_projects')
    .select('*, customers(id, name)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/projects', async (req, res) => {
  const { id, created_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('finance_projects').insert(fields).select('*, customers(id, name)').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

router.put('/projects/:id', async (req, res) => {
  const { id, created_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('finance_projects').update(fields).eq('id', req.params.id).select('*, customers(id, name)').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/projects/:id', async (req, res) => {
  const { error } = await supabase
    .from('finance_projects').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// ── Finance Expenses (fila única id=1) ───────────────────────────

router.get('/expenses', async (_req, res) => {
  const { data, error } = await supabase
    .from('finance_expenses').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.put('/expenses', async (req, res) => {
  const { id, updated_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('finance_expenses')
    .upsert({ id: 1, ...fields, updated_at: new Date().toISOString() })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

module.exports = router;
