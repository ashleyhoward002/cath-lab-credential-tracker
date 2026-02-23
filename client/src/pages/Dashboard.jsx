import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [upcomingExpirations, setUpcomingExpirations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(90);

  useEffect(() => {
    loadDashboardData();
  }, [daysFilter]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, expirationsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getUpcomingExpirations(daysFilter),
      ]);
      setStats(statsRes.data);
      setUpcomingExpirations(expirationsRes.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (daysUntil) => {
    if (daysUntil < 0) return 'text-red-700 bg-red-100';
    if (daysUntil <= 30) return 'text-amber-700 bg-amber-100';
    return 'text-green-700 bg-green-100';
  };

  const getStatusIcon = (daysUntil) => {
    if (daysUntil < 0) return '🔴';
    if (daysUntil <= 30) return '🟡';
    return '🟢';
  };

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Staff</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.activeStaff || 0}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats?.expired || 0}</p>
            </div>
            <div className="text-4xl">🔴</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring (30 days)</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{stats?.expiringSoon30 || 0}</p>
            </div>
            <div className="text-4xl">🟡</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring (90 days)</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.expiringSoon90 || 0}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
      </div>

      {/* Upcoming Expirations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Expirations</h3>
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
            <option value={90}>Next 90 days</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credential
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiration Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {upcomingExpirations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No upcoming expirations in the next {daysFilter} days
                  </td>
                </tr>
              ) : (
                upcomingExpirations.map((item) => {
                  const daysUntil = Math.floor(item.days_until_expiration);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/staff/${item.staff_id}`} className="block hover:text-blue-600">
                          <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                            {item.first_name} {item.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{item.employee_id}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.credential_name}</div>
                        <div className="text-sm text-gray-500">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.expiration_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(daysUntil)}`}>
                          {getStatusIcon(daysUntil)}
                          <span className="ml-1">
                            {daysUntil < 0 ? `Expired ${Math.abs(daysUntil)} days ago` : `${daysUntil} days`}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          to={`/staff/${item.staff_id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
