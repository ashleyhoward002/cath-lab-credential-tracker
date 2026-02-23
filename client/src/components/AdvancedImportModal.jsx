import { useState, useEffect } from 'react';
import { importAPI, credentialTypeAPI } from '../utils/api';

const STEPS = ['upload', 'mapping', 'preview', 'importing', 'done'];

export default function AdvancedImportModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [mapping, setMapping] = useState({
    nameColumn: 0,
    contactColumn: 1,
    licenseNumColumn: null,
    credentials: {},    // { columnIndex: credentialTypeId }
    competencies: {}    // { columnIndex: credentialTypeId }
  });
  const [previewData, setPreviewData] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [newTypeData, setNewTypeData] = useState({ name: '', category: 'Certification', isExpiring: true, forColumn: null });

  useEffect(() => {
    if (isOpen) {
      loadCredentialTypes();
    }
  }, [isOpen]);

  const loadCredentialTypes = async () => {
    try {
      const res = await credentialTypeAPI.getAll();
      setCredentialTypes(res.data);
    } catch (err) {
      console.error('Error loading credential types:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await importAPI.analyze(file);
      setAnalysis(res.data);
      // Initialize mapping with detected columns
      const newMapping = { ...mapping };
      res.data.columnAnalysis.forEach((col, idx) => {
        if (col.classification) {
          if (col.classification.isExpiring) {
            // Try to find matching credential type
            const match = res.data.existingCredentialTypes.find(
              ct => ct.name.toLowerCase().includes(col.classification.suggestedName.toLowerCase()) ||
                    col.classification.suggestedName.toLowerCase().includes(ct.name.toLowerCase())
            );
            if (match) {
              newMapping.credentials[idx] = match.id;
            }
          } else {
            // Competency - try to find match
            const match = res.data.existingCredentialTypes.find(
              ct => ct.name.toLowerCase().includes(col.header.toLowerCase()) ||
                    col.header.toLowerCase().includes(ct.name.toLowerCase())
            );
            if (match) {
              newMapping.competencies[idx] = match.id;
            }
          }
        }
      });
      setMapping(newMapping);
      setStep('mapping');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze file');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await importAPI.preview(file, mapping);
      setPreviewData(res.data);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setStep('importing');
    setError('');
    try {
      const res = await importAPI.confirm(previewData.staff);
      setImportResults(res.data);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCredentialType = async () => {
    try {
      const res = await importAPI.createCredentialType(newTypeData);
      setCredentialTypes([...credentialTypes, res.data]);
      // Assign to the column
      if (newTypeData.forColumn !== null) {
        if (newTypeData.isExpiring) {
          setMapping(prev => ({
            ...prev,
            credentials: { ...prev.credentials, [newTypeData.forColumn]: res.data.id }
          }));
        } else {
          setMapping(prev => ({
            ...prev,
            competencies: { ...prev.competencies, [newTypeData.forColumn]: res.data.id }
          }));
        }
      }
      setShowCreateTypeModal(false);
      setNewTypeData({ name: '', category: 'Certification', isExpiring: true, forColumn: null });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create credential type');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setAnalysis(null);
    setPreviewData(null);
    setImportResults(null);
    setMapping({ nameColumn: 0, contactColumn: 1, licenseNumColumn: null, credentials: {}, competencies: {} });
    setError('');
    onClose();
    if (importResults?.staffCreated > 0) {
      onImportComplete();
    }
  };

  const openCreateTypeModal = (columnIndex, suggestedName, isExpiring) => {
    setNewTypeData({
      name: suggestedName,
      category: isExpiring ? 'Certification' : 'Competency',
      isExpiring,
      forColumn: columnIndex
    });
    setShowCreateTypeModal(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{step === 'done' ? '✓' : '📊'}</span>
              <div>
                <h2 className="text-xl font-bold">Import Staff & Credentials</h2>
                <p className="text-indigo-200 text-sm">
                  {step === 'upload' && 'Upload your Excel file'}
                  {step === 'mapping' && 'Map columns to credential types'}
                  {step === 'preview' && 'Review before importing'}
                  {step === 'importing' && 'Importing data...'}
                  {step === 'done' && 'Import complete'}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-white/70 hover:text-white text-2xl">x</button>
          </div>
          {/* Progress Steps */}
          <div className="flex mt-4 space-x-2">
            {['Upload', 'Map Columns', 'Preview', 'Done'].map((label, idx) => {
              const stepIdx = STEPS.indexOf(step);
              const isActive = idx <= stepIdx;
              const isCurrent = idx === stepIdx || (step === 'importing' && idx === 2);
              return (
                <div key={label} className="flex-1">
                  <div className={`h-1 rounded ${isActive ? 'bg-white' : 'bg-indigo-400'}`} />
                  <p className={`text-xs mt-1 ${isCurrent ? 'text-white font-medium' : 'text-indigo-300'}`}>{label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
          )}

          {/* UPLOAD STEP */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Expected Format</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>- Role group headers (RCIS, RN, Miscellaneous) to auto-assign staff roles</li>
                  <li>- Staff rows with Name, Contact Info, License Number</li>
                  <li>- Credential columns with expiration dates (License, ACLS, BLS)</li>
                  <li>- Competency columns with completion dates (Angiojet, Impella, etc.)</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload-adv"
                />
                <label htmlFor="excel-upload-adv" className="cursor-pointer flex flex-col items-center">
                  <div className="text-5xl mb-4">📁</div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {file ? file.name : 'Click to select Excel file'}
                  </p>
                  <p className="text-sm text-gray-500">Supports .xlsx and .xls files</p>
                </label>
              </div>
            </div>
          )}

          {/* MAPPING STEP */}
          {step === 'mapping' && analysis && (
            <div className="space-y-6">
              {/* Role Groups Detected */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">Detected Role Groups</h3>
                <div className="flex space-x-4">
                  {Object.entries(analysis.roleGroups).map(([role, info]) => (
                    <div key={role} className="bg-white rounded px-3 py-2 border border-green-200">
                      <span className="font-medium">{role}</span>
                      <span className="text-green-700 ml-2">{info.count} staff</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column Mapping */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Map Credential Columns</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select which credential type each column should be imported as. Credentials with expiration dates need renewal tracking.
                </p>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sample Data</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Map To</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysis.columnAnalysis.slice(3).map((col) => {
                        if (!col.hasData) return null;
                        const isExpiring = col.classification?.isExpiring ?? false;
                        const mappedId = isExpiring ? mapping.credentials[col.index] : mapping.competencies[col.index];
                        const mappingKey = isExpiring ? 'credentials' : 'competencies';

                        return (
                          <tr key={col.index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{col.header}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isExpiring ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {isExpiring ? 'Expiring' : 'Competency'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {col.sampleValues.slice(0, 2).join(', ')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <select
                                  value={mappedId || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setMapping(prev => ({
                                      ...prev,
                                      [mappingKey]: val
                                        ? { ...prev[mappingKey], [col.index]: parseInt(val) }
                                        : Object.fromEntries(Object.entries(prev[mappingKey]).filter(([k]) => k !== String(col.index)))
                                    }));
                                  }}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                                >
                                  <option value="">-- Skip --</option>
                                  {credentialTypes
                                    .filter(ct => isExpiring ? ct.renewal_period_months > 0 : !ct.renewal_period_months)
                                    .map(ct => (
                                      <option key={ct.id} value={ct.id}>{ct.name}</option>
                                    ))
                                  }
                                </select>
                                <button
                                  onClick={() => openCreateTypeModal(col.index, col.classification?.suggestedName || col.header, isExpiring)}
                                  className="text-indigo-600 hover:text-indigo-800 text-sm whitespace-nowrap"
                                >
                                  + New
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && previewData && (
            <div className="space-y-6">
              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{previewData.stats.totalStaff}</div>
                  <div className="text-sm text-gray-600">Staff Members</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{previewData.stats.totalCredentials}</div>
                  <div className="text-sm text-gray-600">Credentials (Expiring)</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{previewData.stats.totalCompetencies}</div>
                  <div className="text-sm text-gray-600">Competencies (One-time)</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{previewData.stats.parseErrors}</div>
                  <div className="text-sm text-gray-600">Parse Warnings</div>
                </div>
              </div>

              {/* Warnings */}
              {previewData.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">Parsing Warnings ({previewData.warnings.length})</h3>
                  <div className="max-h-32 overflow-y-auto text-sm text-yellow-800 space-y-1">
                    {previewData.warnings.slice(0, 10).map((w, i) => (
                      <div key={i}>Row {w.row} ({w.name}): {w.warnings.join('; ')}</div>
                    ))}
                    {previewData.warnings.length > 10 && (
                      <div className="text-yellow-600">...and {previewData.warnings.length - 10} more</div>
                    )}
                  </div>
                </div>
              )}

              {/* Staff Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-72 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Credentials</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Competencies</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.staff.map((s, i) => (
                        <tr key={i} className={s.warnings?.length > 0 ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{s.fullName}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{s.role}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{s.contact || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{s.credentials?.length || 0}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{s.competencies?.length || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* IMPORTING STEP */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 animate-spin">⏳</div>
              <p className="text-lg text-gray-700">Importing staff and credentials...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
            </div>
          )}

          {/* DONE STEP */}
          {step === 'done' && importResults && (
            <div className="space-y-6 text-center">
              <div className="text-6xl mb-4">{importResults.errors?.length === 0 ? '✓' : '⚠️'}</div>
              <h3 className="text-xl font-bold text-gray-900">Import Complete</h3>

              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{importResults.staffCreated}</div>
                  <div className="text-sm text-gray-600">Staff Created</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{importResults.credentialsAssigned}</div>
                  <div className="text-sm text-gray-600">Credentials</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{importResults.competenciesAssigned}</div>
                  <div className="text-sm text-gray-600">Competencies</div>
                </div>
              </div>

              {importResults.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left max-w-lg mx-auto">
                  <h4 className="font-medium text-red-900 mb-2">Errors ({importResults.errors.length})</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importResults.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>{e.staff}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-500">
            {step === 'upload' && file && `Selected: ${file.name}`}
            {step === 'mapping' && `${Object.keys(mapping.credentials).length + Object.keys(mapping.competencies).length} columns mapped`}
            {step === 'preview' && `Ready to import ${previewData?.stats.totalStaff} staff members`}
          </div>
          <div className="flex space-x-3">
            {step === 'upload' && (
              <>
                <button onClick={handleClose} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Cancel</button>
                <button
                  onClick={handleAnalyze}
                  disabled={!file || loading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Analyze File'}
                </button>
              </>
            )}
            {step === 'mapping' && (
              <>
                <button onClick={() => setStep('upload')} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Back</button>
                <button
                  onClick={handlePreview}
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Preview Import'}
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('mapping')} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">Back</button>
                <button
                  onClick={handleImport}
                  disabled={loading || previewData?.stats.totalStaff === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  Import {previewData?.stats.totalStaff} Staff
                </button>
              </>
            )}
            {step === 'done' && (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create Credential Type Modal */}
      {showCreateTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Credential Type</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newTypeData.name}
                  onChange={(e) => setNewTypeData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTypeData.category}
                  onChange={(e) => setNewTypeData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Certification">Certification</option>
                  <option value="License">License</option>
                  <option value="Competency">Competency</option>
                  <option value="Training">Training</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isExpiring"
                  checked={newTypeData.isExpiring}
                  onChange={(e) => setNewTypeData(prev => ({ ...prev, isExpiring: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 rounded"
                />
                <label htmlFor="isExpiring" className="ml-2 text-sm text-gray-700">
                  Requires renewal (has expiration date)
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateTypeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCredentialType}
                disabled={!newTypeData.name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
