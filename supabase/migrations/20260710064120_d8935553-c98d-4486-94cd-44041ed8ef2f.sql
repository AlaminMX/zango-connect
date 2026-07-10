
-- Add onboarding_status to sellers
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'step2_complete';

-- Create admin_settings key/value table
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_settings TO anon, authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read settings" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.admin_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.admin_settings (key, value) VALUES ('vouch_threshold', '3')
ON CONFLICT (key) DO NOTHING;
