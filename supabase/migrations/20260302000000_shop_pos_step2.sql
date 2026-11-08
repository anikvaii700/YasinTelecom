-- ==============================================================================
-- MoSaFa Shop POS: Step 2 Schema — Product, Inventory, Customer, Supplier & Purchases
-- Migration: 20260302000000_shop_pos_step2.sql
-- Description: Complete catalog, inventory valuation, stock movements, CRM,
--              supplier payables, and purchase order processing with RLS.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATEGORIES (Parent/Child hierarchy, bilingual names, icons)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name_bn VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    description TEXT,
    icon_name VARCHAR(50) DEFAULT 'Folder',
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_categories_shop_id ON public.categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_shop_slug ON public.categories(shop_id, slug);

-- ------------------------------------------------------------------------------
-- 2. CUSTOMERS (Accounts, contact info, opening balances, receivables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    address TEXT,
    email VARCHAR(100),
    notes TEXT,
    opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    current_due NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_purchases NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers(mobile_number);

-- ------------------------------------------------------------------------------
-- 3. SUPPLIERS (Vendors, payables, contact person, invoices)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    email VARCHAR(100),
    notes TEXT,
    opening_payable NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    current_payable NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_purchases NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_suppliers_shop_id ON public.suppliers(shop_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON public.suppliers(phone);

-- ------------------------------------------------------------------------------
-- 4. PRODUCTS (Catalog, pricing, units, barcodes, stock alerts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    name_bn VARCHAR(200) NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    sku VARCHAR(60) NOT NULL,
    barcode VARCHAR(60),
    brand VARCHAR(100),
    model VARCHAR(100),
    description TEXT,
    image_url TEXT,
    purchase_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    wholesale_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(30) NOT NULL DEFAULT 'Piece',
    min_stock_level INTEGER NOT NULL DEFAULT 5,
    current_stock NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    avg_purchase_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    warranty_duration VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_shop_sku ON public.products(shop_id, sku);

-- ------------------------------------------------------------------------------
-- 5. PRODUCT_VARIANTS (Color, Size, Specification, Option Matrix)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL, -- e.g. "Size: XL, Color: Blue"
    sku VARCHAR(60),
    barcode VARCHAR(60),
    purchase_price NUMERIC(14, 2),
    selling_price NUMERIC(14, 2),
    stock_delta NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);

-- ------------------------------------------------------------------------------
-- 6. STOCK_MOVEMENTS (Immutable audit trail of all inventory transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type VARCHAR(30) NOT NULL, -- PURCHASE, SALE, ADJUSTMENT_IN, ADJUSTMENT_OUT, DAMAGE, LOSS, INITIAL
    quantity_delta NUMERIC(14, 2) NOT NULL, -- Positive for in, negative for out
    previous_stock NUMERIC(14, 2) NOT NULL,
    new_stock NUMERIC(14, 2) NOT NULL,
    unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reference_id VARCHAR(100), -- Invoice number or Purchase Order ID
    notes TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_shop ON public.stock_movements(shop_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. PURCHASES & PURCHASE_ITEMS (Vendor invoices, stock-in, payables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(80) NOT NULL,
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    additional_costs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Cash',
    idempotency_key VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, CANCELLED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_purchases_shop ON public.purchases(shop_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_shop_invoice ON public.purchases(shop_id, invoice_number);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(14, 2) NOT NULL,
    unit_purchase_price NUMERIC(14, 2) NOT NULL,
    subtotal NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON public.purchase_items(product_id);

-- ------------------------------------------------------------------------------
-- 8. SUPPLIER & CUSTOMER PAYMENTS (Ledger settlements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Cash',
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.customer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Cash',
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_shop ON public.supplier_payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_shop ON public.customer_payments(shop_id);

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members view categories" ON public.categories FOR SELECT USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members insert categories" ON public.categories FOR INSERT WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "Shop members update categories" ON public.categories FOR UPDATE USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members delete categories" ON public.categories FOR DELETE USING (public.is_shop_member(shop_id));

CREATE POLICY "Shop members view products" ON public.products FOR SELECT USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members insert products" ON public.products FOR INSERT WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "Shop members update products" ON public.products FOR UPDATE USING (public.is_shop_member(shop_id));

CREATE POLICY "Shop members view stock movements" ON public.stock_movements FOR SELECT USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members insert stock movements" ON public.stock_movements FOR INSERT WITH CHECK (public.is_shop_member(shop_id));

CREATE POLICY "Shop members view customers" ON public.customers FOR SELECT USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members insert customers" ON public.customers FOR INSERT WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "Shop members update customers" ON public.customers FOR UPDATE USING (public.is_shop_member(shop_id));

CREATE POLICY "Shop members view suppliers" ON public.suppliers FOR SELECT USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (public.is_shop_member(shop_id));
CREATE POLICY "Shop members update suppliers" ON public.suppliers FOR UPDATE USING (public.is_shop_member(shop_id));

CREATE POLICY "Shop members view purchases" ON public.purchases FOR SELECT USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members insert purchases" ON public.purchases FOR INSERT WITH CHECK (public.is_shop_member(shop_id));
