-- ============================================================
-- TrazaControl — Supabase SQL Database Schema
-- Organization: jmd8590-source's Org | Project: trazacontrol
-- ============================================================

-- 1. Profiles Table (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    business_name TEXT,
    business_type TEXT,
    owner_name TEXT,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'user', -- 'admin' or 'user'
    lang TEXT DEFAULT 'es',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile or admins view all" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Products / Recipes Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    batch_number TEXT,
    expiry_date DATE,
    ingredients TEXT,
    allergens JSONB,
    sanitary_registry TEXT,
    weight_volume TEXT,
    conservation TEXT,
    custom_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own products" ON public.products FOR ALL USING (auth.uid() = user_id);

-- 3. Stock Items Table
CREATE TABLE IF NOT EXISTS public.stock_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    product_code TEXT,
    current_stock NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    unit TEXT,
    location TEXT,
    batch_number TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock items" ON public.stock_items FOR ALL USING (auth.uid() = user_id);

-- 4. Stock Movements Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES public.stock_items(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'in' (entry) or 'out' (exit)
    quantity NUMERIC NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    batch TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stock movements" ON public.stock_movements FOR ALL USING (auth.uid() = user_id);

-- 5. Temperature Control Points Table
CREATE TABLE IF NOT EXISTS public.temperature_points (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT, -- 'fridge', 'freezer', 'hot_holding', 'room'
    min_temp NUMERIC NOT NULL,
    max_temp NUMERIC NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.temperature_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own temp points" ON public.temperature_points FOR ALL USING (auth.uid() = user_id);

-- 6. Temperature Readings Table
CREATE TABLE IF NOT EXISTS public.temperature_readings (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    point_id TEXT REFERENCES public.temperature_points(id) ON DELETE CASCADE,
    temperature NUMERIC NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    operator TEXT,
    status TEXT, -- 'correct', 'warning', 'critical'
    corrective_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.temperature_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own temp readings" ON public.temperature_readings FOR ALL USING (auth.uid() = user_id);

-- 7. Pest Control Company & Points
CREATE TABLE IF NOT EXISTS public.pest_company (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT,
    contract_number TEXT,
    technician_name TEXT,
    phone TEXT,
    email TEXT,
    last_treatment DATE,
    next_treatment DATE,
    certificate_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pest_company ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own pest company" ON public.pest_company FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pest_points (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT, -- 'insect_light', 'rodent_trap', 'bait_station'
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pest_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own pest points" ON public.pest_points FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.pest_inspections (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    point_id TEXT,
    status TEXT, -- 'ok', 'activity_detected', 'bait_consumed'
    observations TEXT,
    actions_taken TEXT,
    inspector TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pest_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own pest inspections" ON public.pest_inspections FOR ALL USING (auth.uid() = user_id);

-- 8. Cleaning & Disinfection Zones & Logs
CREATE TABLE IF NOT EXISTS public.cleaning_zones (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    frequency TEXT, -- 'daily', 'weekly', 'monthly'
    responsible TEXT,
    products_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cleaning_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cleaning zones" ON public.cleaning_zones FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.cleaning_logs (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    zone_id TEXT REFERENCES public.cleaning_zones(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TEXT,
    operator TEXT,
    status TEXT, -- 'completed', 'pending', 'issue'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cleaning_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cleaning logs" ON public.cleaning_logs FOR ALL USING (auth.uid() = user_id);

-- 9. Suppliers & Goods Entry
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cif_nif TEXT,
    sanitary_registry TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    category TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own suppliers" ON public.suppliers FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.goods_entries (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    batch_number TEXT,
    quantity NUMERIC,
    unit TEXT,
    temperature NUMERIC,
    expiry_date DATE,
    packaging_status TEXT, -- 'conforme', 'no_conforme'
    hygiene_status TEXT,   -- 'conforme', 'no_conforme'
    delivery_note TEXT,
    operator TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.goods_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goods entries" ON public.goods_entries FOR ALL USING (auth.uid() = user_id);

-- 10. Water Control
CREATE TABLE IF NOT EXISTS public.water_points (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.water_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own water points" ON public.water_points FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.water_readings (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    point_id TEXT REFERENCES public.water_points(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    free_chlorine NUMERIC,
    combined_chlorine NUMERIC,
    ph NUMERIC,
    organoleptic TEXT, -- 'conforme', 'no_conforme'
    operator TEXT,
    corrective_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.water_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own water readings" ON public.water_readings FOR ALL USING (auth.uid() = user_id);

-- 11. Incidents & Corrective Actions
CREATE TABLE IF NOT EXISTS public.incidents (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    module TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT, -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    operator TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own incidents" ON public.incidents FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.corrective_actions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    incident_id TEXT REFERENCES public.incidents(id) ON DELETE CASCADE,
    action_taken TEXT NOT NULL,
    responsible TEXT,
    date DATE NOT NULL,
    effectiveness TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own corrective actions" ON public.corrective_actions FOR ALL USING (auth.uid() = user_id);

-- 12. App Settings per User
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to automatically create a profile row when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        business_name, 
        business_type, 
        owner_name,
        role
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'businessName', 'Mi Negocio'),
        COALESCE(NEW.raw_user_meta_data->>'businessType', 'artisan'),
        COALESCE(NEW.raw_user_meta_data->>'ownerName', 'Administrador'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
