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

// ── Expense Categories ───────────────────────────────────────────

router.get('/expense-categories', async (_req, res) => {
  const { data, error } = await supabase
    .from('expense_categories').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/expense-categories', async (req, res) => {
  const { id, created_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('expense_categories').insert(fields).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

router.put('/expense-categories/:id', async (req, res) => {
  const { id, created_at, ...fields } = req.body;
  const { data, error } = await supabase
    .from('expense_categories').update(fields).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/expense-categories/:id', async (req, res) => {
  const { error } = await supabase
    .from('expense_categories').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// ── Expense Records ──────────────────────────────────────────────

router.get('/expense-records', async (req, res) => {
  let q = supabase
    .from('expense_records')
    .select('*, expense_categories(id, name, color)')
    .order('expense_date', { ascending: false });

  if (req.query.month) {
    // month = 'YYYY-MM'
    const [year, month] = req.query.month.split('-').map(Number);
    const from = `${year}-${String(month).padStart(2,'0')}-01`;
    const last = new Date(year, month, 0).getDate();
    const to   = `${year}-${String(month).padStart(2,'0')}-${last}`;
    q = q.gte('expense_date', from).lte('expense_date', to);
  }

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/expense-records', async (req, res) => {
  const { id, created_at, expense_categories: _cat, ...fields } = req.body;
  const { data, error } = await supabase
    .from('expense_records').insert(fields)
    .select('*, expense_categories(id, name, color)').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

router.put('/expense-records/:id', async (req, res) => {
  const { id, created_at, expense_categories: _cat, ...fields } = req.body;
  const { data, error } = await supabase
    .from('expense_records').update(fields).eq('id', req.params.id)
    .select('*, expense_categories(id, name, color)').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/expense-records/:id', async (req, res) => {
  const { error } = await supabase
    .from('expense_records').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

module.exports = router;
