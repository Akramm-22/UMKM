import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const VARIANTS = {
  light: 'bg-white/95 text-navy-700 hover:bg-white hover:text-navy-900 border border-blue-200 shadow',
  dark: 'bg-navy-700 text-blue-50 hover:bg-navy-600 border border-navy-600',
  ghost: 'text-navy-500 hover:text-navy-800 hover:bg-blue-100',
};

// riwayat react-router punya idx; idx 0 berarti halaman dibuka langsung, jadi pakai fallback
export default function BackButton({ fallback = '/', label = 'Kembali', variant = 'light', onClick, className = '' }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (onClick) return onClick();
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(fallback);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={`pointer-events-auto inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl text-xs font-bold transition-colors ${VARIANTS[variant]} ${className}`}
      aria-label={label || 'Kembali'}
      title={label ? undefined : 'Kembali'}
    >
      <ArrowLeft size={15} />
      {label && <span>{label}</span>}
    </button>
  );
}
