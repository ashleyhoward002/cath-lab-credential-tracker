import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { staffAPI, staffCredentialAPI, credentialTypeAPI } from '../utils/api';

export default function Reports() {
  const [allStaff, setAllStaff] = useState([]);
  const [allCredentials, setAllCredentials] = useState([]);
  const [credentialTypes, setCredentialTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [credentialTypeFilter, setCredentialTypeFilter] = useState('All');
  const [reportType, setReportType] = useState('credentials');
  const [ceuDateFrom, setCeuDateFrom] = useState('');
  const [ceuDateTo, setCeuDateTo] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [staffRes, credTypesRes] = await Promise.all([
        staffAPI.getAll('Active'),
        credentialTypeAPI.getAll(),
      ]);

      setAllStaff(staffRes.data);
      setCredentialTypes(credTypesRes.data);

      // Load credentials for all staff
      const credentialPromises = staffRes.data.map(staff =>
        staffCredentialAPI.getByStaffId(staff.id)
      );
      const credentialResults = await Promise.all(credentialPromises);

      // Flatten and combine with staff info
      const allCreds = credentialResults.flatMap((result, index) =>
        result.data.map(cred => ({
          ...cred,
          staff_first_name: staffRes.data[index].first_name,
          staff_last_name: staffRes.data[index].last_name,
          staff_employee_id: staffRes.data[index].employee_id,
          staff_role: staffRes.data[index].role,
          staff_id: staffRes.data[index].id,
        }))
      );

      setAllCredentials(allCreds);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter credentials based on selected filters
  const filteredCredentials = allCredentials.filter(cred => {
    const matchesStatus = statusFilter === 'All' || cred.status === statusFilter;
    const matchesRole = roleFilter === 'All' || cred.staff_role === roleFilter;
    const matchesType = credentialTypeFilter === 'All' || cred.credential_type_id === parseInt(credentialTypeFilter);
    return matchesStatus && matchesRole && matchesType;
  });

  // Get unique roles
  const uniqueRoles = ['All', ...new Set(allStaff.map(s => s.role))];

  // Find staff missing required credentials
  const getMissingCredentials = () => {
    const requiredCreds = credentialTypes.filter(ct => ct.is_required);
    const missing = [];

    allStaff.forEach(staff => {
      const staffCreds = allCredentials.filter(c => c.staff_id === staff.id);

      requiredCreds.forEach(reqCred => {
        // Check if required for this role
        if (reqCred.required_for === 'All' || reqCred.required_for === staff.role) {
          const hasCredential = staffCreds.some(c =>
            c.credential_type_id === reqCred.id &&
            (c.status === 'Active' || c.status === 'Expiring Soon')
          );

          if (!hasCredential) {
            missing.push({
              staff_id: staff.id,
              staff_name: `${staff.first_name} ${staff.last_name}`,
              staff_employee_id: staff.employee_id,
              staff_role: staff.role,
              missing_credential: reqCred.name,
              credential_category: reqCred.category,
            });
          }
        }
      });
    });

    // Apply role filter
    return roleFilter === 'All'
      ? missing
      : missing.filter(m => m.staff_role === roleFilter);
  };

  // Calculate CEU totals for all staff
  const getCEUSummary = () => {
    const ceuTypes = credentialTypes.filter(ct => ct.category === 'CEU');

    const summary = allStaff.map(staff => {
      const staffCreds = allCredentials.filter(c => c.staff_id === staff.id);

      // Filter CEU credentials by date range if specified
      let staffCEUs = staffCreds.filter(c => {
        const isCEU = ceuTypes.some(ct => ct.id === c.credential_type_id);
        if (!isCEU) return false;

        // Apply date filter if specified
        if (ceuDateFrom && c.issue_date) {
          if (new Date(c.issue_date) < new Date(ceuDateFrom)) return false;
        }
        if (ceuDateTo && c.issue_date) {
          if (new Date(c.issue_date) > new Date(ceuDateTo)) return false;
        }
        return true;
      });

      // Calculate total hours - look up ceu_requirement from credential type
      let totalHours = 0;
      const ceuDetails = [];

      staffCEUs.forEach(cred => {
        const credType = ceuTypes.find(ct => ct.id === cred.credential_type_id);
        if (credType) {
          const hours = credType.ceu_requirement || 0;
          totalHours += hours;
          ceuDetails.push({
            name: cred.credential_name,
            hours: hours,
            date: cred.issue_date,
            status: cred.status
          });
        }
      });

      return {
        staff_id: staff.id,
        staff_name: `${staff.first_name} ${staff.last_name}`,
        staff_employee_id: staff.employee_id,
        staff_role: staff.role,
        total_hours: totalHours,
        ceu_count: staffCEUs.length,
        ceu_details: ceuDetails
      };
    });

    // Apply role filter and sort by total hours descending
    const filtered = roleFilter === 'All'
      ? summary
      : summary.filter(s => s.staff_role === roleFilter);

    return filtered.sort((a, b) => b.total_hours - a.total_hours);
  };

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

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = '';

    if (reportType === 'credentials') {
      csvContent = 'Employee ID,Name,Role,Credential,Category,Status,Issue Date,Expiration Date\n';
      filteredCredentials.forEach(cred => {
        csvContent += `${cred.staff_employee_id},"${cred.staff_first_name} ${cred.staff_last_name}",${cred.staff_role},${cred.credential_name},${cred.category},${cred.status},${cred.issue_date || ''},${cred.expiration_date || ''}\n`;
      });
    } else if (reportType === 'missing') {
      const missingCreds = getMissingCredentials();
      csvContent = 'Employee ID,Name,Role,Missing Credential,Category\n';
      missingCreds.forEach(item => {
        csvContent += `${item.staff_employee_id},"${item.staff_name}",${item.staff_role},${item.missing_credential},${item.credential_category}\n`;
      });
    } else if (reportType === 'ceu') {
      const ceuSummary = getCEUSummary();
      csvContent = 'Employee ID,Name,Role,CEU Courses,Total Hours,CEU Details\n';
      ceuSummary.forEach(item => {
        const details = item.ceu_details.map(c => `${c.name} (${c.hours}hrs)`).join('; ');
        csvContent += `${item.staff_employee_id},"${item.staff_name}",${item.staff_role},${item.ceu_count},${item.total_hours},"${details}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="text-center py-12">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Reports</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Export to CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
        <div className="flex space-x-4">
          <button
            onClick={() => setReportType('credentials')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'credentials'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Credential Status Report
          </button>
          <button
            onClick={() => setReportType('missing')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'missing'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Missing Credentials Report
          </button>
          <button
            onClick={() => setReportType('ceu')}
            className={`px-4 py-2 rounded-lg font-medium ${
              reportType === 'ceu'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            CEU Summary Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-3 gap-4">
          {reportType === 'credentials' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
                <option value="Pending">Pending</option>
                <option value="Waived">Waived</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
          )}

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

          {reportType === 'credentials' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credential Type</label>
              <select
                value={credentialTypeFilter}
                onChange={(e) => setCredentialTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="All">All Types</option>
                {credentialTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'ceu' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                <input
                  type="date"
                  value={ceuDateFrom}
                  onChange={(e) => setCeuDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                <input
                  type="date"
                  value={ceuDateTo}
                  onChange={(e) => setCeuDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>

        {(statusFilter !== 'All' || roleFilter !== 'All' || credentialTypeFilter !== 'All' || ceuDateFrom || ceuDateTo) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setStatusFilter('All');
                setRoleFilter('All');
                setCredentialTypeFilter('All');
                setCeuDateFrom('');
                setCeuDateTo('');
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {reportType === 'credentials' && 'Credential Status Report'}
            {reportType === 'missing' && 'Missing Required Credentials'}
            {reportType === 'ceu' && 'CEU Summary Report'}
            <span className="ml-2 text-sm text-gray-600">
              ({reportType === 'credentials' && `${filteredCredentials.length} records`}
              {reportType === 'missing' && `${getMissingCredentials().length} records`}
              {reportType === 'ceu' && `${getCEUSummary().length} staff members`})
            </span>
          </h3>
          {reportType === 'ceu' && (
            <p className="text-sm text-gray-500 mt-1">
              Total CEU Hours: {getCEUSummary().reduce((sum, s) => sum + s.total_hours, 0)} hours across all staff
            </p>
          )}
        </div>

        {reportType === 'credentials' ? (
          <div className="overflow-x-auto">
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
                    Credential
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiration
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
                {filteredCredentials.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No credentials found matching the selected filters
                    </td>
                  </tr>
                ) : (
                  filteredCredentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {cred.staff_first_name} {cred.staff_last_name}
                        </div>
                        <div className="text-sm text-gray-500">ID: {cred.staff_employee_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cred.staff_role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{cred.credential_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cred.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cred.expiration_date ? new Date(cred.expiration_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(cred.status)}`}>
                          {cred.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/staff/${cred.staff_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Staff
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                    Missing Credential
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getMissingCredentials().length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      All staff have their required credentials!
                    </td>
                  </tr>
                ) : (
                  getMissingCredentials().map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.staff_name}</div>
                        <div className="text-sm text-gray-500">ID: {item.staff_employee_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.staff_role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-red-600">{item.missing_credential}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.credential_category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/staff/${item.staff_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Assign Credential
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'ceu' && (
          <div className="overflow-x-auto">
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
                    CEU Courses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCEUSummary().length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No CEU records found
                    </td>
                  </tr>
                ) : (
                  getCEUSummary().map((item) => (
                    <tr key={item.staff_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.staff_name}</div>
                        <div className="text-sm text-gray-500">ID: {item.staff_employee_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.staff_role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                          {item.ceu_count} courses
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-lg font-bold ${item.total_hours > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {item.total_hours} hrs
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.ceu_details.length > 0 ? (
                          <div className="text-sm text-gray-600 max-w-xs">
                            {item.ceu_details.slice(0, 3).map((ceu, idx) => (
                              <div key={idx} className="truncate">
                                {ceu.name} ({ceu.hours}hrs)
                              </div>
                            ))}
                            {item.ceu_details.length > 3 && (
                              <div className="text-gray-400">
                                +{item.ceu_details.length - 3} more...
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No CEUs</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/staff/${item.staff_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Staff
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
