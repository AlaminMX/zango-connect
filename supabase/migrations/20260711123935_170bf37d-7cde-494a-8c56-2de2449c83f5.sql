-- 1. Grant anon column-level SELECT on safe seller columns.
GRANT SELECT (
  id, user_id, name, business_name, slug, whatsapp_number,
  city, city_id, category, bio, profile_photo_url, cover_photo_url,
  is_verified, rating, created_at, status, verification_status, is_blocked
) ON public.sellers TO anon;

-- 2. Back-fill city_id for sellers where city name matches a known city (case-insensitive).
UPDATE public.sellers s
SET city_id = c.id
FROM public.cities_of_business c
WHERE s.city_id IS NULL
  AND s.city IS NOT NULL
  AND lower(trim(s.city)) = lower(trim(c.name));