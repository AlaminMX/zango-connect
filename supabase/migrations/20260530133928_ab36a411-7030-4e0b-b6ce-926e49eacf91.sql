
-- 1. Sellers: status + subscription + block metadata
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

ALTER TABLE public.sellers
  DROP CONSTRAINT IF EXISTS sellers_status_check;
ALTER TABLE public.sellers
  ADD CONSTRAINT sellers_status_check CHECK (status IN ('active','suspended','expired','blocked'));

-- 2. Products: status + block metadata
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_status_check CHECK (status IN ('active','blocked'));

-- 3. Tighten sellers public read: hide non-active stores from public,
--    while owners and admins keep full visibility.
DROP POLICY IF EXISTS sellers_public_read ON public.sellers;
CREATE POLICY sellers_public_read ON public.sellers
  FOR SELECT
  USING (
    status = 'active'
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Tighten products public read: must be active AND owned by an active seller
DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT
  USING (
    (status = 'active' AND EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = products.seller_id AND s.status = 'active'
    ))
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = products.seller_id AND s.user_id = auth.uid()
    )
  );

-- 5. Prevent sellers from self-editing their status / subscription
CREATE OR REPLACE FUNCTION public.prevent_self_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
      OR NEW.blocked_at IS DISTINCT FROM OLD.blocked_at
      OR NEW.blocked_reason IS DISTINCT FROM OLD.blocked_reason)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change moderation fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_status_change_trg ON public.sellers;
CREATE TRIGGER prevent_self_status_change_trg
BEFORE UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_status_change();

-- 6. Prevent sellers from changing product status (admin-only field)
CREATE OR REPLACE FUNCTION public.prevent_product_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.blocked_at IS DISTINCT FROM OLD.blocked_at
      OR NEW.blocked_reason IS DISTINCT FROM OLD.blocked_reason)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change product moderation fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_product_status_change_trg ON public.products;
CREATE TRIGGER prevent_product_status_change_trg
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.prevent_product_status_change();

-- 7. Seller notices
CREATE TABLE IF NOT EXISTS public.seller_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  created_by uuid,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.seller_notices TO authenticated;
GRANT ALL ON public.seller_notices TO service_role;

ALTER TABLE public.seller_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY notices_seller_read ON public.seller_notices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = seller_notices.seller_id AND s.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY notices_admin_all ON public.seller_notices
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY notices_seller_mark_read ON public.seller_notices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = seller_notices.seller_id AND s.user_id = auth.uid()
    )
  );

-- Trigger: seller can only touch read_at
CREATE OR REPLACE FUNCTION public.protect_notice_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.severity IS DISTINCT FROM OLD.severity
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Sellers can only mark notices as read';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_notice_fields_trg ON public.seller_notices;
CREATE TRIGGER protect_notice_fields_trg
BEFORE UPDATE ON public.seller_notices
FOR EACH ROW EXECUTE FUNCTION public.protect_notice_fields();

CREATE INDEX IF NOT EXISTS seller_notices_seller_idx ON public.seller_notices(seller_id, created_at DESC);

-- 8. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_admin_read ON public.admin_audit_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
