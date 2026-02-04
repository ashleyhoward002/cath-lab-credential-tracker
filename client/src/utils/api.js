import axios from 'axios';

// In production (served by Express), use relative /api path
// In development (Vite dev server on :5173), point to Express on :3001
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'development' ? 'http://localhost:3001/api' : '/api');

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  logout: () =>
    api.post('/auth/logout'),

  checkSession: () =>
    api.get('/auth/session'),
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

export default api;
