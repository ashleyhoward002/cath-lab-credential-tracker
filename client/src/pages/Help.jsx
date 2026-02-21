import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Help() {
  const { user, isCoordinator, isManager, isStaff } = useAuth();
  const [expandedSection, setExpandedSection] = useState('getting-started');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const Section = ({ id, title, icon, children }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <span className="text-gray-400 text-xl">
          {expandedSection === id ? '−' : '+'}
        </span>
      </button>
      {expandedSection === id && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
          <p className="mt-1 text-gray-600">Everything you need to know to manage credentials effectively</p>
        </div>
      </div>

      {/* Quick Start Workflow - Visual */}
      {isCoordinator && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h2 className="text-xl font-bold mb-4">Quick Start Workflow</h2>
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl mb-2">1</div>
              <span className="font-semibold">Credential Types</span>
              <span className="text-sm text-blue-100">Define what to track</span>
            </div>
            <div className="hidden md:block text-3xl">→</div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl mb-2">2</div>
              <span className="font-semibold">Add Staff</span>
              <span className="text-sm text-blue-100">Enter team members</span>
            </div>
            <div className="hidden md:block text-3xl">→</div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl mb-2">3</div>
              <span className="font-semibold">Assign Credentials</span>
              <span className="text-sm text-blue-100">Link to staff</span>
            </div>
            <div className="hidden md:block text-3xl">→</div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl mb-2">4</div>
              <span className="font-semibold">Create Users</span>
              <span className="text-sm text-blue-100">Optional: give access</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Getting Started */}
        <Section id="getting-started" title="Getting Started" icon="🚀">
          <div className="mt-4 space-y-4">
            {isCoordinator && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Step 1: Set Up Credential Types</h3>
                  <p className="text-blue-800 text-sm mb-3">
                    Before adding staff or tracking credentials, you need to define what credentials your department tracks.
                    Go to <Link to="/credential-types" className="underline font-medium">Credential Types</Link> and add items like:
                  </p>
                  <ul className="text-blue-800 text-sm list-disc list-inside space-y-1">
                    <li>BLS Certification (expires every 2 years)</li>
                    <li>ACLS Certification</li>
                    <li>State License</li>
                    <li>Annual Competencies</li>
                    <li>RCIS Certification</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">Step 2: Add Staff Members</h3>
                  <p className="text-green-800 text-sm mb-3">
                    Once credential types exist, add your team. Go to <Link to="/staff" className="underline font-medium">Staff</Link> → <Link to="/staff/new" className="underline font-medium">Add New Staff</Link>.
                  </p>
                  <ul className="text-green-800 text-sm list-disc list-inside space-y-1">
                    <li>Enter employee details (name, email, role)</li>
                    <li>For travelers/contractors, add agency info and contract dates</li>
                    <li>The system supports FTE, PRN, Traveler, and Contract types</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Step 3: Assign Credentials to Staff</h3>
                  <p className="text-purple-800 text-sm mb-3">
                    Click on any staff member to view their detail page, then assign credentials:
                  </p>
                  <ul className="text-purple-800 text-sm list-disc list-inside space-y-1">
                    <li>Select which credential types apply to them</li>
                    <li>Enter expiration dates</li>
                    <li>Upload supporting documents (certificates, licenses)</li>
                    <li>The dashboard will show expiring/expired items automatically</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">Step 4: Create User Accounts (Optional)</h3>
                  <p className="text-amber-800 text-sm mb-3">
                    Want staff to view their own credentials? Go to <Link to="/users" className="underline font-medium">Users</Link> → Add User.
                  </p>
                  <ul className="text-amber-800 text-sm list-disc list-inside space-y-1">
                    <li><strong>Coordinator</strong> — Full access to everything (like you)</li>
                    <li><strong>Manager</strong> — Can view and edit staff/credentials, but can't manage users or credential types</li>
                    <li><strong>Staff</strong> — Can only view their own credentials (must be linked to a staff member)</li>
                  </ul>
                </div>
              </>
            )}

            {isManager && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Manager Quick Start</h3>
                <p className="text-blue-800 text-sm">
                  As a manager, you can view the dashboard, manage staff details, assign credentials, and run reports.
                  You cannot add credential types or manage user accounts — contact your coordinator for those tasks.
                </p>
              </div>
            )}

            {isStaff && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Staff Quick Start</h3>
                <p className="text-blue-800 text-sm">
                  Your <Link to="/my-credentials" className="underline font-medium">My Credentials</Link> page shows all credentials assigned to you.
                  You can view expiration dates and upload documents. Contact your coordinator if something needs to be updated.
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* Dashboard */}
        {(isCoordinator || isManager) && (
          <Section id="dashboard" title="Understanding the Dashboard" icon="📊">
            <div className="mt-4 space-y-4">
              <p className="text-gray-700">
                The dashboard gives you an at-a-glance view of your department's credential status:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900">Expired</h4>
                  <p className="text-red-800 text-sm">Credentials past their expiration date. Needs immediate attention!</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900">Expiring Soon</h4>
                  <p className="text-amber-800 text-sm">Credentials expiring within the next 30 days. Plan renewals now.</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900">Current</h4>
                  <p className="text-green-800 text-sm">Valid credentials with more than 30 days until expiration.</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900">Pending</h4>
                  <p className="text-gray-700 text-sm">Credentials assigned but waiting for dates or documentation.</p>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Managing Staff */}
        {(isCoordinator || isManager) && (
          <Section id="staff" title="Managing Staff" icon="👥">
            <div className="mt-4 space-y-4">
              <p className="text-gray-700">
                The Staff page lists all team members. Click on any name to view their full profile and credentials.
              </p>

              <h4 className="font-semibold text-gray-900">Employment Types</h4>
              <ul className="text-gray-700 text-sm list-disc list-inside space-y-1">
                <li><strong>FTE</strong> — Full-time employees</li>
                <li><strong>PRN</strong> — As-needed/per diem staff</li>
                <li><strong>Traveler</strong> — Travel nurses/techs (tracks agency info + contract dates)</li>
                <li><strong>Contract</strong> — Contract workers</li>
              </ul>

              <h4 className="font-semibold text-gray-900 mt-4">Staff Status</h4>
              <ul className="text-gray-700 text-sm list-disc list-inside space-y-1">
                <li><strong>Active</strong> — Currently working, credentials are tracked</li>
                <li><strong>Inactive</strong> — On leave or temporarily unavailable</li>
                <li><strong>Archived</strong> — No longer with department (hidden by default)</li>
              </ul>
            </div>
          </Section>
        )}

        {/* Credential Types */}
        {isCoordinator && (
          <Section id="credential-types" title="Credential Types" icon="📋">
            <div className="mt-4 space-y-4">
              <p className="text-gray-700">
                Credential types define what your department tracks. Set these up first before adding staff.
              </p>

              <h4 className="font-semibold text-gray-900">Common Credential Types</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 p-2 rounded">BLS Certification</div>
                <div className="bg-gray-50 p-2 rounded">ACLS Certification</div>
                <div className="bg-gray-50 p-2 rounded">State License (RN, RT, etc.)</div>
                <div className="bg-gray-50 p-2 rounded">RCIS / RCES Certification</div>
                <div className="bg-gray-50 p-2 rounded">Annual Competencies</div>
                <div className="bg-gray-50 p-2 rounded">TB Test</div>
                <div className="bg-gray-50 p-2 rounded">Flu Vaccination</div>
                <div className="bg-gray-50 p-2 rounded">N95 Fit Test</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-900">Pro Tip</h4>
                <p className="text-blue-800 text-sm">
                  When creating credential types, think about what compliance reports you'll need.
                  Adding specific types (rather than generic ones) makes reporting much easier.
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* User Roles */}
        {isCoordinator && (
          <Section id="user-roles" title="User Roles Explained" icon="🔑">
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-3 font-semibold">Permission</th>
                      <th className="text-center p-3 font-semibold">Coordinator</th>
                      <th className="text-center p-3 font-semibold">Manager</th>
                      <th className="text-center p-3 font-semibold">Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3">View Dashboard</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                    </tr>
                    <tr>
                      <td className="p-3">View All Staff</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                    </tr>
                    <tr>
                      <td className="p-3">View Own Credentials</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="p-3">Add/Edit Staff</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                    </tr>
                    <tr>
                      <td className="p-3">Assign Credentials</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                    </tr>
                    <tr>
                      <td className="p-3">Upload Documents</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="p-3">Run Reports</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                    </tr>
                    <tr>
                      <td className="p-3">Manage Credential Types</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                    </tr>
                    <tr>
                      <td className="p-3">Manage Users</td>
                      <td className="text-center p-3 text-green-600">✓</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                      <td className="text-center p-3 text-red-400">✗</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        )}

        {/* Reports */}
        {(isCoordinator || isManager) && (
          <Section id="reports" title="Running Reports" icon="📈">
            <div className="mt-4 space-y-4">
              <p className="text-gray-700">
                The Reports page lets you generate compliance reports filtered by:
              </p>
              <ul className="text-gray-700 text-sm list-disc list-inside space-y-1">
                <li>Credential type (e.g., all BLS certifications)</li>
                <li>Status (expired, expiring soon, current)</li>
                <li>Staff member</li>
                <li>Date range</li>
              </ul>
              <p className="text-gray-700 text-sm">
                Reports can be exported for compliance audits or shared with management.
              </p>
            </div>
          </Section>
        )}

        {/* FAQ */}
        <Section id="faq" title="Frequently Asked Questions" icon="❓">
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900">How do I give someone else coordinator access?</h4>
              <p className="text-gray-700 text-sm mt-1">
                Go to Users → Add User, and set their role to "Coordinator". They'll have full access to everything.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">What happens when a credential expires?</h4>
              <p className="text-gray-700 text-sm mt-1">
                It shows up in the "Expired" section on the dashboard with a red indicator. The staff member will also see it on their credentials page.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Can staff update their own credentials?</h4>
              <p className="text-gray-700 text-sm mt-1">
                Staff can upload documents to their assigned credentials, but they cannot change dates or add new credentials. A coordinator or manager must do that.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">How do I track a traveler's contract dates?</h4>
              <p className="text-gray-700 text-sm mt-1">
                When adding or editing a staff member, select "Traveler" as the employment type. This shows fields for agency name, agency contact, and contract start/end dates.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Can I delete a staff member?</h4>
              <p className="text-gray-700 text-sm mt-1">
                Staff members are archived rather than deleted (to preserve history). Go to Staff → click the staff member → Archive. Archived staff are hidden from lists but their data is retained.
              </p>
            </div>
          </div>
        </Section>

        {/* Need More Help */}
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Need More Help?</h3>
          <p className="text-gray-600 text-sm">
            Contact your system administrator or IT support for technical issues.
          </p>
        </div>
      </div>
    </div>
  );
}
