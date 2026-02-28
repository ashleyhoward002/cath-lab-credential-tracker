import { useState, useEffect } from 'react';
import { auditAPI, usersAPI } from '../utils/api';

export default function ActivityLog() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    table_name: '',
    user_id: '',
    action: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [logRes, statsRes, usersRes] = await Promise.all([
        auditAPI.getLog(filters),
        auditAPI.getStats(),
        usersAPI.getAll()
      ]);
      setEntries(logRes.data);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Failed to load audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatFieldName = (field) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'IMPORT': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTableLabel = (tableName) => {
    const labels = {
      'staff_credentials': 'Credential',
      'staff_members': 'Staff',
      'credential_types': 'Credential Type',
      'users': 'User',
      'contacts': 'Contact'
    };
    return labels[tableName] || tableName;
  };

  if (loading) return <div className="text-center py-12">Loading activity log...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Activity Log</h2>
          <p className="text-gray-600 mt-1">Track all changes made to credentials and staff records</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Last 24 Hours</p>
            <p className="text-2xl font-bold text-blue-600">{stats.last_24h}</p>
            <p className="text-xs text-gray-500">changes</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Last 7 Days</p>
            <p className="text-2xl font-bold text-green-600">{stats.last_7d}</p>
            <p className="text-xs text-gray-500">changes</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Active Users</p>
            <p className="text-2xl font-bold text-purple-600">{stats.unique_users}</p>
            <p className="text-xs text-gray-500">made edits</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Entries</p>
            <p className="text-2xl font-bold text-gray-600">{stats.total_entries}</p>
            <p className="text-xs text-gray-500">all time</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
            <select
              value={filters.table_name}
              onChange={(e) => setFilters({ ...filters, table_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="staff_credentials">Credentials</option>
              <option value="staff_members">Staff</option>
              <option value="credential_types">Credential Types</option>
              <option value="users">Users</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
              <option value="IMPORT">Imported</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ table_name: '', user_id: '', action: '' })}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold">Recent Activity ({entries.length} entries)</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {entries.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No activity found matching your filters.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(entry.action)}`}>
                        {entry.action}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {getTableLabel(entry.table_name)}
                      </span>
                      {entry.staff_first_name && (
                        <span className="text-sm text-gray-600">
                          for {entry.staff_first_name} {entry.staff_last_name}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{entry.user_name || entry.username}</span>
                      <span className="text-gray-400 mx-2">•</span>
                      <span>{formatDate(entry.timestamp)}</span>
                    </div>

                    {/* Show what changed */}
                    {entry.changes && entry.changes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {entry.changes.map((change, idx) => (
                          <div key={idx} className="text-sm bg-gray-50 rounded px-3 py-1">
                            <span className="font-medium text-gray-700">{formatFieldName(change.field)}:</span>
                            {change.from !== null && (
                              <>
                                <span className="text-red-600 line-through mx-2">{formatValue(change.from)}</span>
                                <span className="text-gray-400">→</span>
                              </>
                            )}
                            <span className="text-green-600 ml-2">{formatValue(change.to)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Editors (last 30 days) */}
      {stats?.recent_users && stats.recent_users.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Most Active Users (Last 30 Days)</h3>
          <div className="space-y-3">
            {stats.recent_users.map((user, idx) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="font-medium">{user.display_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{user.edit_count} edits</span>
                  <span className="text-xs text-gray-500 block">
                    last: {new Date(user.last_edit).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
