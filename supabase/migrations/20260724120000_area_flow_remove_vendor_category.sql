-- Move the public/vendor language from City to Area while preserving the
-- existing cities_of_business storage and auto-registration machinery for
-- backwards compatibility with deployed clients.

-- Area aliases for new code/API consumers. The underlying table remains
-- cities_of_business so existing products, sellers, RLS policies, and FKs do
-- not break during rollout.
CREATE OR REPLACE VIEW public.areas_with_stats
WITH (security_invoker = true)
AS
SELECT * FROM public.cities_with_stats;

GRANT SELECT ON public.areas_with_stats TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ensure_area(_name text, _state text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.ensure_city(_name, _state);
$$;

GRANT EXECUTE ON FUNCTION public.ensure_area(text, text) TO authenticated, service_role;

-- Vendor categories are no longer part of the onboarding model. Keep the
-- legacy column nullable for compatibility with older rows/screens, and copy
-- any historical vendor category to uncategorized products that were relying
-- on the old single-category vendor architecture.
ALTER TABLE public.sellers
  ALTER COLUMN category DROP NOT NULL;

UPDATE public.products p
SET category = s.category
FROM public.sellers s
WHERE p.seller_id = s.id
  AND (p.category IS NULL OR btrim(p.category) = '')
  AND s.category IS NOT NULL
  AND btrim(s.category) <> '';

-- Make product categories first-class and optional-safe for legacy imports.
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);

COMMENT ON COLUMN public.sellers.category IS 'Deprecated: vendors no longer own a single category. Product rows own category.';
COMMENT ON COLUMN public.sellers.city IS 'Deprecated display name retained for compatibility; represents selected business area.';
COMMENT ON COLUMN public.sellers.city_id IS 'Deprecated name retained for compatibility; references selected business area in cities_of_business.';
