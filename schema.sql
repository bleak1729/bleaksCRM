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
                CHECK (status IN ('sin contactar', 'en proceso', 'mockup', 'cliente', 'descartado')),
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

-- ── Tabla de clientes (leads convertidos) ────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        TEXT        UNIQUE REFERENCES leads(id) ON DELETE SET NULL,
  name           TEXT        NOT NULL DEFAULT '',
  sector         TEXT        NOT NULL DEFAULT '',
  contact_name   TEXT        NOT NULL DEFAULT '',
  email          TEXT        NOT NULL DEFAULT '',
  phone          TEXT        NOT NULL DEFAULT '',
  address        TEXT        NOT NULL DEFAULT '',
  website        TEXT        NOT NULL DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'activo'
                               CHECK (status IN ('activo', 'pausado', 'cancelado')),
  contract_start DATE,
  contract_end   DATE,
  monthly_value  NUMERIC     NOT NULL DEFAULT 0,
  services       TEXT[]      NOT NULL DEFAULT '{}',
  notes          TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);
CREATE INDEX IF NOT EXISTS idx_customers_status  ON customers(status);

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- ── Tabla de proyectos (vinculados a clientes) ────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT '',
  description TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'activo'
                            CHECK (status IN ('activo', 'en_pausa', 'completado', 'cancelado')),
  start_date  DATE,
  end_date    DATE,
  value       NUMERIC     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status      ON projects(status);

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- ── Contactos múltiples por cliente ─────────────────────────────
CREATE TABLE IF NOT EXISTS customer_contacts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT '',
  role        TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL DEFAULT '',
  phone       TEXT        NOT NULL DEFAULT '',
  is_primary  BOOLEAN     NOT NULL DEFAULT false,
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ccontacts_customer ON customer_contacts(customer_id);
ALTER TABLE customer_contacts DISABLE ROW LEVEL SECURITY;

-- ── Facturas ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  invoice_number TEXT        NOT NULL DEFAULT '',
  issue_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  amount         NUMERIC     NOT NULL DEFAULT 0,
  tax_pct        NUMERIC     NOT NULL DEFAULT 21,
  status         TEXT        NOT NULL DEFAULT 'borrador'
                               CHECK (status IN ('borrador','enviada','pagada','vencida')),
  description    TEXT        NOT NULL DEFAULT '',
  notes          TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- ── Documentos (metadatos + link Drive) ──────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  project_id  UUID        REFERENCES projects(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL DEFAULT '',
  type        TEXT        NOT NULL DEFAULT 'otro'
                            CHECK (type IN ('contrato','propuesta','informe','presupuesto','otro')),
  drive_url   TEXT        NOT NULL DEFAULT '',
  doc_date    DATE,
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- ── Campos Google Drive en customers y projects ───────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS drive_folder_url TEXT NOT NULL DEFAULT '';
ALTER TABLE projects  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT NOT NULL DEFAULT '';

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
