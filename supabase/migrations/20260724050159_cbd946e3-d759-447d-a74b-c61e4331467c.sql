
-- =========================================================================
-- 1. STATES TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_featured_home BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 9999,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS states_name_ci_unique ON public.states (lower(name));

GRANT SELECT ON public.states TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.states TO authenticated;
GRANT ALL ON public.states TO service_role;

ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "states_public_read_active"
  ON public.states FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "states_admin_write"
  ON public.states FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER states_set_updated_at
  BEFORE UPDATE ON public.states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 2. Seed states from existing cities + known seller states
-- =========================================================================
INSERT INTO public.states (name, slug, is_active, sort_order)
SELECT DISTINCT initcap(btrim(state)),
       public.slugify(state),
       true,
       100
FROM public.cities_of_business
WHERE state IS NOT NULL AND btrim(state) <> ''
ON CONFLICT (slug) DO NOTHING;

-- Ensure Kaduna & Gombe states exist for sellers that need them
INSERT INTO public.states (name, slug, is_active, sort_order)
VALUES
  ('Kaduna', 'kaduna', true, 100),
  ('Gombe',  'gombe',  true, 100)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================================
-- 3. Cities: add state_id FK, backfill, constrain
-- =========================================================================
ALTER TABLE public.cities_of_business
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id) ON DELETE RESTRICT;

UPDATE public.cities_of_business c
SET state_id = s.id
FROM public.states s
WHERE c.state_id IS NULL
  AND lower(s.name) = lower(c.state);

-- Fix wrong Zaria slug
UPDATE public.cities_of_business
SET slug = 'zaria-kaduna'
WHERE slug = 'kaduna' AND lower(name) = 'zaria';

-- Ensure Kaduna city exists under Kaduna state (for existing Kaduna sellers)
INSERT INTO public.cities_of_business (name, state, slug, is_active, sort_order, state_id)
SELECT 'Kaduna', 'Kaduna', 'kaduna-city', true, 100, s.id
FROM public.states s WHERE s.slug = 'kaduna'
ON CONFLICT (slug) DO NOTHING;

-- Ensure Gombe city exists under Gombe state
INSERT INTO public.cities_of_business (name, state, slug, is_active, sort_order, state_id)
SELECT 'Gombe', 'Gombe', 'gombe-city', true, 100, s.id
FROM public.states s WHERE s.slug = 'gombe'
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.cities_of_business
  ALTER COLUMN state_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cities_state_name_unique
  ON public.cities_of_business (state_id, lower(name));

-- =========================================================================
-- 4. Sellers: add state_id, backfill from city_id, then from city text
-- =========================================================================
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id);

-- (a) Backfill city_id for sellers that only have city text (case-insensitive)
UPDATE public.sellers s
SET city_id = c.id
FROM public.cities_of_business c
WHERE s.city_id IS NULL
  AND s.city IS NOT NULL
  AND lower(btrim(s.city)) = lower(c.name);

-- (b) Backfill state_id from resolved city_id
UPDATE public.sellers s
SET state_id = c.state_id
FROM public.cities_of_business c
WHERE s.state_id IS NULL
  AND s.city_id = c.id;

-- (c) Backfill sellers.state text from resolved state (for compatibility)
UPDATE public.sellers s
SET state = st.name
FROM public.states st
WHERE (s.state IS NULL OR s.state = '')
  AND s.state_id = st.id;

