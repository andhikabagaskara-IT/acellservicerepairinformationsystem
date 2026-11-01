-- ============================================================================
-- ARIS - Acell Service Repair Monitoring System
-- Migration 001: Initial Schema, Constraints, Triggers, RLS & Storage
-- ============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Custom ENUM Types ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE device_type AS ENUM ('SMARTPHONE', 'LAPTOP', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM (
    'INTAKE',
    'WAITING_ASSIGNMENT',
    'INSPECTION',
    'WAITING_PARTS',
    'IN_REPAIR',
    'QUALITY_CHECK',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'CANCELLED',
    'NOT_PROCEEDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_type AS ENUM (
    'ADMIN_MANUAL',
    'SELF_ASSIGNED',
    'REASSIGNED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE visibility_type AS ENUM ('PUBLIC', 'INTERNAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE quotation_status AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE actor_type AS ENUM ('ADMIN', 'TECHNICIAN', 'SYSTEM', 'CUSTOMER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Helper Functions ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. profiles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'TECHNICIAN',
  phone_e164 TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. customers ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL UNIQUE,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 3. devices ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  device_type device_type NOT NULL DEFAULT 'SMARTPHONE',
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_or_imei TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON public.devices(customer_id);

CREATE TRIGGER set_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. repair_tickets ──────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_seq := nextval('ticket_number_seq');
  RETURN 'AC-' || v_year || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.repair_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status ticket_status NOT NULL DEFAULT 'INTAKE',
  customer_complaint TEXT NOT NULL,
  intake_condition TEXT NOT NULL,
  accessories_received TEXT,
  device_pin_or_passcode TEXT,
  estimated_completion_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.repair_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON public.repair_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_device_id ON public.repair_tickets(device_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_tech ON public.repair_tickets(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.repair_tickets(status);

CREATE TRIGGER set_repair_tickets_updated_at
  BEFORE UPDATE ON public.repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-generate ticket_number if not provided
CREATE OR REPLACE FUNCTION trg_set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR trim(NEW.ticket_number) = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number_before_insert
  BEFORE INSERT ON public.repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_ticket_number();

-- ─── 5. ticket_assignments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignment_type assignment_type NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_assignments_ticket_id ON public.ticket_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_assignments_technician_id ON public.ticket_assignments(technician_id);

-- ─── 6. repair_diagnoses ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repair_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  diagnosis TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  visibility visibility_type NOT NULL DEFAULT 'INTERNAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_ticket_id ON public.repair_diagnoses(ticket_id);

CREATE TRIGGER set_repair_diagnoses_updated_at
  BEFORE UPDATE ON public.repair_diagnoses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 7. repair_quotations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repair_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  labor_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (labor_cost >= 0),
  parts_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (parts_cost >= 0),
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  status quotation_status NOT NULL DEFAULT 'PUBLISHED',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_quotations_ticket_id ON public.repair_quotations(ticket_id);

-- ─── 8. quotation_items ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.repair_quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);

-- ─── 9. quotation_negotiations ──────────────────────────────────────────────
-- Created after customer_ticket_access_sessions below to satisfy foreign key.

-- ─── 10. ticket_status_histories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_status_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  old_status ticket_status,
  new_status ticket_status NOT NULL,
  changed_by_type actor_type NOT NULL,
  changed_by_id UUID,
  actor_name_snapshot TEXT NOT NULL,
  reason_or_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_status_histories_ticket_id ON public.ticket_status_histories(ticket_id);
CREATE INDEX IF NOT EXISTS idx_status_histories_created_at ON public.ticket_status_histories(created_at);

-- ─── 11. ticket_updates ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  author_name_snapshot TEXT NOT NULL,
  message TEXT NOT NULL,
  visibility visibility_type NOT NULL DEFAULT 'INTERNAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ticket_updates_ticket_id ON public.ticket_updates(ticket_id);

-- ─── 12. ticket_attachments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  storage_bucket TEXT NOT NULL DEFAULT 'repair-attachments',
  object_path TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  visibility visibility_type NOT NULL DEFAULT 'INTERNAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON public.ticket_attachments(ticket_id);

-- ─── 13. customer_ticket_access_sessions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_ticket_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_cust_sessions_ticket_id ON public.customer_ticket_access_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_cust_sessions_token_hash ON public.customer_ticket_access_sessions(token_hash);

-- ─── 9. quotation_negotiations (with FK to sessions) ────────────────────────
CREATE TABLE IF NOT EXISTS public.quotation_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.repair_quotations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  customer_session_id UUID REFERENCES public.customer_ticket_access_sessions(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_negotiations_quotation_id ON public.quotation_negotiations(quotation_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_ticket_id ON public.quotation_negotiations(ticket_id);

-- ─── 14. audit_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type actor_type NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ─── AUTOMATIC TRIGGERS ─────────────────────────────────────────────────────

-- 1. Automatic Status Change Logger Trigger
CREATE OR REPLACE FUNCTION trg_auto_log_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_name TEXT := 'Sistem Acell';
  v_actor_type actor_type := 'SYSTEM';
  v_actor_id UUID := NULL;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if current authenticated user exists
    IF auth.uid() IS NOT NULL THEN
      SELECT full_name, role::TEXT::actor_type, id
      INTO v_actor_name, v_actor_type, v_actor_id
      FROM public.profiles
      WHERE id = auth.uid();
      
      IF v_actor_name IS NULL THEN
        v_actor_name := 'Pengguna Staf';
        v_actor_type := 'TECHNICIAN';
        v_actor_id := auth.uid();
      END IF;
    END IF;

    INSERT INTO public.ticket_status_histories (
      ticket_id,
      old_status,
      new_status,
      changed_by_type,
      changed_by_id,
      actor_name_snapshot,
      reason_or_note,
      created_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      v_actor_type,
      v_actor_id,
      v_actor_name,
      'Perubahan status dari ' || OLD.status::TEXT || ' ke ' || NEW.status::TEXT,
      timezone('utc', now())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_log_ticket_status_change
  AFTER UPDATE OF status ON public.repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_log_ticket_status_change();

-- 2. Automatic Customer Session Revocation on Ticket Completion
CREATE OR REPLACE FUNCTION trg_auto_revoke_customer_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status IS DISTINCT FROM 'COMPLETED' THEN
    UPDATE public.customer_ticket_access_sessions
    SET revoked_at = timezone('utc', now())
    WHERE ticket_id = NEW.id
      AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_revoke_customer_sessions
  AFTER UPDATE OF status ON public.repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_revoke_customer_sessions();

-- 3. Automatic Initial Status History on Ticket Creation
CREATE OR REPLACE FUNCTION trg_auto_log_ticket_intake()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_name TEXT := 'Sistem Acell';
  v_actor_type actor_type := 'SYSTEM';
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT full_name, role::TEXT::actor_type
    INTO v_actor_name, v_actor_type
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_actor_name IS NULL THEN
      v_actor_name := 'Petugas Penerima';
      v_actor_type := 'ADMIN';
    END IF;
  END IF;

  INSERT INTO public.ticket_status_histories (
    ticket_id,
    old_status,
    new_status,
    changed_by_type,
    changed_by_id,
    actor_name_snapshot,
    reason_or_note,
    created_at
  ) VALUES (
    NEW.id,
    NULL,
    NEW.status,
    v_actor_type,
    NEW.created_by,
    v_actor_name,
    'Tiket baru berhasil didaftarkan ke sistem (Intake)',
    timezone('utc', now())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_log_ticket_intake
  AFTER INSERT ON public.repair_tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_log_ticket_intake();

-- ─── ROW LEVEL SECURITY (RLS) POLICIES ──────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_status_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ticket_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if caller is staff (Admin or Technician)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if caller is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. profiles policies
CREATE POLICY "Profiles viewable by authenticated staff"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_staff());

CREATE POLICY "Profiles updatable by admin or self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- 2. customers policies
CREATE POLICY "Customers manageable by authenticated staff"
  ON public.customers FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 3. devices policies
CREATE POLICY "Devices manageable by authenticated staff"
  ON public.devices FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 4. repair_tickets policies
CREATE POLICY "Tickets manageable by authenticated staff"
  ON public.repair_tickets FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 5. ticket_assignments policies
CREATE POLICY "Assignments manageable by authenticated staff"
  ON public.ticket_assignments FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 6. repair_diagnoses policies
CREATE POLICY "Diagnoses manageable by authenticated staff"
  ON public.repair_diagnoses FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 7. repair_quotations policies
CREATE POLICY "Quotations manageable by authenticated staff"
  ON public.repair_quotations FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 8. quotation_items policies
CREATE POLICY "Quotation items manageable by authenticated staff"
  ON public.quotation_items FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 9. quotation_negotiations policies
CREATE POLICY "Negotiations manageable by authenticated staff"
  ON public.quotation_negotiations FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 10. ticket_status_histories policies
CREATE POLICY "Status histories readable by authenticated staff"
  ON public.ticket_status_histories FOR SELECT
  TO authenticated
  USING (public.is_staff());

CREATE POLICY "Status histories insertable by authenticated staff"
  ON public.ticket_status_histories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- 11. ticket_updates policies
CREATE POLICY "Ticket updates manageable by authenticated staff"
  ON public.ticket_updates FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 12. ticket_attachments policies
CREATE POLICY "Attachments manageable by authenticated staff"
  ON public.ticket_attachments FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 13. customer_ticket_access_sessions policies
CREATE POLICY "Customer sessions accessible only by admin"
  ON public.customer_ticket_access_sessions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 14. audit_logs policies
CREATE POLICY "Audit logs viewable by admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ─── STORAGE CONFIGURATION ──────────────────────────────────────────────────
-- Setup private bucket 'repair-attachments' in storage.buckets if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repair-attachments',
  'repair-attachments',
  false,
  3145728, -- 3MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS: Ensure only authenticated staff can read/write to storage
CREATE POLICY "Staff can view repair attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'repair-attachments' AND public.is_staff());

CREATE POLICY "Staff can upload repair attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'repair-attachments' AND public.is_staff());

CREATE POLICY "Admin can delete repair attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'repair-attachments' AND public.is_admin());
