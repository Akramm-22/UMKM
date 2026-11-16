import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin } from 'lucide-react';

// splash hanya sekali per sesi tab, agar navigasi internal tidak memunculkannya lagi
const SEEN_KEY = 'pl_splash_seen';

export default function SplashScreen() {
  const [show, setShow] = useState(() => !sessionStorage.getItem(SEEN_KEY));

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      sessionStorage.setItem(SEEN_KEY, '1');
      setShow(false);
    }, 2400);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(t);
    };
  }, [show]);

  useEffect(() => {
    if (!show) document.body.style.overflow = '';
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ y: '-100%' }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] bg-navy-900 flex flex-col items-center justify-center overflow-hidden"
          aria-label="PesanLokal sedang dimuat"
        >
          {/* liquid blob dekoratif */}
          <div className="blob-morph absolute -top-24 -left-20 w-80 h-80 bg-navy-700/50 pointer-events-none" aria-hidden="true" />
          <div className="blob-morph-slow absolute -bottom-28 -right-20 w-96 h-96 bg-yellow-500/10 pointer-events-none" aria-hidden="true" />
          <div className="absolute inset-0 bg-dots opacity-[0.07] pointer-events-none" aria-hidden="true" />

          {/* pin + gelombang ping lokasi */}
          <div className="relative flex items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 2.6], opacity: [0, 0.35, 0] }}
                transition={{ duration: 2, delay: 0.5 + i * 0.55, repeat: Infinity, ease: 'easeOut' }}
                className="absolute w-24 h-24 rounded-full border-2 border-yellow-500"
                aria-hidden="true"
              />
            ))}
            <motion.div
              initial={{ y: -90, scale: 0.6, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
              className="relative"
            >
              <motion.div
                animate={{ y: [0, -9, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                className="relative w-24 h-24 -rotate-45 flex items-center justify-center"
                style={{
                  borderRadius: '50% 50% 50% 8px',
                  background: 'linear-gradient(135deg, #FFE066 0%, #FFC914 48%, #E6B000 100%)',
                  boxShadow:
                    'inset 3px 3px 8px rgba(255,255,255,.65), inset -6px -8px 14px rgba(160,120,0,.45), 0 22px 40px rgba(10,20,40,.55), 0 6px 14px rgba(255,201,20,.35)',
                }}
              >
                {/* kilau glossy di pundak pin */}
                <span
                  className="absolute top-2.5 left-3 w-8 h-5 rounded-full pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,0))', filter: 'blur(1px)', transform: 'rotate(18deg)' }}
                  aria-hidden="true"
                />
                {/* bola navy 3D di tengah */}
                <span
                  className="rotate-45 w-11 h-11 rounded-full flex items-center justify-center text-yellow-400"
                  style={{
                    background: 'radial-gradient(circle at 32% 28%, #3A5680 0%, #16294F 55%, #0A1428 100%)',
                    boxShadow: 'inset 2px 3px 5px rgba(255,255,255,.25), inset -3px -5px 8px rgba(0,0,0,.55), 0 3px 8px rgba(10,20,40,.45)',
                  }}
                >
                  <MapPin size={22} strokeWidth={2.5} />
                </span>
              </motion.div>
              {/* bayangan tanah ikut mengecil saat pin naik */}
              <motion.span
                animate={{ scaleX: [1, 0.72, 1], opacity: [0.5, 0.3, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-16 h-3 bg-navy-900 rounded-full"
                style={{ filter: 'blur(4px)' }}
                aria-hidden="true"
              />
            </motion.div>
          </div>

          {/* wordmark muncul huruf per huruf */}
          <div className="flex mt-9 font-heading font-extrabold text-3xl text-blue-50" aria-hidden="true">
            {'PesanLokal'.split('').map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.55 + i * 0.045, ease: 'easeOut' }}
              >
                {ch}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 1.1 }}
              className="text-yellow-500"
            >
              .
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
