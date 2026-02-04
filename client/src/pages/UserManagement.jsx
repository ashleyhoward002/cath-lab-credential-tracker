import { useState, useEffect } from 'react';
import { usersAPI, staffAPI } from '../utils/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [form, setForm] = useState({ username: '', password: '', display_name: '', title: '', role: 'staff', email: '', staff_member_id: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [usersRes, staffRes] = await Promise.all([usersAPI.getAll(), staffAPI.getAll()]);
      setUsers(usersRes.data);
      setStaffMembers(staffRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', display_name: '', title: '', role: 'staff', email: '', staff_member_id: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username, password: '', display_name: user.display_name,
      title: user.title, role: user.role, email: user.email || '', staff_member_id: user.staff_member_id || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, {
          display_name: form.display_name, title: form.title,
          role: form.role, email: form.email || null,
          is_active: editingUser.is_active,
          staff_member_id: form.staff_member_id || null,
        });
      } else {
        if (!form.password || form.password.length < 8) {
          return setError('Password must be at least 8 characters');
        }
        await usersAPI.create(form);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.is_active) {
        await usersAPI.deactivate(user.id);
      } else {
        await usersAPI.update(user.id, { ...user, is_active: true });
      }
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 8) {
      return alert('Password must be at least 8 characters');
    }
    try {
      await usersAPI.resetPassword(resetModal.id, resetPassword);
      setResetModal(null);
      setResetPassword('');
      alert('Password reset successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  // Staff members not yet linked to a user account
  const linkedStaffIds = users.map(u => u.staff_member_id).filter(Boolean);
  const availableStaff = staffMembers.filter(s =>
    !linkedStaffIds.includes(s.id) || (editingUser && editingUser.staff_member_id === s.id)
  );

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
          Create User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linked Staff</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className={!user.is_active ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.username}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{user.display_name}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize
                    ${user.role === 'coordinator' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {user.staff_first_name ? `${user.staff_first_name} ${user.staff_last_name}` : '—'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button onClick={() => openEdit(user)} className="text-blue-600 hover:text-blue-800">Edit</button>
                  <button onClick={() => { setResetModal(user); setResetPassword(''); }} className="text-yellow-600 hover:text-yellow-800">Reset PW</button>
                  <button onClick={() => handleToggleActive(user)}
                    className={user.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}>
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editingUser ? 'Edit User' : 'Create User'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input name="username" value={form.username} onChange={handleChange} required disabled={!!editingUser}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input name="display_name" value={form.display_name} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input name="title" value={form.title} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select name="role" value={form.role} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="coordinator">Coordinator</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              {form.role === 'staff' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Staff Member</label>
                  <select name="staff_member_id" value={form.staff_member_id} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select a staff member...</option>
                    {availableStaff.map(s => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.employee_id})</option>
                    ))}
                  </select>
                </div>
              )}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Reset Password for {resetModal.display_name}</h3>
            <div className="space-y-3">
              <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              <div className="flex justify-end space-x-3">
                <button onClick={() => setResetModal(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleResetPassword}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Reset Password</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
