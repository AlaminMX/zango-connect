
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.check_vouch_verification() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

DROP POLICY IF EXISTS "clicks_public_insert" ON public.whatsapp_clicks;
CREATE POLICY "clicks_public_insert" ON public.whatsapp_clicks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id));
