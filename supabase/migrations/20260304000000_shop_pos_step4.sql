-- ============================================================================
-- MoSaFa Shop POS — STEP 4 OF 5 MIGRATION
-- Advanced Shop Management, Reports, Employees & Specialized Features
-- ============================================================================

-- 1. EMPLOYEES & RBAC TABLE
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'CASHIER' CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'CUSTOM')),
    custom_role_title TEXT,
    passcode TEXT NOT NULL,
    salary NUMERIC(12, 2),
    joining_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_shop_employee_phone UNIQUE (shop_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_employees_shop_id ON public.employees(shop_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(shop_id, role);

-- 2. EMPLOYEE PERMISSIONS
CREATE TABLE IF NOT EXISTS public.employee_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    view_dashboard BOOLEAN NOT NULL DEFAULT true,
    create_sales BOOLEAN NOT NULL DEFAULT true,
    edit_sales BOOLEAN NOT NULL DEFAULT false,
    cancel_sales BOOLEAN NOT NULL DEFAULT false,
    view_purchase_prices BOOLEAN NOT NULL DEFAULT false,
    manage_products BOOLEAN NOT NULL DEFAULT false,
    manage_stock BOOLEAN NOT NULL DEFAULT false,
    create_purchases BOOLEAN NOT NULL DEFAULT false,
    manage_customers BOOLEAN NOT NULL DEFAULT true,
    manage_suppliers BOOLEAN NOT NULL DEFAULT false,
    view_reports BOOLEAN NOT NULL DEFAULT false,
    manage_expenses BOOLEAN NOT NULL DEFAULT false,
    manage_employees BOOLEAN NOT NULL DEFAULT false,
    change_shop_settings BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_employee_permissions UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_permissions_shop ON public.employee_permissions(shop_id);

-- 3. EMPLOYEE ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.employee_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_employee_activity_shop ON public.employee_activity_logs(shop_id, created_at DESC);

-- 4. DEVICE IMEIS (MOBILE SHOP IMEI MANAGEMENT)
CREATE TABLE IF NOT EXISTS public.device_imeis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    imei1 TEXT NOT NULL,
    imei2 TEXT,
    serial_number TEXT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    ram TEXT,
    storage TEXT,
    color TEXT,
    purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2),
    warranty_months INT NOT NULL DEFAULT 12,
    status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK', 'SOLD', 'RETURNED', 'DEFECTIVE')),
    sale_invoice_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    sale_invoice_number TEXT,
    sale_date DATE,
    customer_name TEXT,
    customer_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_shop_imei1 UNIQUE (shop_id, imei1)
);

CREATE INDEX IF NOT EXISTS idx_device_imeis_shop ON public.device_imeis(shop_id);
CREATE INDEX IF NOT EXISTS idx_device_imeis_status ON public.device_imeis(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_device_imeis_search ON public.device_imeis(shop_id, imei1, imei2, serial_number);

-- 5. PRODUCT WARRANTIES
CREATE TABLE IF NOT EXISTS public.product_warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    sale_invoice_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    sale_invoice_number TEXT NOT NULL,
    product_id UUID,
    product_name TEXT NOT NULL,
    serial_or_imei TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    warranty_type TEXT NOT NULL CHECK (warranty_type IN ('SHOP_WARRANTY', 'MANUFACTURER_WARRANTY')),
    warranty_duration_months INT NOT NULL DEFAULT 12,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CLAIMED', 'REPLACED')),
    terms_notes TEXT,
    claimed_at TIMESTAMPTZ,
    claim_resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_product_warranties_shop ON public.product_warranties(shop_id);
CREATE INDEX IF NOT EXISTS idx_product_warranties_lookup ON public.product_warranties(shop_id, serial_or_imei, customer_phone);

-- 6. TELECOM RECHARGE BOOKKEEPING LEDGER
CREATE TABLE IF NOT EXISTS public.telecom_recharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    operator TEXT NOT NULL CHECK (operator IN ('Grameenphone', 'Robi', 'Airtel', 'Banglalink', 'Teletalk')),
    customer_phone TEXT,
    recharge_amount NUMERIC(10, 2) NOT NULL,
    commission_rate NUMERIC(5, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    transaction_ref TEXT,
    sim_balance_after NUMERIC(10, 2),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_telecom_recharges_shop ON public.telecom_recharges(shop_id, date DESC);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_imeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telecom_recharges ENABLE ROW LEVEL SECURITY;

-- Base RLS Policies
CREATE POLICY "Employees isolation by shop" ON public.employees
    FOR ALL USING (shop_id IN (SELECT id FROM public.shops));

CREATE POLICY "Permissions isolation by shop" ON public.employee_permissions
    FOR ALL USING (shop_id IN (SELECT id FROM public.shops));

CREATE POLICY "Activity isolation by shop" ON public.employee_activity_logs
    FOR ALL USING (shop_id IN (SELECT id FROM public.shops));

CREATE POLICY "Device IMEIs isolation by shop" ON public.device_imeis
    FOR ALL USING (shop_id IN (SELECT id FROM public.shops));

CREATE POLICY "Warranties isolation by shop" ON public.product_warranties
    FOR ALL USING (shop_id IN (SELECT id FROM public.shops));

CREATE POLICY "Telecom isolation by shop" ON public.telecom_recharges
    FOR ALL USING (shop_id IN (SELECT id FROM public.shops));
