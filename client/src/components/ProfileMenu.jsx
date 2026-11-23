import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, LayoutGrid, Store, MapPin, Heart, ShieldCheck, Phone, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABEL = (u) => (u.role === 'admin' ? 'Administrator' : u.persona === 'pelaku' ? 'Pelaku Usaha' : 'Konsumen');

const initials = (name = '?') => name.replace(/\(.*?\)/g, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export function Avatar({ user, size = 40, className = '' }) {
  const [broken, setBroken] = useState(false);
  const src = user.avatar_url ?? user.photo_url;
  return src && !broken ? (
    <img src={src} alt="" onError={() => setBroken(true)} style={{ width: size, height: size }} className={`rounded-full object-cover ${className}`} />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.38 }} className={`rounded-full bg-navy-800 text-yellow-500 font-heading font-extrabold flex items-center justify-center select-none ${className}`} aria-hidden="true">
      {initials(user.name)}
    </span>
  );
}

// avatar pojok kanan atas; tombol Keluar sengaja hanya ada di dalam pop-up
export default function ProfileMenu({ className = '', logoutTo = '/' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const links = user.role === 'admin'
    ? [
      { to: '/admin', icon: LayoutGrid, label: 'Dashboard Admin' },
      { to: '/admin/peta', icon: ShieldCheck, label: 'Peta Komando' },
    ]
    : [
      { to: '/explore', icon: MapPin, label: 'Peta Usaha' },
      ...(user.persona === 'pelaku' ? [{ to: '/dashboard', icon: LayoutGrid, label: 'Dashboard Usaha' }] : []),
      { to: '/daftar-usaha', icon: Store, label: 'Daftarkan Usaha' },
    ];

  const doLogout = () => {
    setOpen(false);
    logout();
    navigate(logoutTo);
  };

  return (
    <div ref={rootRef} className={`relative pointer-events-auto ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu profil ${user.name}`}
        title={user.name}
        className={`block rounded-full focus-visible:rounded-full shadow-lg shadow-navy-900/20 ring-2 transition-all ${open ? 'ring-yellow-500' : 'ring-white hover:ring-yellow-500'}`}
      >
        <Avatar user={user} size={42} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-[calc(100%+10px)] z-[1300] w-72 bg-white text-navy-800 rounded-2xl shadow-2xl shadow-navy-900/25 border border-blue-200 overflow-hidden"
          >
            <div className="flex flex-col items-center text-center px-5 pt-5 pb-4 bg-blue-50 border-b border-blue-200">
              <Avatar user={user} size={64} className="ring-4 ring-white shadow" />
              <p className="font-heading font-bold text-base mt-3 truncate max-w-full">Halo, {user.name.replace(/\s*\(.*?\)/, '').split(' ')[0]}!</p>
              <p className="text-sm text-navy-700 truncate max-w-full">{user.name}</p>
              <span className="mt-2 inline-flex items-center gap-1 bg-navy-800 text-yellow-500 text-[11px] font-bold px-2.5 py-1 rounded-full">
                {user.role === 'admin' ? <ShieldCheck size={11} /> : user.persona === 'pelaku' ? <Store size={11} /> : <Heart size={11} />}
                {ROLE_LABEL(user)}
              </span>
              {user.phone && (
                <p className="flex items-center gap-1 text-xs text-navy-500 mt-2"><Phone size={11} /> {user.phone}</p>
              )}
              {user.demo && <p className="text-[11px] text-navy-500 mt-1">Akun demo</p>}
            </div>

            <div className="p-1.5 text-sm font-semibold">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <l.icon size={16} className="text-navy-500" />
                  <span className="flex-1">{l.label}</span>
                  <ChevronRight size={14} className="text-navy-500" />
                </Link>
              ))}
            </div>

            <div className="p-1.5 border-t border-blue-200">
              <button
                type="button"
                role="menuitem"
                onClick={doLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
