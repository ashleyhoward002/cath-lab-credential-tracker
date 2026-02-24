import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { staffAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AdvancedImportModal from '../components/AdvancedImportModal';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Active');
  const [roleFilter, setRoleFilter] = useState('All');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('All');
  const [showImportModal, setShowImportModal] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { isCoordinator } = useAuth();

  useEffect(() => {
    loadStaff();
  }, [filter]);

  const loadStaff = async () => {
    try {
      const response = await staffAPI.getAll(filter);
      setStaff(response.data);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (member) => {
    setActionLoading(true);
    try {
      await staffAPI.archive(member.id);
      setArchiveConfirm(null);
      loadStaff();
    } catch (error) {
      console.error('Error archiving staff:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (member) => {
    setActionLoading(true);
    try {
      await staffAPI.permanentDelete(member.id);
      setDeleteConfirm(null);
      loadStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter staff based on role and employment type
  const filteredStaff = staff.filter(member => {
    const matchesRole = roleFilter === 'All' || member.role === roleFilter;
    const matchesEmployment = employmentTypeFilter === 'All' || member.employment_type === employmentTypeFilter;
    return matchesRole && matchesEmployment;
  });

  // Get unique roles and employment types from current staff
  const uniqueRoles = ['All', ...new Set(staff.map(s => s.role))];
  const uniqueEmploymentTypes = ['All', ...new Set(staff.map(s => s.employment_type))];

  const getRoleBadgeColor = (role) => {
    const colors = {
      'RN': 'bg-blue-100 text-blue-800',
      'Tech': 'bg-green-100 text-green-800',
      'RT': 'bg-purple-100 text-purple-800',
      'EP Tech': 'bg-indigo-100 text-indigo-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getEmploymentTypeBadge = (type) => {
    const colors = {
      'Permanent': 'bg-gray-100 text-gray-800',
      'Traveler': 'bg-orange-100 text-orange-800',
      'PRN': 'bg-yellow-100 text-yellow-800',
      'Float': 'bg-teal-100 text-teal-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-12">Loading staff...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Staff Members</h2>
        {isCoordinator && (
          <div className="flex space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Import from Excel
            </button>
            <Link
              to="/staff/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add Staff Member
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="space-y-4">
          {/* Status Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('Active')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'Active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('Inactive')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'Inactive'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inactive
              </button>
              <button
                onClick={() => setFilter('Archived')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === 'Archived'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Archived
              </button>
            </div>
          </div>

          {/* Role and Employment Type Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
              <select
                value={employmentTypeFilter}
                onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {uniqueEmploymentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(roleFilter !== 'All' || employmentTypeFilter !== 'All') && (
            <div>
              <button
                onClick={() => {
                  setRoleFilter('All');
                  setEmploymentTypeFilter('All');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employment Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No staff members found matching the selected filters
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-sm text-gray-500">ID: {member.employee_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEmploymentTypeBadge(member.employment_type)}`}>
                      {member.employment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{member.email}</div>
                    <div>{member.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <Link
                        to={`/staff/${member.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      {isCoordinator && member.status !== 'Archived' && (
                        <button
                          onClick={() => setArchiveConfirm(member)}
                          className="text-amber-600 hover:text-amber-900"
                        >
                          Archive
                        </button>
                      )}
                      {isCoordinator && (
                        <button
                          onClick={() => setDeleteConfirm(member)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Archive Confirmation Dialog */}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Archive Staff Member</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to archive <strong>{archiveConfirm.first_name} {archiveConfirm.last_name}</strong>?
              They will no longer appear in active staff lists or trigger credential expiration alerts.
              This can be undone by editing their status back to Active.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setArchiveConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(archiveConfirm)}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Permanently Delete Staff Member</h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to permanently delete <strong>{deleteConfirm.first_name} {deleteConfirm.last_name}</strong>?
            </p>
            <p className="text-red-600 text-sm mb-4">
              This action cannot be undone. All credentials, documents, and records for this staff member will be permanently removed.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(deleteConfirm)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Excel Import Modal */}
      <AdvancedImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={loadStaff}
      />
    </div>
  );
}
