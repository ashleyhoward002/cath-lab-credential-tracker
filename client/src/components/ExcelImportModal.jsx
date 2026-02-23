import { useState } from 'react';
import { staffAPI } from '../utils/api';

export default function ExcelImportModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState('upload'); // upload, preview, importing, done
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await staffAPI.importPreview(file);
      setPreviewData(response.data);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse Excel file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    setLoading(true);
    setStep('importing');
    setError('');

    try {
      // Only import rows without errors
      const validStaff = previewData.staff.filter(s => s.errors.length === 0);
      const response = await staffAPI.importConfirm(validStaff);
      setImportResults(response.data);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import staff');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setImportResults(null);
    setError('');
    onClose();
    if (importResults?.success > 0) {
      onImportComplete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {step === 'done' ? '✓' : '📊'}
              </span>
              <h2 className="text-xl font-bold">
                {step === 'upload' && 'Import Staff from Excel'}
                {step === 'preview' && 'Review Import Data'}
                {step === 'importing' && 'Importing...'}
                {step === 'done' && 'Import Complete'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white text-2xl leading-none"
            >
              x
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Expected Excel Format</h3>
                <p className="text-blue-800 text-sm mb-3">
                  Your Excel file should have columns for staff information. The following column headers are recognized:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">First Name*:</span> first_name, first name, firstname</div>
                  <div><span className="font-medium">Last Name*:</span> last_name, last name, lastname</div>
                  <div><span className="font-medium">Employee ID:</span> employee_id, emp id</div>
                  <div><span className="font-medium">Email:</span> email</div>
                  <div><span className="font-medium">Phone:</span> phone, telephone</div>
                  <div><span className="font-medium">Role:</span> role, position (RN, Tech, RT, EP Tech)</div>
                  <div><span className="font-medium">Employment Type:</span> employment_type (Permanent, Traveler, PRN, Float)</div>
                  <div><span className="font-medium">Hire Date:</span> hire_date, hire date</div>
                </div>
                <p className="text-blue-700 text-xs mt-3">* Required fields</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <div className="text-5xl mb-4">📁</div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {file ? file.name : 'Click to select Excel file'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .xlsx and .xls files up to 5MB
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && previewData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{previewData.total}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{previewData.valid}</div>
                  <div className="text-sm text-gray-600">Ready to Import</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{previewData.withWarnings}</div>
                  <div className="text-sm text-gray-600">With Warnings</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{previewData.withErrors}</div>
                  <div className="text-sm text-gray-600">With Errors</div>
                </div>
              </div>

              {/* Data Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.staff.map((staff, index) => (
                        <tr key={index} className={staff.errors.length > 0 ? 'bg-red-50' : staff.warnings.length > 0 ? 'bg-yellow-50' : ''}>
                          <td className="px-3 py-2 text-sm text-gray-500">{staff.row_number}</td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">
                            {staff.first_name} {staff.last_name}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500">{staff.employee_id || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{staff.role || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{staff.employment_type}</td>
                          <td className="px-3 py-2 text-sm">
                            {staff.errors.length > 0 ? (
                              <span className="text-red-600" title={staff.errors.join(', ')}>
                                Error: {staff.errors[0]}
                              </span>
                            ) : staff.warnings.length > 0 ? (
                              <span className="text-yellow-600" title={staff.warnings.join(', ')}>
                                Warning: {staff.warnings[0]}
                              </span>
                            ) : (
                              <span className="text-green-600">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {previewData.withErrors > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> {previewData.withErrors} row(s) have errors and will be skipped during import.
                    Only {previewData.valid} valid row(s) will be imported.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 animate-pulse">⏳</div>
              <p className="text-lg text-gray-700">Importing staff members...</p>
            </div>
          )}

          {/* Done Step */}
          {step === 'done' && importResults && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {importResults.failed === 0 ? '✓' : '⚠️'}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Import {importResults.failed === 0 ? 'Successful' : 'Completed with Errors'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{importResults.success}</div>
                  <div className="text-sm text-gray-600">Imported</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{importResults.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {importResults.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
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
            {step === 'preview' && `${previewData?.valid || 0} staff members ready to import`}
          </div>

          <div className="flex space-x-3">
            {step === 'upload' && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Upload & Preview'}
                </button>
              </>
            )}

            {step === 'preview' && (
              <>
                <button
                  onClick={() => {
                    setStep('upload');
                    setPreviewData(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={previewData?.valid === 0 || loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import {previewData?.valid || 0} Staff Members
                </button>
              </>
            )}

            {step === 'done' && (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
