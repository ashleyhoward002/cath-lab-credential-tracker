import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.checkSession();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await authAPI.login(username, password);
    setUser(response.data);
    return response.data;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const isCoordinator = user?.role === 'coordinator';
  const isManager = user?.role === 'manager';
  const isStaff = user?.role === 'staff';
  const canEditStaff = user?.role === 'coordinator' || user?.role === 'manager';
  const canManageUsers = user?.role === 'coordinator';
  const canConfigureCredentialTypes = user?.role === 'coordinator';

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      isCoordinator, isManager, isStaff,
      canEditStaff, canManageUsers, canConfigureCredentialTypes,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
