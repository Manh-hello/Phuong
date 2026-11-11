import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from './api';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('token'));
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    const h = () => { setIsAdmin(false); toast('Phiên đăng nhập đã hết hạn', 'err'); };
    window.addEventListener('auth-expired', h);
    return () => window.removeEventListener('auth-expired', h);
  }, [toast]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    setIsAdmin(true);
  };
  const logout = () => { localStorage.removeItem('token'); setIsAdmin(false); };

  return (
    <Ctx.Provider value={{ isAdmin, login, logout, toast }}>
      {children}
      <div className="toasts">{toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}</div>
    </Ctx.Provider>
  );
}
