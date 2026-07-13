-- SQL Migration: Add Measure Data Requirements Table
-- This table stores the recommended data needs from AI during Measure phase

CREATE TABLE IF NOT EXISTS public.measure_data_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.bimkon_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    reason TEXT,
    expected_format TEXT,
    example_columns JSONB, -- Array of column names (strings)
    status TEXT DEFAULT 'Belum diupload', -- 'Belum diupload' | 'Sudah diupload' | 'Tervalidasi'
    parsed_summary JSONB, -- Summary of uploaded data
    recommended_methods JSONB, -- Array of { method: string, reason: string }
    source TEXT DEFAULT 'ai', -- 'ai' or 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_measure_data_req_project_id ON public.measure_data_requirements(project_id);

-- RLS Policies
ALTER TABLE public.measure_data_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.measure_data_requirements
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.measure_data_requirements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.measure_data_requirements
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.measure_data_requirements
    FOR DELETE USING (auth.role() = 'authenticated');

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function before update
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_measure_data_req_modtime') THEN
        CREATE TRIGGER update_measure_data_req_modtime
        BEFORE UPDATE ON public.measure_data_requirements
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;
