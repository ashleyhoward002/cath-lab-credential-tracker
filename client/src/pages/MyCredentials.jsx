import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffAPI, staffCredentialAPI, documentsAPI } from '../utils/api';

export default function MyCredentials() {
  const { user } = useAuth();
  const [staffMember, setStaffMember] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [editForm, setEditForm] = useState({
    issue_date: '',
    expiration_date: '',
    status: 'Active',
    notes: ''
  });
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.staffMemberId) loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    try {
      const [staffRes, credsRes] = await Promise.all([
        staffAPI.getById(user.staffMemberId),
        staffCredentialAPI.getByStaffId(user.staffMemberId),
      ]);
      setStaffMember(staffRes.data);
      setCredentials(credsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (credentialId, file) => {
    setUploading(credentialId);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('staff_credential_id', credentialId);
    formData.append('staff_id', user.staffMemberId);
    try {
      await documentsAPI.upload(formData);
      loadData();
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(null);
    }
  };

  const openEditModal = (credential) => {
    setEditingCredential(credential);
    setEditForm({
      issue_date: credential.issue_date ? credential.issue_date.split('T')[0] : '',
      expiration_date: credential.expiration_date ? credential.expiration_date.split('T')[0] : '',
      status: credential.status || 'Active',
      notes: credential.notes || ''
    });
    setShowEditModal(true);
    setError('');
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateCredential = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');

    console.log('Updating credential:', editingCredential.id, 'with data:', editForm);

    try {
      const response = await staffCredentialAPI.update(editingCredential.id, editForm);
      console.log('Update response:', response);
      await loadData();
      setShowEditModal(false);
      setEditingCredential(null);
    } catch (err) {
      console.error('Update failed:', err.response?.status, err.response?.data, err.message);
      setError(err.response?.data?.error || 'Failed to update credential');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expiring Soon': return 'bg-yellow-100 text-yellow-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-blue-100 text-blue-800';
      case 'Waived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  if (!user?.staffMemberId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">My Credentials</h2>
        <p className="text-gray-600">Your account is not linked to a staff member record. Please contact your coordinator.</p>
      </div>
    );
  }

  // Group credentials by category
  const grouped = credentials.reduce((acc, cred) => {
    const cat = cred.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cred);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Credentials</h2>

      {/* Staff Info */}
      {staffMember && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{staffMember.first_name} {staffMember.last_name}</span></div>
            <div><span className="text-gray-500">ID:</span> <span className="font-medium">{staffMember.employee_id}</span></div>
            <div><span className="text-gray-500">Role:</span> <span className="font-medium">{staffMember.role}</span></div>
            <div><span className="text-gray-500">Type:</span> <span className="font-medium">{staffMember.employment_type}</span></div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800 text-sm">
          <strong>Tip:</strong> Click "Edit" on any credential to update dates, status, or add notes (e.g., "Registered for renewal class on March 15").
          All changes are tracked and visible to your coordinator.
        </p>
      </div>

      {/* Credentials by Category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No credentials assigned yet.
        </div>
      ) : (
        Object.entries(grouped).map(([category, creds]) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">{category}</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credential</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {creds.map(cred => (
                    <tr key={cred.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{cred.credential_name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(cred.status)}`}>
                          {cred.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatDate(cred.issue_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{formatDate(cred.expiration_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={cred.notes}>
                        {cred.notes || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button
                          onClick={() => openEditModal(cred)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <label className="cursor-pointer text-green-600 hover:text-green-800 font-medium">
                          {uploading === cred.id ? 'Uploading...' : 'Upload'}
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                            disabled={uploading === cred.id}
                            onChange={(e) => e.target.files[0] && handleUpload(cred.id, e.target.files[0])} />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Edit Credential Modal */}
      {showEditModal && editingCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Edit Credential</h3>
              <p className="text-sm text-gray-600 mt-1">{editingCredential.credential_name}</p>
            </div>

            <form onSubmit={handleUpdateCredential} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    name="issue_date"
                    value={editForm.issue_date}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    name="expiration_date"
                    value={editForm.expiration_date}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={editForm.status}
                  onChange={handleEditFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                  <option value="Pending">Pending</option>
                  <option value="Waived">Waived</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditFormChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Registered for renewal class on March 15, 2025"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add notes about renewal plans, class registrations, or other relevant info.
                </p>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCredential(null);
                    setError('');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
