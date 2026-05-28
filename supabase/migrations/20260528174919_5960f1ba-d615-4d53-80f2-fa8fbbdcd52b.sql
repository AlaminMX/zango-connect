
-- 1. Prevent non-admins from changing is_verified
CREATE OR REPLACE FUNCTION public.prevent_self_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can change is_verified';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sellers_prevent_self_verify ON public.sellers;
CREATE TRIGGER sellers_prevent_self_verify
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_verify();

-- 2. Harden has_role against NULL user id
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Restrict EXECUTE on SECURITY DEFINER functions that don't need public access.
-- has_role stays callable (used in RLS via authenticated). Trigger functions are
-- only invoked internally, so revoke from public/anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_vouch_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_for_email() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_verify() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;

-- 4. Scope sutura storage uploads to the uploader's own folder prefix
DROP POLICY IF EXISTS sutura_auth_upload ON storage.objects;
CREATE POLICY sutura_auth_upload
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sutura'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Restrict listing of sutura bucket via API to owners only.
-- Public URLs (CDN) still serve image content for any object — public:true on
-- the bucket bypasses RLS for direct object fetches. This only blocks list().
DROP POLICY IF EXISTS sutura_public_read ON storage.objects;
CREATE POLICY sutura_owner_list
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'sutura' AND auth.uid() = owner);
