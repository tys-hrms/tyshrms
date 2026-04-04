-- ⚠️ CAUTION: IRONCLAD HARD RESET ⚠️
-- This script will wipe your Supabase project clean and re-initialize the HRMSCore v2 Schema.
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mgnvegujawxvqzobnmgj/sql/new

-- 1. DROP EXISTING TABLES (CASCADE)
DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- 2. CREATE TENANTS (Organizations)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin_name TEXT,
  company_type TEXT,
  employee_count TEXT,
  email TEXT,
  phone TEXT,
  state TEXT,
  base_lat DOUBLE PRECISION,
  base_lng DOUBLE PRECISION,
  geofence_radius INTEGER DEFAULT 100,
  shift_start_time TIME DEFAULT '09:00:00',
  grace_period_mins INTEGER DEFAULT 15,
  payroll_settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{"primaryColor": "#2d7cf6", "secondaryColor": "#14b8a6", "themeMode": "light"}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  "companySlug" TEXT -- CamelCase for consistency with legacy code
);

-- 3. CREATE USERS (Unified Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE, -- The unified login identifier
  email TEXT,
  pin_code TEXT NOT NULL,
  role TEXT DEFAULT 'Worker',
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  geofence_bypass_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  title TEXT NOT NULL,
  unit TEXT DEFAULT 'Pcs',
  inventory INTEGER DEFAULT 0,
  image_url TEXT,
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  lat_lng_in TEXT,
  lat_lng_out TEXT,
  method TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'present',
  is_late BOOLEAN DEFAULT FALSE,
  total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREATE ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  date DATE NOT NULL,
  task_type TEXT NOT NULL,
  mode TEXT DEFAULT 'single',
  pieces_assigned INTEGER DEFAULT 0,
  pieces_carried_forward INTEGER DEFAULT 0,
  pieces_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CREATE WORK LOGS
CREATE TABLE IF NOT EXISTS work_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pieces_ironed INTEGER DEFAULT 0,
  pieces_checked INTEGER DEFAULT 0,
  pieces_labeled INTEGER DEFAULT 0,
  pieces_packed INTEGER DEFAULT 0,
  pieces_rejected INTEGER DEFAULT 0,
  reject_reason TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CREATE CRM LEADS
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  source TEXT NOT NULL,
  stage TEXT DEFAULT 'lead_in',
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  total_value DOUBLE PRECISION DEFAULT 0,
  client_category TEXT DEFAULT 'B2C',
  lead_temperature TEXT DEFAULT 'Warm',
  items JSONB DEFAULT '[]',
  primary_rep_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  tagged_rep_ids TEXT[] DEFAULT '{}',
  is_breached BOOLEAN DEFAULT FALSE,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CREATE SALARY RECORDS (Committed Payroll)
CREATE TABLE IF NOT EXISTS salary_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  billable_days INTEGER NOT NULL,
  gross_pay DOUBLE PRECISION NOT NULL,
  epf_deduction DOUBLE PRECISION DEFAULT 0,
  esi_deduction DOUBLE PRECISION DEFAULT 0,
  pt_deduction DOUBLE PRECISION DEFAULT 0,
  ot_pay DOUBLE PRECISION DEFAULT 0,
  net_pay DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'processed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CREATE RBAC PERMISSIONS
CREATE TABLE IF NOT EXISTS rbac_permissions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  view_scope TEXT DEFAULT 'none',
  create_scope TEXT DEFAULT 'none',
  edit_scope TEXT DEFAULT 'none',
  delete_scope TEXT DEFAULT 'none',
  features JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, role, module)
);

-- 11. INDEXES
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_attendance_date ON attendance_logs(date);
CREATE INDEX idx_assignments_date ON assignments(date);
CREATE INDEX idx_users_username ON users(username);

-- 9. INITIAL NOTIFICATION (SYSTEM)
-- Insert a dummy log or notification if needed.

SELECT 'SCHEMA v2.0.1 (IRONCLAD) INITIALIZED SUCCESSFULLY' as status;
