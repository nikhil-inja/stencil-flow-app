// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route: Anyone can see this page */}
        <Route path="/login" element={<AuthPage />} />

        {/* Protected Route: Only logged-in users can see this */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          {/* You can add more protected routes here, e.g., <Route path="/settings" element={<SettingsPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;