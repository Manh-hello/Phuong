import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && localStorage.getItem('token')) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-expired'));
  }
  return Promise.reject(e);
});

export const errMsg = (e) => e.response?.data?.error || 'Không kết nối được máy chủ';
export const money = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n || 0));
export const dateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
export default api;
