"""
URL configuration for API endpoints
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()

urlpatterns = [
    # Authentication
    path('auth/signin/', views.AuthViewSet.as_view(), name='auth_signin'),
    path('auth/session/', views.SessionView.as_view(), name='auth_session'),
    
    # Supabase Edge Function Equivalents
    path('functions/create-automation/', views.create_automation, name='create_automation'),
    path('functions/deploy-automation/', views.deploy_automation, name='deploy_automation'),
    path('functions/invite-user/', views.invite_user, name='invite_user'),
    path('functions/accept-invite/', views.accept_invite, name='accept_invite'),
    path('functions/store-github-token/', views.store_github_token, name='store_github_token'),
    path('functions/check-github-connection/', views.check_github_connection, name='check_github_connection'),
    path('functions/list-n8n-workflows/', views.list_n8n_workflows, name='list_n8n_workflows'),
    path('functions/get-n8n-workflows/', views.get_n8n_workflows, name='get_n8n_workflows'),
    path('functions/get-n8n-workflow-details/', views.get_n8n_workflow_details, name='get_n8n_workflow_details'),
    path('functions/get-commit-history/', views.get_commit_history, name='get_commit_history'),
    path('functions/update-automation/', views.update_automation, name='update_automation'),
    path('functions/rollback-automation/', views.rollback_automation, name='rollback_automation'),
    path('functions/sync-automation/', views.sync_automation, name='sync_automation'),
    path('functions/toggle-workflow-activation/', views.toggle_workflow_activation, name='toggle_workflow_activation'),
    path('functions/update-deployed-workflow/', views.update_deployed_workflow, name='update_deployed_workflow'),
    path('functions/disconnect-github/', views.disconnect_github, name='disconnect_github'),
    path('functions/get-dashboard-stats/', views.get_dashboard_stats, name='get_dashboard_stats'),
    path('n8n/upsert-master-instance/', views.upsert_master_n8n_instance, name='upsert_master_n8n_instance'),
    
    # CRUD Endpoints
    path('workspaces/', views.WorkspaceListCreateView.as_view(), name='workspace_list'),
    path('workspaces/<uuid:pk>/', views.WorkspaceDetailView.as_view(), name='workspace_detail'),
    path('profiles/', views.ProfileListCreateView.as_view(), name='profile_list'),
    path('profiles/<uuid:pk>/', views.ProfileDetailView.as_view(), name='profile_detail'),
    path('automations/', views.AutomationListCreateView.as_view(), name='automation_list'),
    path('automations/<uuid:pk>/', views.AutomationDetailView.as_view(), name='automation_detail'),
    path('spaces/', views.SpaceListCreateView.as_view(), name='space_list'),
    path('spaces/<uuid:pk>/', views.SpaceDetailView.as_view(), name='space_detail'),
    path('n8n-instances/', views.N8nInstanceListCreateView.as_view(), name='n8n_instance_list'),
    path('deployments/', views.DeploymentListView.as_view(), name='deployment_list'),
    path('deployments/space/<uuid:space_id>/', views.DeploymentListView.as_view(), name='space_deployments'),
    
    # Include router URLs
    path('', include(router.urls)),
]
