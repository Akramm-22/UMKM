import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import BackButton from './BackButton.jsx';
import ProfileMenu from './ProfileMenu.jsx';

// header mengambang untuk halaman peta full-screen
export default function FloatingHeader({ label, backTo = '/', onBack }) {
  return (
    <div className="absolute top-4 left-4 right-4 z-[1100] flex items-center gap-2 pointer-events-none">
      <BackButton fallback={backTo} onClick={onBack} label="" className="!px-2.5 min-h-[42px]" />
      <Link
        to="/"
        className="pointer-events-auto flex items-center gap-1.5 bg-navy-800 text-blue-50 font-heading font-bold px-3.5 py-2.5 rounded-xl shadow-lg shadow-navy-800/20 hover:bg-navy-700 transition-colors"
      >
        <MapPin size={18} className="text-yellow-500" /> PesanLokal
      </Link>
      {label && (
        <span className="hidden sm:inline-flex pointer-events-auto bg-white/95 text-navy-700 text-xs font-semibold px-3 py-2.5 rounded-xl shadow">
          {label}
        </span>
      )}
      <ProfileMenu className="ml-auto" />
    </div>
  );
}
