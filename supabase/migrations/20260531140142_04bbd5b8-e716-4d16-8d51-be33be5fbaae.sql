
ALTER VIEW public.cities_with_stats SET (security_invoker = on);

REVOKE EXECUTE ON FUNCTION public.block_unapproved_product_writes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_verification_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cap_recently_viewed() FROM PUBLIC, anon, authenticated;
