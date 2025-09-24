-- Database Schema Update for Consolidated GitHub Repository Structure
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. Add new columns for consolidated repo structure
-- =====================================================

-- Add git_repository column to workspaces table (for consolidated repo URL)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspaces' AND column_name = 'git_repository'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN git_repository TEXT;
    COMMENT ON COLUMN workspaces.git_repository IS 'URL of the consolidated GitHub repository for this workspace';
  END IF;
END $$;

-- Add workflow_path column to automations table (for folder path within repo)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'automations' AND column_name = 'workflow_path'
  ) THEN
    ALTER TABLE automations ADD COLUMN workflow_path TEXT;
    COMMENT ON COLUMN automations.workflow_path IS 'Path to workflow folder within the consolidated repository (e.g., workflows/workflow-name)';
  END IF;
END $$;

-- Add deployment_file_path column to deployments table (for deployment file path)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deployments' AND column_name = 'deployment_file_path'
  ) THEN
    ALTER TABLE deployments ADD COLUMN deployment_file_path TEXT;
    COMMENT ON COLUMN deployments.deployment_file_path IS 'Path to deployment configuration file within the repository';
  END IF;
END $$;

-- =====================================================
-- 2. Update your existing RPC function (if using organizations)
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_master_n8n_instance(uuid, text, text);

-- If you're using organizations table, here's the updated version:
CREATE FUNCTION update_master_n8n_instance(
  p_organization_id uuid,
  p_instance_url text,
  p_api_key text
)
RETURNS TABLE(instance_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  instance_id uuid;
BEGIN
  INSERT INTO public.n8n_instances (organization_id, client_id, instance_url, api_key)
  VALUES (p_organization_id, NULL, p_instance_url, p_api_key)
  ON CONFLICT (organization_id) WHERE client_id IS NULL
  DO UPDATE SET
    instance_url = EXCLUDED.instance_url,
    api_key = EXCLUDED.api_key
  RETURNING public.n8n_instances.id INTO instance_id;

  UPDATE public.organizations
  SET master_n8n_instance_id = instance_id
  WHERE public.organizations.id = p_organization_id;

  RETURN QUERY SELECT instance_id;
END;
$$;

-- =====================================================
-- 3. Alternative: If using workspaces table instead
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_master_n8n_instance_workspace(uuid, text, text);

-- If you're using workspaces table (as suggested by the migration), use this version:
CREATE FUNCTION update_master_n8n_instance_workspace(
  p_workspace_id uuid,
  p_instance_url text,
  p_api_key text
)
RETURNS TABLE(instance_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  instance_id uuid;
BEGIN
  -- Insert or update the master n8n instance for the workspace
  INSERT INTO public.n8n_instances (workspace_id, client_id, instance_url, api_key)
  VALUES (p_workspace_id, NULL, p_instance_url, p_api_key)
  ON CONFLICT (workspace_id) WHERE client_id IS NULL
  DO UPDATE SET
    instance_url = EXCLUDED.instance_url,
    api_key = EXCLUDED.api_key
  RETURNING public.n8n_instances.id INTO instance_id;

  -- Update the workspace to reference this master instance
  UPDATE public.workspaces
  SET master_n8n_instance_id = instance_id
  WHERE public.workspaces.id = p_workspace_id;

  RETURN QUERY SELECT instance_id;
END;
$$;

-- =====================================================
-- 4. Helper function to create workspace repository
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS set_workspace_repository(uuid, text);

-- Function to set workspace repository URL (called after creating GitHub repo)
CREATE FUNCTION set_workspace_repository(
  p_workspace_id uuid,
  p_repository_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.workspaces
  SET git_repository = p_repository_url
  WHERE id = p_workspace_id;
  
  RETURN FOUND;
END;
$$;

-- =====================================================
-- 5. Add indexes for better performance
-- =====================================================

-- Index on workspace git_repository for faster lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_git_repository 
ON workspaces(git_repository);

-- Index on automation workflow_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_automations_workflow_path 
ON automations(workflow_path);

-- Index on deployment file path for faster lookups
CREATE INDEX IF NOT EXISTS idx_deployments_file_path 
ON deployments(deployment_file_path);

-- =====================================================
-- 6. Add constraints for data integrity
-- =====================================================

-- Ensure workflow_path follows expected format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'automations_workflow_path_format'
  ) THEN
    ALTER TABLE automations 
    ADD CONSTRAINT automations_workflow_path_format 
    CHECK (workflow_path IS NULL OR workflow_path ~ '^workflows/[a-z0-9-]+$');
  END IF;
END $$;

-- Ensure deployment_file_path follows expected format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'deployments_file_path_format'
  ) THEN
    ALTER TABLE deployments 
    ADD CONSTRAINT deployments_file_path_format 
    CHECK (deployment_file_path IS NULL OR deployment_file_path ~ '^workflows/[a-z0-9-]+/deployments/[a-z0-9-]+\.json$');
  END IF;
END $$;

-- =====================================================
-- 7. Data validation and cleanup (optional)
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS migration_status;

-- View to check migration readiness
CREATE VIEW migration_status AS
SELECT 
  w.id as workspace_id,
  w.git_repository,
  COUNT(a.id) as total_automations,
  COUNT(CASE WHEN a.workflow_path IS NOT NULL THEN 1 END) as migrated_automations,
  COUNT(d.id) as total_deployments,
  COUNT(CASE WHEN d.deployment_file_path IS NOT NULL THEN 1 END) as migrated_deployments
FROM workspaces w
LEFT JOIN automations a ON w.id = a.workspace_id
LEFT JOIN deployments d ON a.id = d.automation_id
GROUP BY w.id, w.git_repository;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS validate_migration();

-- Function to validate migration completeness
CREATE FUNCTION validate_migration()
RETURNS TABLE(
  workspace_id uuid,
  workspace_name text,
  has_git_repo boolean,
  unmigrated_automations integer,
  unmigrated_deployments integer,
  migration_complete boolean
)
LANGUAGE sql
AS $$
  SELECT 
    w.id,
    w.name,
    w.git_repository IS NOT NULL,
    COUNT(a.id) FILTER (WHERE a.workflow_path IS NULL)::integer,
    COUNT(d.id) FILTER (WHERE d.deployment_file_path IS NULL)::integer,
    (w.git_repository IS NOT NULL AND 
     COUNT(a.id) FILTER (WHERE a.workflow_path IS NULL) = 0 AND
     COUNT(d.id) FILTER (WHERE d.deployment_file_path IS NULL) = 0) as migration_complete
  FROM workspaces w
  LEFT JOIN automations a ON w.id = a.workspace_id
  LEFT JOIN deployments d ON a.id = d.automation_id
  GROUP BY w.id, w.name, w.git_repository;
$$;

-- =====================================================
-- 8. Security: Row Level Security policies (optional)
-- =====================================================

-- Enable RLS on new columns if needed
-- ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE ON automations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON deployments TO authenticated;

-- =====================================================
-- Completion Message
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema update completed successfully!';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  - workspaces.git_repository';
  RAISE NOTICE '  - automations.workflow_path';
  RAISE NOTICE '  - deployments.deployment_file_path';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Deploy updated Supabase functions';
  RAISE NOTICE '2. Run migration function to create workspace repositories';
  RAISE NOTICE '3. Test new workflow creation';
  RAISE NOTICE '';
  RAISE NOTICE 'Check migration status with: SELECT * FROM migration_status;';
  RAISE NOTICE 'Validate migration with: SELECT * FROM validate_migration();';
END $$;