-- =========================================================================
-- 5. Replace ensure_city / add ensure_state
-- =========================================================================
CREATE OR REPLACE FUNCTION public.ensure_state(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := initcap(btrim(_name));
  v_id UUID;
  v_slug TEXT;
  v_base TEXT;
  v_i INT := 1;
BEGIN
  IF v_name IS NULL OR v_name = '' THEN RETURN NULL; END IF;

  SELECT id INTO v_id FROM public.states WHERE lower(name) = lower(v_name) LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  v_base := public.slugify(v_name);
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.states WHERE slug = v_slug) LOOP
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  END LOOP;

  INSERT INTO public.states (name, slug, is_active, sort_order)
  VALUES (v_name, v_slug, false, 9999)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_city(_name text, _state text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := initcap(btrim(_name));
  v_state TEXT := initcap(btrim(_state));
  v_state_id UUID;
  v_id UUID;
  v_slug TEXT;
  v_base TEXT;
  v_i INT := 1;
BEGIN
  IF v_name IS NULL OR v_name = '' OR v_state IS NULL OR v_state = '' THEN
    RETURN NULL;
  END IF;

  v_state_id := public.ensure_state(v_state);
  IF v_state_id IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO v_id
  FROM public.cities_of_business
  WHERE state_id = v_state_id AND lower(name) = lower(v_name)
  LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  v_base := public.slugify(v_name) || '-' || public.slugify(v_state);
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.cities_of_business WHERE slug = v_slug) LOOP
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  END LOOP;

  INSERT INTO public.cities_of_business (name, state, slug, is_active, is_featured_home, sort_order, state_id)
  VALUES (v_name, v_state, v_slug, false, false, 9999, v_state_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- =========================================================================
-- 6. Update sellers trigger to also set state_id
-- =========================================================================
CREATE OR REPLACE FUNCTION public.sellers_auto_set_city_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state_id UUID;
BEGIN
  -- Resolve city_id from text if not provided
  IF NEW.city_id IS NULL
     AND NEW.city IS NOT NULL AND btrim(NEW.city) <> ''
     AND NEW.state IS NOT NULL AND btrim(NEW.state) <> '' THEN
    NEW.city_id := public.ensure_city(NEW.city, NEW.state);
  END IF;

  -- Always resolve state_id from city_id when possible
  IF NEW.city_id IS NOT NULL THEN
    SELECT state_id INTO v_state_id
    FROM public.cities_of_business WHERE id = NEW.city_id;
    IF v_state_id IS NOT NULL THEN
      NEW.state_id := v_state_id;
    END IF;
  ELSIF NEW.state_id IS NULL
        AND NEW.state IS NOT NULL AND btrim(NEW.state) <> '' THEN
    NEW.state_id := public.ensure_state(NEW.state);
  END IF;

  RETURN NEW;
END;
$$;

-- =========================================================================
-- 7. Recreate stat views
-- =========================================================================
DROP VIEW IF EXISTS public.cities_with_stats CASCADE;
DROP VIEW IF EXISTS public.states_with_stats CASCADE;

CREATE VIEW public.states_with_stats
WITH (security_invoker = true)
AS
SELECT
  st.id, st.name, st.slug, st.is_active, st.is_featured_home, st.sort_order,
  (SELECT COUNT(*)::int FROM public.cities_of_business c WHERE c.state_id = st.id) AS cities_count,
  (SELECT COUNT(*)::int FROM public.sellers s
    WHERE s.state_id = st.id
      AND s.status = 'active'
      AND s.verification_status = 'approved'
      AND s.is_blocked = false) AS sellers_count,
  (SELECT COUNT(*)::int FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE s.state_id = st.id
      AND p.status = 'active'
      AND s.status = 'active'
      AND s.verification_status = 'approved'
      AND s.is_blocked = false) AS products_count
FROM public.states st;

CREATE VIEW public.cities_with_stats
WITH (security_invoker = true)
AS
SELECT
  c.id, c.name, c.slug, c.state_id, c.is_active, c.is_featured_home, c.sort_order,
  st.name AS state_name,
  st.slug AS state_slug,
  st.is_active AS state_is_active,
  (SELECT COUNT(*)::int FROM public.sellers s
    WHERE s.city_id = c.id
      AND s.status = 'active'
      AND s.verification_status = 'approved'
      AND s.is_blocked = false) AS sellers_count,
  (SELECT COUNT(*)::int FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE s.city_id = c.id
      AND p.status = 'active'
      AND s.status = 'active'
      AND s.verification_status = 'approved'
      AND s.is_blocked = false) AS products_count
FROM public.cities_of_business c
JOIN public.states st ON st.id = c.state_id;

GRANT SELECT ON public.states_with_stats TO anon, authenticated;
GRANT SELECT ON public.cities_with_stats TO anon, authenticated;
