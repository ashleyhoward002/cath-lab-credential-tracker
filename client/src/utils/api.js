import axios from 'axios';

// In production (served by Express), use relative /api path
// In development (Vite dev server on :5173), point to Express on :3001
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'development' ? 'http://localhost:3001/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Config API (public, no auth)
export const configAPI = {
  getConfig: () => api.get('/config'),
};

// Setup API (no auth, first-run only)
export const setupAPI = {
  getStatus: () => api.get('/setup/status'),
  init: (data) => api.post('/setup/init', data),
};

// Auth API
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  logout: () =>
    api.post('/auth/logout'),
  checkSession: () =>
    api.get('/auth/session'),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Staff API
export const staffAPI = {
  getAll: (status = null) =>
    api.get('/staff', { params: { status } }),
  getById: (id) =>
    api.get(`/staff/${id}`),
  create: (staffData) =>
    api.post('/staff', staffData),
  update: (id, staffData) =>
    api.put(`/staff/${id}`, staffData),
  archive: (id) =>
    api.delete(`/staff/${id}`),
  importPreview: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/staff/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  importConfirm: (staff) =>
    api.post('/staff/import/confirm', { staff }),
};

// Credential Type API
export const credentialTypeAPI = {
  getAll: () =>
    api.get('/credential-types'),
  getById: (id) =>
    api.get(`/credential-types/${id}`),
  create: (credentialData) =>
    api.post('/credential-types', credentialData),
  update: (id, credentialData) =>
    api.put(`/credential-types/${id}`, credentialData),
};

// Staff Credentials API
export const staffCredentialAPI = {
  getByStaffId: (staffId) =>
    api.get(`/staff/${staffId}/credentials`),
  assign: (staffId, credentialData) =>
    api.post(`/staff/${staffId}/credentials`, credentialData),
  update: (credentialId, credentialData) =>
    api.put(`/staff-credentials/${credentialId}`, credentialData),
  getDocuments: (credentialId) =>
    api.get(`/staff-credentials/${credentialId}/documents`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () =>
    api.get('/dashboard/stats'),
  getUpcomingExpirations: (days = 90) =>
    api.get('/dashboard/upcoming-expirations', { params: { days } }),
};

// Documents API
export const documentsAPI = {
  upload: (formData) =>
    api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};

// Users API (coordinator only)
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  deactivate: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, newPassword) => api.post(`/users/${id}/reset-password`, { newPassword }),
};

// Advanced Import API (coordinator only)
export const importAPI = {
  analyze: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  preview: (file, mapping) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    return api.post('/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  createCredentialType: (data) =>
    api.post('/import/credential-type', data),
  confirm: (staff) =>
    api.post('/import/confirm', { staff }),
};

export default api;
