"""
Utility functions for API operations
"""

import requests
import json
from cryptography.fernet import Fernet
from django.conf import settings
import base64
import hashlib
import secrets
from django.core.cache import cache


def get_encryption_key():
    """Generate encryption key from secret key"""
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_token(token):
    """Encrypt a token for secure storage"""
    f = Fernet(get_encryption_key())
    encrypted_token = f.encrypt(token.encode())
    return encrypted_token.decode()


def decrypt_token(encrypted_token):
    """Decrypt a stored token"""
    f = Fernet(get_encryption_key())
    decrypted_token = f.decrypt(encrypted_token.encode())
    return decrypted_token.decode()


def get_github_user_info(github_token):
    """Get GitHub user information using access token"""
    try:
        response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'token {github_token}'}
        )
        if response.ok:
            return response.json()
        return None
    except Exception:
        return None


def get_github_token_for_user(user):
    """Get decrypted GitHub token for user"""
    try:
        from .models import GitHubToken
        github_token_obj = GitHubToken.objects.get(user=user)
        return decrypt_token(github_token_obj.encrypted_token)
    except GitHubToken.DoesNotExist:
        return None


def generate_oauth_state():
    """Generate signed OAuth state (no server storage needed)"""
    import jwt
    import time
    payload = {
        'state': secrets.token_urlsafe(32),
        'exp': int(time.time()) + 600,  # 10 minutes
        'iat': int(time.time())
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def validate_oauth_state(state):
    """Validate signed OAuth state"""
    import jwt
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=['HS256'])
        return True
    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False


class GitHubAPIError(Exception):
    """Custom exception for GitHub API errors"""
    pass


