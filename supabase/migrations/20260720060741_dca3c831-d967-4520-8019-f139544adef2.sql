
-- 1. New column: featured on homepage
ALTER TABLE public.cities_of_business
  ADD COLUMN IF NOT EXISTS is_featured_home BOOLEAN NOT NULL DEFAULT false;

-- 2. Slugify helper (idempotent)
CREATE OR REPLACE FUNCTION public.slugify(v TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(
    regexp_replace(lower(coalesce(v,'')), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  )
$$;

-- 3. ensure_city: find or create a city, return its id
CREATE OR REPLACE FUNCTION public.ensure_city(_name TEXT, _state TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := initcap(btrim(_name));
  v_state TEXT := initcap(btrim(_state));
  v_id UUID;
  v_slug TEXT;
  v_base TEXT;
  v_i INT := 1;
BEGIN
  IF v_name IS NULL OR v_name = '' OR v_state IS NULL OR v_state = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_id
  FROM public.cities_of_business
  WHERE lower(name) = lower(v_name) AND lower(state) = lower(v_state)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  v_base := public.slugify(v_name) || '-' || public.slugify(v_state);
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM public.cities_of_business WHERE slug = v_slug) LOOP
    v_i := v_i + 1;
    v_slug := v_base || '-' || v_i;
  END LOOP;

  INSERT INTO public.cities_of_business (name, state, slug, is_active, is_featured_home, sort_order)
  VALUES (v_name, v_state, v_slug, true, false, 9999)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_city(TEXT, TEXT) TO authenticated, service_role;

-- 4. Trigger on sellers to auto-assign city_id
CREATE OR REPLACE FUNCTION public.sellers_auto_set_city_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.city_id IS NULL
     AND NEW.city IS NOT NULL AND btrim(NEW.city) <> ''
     AND NEW.state IS NOT NULL AND btrim(NEW.state) <> '' THEN
    NEW.city_id := public.ensure_city(NEW.city, NEW.state);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sellers_set_city_id_before_write ON public.sellers;
CREATE TRIGGER sellers_set_city_id_before_write
BEFORE INSERT OR UPDATE OF city, state, city_id ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.sellers_auto_set_city_id();

-- 5. Backfill existing sellers
UPDATE public.sellers s
SET city_id = public.ensure_city(s.city, s.state)
WHERE s.city_id IS NULL
  AND s.city IS NOT NULL AND btrim(s.city) <> ''
  AND s.state IS NOT NULL AND btrim(s.state) <> '';

-- 6. Recreate view with security_invoker and include new column
DROP VIEW IF EXISTS public.cities_with_stats;
CREATE VIEW public.cities_with_stats
WITH (security_invoker = true) AS
SELECT
  c.id, c.name, c.state, c.slug,
  c.is_active, c.is_featured_home, c.sort_order,
  c.created_at, c.updated_at,
  COALESCE(s.sellers_count, 0::bigint) AS sellers_count,
  COALESCE(s.sellers_30d, 0::bigint) AS sellers_added_30d,
  COALESCE(p.products_count, 0::bigint) AS products_count,
  COALESCE(p.products_30d, 0::bigint) AS products_added_30d
FROM public.cities_of_business c
LEFT JOIN (
  SELECT city_id,
         count(*) AS sellers_count,
         count(*) FILTER (WHERE created_at > now() - interval '30 days') AS sellers_30d
  FROM public.sellers
  WHERE city_id IS NOT NULL
    AND status = 'active'
    AND verification_status = 'approved'
    AND is_blocked = false
  GROUP BY city_id
) s ON s.city_id = c.id
LEFT JOIN (
  SELECT se.city_id,
         count(pr.*) AS products_count,
         count(pr.*) FILTER (WHERE pr.created_at > now() - interval '30 days') AS products_30d
  FROM public.products pr
  JOIN public.sellers se ON se.id = pr.seller_id
  WHERE se.city_id IS NOT NULL
    AND se.status = 'active'
    AND se.verification_status = 'approved'
    AND se.is_blocked = false
    AND pr.status = 'active'
  GROUP BY se.city_id
) p ON p.city_id = c.id;

GRANT SELECT ON public.cities_with_stats TO anon, authenticated, service_role;
