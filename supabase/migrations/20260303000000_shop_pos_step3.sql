-- ==============================================================================
-- MoSaFa Shop POS: Step 3 Schema — POS Terminal, Sales, Invoicing & Cash Registers
-- Migration: 20260303000000_shop_pos_step3.sql
-- Description: Point of Sale billing transactions, line items, multi-payment splits,
--              cash register shift reconciliation, and tenant-isolated RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SALES (POS invoices, financial calculations, payment breakdowns)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(20),
    invoice_number VARCHAR(50) NOT NULL,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cart_discount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vat_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    change_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Cash',
    split_payments JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'HOLD', 'CANCELLED', 'REFUNDED')),
    items_count INTEGER NOT NULL DEFAULT 1,
    total_profit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    cashier_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON public.sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_shop_invoice ON public.sales(shop_id, invoice_number);

-- ------------------------------------------------------------------------------
-- 2. SALE_ITEMS (Individual invoice line items with historical costs & discounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name_bn VARCHAR(200) NOT NULL,
    product_name_en VARCHAR(200),
    sku VARCHAR(60) NOT NULL,
    barcode VARCHAR(60),
    quantity NUMERIC(14, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- ------------------------------------------------------------------------------
-- 3. CASH_REGISTERS (Register shifts, opening float & cash drawer reconciliation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    opened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    opening_cash NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    closing_cash NUMERIC(14, 2),
    expected_cash NUMERIC(14, 2),
    total_cash_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_digital_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_due_sales NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    notes TEXT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_shop_id ON public.cash_registers(shop_id);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

-- Sales Policies
CREATE POLICY "Shop members can view sales"
    ON public.sales FOR SELECT
    USING (public.is_shop_member(shop_id));

CREATE POLICY "Shop members can insert sales"
    ON public.sales FOR INSERT
    WITH CHECK (public.is_shop_member(shop_id));

CREATE POLICY "Shop members can update sales"
    ON public.sales FOR UPDATE
    USING (public.is_shop_member(shop_id));

-- Sale Items Policies
CREATE POLICY "Shop members can view sale items"
    ON public.sale_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_items.sale_id
              AND public.is_shop_member(s.shop_id)
        )
    );

CREATE POLICY "Shop members can insert sale items"
    ON public.sale_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales s
            WHERE s.id = sale_items.sale_id
              AND public.is_shop_member(s.shop_id)
        )
    );

-- Cash Register Policies
CREATE POLICY "Shop members can view cash registers"
    ON public.cash_registers FOR SELECT
    USING (public.is_shop_member(shop_id));

CREATE POLICY "Shop members can manage cash registers"
    ON public.cash_registers FOR ALL
    USING (public.is_shop_member(shop_id));
