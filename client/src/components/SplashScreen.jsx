import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UtensilsCrossed, ShoppingBasket, Wrench, Coffee } from 'lucide-react';

// splash hanya sekali per sesi tab, agar navigasi internal tidak memunculkannya lagi
const SEEN_KEY = 'pl_splash_seen';
const DURATION = 2900;
const EASE = [0.76, 0, 0.24, 1];

// koordinat di viewBox 320x320; pusat logo di (160,160)
const ROADS = [
  'M-10 118 C 70 112, 120 140, 330 102',
  'M-10 214 C 90 230, 200 190, 330 226',
  'M96 -10 C 110 90, 84 200, 118 330',
  'M226 -10 C 210 110, 246 210, 214 330',
];
const SHOPS = [
  { x: 62, y: 84, emoji: '🍜', icon: UtensilsCrossed, d: 0.55 },
  { x: 262, y: 70, emoji: '🛒', icon: ShoppingBasket, d: 0.65 },
  { x: 274, y: 232, emoji: '🔧', icon: Wrench, d: 0.75 },
  { x: 54, y: 246, emoji: '☕', icon: Coffee, d: 0.85 },
];
const beam = (s) => `M${s.x} ${s.y} Q ${(s.x + 160) / 2 + (s.y > 160 ? 30 : -30)} ${(s.y + 160) / 2}, 160 160`;

// pin utama: tetes tegak (viewBox 64x80) + ikon lokasi lucide yang tergambar
const PIN_PATH = 'M32 2C16.5 2 4 14.3 4 29.6c0 19.7 23.3 44.3 26.1 47.2a2.6 2.6 0 0 0 3.8 0C36.7 73.9 60 49.3 60 29.6 60 14.3 47.5 2 32 2z';
const LAND = 0.3;
const BEAM_ARRIVE = 0.85 + 0.5 + 1.1;

function ShopBadge({ s, reduce }) {
  const Icon = s.icon;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.3, y: 10, rotate: -18 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 16, delay: s.d }}
      whileHover={{ scale: 1.14, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
      className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10"
      style={{ left: `${(s.x / 320) * 100}%`, top: `${(s.y / 320) * 100}%` }}
      aria-hidden="true"
    >
      {/* denyut saat berkas cahaya berangkat dari usaha ini */}
      {!reduce && (
        <motion.span
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.9], opacity: [0.55, 0] }}
          transition={{ duration: 0.9, delay: s.d + 0.45, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full border border-yellow-500"
        />
      )}
      <motion.span
        animate={reduce ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 2.4, delay: s.d + 0.6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-full h-full rounded-full bg-navy-700 border-2 border-blue-300/40 shadow-lg shadow-navy-900/60 flex items-center justify-center overflow-hidden"
        style={{ backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,0) 55%)' }}
      >
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={reduce ? { scale: 1, opacity: 1 } : { scale: [0.4, 1.15, 1, 1.12, 1], opacity: 1 }}
          transition={{ duration: 1.1, delay: s.d + 0.12, times: [0, 0.25, 0.45, 0.7, 1], ease: 'easeOut' }}
          className="text-blue-50"
        >
          <Icon size={17} strokeWidth={2} />
        </motion.span>
      </motion.span>
    </motion.span>
  );
}

