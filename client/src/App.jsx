import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import StaffDetail from './pages/StaffDetail';
import AddStaff from './pages/AddStaff';
import EditStaff from './pages/EditStaff';
import CredentialTypes from './pages/CredentialTypes';
import Reports from './pages/Reports';
import Layout from './components/Layout';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <Staff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/new"
        element={
          <ProtectedRoute>
            <AddStaff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/:id/edit"
        element={
          <ProtectedRoute>
            <EditStaff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/:id"
        element={
          <ProtectedRoute>
            <StaffDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/credential-types"
        element={
          <ProtectedRoute>
            <CredentialTypes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
