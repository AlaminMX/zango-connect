
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon_emoji TEXT NOT NULL DEFAULT '🛍️',
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (name, slug, icon_emoji, sort_order) VALUES
  ('Food & Homemade Goods', 'food', '🍲', 1),
  ('Fashion & Clothing', 'fashion', '👗', 2),
  ('Beauty & Skincare', 'beauty', '💄', 3),
  ('Crafts & Handmade', 'crafts', '🧵', 4),
  ('Accessories', 'accessories', '👜', 5),
  ('Home & Living', 'home', '🏺', 6);

-- Sellers
CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  whatsapp_number TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  bio TEXT,
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE INDEX sellers_category_idx ON public.sellers(category);
CREATE INDEX sellers_city_idx ON public.sellers(city);

CREATE POLICY "sellers_public_read" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "sellers_insert_own" ON public.sellers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sellers_update_own" ON public.sellers FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sellers_delete_admin" ON public.sellers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX products_seller_idx ON public.products(seller_id);

CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_owner_write" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Vouches
CREATE TABLE public.vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  vouched_seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(voucher_seller_id, vouched_seller_id),
  CHECK (voucher_seller_id <> vouched_seller_id)
);
ALTER TABLE public.vouches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vouches_public_read" ON public.vouches FOR SELECT USING (true);
CREATE POLICY "vouches_insert_own" ON public.vouches FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = voucher_seller_id AND s.user_id = auth.uid())
);

-- Auto-verify when 2+ vouches
CREATE OR REPLACE FUNCTION public.check_vouch_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.vouches WHERE vouched_seller_id = NEW.vouched_seller_id) >= 2 THEN
    UPDATE public.sellers SET is_verified = true WHERE id = NEW.vouched_seller_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vouch_verify_trigger AFTER INSERT ON public.vouches
  FOR EACH ROW EXECUTE FUNCTION public.check_vouch_verification();

-- WhatsApp click tracking
CREATE TABLE public.whatsapp_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clicks_public_insert" ON public.whatsapp_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "clicks_admin_read" ON public.whatsapp_clicks FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('sutura', 'sutura', true) ON CONFLICT DO NOTHING;
CREATE POLICY "sutura_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'sutura');
CREATE POLICY "sutura_auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sutura' AND auth.uid() IS NOT NULL);
CREATE POLICY "sutura_owner_update" ON storage.objects FOR UPDATE USING (bucket_id = 'sutura' AND auth.uid() = owner);
CREATE POLICY "sutura_owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'sutura' AND auth.uid() = owner);

-- Default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
