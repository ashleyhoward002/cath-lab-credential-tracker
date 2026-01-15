import { useState, useEffect } from 'react';
import { credentialTypeAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function CredentialTypes() {
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { isCoordinator } = useAuth();

  const [newCredentialForm, setNewCredentialForm] = useState({
    name: '',
    category: 'Certification',
    issuing_body: '',
    renewal_period_months: '',
    ceu_requirement: 0,
    required_for: 'All',
    is_required: true,
    description: ''
  });

  useEffect(() => {
    loadCredentialTypes();
  }, []);

  const loadCredentialTypes = async () => {
    try {
      const response = await credentialTypeAPI.getAll();
      setCredentialTypes(response.data);
    } catch (error) {
      console.error('Error loading credential types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCredentialForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateCredential = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      await credentialTypeAPI.create(newCredentialForm);
      await loadCredentialTypes();
      setShowAddModal(false);
      setNewCredentialForm({
        name: '',
        category: 'Certification',
        issuing_body: '',
        renewal_period_months: '',
        ceu_requirement: 0,
        required_for: 'All',
        is_required: true,
        description: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create credential type');
    } finally {
      setCreating(false);
    }
  };

  const filteredTypes = filter === 'All'
    ? credentialTypes
    : credentialTypes.filter(ct => ct.category === filter);

  const getCategoryColor = (category) => {
    const colors = {
      'License': 'bg-blue-100 text-blue-800',
      'Certification': 'bg-green-100 text-green-800',
      'Competency': 'bg-purple-100 text-purple-800',
      'CEU': 'bg-yellow-100 text-yellow-800',
      'Other': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-12">Loading credential types...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Credential Types</h2>
        {isCoordinator && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Credential Type
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          {['All', 'License', 'Certification', 'Competency', 'Other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Credential Types List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTypes.map((credType) => (
          <div key={credType.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{credType.name}</h3>
                <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(credType.category)}`}>
                  {credType.category}
                </span>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 text-sm">
              {credType.issuing_body && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Issuing Body:</span>
                  <span className="font-medium">{credType.issuing_body}</span>
                </div>
              )}
              {credType.renewal_period_months && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Renewal Period:</span>
                  <span className="font-medium">{credType.renewal_period_months} months</span>
                </div>
              )}
              {credType.ceu_requirement > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CEU Required:</span>
                  <span className="font-medium">{credType.ceu_requirement} hours</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Required For:</span>
                <span className="font-medium">{credType.required_for}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Required:</span>
                <span className="font-medium">{credType.is_required ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTypes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No credential types found in this category
        </div>
      )}

      {/* Add Credential Type Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Add New Credential Type</h3>
            </div>

            <form onSubmit={handleCreateCredential} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={newCredentialForm.name}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g., BLS, ACLS, RN License"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={newCredentialForm.category}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="License">License</option>
                    <option value="Certification">Certification</option>
                    <option value="Competency">Competency</option>
                    <option value="CEU">CEU</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required For *
                  </label>
                  <select
                    name="required_for"
                    value={newCredentialForm.required_for}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="All">All Staff</option>
                    <option value="RN">RN</option>
                    <option value="RCIS">RCIS</option>
                    <option value="Tech">Tech</option>
                    <option value="RT">RT</option>
                    <option value="EP Tech">EP Tech</option>
                    <option value="APP">APP</option>
                    <option value="NP">NP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issuing Body
                </label>
                <input
                  type="text"
                  name="issuing_body"
                  value={newCredentialForm.issuing_body}
                  onChange={handleFormChange}
                  placeholder="e.g., American Heart Association, State Board"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Renewal Period (months)
                  </label>
                  <input
                    type="number"
                    name="renewal_period_months"
                    value={newCredentialForm.renewal_period_months}
                    onChange={handleFormChange}
                    placeholder="e.g., 24"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEU Requirement (hours)
                  </label>
                  <input
                    type="number"
                    name="ceu_requirement"
                    value={newCredentialForm.ceu_requirement}
                    onChange={handleFormChange}
                    placeholder="e.g., 0"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="is_required"
                    checked={newCredentialForm.is_required}
                    onChange={handleFormChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    This credential is required
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={newCredentialForm.description}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Optional description or notes about this credential type"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Credential Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
