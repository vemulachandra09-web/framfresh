import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
  updateMe: (data) => api.put('/api/auth/me', data),
  sendEmailOtp: (email) => api.post('/api/auth/email-otp/send', { email }),
  verifyEmailOtp: (email, otp) => api.post('/api/auth/email-otp/verify', { email, otp }),
};

export const productsAPI = {
  list: (category) => api.get('/api/products/', { params: { category } }),
  get: (id) => api.get(`/api/products/${id}`),
  create: (data) => api.post('/api/products/', data),
  delete: (id) => api.delete(`/api/products/${id}`),
};

export const subscriptionsAPI = {
  list: () => api.get('/api/subscriptions/'),
  create: (data) => api.post('/api/subscriptions/', data),
  get: (id) => api.get(`/api/subscriptions/${id}`),
  pause: (id, data) => api.post(`/api/subscriptions/${id}/pause`, data),
  resume: (id) => api.post(`/api/subscriptions/${id}/resume`),
  cancel: (id) => api.post(`/api/subscriptions/${id}/cancel`),
  skipDates: (id) => api.get(`/api/subscriptions/${id}/skip-dates`),
  addSkipDates: (id, dates) => api.post(`/api/subscriptions/${id}/skip-dates`, { dates }),
  removeSkipDate: (id, skipId) => api.delete(`/api/subscriptions/${id}/skip-dates/${skipId}`),
};

export const ordersAPI = {
  list: (status) => api.get('/api/orders/', { params: { status } }),
  get: (id) => api.get(`/api/orders/${id}`),
  create: (data) => api.post('/api/orders/', data),
  today: () => api.get('/api/orders/today/deliveries'),
};

export const paymentsAPI = {
  list: () => api.get('/api/payments/'),
  create: (data) => api.post('/api/payments/', data),
};

export const deliveryAPI = {
  track: (orderId) => api.get(`/api/deliveries/track/${orderId}`),
  rate: (deliveryId, data) => api.post(`/api/deliveries/${deliveryId}/rate`, data),
  getRating: (deliveryId) => api.get(`/api/deliveries/${deliveryId}/rating`),
};

export const notificationsAPI = {
  list: () => api.get('/api/notifications/'),
  unreadCount: () => api.get('/api/notifications/unread-count'),
  markRead: (id) => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post('/api/notifications/read-all'),
};

export const adminAPI = {
  dashboard: () => api.get('/api/admin/dashboard'),
  customers: (page) => api.get('/api/admin/customers', { params: { page } }),
  subscriptions: (status, page) => api.get('/api/admin/subscriptions', { params: { status, page } }),
  orders: (status, date, page) => api.get('/api/admin/orders', { params: { status, delivery_date: date, page } }),
  payments: (page) => api.get('/api/admin/payments', { params: { page } }),
  deliveries: (status, page) => api.get('/api/admin/deliveries', { params: { status, page } }),
  revenue: (start, end) => api.get('/api/admin/reports/revenue', { params: { start_date: start, end_date: end } }),
};

export default api;
