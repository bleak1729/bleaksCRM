'use strict';
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const { PORT, VERSION, GOOGLE_API_KEY } = require('./lib/config');
const { supabase } = require('./lib/supabase');

const app = express();

// En Vercel/proxies, necesario para que el rate limiting identifique la IP real
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
// Express 5 deja req.body undefined si no llega JSON; las rutas destructuran
// req.body directamente, así que restauramos el {} de Express 4
app.use((req, _res, next) => { if (req.body === undefined) req.body = {}; next(); });
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/^(?!\/api).*/, (_req, res, next) => {
  const idx = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(idx)) res.sendFile(idx); else next();
});

// ── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  let dbOk = false;
  if (supabase) {
    const { error } = await supabase.from('leads').select('id').limit(1);
    dbOk = !error;
  }
  res.json({ ok: true, googleMaps: !!GOOGLE_API_KEY, supabase: dbOk, version: VERSION });
});

// ── ROUTERS ──────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/data',     require('./routes/data'));
app.use('/api/search',   require('./routes/search'));
app.use('/api/geo',      require('./routes/geo'));
app.use('/api/social',   require('./routes/social'));
app.use('/api/landing',  require('./routes/landing'));
app.use('/api/analyze',  require('./routes/analyze'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/finance',  require('./routes/finance')); // finance_projects, finance_expenses
app.use('/api',          require('./routes/crm'));   // customers, projects, customer-contacts, documents

// Errores no controlados → JSON, nunca la página HTML de Express con stack trace
app.use((err, req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Error interno del servidor' });
});

// ── EXPORT para Vercel serverless / START para desarrollo local ───────────────
module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n  ╔══════════════════════════════════════════╗');
    console.log(`  ║   Bleak's Solutions CRM — v${VERSION.padEnd(13)}║`);
    console.log('  ╚══════════════════════════════════════════╝\n');
    console.log(`  URL:  http://localhost:${PORT}\n`);
    if (GOOGLE_API_KEY) {
      console.log('  Google Maps API:  ✓ OK\n');
    } else {
      console.log('  Google Maps API:  ✗ NO CONFIGURADA');
      console.log('  Añade GOOGLE_MAPS_API_KEY=AIza... en el fichero .env\n');
    }
  });
}
