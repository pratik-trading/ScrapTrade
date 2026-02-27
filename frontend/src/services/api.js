import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage if cookie not available (cross-origin)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirecting = false;

api.interceptors.response.use(
  (res) => {
    // If login/register response has token, save it
    if (res.data?.token) {
      localStorage.setItem('auth_token', res.data.token);
    }
    return res;
  },
  (err) => {
    const url = err.config?.url || '';
    const is401 = err.response?.status === 401;
    const isAuthMe = url.includes('/auth/me');

    if (is401 && !isAuthMe && !isRedirecting) {
      isRedirecting = true;
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      setTimeout(() => { isRedirecting = false; }, 3000);
    }

    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => {
    localStorage.removeItem('auth_token');
    return api.post('/auth/logout');
  },
  getMe: () => api.get('/auth/me'),
};

// Parties
export const partyAPI = {
  getAll: (params) => api.get('/parties', { params }),
  create: (data) => api.post('/parties', data),
  update: (id, data) => api.put(`/parties/${id}`, data),
  delete: (id) => api.delete(`/parties/${id}`),
  getLedger: (id, params) => api.get(`/parties/${id}/ledger`, { params }),
};

// Purchases
export const purchaseAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  getOne: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/purchases/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/purchases/${id}`),
  addPayment: (id, data) => api.post(`/purchases/${id}/add-payment`, data),
  deletePayment: (id, paymentId) => api.delete(`/purchases/${id}/payments/${paymentId}`),
};

// Sales
export const saleAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getOne: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/sales/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/sales/${id}`),
  addPayment: (id, data) => api.post(`/sales/${id}/add-payment`, data),
  deletePayment: (id, paymentId) => api.delete(`/sales/${id}/payments/${paymentId}`),
};

// Dashboard
export const dashboardAPI = {
  getData: (params) => api.get('/dashboard', { params }),
};

// Reports
export const reportAPI = {
  exportPurchases: (params) => {
    const token = localStorage.getItem('auth_token');
    const base = import.meta.env.VITE_API_URL || '/api';
    const qs = new URLSearchParams({ ...params, token }).toString();
    window.open(`${base}/reports/purchases/export?${qs}`, '_blank');
  },
  exportSales: (params) => {
    const token = localStorage.getItem('auth_token');
    const base = import.meta.env.VITE_API_URL || '/api';
    const qs = new URLSearchParams({ ...params, token }).toString();
    window.open(`${base}/reports/sales/export?${qs}`, '_blank');
  },
};

export default api;