def make_github_api_request(url, method='GET', data=None, github_token=None):
    """Centralized GitHub API request function"""
    if not github_token:
        raise GitHubAPIError("GitHub token is required")
    
    headers = {
        'Authorization': f'token {github_token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=headers, json=data)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers, json=data)
        else:
            raise GitHubAPIError(f"Unsupported HTTP method: {method}")
        
        if response.status_code == 401:
            raise GitHubAPIError("Invalid GitHub token")
        elif response.status_code == 403:
            raise GitHubAPIError("Insufficient GitHub permissions")
        elif response.status_code >= 400:
            raise GitHubAPIError(f"GitHub API error: {response.status_code} - {response.text}")
        
        return response.json() if response.content else None
        
    except requests.exceptions.RequestException as e:
        raise GitHubAPIError(f"Network error: {str(e)}")


def create_github_repository(github_token, repo_name, description=None, private=True):
    """Create a new GitHub repository"""
    try:
        # Get authenticated user info
        user_info = make_github_api_request('https://api.github.com/user', github_token=github_token)
        if not user_info:
            raise GitHubAPIError("Could not get GitHub user info")
        
        username = user_info['login']
        
        # Create repository
        repo_data = {
            'name': repo_name,
            'description': description or f'Automation workflows for {repo_name}',
            'private': private,
            'auto_init': True,  # Initialize with README
            'gitignore_template': 'Node'  # Add .gitignore for Node.js
        }
        
        response = make_github_api_request(
            'https://api.github.com/user/repos',
            method='POST',
            data=repo_data,
            github_token=github_token
        )
        
        if not response:
            raise GitHubAPIError("Failed to create repository")
        
        return {
            'id': response['id'],
            'name': response['name'],
            'full_name': response['full_name'],
            'html_url': response['html_url'],
            'clone_url': response['clone_url'],
            'ssh_url': response['ssh_url']
        }
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to create GitHub repository: {str(e)}")


def check_repository_exists(github_token, repo_name):
    """Check if a repository exists for the authenticated user"""
    try:
        # Get authenticated user info
        user_info = make_github_api_request('https://api.github.com/user', github_token=github_token)
        if not user_info:
            return False
        
        username = user_info['login']
        
        # Check if repo exists
        response = make_github_api_request(
            f'https://api.github.com/repos/{username}/{repo_name}',
            github_token=github_token
        )
        
        return response is not None
        
    except GitHubAPIError:
        return False


def create_workflow_folder_structure(github_token, repo_path, automation_name, workflow_json):
    """Create workflow folder structure in GitHub repository"""
    try:
        # Sanitize automation name for folder name
        folder_name = automation_name.lower().replace(' ', '-').replace('_', '-')
        folder_name = ''.join(c for c in folder_name if c.isalnum() or c in '-')
        workflow_path = f"workflows/{folder_name}"
        
        # Create workflow definition file
        definition_content = json.dumps(workflow_json, indent=2)
        definition_encoded = base64.b64encode(definition_content.encode()).decode()
        
        definition_data = {
            'message': f'Add workflow definition for {automation_name}',
            'content': definition_encoded,
            'branch': 'main'
        }
        
        definition_response = make_github_api_request(
            f'https://api.github.com/repos/{repo_path}/contents/{workflow_path}/definition.json',
            method='PUT',
            data=definition_data,
            github_token=github_token
        )
        
        if not definition_response:
            raise GitHubAPIError(f"Failed to create workflow definition for {automation_name}")
        
        # Create deployments folder and README
        deployments_readme_content = f"""# Deployments

This folder contains deployment configurations for {automation_name}.

Each deployment file represents a specific environment or space where this automation is deployed.

## File Format

Deployment files are JSON files with the following structure:
- `spaceId`: The ID of the space where the automation is deployed
- `spaceName`: The name of the space
- `spaceType`: The type of space (client, internal, demo, etc.)
- `n8nWorkflowId`: The ID of the workflow in the N8N instance
- `deployedCommitSha`: The commit SHA when the automation was deployed
- `deployedAt`: Timestamp when the automation was deployed
- `automationName`: The name of the automation
- `status`: The deployment status (active, inactive, etc.)

## Files

- `README.md`: This file
"""
        
        deployments_readme_encoded = base64.b64encode(deployments_readme_content.encode()).decode()
        deployments_readme_data = {
            'message': f'Add deployments README for {automation_name}',
            'content': deployments_readme_encoded,
            'branch': 'main'
        }
        
        deployments_readme_response = make_github_api_request(
            f'https://api.github.com/repos/{repo_path}/contents/{workflow_path}/deployments/README.md',
            method='PUT',
            data=deployments_readme_data,
            github_token=github_token
        )
        
        if not deployments_readme_response:
            raise GitHubAPIError(f"Failed to create deployments README for {automation_name}")
        
        # Create versions folder and README
        versions_readme_content = f"""# Versions

This folder contains versioned copies of the workflow for {automation_name}.

Each version file contains a complete snapshot of the workflow at a specific point in time, allowing for rollback functionality.

## File Format

Version files are JSON files with the following structure:
- `version`: The timestamp identifier for this version (YYYYMMDD_HHMMSS)
- `created_at`: ISO timestamp when this version was created
- `comment`: Optional comment describing the changes in this version
- `workflow`: The complete workflow JSON definition

## Files

- `README.md`: This file
- `version_YYYYMMDD_HHMMSS.json`: Version files (one per workflow change)

## Usage

To rollback to a specific version, use the rollback API with the version timestamp.
"""
        
        versions_readme_encoded = base64.b64encode(versions_readme_content.encode()).decode()
        versions_readme_data = {
            'message': f'Add versions README for {automation_name}',
            'content': versions_readme_encoded,
            'branch': 'main'
        }
        
        versions_readme_response = make_github_api_request(
            f'https://api.github.com/repos/{repo_path}/contents/{workflow_path}/versions/README.md',
            method='PUT',
            data=versions_readme_data,
            github_token=github_token
        )
        
        if not versions_readme_response:
            raise GitHubAPIError(f"Failed to create versions README for {automation_name}")
        
        return workflow_path
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to create workflow folder structure: {str(e)}")


def create_deployment_file(github_token, repo_path, automation_name, space_name, deployment_config):
    """Create deployment configuration file in GitHub repository"""
    try:
        # Sanitize names for file name
        automation_folder = automation_name.lower().replace(' ', '-').replace('_', '-')
        automation_folder = ''.join(c for c in automation_folder if c.isalnum() or c in '-')
        space_file_name = space_name.lower().replace(' ', '-').replace('_', '-')
        space_file_name = ''.join(c for c in space_file_name if c.isalnum() or c in '-')
        
        deployment_file_path = f"workflows/{automation_folder}/deployments/{space_file_name}.json"
        
        # Create deployment file content
        deployment_content = json.dumps(deployment_config, indent=2)
        deployment_encoded = base64.b64encode(deployment_content.encode()).decode()
        
        deployment_data = {
            'message': f'Add deployment config for {automation_name} to {space_name}',
            'content': deployment_encoded,
            'branch': 'main'
        }
        
        deployment_response = make_github_api_request(
            f'https://api.github.com/repos/{repo_path}/contents/{deployment_file_path}',
            method='PUT',
            data=deployment_data,
            github_token=github_token
        )
        
        if not deployment_response:
            raise GitHubAPIError(f"Failed to create deployment file for {automation_name} to {space_name}")
        
        return deployment_file_path
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to create deployment file: {str(e)}")


def create_workflow_version(github_token, repo_path, automation_name, workflow_json, version_comment=None):
    """Create a versioned copy of the workflow in the versions folder"""
    try:
        # Sanitize automation name for folder name
        automation_folder = automation_name.lower().replace(' ', '-').replace('_', '-')
        automation_folder = ''.join(c for c in automation_folder if c.isalnum() or c in '-')
        
        # Generate timestamp for version
        from datetime import datetime
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        
        # Create version file path
        version_file_path = f"workflows/{automation_folder}/versions/version_{timestamp}.json"
        
        # Create version metadata
        version_metadata = {
            'version': timestamp,
            'created_at': datetime.utcnow().isoformat(),
            'comment': version_comment or f'Workflow version {timestamp}',
            'workflow': workflow_json
        }
        
        # Create version file content
        version_content = json.dumps(version_metadata, indent=2)
        version_encoded = base64.b64encode(version_content.encode()).decode()
        
        version_data = {
            'message': f'Add workflow version {timestamp} for {automation_name}',
            'content': version_encoded,
            'branch': 'main'
        }
        
        version_response = make_github_api_request(
            f'https://api.github.com/repos/{repo_path}/contents/{version_file_path}',
            method='PUT',
            data=version_data,
            github_token=github_token
        )
        
        if not version_response:
            raise GitHubAPIError(f"Failed to create workflow version for {automation_name}")
        
        return {
            'version': timestamp,
            'file_path': version_file_path,
            'sha': version_response.get('content', {}).get('sha', '')
        }
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to create workflow version: {str(e)}")


def get_workflow_version(github_token, repo_path, automation_name, version_timestamp):
    """Get a specific workflow version from the versions folder"""
    try:
        # Sanitize automation name for folder name
        automation_folder = automation_name.lower().replace(' ', '-').replace('_', '-')
        automation_folder = ''.join(c for c in automation_folder if c.isalnum() or c in '-')
        
        # Create version file path
        version_file_path = f"workflows/{automation_folder}/versions/version_{version_timestamp}.json"
        
        # Get version file content
        version_response = make_github_api_request(
            f'https://api.github.com/repos/{repo_path}/contents/{version_file_path}',
            github_token=github_token
        )
        
        if not version_response:
            raise GitHubAPIError(f"Version {version_timestamp} not found for {automation_name}")
        
        # Decode content
        import base64
        version_content = base64.b64decode(version_response['content']).decode()
        version_data = json.loads(version_content)
        
        return version_data
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to get workflow version: {str(e)}")


def list_workflow_versions(github_token, repo_path, automation_name):
    """List all available versions for a workflow"""
    try:
        # Sanitize automation name for folder name
        automation_folder = automation_name.lower().replace(' ', '-').replace('_', '-')
        automation_folder = ''.join(c for c in automation_folder if c.isalnum() or c in '-')
        
        # Get versions folder contents
        versions_folder_path = f"workflows/{automation_folder}/versions"
        
        try:
            versions_response = make_github_api_request(
                f'https://api.github.com/repos/{repo_path}/contents/{versions_folder_path}',
                github_token=github_token
            )
        except GitHubAPIError as e:
            # If the versions folder doesn't exist yet, return empty list
            if "404" in str(e):
                return []
            else:
                raise e
        
        if not versions_response:
            return []
        
        versions = []
        for file_info in versions_response:
            if file_info['name'].startswith('version_') and file_info['name'].endswith('.json'):
                # Extract timestamp from filename
                timestamp = file_info['name'].replace('version_', '').replace('.json', '')
                versions.append({
                    'version': timestamp,
                    'file_path': file_info['path'],
                    'sha': file_info['sha'],
                    'size': file_info.get('size', 0),
                    'updated_at': file_info.get('updated_at', '')
                })
        
        # Sort versions by timestamp (newest first)
        versions.sort(key=lambda x: x['version'], reverse=True)
        
        return versions
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to list workflow versions: {str(e)}")


def rollback_workflow_to_version(github_token, repo_path, automation_name, version_timestamp):
    """Rollback workflow to a specific version"""
    try:
        # Get the version data
        version_data = get_workflow_version(github_token, repo_path, automation_name, version_timestamp)
        
        # Update the main workflow definition with the versioned workflow
        automation_folder = automation_name.lower().replace(' ', '-').replace('_', '-')
        automation_folder = ''.join(c for c in automation_folder if c.isalnum() or c in '-')
        
        definition_file_path = f"workflows/{automation_folder}/definition.json"
        
        # Get the current SHA of the definition file
        current_file_response = make_github_api_request(
            f'https://api.github.com/repos/{repo_path}/contents/{definition_file_path}',
            github_token=github_token
        )
        
        if not current_file_response:
            raise GitHubAPIError(f"Could not find current workflow file {definition_file_path}")
        
        current_sha = current_file_response['sha']
        
        # Create rollback content
        rollback_content = json.dumps(version_data['workflow'], indent=2)
        rollback_encoded = base64.b64encode(rollback_content.encode()).decode()
        
        rollback_data = {
            'message': f'Rollback {automation_name} to version {version_timestamp}',
            'content': rollback_encoded,
            'sha': current_sha,
            'branch': 'main'
        }
        
        rollback_response = make_github_api_request(
            f'https://api.github.com/repos/{repo_path}/contents/{definition_file_path}',
            method='PUT',
            data=rollback_data,
            github_token=github_token
        )
        
        if not rollback_response:
            raise GitHubAPIError(f"Failed to rollback workflow {automation_name}")
        
        return {
            'version': version_timestamp,
            'file_path': definition_file_path,
            'sha': rollback_response.get('content', {}).get('sha', ''),
            'workflow': version_data['workflow']
        }
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to rollback workflow: {str(e)}")


def delete_workflow_folder(github_token, repo_path, automation_name):
    """Delete the entire workflow folder from GitHub repository"""
    try:
        print(f"Starting deletion of workflow folder for automation: {automation_name}")
        print(f"Repository path: {repo_path}")
        
        # Sanitize automation name for folder name
        automation_folder = automation_name.lower().replace(' ', '-').replace('_', '-')
        automation_folder = ''.join(c for c in automation_folder if c.isalnum() or c in '-')
        workflow_path = f"workflows/{automation_folder}"
        
        print(f"Workflow path: {workflow_path}")
        
        # GitHub doesn't have actual folders, so we need to delete files individually
        # Let's try to get the contents of the workflow path
        folder_url = f'https://api.github.com/repos/{repo_path}/contents/{workflow_path}'
        print(f"Fetching folder contents from: {folder_url}")
        
        try:
            folder_response = make_github_api_request(
                folder_url,
                github_token=github_token
            )
        except GitHubAPIError as e:
            if "404" in str(e):
                print(f"Folder {workflow_path} doesn't exist, nothing to delete")
                return True
            else:
                raise e
        
        if not folder_response:
            print(f"Folder {workflow_path} doesn't exist, nothing to delete")
            return True
        
        print(f"Found {len(folder_response)} items in folder")
        
        # Delete the entire folder by deleting each file
        deleted_files = []
        
        for file_info in folder_response:
            print(f"Processing item: {file_info['name']} (type: {file_info['type']})")
            
            if file_info['type'] == 'file':
                # Delete individual file
                delete_data = {
                    'message': f'Delete {file_info["name"]} as part of workflow deletion',
                    'sha': file_info['sha']
                }
                
                delete_url = f'https://api.github.com/repos/{repo_path}/contents/{file_info["path"]}'
                print(f"Deleting file: {delete_url}")
                
                try:
                    delete_response = make_github_api_request(
                        delete_url,
                        method='DELETE',
                        data=delete_data,
                        github_token=github_token
                    )
                    
                    if delete_response:
                        deleted_files.append(file_info['name'])
                        print(f"Successfully deleted file: {file_info['name']}")
                    else:
                        print(f"Warning: Failed to delete file {file_info['name']}")
                except GitHubAPIError as e:
                    print(f"Error deleting file {file_info['name']}: {str(e)}")
                    
            elif file_info['type'] == 'dir':
                # Recursively delete subdirectory
                subfolder_path = file_info['path']
                subfolder_url = f'https://api.github.com/repos/{repo_path}/contents/{subfolder_path}'
                print(f"Processing subdirectory: {subfolder_url}")
                
                try:
                    subfolder_response = make_github_api_request(
                        subfolder_url,
                        github_token=github_token
                    )
                    
                    if subfolder_response:
                        print(f"Found {len(subfolder_response)} items in subdirectory")
                        for subfile_info in subfolder_response:
                            if subfile_info['type'] == 'file':
                                delete_data = {
                                    'message': f'Delete {subfile_info["name"]} as part of workflow deletion',
                                    'sha': subfile_info['sha']
                                }
                                
                                subfile_url = f'https://api.github.com/repos/{repo_path}/contents/{subfile_info["path"]}'
                                print(f"Deleting subfile: {subfile_url}")
                                
                                try:
                                    delete_response = make_github_api_request(
                                        subfile_url,
                                        method='DELETE',
                                        data=delete_data,
                                        github_token=github_token
                                    )
                                    
                                    if delete_response:
                                        deleted_files.append(subfile_info['name'])
                                        print(f"Successfully deleted subfile: {subfile_info['name']}")
                                    else:
                                        print(f"Warning: Failed to delete subfile {subfile_info['name']}")
                                except GitHubAPIError as e:
                                    print(f"Error deleting subfile {subfile_info['name']}: {str(e)}")
                except GitHubAPIError as e:
                    print(f"Error accessing subdirectory {subfolder_path}: {str(e)}")
        
        print(f"Deleted {len(deleted_files)} files from workflow folder: {workflow_path}")
        return True
        
    except Exception as e:
        print(f"Error in delete_workflow_folder: {str(e)}")
        raise GitHubAPIError(f"Failed to delete workflow folder: {str(e)}")


def sync_existing_automations_to_repository(user, workspace):
    """Sync all existing automations to the GitHub repository"""
    try:
        github_token = get_github_token_for_user(user)
        if not github_token:
            raise GitHubAPIError("No GitHub connection found")
        
        if not workspace.git_repository:
            raise GitHubAPIError("Workspace has no GitHub repository")
        
        # Extract repo path from URL
        repo_path = workspace.git_repository.replace('https://github.com/', '')
        
        # Get all automations for this workspace
        from .models import Automation, Deployment
        automations = Automation.objects.filter(workspace=workspace)
        
        synced_automations = []
        
        for automation in automations:
            try:
                # Create workflow folder structure
                workflow_path = create_workflow_folder_structure(
                    github_token=github_token,
                    repo_path=repo_path,
                    automation_name=automation.name,
                    workflow_json=automation.workflow_json
                )
                
                # Update automation with workflow path
                automation.workflow_path = workflow_path
                automation.git_repository = workspace.git_repository
                automation.save()
                
                # Create deployment files for existing deployments
                deployments = Deployment.objects.filter(automation=automation)
                for deployment in deployments:
                    try:
                        deployment_config = {
                            'spaceId': str(deployment.space.id),
                            'spaceName': deployment.space.name,
                            'spaceType': deployment.space.space_type,
                            'n8nWorkflowId': deployment.n8n_workflow_id,
                            'deployedCommitSha': deployment.deployed_commit_sha or '',
                            'deployedAt': deployment.created_at.isoformat(),
                            'automationName': automation.name,
                            'status': 'active' if deployment.is_active else 'inactive'
                        }
                        
                        deployment_file_path = create_deployment_file(
                            github_token=github_token,
                            repo_path=repo_path,
                            automation_name=automation.name,
                            space_name=deployment.space.name,
                            deployment_config=deployment_config
                        )
                        
                        # Update deployment with file path
                        deployment.deployment_file_path = deployment_file_path
                        deployment.save()
                        
                    except Exception as e:
                        print(f"Failed to create deployment file for {automation.name} to {deployment.space.name}: {str(e)}")
                        continue
                
                synced_automations.append({
                    'id': str(automation.id),
                    'name': automation.name,
                    'workflow_path': workflow_path,
                    'deployments_count': deployments.count()
                })
                
            except Exception as e:
                print(f"Failed to sync automation {automation.name}: {str(e)}")
                continue
        
        return synced_automations
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to sync automations to repository: {str(e)}")


def ensure_workspace_repository(user, workspace):
    """Ensure workspace has a GitHub repository, create if needed"""
    try:
        # Get GitHub token for user
        github_token = get_github_token_for_user(user)
        if not github_token:
            raise GitHubAPIError("No GitHub connection found")
        
        # Check if workspace already has a repository
        if workspace.git_repository:
            return workspace.git_repository
        
        # Generate repository name
        repo_name = f"stencil-flow-{workspace.name.lower().replace(' ', '-').replace('_', '-')}-{workspace.id.hex[:8]}"
        repo_name = ''.join(c for c in repo_name if c.isalnum() or c in '-')
        
        # Check if repo already exists
        if check_repository_exists(github_token, repo_name):
            # Repo exists, get its URL
            user_info = make_github_api_request('https://api.github.com/user', github_token=github_token)
            username = user_info['login']
            repo_url = f"https://github.com/{username}/{repo_name}"
        else:
            # Create new repository
            repo_info = create_github_repository(
                github_token=github_token,
                repo_name=repo_name,
                description=f"Automation workflows for {workspace.name}",
                private=True
            )
            repo_url = repo_info['html_url']
        
        # Update workspace with repository URL
        workspace.git_repository = repo_url
        workspace.save()
        
        # Sync existing automations to the new repository
        try:
            synced_automations = sync_existing_automations_to_repository(user, workspace)
            print(f"Synced {len(synced_automations)} automations to repository")
        except Exception as e:
            print(f"Warning: Failed to sync automations: {str(e)}")
        
        return repo_url
        
    except Exception as e:
        raise GitHubAPIError(f"Failed to ensure workspace repository: {str(e)}")
