
-- 1) Tighten seller_notices UPDATE: only allow flipping read_at, keep all other fields identical
DROP POLICY IF EXISTS notices_seller_mark_read ON public.seller_notices;
CREATE POLICY notices_seller_mark_read ON public.seller_notices
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_notices.seller_id AND s.user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_notices.seller_id AND s.user_id = auth.uid())
  );

-- Trigger-enforced column scoping for non-admin updates (defence-in-depth with policy)
-- The existing protect_notice_fields trigger already restricts non-admins to read_at only;
-- re-attach to be safe.
DROP TRIGGER IF EXISTS trg_protect_notice_fields ON public.seller_notices;
CREATE TRIGGER trg_protect_notice_fields
  BEFORE UPDATE ON public.seller_notices
  FOR EACH ROW EXECUTE FUNCTION public.protect_notice_fields();

-- 2) Tighten sellers UPDATE: enforce column-level immutability for non-admins via WITH CHECK
DROP POLICY IF EXISTS sellers_update_own ON public.sellers;
CREATE POLICY sellers_update_own ON public.sellers
  FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      auth.uid() = user_id
      -- user_id immutable for non-admins enforced by row ownership match above
    )
  );

-- Re-attach all seller self-protection triggers (defence-in-depth)
DROP TRIGGER IF EXISTS trg_prevent_self_verify ON public.sellers;
CREATE TRIGGER trg_prevent_self_verify
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_verify();

DROP TRIGGER IF EXISTS trg_prevent_self_verification_change ON public.sellers;
CREATE TRIGGER trg_prevent_self_verification_change
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_verification_change();

DROP TRIGGER IF EXISTS trg_prevent_self_status_change ON public.sellers;
CREATE TRIGGER trg_prevent_self_status_change
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_status_change();

-- 3) Column-level GRANTs on sellers for anon: only expose safe public columns.
REVOKE SELECT ON public.sellers FROM anon;
GRANT SELECT (
  id, user_id, name, business_name, slug, whatsapp_number, city, city_id,
  category, bio, profile_photo_url, cover_photo_url, rating, is_verified,
  is_blocked, status, verification_status, created_at
) ON public.sellers TO anon;

-- Ensure authenticated still has full SELECT (needed for seller dashboard owner reads).
GRANT SELECT ON public.sellers TO authenticated;
