-- Master SQL Script untuk SIBIMKON V2
-- Copy script ini dan jalankan (Run) di SQL Editor Supabase Anda.

-- 1. DISABLE RLS Sementara (Untuk memudahkan sinkronisasi awal dan mencegah blokir RLS)
-- Mengizinkan anon & authenticated access ke semua tabel selama masa Development.
-- Jika sudah masuk Production, Anda bisa menghidupkan kembali RLS dan meracik Policy yang ketat.

DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;

-- 2. CREATE TABLES (Jika belum ada) & UPDATE COLUMNS

-- Tabel Companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    province TEXT,
    city TEXT,
    business_field TEXT,
    main_products TEXT,
    total_employees INTEGER,
    certifications JSONB,
    kadin_member BOOLEAN,
    apindo_member BOOLEAN,
    has_union BOOLEAN,
    has_pkb BOOLEAN,
    pic_name TEXT,
    pic_position TEXT,
    pic_phone TEXT,
    pic_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Projects
CREATE TABLE IF NOT EXISTS public.bimkon_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    consultant_id UUID,
    status TEXT,
    current_phase TEXT,
    start_date DATE,
    target_end_date DATE,
    baseline_productivity_index NUMERIC,
    current_productivity_index NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Project Charters (Define)
CREATE TABLE IF NOT EXISTS public.project_charters (
    project_id UUID PRIMARY KEY REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    problem_statement TEXT,
    objectives TEXT,
    productivity_target TEXT,
    scope TEXT,
    team_members JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Measure Assessments
CREATE TABLE IF NOT EXISTS public.measure_assessments (
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    dimension TEXT,
    assessment_version INTEGER DEFAULT 1,
    percentage_score NUMERIC,
    responses JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (project_id, dimension, assessment_version)
);

-- Tabel Measure VOM
CREATE TABLE IF NOT EXISTS public.measure_vom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    dimension TEXT,
    problem TEXT,
    impact TEXT,
    priority TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Measure Problems (Dengan kolom yang diperbarui, notes menggantikan dimension_reason)
CREATE TABLE IF NOT EXISTS public.measure_problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    problem_text TEXT NOT NULL,
    pqcdsm_dimension TEXT,
    is_charter_derived BOOLEAN DEFAULT false,
    priority_rank INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Analyze Fishbone
CREATE TABLE IF NOT EXISTS public.analyze_fishbone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    title TEXT,
    nodes JSONB, -- Array of nodes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Analyze 5-Why
CREATE TABLE IF NOT EXISTS public.analyze_5why (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    problem_statement TEXT,
    why_tree JSONB, -- Nested JSON of 5-Why
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Analyze Needs
CREATE TABLE IF NOT EXISTS public.analyze_needs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    problem_id UUID, -- Optional link to measure_problems
    method_name TEXT,
    is_available BOOLEAN,
    estimated_cost NUMERIC,
    impact_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Improve Actions
CREATE TABLE IF NOT EXISTS public.improve_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    action_title TEXT NOT NULL,
    description TEXT,
    methodology TEXT,
    dimension TEXT,
    pic TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT,
    progress_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Action Evidence (Improve/Control)
CREATE TABLE IF NOT EXISTS public.action_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    action_id UUID REFERENCES public.improve_actions(id) ON DELETE CASCADE,
    title TEXT,
    file_name TEXT,
    file_url TEXT,
    kpi_actual_value NUMERIC,
    kpi_target_value NUMERIC,
    status TEXT,
    verified_by UUID,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Control Audit Checklists
CREATE TABLE IF NOT EXISTS public.audit_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    category TEXT,
    items JSONB,
    total_items INTEGER,
    compliant_items INTEGER,
    compliance_percentage NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Sustainability Assessments (PSI)
CREATE TABLE IF NOT EXISTS public.sustainability_assessments (
    project_id UUID PRIMARY KEY REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    people_score NUMERIC,
    process_score NUMERIC,
    system_score NUMERIC,
    result_score NUMERIC,
    overall_score NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Consultant Notes
CREATE TABLE IF NOT EXISTS public.consultant_control_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    action_plan_id UUID,
    note_text TEXT,
    note_type TEXT,
    is_visible_to_company BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Pareto Data (Input Manual Masalah & Skor)
CREATE TABLE IF NOT EXISTS public.pareto_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    problem_name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memastikan PostgREST me-reload schema
NOTIFY pgrst, 'reload schema';
