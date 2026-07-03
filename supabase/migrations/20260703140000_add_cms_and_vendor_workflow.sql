-- Add onboarding_status column to sellers table
ALTER TABLE sellers ADD COLUMN onboarding_status TEXT DEFAULT 'draft' CHECK (onboarding_status IN ('draft', 'step1_complete', 'step2_complete', 'pending_approval', 'approved', 'rejected'));

-- Create featured_products_admin table for CMS management
CREATE TABLE featured_products_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id)
);

-- Create trending_sellers_admin table for CMS management
CREATE TABLE trending_sellers_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seller_id)
);

-- Create admin_audit_log table for tracking actions
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_featured_products_admin_product_id ON featured_products_admin(product_id);
CREATE INDEX idx_featured_products_admin_display_order ON featured_products_admin(display_order);
CREATE INDEX idx_trending_sellers_admin_seller_id ON trending_sellers_admin(seller_id);
CREATE INDEX idx_trending_sellers_admin_display_order ON trending_sellers_admin(display_order);
CREATE INDEX idx_sellers_onboarding_status ON sellers(onboarding_status);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at);
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);

-- Add RLS policies for featured_products_admin
ALTER TABLE featured_products_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read featured_products_admin"
  ON featured_products_admin
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage featured_products_admin"
  ON featured_products_admin
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE email LIKE '%@admin.%' OR id IN (SELECT user_id FROM sellers WHERE is_admin = true)
    )
  );

-- Add RLS policies for trending_sellers_admin
ALTER TABLE trending_sellers_admin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read trending_sellers_admin"
  ON trending_sellers_admin
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage trending_sellers_admin"
  ON trending_sellers_admin
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE email LIKE '%@admin.%' OR id IN (SELECT user_id FROM sellers WHERE is_admin = true)
    )
  );

-- Add RLS policies for admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin_audit_log"
  ON admin_audit_log
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE email LIKE '%@admin.%' OR id IN (SELECT user_id FROM sellers WHERE is_admin = true)
    )
  );

CREATE POLICY "Admins can write to admin_audit_log"
  ON admin_audit_log
  FOR INSERT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE email LIKE '%@admin.%' OR id IN (SELECT user_id FROM sellers WHERE is_admin = true)
    )
  );
