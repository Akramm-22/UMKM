import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const DEMO_USERS = {
  konsumen: { id: -1, name: 'Rafi (Demo)', role: 'user', persona: 'konsumen', demo: true },
  pelaku: { id: -2, name: 'Bu Siti (Demo)', role: 'user', persona: 'pelaku', demo: true },
  admin: { id: -3, name: 'Andi (Demo)', role: 'admin', persona: 'admin', demo: true },
};

// akun dummy per role — bisa login lewat form tanpa database
export const DUMMY_ACCOUNTS = [
  { phone: '081111111111', password: 'konsumen123', label: 'Konsumen', user: DEMO_USERS.konsumen },
  { phone: '082222222222', password: 'pelaku123', label: 'Pelaku Usaha', user: DEMO_USERS.pelaku },
  { phone: '083333333333', password: 'admin123', label: 'Admin', user: DEMO_USERS.admin },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('pl_user') ?? 'null'));

  const persist = (u, token) => {
    localStorage.setItem('pl_user', JSON.stringify(u));
    if (token) localStorage.setItem('pl_token', token);
    setUser(u);
  };

  const login = async (phone, password) => {
    // akun dummy dicek lebih dulu agar login berfungsi tanpa database
    const dummy = DUMMY_ACCOUNTS.find((a) => a.phone === phone.trim() && a.password === password);
    if (dummy) {
      persist(dummy.user);
      return dummy.user;
    }
    const { data } = await axios.post('/api/auth/login', { phone, password });
    const u = { ...data.user, persona: data.user.role === 'admin' ? 'admin' : 'konsumen' };
    persist(u, data.token);
    return u;
  };

  const register = async (name, phone, password) => {
    const { data } = await axios.post('/api/auth/register', { name, phone, password });
    const u = { ...data.user, persona: 'konsumen' };
    persist(u, data.token);
    return u;
  };

  const loginDemo = (persona) => {
    const u = DEMO_USERS[persona];
    persist(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('pl_user');
    localStorage.removeItem('pl_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
