'use strict';
const express     = require('express');
const PDFDocument = require('pdfkit');
const { supabase, requireSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth, requireSupabase);

router.get('/', async (req, res) => {
  let q = supabase.from('invoices').select('*').order('issue_date', { ascending: false });
  if (req.query.customer_id) q = q.eq('customer_id', req.query.customer_id);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
});

router.post('/', async (req, res) => {
  const { id, created_at, updated_at, ...fields } = req.body;
  // Auto-generar número de factura: FAC-YYYY-NNN
  const year = new Date().getFullYear();
  const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
  const num = ((count || 0) + 1).toString().padStart(3, '0');
  fields.invoice_number = `FAC-${year}-${num}`;
  // Intentar con line_items; si falla (columna no existe aún), reintentar sin ella
  let { data, error } = await supabase.from('invoices').insert(fields).select().single();
  if (error && error.message.includes('line_items')) {
    const { line_items, ...fieldsNoItems } = fields;
    ({ data, error } = await supabase.from('invoices').insert(fieldsNoItems).select().single());
  }
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { id, created_at, updated_at, ...fields } = req.body;
  // Intentar con line_items; si falla (columna no existe aún), reintentar sin ella
  let { data, error } = await supabase.from('invoices').update(fields).eq('id', req.params.id).select().single();
  if (error && error.message.includes('line_items')) {
    const { line_items, ...fieldsNoItems } = fields;
    ({ data, error } = await supabase.from('invoices').update(fieldsNoItems).eq('id', req.params.id).select().single());
  }
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('invoices').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// ── INVOICE PDF ───────────────────────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  const { data: inv, error: invErr } = await supabase
    .from('invoices').select('*, customers(name, address, email, phone)').eq('id', req.params.id).single();
  if (invErr || !inv) return res.status(404).json({ error: 'Factura no encontrada' });

  const items    = Array.isArray(inv.line_items) && inv.line_items.length ? inv.line_items : [];
  const subtotal = items.length
    ? items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
    : Number(inv.amount) || 0;
  const taxAmt   = subtotal * (Number(inv.tax_pct) || 21) / 100;
  const total    = subtotal + taxAmt;
  const fmtEur   = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  const fmtDate  = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="factura-${inv.invoice_number || inv.id}.pdf"`);
  doc.pipe(res);

  const acColor = '#2d5a70';

  // ── Header ──
  doc.fontSize(22).fillColor(acColor).font('Helvetica-Bold').text("Bleak's Solutions", 50, 50);
  doc.fontSize(10).fillColor('#6b7280').font('Helvetica').text('CRM & SaaS Agency', 50, 76);

  // ── Factura label ──
  doc.fontSize(28).fillColor(acColor).font('Helvetica-Bold').text('FACTURA', 350, 50, { align: 'right' });
  doc.fontSize(11).fillColor('#374151').font('Helvetica')
    .text(`Nº ${inv.invoice_number || '—'}`, 350, 86, { align: 'right' });

  // ── Separador ──
  doc.moveTo(50, 110).lineTo(545, 110).strokeColor(acColor).lineWidth(2).stroke();

  // ── Datos cliente y fechas ──
  const customer = inv.customers || {};
  doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold').text('FACTURAR A:', 50, 125);
  doc.fontSize(11).fillColor('#111827').font('Helvetica-Bold').text(customer.name || '—', 50, 140);
  doc.fontSize(10).fillColor('#374151').font('Helvetica')
    .text(customer.address || '', 50, 156)
    .text(customer.email   || '', 50, 170)
    .text(customer.phone   || '', 50, 184);

  doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold').text('FECHA EMISIÓN:', 350, 125);
  doc.fontSize(10).fillColor('#374151').font('Helvetica').text(fmtDate(inv.issue_date), 350, 140);
  if (inv.due_date) {
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold').text('VENCIMIENTO:', 350, 157);
    doc.fontSize(10).fillColor('#374151').font('Helvetica').text(fmtDate(inv.due_date), 350, 172);
  }

  // ── Estado ──
  const statusColors = { pagada: '#15803d', enviada: '#2563eb', vencida: '#dc2626', borrador: '#6b7280' };
  const sColor = statusColors[inv.status] || '#6b7280';
  doc.roundedRect(350, inv.due_date ? 190 : 157, 80, 20, 4).fill(sColor);
  doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold')
    .text((inv.status || 'borrador').toUpperCase(), 355, inv.due_date ? 195 : 162);

  // ── Tabla de conceptos ──
  const tableY = 230;
  doc.rect(50, tableY, 495, 24).fill(acColor);
  doc.fontSize(9).fillColor('#fff').font('Helvetica-Bold')
    .text('Descripción', 60, tableY + 8)
    .text('Cant.', 320, tableY + 8, { align: 'right', width: 40 })
    .text('P. Unitario', 370, tableY + 8, { align: 'right', width: 80 })
    .text('Total', 460, tableY + 8, { align: 'right', width: 75 });

  const renderItems = items.length ? items : [{ description: inv.description || 'Servicios profesionales', quantity: 1, unit_price: subtotal }];
  let curY = tableY + 24;
  renderItems.forEach((it, i) => {
    const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
    if (i % 2 === 0) doc.rect(50, curY, 495, 24).fill('#f9fafb');
    doc.fontSize(9).fillColor('#111827').font('Helvetica')
      .text(it.description || '—', 60, curY + 8, { width: 250 })
      .text(String(it.quantity ?? 1), 320, curY + 8, { align: 'right', width: 40 })
      .text(fmtEur(Number(it.unit_price) || 0), 370, curY + 8, { align: 'right', width: 80 })
      .text(fmtEur(lineTotal), 460, curY + 8, { align: 'right', width: 75 });
    curY += 24;
  });

  // ── Totales ──
  const totY = curY + 16;
  doc.moveTo(350, totY).lineTo(545, totY).strokeColor('#e5e7eb').lineWidth(1).stroke();

  doc.fontSize(10).fillColor('#374151').font('Helvetica')
    .text('Subtotal:', 350, totY + 8)
    .text(fmtEur(subtotal), 460, totY + 8, { align: 'right', width: 75 });

  doc.text(`IVA (${inv.tax_pct || 21}%):`, 350, totY + 24)
    .text(fmtEur(taxAmt), 460, totY + 24, { align: 'right', width: 75 });

  doc.moveTo(350, totY + 42).lineTo(545, totY + 42).strokeColor(acColor).lineWidth(1.5).stroke();

  doc.fontSize(13).fillColor(acColor).font('Helvetica-Bold')
    .text('TOTAL:', 350, totY + 50)
    .text(fmtEur(total), 460, totY + 50, { align: 'right', width: 75 });

  // ── Notas ──
  if (inv.notes) {
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold').text('NOTAS:', 50, totY + 50);
    doc.fontSize(9).fillColor('#374151').font('Helvetica').text(inv.notes, 50, totY + 64, { width: 250 });
  }

  // ── Footer ──
  doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
    .text("Bleak's Solutions — bleakssolutions.com", 50, 760, { align: 'center', width: 495 });

  doc.end();
});

module.exports = router;
