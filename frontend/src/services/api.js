import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Flag to prevent redirect loop during initial load
let isRedirecting = false;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect on 401 if it's NOT the /auth/me check
    // and only if we're not already redirecting
    const url = err.config?.url || '';
    const is401 = err.response?.status === 401;
    const isAuthMe = url.includes('/auth/me');

    if (is401 && !isAuthMe && !isRedirecting) {
      isRedirecting = true;
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
  logout: () => api.post('/auth/logout'),
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
    const queryString = new URLSearchParams(params).toString();
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/reports/purchases/export?${queryString}`, '_blank');
  },
  exportSales: (params) => {
    const queryString = new URLSearchParams(params).toString();
    window.open(`${import.meta.env.VITE_API_URL || '/api'}/reports/sales/export?${queryString}`, '_blank');
  },
};

export default api;