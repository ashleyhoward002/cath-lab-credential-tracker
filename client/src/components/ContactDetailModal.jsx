import { useState, useEffect } from 'react';
import { contactsAPI } from '../utils/api';

export default function ContactDetailModal({ contact, categories: initialCategories, onClose, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [showCardImage, setShowCardImage] = useState(false);

  // Local categories state for inline adding
  const [categories, setCategories] = useState(initialCategories);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [formData, setFormData] = useState({
    name: contact.name || '',
    title: contact.title || '',
    company: contact.company || '',
    email: contact.email || '',
    phone: contact.phone || '',
    phone_secondary: contact.phone_secondary || '',
    website: contact.website || '',
    category_id: contact.category_id || '',
    notes: contact.notes || '',
  });

  useEffect(() => {
    setFormData({
      name: contact.name || '',
      title: contact.title || '',
      company: contact.company || '',
      email: contact.email || '',
      phone: contact.phone || '',
      phone_secondary: contact.phone_secondary || '',
      website: contact.website || '',
      category_id: contact.category_id || '',
      notes: contact.notes || '',
    });
  }, [contact]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      if (!formData.name.trim()) {
        setError('Contact name is required');
        setSaving(false);
        return;
      }

      await contactsAPI.update(contact.id, formData);
      setEditing(false);
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await contactsAPI.delete(contact.id);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete contact');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await contactsAPI.toggleFavorite(contact.id);
      onUpdated();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const getCategoryColor = (color) => color || '#3b82f6';

  // Get the image URL
  const getCardImageUrl = () => {
    if (!contact.card_image_path) return null;
    const filename = contact.card_image_path.split('/').pop();
    return `/api/contacts/image/${filename}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            {editing ? 'Edit Contact' : 'Contact Details'}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleFavorite}
              className="text-2xl hover:scale-110 transition"
              title={contact.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {contact.is_favorite ? '★' : '☆'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {editing ? (
            /* Edit Form */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Phone</label>
                  <input
                    type="tel"
                    name="phone_secondary"
                    value={formData.phone_secondary}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowNewCategory(true);
                      } else {
                        handleChange(e);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                    <option value="__new__">+ Add New Category...</option>
                  </select>

                  {showNewCategory && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewCategoryColor(color)}
                              className={`w-6 h-6 rounded-full border-2 ${
                                newCategoryColor === color ? 'border-gray-800' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newCategoryName.trim()) return;
                            setCreatingCategory(true);
                            try {
                              const res = await contactsAPI.createCategory({ name: newCategoryName.trim(), color: newCategoryColor });
                              const newCat = { id: res.data.id, name: newCategoryName.trim(), color: newCategoryColor };
                              setCategories([...categories, newCat]);
                              setFormData((prev) => ({ ...prev, category_id: res.data.id }));
                              setShowNewCategory(false);
                              setNewCategoryName('');
                            } catch (err) {
                              setError(err.response?.data?.error || 'Failed to create category');
                            } finally {
                              setCreatingCategory(false);
                            }
                          }}
                          disabled={creatingCategory || !newCategoryName.trim()}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {creatingCategory ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="text-center pb-4 border-b border-gray-200">
                <h4 className="text-2xl font-bold text-gray-900">{contact.name}</h4>
                {contact.title && <p className="text-gray-600">{contact.title}</p>}
                {contact.company && <p className="text-gray-500">{contact.company}</p>}
                {contact.category_name && (
                  <span
                    className="inline-block mt-2 px-3 py-1 text-sm font-medium rounded-full"
                    style={{
                      backgroundColor: `${getCategoryColor(contact.category_color)}20`,
                      color: getCategoryColor(contact.category_color),
                    }}
                  >
                    {contact.category_name}
                  </span>
                )}
              </div>

              {/* Contact Actions */}
              <div className="grid grid-cols-2 gap-3">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                  >
                    <span className="mr-2">📞</span>
                    Call
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                  >
                    <span className="mr-2">✉️</span>
                    Email
                  </a>
                )}
                {contact.website && (
                  <a
                    href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition col-span-2"
                  >
                    <span className="mr-2">🌐</span>
                    Website
                  </a>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                {contact.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium">{contact.phone}</span>
                  </div>
                )}
                {contact.phone_secondary && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Secondary Phone:</span>
                    <span className="font-medium">{contact.phone_secondary}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium">{contact.email}</span>
                  </div>
                )}
                {contact.website && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Website:</span>
                    <a
                      href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {contact.website}
                    </a>
                  </div>
                )}
              </div>

              {/* Notes */}
              {contact.notes && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Notes:</div>
                  <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}

              {/* Business Card Image */}
              {contact.card_image_path && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowCardImage(!showCardImage)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {showCardImage ? 'Hide Business Card' : 'View Business Card'}
                  </button>
                  {showCardImage && (
                    <img
                      src={getCardImageUrl()}
                      alt="Business card"
                      className="mt-3 rounded-lg shadow max-w-full"
                    />
                  )}
                </div>
              )}

              {/* Raw Card Text */}
              {contact.card_raw_text && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">Scanned Card Text:</div>
                  <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {contact.card_raw_text}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                >
                  Delete
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Delete Contact?</h4>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete <strong>{contact.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
