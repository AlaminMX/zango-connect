-- ============================================================================
-- SEARCH METADATA SYSTEM: Advanced product search with automatic metadata,
-- synonyms, and structured attributes for marketplace search ranking
-- ============================================================================

-- 1. PRODUCT_METADATA TABLE
-- Stores auto-generated search keywords, full-text index, and attributes
CREATE TABLE public.product_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  search_keywords TEXT[] NOT NULL DEFAULT '{}',
  search_index TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(
      (SELECT name FROM public.products WHERE id = product_id), '') || ' ' ||
      array_to_string(search_keywords, ' ')
    )
  ) STORED,
  attributes JSONB DEFAULT '{}',
  metadata_version INT DEFAULT 1,
  last_regenerated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id)
);

CREATE INDEX idx_product_metadata_search_index ON public.product_metadata USING GIN (search_index);
CREATE INDEX idx_product_metadata_product_id ON public.product_metadata (product_id);
CREATE INDEX idx_product_metadata_keywords ON public.product_metadata USING GIN (search_keywords);

-- 2. SYNONYM_GROUPS TABLE
-- Maps primary search terms to their synonyms for expanded matching
CREATE TABLE public.synonym_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_term TEXT NOT NULL UNIQUE,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_synonym_groups_primary ON public.synonym_groups (primary_term);
CREATE INDEX idx_synonym_groups_category ON public.synonym_groups (category_id);
CREATE INDEX idx_synonym_groups_active ON public.synonym_groups (is_active);

-- 3. PRODUCT_ATTRIBUTES TABLE
-- Stores structured category-specific attributes (brand, size, color, etc.)
CREATE TABLE public.product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_key TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  attribute_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, attribute_key)
);

CREATE INDEX idx_product_attributes_product ON public.product_attributes (product_id);
CREATE INDEX idx_product_attributes_key_value ON public.product_attributes (attribute_key, attribute_value);

-- 4. CATEGORY_ATTRIBUTE_SCHEMA TABLE
-- Defines what attributes are available for each category
CREATE TABLE public.category_attribute_schema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  attribute_keys JSONB DEFAULT '{}', -- { "brand": { "type": "text", "order": 0 }, "size": { "type": "select", "options": [...], "order": 1 } }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_category_attribute_schema_category ON public.category_attribute_schema (category_id);

-- 5. SEARCH_RANKING_SCORES TABLE (for analytics/optimization)
-- Tracks which search terms map to which products for relevance tuning
CREATE TABLE public.search_ranking_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  rank_score FLOAT DEFAULT 0,
  match_type TEXT DEFAULT 'full', -- 'full', 'keyword', 'synonym', 'category'
  clicked_count INT DEFAULT 0,
  viewed_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_search_ranking_scores_product ON public.search_ranking_scores (product_id);
CREATE INDEX idx_search_ranking_scores_term ON public.search_ranking_scores (search_term);
CREATE INDEX idx_search_ranking_scores_score ON public.search_ranking_scores (rank_score DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate keywords for a product
CREATE OR REPLACE FUNCTION public.generate_product_keywords(
  p_product_id UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keywords TEXT[] := '{}';
  v_product RECORD;
  v_words TEXT[];
  v_word TEXT;
BEGIN
  -- Get product data
  SELECT name, description INTO v_product
  FROM public.products
  WHERE id = p_product_id;

  IF v_product IS NULL THEN
    RETURN v_keywords;
  END IF;

  -- Split product name and description into words
  v_words := ARRAY[]::TEXT[];

  -- Add words from product name (with weight)
  IF v_product.name IS NOT NULL THEN
    v_words := v_words || regexp_split_to_array(
      LOWER(v_product.name),
      '\s+',
      'g'
    );
  END IF;

  -- Add words from description (if not already in name)
  IF v_product.description IS NOT NULL THEN
    v_words := v_words || regexp_split_to_array(
      LOWER(v_product.description),
      '\s+',
      'g'
    );
  END IF;

  -- Clean and deduplicate
  SELECT ARRAY_AGG(DISTINCT word) INTO v_keywords
  FROM UNNEST(v_words) AS word
  WHERE word ~ '^[a-z0-9]+$'
    AND LENGTH(word) > 1;

  RETURN COALESCE(v_keywords, '{}');
END;
$$;

-- Function to regenerate metadata for a product
CREATE OR REPLACE FUNCTION public.regenerate_product_metadata(
  p_product_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.product_metadata (product_id, search_keywords, last_regenerated_at)
  VALUES (
    p_product_id,
    public.generate_product_keywords(p_product_id),
    now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    search_keywords = EXCLUDED.search_keywords,
    last_regenerated_at = now(),
    metadata_version = metadata_version + 1,
    updated_at = now();
END;
$$;

-- Trigger to auto-regenerate metadata when product is created/updated
CREATE OR REPLACE FUNCTION public.trigger_regenerate_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.regenerate_product_metadata(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_product_metadata_regenerate ON public.products;
CREATE TRIGGER trigger_product_metadata_regenerate
AFTER INSERT OR UPDATE OF name, description ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.trigger_regenerate_metadata();

-- ============================================================================
-- INITIAL SYNONYMS (can be extended by admins)
-- ============================================================================

INSERT INTO public.synonym_groups (primary_term, synonyms, is_active) VALUES
('phone', ARRAY['smartphone', 'mobile', 'device', 'handset'], true),
('perfume', ARRAY['fragrance', 'scent', 'cologne', 'eau de cologne'], true),
('watch', ARRAY['timepiece', 'wristwatch'], true),
('shoe', ARRAY['footwear', 'sneaker', 'boot'], true),
('bag', ARRAY['backpack', 'purse', 'satchel', 'handbag'], true),
('cloth', ARRAY['clothing', 'garment', 'dress', 'shirt'], true),
('pants', ARRAY['trousers', 'jeans', 'shorts'], true),
('jacket', ARRAY['coat', 'blazer', 'windbreaker'], true),
('used', ARRAY['second-hand', 'preowned', 'refurbished'], true),
('new', ARRAY['brand new', 'original', 'unopened'], true),
('laptop', ARRAY['notebook', 'computer', 'pc'], true),
('tablet', ARRAY['ipad', 'pad'], true),
('headphone', ARRAY['earphone', 'earbud', 'headset'], true),
('camera', ARRAY['phone camera', 'digital camera'], true),
('furniture', ARRAY['chair', 'table', 'sofa', 'cabinet'], true),
('bed', ARRAY['mattress', 'bedframe'], true),
('kitchen', ARRAY['appliance', 'cookware', 'utensil'], true)
ON CONFLICT DO NOTHING;
