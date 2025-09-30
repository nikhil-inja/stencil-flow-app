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
    workflow_json = serializers.CharField()


class DeployAutomationRequestSerializer(serializers.Serializer):
    automation_id = serializers.UUIDField()
    space_id = serializers.UUIDField()


class UpdateDeployedWorkflowRequestSerializer(serializers.Serializer):
    deployment_id = serializers.UUIDField()


class ToggleWorkflowActivationRequestSerializer(serializers.Serializer):
    deployment_id = serializers.UUIDField()
    action = serializers.ChoiceField(choices=['activate', 'deactivate'])


class InviteUserRequestSerializer(serializers.Serializer):
    email_to_invite = serializers.EmailField()


class AcceptInviteRequestSerializer(serializers.Serializer):
    token = serializers.UUIDField()


class GetCommitHistoryRequestSerializer(serializers.Serializer):
    automation_id = serializers.UUIDField()


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


class GitHubOAuthResponseSerializer(serializers.Serializer):
    """Serializer for GitHub OAuth responses"""
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    user = UserSerializer()
    profile = ProfileSerializer()


class ExecutionAnalyticsRequestSerializer(serializers.Serializer):
    """Serializer for execution analytics request"""
    workflow_id = serializers.CharField(help_text="N8N workflow ID to get execution analytics for")


class DailyExecutionStatsSerializer(serializers.Serializer):
    """Serializer for daily execution statistics"""
    date = serializers.DateField()
    total_executions = serializers.IntegerField()
    successful_executions = serializers.IntegerField()
    failed_executions = serializers.IntegerField()
    success_percentage = serializers.FloatField()


class ExecutionAnalyticsResponseSerializer(serializers.Serializer):
    """Serializer for execution analytics response"""
    workflow_id = serializers.CharField()
    total_executions = serializers.IntegerField()
    total_successful = serializers.IntegerField()
    total_failed = serializers.IntegerField()
    overall_success_percentage = serializers.FloatField()
    daily_stats = DailyExecutionStatsSerializer(many=True)
    period_start = serializers.DateField()
    period_end = serializers.DateField()


class WorkflowFlowchartRequestSerializer(serializers.Serializer):
    """Serializer for workflow flowchart request"""
    workflow_id = serializers.CharField(help_text="N8N workflow ID to generate flowchart for")
    include_execution_data = serializers.BooleanField(
        default=False, 
        help_text="Whether to include execution data in the analysis"
    )


class WorkflowFlowchartResponseSerializer(serializers.Serializer):
    """Serializer for workflow flowchart response"""
    workflow_id = serializers.CharField()
    mermaid_diagram = serializers.CharField(help_text="Mermaid diagram syntax")
    workflow_name = serializers.CharField(help_text="Name of the workflow")
    node_count = serializers.IntegerField(help_text="Number of nodes in the workflow")
    connection_count = serializers.IntegerField(help_text="Number of connections in the workflow")
    last_updated = serializers.DateTimeField(help_text="When the diagram was last generated")
    generation_method = serializers.CharField(help_text="Method used to generate the diagram (llm, template, etc.)")


class AITokenUsageRequestSerializer(serializers.Serializer):
    """Serializer for AI token usage request"""
    workflow_id = serializers.CharField(help_text="N8N workflow ID to get AI token usage for")


class DailyTokenUsageSerializer(serializers.Serializer):
    """Serializer for daily token usage statistics"""
    date = serializers.DateField()
    tokens_used = serializers.IntegerField()
    cost = serializers.FloatField()


class ProviderBreakdownSerializer(serializers.Serializer):
    """Serializer for provider breakdown data"""
    tokens = serializers.IntegerField()
    cost = serializers.FloatField()
    executions = serializers.IntegerField(default=0)


class ModelBreakdownSerializer(serializers.Serializer):
    """Serializer for model breakdown data"""
    tokens = serializers.IntegerField()
    cost = serializers.FloatField()
    executions = serializers.IntegerField(default=0)
    provider = serializers.CharField()


class NodeBreakdownSerializer(serializers.Serializer):
    """Serializer for node breakdown data"""
    node_name = serializers.CharField()
    node_type = serializers.CharField(required=False)
    tokens = serializers.IntegerField()
    cost = serializers.FloatField()
    model = serializers.CharField(required=False)
    provider = serializers.CharField(required=False)
    executions = serializers.IntegerField(default=0)


class AITokenUsageResponseSerializer(serializers.Serializer):
    """Enhanced serializer for AI token usage response with provider breakdowns"""
    workflow_id = serializers.CharField()
    total_tokens_used = serializers.IntegerField()
    total_cost = serializers.FloatField()
    
    # Enhanced breakdowns
    provider_breakdown = serializers.DictField(
        child=ProviderBreakdownSerializer(),
        help_text="Token usage breakdown by AI provider (openai, anthropic, groq, etc.)",
        required=False
    )
    model_breakdown = serializers.DictField(
        child=ModelBreakdownSerializer(), 
        help_text="Token usage breakdown by specific model",
        required=False
    )
    node_breakdown = NodeBreakdownSerializer(
        many=True,
        help_text="Token usage breakdown by workflow node",
        required=False
    )
    
    # Existing fields
    daily_token_usage = DailyTokenUsageSerializer(many=True)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    ai_nodes_found = serializers.ListField(
        child=serializers.CharField(), 
        help_text="List of AI node types found in the workflow"
    )
    
    # New metadata fields
    discovered_models = serializers.ListField(
        child=serializers.CharField(),
        help_text="Models detected in workflow executions",
        required=False
    )
    provider_usage_summary = serializers.DictField(
        help_text="Summary statistics by provider",
        required=False
    )
    total_executions_analyzed = serializers.IntegerField(
        help_text="Total number of executions analyzed",
        required=False
    )
    analysis_method = serializers.CharField(
        help_text="Method used for analysis (mcp_enhanced, legacy, etc.)",
        default="mcp_enhanced"
    )