# Sutura Market Advanced Search System - Implementation Guide

## Overview

This guide explains the new advanced search metadata system that has been implemented to dramatically improve product discoverability on the Sutura Market platform.

## What Was Built

### 1. **Metadata Generation Service** (`src/lib/search-metadata.functions.ts`)
Automatically generates rich metadata for every product:
- **Search Keywords**: Extracted from title, description, and category
- **Search Index**: Full-text searchable index combining keywords and category
- **Attributes**: Category-specific structured data (size, color, brand, etc.)

**Key Features:**
- Auto-generation triggered when products are created/updated
- Category-specific attribute schemas for Fashion, Beauty, Home, Food, Accessories, and Crafts
- Default synonym groups for common product variations (perfume↔fragrance, phone↔smartphone)

### 2. **Admin Metadata Manager** (`src/components/AdminMetadataManager.tsx`)
Complete admin UI for managing product metadata:
- View and edit search keywords for any product
- Manage category-specific attributes
- Batch regenerate metadata for all products or by category
- Add and manage synonym groups

**Location**: Added as a tab in the admin dashboard

### 3. **Advanced Search Algorithm** (`src/lib/advanced-search.ts`)
Sophisticated search ranking system with multiple scoring tiers:
- **Tier 1 (100 points)**: Exact title match
- **Tier 2 (90 points)**: Title starts with query
- **Tier 3 (80 points)**: Title contains query
- **Tier 4 (60 points)**: Search index contains query
- **Tier 5 (40 points)**: Description contains query
- **Synonym matches**: Expanded search queries (perfume finds fragrance products)

**Features:**
- Relevance-based ranking
- Price filtering
- Synonym expansion
- Search suggestions

### 4. **Server-Side Search Function** (`src/lib/search.functions.ts`)
Enhanced search API that leverages metadata:
- Uses product metadata for improved ranking
- Supports city and category filtering
- Returns scored results for optimal presentation
- Includes suggestion generation

### 5. **Product Enhancement UI** 
Updated product creation/editing flow:
- **ProductSheet Component**: Now includes category selection and category attributes
- **CategoryAttributesForm Component**: Displays context-specific fields (size, color, brand, etc.)
- Attributes are stored with metadata for better search and filtering

### 6. **Performance & Caching** (`src/lib/search-cache.ts`)
Utilities for optimized performance:
- **TTLCache**: In-memory caching with configurable time-to-live
- **Debounce/Throttle**: Reduces API calls during search
- **LocalStorage/SessionStorage**: Type-safe browser storage
- **BatchQueue**: Groups multiple requests to reduce API calls
- **Memoization**: Caches expensive computations

## Database Schema Required

The system expects these tables (migrations provided in `supabase/migrations/`):

```sql
-- Product metadata with searchable index
CREATE TABLE product_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id),
  search_keywords TEXT[] NOT NULL DEFAULT '{}',
  search_index TEXT NOT NULL,
  attributes JSONB DEFAULT '{}',
  metadata_version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Synonym groups for search expansion
CREATE TABLE synonym_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_term TEXT NOT NULL UNIQUE,
  synonyms TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Category-specific attributes definitions
CREATE TABLE category_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  attributes JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_product_metadata_search ON product_metadata USING GIN(search_keywords);
CREATE INDEX idx_product_metadata_index ON product_metadata USING GIN(search_index);
```

## How to Use

