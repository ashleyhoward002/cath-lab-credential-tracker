import { useState, useEffect, useCallback } from 'react';
import { contactsAPI } from '../utils/api';
import AddContactModal from '../components/AddContactModal';
import ContactDetailModal from '../components/ContactDetailModal';
import CategoryManagerModal from '../components/CategoryManagerModal';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    try {
      const [contactsRes, categoriesRes] = await Promise.all([
        contactsAPI.getAll({
          search: debouncedSearch || undefined,
          category: categoryFilter || undefined,
          favorites: favoritesOnly || undefined,
        }),
        contactsAPI.getCategories(),
      ]);
      setContacts(contactsRes.data);
      setCategories(categoriesRes.data);
    } catch (err) {
      setError('Failed to load contacts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, favoritesOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleFavorite = async (id, e) => {
    e.stopPropagation();
    try {
      await contactsAPI.toggleFavorite(id);
      loadData();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleContactSaved = () => {
    setShowAddModal(false);
    loadData();
  };

  const handleContactUpdated = () => {
    setSelectedContact(null);
    loadData();
  };

  const handleContactDeleted = () => {
    setSelectedContact(null);
    loadData();
  };

  const getCategoryColor = (color) => {
    return color || '#3b82f6';
  };

  if (loading) {
    return <div className="text-center py-12">Loading contacts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Contact Directory</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Manage Categories
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Contact
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Favorites Toggle */}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              favoritesOnly
                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {favoritesOnly ? '★ Favorites' : '☆ Favorites'}
          </button>

          {/* View Toggle */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              }`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              }`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contact Count */}
      <div className="text-sm text-gray-500">
        {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        {favoritesOnly && ' (favorites only)'}
        {categoryFilter && categories.find(c => c.id === parseInt(categoryFilter)) &&
          ` in ${categories.find(c => c.id === parseInt(categoryFilter)).name}`}
      </div>

      {/* Contacts Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition cursor-pointer border border-gray-100"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {contact.name}
                  </h3>
                  {contact.title && (
                    <p className="text-sm text-gray-600 truncate">{contact.title}</p>
                  )}
                  {contact.company && (
                    <p className="text-sm text-gray-500 truncate">{contact.company}</p>
                  )}
                </div>
                <button
                  onClick={(e) => handleToggleFavorite(contact.id, e)}
                  className="text-2xl ml-2 hover:scale-110 transition"
                >
                  {contact.is_favorite ? '★' : '☆'}
                </button>
              </div>

              {contact.category_name && (
                <span
                  className="inline-block px-2 py-1 text-xs font-medium rounded-full mb-3"
                  style={{
                    backgroundColor: `${getCategoryColor(contact.category_color)}20`,
                    color: getCategoryColor(contact.category_color),
                  }}
                >
                  {contact.category_name}
                </span>
              )}

              <div className="space-y-1 text-sm">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <span className="mr-2">📞</span>
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center text-blue-600 hover:text-blue-800 truncate"
                  >
                    <span className="mr-2">✉️</span>
                    <span className="truncate">{contact.email}</span>
                  </a>
                )}
                {contact.website && (
                  <a
                    href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center text-blue-600 hover:text-blue-800 truncate"
                  >
                    <span className="mr-2">🌐</span>
                    <span className="truncate">{contact.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{contact.name}</div>
                    {contact.title && (
                      <div className="text-sm text-gray-500">{contact.title}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{contact.company || '—'}</td>
                  <td className="px-6 py-4">
                    {contact.category_name ? (
                      <span
                        className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: `${getCategoryColor(contact.category_color)}20`,
                          color: getCategoryColor(contact.category_color),
                        }}
                      >
                        {contact.category_name}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {contact.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {contact.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={(e) => handleToggleFavorite(contact.id, e)}
                      className="text-xl hover:scale-110 transition"
                    >
                      {contact.is_favorite ? '★' : '☆'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {contacts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {search || categoryFilter || favoritesOnly
            ? 'No contacts match your filters'
            : 'No contacts yet. Add your first contact!'}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddContactModal
          categories={categories}
          onClose={() => setShowAddModal(false)}
          onSaved={handleContactSaved}
        />
      )}

      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          categories={categories}
          onClose={() => setSelectedContact(null)}
          onUpdated={handleContactUpdated}
          onDeleted={handleContactDeleted}
        />
      )}

      {showCategoryModal && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
