import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { demoBusinessCount } from '../lib/myBusinesses.js';

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

const personaOf = (u) => (u.role === 'admin' ? 'admin' : u.account_type === 'pelaku' || u.business_count > 0 ? 'pelaku' : 'konsumen');

// tujuan akun demo dihitung dari data perangkat (pengganti DB saat server tidak tersambung)
function demoLanding(u) {
  if (u.role === 'admin') return '/admin';
  if (u.persona !== 'pelaku') return '/explore';
  return demoBusinessCount(u) > 0 ? '/dashboard' : '/usaha';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('pl_user') ?? 'null'));

  const persist = (u, token) => {
    localStorage.setItem('pl_user', JSON.stringify(u));
    if (token) localStorage.setItem('pl_token', token);
    setUser(u);
  };

  const fromServer = (data) => {
    const { landing, ...rest } = data.user;
    const u = { ...rest, persona: personaOf(rest) };
    persist(u, data.token);
    return { ...u, landing };
  };

  const login = async (phone, password) => {
    // akun dummy dicek lebih dulu agar login berfungsi tanpa database
    const dummy = DUMMY_ACCOUNTS.find((a) => a.phone === phone.trim() && a.password === password);
    if (dummy) {
      localStorage.removeItem('pl_token');
      persist(dummy.user);
      return { ...dummy.user, landing: demoLanding(dummy.user) };
    }
    const { data } = await axios.post('/api/auth/login', { phone, password });
    return fromServer(data);
  };

  const register = async (name, phone, password, accountType = 'konsumen') => {
    const { data } = await axios.post('/api/auth/register', { name, phone, password, account_type: accountType });
    return fromServer(data);
  };

  // status akun terbaru dari server (jumlah usaha, jenis akun) — dipakai halaman pelaku usaha
  const refreshProfile = useCallback(async () => {
    const current = JSON.parse(localStorage.getItem('pl_user') ?? 'null');
    if (!current) return null;
    const token = localStorage.getItem('pl_token');
    if (current.demo || !token) return { ...current, business_count: demoBusinessCount(current), landing: demoLanding(current) };
    const { data } = await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    const { landing, ...rest } = data;
    const u = { ...current, ...rest, persona: personaOf(rest) };
    persist(u);
    return { ...u, landing };
  }, []);

  const loginDemo = (persona) => {
    const u = DEMO_USERS[persona];
    persist(u);
    return u;
  };

  // pengguna yang baru mendaftarkan usaha otomatis menjadi pelaku usaha
  const becomePelaku = () => {
    if (!user || user.role === 'admin' || user.persona === 'pelaku') return;
    persist({ ...user, persona: 'pelaku' });
  };

  const logout = () => {
    localStorage.removeItem('pl_user');
    localStorage.removeItem('pl_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginDemo, logout, becomePelaku, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// apakah pengguna sudah punya usaha terdaftar — dicek ulang ke server (DB), bukan dari sesi tersimpan
export function useBusinessStatus() {
  const { user, refreshProfile } = useAuth();
  const [count, setCount] = useState(() => user?.business_count ?? null);
  const uid = user?.id;
  const isAdmin = user?.role === 'admin';
  useEffect(() => {
    if (uid == null || isAdmin) return undefined;
    let live = true;
    refreshProfile()
      .then((p) => { if (live) setCount(p?.business_count ?? 0); })
      .catch(() => {});
    return () => { live = false; };
  }, [uid, isAdmin, refreshProfile]);
  return { count, hasBusiness: (count ?? 0) > 0, loading: count == null };
}
