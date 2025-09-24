"""
Admin configuration for API models
"""

from django.contrib import admin
from django.contrib.auth.models import User
from .models import (
    Workspace, Profile, Space, N8nInstance,
    Automation, Deployment, Invitation, GitHubToken
)

# We don't register User since it's already registered by Django
# We extend it through Profile model instead


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'git_repository', 'created_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'workspace', 'full_name', 'github_username', 'created_at']
    list_filter = ['workspace', 'created_at']
    search_fields = ['user__email', 'user__username', 'full_name', 'github_username', 'workspace__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Space)
class SpaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'space_type', 'platform', 'workspace', 'is_active', 'created_at']
    list_filter = ['space_type', 'platform', 'workspace', 'is_active', 'created_at']
    search_fields = ['name', 'description', 'email', 'workspace__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(N8nInstance)
class N8nInstanceAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'instance_url', 'workspace', 'space', 'created_at']
    list_filter = ['workspace', 'created_at']
    search_fields = ['instance_url', 'workspace__name', 'space__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Automation)
class AutomationAdmin(admin.ModelAdmin):
    list_display = ['name', 'workspace', 'workflow_path', 'created_at']
    list_filter = ['workspace', 'created_at']
    search_fields = ['name', 'description', 'workspace__name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Deployment)
class DeploymentAdmin(admin.ModelAdmin):
    list_display = ['automation', 'space', 'n8n_workflow_id', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'automation__workspace', 'space__space_type']
    search_fields = ['automation__name', 'space__name', 'n8n_workflow_id']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ['invited_user_email', 'workspace', 'invited_by_user', 'accepted', 'created_at']
    list_filter = ['accepted', 'workspace', 'created_at']
    search_fields = ['invited_user_email', 'workspace__name', 'invited_by_user__email']
    readonly_fields = ['id', 'token', 'created_at', 'updated_at']


@admin.register(GitHubToken)
class GitHubTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'updated_at']
    search_fields = ['user__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'encrypted_token']