function MainPin({ reduce }) {
  return (
    <motion.div
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 15, delay: LAND }}
      className="relative -translate-y-3"
    >
      {/* squash & stretch saat mendarat, lalu memantul saat cahaya tiba */}
      <motion.div
        initial={{ scaleX: 0.7, scaleY: 1.25 }}
        animate={reduce ? { scaleX: 1, scaleY: 1 } : { scaleX: [0.7, 1.12, 0.96, 1, 1, 1.06, 1], scaleY: [1.25, 0.86, 1.04, 1, 1, 1.06, 1] }}
        transition={{ duration: BEAM_ARRIVE - LAND + 0.35, delay: LAND, times: [0, 0.12, 0.2, 0.27, 0.82, 0.9, 1], ease: 'easeOut' }}
        style={{ originY: 1 }}
        whileHover={{ scale: 1.06, rotate: -4 }}
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 2.2, delay: LAND + 0.9, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[4.5rem] sm:w-20"
        >
          <svg viewBox="0 0 64 80" className="w-full h-auto overflow-visible" style={{ filter: 'drop-shadow(0 18px 22px rgba(10,20,40,.6)) drop-shadow(0 0 18px rgba(255,201,20,.35))' }}>
            <defs>
              <linearGradient id="pin-body" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFE066" />
                <stop offset="50%" stopColor="#FFC914" />
                <stop offset="100%" stopColor="#E6B000" />
              </linearGradient>
              <radialGradient id="pin-core" cx="32%" cy="28%" r="75%">
                <stop offset="0%" stopColor="#3A5680" />
                <stop offset="55%" stopColor="#16294F" />
                <stop offset="100%" stopColor="#0A1428" />
              </radialGradient>
              <linearGradient id="pin-gloss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff" stopOpacity=".75" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="pin-shine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity=".7" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <clipPath id="pin-clip"><path d={PIN_PATH} /></clipPath>
            </defs>

            <path d={PIN_PATH} fill="url(#pin-body)" />
            <path d={PIN_PATH} fill="none" stroke="#A07800" strokeOpacity=".35" strokeWidth="1" />
            <ellipse cx="22" cy="14" rx="12" ry="6.5" fill="url(#pin-gloss)" transform="rotate(-28 22 14)" />

            {/* kilau menyapu sekali setelah mendarat */}
            {!reduce && (
              <g clipPath="url(#pin-clip)">
                <motion.rect
                  y="-10" width="18" height="100" fill="url(#pin-shine)" transform="rotate(20 32 40)"
                  initial={{ x: -40 }}
                  animate={{ x: 90 }}
                  transition={{ duration: 0.9, delay: LAND + 0.7, ease: [0.4, 0, 0.2, 1] }}
                />
              </g>
            )}

            <motion.circle
              cx="32" cy="30" r="15" fill="url(#pin-core)"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 14, delay: LAND + 0.25 }}
              style={{ originX: '32px', originY: '30px' }}
            />
            <g transform="translate(22.4 20.4) scale(0.8)" fill="none" stroke="#FFD23F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <motion.path
                d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
                initial={{ pathLength: reduce ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, delay: LAND + 0.4, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="12" cy="10" r="3"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 12, delay: LAND + 0.95 }}
                style={{ originX: '12px', originY: '10px' }}
              />
            </g>
          </svg>
        </motion.div>
      </motion.div>

      {/* bayangan tanah: muncul saat mendarat & mengecil ketika pin naik */}
      <motion.span
        initial={{ scaleX: 0, opacity: 0 }}
        animate={reduce ? { scaleX: 1, opacity: 0.55 } : { scaleX: [0, 1.15, 1], opacity: [0, 0.6, 0.55] }}
        transition={{ delay: LAND + 0.2, duration: 0.5 }}
        className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-12 h-2.5"
        aria-hidden="true"
      >
        <motion.span
          animate={reduce ? undefined : { scaleX: [1, 0.8, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 2.2, delay: LAND + 0.9, repeat: Infinity, ease: 'easeInOut' }}
          className="block w-full h-full bg-navy-900 rounded-full blur-[3px]"
        />
      </motion.span>
    </motion.div>
  );
}

