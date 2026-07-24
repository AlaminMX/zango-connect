-- Marketplace search performance and synonym expansion.
-- Trigram indexes accelerate forgiving ILIKE searches used by the shared search service.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_search_name_trgm
  ON public.products USING GIN (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_search_description_trgm
  ON public.products USING GIN (lower(description) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_search_category_trgm
  ON public.products USING GIN (lower(category) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sellers_search_business_name_trgm
  ON public.sellers USING GIN (lower(business_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sellers_search_category_trgm
  ON public.sellers USING GIN (lower(category) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_active_seller_category
  ON public.products (status, seller_id, category);

INSERT INTO public.synonym_groups (primary_term, synonyms, is_active) VALUES
('earbuds', ARRAY['earbud', 'ear pods', 'ear pod', 'earpods', 'earpod', 'earpiece', 'earpieces', 'wireless earbuds', 'bluetooth earbuds', 'earphones', 'headphones', 'headset'], true),
('power bank', ARRAY['power banks', 'powerbank', 'portable charger', 'battery pack', 'battery bank'], true),
('tv', ARRAY['television', 'smart tv', 'screen'], true),
('fridge', ARRAY['refrigerator', 'freezer'], true),
('sneakers', ARRAY['trainers', 'running shoes', 'running shoe', 'footwear'], true),
('usb c', ARRAY['usb-c', 'usbc', 'type c', 'type-c'], true)
ON CONFLICT (primary_term) DO UPDATE SET
  synonyms = ARRAY(SELECT DISTINCT term FROM unnest(synonym_groups.synonyms || EXCLUDED.synonyms) AS term),
  is_active = true,
  updated_at = now();
