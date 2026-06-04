-- ═══════════════════════════════════════════════════════════════
--  Bleak's Solutions CRM — Supabase schema
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- ── Tabla principal de leads ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  name        TEXT        NOT NULL DEFAULT '',
  sector      TEXT        NOT NULL DEFAULT '',
  loc         TEXT        NOT NULL DEFAULT '',
  url         TEXT        NOT NULL DEFAULT '',
  phone       TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL DEFAULT '',
  priority    TEXT        NOT NULL DEFAULT 'med'
                CHECK (priority IN ('high', 'med', 'low')),
  status      TEXT        NOT NULL DEFAULT 'sin contactar'
                CHECK (status IN ('sin contactar', 'en proceso', 'cliente', 'descartado')),
  rating      NUMERIC,
  reviews     INTEGER     NOT NULL DEFAULT 0,
  flaws       TEXT[]      NOT NULL DEFAULT '{}',
  saas        TEXT[]      NOT NULL DEFAULT '{}',
  source      TEXT        NOT NULL DEFAULT 'manual',
  lat         NUMERIC,
  lng         NUMERIC,
  note        TEXT        NOT NULL DEFAULT '',
  -- contacts almacena { phone:{done,date}, email:{done,date}, visit:{done,date} }
  contacts    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Auto-actualizar updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Índices para filtros frecuentes ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_source   ON leads(source);

-- ── Row Level Security ────────────────────────────────────────────
-- Desactivada: el servidor usa la service role key que la bypasea.
-- Si en el futuro añades autenticación de usuarios, actívala aquí.
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

-- ── Tabla de usuarios (contraseñas encriptadas con bcrypt) ──────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ── Vista útil para análisis ──────────────────────────────────────
CREATE OR REPLACE VIEW leads_summary AS
SELECT
  COUNT(*)                                          AS total,
  COUNT(*) FILTER (WHERE status = 'sin contactar') AS sin_contactar,
  COUNT(*) FILTER (WHERE status = 'en proceso')    AS en_proceso,
  COUNT(*) FILTER (WHERE status = 'cliente')       AS clientes,
  COUNT(*) FILTER (WHERE status = 'descartado')    AS descartados,
  COUNT(*) FILTER (WHERE priority = 'high')        AS prioridad_alta,
  ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 2) AS rating_medio
FROM leads;
