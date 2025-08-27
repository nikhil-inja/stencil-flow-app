# GitHub Repository Consolidation Migration Guide

This guide explains how to migrate from the current "one repo per workflow" structure to the new "one repo per workspace" structure.

## Overview

### Before Migration
- ✅ Each workflow creates its own GitHub repository
- ✅ Each client deployment creates a new branch in that repository
- ❌ Results in many repositories and branches (unscalable)

### After Migration
- ✅ One repository per workspace
- ✅ Workflows organized in folders: `workflows/workflow-name/`
- ✅ Client deployments stored as JSON files: `workflows/workflow-name/deployments/client-name.json`
- ✅ Better organization and scalability

## Migration Steps

### Step 1: Update Database Schema

Run the database schema update function to add the required columns:

**Manual SQL (Run in Supabase SQL Editor):**
```sql
-- Add git_repository column to workspaces table
ALTER TABLE workspaces ADD COLUMN git_repository TEXT;

-- Add workflow_path column to automations table  
ALTER TABLE automations ADD COLUMN workflow_path TEXT;

-- Add deployment_file_path column to deployments table
ALTER TABLE deployments ADD COLUMN deployment_file_path TEXT;
```

**Or use the function (if available):**
```bash
# Call the update-database-schema function
curl -X POST [YOUR_SUPABASE_URL]/functions/v1/update-database-schema \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]" \
  -H "Content-Type: application/json"
```

### Step 2: Run Migration for Each Workspace

Call the migration function for each workspace:

```bash
curl -X POST [YOUR_SUPABASE_URL]/functions/v1/migrate-to-consolidated-repos \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "your-workspace-id",
    "githubToken": "your-github-token", 
    "workspaceName": "Your Workspace Name"
  }'
```

This will:
1. Create a new consolidated repository for the workspace
2. Migrate all existing workflows to the new folder structure
3. Migrate existing deployments to deployment files
4. Update all database records with new paths

### Step 3: Update Supabase Functions

The following functions have been updated to work with the new structure:
- ✅ `create-automation` - Creates workflows in folder structure
- ✅ `deploy-automation` - Creates deployment files instead of branches
- ✅ `sync-automation-from-n8n` - Updates workflow definition files
- ✅ `rollback-automation` - Works with workflow-specific history
- ✅ `get-commit-history` - Shows commits for specific workflow files

### Step 4: Test the Migration

1. **Test workflow creation**: Create a new workflow to ensure it uses the new structure
2. **Test deployment**: Deploy a workflow to a client to verify deployment files are created
3. **Test sync**: Sync a workflow from n8n to verify the definition file is updated
4. **Test rollback**: Test rollback functionality with the new file structure

### Step 5: Clean Up (Optional)

After confirming the migration works correctly:
1. Archive or delete the old individual workflow repositories
2. Update any external integrations that reference the old repository URLs
3. Remove the `git_branch` column from deployments table (if desired)

## New Folder Structure

```
workspace-repo/
├── README.md
└── workflows/
    ├── workflow-1/
    │   ├── definition.json        # Main workflow definition
    │   └── deployments/           # Client deployments
    │       ├── client-a.json
    │       ├── client-b.json
    │       └── README.md
    ├── workflow-2/
    │   ├── definition.json
    │   └── deployments/
    │       ├── client-c.json
    │       └── README.md
    └── workflow-3/
        ├── definition.json
        └── deployments/
            └── README.md
```

## Deployment File Format

Each deployment file contains:
```json
{
  "clientId": "client-uuid",
  "clientName": "Client Name",
  "n8nWorkflowId": "n8n-workflow-id",
  "deployedCommitSha": "git-commit-sha",
  "deployedAt": "2024-01-15T10:30:00.000Z",
  "automationName": "Workflow Name",
  "status": "active"
}
```

## Benefits of New Structure

1. **📁 Better Organization**: All workflows in one place per workspace
2. **🚀 Scalability**: No more repository proliferation  
3. **💰 Cost Effective**: Reduced GitHub API usage
4. **🔍 Easier Navigation**: Simple folder structure
5. **🔄 Maintained Functionality**: All existing features still work
6. **📊 Better Tracking**: Easy to see all deployments for a workflow
7. **🛡️ Version Control**: Full Git history maintained

## Rollback Plan

If issues arise, you can:
1. Keep the old repositories as backup
2. Revert the database schema changes
3. Switch back to the old Supabase functions
4. The old structure will continue to work

## Support

If you encounter issues during migration:
1. Check the migration function logs for detailed error messages
2. Verify GitHub token permissions
3. Ensure all database schema updates were applied
4. Test with a single workflow first before migrating all workflows
