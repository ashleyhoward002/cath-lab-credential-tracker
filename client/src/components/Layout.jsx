import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import WelcomeModal from './WelcomeModal';

export default function Layout({ children }) {
  const { user, logout, isCoordinator, isStaff } = useAuth();
  const { demoMode } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['coordinator', 'manager'] },
    { name: 'My Credentials', path: '/my-credentials', icon: '🎫', roles: ['staff'] },
    { name: 'Staff', path: '/staff', icon: '👥', roles: ['coordinator', 'manager'] },
    { name: 'Reports', path: '/reports', icon: '📈', roles: ['coordinator', 'manager'] },
    { name: 'Credential Types', path: '/credential-types', icon: '📋', roles: ['coordinator'] },
    { name: 'Activity Log', path: '/activity', icon: '📝', roles: ['coordinator'] },
    { name: 'Users', path: '/users', icon: '🔑', roles: ['coordinator'] },
    { name: 'Contacts', path: '/contacts', icon: '📇', roles: ['coordinator', 'manager', 'staff'] },
    { name: 'Help', path: '/help', icon: '❓', roles: ['coordinator', 'manager', 'staff'] },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <WelcomeModal />

      {/* Demo Banner */}
      {demoMode && (
        <div className="bg-amber-400 text-amber-900 text-center py-1 text-sm font-medium">
          DEMO MODE — Sample data for demonstration purposes
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Cath Lab Credential Tracker
              </h1>
              <p className="text-sm text-gray-600">
                {user?.displayName} • {user?.title}
                {user?.role && <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{user.role}</span>}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/change-password"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Change Password
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              if (!item.roles.includes(user?.role)) return null;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm transition
                    ${isActive(item.path)
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Cath Lab Credential Tracker{demoMode ? ' • Demo Version' : ''}
          </p>
        </div>
      </footer>
    </div>
  );
}
