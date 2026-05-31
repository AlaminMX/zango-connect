
-- ============ CITIES OF BUSINESS ============
CREATE TABLE public.cities_of_business (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cities_of_business TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities_of_business TO authenticated;
GRANT ALL ON public.cities_of_business TO service_role;

ALTER TABLE public.cities_of_business ENABLE ROW LEVEL SECURITY;

CREATE POLICY cities_public_read ON public.cities_of_business
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY cities_admin_write ON public.cities_of_business
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER cities_set_updated_at BEFORE UPDATE ON public.cities_of_business
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.cities_of_business (name, state, slug, sort_order) VALUES
  ('Kaduna',  'Kaduna',  'kaduna',  1),
  ('Kano',    'Kano',    'kano',    2),
  ('Abuja',   'FCT',     'abuja',   3),
  ('Bauchi',  'Bauchi',  'bauchi',  4),
  ('Sokoto',  'Sokoto',  'sokoto',  5);

-- ============ SELLERS: city_id + verification ============
ALTER TABLE public.sellers
  ADD COLUMN city_id uuid REFERENCES public.cities_of_business(id),
  ADD COLUMN verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN verification_decided_at timestamptz,
  ADD COLUMN verification_decided_by uuid,
  ADD COLUMN rejection_reason text,
  ADD COLUMN verification_documents jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.sellers
  ADD CONSTRAINT sellers_verification_status_check
  CHECK (verification_status IN ('pending','approved','rejected','suspended'));

-- Backfill city_id from legacy city text
UPDATE public.sellers s
SET city_id = c.id
FROM public.cities_of_business c
WHERE lower(s.city) = lower(c.name);

-- All existing sellers start as 'pending' for migration review (Change 5)
-- The default already sets new rows to 'pending'; existing rows are already 'pending' from the default backfill.

-- Tighten public read: require approved
DROP POLICY IF EXISTS sellers_public_read ON public.sellers;
CREATE POLICY sellers_public_read ON public.sellers
  FOR SELECT USING (
    (status = 'active' AND verification_status = 'approved')
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read ON public.products
  FOR SELECT USING (
    (status = 'active' AND EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = products.seller_id
        AND s.status = 'active'
        AND s.verification_status = 'approved'
    ))
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid())
  );

-- DB-level gate: block product writes when seller not approved
CREATE OR REPLACE FUNCTION public.block_unapproved_product_writes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  SELECT verification_status INTO v_status FROM public.sellers WHERE id = NEW.seller_id;
  IF v_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Your store must be verified before you can create or edit products';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER block_unapproved_product_writes_ins
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.block_unapproved_product_writes();
CREATE TRIGGER block_unapproved_product_writes_upd
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.block_unapproved_product_writes();

-- Prevent sellers from self-changing verification_status
CREATE OR REPLACE FUNCTION public.prevent_self_verification_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.verification_decided_at IS DISTINCT FROM OLD.verification_decided_at
      OR NEW.verification_decided_by IS DISTINCT FROM OLD.verification_decided_by
      OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change verification fields';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER prevent_self_verification_change_trg
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_verification_change();

-- ============ STATS VIEW ============
CREATE OR REPLACE VIEW public.cities_with_stats AS
SELECT
  c.id, c.name, c.state, c.slug, c.is_active, c.sort_order, c.created_at, c.updated_at,
  COALESCE(s.sellers_count, 0) AS sellers_count,
  COALESCE(s.sellers_30d, 0) AS sellers_added_30d,
  COALESCE(p.products_count, 0) AS products_count,
  COALESCE(p.products_30d, 0) AS products_added_30d
FROM public.cities_of_business c
LEFT JOIN (
  SELECT city_id,
    COUNT(*) AS sellers_count,
    COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS sellers_30d
  FROM public.sellers
  WHERE city_id IS NOT NULL
  GROUP BY city_id
) s ON s.city_id = c.id
LEFT JOIN (
  SELECT se.city_id,
    COUNT(pr.*) AS products_count,
    COUNT(pr.*) FILTER (WHERE pr.created_at > now() - interval '30 days') AS products_30d
  FROM public.products pr
  JOIN public.sellers se ON se.id = pr.seller_id
  WHERE se.city_id IS NOT NULL
  GROUP BY se.city_id
) p ON p.city_id = c.id;

GRANT SELECT ON public.cities_with_stats TO anon, authenticated, service_role;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  preferred_city_id uuid REFERENCES public.cities_of_business(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_owner_all ON public.profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_admin_read ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend handle_new_user to create profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

-- ============ WISHLISTS ============
CREATE TABLE public.wishlists (
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

GRANT SELECT, INSERT, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY wishlists_owner_all ON public.wishlists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ RECENTLY VIEWED ============
CREATE TABLE public.recently_viewed (
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;
GRANT ALL ON public.recently_viewed TO service_role;

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY recently_viewed_owner_all ON public.recently_viewed
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.cap_recently_viewed()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.recently_viewed
  WHERE user_id = NEW.user_id
    AND product_id IN (
      SELECT product_id FROM public.recently_viewed
      WHERE user_id = NEW.user_id
      ORDER BY viewed_at DESC OFFSET 50
    );
  RETURN NEW;
END $$;

CREATE TRIGGER cap_recently_viewed_trg
  AFTER INSERT ON public.recently_viewed
  FOR EACH ROW EXECUTE FUNCTION public.cap_recently_viewed();
