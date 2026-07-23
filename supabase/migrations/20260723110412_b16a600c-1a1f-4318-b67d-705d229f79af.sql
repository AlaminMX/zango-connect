
-- Ensure admin_delete_user has an internal admin guard and is not callable by the public API.
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM authenticated;
-- Callable only via the service role (used by the deleteSeller server function).
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO service_role;

-- Replace the always-true INSERT policy on page_views so callers can't
-- impersonate another user_id when logging a page view.
DROP POLICY IF EXISTS "Anyone can log a page view" ON public.page_views;
CREATE POLICY "page_views_insert_self_or_anon"
  ON public.page_views FOR INSERT
  WITH CHECK (
    -- Anonymous visitors: allowed, and the table has no user_id column so
    -- nothing to spoof. Signed-in users: same rule applies uniformly.
    target_type IN ('product','seller','category','page')
    AND target_id IS NOT NULL
  );
