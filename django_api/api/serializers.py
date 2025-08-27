"""
Serializers for API endpoints
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import (
    Workspace, Profile, Space, N8nInstance, 
    Automation, Deployment, Invitation, GitHubToken
)

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='profile.full_name', read_only=True)
    avatar_url = serializers.URLField(source='profile.avatar_url', read_only=True)
    github_username = serializers.CharField(source='profile.github_username', read_only=True)
    workspace_id = serializers.UUIDField(source='profile.workspace.id', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'avatar_url', 'github_username', 'workspace_id', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            # Try to get user by email first, then authenticate with username
            try:
                from django.contrib.auth.models import User
                user_obj = User.objects.get(email=email)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include email and password.')
        
        return attrs


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['id', 'name', 'description', 'git_repository', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProfileSerializer(serializers.ModelSerializer):
    workspace = WorkspaceSerializer(read_only=True)
    workspace_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Profile
        fields = ['id', 'full_name', 'avatar_url', 'workspace', 'workspace_id', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SpaceSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source='workspace.id', read_only=True)
    
    class Meta:
        model = Space
        fields = [
            'id', 'name', 'description', 'space_type', 'platform', 
            'email', 'workspace_id', 'config', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'workspace_id', 'created_at', 'updated_at']


class N8nInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = N8nInstance
        fields = ['id', 'workspace_id', 'space_id', 'instance_url', 'api_key', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'api_key': {'write_only': True}
        }


class AutomationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Automation
        fields = [
            'id', 'name', 'description', 'workspace_id', 'git_repository', 
            'workflow_path', 'workflow_json', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeploymentSerializer(serializers.ModelSerializer):
    automation_name = serializers.CharField(source='automation.name', read_only=True)
    space_name = serializers.CharField(source='space.name', read_only=True)
    space_type = serializers.CharField(source='space.space_type', read_only=True)
    
    class Meta:
        model = Deployment
        fields = [
            'id', 'automation_id', 'space_id', 'n8n_workflow_id', 
            'deployed_commit_sha', 'deployment_file_path', 'is_active',
            'automation_name', 'space_name', 'space_type', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = [
            'id', 'workspace_id', 'invited_by_user_id', 'invited_user_email', 
            'token', 'accepted', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'token', 'created_at', 'updated_at']


# Request/Response serializers for specific endpoints
class CreateAutomationRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    github_token = serializers.CharField()
    workflow_json = serializers.CharField()


class DeployAutomationRequestSerializer(serializers.Serializer):
    automation_id = serializers.UUIDField()
    space_id = serializers.UUIDField()
    github_token = serializers.CharField()


class UpdateDeployedWorkflowRequestSerializer(serializers.Serializer):
    deployment_id = serializers.UUIDField()
    github_token = serializers.CharField()


class ToggleWorkflowActivationRequestSerializer(serializers.Serializer):
    deployment_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=['activate', 'deactivate'])


class InviteUserRequestSerializer(serializers.Serializer):
    email_to_invite = serializers.EmailField()


class AcceptInviteRequestSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class GetCommitHistoryRequestSerializer(serializers.Serializer):
    automation_id = serializers.UUIDField()
    github_token = serializers.CharField()


class UpdateAutomationRequestSerializer(serializers.Serializer):
    automation_id = serializers.UUIDField()
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    workflow_json = serializers.CharField(required=False)
    commit_message = serializers.CharField(required=False)


class RollbackAutomationRequestSerializer(serializers.Serializer):
    automation_id = serializers.UUIDField()
    commit_sha = serializers.CharField(max_length=40)


class SyncAutomationFromN8nRequestSerializer(serializers.Serializer):
    automation_id = serializers.UUIDField()
    n8n_workflow_id = serializers.CharField()


class GitHubConnectionSerializer(serializers.Serializer):
    is_connected = serializers.BooleanField()
    username = serializers.CharField(required=False, allow_blank=True)
