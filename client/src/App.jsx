import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import { setupAPI } from './utils/api';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import StaffDetail from './pages/StaffDetail';
import AddStaff from './pages/AddStaff';
import EditStaff from './pages/EditStaff';
import CredentialTypes from './pages/CredentialTypes';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import MyCredentials from './pages/MyCredentials';
import ChangePassword from './pages/ChangePassword';
import Help from './pages/Help';
import Contacts from './pages/Contacts';
import Layout from './components/Layout';
import InstallPrompt from './components/InstallPrompt';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'staff' ? '/my-credentials' : '/dashboard'} />;
  }

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(null);

  useEffect(() => {
    setupAPI.getStatus()
      .then(res => setNeedsSetup(res.data.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  if (needsSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup onComplete={() => setNeedsSetup(false)} />} />
        <Route path="*" element={<Navigate to="/setup" />} />
      </Routes>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const defaultPath = user?.role === 'staff' ? '/my-credentials' : '/dashboard';

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultPath} /> : <Login />} />

      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['coordinator', 'manager']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['coordinator', 'manager']}>
          <Staff />
        </ProtectedRoute>
      } />
      <Route path="/staff/new" element={
        <ProtectedRoute allowedRoles={['coordinator']}>
          <AddStaff />
        </ProtectedRoute>
      } />
      <Route path="/staff/:id/edit" element={
        <ProtectedRoute allowedRoles={['coordinator', 'manager']}>
          <EditStaff />
        </ProtectedRoute>
      } />
      <Route path="/staff/:id" element={
        <ProtectedRoute allowedRoles={['coordinator', 'manager']}>
          <StaffDetail />
        </ProtectedRoute>
      } />
      <Route path="/credential-types" element={
        <ProtectedRoute allowedRoles={['coordinator']}>
          <CredentialTypes />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['coordinator', 'manager']}>
          <Reports />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute allowedRoles={['coordinator']}>
          <UserManagement />
        </ProtectedRoute>
      } />
      <Route path="/contacts" element={
        <ProtectedRoute>
          <Contacts />
        </ProtectedRoute>
      } />
      <Route path="/my-credentials" element={
        <ProtectedRoute allowedRoles={['staff']}>
          <MyCredentials />
        </ProtectedRoute>
      } />
      <Route path="/change-password" element={
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      } />
      <Route path="/help" element={
        <ProtectedRoute>
          <Help />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to={user ? defaultPath : '/login'} />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ConfigProvider>
        <AuthProvider>
          <AppRoutes />
          <InstallPrompt />
        </AuthProvider>
      </ConfigProvider>
    </Router>
  );
}

export default App;
