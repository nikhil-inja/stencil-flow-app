"""
Django models that mirror the Supabase database schema.
"""

from django.db import models
from django.contrib.auth.models import User
import uuid


class Workspace(models.Model):
    """Workspace model to organize users and automations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    git_repository = models.URLField(blank=True, null=True, help_text="URL of the consolidated GitHub repository")
    master_n8n_instance_id = models.UUIDField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Profile(models.Model):
    """User profile linked to workspace - extends Django User with Supabase data"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255, blank=True, null=True)
    avatar_url = models.URLField(blank=True, null=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='profiles')
    
    # GitHub OAuth fields (moved from custom User model)
    github_user_id = models.CharField(max_length=50, blank=True, null=True)
    github_username = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.workspace.name}"


class Space(models.Model):
    """Space model for organizing automation deployments (formerly Client)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    space_type = models.CharField(
        max_length=50, 
        choices=[
            ('client', 'Client'),
            ('internal', 'Internal'),
            ('demo', 'Demo'),
            ('testing', 'Testing'),
            ('staging', 'Staging'),
            ('production', 'Production'),
        ],
        default='client'
    )
    platform = models.CharField(
        max_length=50,
        choices=[
            ('n8n', 'N8N'),
            ('zapier', 'Zapier'),
            ('make', 'Make.com'),
            ('custom', 'Custom'),
        ],
        default='n8n'
    )
    email = models.EmailField(blank=True, null=True, help_text="Contact email for this space")
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='spaces')
    config = models.JSONField(default=dict, blank=True, help_text="Platform-specific configuration")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'name'],
                name='unique_workspace_space_name'
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.space_type})"


class N8nInstance(models.Model):
    """N8N instance configuration"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='n8n_instances', blank=True, null=True)
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='n8n_instances', blank=True, null=True)
    instance_url = models.URLField()
    api_key = models.CharField(max_length=500)  # Encrypted in production
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['workspace'], 
                condition=models.Q(space__isnull=True),
                name='unique_workspace_master_instance'
            ),
            models.UniqueConstraint(
                fields=['space'], 
                condition=models.Q(space__isnull=False),
                name='unique_space_instance'
            )
        ]

    def __str__(self):
        if self.space:
            return f"N8N Instance for {self.space.name}"
        return f"Master N8N Instance for {self.workspace.name}"


class Automation(models.Model):
    """Automation/workflow model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='automations')
    git_repository = models.URLField(blank=True, null=True)
    workflow_path = models.CharField(max_length=500, blank=True, null=True, help_text="Path to workflow folder within repository")
    workflow_json = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Deployment(models.Model):
    """Deployment tracking for automations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    automation = models.ForeignKey(Automation, on_delete=models.CASCADE, related_name='deployments')
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='deployments')
    n8n_workflow_id = models.CharField(max_length=100)
    deployed_commit_sha = models.CharField(max_length=40, blank=True, null=True)
    deployment_file_path = models.CharField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['automation', 'space'],
                name='unique_automation_space_deployment'
            )
        ]

    def __str__(self):
        return f"{self.automation.name} -> {self.space.name}"


class Invitation(models.Model):
    """User invitation model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='invitations')
    invited_by_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    invited_user_email = models.EmailField()
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'invited_user_email'],
                name='unique_workspace_email_invitation'
            )
        ]

    def __str__(self):
        return f"Invitation to {self.invited_user_email} for {self.workspace.name}"


class GitHubToken(models.Model):
    """Secure storage for GitHub tokens (replaces Supabase Vault)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='github_token')
    encrypted_token = models.TextField()  # Encrypted token
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"GitHub Token for {self.user.email}"
