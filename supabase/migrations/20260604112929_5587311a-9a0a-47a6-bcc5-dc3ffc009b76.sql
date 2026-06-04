
-- Fix 1: Extend self-protection trigger to cover is_blocked (admin-only field)
CREATE OR REPLACE FUNCTION public.prevent_self_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
      OR NEW.blocked_at IS DISTINCT FROM OLD.blocked_at
      OR NEW.blocked_reason IS DISTINCT FROM OLD.blocked_reason
      OR NEW.is_blocked IS DISTINCT FROM OLD.is_blocked)
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change moderation fields';
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on sellers
DROP TRIGGER IF EXISTS prevent_self_status_change_trg ON public.sellers;
CREATE TRIGGER prevent_self_status_change_trg
BEFORE UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_status_change();

-- Ensure existing protective triggers are attached
DROP TRIGGER IF EXISTS prevent_self_verify_trg ON public.sellers;
CREATE TRIGGER prevent_self_verify_trg
BEFORE UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_verify();

DROP TRIGGER IF EXISTS prevent_self_verification_change_trg ON public.sellers;
CREATE TRIGGER prevent_self_verification_change_trg
BEFORE UPDATE ON public.sellers
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_verification_change();

-- Fix 2: Hide sensitive seller columns from anonymous public reads
-- Authenticated users (owners + admins) keep full access via existing RLS row policies.
REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (
  id, user_id, name, business_name, slug, whatsapp_number, city, city_id,
  category, bio, profile_photo_url, cover_photo_url, rating, is_verified,
  is_blocked, status, verification_status, created_at
) ON public.sellers TO anon;

-- Fix 3: Restrict has_role EXECUTE to authenticated/service_role (not anon)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
