-- ==============================================================================
-- MoSaFa Shop POS: Step 3 Schema — POS Terminal, Sales, Invoicing & Cash Registers
-- Migration: 20260303000000_shop_pos_step3.sql
-- Description: Complete Point of Sale transactions, split payments, cashbook accounts,
--              cash transactions, expenses, sales returns & exchanges, customer ledger,
--              and configurable invoice sequences with tenant-isolated RLS.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CASH_ACCOUNTS (Multi-account cash, MFS & bank balances)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'CASH' CHECK (type IN ('CASH', 'BANK', 'BKASH', 'NAGAD', 'ROCKET', 'OTHER')),
    account_number VARCHAR(100),
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_cash_accounts_shop_id ON public.cash_accounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_type ON public.cash_accounts(type);

-- ------------------------------------------------------------------------------
-- 2. INVOICE_SEQUENCES (Customizable prefix and format per shop)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    prefix VARCHAR(20) NOT NULL DEFAULT 'MS',
    format VARCHAR(30) NOT NULL DEFAULT 'PREFIX-YEAR-SEQ',
    current_number INTEGER NOT NULL DEFAULT 100,
    padding INTEGER NOT NULL DEFAULT 6,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    CONSTRAINT uq_invoice_sequences_shop UNIQUE (shop_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_sequences_shop_id ON public.invoice_sequences(shop_id);

-- ------------------------------------------------------------------------------
-- 3. SALES (POS invoices, financial calculations, payment breakdowns)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(20),
    invoice_number VARCHAR(50) NOT NULL,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    item_discounts_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cart_discount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    shipping_charge NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vat_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    vat_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    change_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Cash',
    payment_account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
    split_payments JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'HOLD', 'CANCELLED', 'REFUNDED')),
    return_status VARCHAR(20) NOT NULL DEFAULT 'NONE' CHECK (return_status IN ('NONE', 'PARTIAL', 'FULL')),
    items_count INTEGER NOT NULL DEFAULT 1,
    total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_profit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    cashier_name VARCHAR(100),
    idempotency_key VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON public.sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_shop_invoice ON public.sales(shop_id, invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_idempotency ON public.sales(shop_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. SALE_ITEMS (Individual invoice line items with historical costs & discounts)
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
    original_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    returned_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- ------------------------------------------------------------------------------
-- 5. PAYMENTS (Split payments and customer/supplier transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('SALE', 'CUSTOMER_DUE', 'SUPPLIER_PAYMENT', 'EXPENSE', 'REFUND')),
    method VARCHAR(30) NOT NULL DEFAULT 'Cash',
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_payments_shop_id ON public.payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON public.payments(customer_id);

-- ------------------------------------------------------------------------------
-- 6. CASH_TRANSACTIONS (Immutable Cashbook journal of all cash movements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE CASCADE,
    account_name VARCHAR(150),
    transaction_type VARCHAR(40) NOT NULL CHECK (transaction_type IN (
        'OPENING_BALANCE', 'SALES_RECEIPT', 'CUSTOMER_PAYMENT',
        'PURCHASE_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE',
        'REFUND', 'TRANSFER_IN', 'TRANSFER_OUT'
    )),
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_after NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    related_id VARCHAR(100),
    invoice_number VARCHAR(60),
    transfer_account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
    reference VARCHAR(100),
    notes TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_shop_id ON public.cash_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_account_id ON public.cash_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON public.cash_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_created_at ON public.cash_transactions(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. EXPENSES (Shop daily operating costs & categorization)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'Rent', 'Electricity', 'Internet', 'Salary', 'Transport',
        'Maintenance', 'Packaging', 'Marketing', 'Other'
    )),
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
    payment_account_name VARCHAR(150),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'Cash',
    reference VARCHAR(100),
    notes TEXT,
    attachment_url TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_expenses_shop_id ON public.expenses(shop_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);

-- ------------------------------------------------------------------------------
-- 8. CUSTOMER_LEDGER_ENTRIES (Double-entry customer account statement)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    entry_type VARCHAR(40) NOT NULL CHECK (entry_type IN (
        'SALE_INVOICE', 'DUE_COLLECTION', 'SALES_RETURN', 'OPENING_BALANCE', 'ADJUSTMENT'
    )),
    debit NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Increases receivable
    credit NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Decreases receivable
    balance_after NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reference_id VARCHAR(100),
    invoice_number VARCHAR(60),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_shop_customer ON public.customer_ledger_entries(shop_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_created ON public.customer_ledger_entries(created_at DESC);

-- ------------------------------------------------------------------------------
-- 9. SALES_RETURNS & SALES_RETURN_ITEMS (Returns, exchanges, reversals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(60) NOT NULL,
    return_invoice_number VARCHAR(60) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150),
    return_type VARCHAR(30) NOT NULL DEFAULT 'REFUND' CHECK (return_type IN ('REFUND', 'EXCHANGE', 'STORE_CREDIT')),
    refund_method VARCHAR(30) DEFAULT 'Cash',
    refund_account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
    total_refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL,
    notes TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_shop_id ON public.sales_returns(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_sale_id ON public.sales_returns(sale_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_returns_shop_return ON public.sales_returns(shop_id, return_invoice_number);

CREATE TABLE IF NOT EXISTS public.sales_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
    sale_item_id UUID NOT NULL REFERENCES public.sale_items(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name_bn VARCHAR(200) NOT NULL,
    quantity NUMERIC(14, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    refund_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    condition VARCHAR(20) NOT NULL DEFAULT 'RESTOCKABLE' CHECK (condition IN ('RESTOCKABLE', 'DAMAGED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_sales_return_items_return_id ON public.sales_return_items(return_id);

-- ------------------------------------------------------------------------------
-- 10. CASH_REGISTERS (Register shifts, opening float & daily closing)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
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
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

-- Generic Shop Member Isolation Policy Macro
CREATE POLICY "Shop members can manage cash accounts" ON public.cash_accounts FOR ALL USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members can manage invoice sequences" ON public.invoice_sequences FOR ALL USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members can manage sales" ON public.sales FOR ALL USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members can manage sale items" ON public.sale_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND public.is_shop_member(s.shop_id))
);
CREATE POLICY "Shop members can manage payments" ON public.payments FOR ALL USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members can manage cash transactions" ON public.cash_transactions FOR ALL USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members can manage expenses" ON public.expenses FOR ALL USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members can manage customer ledger" ON public.customer_ledger_entries FOR ALL USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members can manage sales returns" ON public.sales_returns FOR ALL USING (public.is_shop_member(shop_id));
CREATE POLICY "Shop members can manage sales return items" ON public.sales_return_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sales_returns r WHERE r.id = sales_return_items.return_id AND public.is_shop_member(r.shop_id))
);
CREATE POLICY "Shop members can manage cash registers" ON public.cash_registers FOR ALL USING (public.is_shop_member(shop_id));
