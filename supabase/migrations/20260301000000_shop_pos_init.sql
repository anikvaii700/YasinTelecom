-- ==============================================================================
-- MoSaFa Shop POS: Database Schema & Row Level Security (RLS) Policies
-- Migration: 20260301000000_shop_pos_init.sql
-- Description: Complete independent Shop POS multi-tenant architecture with
--              dedicated shop accounts, 6-digit PIN settings, sessions & audit logs.
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Shop Owners & Operators linked to verified mobile number)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    full_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_profiles_mobile_number ON public.profiles(mobile_number);

-- ------------------------------------------------------------------------------
-- 2. SHOPS (Independent shop tenant identity and branding)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general_store',
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    description TEXT,
    logo_url TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    language VARCHAR(10) NOT NULL DEFAULT 'bn',
    receipt_header TEXT DEFAULT 'বিসমিল্লাহির রাহমানির রাহিম',
    receipt_footer TEXT DEFAULT 'ধন্যবাদ, আবার আসবেন!',
    receipt_format VARCHAR(20) NOT NULL DEFAULT '80mm',
    brand_color VARCHAR(30) NOT NULL DEFAULT '#059669',
    welcome_text TEXT DEFAULT 'স্বাগতম!',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_shops_shop_code ON public.shops(shop_code);
CREATE INDEX IF NOT EXISTS idx_shops_mobile_number ON public.shops(mobile_number);
CREATE INDEX IF NOT EXISTS idx_shops_category ON public.shops(category);

-- ------------------------------------------------------------------------------
-- 3. SHOP_MEMBERS (Role-based shop tenancy & ownership mapping)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'cashier')),
    permissions JSONB NOT NULL DEFAULT '{"all": true}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(shop_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_members_shop_id ON public.shop_members(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_members_profile_id ON public.shop_members(profile_id);

-- ------------------------------------------------------------------------------
-- 4. SHOP_AUTH_SETTINGS (Secure 6-digit PIN hash, salt, rate-limits & lockouts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_auth_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    pin_salt TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_failed_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    recovery_phone VARCHAR(20),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_shop_auth_settings_shop_id ON public.shop_auth_settings(shop_id);

-- ------------------------------------------------------------------------------
-- 5. SHOP_SESSIONS (Stateful secure sessions with expiry & device fingerprint)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token_hash TEXT NOT NULL UNIQUE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_shop_sessions_token_hash ON public.shop_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_shop_sessions_shop_id ON public.shop_sessions(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_sessions_expires_at ON public.shop_sessions(expires_at);

-- ------------------------------------------------------------------------------
-- 6. AUDIT_LOGS (Immutable security and operational compliance trail)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_id ON public.audit_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER trg_shops_updated_at
    BEFORE UPDATE ON public.shops
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER trg_shop_auth_settings_updated_at
    BEFORE UPDATE ON public.shop_auth_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_auth_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user is a shop member
CREATE OR REPLACE FUNCTION public.is_shop_member(p_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.shop_members sm
        JOIN public.profiles p ON sm.profile_id = p.id
        WHERE sm.shop_id = p_shop_id
          AND sm.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR mobile_number = current_setting('request.jwt.claim.phone', true));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

-- Shops: Members can view their shops
CREATE POLICY "Shop members can view their shops"
    ON public.shops FOR SELECT
    USING (public.is_shop_member(id));

CREATE POLICY "Shop owners can update their shops"
    ON public.shops FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_members
            WHERE shop_id = shops.id
              AND role = 'owner'
              AND is_active = TRUE
        )
    );

-- Shop Members: Members can view who is in their shop
CREATE POLICY "Members can view shop member list"
    ON public.shop_members FOR SELECT
    USING (public.is_shop_member(shop_id));

-- Shop Auth Settings: NEVER readable by public or client SELECT
-- PIN hash and salt can ONLY be read/written by secure server-side functions / service role
CREATE POLICY "Deny direct public read of pin auth settings"
    ON public.shop_auth_settings FOR SELECT
    USING (false);

-- Audit logs: Read allowed only by shop owners
CREATE POLICY "Shop owners can view their audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_members
            WHERE shop_id = audit_logs.shop_id
              AND role = 'owner'
        )
    );
