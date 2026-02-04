import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { staffAPI, staffCredentialAPI, documentsAPI } from '../utils/api';

export default function MyCredentials() {
  const { user } = useAuth();
  const [staffMember, setStaffMember] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Upload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {creds.map(cred => (
                    <tr key={cred.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{cred.credential_name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(cred.status)}`}>
                          {cred.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{cred.issue_date || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{cred.expiration_date || '—'}</td>
                      <td className="px-6 py-4 text-sm">
                        <label className="cursor-pointer text-blue-600 hover:text-blue-800">
                          {uploading === cred.id ? 'Uploading...' : 'Upload Doc'}
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
    </div>
  );
}
