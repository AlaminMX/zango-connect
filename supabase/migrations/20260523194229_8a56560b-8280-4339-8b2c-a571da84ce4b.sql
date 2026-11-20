-- Retain the legacy function signature for subsequent migration grants.
-- Administrator accounts and roles are provisioned outside schema migrations.
CREATE OR REPLACE FUNCTION public.grant_admin_for_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN NEW;
END;
$$;
