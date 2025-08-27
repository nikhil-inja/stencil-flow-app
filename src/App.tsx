// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext';
import { Toaster } from 'react-hot-toast';

// Import Layout and Page Components
import SharedLayout from './components/SharedLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AutomationsPage from './pages/AutomationsPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import EditAutomationPage from './pages/EditAutomationPage';
import TeamSettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import GitHubCallbackPage from './pages/GitHubCallbackPage';

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
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/client/:clientId" element={<ClientDetailPage />} />
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