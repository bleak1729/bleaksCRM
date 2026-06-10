'use strict';
const express = require('express');
const { supabase, requireSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');
const { createDriveFolder } = require('../lib/drive');
const { DRIVE_ROOT_FOLDER_ID } = require('../lib/config');

const router = express.Router();
router.use(requireAuth, requireSupabase);

// Fabrica las 4 rutas CRUD estándar para una tabla.
//  - orders: [[columna, opciones]] para el listado
//  - filterByCustomer: permite ?customer_id= en el GET
//  - beforeInsert: hook async para enriquecer los campos antes del insert
function registerCrud(path, table, { orders = [['created_at', { ascending: false }]], filterByCustomer = false, beforeInsert } = {}) {
  router.get(path, async (req, res) => {
    let q = supabase.from(table).select('*');
    for (const [col, opts] of orders) q = q.order(col, opts);
    if (filterByCustomer && req.query.customer_id) q = q.eq('customer_id', req.query.customer_id);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  });

  router.post(path, async (req, res) => {
    const { id, created_at, updated_at, ...fields } = req.body;
    if (beforeInsert) await beforeInsert(fields);
    const { data, error } = await supabase.from(table).insert(fields).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  });

  router.put(`${path}/:id`, async (req, res) => {
    const { id, created_at, updated_at, ...fields } = req.body;
    const { data, error } = await supabase.from(table).update(fields).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  });

  router.delete(`${path}/:id`, async (req, res) => {
    const { error } = await supabase.from(table).delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  });
}

registerCrud('/customers', 'customers', {
  // Auto-crear carpeta en Drive si está configurado
  beforeInsert: async (fields) => {
    if (DRIVE_ROOT_FOLDER_ID && fields.name) {
      const url = await createDriveFolder(fields.name, DRIVE_ROOT_FOLDER_ID);
      if (url) fields.drive_folder_url = url;
    }
  },
});

registerCrud('/projects', 'projects', {
  filterByCustomer: true,
  // Auto-crear subcarpeta en Drive dentro de la carpeta del cliente
  beforeInsert: async (fields) => {
    if (fields.customer_id && fields.name) {
      const { data: cust } = await supabase
        .from('customers').select('drive_folder_url').eq('id', fields.customer_id).single();
      if (cust?.drive_folder_url) {
        const parentId = cust.drive_folder_url.match(/folders\/([^?/]+)/)?.[1];
        if (parentId) {
          const url = await createDriveFolder(fields.name, parentId);
          if (url) fields.drive_folder_url = url;
        }
      }
    }
  },
});

registerCrud('/customer-contacts', 'customer_contacts', {
  filterByCustomer: true,
  orders: [['is_primary', { ascending: false }], ['created_at', { ascending: true }]],
});

registerCrud('/documents', 'documents', { filterByCustomer: true });

module.exports = router;
