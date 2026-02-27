import api from './api';

export const lotAPI = {
  getAll: (params) => api.get('/lots', { params }),
  getOne: (id) => api.get(`/lots/${id}`),
  create: (data) => api.post('/lots', data),
  update: (id, data) => api.put(`/lots/${id}`, data),
  delete: (id) => api.delete(`/lots/${id}`),
  addPurchase: (id, data) => api.post(`/lots/${id}/add-purchase`, data),
  addSale: (id, data) => api.post(`/lots/${id}/add-sale`, data),
  removePurchase: (id, entryId) => api.delete(`/lots/${id}/purchases/${entryId}`),
  removeSale: (id, entryId) => api.delete(`/lots/${id}/sales/${entryId}`),
};