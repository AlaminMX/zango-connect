-- Existing projects may still have the legacy signup trigger.
DROP TRIGGER IF EXISTS on_auth_user_grant_admin ON auth.users;
DROP FUNCTION IF EXISTS public.grant_admin_for_email();

ALTER POLICY sellers_insert_own ON public.sellers
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND verification_status = 'pending'
    AND is_verified = false
    AND is_blocked = false
    AND status = 'active'
    AND verification_decided_at IS NULL
    AND verification_decided_by IS NULL
    AND rejection_reason IS NULL
    AND subscription_expires_at IS NULL
    AND blocked_at IS NULL
    AND blocked_reason IS NULL
  );

ALTER POLICY sellers_public_read ON public.sellers
  TO anon, authenticated
  USING (status = 'active' AND verification_status = 'approved' AND is_blocked = false);

CREATE POLICY sellers_private_read ON public.sellers
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.has_role(auth.uid(), 'admin')));

-- The existing owner policy includes SELECT and allows admins to moderate.
ALTER POLICY products_owner_write ON public.products TO authenticated;

CREATE POLICY products_insert_with_default_moderation ON public.products
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_role(auth.uid(), 'admin'))
    OR (status = 'active' AND blocked_at IS NULL AND blocked_reason IS NULL)
  );

ALTER POLICY products_public_read ON public.products
  TO anon, authenticated
  USING (
    status = 'active' AND EXISTS (
      SELECT 1 FROM public.sellers
      WHERE sellers.id = products.seller_id
        AND sellers.status = 'active'
        AND sellers.verification_status = 'approved'
        AND sellers.is_blocked = false
    )
  );
