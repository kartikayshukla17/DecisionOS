ALTER TABLE integrations
ADD COLUMN repos_permissions JSONB DEFAULT '[]'::jsonb;

-- Update the schema cache
NOTIFY pgrst, 'reload schema';
