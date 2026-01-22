
-- Create a Key-Value store for global app settings
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Turn on RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow Admins to View and Modify
CREATE POLICY "Admins can view settings" ON app_settings
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can update settings" ON app_settings
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can insert settings" ON app_settings
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Insert Default Budget (4.5 Million)
INSERT INTO app_settings (key, value)
VALUES ('total_lending_limit', '4500000')
ON CONFLICT (key) DO NOTHING;