### For Sellers (Automatic)
1. When creating a product, optionally fill in:
   - Product category (autocompleted from seller's category)
   - Category-specific attributes (brand, size, color, etc.)
2. Metadata is automatically generated from title, description, and attributes
3. Updated whenever product is edited

### For Admins
1. Go to Admin Dashboard → Metadata Manager tab
2. Use "Regenerate All" to batch update all products or by category
3. Click edit icon on any product to manually adjust keywords and attributes
4. Manage synonym groups to expand search capabilities

### For Search Integration
```typescript
import { advancedSearchProducts } from "@/lib/search.functions";

// Server-side search with metadata ranking
const results = await advancedSearchProducts({
  query: "blue dress",
  city: "Lagos",
  category: "Fashion & Clothing",
  limit: 40,
});
```

### For Client-Side Optimization
```typescript
import { searchCache, debounce } from "@/lib/search-cache";

// Cache search results (5 minute TTL)
const cachedResults = searchCache.get("query-key");

// Debounce search input to reduce API calls
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);
```

## Category-Specific Attributes

The system supports these category attributes:

| Category | Attributes |
|----------|-----------|
| Fashion & Clothing | Size, Color, Material, Condition |
| Beauty & Skincare | Brand, Product Type, Skin Type, Volume |
| Home & Living | Material, Color, Size/Capacity, Condition |
| Food & Homemade Goods | Type, Weight/Quantity, Ingredients, Shelf Life |
| Accessories | Type, Material, Color, Condition |
| Crafts & Handmade | Type, Materials Used, Size, Customization |

## Default Synonym Groups

Pre-loaded synonyms for common product variations:
- perfume ↔ fragrance, scent, cologne, spray
- phone ↔ smartphone, mobile, cellular, handset
- shoes ↔ footwear, sneakers, boots, sandals, heels
- dress ↔ gown, frock, clothing, garment, outfit
- bag ↔ purse, handbag, satchel, tote, backpack
- And 5 more...

Admins can add custom synonym groups via the Metadata Manager.

## Performance Optimization

### Search Result Caching
- Results cached for 5 minutes
- Cache cleared when products are modified
- Reduces database queries significantly

### Debouncing
- Search input debounced by 300ms
- Prevents excessive API calls during typing
- Can be adjusted per implementation

### Database Indexes
- `search_keywords` indexed for fast keyword matching
- `search_index` GIN-indexed for full-text search
- `product_id` unique constraint prevents duplicates

### Batch Operations
- Metadata regeneration processes multiple products efficiently
- Batch queue groups requests to reduce API calls

## Migration Path

For existing products:

```bash
# 1. Run migrations to create new tables
supabase db push

# 2. Generate metadata for all existing products
# Via admin dashboard: Admin → Metadata Manager → "Regenerate All"
# OR via API: POST /api/metadata/regenerate-batch

# 3. Optionally import existing data
# Map old search fields to new attributes
```

## Success Metrics to Track

1. **Search Accuracy**: % of searches returning relevant results
2. **Click-Through Rate**: Clicks per search result
3. **Conversion**: Products from search results vs. browse
4. **Performance**: Search response time (target: <200ms)
5. **Cache Hit Rate**: % of searches served from cache

## Common Issues & Solutions

### Issue: Metadata not generating
**Solution**: Check that `product_metadata` table exists and `generateProductMetadata` is called after product creation.

### Issue: Slow search results
**Solution**: 
- Ensure database indexes are created
- Check that search_index is properly populated
- Implement caching layer
- Increase `limit` in batches if regenerating

### Issue: Synonyms not working
**Solution**: 
- Verify `synonym_groups` table has data
- Check synonym terms are lowercase
- Rebuild search metadata after adding synonyms

### Issue: Attributes not showing
**Solution**: 
- Confirm `CATEGORY_ATTRIBUTES` in `search-metadata.functions.ts` includes the category
- Check product has `category` field set
- Verify attributes JSONB is properly stored

## Next Steps

1. **Deploy**: Push migrations and new code to production
2. **Populate**: Run batch metadata generation
3. **Monitor**: Track search metrics and performance
4. **Iterate**: Refine synonym groups based on user behavior
5. **Expand**: Add more category-specific attributes as needed

## Files Modified

- `src/lib/search-metadata.functions.ts` - Metadata generation
- `src/lib/advanced-search.ts` - Search algorithm
- `src/lib/search.functions.ts` - Server-side search
- `src/lib/search-cache.ts` - Performance utilities
- `src/components/AdminMetadataManager.tsx` - Admin UI
- `src/components/CategoryAttributesForm.tsx` - Attributes form
- `src/components/ProductSheet.tsx` - Product creation enhanced
- `src/routes/seller.products.tsx` - Updated to use new props

## Support

For issues or questions:
1. Check this guide's "Common Issues" section
2. Review admin logs for errors
3. Verify database tables and indexes exist
4. Check browser console for client-side errors

---

**Version**: 1.0  
**Last Updated**: July 3, 2026
