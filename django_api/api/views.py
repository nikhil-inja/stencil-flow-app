"""
Views that mirror Supabase Edge Functions
"""

import json
import requests
import base64
from datetime import datetime
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import (
    Workspace, Profile, Space, N8nInstance, 
    Automation, Deployment, Invitation, GitHubToken
)
from .serializers import *
from .authentication import generate_jwt_token, generate_refresh_token
from .utils import encrypt_token, decrypt_token, get_github_user_info




class AuthViewSet(APIView):
    """Authentication endpoints to replace Supabase Auth"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Sign in with email and password"""
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            access_token = generate_jwt_token(user)
            refresh_token = generate_refresh_token(user)
            
            return Response({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': UserSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SessionView(APIView):
    """Get current session information"""
    
    def get(self, request):
        """Get current user session"""
        try:
            profile = Profile.objects.get(user=request.user)
            return Response({
                'user': UserSerializer(request.user).data,
                'profile': ProfileSerializer(profile).data
            })
        except Profile.DoesNotExist:
            # Create a default workspace and profile for users without one
            workspace, _ = Workspace.objects.get_or_create(
                name="Default Workspace",
                defaults={'description': 'Default workspace for new users'}
            )
            
            profile = Profile.objects.create(
                user=request.user,
                workspace=workspace,
                full_name=request.user.first_name + ' ' + request.user.last_name if request.user.first_name else request.user.username
            )
            
            return Response({
                'user': UserSerializer(request.user).data,
                'profile': ProfileSerializer(profile).data
            })


# Supabase Edge Function Equivalents
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_automation(request):
    """Equivalent to create-automation Supabase function"""
    try:
        serializer = CreateAutomationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        name = data['name']
        description = data.get('description', '')
        github_token = data['github_token']
        workflow_json = data['workflow_json']
        
        # Parse workflow JSON
        try:
            parsed_workflow_json = json.loads(workflow_json)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid workflow JSON'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user profile and workspace
        profile = get_object_or_404(Profile, user=request.user)
        workspace = profile.workspace
        
        # For development: Allow automation creation without Git repository
        # In production, this should be properly configured
        if not workspace.git_repository:
            # Create automation record without Git operations
            automation = Automation.objects.create(
                name=name,
                description=description,
                workspace=workspace,
                workflow_json=parsed_workflow_json,
                # Git fields will be None/empty for now
                git_repository=None,
                workflow_path=None
            )
            
            return Response({
                'id': str(automation.id),
                'name': automation.name,
                'description': automation.description,
                'message': 'Automation created successfully (Git repository not configured - some features may be limited)'
            }, status=status.HTTP_201_CREATED)
        
        # Create workflow folder structure on GitHub
        workflow_folder_name = name.lower().replace(' ', '-')
        workflow_path = f"workflows/{workflow_folder_name}"
        
        # Extract repo path from URL
        repo_path = workspace.git_repository.replace('https://github.com/', '')
        
        # Check if workflow folder already exists
        check_url = f"https://api.github.com/repos/{repo_path}/contents/{workflow_path}"
        check_response = requests.get(check_url, headers={'Authorization': f'token {github_token}'})
        
        if check_response.status_code == 200:
            return Response(
                {'error': f'A workflow with the name "{name}" already exists. Please choose a different name.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create workflow definition file
        definition_content = json.dumps(parsed_workflow_json, indent=2)
        definition_encoded = base64.b64encode(definition_content.encode()).decode()
        
        definition_url = f"https://api.github.com/repos/{repo_path}/contents/{workflow_path}/definition.json"
        definition_payload = {
            'message': f'Create new workflow: {name}',
            'content': definition_encoded
        }
        
        definition_response = requests.put(
            definition_url,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'token {github_token}',
                'Accept': 'application/vnd.github.v3+json'
            },
            json=definition_payload
        )
        
        if not definition_response.ok:
            return Response(
                {'error': f'Failed to create workflow definition: {definition_response.text}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Create deployments folder with README
        deployments_readme = f"""# Deployments for {name}

This folder contains client-specific deployment configurations for the {name} workflow.

Each deployment file represents a specific client instance of this workflow.
"""
        deployments_readme_encoded = base64.b64encode(deployments_readme.encode()).decode()
        
        readme_url = f"https://api.github.com/repos/{repo_path}/contents/{workflow_path}/deployments/README.md"
        readme_payload = {
            'message': f'Create deployments folder for {name}',
            'content': deployments_readme_encoded
        }
        
        readme_response = requests.put(
            readme_url,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'token {github_token}',
                'Accept': 'application/vnd.github.v3+json'
            },
            json=readme_payload
        )
        
        if not readme_response.ok:
            return Response(
                {'error': f'Failed to create deployments folder: {readme_response.text}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Create automation record
        automation = Automation.objects.create(
            name=name,
            description=description,
            workspace=workspace,
            git_repository=workspace.git_repository,
            workflow_path=workflow_path,
            workflow_json=parsed_workflow_json
        )
        
        return Response(AutomationSerializer(automation).data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deploy_automation(request):
    """Equivalent to deploy-automation Supabase function"""
    try:
        serializer = DeployAutomationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        automation_id = data['automation_id']
        space_id = data['space_id']
        github_token = data['github_token']
        
        # Get automation, space, and n8n instance details
        automation = get_object_or_404(Automation, id=automation_id)
        space = get_object_or_404(Space, id=space_id)
        
        # Try to get space-specific instance first, then fall back to workspace master instance
        instance = None
        try:
            instance = N8nInstance.objects.get(space=space)
        except N8nInstance.DoesNotExist:
            # Fall back to workspace master instance
            profile = get_object_or_404(Profile, user=request.user)
            try:
                instance = N8nInstance.objects.get(workspace=profile.workspace, space__isnull=True)
            except N8nInstance.DoesNotExist:
                return Response({
                    'error': 'No N8N instance found. Please configure an N8N instance for this space or set up a master instance in settings.'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Sanitize the workflow JSON
        workflow_to_deploy = {
            'name': automation.name,
            'nodes': automation.workflow_json.get('nodes', []),
            'connections': automation.workflow_json.get('connections', {}),
            'settings': automation.workflow_json.get('settings', {}),
        }
        
        # Deploy to n8n instance
        n8n_url = instance.instance_url.rstrip('/')
        target_url = f"{n8n_url}/api/v1/workflows"
        
        n8n_response = requests.post(
            target_url,
            headers={
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': instance.api_key,
            },
            json=workflow_to_deploy
        )
        
        if not n8n_response.ok:
            return Response(
                {'error': f'n8n API Error (Status {n8n_response.status_code}): {n8n_response.text}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        n8n_workflow_data = n8n_response.json()
        n8n_workflow_id = n8n_workflow_data['id']
        
        # Handle Git operations (skip if no Git repository configured)
        main_branch_sha = None
        deployment_file_path = None
        
        if automation.git_repository:
            # Get latest commit SHA from main branch
            repo_path = automation.git_repository.replace('https://github.com/', '')
            main_branch_url = f"https://api.github.com/repos/{repo_path}/branches/main"
            main_branch_response = requests.get(main_branch_url, headers={'Authorization': f'token {github_token}'})
            
            if not main_branch_response.ok:
                return Response({'error': 'Could not find main branch in repository.'}, status=status.HTTP_400_BAD_REQUEST)
            
            main_branch_data = main_branch_response.json()
            main_branch_sha = main_branch_data['commit']['sha']
        
        # Handle Git operations (skip if no Git repository configured)
        if automation.git_repository and automation.workflow_path:
            # Create deployment configuration file
            space_file_name = space.name.lower().replace(' ', '-')
            deployment_file_path = f"{automation.workflow_path}/deployments/{space_file_name}.json"
            
            deployment_config = {
                'spaceId': str(space_id),
                'spaceName': space.name,
                'spaceType': space.space_type,
                'n8nWorkflowId': n8n_workflow_id,
                'deployedCommitSha': main_branch_sha,
                'deployedAt': datetime.utcnow().isoformat(),
                'automationName': automation.name,
                'status': 'active'
            }
            
            deployment_content = json.dumps(deployment_config, indent=2)
            deployment_encoded = base64.b64encode(deployment_content.encode()).decode()
            
            # Check if deployment file already exists
            existing_file_sha = None
            existing_file_url = f"https://api.github.com/repos/{repo_path}/contents/{deployment_file_path}"
            existing_file_response = requests.get(existing_file_url, headers={'Authorization': f'token {github_token}'})
            
            if existing_file_response.ok:
                existing_file_data = existing_file_response.json()
                existing_file_sha = existing_file_data['sha']
            
            # Create or update deployment file
            file_payload = {
                'message': f"{'Update' if existing_file_sha else 'Create'} deployment: {automation.name} for {space.name}",
                'content': deployment_encoded
            }
            
            if existing_file_sha:
                file_payload['sha'] = existing_file_sha
            
            file_response = requests.put(
                existing_file_url,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'token {github_token}',
                    'Accept': 'application/vnd.github.v3+json'
                },
                json=file_payload
            )
            
            if not file_response.ok:
                return Response(
                    {'error': f'Failed to create deployment file: {file_response.text}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # No Git repository configured - set deployment_file_path to None
            deployment_file_path = None
        
        # Record the deployment in database
        deployment, created = Deployment.objects.update_or_create(
            automation=automation,
            space=space,
            defaults={
                'n8n_workflow_id': n8n_workflow_id,
                'deployed_commit_sha': main_branch_sha,
                'deployment_file_path': deployment_file_path,
                'is_active': True
            }
        )
        
        return Response({'message': f"Successfully deployed '{automation.name}'!"}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_user(request):
    """Equivalent to invite-user Supabase function"""
    try:
        serializer = InviteUserRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email_to_invite = serializer.validated_data['email_to_invite']
        
        # Get inviter's profile
        profile = get_object_or_404(Profile, user=request.user)
        
        # Check if user has already been invited
        if Invitation.objects.filter(workspace=profile.workspace, invited_user_email=email_to_invite).exists():
            return Response({'error': f'{email_to_invite} has already been invited.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create invitation
        invitation = Invitation.objects.create(
            workspace=profile.workspace,
            invited_by_user=request.user,
            invited_user_email=email_to_invite
        )
        
        # Generate invitation link
        invitation_link = f"{settings.SITE_URL}/accept-invite?token={invitation.token}"
        
        return Response({'invitation_link': invitation_link}, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def accept_invite(request):
    """Equivalent to accept-invite Supabase function"""
    try:
        serializer = AcceptInviteRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        token = serializer.validated_data['token']
        
        # Find invitation by token
        try:
            invitation = Invitation.objects.get(token=token, accepted=False)
        except Invitation.DoesNotExist:
            return Response({'error': 'Invalid or expired invitation token.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Create user if they don't exist
        user, created = User.objects.get_or_create(
            email=invitation.invited_user_email,
            defaults={'username': invitation.invited_user_email}
        )
        
        if created:
            # Set a temporary password - user should set their own
            user.set_password('temp_password_change_me')
            user.save()
        
        # Create or update profile
        profile, profile_created = Profile.objects.get_or_create(
            user=user,
            defaults={'workspace': invitation.workspace}
        )
        
        if not profile_created and profile.workspace != invitation.workspace:
            profile.workspace = invitation.workspace
            profile.save()
        
        # Mark invitation as accepted
        invitation.accepted = True
        invitation.save()
        
        # Generate tokens
        access_token = generate_jwt_token(user)
        refresh_token = generate_refresh_token(user)
        
        return Response({
            'message': 'Invitation accepted successfully!',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': UserSerializer(user).data,
            'needs_password_setup': created
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def store_github_token(request):
    """Equivalent to store-github-token Supabase function"""
    try:
        # In a real implementation, you'd get this from OAuth callback
        github_token = request.data.get('github_token')
        if not github_token:
            return Response({'error': 'GitHub token not provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Encrypt and store the token
        encrypted_token = encrypt_token(github_token)
        
        github_token_obj, created = GitHubToken.objects.update_or_create(
            user=request.user,
            defaults={'encrypted_token': encrypted_token}
        )
        
        return Response({'message': 'GitHub token stored securely.'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_github_connection(request):
    """Equivalent to check-github-connection Supabase function"""
    try:
        try:
            github_token_obj = GitHubToken.objects.get(user=request.user)
            github_token = decrypt_token(github_token_obj.encrypted_token)
            
            # Verify token with GitHub API
            user_info = get_github_user_info(github_token)
            if user_info:
                return Response({
                    'is_connected': True,
                    'username': user_info.get('login', '')
                })
            else:
                return Response({'is_connected': False})
                
        except GitHubToken.DoesNotExist:
            return Response({'is_connected': False})
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def list_n8n_workflows(request):
    """Equivalent to list-n8n-workflows Supabase function"""
    try:
        # Get user's workspace and master N8N instance
        profile = get_object_or_404(Profile, user=request.user)
        workspace = profile.workspace
        
        # Find the master N8N instance for this workspace
        try:
            n8n_instance = N8nInstance.objects.get(
                workspace=workspace, 
                space=None  # Master instance has no space
            )
        except N8nInstance.DoesNotExist:
            return Response({
                'error': 'No N8N instance configured. Please add your N8N credentials in Settings.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Make API call to N8N instance
        import requests
        
        n8n_url = n8n_instance.instance_url.rstrip('/')
        api_key = n8n_instance.api_key
        
        if not api_key:
            return Response({
                'error': 'N8N API key not configured. Please update your N8N credentials in Settings.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Call N8N API to list workflows
        try:
            headers = {
                'X-N8N-API-KEY': api_key,
                'Content-Type': 'application/json'
            }
            
            response = requests.get(f'{n8n_url}/api/v1/workflows', headers=headers, timeout=10)
            
            if response.status_code == 401:
                return Response({
                    'error': 'Invalid N8N API key. Please check your credentials in Settings.'
                }, status=status.HTTP_400_BAD_REQUEST)
            elif response.status_code != 200:
                return Response({
                    'error': f'N8N API error: {response.status_code} - {response.text}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            workflows_data = response.json()
            
            # Transform N8N workflow data to match frontend expectations
            workflows = []
            for workflow in workflows_data.get('data', []):
                workflows.append({
                    'id': str(workflow.get('id', '')),
                    'name': workflow.get('name', 'Untitled Workflow'),
                    'active': workflow.get('active', False),
                    'createdAt': workflow.get('createdAt', ''),
                    'updatedAt': workflow.get('updatedAt', '')
                })
            
            return Response({
                'data': workflows
            })
            
        except requests.exceptions.RequestException as e:
            return Response({
                'error': f'Failed to connect to N8N instance: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_n8n_workflows(request):
    """Equivalent to get-n8n-workflows Supabase function"""
    try:
        space_id = request.data.get('space_id')
        if not space_id:
            return Response({'error': 'space_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get space and its N8N instance
        space = get_object_or_404(Space, id=space_id)
        
        # Try to get space-specific instance first, then fall back to master instance
        instance = None
        try:
            instance = N8nInstance.objects.get(space=space)
        except N8nInstance.DoesNotExist:
            # Fall back to workspace master instance
            profile = get_object_or_404(Profile, user=request.user)
            try:
                instance = N8nInstance.objects.get(workspace=profile.workspace, space__isnull=True)
            except N8nInstance.DoesNotExist:
                return Response({
                    'error': 'No N8N instance found for this space.'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Fetch all workflows from the N8N instance
        n8n_url = instance.instance_url.rstrip('/')
        target_url = f"{n8n_url}/api/v1/workflows"
        
        n8n_response = requests.get(
            target_url,
            headers={'X-N8N-API-KEY': instance.api_key}
        )
        
        if not n8n_response.ok:
            return Response({
                'error': f'N8N API Error (Status {n8n_response.status_code}): {n8n_response.text}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        workflows = n8n_response.json()
        
        return Response(workflows, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_n8n_workflow_details(request):
    """Equivalent to get-n8n-workflow-details Supabase function"""
    try:
        workflow_id = request.data.get('workflow_id')
        if not workflow_id:
            return Response({'error': 'workflow_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user profile and workspace for master N8N instance
        profile = get_object_or_404(Profile, user=request.user)
        workspace = profile.workspace
        
        # Get master N8N instance (this function uses master instance, not space-specific)
        try:
            master_instance = N8nInstance.objects.get(workspace=workspace, space__isnull=True)
        except N8nInstance.DoesNotExist:
            return Response({
                'error': 'Master N8N instance not configured. Please set up your N8N instance in settings.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Call the N8N API to get workflow details
        n8n_url = master_instance.instance_url.rstrip('/')
        target_url = f"{n8n_url}/api/v1/workflows/{workflow_id}"
        
        n8n_response = requests.get(
            target_url,
            headers={'X-N8N-API-KEY': master_instance.api_key}
        )
        
        if not n8n_response.ok:
            return Response({
                'error': f'N8N API Error (Status {n8n_response.status_code}): {n8n_response.text}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        workflow_details = n8n_response.json()
        
        return Response(workflow_details, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_commit_history(request):
    """Equivalent to get-commit-history Supabase function"""
    try:
        automation_id = request.data.get('automation_id')
        github_token = request.data.get('github_token')
        
        if not automation_id:
            return Response({'error': 'automation_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Implement GitHub API integration for commit history
        return Response({
            'commits': [],
            'message': 'GitHub integration not yet implemented'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_automation(request):
    """Equivalent to update-automation Supabase function"""
    try:
        automation_id = request.data.get('automation_id')
        if not automation_id:
            return Response({'error': 'automationId is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Implement automation update logic
        return Response({
            'message': 'Automation update not yet implemented'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rollback_automation(request):
    """Equivalent to rollback-automation Supabase function"""
    try:
        automation_id = request.data.get('automation_id')
        commit_sha = request.data.get('commit_sha')
        
        if not automation_id or not commit_sha:
            return Response({'error': 'automation_id and commit_sha are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Implement rollback logic
        return Response({
            'message': 'Automation rollback not yet implemented'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_automation(request):
    """Equivalent to sync-automation Supabase function"""
    try:
        automation_id = request.data.get('automation_id')
        github_token = request.data.get('github_token')
        
        if not automation_id:
            return Response({'error': 'automation_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get automation details
        automation = get_object_or_404(Automation, id=automation_id)
        
        # Get user profile and workspace for master N8N instance
        profile = get_object_or_404(Profile, user=request.user)
        workspace = profile.workspace
        
        # Get master N8N instance
        try:
            master_instance = N8nInstance.objects.get(workspace=workspace, space__isnull=True)
        except N8nInstance.DoesNotExist:
            return Response({
                'error': 'Master N8N instance not configured. Please set up your N8N instance in settings.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get the N8N workflow ID from the automation's workflow_json
        workflow_json = automation.workflow_json
        if not workflow_json or not workflow_json.get('id'):
            return Response({
                'error': 'Could not find source N8N workflow ID in automation.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        n8n_workflow_id = workflow_json['id']
        
        # Fetch the latest version from the master N8N instance
        n8n_url = master_instance.instance_url.rstrip('/')
        target_url = f"{n8n_url}/api/v1/workflows/{n8n_workflow_id}"
        
        n8n_response = requests.get(
            target_url,
            headers={'X-N8N-API-KEY': master_instance.api_key}
        )
        
        if not n8n_response.ok:
            return Response({
                'error': f'Could not fetch latest workflow from N8N instance (Status {n8n_response.status_code}): {n8n_response.text}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        new_workflow_json = n8n_response.json()
        
        # Handle Git operations if repository is configured
        if automation.git_repository and automation.workflow_path and github_token:
            # Commit the updated workflow to GitHub repository
            repo_path = automation.git_repository.replace('https://github.com/', '')
            definition_file_path = f"{automation.workflow_path}/definition.json"
            
            # Get current file to get SHA
            get_file_url = f"https://api.github.com/repos/{repo_path}/contents/{definition_file_path}"
            get_file_response = requests.get(get_file_url, headers={'Authorization': f'token {github_token}'})
            
            if not get_file_response.ok:
                return Response({
                    'error': 'Could not find workflow definition file in GitHub repo to update.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            file_data = get_file_response.json()
            current_sha = file_data['sha']
            
            # Encode new content
            content_encoded = base64.b64encode(
                json.dumps(new_workflow_json, indent=2).encode()
            ).decode()
            
            # Update file in GitHub
            update_response = requests.put(
                get_file_url,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'token {github_token}',
                    'Accept': 'application/vnd.github.v3+json'
                },
                json={
                    'message': 'Sync update from master N8N instance',
                    'content': content_encoded,
                    'sha': current_sha
                }
            )
            
            if not update_response.ok:
                return Response({
                    'error': f'Failed to update GitHub file: {update_response.text}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Update the workflow_json in the database
        automation.workflow_json = new_workflow_json
        automation.save()
        
        return Response({
            'message': 'Automation synced successfully!'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_workflow_activation(request):
    """Equivalent to toggle-workflow-activation Supabase function"""
    try:
        deployment_id = request.data.get('deployment_id')
        action = request.data.get('action')
        
        if not deployment_id or not action:
            return Response({'error': 'deployment_id and action are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if action not in ['activate', 'deactivate']:
            return Response({'error': 'Invalid action. Must be "activate" or "deactivate".'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get deployment details
        deployment = get_object_or_404(Deployment, id=deployment_id)
        
        if not deployment.n8n_workflow_id:
            return Response({
                'error': 'No N8N workflow ID found for this deployment.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get N8N instance for this deployment's space
        space = deployment.space
        instance = None
        
        # Try space-specific instance first, then fall back to master instance
        try:
            instance = N8nInstance.objects.get(space=space)
        except N8nInstance.DoesNotExist:
            # Fall back to workspace master instance
            profile = get_object_or_404(Profile, user=request.user)
            try:
                instance = N8nInstance.objects.get(workspace=profile.workspace, space__isnull=True)
            except N8nInstance.DoesNotExist:
                return Response({
                    'error': 'No N8N instance found for this deployment.'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Make API call to N8N instance to activate/deactivate workflow
        n8n_url = instance.instance_url.rstrip('/')
        target_url = f"{n8n_url}/api/v1/workflows/{deployment.n8n_workflow_id}/{action}"
        
        n8n_response = requests.post(
            target_url,
            headers={'X-N8N-API-KEY': instance.api_key}
        )
        
        if not n8n_response.ok:
            return Response({
                'error': f'N8N API Error (Status {n8n_response.status_code}): {n8n_response.text}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Update deployment status in database
        deployment.is_active = (action == 'activate')
        deployment.save()
        
        response_data = n8n_response.json()
        
        return Response({
            'message': f'Workflow {action}d successfully!',
            'n8n_response': response_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_deployed_workflow(request):
    """Equivalent to update-deployed-workflow Supabase function"""
    try:
        deployment_id = request.data.get('deployment_id')
        github_token = request.data.get('github_token')
        
        if not deployment_id:
            return Response({'error': 'deployment_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get deployment details with related automation and space
        deployment = get_object_or_404(
            Deployment.objects.select_related('automation', 'space'), 
            id=deployment_id
        )
        
        automation = deployment.automation
        space = deployment.space
        
        if not deployment.n8n_workflow_id:
            return Response({
                'error': 'No N8N workflow ID found for this deployment.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get N8N instance for this deployment's space
        instance = None
        
        # Try space-specific instance first, then fall back to master instance
        try:
            instance = N8nInstance.objects.get(space=space)
        except N8nInstance.DoesNotExist:
            # Fall back to workspace master instance
            profile = get_object_or_404(Profile, user=request.user)
            try:
                instance = N8nInstance.objects.get(workspace=profile.workspace, space__isnull=True)
            except N8nInstance.DoesNotExist:
                return Response({
                    'error': 'No N8N instance found for this deployment.'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Sanitize the workflow JSON for deployment
        workflow_to_update = {
            'name': automation.name,
            'nodes': automation.workflow_json.get('nodes', []),
            'connections': automation.workflow_json.get('connections', {}),
            'settings': automation.workflow_json.get('settings', {})
        }
        
        # Make PUT request to update the workflow in N8N
        n8n_url = instance.instance_url.rstrip('/')
        target_url = f"{n8n_url}/api/v1/workflows/{deployment.n8n_workflow_id}"
        
        n8n_response = requests.put(
            target_url,
            headers={
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': instance.api_key
            },
            json=workflow_to_update
        )
        
        if not n8n_response.ok:
            return Response({
                'error': f'N8N API Error (Status {n8n_response.status_code}): {n8n_response.text}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Optional: Verify the update by fetching the workflow back
        verify_response = requests.get(
            target_url,
            headers={'X-N8N-API-KEY': instance.api_key}
        )
        
        # Handle Git operations if repository is configured
        if automation.git_repository and automation.workflow_path and github_token:
            # Update the deployment file in Git with new commit SHA (if needed)
            # This could be implemented later for full Git integration
            pass
        
        # Update the last_updated timestamp on the deployment
        deployment.save()  # This will trigger auto_now on updated_at
        
        return Response({
            'message': f'Successfully updated \'{automation.name}\'!',
            'deployment_id': str(deployment.id),
            'n8n_workflow_id': deployment.n8n_workflow_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disconnect_github(request):
    """Equivalent to disconnect-github Supabase function"""
    try:
        # Remove GitHub token for user
        try:
            github_token_obj = GitHubToken.objects.get(user=request.user)
            github_token_obj.delete()
            return Response({'message': 'GitHub account disconnected successfully'})
        except GitHubToken.DoesNotExist:
            return Response({'message': 'No GitHub connection found'})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upsert_master_n8n_instance(request):
    """Create or update master N8N instance for user's workspace"""
    try:
        instance_url = request.data.get('instance_url')
        api_key = request.data.get('api_key')
        
        if not instance_url:
            return Response({'error': 'instance_url is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user's profile and workspace
        profile = get_object_or_404(Profile, user=request.user)
        workspace = profile.workspace
        
        # Create or update N8N instance
        n8n_instance, created = N8nInstance.objects.update_or_create(
            workspace=workspace,
            space=None,  # Master instances don't belong to a specific space
            defaults={
                'instance_url': instance_url,
                'api_key': api_key if api_key else '',
            }
        )
        
        # Update workspace to link this as master instance
        workspace.master_n8n_instance_id = n8n_instance.id
        workspace.save()
        
        action = 'created' if created else 'updated'
        return Response({
            'message': f'Master N8N instance {action} successfully',
            'instance_id': n8n_instance.id
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# CRUD ViewSets for models
class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    
    def get_queryset(self):
        # Users can only see workspaces they belong to
        profile = get_object_or_404(Profile, user=self.request.user)
        queryset = Workspace.objects.filter(id=profile.workspace.id)
        
        # Support filtering by query parameters (for Supabase compatibility)
        workspace_id = self.request.query_params.get('id')
        if workspace_id:
            if workspace_id == 'default':
                # Return the user's workspace for 'default' requests
                return queryset
            else:
                queryset = queryset.filter(id=workspace_id)
        
        return queryset


class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceSerializer
    
    def get_queryset(self):
        profile = get_object_or_404(Profile, user=self.request.user)
        return Workspace.objects.filter(id=profile.workspace.id)


class ProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = ProfileSerializer
    
    def get_queryset(self):
        # Users can only see their own profile
        return Profile.objects.filter(user=self.request.user)


class ProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProfileSerializer
    
    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)


class AutomationListCreateView(generics.ListCreateAPIView):
    serializer_class = AutomationSerializer
    
    def get_queryset(self):
        profile = get_object_or_404(Profile, user=self.request.user)
        queryset = Automation.objects.filter(workspace=profile.workspace).order_by('-created_at')
        
        # Support filtering by query parameters (for Supabase compatibility)
        workspace_id = self.request.query_params.get('workspace_id')
        if workspace_id:
            # Already filtered by user's workspace above
            pass
            
        return queryset


class AutomationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AutomationSerializer
    
    def get_queryset(self):
        profile = get_object_or_404(Profile, user=self.request.user)
        return Automation.objects.filter(workspace=profile.workspace)


class SpaceListCreateView(generics.ListCreateAPIView):
    serializer_class = SpaceSerializer
    
    def get_queryset(self):
        profile = get_object_or_404(Profile, user=self.request.user)
        return Space.objects.filter(workspace=profile.workspace).order_by('-created_at')
    
    def perform_create(self, serializer):
        profile = get_object_or_404(Profile, user=self.request.user)
        
        # Check if a space with this name already exists in the workspace
        space_name = serializer.validated_data.get('name')
        if Space.objects.filter(workspace=profile.workspace, name=space_name).exists():
            from rest_framework.serializers import ValidationError
            raise ValidationError({
                'name': f'A space named "{space_name}" already exists in your workspace. Please choose a different name.'
            })
        
        serializer.save(workspace=profile.workspace)


class SpaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SpaceSerializer
    
    def get_queryset(self):
        profile = get_object_or_404(Profile, user=self.request.user)
        return Space.objects.filter(workspace=profile.workspace)


class N8nInstanceListCreateView(generics.ListCreateAPIView):
    serializer_class = N8nInstanceSerializer
    
    def get_queryset(self):
        profile = get_object_or_404(Profile, user=self.request.user)
        return N8nInstance.objects.filter(workspace=profile.workspace)


class DeploymentListView(generics.ListAPIView):
    serializer_class = DeploymentSerializer
    
    def get_queryset(self):
        profile = get_object_or_404(Profile, user=self.request.user)
        space_id = self.kwargs.get('space_id')
        if space_id:
            return Deployment.objects.filter(space_id=space_id, automation__workspace=profile.workspace)
        return Deployment.objects.filter(automation__workspace=profile.workspace)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """
    Get dashboard statistics for the current user's workspace.
    Replaces the get_dashboard_stats RPC function from Supabase.
    """
    try:
        # Get the current user's profile and workspace
        profile = get_object_or_404(Profile, user=request.user)
        workspace = profile.workspace
        
        # Count automations for the workspace
        automation_count = Automation.objects.filter(workspace=workspace).count()
        
        # Count spaces (previously clients) for the workspace  
        space_count = Space.objects.filter(workspace=workspace).count()
        
        # Count deployments for the workspace (through spaces)
        deployment_count = Deployment.objects.filter(
            space__workspace=workspace
        ).count()
        
        # TODO: Implement ActivityLog model and add real activity tracking
        # For now, return empty activity list
        activity_data = []
        
        # Return all stats as a single response
        stats = {
            'automation_count': automation_count,
            'space_count': space_count,  # Updated from client_count
            'deployment_count': deployment_count,
            'recent_activity': activity_data
        }
        
        return Response(stats)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
