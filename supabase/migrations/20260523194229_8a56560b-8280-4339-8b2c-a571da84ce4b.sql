
-- Create admin user in auth schema
DO $$
DECLARE
  admin_uid uuid;
  existing_uid uuid;
BEGIN
  SELECT id INTO existing_uid FROM auth.users WHERE email = 'Suturadmin@nexel.store' LIMIT 1;
  IF existing_uid IS NULL THEN
    admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_uid, 'authenticated', 'authenticated',
      'Suturadmin@nexel.store',
      crypt('$utur@dm!n123', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'Suturadmin@nexel.store'),
      'email', admin_uid::text, now(), now(), now());
  ELSE
    admin_uid := existing_uid;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (admin_uid, 'admin')
  ON CONFLICT DO NOTHING;
END $$;

-- Trigger to auto-grant admin role for this specific email on future signups
CREATE OR REPLACE FUNCTION public.grant_admin_for_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'Suturadmin@nexel.store' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_email();
