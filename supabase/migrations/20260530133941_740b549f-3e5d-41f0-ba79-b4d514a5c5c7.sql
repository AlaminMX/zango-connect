
REVOKE EXECUTE ON FUNCTION public.prevent_self_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_product_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_notice_fields() FROM PUBLIC, anon, authenticated;
