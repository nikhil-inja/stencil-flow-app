# Complete Supabase to Django Migration Plan

This document outlines the complete migration strategy from Supabase to Django REST API with AWS deployment.

## Overview

**Goal**: Remove all Supabase dependencies and migrate to a Django REST API backend deployable on AWS.

**Benefits**:
- Complete control over backend infrastructure
- No vendor lock-in
- Cost optimization with AWS
- Better scalability and customization
- Enhanced security and compliance

## Migration Architecture

```
BEFORE:                           AFTER:
┌─────────────────┐              ┌─────────────────┐
│   React App     │              │   React App     │
│                 │              │                 │
│  Supabase SDK   │              │  API Client     │
└─────────┬───────┘              └─────────┬───────┘
          │                                │
          │ supabase.from()                │ fetch() / axios
          │ supabase.auth                  │ JWT tokens
          │ supabase.functions             │ REST endpoints
          │                                │
┌─────────▼───────┐              ┌─────────▼───────┐
│    Supabase     │              │  Django API     │
│                 │              │                 │
│  - Database     │              │  - PostgreSQL   │
│  - Auth         │              │  - JWT Auth     │
│  - Edge Funcs   │              │  - REST Views   │
│  - Storage      │              │  - File Storage │
└─────────────────┘              └─────────────────┘
```

## Phase 1: Backend Setup (Complete ✅)

### 1.1 Django Project Structure
```
django_api/
├── requirements.txt              ✅ Created
├── manage.py                     ✅ Created
├── stencil_flow_api/
│   ├── settings.py              ✅ Created
│   ├── urls.py                  ✅ Created
│   └── wsgi.py                  ✅ Created
└── api/
    ├── models.py                ✅ Created - Full schema
    ├── views.py                 ✅ Created - All edge functions
    ├── serializers.py           ✅ Created - Request/response
    ├── authentication.py        ✅ Created - JWT auth
    ├── utils.py                 ✅ Created - Helper functions
    ├── urls.py                  ✅ Created - API endpoints
    └── admin.py                 ✅ Created - Admin interface
```

### 1.2 Database Models ✅
All Supabase tables converted to Django models:
- ✅ User (custom user model)
- ✅ Workspace
- ✅ Profile
- ✅ Client
- ✅ N8nInstance
- ✅ Automation
- ✅ Deployment
- ✅ Invitation
- ✅ GitHubToken

### 1.3 Authentication System ✅
- ✅ JWT-based authentication
- ✅ Custom authentication class
- ✅ Token generation and validation
- ✅ Session management

### 1.4 API Endpoints ✅
All Supabase edge functions converted:
- ✅ `/api/functions/create-automation/`
- ✅ `/api/functions/deploy-automation/`
- ✅ `/api/functions/invite-user/`
- ✅ `/api/functions/accept-invite/`
- ✅ `/api/functions/store-github-token/`
- ✅ `/api/functions/check-github-connection/`
- ✅ CRUD endpoints for all models

## Phase 2: Frontend Migration

### 2.1 API Client Creation ✅
- ✅ Created `src/lib/apiClient.ts`
- ✅ Supabase-compatible interface
- ✅ JWT token management
- ✅ Request/response handling

### 2.2 Component Updates (In Progress 🔄)

#### Files to Update:
1. **Authentication Components**:
   - [ ] `src/context/SessionContext.tsx` - Update auth context
   - [ ] `src/app/agency/pages/AuthPage.tsx` - Update login form
   - [ ] `src/shared/components/ProtectedRoute.tsx` - Update auth check

2. **Automation Components**:
   - [ ] `src/shared/components/AutomationsManager.tsx` - Update API calls
   - [ ] `src/shared/components/CreateAutomationForm.tsx` - Update creation
   - [ ] `src/shared/components/AutomationList.tsx` - Update listing
   - [ ] `src/app/agency/pages/EditAutomationPage.tsx` - Update editing

3. **Client Management**:
   - [ ] `src/app/agency/pages/ClientsPage.tsx` - Update client CRUD
   - [ ] `src/app/agency/pages/ClientDetailPage.tsx` - Update deployments

4. **Settings & Admin**:
   - [ ] `src/app/agency/pages/SettingsPage.tsx` - Update invitations
   - [ ] `src/app/agency/pages/ImportPage.tsx` - Update N8N import
   - [ ] `src/app/agency/pages/AcceptInvitePage.tsx` - Update invite flow

### 2.3 Update Import Statements
Replace all Supabase imports:
```typescript
// OLD
import { supabase } from '@/supabaseClient';

// NEW
import { apiClient } from '@/lib/apiClient';
```

## Phase 3: Data Migration

