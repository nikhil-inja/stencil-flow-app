// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext';
import { Toaster } from 'react-hot-toast';

// Import Layout and Page Components
import SharedLayout from './shared/components/SharedLayout';
import ProtectedRoute from './shared/components/ProtectedRoute';
import AuthPage from './app/agency/pages/AuthPage';
import DashboardPage from './app/agency/pages/DashboardPage';
import AutomationsPage from './app/agency/pages/AutomationsPage';
import SpacesPage from './app/agency/pages/SpacesPage';
import SpaceDetailPage from './app/agency/pages/SpaceDetailPage';
import EditAutomationPage from './app/agency/pages/EditAutomationPage';
import TeamSettingsPage from './app/agency/pages/SettingsPage';
import ImportPage from './app/agency/pages/ImportPage';
import AcceptInvitePage from './app/agency/pages/AcceptInvitePage';
import GitHubCallbackPage from './app/agency/pages/GitHubCallbackPage';

export default function App() {
  return (
    <SessionProvider>
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          {/* Protected Routes now render inside the SharedLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<SharedLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/automations" element={<AutomationsPage />} />
              <Route path="/spaces" element={<SpacesPage />} />
              <Route path="/space/:spaceId" element={<SpaceDetailPage />} />
              <Route path="/automation/:automationId/edit" element={<EditAutomationPage />} />
              <Route path="/settings/team" element={<TeamSettingsPage />} />
              <Route path="/import/n8n" element={<ImportPage />} />
              <Route path="/github-callback" element={<GitHubCallbackPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}