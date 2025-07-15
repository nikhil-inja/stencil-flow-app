// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import { SessionProvider } from './context/SessionContext';
import ClientDetailPage from './pages/ClientDetailPage';
import EditBlueprintPage from './pages/EditBlueprintPage';
import { Toaster } from 'react-hot-toast';
import TeamSettingsPage from './pages/TeamSettingsPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import ImportPage from './pages/ImportPage';

function App() {
  return (
    <SessionProvider>
    <Toaster position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          <Route path="/" element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/client/:clientId" element={<ClientDetailPage />} />
            <Route path="/blueprint/:blueprintId/edit" element={<EditBlueprintPage />} />
            <Route path="/settings/team" element={<TeamSettingsPage />} />
            <Route path="/import/n8n" element={<ImportPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;