### 3.1 Export Supabase Data
```sql
-- Export scripts for each table
COPY (SELECT * FROM auth.users) TO '/tmp/users.csv' WITH CSV HEADER;
COPY (SELECT * FROM public.profiles) TO '/tmp/profiles.csv' WITH CSV HEADER;
COPY (SELECT * FROM public.workspaces) TO '/tmp/workspaces.csv' WITH CSV HEADER;
COPY (SELECT * FROM public.clients) TO '/tmp/clients.csv' WITH CSV HEADER;
COPY (SELECT * FROM public.automations) TO '/tmp/automations.csv' WITH CSV HEADER;
COPY (SELECT * FROM public.deployments) TO '/tmp/deployments.csv' WITH CSV HEADER;
COPY (SELECT * FROM public.n8n_instances) TO '/tmp/n8n_instances.csv' WITH CSV HEADER;
```

### 3.2 Import to Django
```python
# Django management command
python manage.py migrate_from_supabase \
  --users-file /tmp/users.csv \
  --profiles-file /tmp/profiles.csv \
  --workspaces-file /tmp/workspaces.csv \
  --clients-file /tmp/clients.csv \
  --automations-file /tmp/automations.csv \
  --deployments-file /tmp/deployments.csv \
  --n8n-instances-file /tmp/n8n_instances.csv
```

## Phase 4: Testing & Validation

### 4.1 Functionality Testing
- [ ] User authentication flow
- [ ] Automation creation and editing
- [ ] Client management
- [ ] N8N deployments
- [ ] GitHub integration
- [ ] User invitations

### 4.2 Performance Testing
- [ ] API response times
- [ ] Database query optimization
- [ ] Load testing with concurrent users

### 4.3 Security Testing
- [ ] JWT token validation
- [ ] API endpoint authentication
- [ ] Data encryption verification
- [ ] CORS policy testing

## Phase 5: AWS Deployment

### 5.1 Infrastructure Setup
```yaml
# AWS Resources
- RDS PostgreSQL instance
- EC2 instance (or ECS/Fargate)
- Application Load Balancer
- S3 bucket for static files
- CloudFront for CDN
- Route 53 for DNS
- SSL certificate
```

### 5.2 Database Migration
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier stencil-flow-prod \
  --db-instance-class db.t3.small \
  --engine postgres \
  --master-username postgres \
  --allocated-storage 100 \
  --storage-encrypted

# Run migrations on production
python manage.py migrate --settings=stencil_flow_api.settings.production
```

### 5.3 Application Deployment
```bash
# Deploy Django API
docker build -t stencil-flow-api .
docker run -p 8000:8000 stencil-flow-api

# Deploy React frontend
npm run build
aws s3 sync build/ s3://your-frontend-bucket/
```

## Phase 6: Cutover & Cleanup

### 6.1 DNS Cutover
- [ ] Update frontend API base URL
- [ ] Test all functionality
- [ ] Monitor error rates

### 6.2 Supabase Cleanup
- [ ] Backup final data from Supabase
- [ ] Cancel Supabase subscription
- [ ] Remove Supabase dependencies from package.json

## Implementation Commands

### Immediate Next Steps:

1. **Set up Django backend**:
```bash
cd django_api
pip install -r requirements.txt
cp .env.example .env  # Edit with your values
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

2. **Update frontend components**:
```bash
# Update each component to use apiClient instead of supabase
# Start with SessionContext.tsx as it's the foundation
```

3. **Test the migration**:
```bash
# Start both frontend and backend
cd django_api && python manage.py runserver &
cd .. && npm start
```

## Migration Timeline

- **Week 1**: Backend setup and testing (✅ Complete)
- **Week 2**: Frontend component updates (🔄 In Progress)
- **Week 3**: Data migration and integration testing
- **Week 4**: AWS deployment and production testing
- **Week 5**: Cutover and monitoring

## Risk Mitigation

1. **Gradual Migration**: Keep Supabase running until Django is fully tested
2. **Feature Flags**: Use environment variables to switch between backends
3. **Data Backup**: Multiple backups before any data migration
4. **Rollback Plan**: Ability to revert to Supabase quickly if needed

## Cost Comparison

| Service | Supabase | AWS Alternative | Monthly Savings |
|---------|----------|-----------------|-----------------|
| Database | $25/month | RDS t3.micro $15 | $10 |
| Auth | Included | JWT (Free) | $5 |
| Functions | $10/month | EC2 t3.micro $8 | $2 |
| Storage | $10/month | S3 $5 | $5 |
| **Total** | **$45/month** | **$28/month** | **$17/month** |

## Success Criteria

- [ ] All Supabase functionality replicated
- [ ] Zero downtime during cutover
- [ ] Performance equal or better than Supabase
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team trained on new architecture

---

**Next Action**: Begin Phase 2 frontend component updates, starting with `SessionContext.tsx`.
