import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { staffAPI, staffCredentialAPI, credentialTypeAPI, documentsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

export default function StaffDetail() {
  const { id } = useParams();
  const { canEditStaff } = useAuth();
  const [staff, setStaff] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [assigningCredential, setAssigningCredential] = useState(false);
  const [updatingCredential, setUpdatingCredential] = useState(false);
  const [error, setError] = useState('');
  const [expandedCredentials, setExpandedCredentials] = useState(new Set());
  const [editingCredential, setEditingCredential] = useState(null);
  const [credentialDocuments, setCredentialDocuments] = useState({});
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadCredentialId, setUploadCredentialId] = useState(null);

  const [assignForm, setAssignForm] = useState({
    credential_type_id: '',
    issue_date: '',
    expiration_date: '',
    status: 'Active',
    notes: ''
  });

  const [editForm, setEditForm] = useState({
    issue_date: '',
    expiration_date: '',
    status: 'Active',
    notes: ''
  });

  useEffect(() => {
    loadStaffData();
    loadCredentialTypes();
  }, [id]);

  const loadStaffData = async () => {
    try {
      const [staffRes, credentialsRes] = await Promise.all([
        staffAPI.getById(id),
        staffCredentialAPI.getByStaffId(id),
      ]);
      setStaff(staffRes.data);
      setCredentials(credentialsRes.data);
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentialTypes = async () => {
    try {
      const response = await credentialTypeAPI.getAll();
      setCredentialTypes(response.data);
    } catch (error) {
      console.error('Error loading credential types:', error);
    }
  };

  const handleAssignFormChange = (e) => {
    const { name, value } = e.target;
    setAssignForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssignCredential = async (e) => {
    e.preventDefault();
    setError('');
    setAssigningCredential(true);

    try {
      await staffCredentialAPI.assign(id, assignForm);
      await loadStaffData(); // Reload to show new credential
      setShowAssignModal(false);
      setAssignForm({
        credential_type_id: '',
        issue_date: '',
        expiration_date: '',
        status: 'Active',
        notes: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign credential');
    } finally {
      setAssigningCredential(false);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openEditModal = (credential) => {
    setEditingCredential(credential);
    setEditForm({
      issue_date: credential.issue_date || '',
      expiration_date: credential.expiration_date || '',
      status: credential.status || 'Active',
      notes: credential.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCredential = async (e) => {
    e.preventDefault();
    setError('');
    setUpdatingCredential(true);

    try {
      await staffCredentialAPI.update(editingCredential.id, editForm);
      await loadStaffData(); // Reload to show updated credential
      setShowEditModal(false);
      setEditingCredential(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update credential');
    } finally {
      setUpdatingCredential(false);
    }
  };

  const toggleCredentialExpansion = async (credentialTypeId) => {
    const newSet = new Set(expandedCredentials);
    if (newSet.has(credentialTypeId)) {
      newSet.delete(credentialTypeId);
    } else {
      newSet.add(credentialTypeId);
      // Load documents for all credentials of this type
      const typeCredentials = credentials.filter(c => c.credential_type_id === parseInt(credentialTypeId));
      for (const cred of typeCredentials) {
        if (!credentialDocuments[cred.id]) {
          await loadDocumentsForCredential(cred.id);
        }
      }
    }
    setExpandedCredentials(newSet);
  };

  const loadDocumentsForCredential = async (credentialId) => {
    try {
      const response = await staffCredentialAPI.getDocuments(credentialId);
      setCredentialDocuments(prev => ({
        ...prev,
        [credentialId]: response.data
      }));
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (e, credentialId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDocument(true);
    setUploadCredentialId(credentialId);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('staff_credential_id', credentialId);
      formData.append('staff_id', id);

      await documentsAPI.upload(formData);
      await loadDocumentsForCredential(credentialId);
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document');
    } finally {
      setUploadingDocument(false);
      setUploadCredentialId(null);
      e.target.value = ''; // Reset file input
    }
  };

  // Group credentials by type
  const groupedCredentials = credentials.reduce((acc, cred) => {
    const typeId = cred.credential_type_id;
    if (!acc[typeId]) {
      acc[typeId] = {
        typeName: cred.credential_name,
        category: cred.category,
        instances: []
      };
    }
    acc[typeId].instances.push(cred);
    return acc;
  }, {});

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-800',
      'Expiring Soon': 'bg-yellow-100 text-yellow-800',
      'Expired': 'bg-red-100 text-red-800',
      'Pending': 'bg-blue-100 text-blue-800',
      'Waived': 'bg-gray-100 text-gray-800',
      'N/A': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-12">Loading staff details...</div>;
  }

  if (!staff) {
    return <div className="text-center py-12">Staff member not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/staff" className="text-gray-600 hover:text-gray-900">
            ← Back to Staff
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            {staff.first_name} {staff.last_name}
          </h2>
        </div>
        {canEditStaff && (
          <Link
            to={`/staff/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Edit Staff
          </Link>
        )}
      </div>

      {/* Staff Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Staff Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Employee ID</p>
            <p className="font-medium">{staff.employee_id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Role</p>
            <p className="font-medium">{staff.role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Employment Type</p>
            <p className="font-medium">{staff.employment_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{staff.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium">{staff.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Hire Date</p>
            <p className="font-medium">
              {staff.hire_date ? new Date(staff.hire_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Credentials</h3>
          {canEditStaff && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              + Assign Credential
            </button>
          )}
        </div>
        <div className="p-6">
          {Object.keys(groupedCredentials).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No credentials assigned yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedCredentials).map(([typeId, { typeName, category, instances }]) => {
                const isExpanded = expandedCredentials.has(typeId);
                const mostRecentInstance = instances.sort((a, b) =>
                  new Date(b.issue_date || 0) - new Date(a.issue_date || 0)
                )[0];

                return (
                  <div key={typeId} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header - Always Visible */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleCredentialExpansion(typeId)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <p className="font-medium">{typeName}</p>
                          {instances.length > 1 && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {instances.length} records
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{category}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-sm text-gray-600">Latest Expiration</p>
                        <p className="font-medium">
                          {mostRecentInstance.expiration_date
                            ? new Date(mostRecentInstance.expiration_date).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(mostRecentInstance.status)}`}>
                          {mostRecentInstance.status}
                        </span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded Details - Show All Instances */}
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                        {instances
                          .sort((a, b) => new Date(b.issue_date || 0) - new Date(a.issue_date || 0))
                          .map((instance, index) => (
                          <div key={instance.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">
                                  Record #{instances.length - index}
                                  {instance.issue_date && ` (${new Date(instance.issue_date).getFullYear()})`}
                                </p>
                                <div className="mt-2 space-y-1 text-sm">
                                  {instance.issue_date && (
                                    <p className="text-gray-600">
                                      <span className="font-medium">Issued:</span> {new Date(instance.issue_date).toLocaleDateString()}
                                    </p>
                                  )}
                                  {instance.expiration_date && (
                                    <p className="text-gray-600">
                                      <span className="font-medium">Expires:</span> {new Date(instance.expiration_date).toLocaleDateString()}
                                    </p>
                                  )}
                                  {instance.notes && (
                                    <p className="text-gray-600">
                                      <span className="font-medium">Notes:</span> {instance.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(instance.status)}`}>
                                  {instance.status}
                                </span>
                                {canEditStaff && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditModal(instance); }}
                                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Documents Section */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">Attached Documents</p>
                                {canEditStaff && (
                                  <label className="cursor-pointer">
                                    <span className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center">
                                      {uploadingDocument && uploadCredentialId === instance.id ? (
                                        'Uploading...'
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                          </svg>
                                          Upload
                                        </>
                                      )}
                                    </span>
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      className="hidden"
                                      onChange={(e) => handleFileUpload(e, instance.id)}
                                      disabled={uploadingDocument}
                                    />
                                  </label>
                                )}
                              </div>

                              {credentialDocuments[instance.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  {credentialDocuments[instance.id].map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                                      <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">{doc.file_name}</p>
                                          <p className="text-xs text-gray-500">
                                            Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                            {doc.uploaded_by_name && ` by ${doc.uploaded_by_name}`}
                                          </p>
                                        </div>
                                      </div>
                                      <a
                                        href={`${API_BASE_URL}${doc.file_path.replace(/\\/g, '/').replace(/^.*uploads/, '/uploads')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                      >
                                        View
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">No documents attached</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assign Credential Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Assign Credential</h3>
            </div>

            <form onSubmit={handleAssignCredential} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credential Type *
                </label>
                <select
                  name="credential_type_id"
                  value={assignForm.credential_type_id}
                  onChange={handleAssignFormChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a credential type</option>
                  {credentialTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} - {type.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    name="issue_date"
                    value={assignForm.issue_date}
                    onChange={handleAssignFormChange}
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
                    value={assignForm.expiration_date}
                    onChange={handleAssignFormChange}
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
                  value={assignForm.status}
                  onChange={handleAssignFormChange}
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
                  value={assignForm.notes}
                  onChange={handleAssignFormChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional notes about this credential"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setError('');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningCredential}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {assigningCredential ? 'Assigning...' : 'Assign Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Credential Modal */}
      {showEditModal && editingCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  placeholder="Optional notes about this credential"
                />
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
                  disabled={updatingCredential}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updatingCredential ? 'Updating...' : 'Update Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