export default function SplashScreen() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => !sessionStorage.getItem(SEEN_KEY));

  const finish = useCallback(() => {
    sessionStorage.setItem(SEEN_KEY, '1');
    setShow(false);
  }, []);

  useEffect(() => {
    if (!show) {
      document.body.style.overflow = '';
      return undefined;
    }
    document.body.style.overflow = 'hidden';
    const t = setTimeout(finish, reduce ? 900 : DURATION);
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') finish(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [show, finish, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div key="splash" className="fixed inset-0 z-[100]" role="status" aria-live="polite" aria-label="PesanLokal sedang dimuat">
          {/* tirai kuning yang tertinggal sesaat saat keluar */}
          <motion.div
            className="absolute inset-0 bg-yellow-500"
            exit={{ y: '-100%', transition: { duration: 0.7, ease: EASE, delay: 0.08 } }}
            aria-hidden="true"
          />
          <motion.div
            className="absolute inset-0 bg-navy-900 overflow-hidden flex flex-col items-center justify-center px-6"
            exit={{ y: '-100%', transition: { duration: 0.6, ease: EASE } }}
            onClick={finish}
          >
            {/* latar: glow lembut + peta titik yang memudar ke tepi */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(60% 50% at 50% 45%, rgba(36,64,107,.55) 0%, rgba(10,20,40,0) 70%)' }}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.18 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 bg-dots pointer-events-none"
              style={{ maskImage: 'radial-gradient(circle at 50% 45%, #000 0%, transparent 60%)', WebkitMaskImage: 'radial-gradient(circle at 50% 45%, #000 0%, transparent 60%)' }}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              className="absolute w-[36rem] h-[36rem] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,201,20,.12) 0%, rgba(255,201,20,0) 60%)' }}
              aria-hidden="true"
            />

            {/* komposisi peta mini */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80">
              <svg viewBox="0 0 320 320" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="splash-beam" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFC914" stopOpacity="0" />
                    <stop offset="50%" stopColor="#FFE066" />
                    <stop offset="100%" stopColor="#FFC914" stopOpacity="0" />
                  </linearGradient>
                  <radialGradient id="splash-fade" cx="50%" cy="50%" r="50%">
                    <stop offset="55%" stopColor="#fff" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                  </radialGradient>
                  <mask id="splash-mask"><rect width="320" height="320" fill="url(#splash-fade)" /></mask>
                </defs>

                <g mask="url(#splash-mask)">
                  {ROADS.map((d, i) => (
                    <motion.path
                      key={d}
                      d={d}
                      fill="none"
                      stroke="#24406B"
                      strokeWidth={i < 2 ? 10 : 7}
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.1 + i * 0.12, ease: 'easeInOut' }}
                    />
                  ))}
                  {ROADS.slice(0, 2).map((d, i) => (
                    <motion.path
                      key={`m-${d}`}
                      d={d}
                      fill="none"
                      stroke="#3A5680"
                      strokeWidth="1.5"
                      strokeDasharray="6 8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.8 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                    />
                  ))}
                </g>

                {/* garis koneksi usaha → logo, lalu berkas cahaya mengalir */}
                {SHOPS.map((s) => (
                  <g key={`b-${s.emoji}`}>
                    <motion.path
                      d={beam(s)}
                      fill="none"
                      stroke="#8FBEDC"
                      strokeOpacity="0.25"
                      strokeWidth="1.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, delay: s.d + 0.15, ease: 'easeOut' }}
                    />
                    {!reduce && (
                      <motion.path
                        d={beam(s)}
                        fill="none"
                        stroke="url(#splash-beam)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0.25, pathOffset: 0, opacity: 0 }}
                        animate={{ pathOffset: [0, 1], opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.1, delay: s.d + 0.5, repeat: 1, repeatDelay: 0.25, ease: 'easeInOut' }}
                      />
                    )}
                  </g>
                ))}
              </svg>

              {/* pin usaha kecil */}
              {SHOPS.map((s) => <ShopBadge key={s.emoji} s={s} reduce={reduce} />)}

              {/* logo pin utama */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {!reduce && [0, 1].map((i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: [0.6, 2.4], opacity: [0, 0.45, 0] }}
                    transition={{ duration: 1.6, delay: 1.25 + i * 0.5, ease: 'easeOut' }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-yellow-500"
                    aria-hidden="true"
                  />
                ))}
                <MainPin reduce={reduce} />
              </div>
            </div>

            {/* wordmark: huruf muncul dari blur ke tajam */}
            <h1 className="relative mt-2 flex font-heading font-extrabold text-4xl sm:text-5xl tracking-tight text-blue-50" aria-label="PesanLokal">
              {'PesanLokal'.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.45, delay: 1.05 + i * 0.04, ease: 'easeOut' }}
                  aria-hidden="true"
                >
                  {ch}
                </motion.span>
              ))}
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 12, delay: 1.5 }}
                className="text-yellow-500"
                aria-hidden="true"
              >
                .
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.5 }}
              className="relative mt-3 text-sm sm:text-base text-blue-300 text-center"
            >
              Etalase digital usaha lokal di sekitarmu
            </motion.p>

            {/* progres muat */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-44 flex flex-col items-center gap-3" aria-hidden="true">
              <div className="w-full h-1 rounded-full bg-navy-700 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-300 origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: (reduce ? 900 : DURATION) / 1000 - 0.15, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-[11px] font-semibold tracking-[0.2em] uppercase text-navy-500">
                Menyiapkan peta
              </motion.p>
            </div>

            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={(e) => { e.stopPropagation(); finish(); }}
              className="absolute top-5 right-5 text-xs font-semibold text-blue-300 hover:text-blue-50 border border-navy-600 hover:border-blue-300 px-3.5 py-2 rounded-full transition-colors"
            >
              Lewati
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
