import { motion, AnimatePresence } from 'motion/react';
import { CircleNotch, Check } from '@phosphor-icons/react';

// Komponen dasar sistem desain "Kartografi Kampung"

const BTN = {
  primary: 'bg-navy-800 text-blue-50 hover:bg-navy-700 shadow-key',
  accent: 'bg-yellow-500 text-navy-900 hover:bg-yellow-400 shadow-key',
  ghost: 'bg-white text-navy-700 ring-1 ring-blue-200 hover:ring-navy-500',
  danger: 'bg-danger text-white hover:brightness-110 shadow-key',
  glass: 'bg-white/10 text-blue-50 hover:bg-white/20 ring-1 ring-white/15',
};
const SIZE = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', icon: 'h-9 w-9 justify-center' };

// tombol bertekstur "tuts" (bayangan bawah) yang turun saat ditekan; state: idle | loading | success
export function Button({ variant = 'primary', size = 'md', state = 'idle', icon: Icon, children, className = '', ...props }) {
  const busy = state === 'loading';
  return (
    <button
      type="button"
      {...props}
      disabled={busy || props.disabled}
      className={`group inline-flex items-center font-heading font-bold rounded-xl transition-[transform,box-shadow,background-color,filter] duration-150 active:translate-y-[2px] active:shadow-none disabled:opacity-60 disabled:active:translate-y-0 ${BTN[variant]} ${SIZE[size]} ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {busy ? (
          <motion.span key="l" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}><CircleNotch size={16} weight="bold" className="animate-spin" /></motion.span>
        ) : state === 'success' ? (
          <motion.span key="s" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}><Check size={16} weight="bold" /></motion.span>
        ) : Icon ? (
          <motion.span key="i" initial={false} exit={{ opacity: 0 }} className="flex transition-transform group-hover:-rotate-6 group-hover:scale-110"><Icon size={size === 'sm' ? 15 : 17} weight="duotone" /></motion.span>
        ) : null}
      </AnimatePresence>
      {children}
    </button>
  );
}

// label papan nama jalan: kode mono di pelat kuning + judul
export function Signpost({ code, title, sub, right, dark = false }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 font-data text-[11px] font-bold px-2 py-1 rounded-md ${dark ? 'bg-yellow-500 text-navy-900' : 'bg-navy-800 text-yellow-400'}`}>{code}</span>
        <div className="min-w-0">
          <p className={`font-heading font-extrabold text-[15px] leading-tight truncate ${dark ? 'text-blue-50' : 'text-navy-800'}`}>{title}</p>
          {sub && <p className={`text-[11px] mt-0.5 truncate ${dark ? 'text-blue-300' : 'text-navy-500'}`}>{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// panel dasar: sudut pin, bayangan papan, opsi tekstur kontur
export function Plate({ children, className = '', tone = 'paper', contour = false, delay = 0, as = 'section' }) {
  const M = motion[as];
  const base = tone === 'sign'
    ? 'bg-navy-800 text-blue-50 ring-1 ring-white/5'
    : 'bg-white ring-1 ring-navy-800/[0.06]';
  return (
    <M
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-pin shadow-plate p-5 ${base} ${className}`}
    >
      {contour && <div className={`pointer-events-none absolute inset-0 ${tone === 'sign' ? 'bg-contour-dark' : 'bg-contour'}`} aria-hidden="true" />}
      <div className="relative">{children}</div>
    </M>
  );
}

export function StatusDot({ color = '#2E9E6B', pulse = false }) {
  return (
    <span className="relative inline-flex w-2 h-2">
      {pulse && <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: color }} />}
      <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
    </span>
  );
}
