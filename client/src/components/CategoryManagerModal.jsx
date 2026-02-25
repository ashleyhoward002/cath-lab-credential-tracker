import { useState } from 'react';
import { contactsAPI } from '../utils/api';

export default function CategoryManagerModal({ categories, onClose, onUpdated }) {
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', color: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const colorOptions = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#64748b', // slate
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    setSaving(true);
    setError('');

    try {
      await contactsAPI.createCategory(newCategory);
      setNewCategory({ name: '', color: '#3b82f6' });
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setEditForm({ name: category.name, color: category.color || '#3b82f6' });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;

    setSaving(true);
    setError('');

    try {
      await contactsAPI.updateCategory(editingId, editForm);
      setEditingId(null);
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Contacts in this category will become uncategorized.')) {
      return;
    }

    try {
      await contactsAPI.deleteCategory(id);
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete category');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold">Manage Categories</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Add New Category */}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Add New Category</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Category name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-1">
                {colorOptions.slice(0, 4).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategory({ ...newCategory, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newCategory.color === color ? 'border-gray-800' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={saving || !newCategory.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <div className="flex gap-1">
              {colorOptions.slice(4).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategory({ ...newCategory, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    newCategory.color === color ? 'border-gray-800' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </form>

          {/* Existing Categories */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Existing Categories</div>
            {categories.length === 0 ? (
              <p className="text-gray-500 text-sm">No categories yet</p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                  >
                    {editingId === category.id ? (
                      <>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-1">
                          {colorOptions.slice(0, 4).map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditForm({ ...editForm, color })}
                              className={`w-6 h-6 rounded-full border-2 ${
                                editForm.color === color ? 'border-gray-800' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="text-green-600 hover:text-green-800"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || '#3b82f6' }}
                        />
                        <span className="flex-1 font-medium">{category.name}</span>
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
