import { Link, useNavigate } from 'react-router-dom';
import { MapPin, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// header mengambang untuk halaman peta full-screen
export default function FloatingHeader({ label }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="absolute top-4 left-4 z-[1100] flex items-center gap-2">
      <Link
        to="/"
        className="flex items-center gap-1.5 bg-navy-800 text-blue-50 font-heading font-bold px-3.5 py-2.5 rounded-xl shadow-lg shadow-navy-800/20 hover:bg-navy-700 transition-colors"
      >
        <MapPin size={18} className="text-yellow-500" /> PesanLokal
      </Link>
      {label && (
        <span className="bg-white/95 text-navy-700 text-xs font-semibold px-3 py-2.5 rounded-xl shadow">
          {label}
        </span>
      )}
      {user && (
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="bg-white/95 text-navy-600 p-2.5 rounded-xl shadow hover:text-danger transition-colors"
          aria-label="Keluar"
          title={`Keluar (${user.name})`}
        >
          <LogOut size={16} />
        </button>
      )}
    </div>
  );
}
