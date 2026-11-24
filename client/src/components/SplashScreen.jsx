import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

// splash hanya sekali per sesi tab, agar navigasi internal tidak memunculkannya lagi
const SEEN_KEY = 'pl_splash_seen';
const DURATION = 4300;
const EASE = [0.76, 0, 0.24, 1];
const BG = '#16294F';
const INK = '#F4F8FC';
const YELLOW = '#FFC914';

// babak: kurir melintas di depan pasar → adegan turun → logo dirakit → titik muat
const T = { rideIn: 0.35, rideOut: 1.85, sceneOut: 2.3, logo: 2.55, dots: 3.35 };

const CLOUD = 'M0 14h10c0-6 5-10 11-9 2-4 6-6 10-5 5 1 8 5 8 9 4 0 7 2 7 5H62';
const CLOUDS = [
  { x: '8%', y: '12%', w: 84, lines: [[-40, 18, 30], [70, 6, 26]], d: 0 },
  { x: '72%', y: '19%', w: 70, lines: [[-30, 22, 24], [60, 4, 40]], d: 0.15 },
  { x: '58%', y: '6%', w: 52, lines: [[50, 12, 28]], d: 0.3 },
  { x: '14%', y: '80%', w: 76, lines: [[-36, 20, 30], [66, 10, 36]], d: 0.2 },
  { x: '68%', y: '88%', w: 64, lines: [[-40, 18, 26], [56, 6, 22]], d: 0.35 },
];
const SPARKS = [
  { x: '22%', y: '28%', r: 5, d: 0.4 },
  { x: '84%', y: '34%', r: 4, d: 0.9 },
  { x: '40%', y: '16%', r: 3, d: 1.3 },
  { x: '90%', y: '70%', r: 5, d: 0.6 },
  { x: '6%', y: '58%', r: 4, d: 1.1 },
  { x: '50%', y: '92%', r: 3, d: 0.2 },
];
const BUNTING = ['#FFC914', '#E05252', '#F4F8FC', '#4A90D9'];
const SKIN = '#E8B98A';

// siluet kota di kejauhan + matahari sore: memberi kedalaman di belakang pasar
function Backdrop({ reduce }) {
  return (
    <g>
      <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        {[86, 66, 48].map((r, i) => <circle key={r} cx="182" cy="128" r={r} fill={YELLOW} opacity={0.05 + i * 0.04} />)}
        <circle cx="182" cy="128" r="32" fill={YELLOW} opacity=".9" />
      </motion.g>
      <motion.g
        initial={{ y: 40, opacity: 0 }}
        animate={reduce ? { y: 0, opacity: 1 } : { y: 0, opacity: 1, x: [0, -10] }}
        transition={{ y: { duration: 0.9, delay: 0.05, ease: 'easeOut' }, opacity: { duration: 0.6 }, x: { duration: 2.4, ease: 'linear' } }}
        fill="#22396A"
      >
        <path d="M-10 230V150h22v-16h14v16h18v-36h26v30h12v-22h20v74z" />
        <path d="M250 230v-70h16v-24h20v18h18v-34h24v40h14v-12h28v82z" />
        <rect x="118" y="158" width="12" height="72" />
        <rect x="232" y="150" width="14" height="80" />
        {[[0, 160], [30, 150], [72, 128], [262, 168], [306, 140], [340, 160]].map(([x, y], i) => (
          <rect key={i} x={x + 4} y={y + 6} width="4" height="5" fill={YELLOW} opacity=".35" />
        ))}
      </motion.g>
    </g>
  );
}

// umbul-umbul segitiga yang bergoyang di antara ruko
function Bunting({ reduce }) {
  const flags = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return { x: 40 + t * 280, y: 150 + Math.sin(t * Math.PI) * 18, c: BUNTING[i % BUNTING.length] };
  });
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}>
      <path d="M40 150 Q 180 186 320 150" fill="none" stroke={INK} strokeOpacity=".5" strokeWidth="0.8" />
      {flags.map((f, i) => (
        <motion.path
          key={i}
          d={`M${f.x - 4} ${f.y}h8l-4 9z`}
          fill={f.c}
          initial={{ scaleY: 0 }}
          animate={reduce ? { scaleY: 1 } : { scaleY: 1, rotate: [0, 6, -4, 0] }}
          transition={{ scaleY: { type: 'spring', stiffness: 400, damping: 14, delay: 0.55 + i * 0.03 }, rotate: { duration: 1.6, delay: 0.9 + i * 0.05, repeat: Infinity, ease: 'easeInOut' } }}
          style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}
        />
      ))}
    </motion.g>
  );
}

// gerobak pedagang yang sedang melayani pembeli
function VendorCart({ reduce }) {
  return (
    <motion.g initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.45 }}>
      <ellipse cx="270" cy="231" rx="40" ry="3" fill="#0A1428" opacity=".35" />
      {/* pedagang di balik gerobak */}
      <motion.g animate={reduce ? undefined : { y: [0, -1.2, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>
        <rect x="281" y="200" width="14" height="16" rx="5" fill="#E05252" />
        <circle cx="288" cy="194" r="6" fill={SKIN} />
        <path d="M281 192a7 7 0 0 1 14 0z" fill="#0A1428" />
      </motion.g>
      {/* payung gerobak */}
      <rect x="275" y="176" width="1.6" height="36" fill={INK} />
      <path d="M250 182a26 12 0 0 1 52 0z" fill={YELLOW} />
      <path d="M263 182a13 12 0 0 1 26 0z" fill="#E05252" opacity=".85" />
      {/* badan gerobak */}
      <rect x="256" y="210" width="44" height="15" rx="2" fill={INK} />
      <rect x="256" y="210" width="44" height="4" fill="#D6E6F2" />
      <rect x="262" y="216" width="20" height="6" rx="1" fill={YELLOW} />
      <circle cx="264" cy="227" r="4" fill="#0A1428" />
      <circle cx="292" cy="227" r="4" fill="#0A1428" />
      {/* pembeli menerima pesanan */}
      <motion.g animate={reduce ? undefined : { y: [0, -1, 0] }} transition={{ duration: 1.5, delay: 0.3, repeat: Infinity, ease: 'easeInOut' }}>
        <rect x="236" y="204" width="13" height="18" rx="5" fill="#4A90D9" />
        <rect x="238" y="220" width="4" height="10" fill="#0A1428" />
        <rect x="244" y="220" width="4" height="10" fill="#0A1428" />
        <circle cx="242.5" cy="197" r="6" fill={SKIN} />
        <path d="M236.5 196a6 6 0 0 1 12 0z" fill="#0A1428" />
        <path d="M247 210l9 1" stroke={SKIN} strokeWidth="3" strokeLinecap="round" />
      </motion.g>
      {/* hati kecil: transaksi berhasil */}
      {!reduce && (
        <motion.path
          d="M262 200c-2-3-7-2-6 2 1 3 6 6 6 6s5-3 6-6c1-4-4-5-6-2z"
          fill="#E05252"
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], y: [0, -14, -22], scale: [0, 1.1, 0.9] }}
          transition={{ duration: 1.3, delay: 1.1, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      )}
    </motion.g>
  );
}

function Clouds({ reduce }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {SPARKS.map((s, i) => (
        <motion.svg
          key={`s${i}`}
          viewBox="-10 -10 20 20"
          className="absolute"
          style={{ left: s.x, top: s.y, width: s.r * 2, height: s.r * 2 }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={reduce ? { opacity: 0.6, scale: 1 } : { opacity: [0, 0.9, 0.2, 0.8], scale: [0.4, 1, 0.7, 1] }}
          transition={{ duration: 2.4, delay: s.d, repeat: Infinity, repeatType: 'mirror' }}
        >
          <path d="M0-10C1 -2 2 -1 10 0C2 1 1 2 0 10C-1 2-2 1-10 0C-2-1-1-2 0-10z" fill={i % 2 ? YELLOW : INK} />
        </motion.svg>
      ))}
      {CLOUDS.map((c, i) => (
        <motion.svg
          key={i}
          viewBox="-50 -10 170 40"
          className="absolute overflow-visible"
          style={{ left: c.x, top: c.y, width: c.w * 1.9 }}
          initial={{ opacity: 0, x: 20 }}
          animate={reduce ? { opacity: 0.45, x: 0 } : { opacity: 0.45, x: [20, -26] }}
          transition={{ opacity: { duration: 0.8, delay: c.d }, x: { duration: 6, delay: c.d, ease: 'linear' } }}
        >
          <path d={CLOUD} fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          {c.lines.map(([x, y, w], j) => <line key={j} x1={x} y1={y} x2={x + w} y2={y} stroke={INK} strokeWidth="1.2" strokeLinecap="round" />)}
        </motion.svg>
      ))}
    </div>
  );
}

// deretan usaha kampung: dua ruko berkanopi mengapit pendopo pasar
function Market() {
  const rise = (d) => ({
    initial: { scaleY: 0, opacity: 0 },
    animate: { scaleY: 1, opacity: 1 },
    transition: { type: 'spring', stiffness: 170, damping: 17, delay: d },
    style: { originY: 1, transformBox: 'fill-box' },
  });
  return (
    <g>
      {/* ruko kiri */}
      <motion.g {...rise(0.1)}>
        <rect x="52" y="168" width="70" height="62" fill={INK} />
        <rect x="52" y="160" width="70" height="8" fill="#D6E6F2" />
        <path d="M48 176h78l-6 14H54z" fill={YELLOW} />
        {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${54 + i * 11} 190l3-14h6l-3 14z`} fill={INK} opacity=".9" />)}
        <rect x="60" y="198" width="22" height="32" rx="2" fill={BG} opacity=".85" />
        <rect x="92" y="198" width="22" height="18" rx="2" fill="#8FBEDC" />
      </motion.g>
      {/* ruko kanan */}
      <motion.g {...rise(0.2)}>
        <rect x="238" y="172" width="66" height="58" fill={INK} />
        <rect x="238" y="164" width="66" height="8" fill="#D6E6F2" />
        <path d="M234 180h74l-6 14h-62z" fill="#E05252" />
        {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${241 + i * 12} 194l3-14h6l-3 14z`} fill={INK} opacity=".9" />)}
        <rect x="246" y="202" width="20" height="16" rx="2" fill="#8FBEDC" />
        <rect x="276" y="200" width="20" height="30" rx="2" fill={BG} opacity=".85" />
      </motion.g>
      {/* pendopo pasar beratap tumpang */}
      <motion.g {...rise(0)}>
        <rect x="134" y="166" width="96" height="64" fill={INK} />
        <path d="M112 168h140l-30-24h-80z" fill={INK} />
        <path d="M112 168h140l-4 4H116z" fill="#D6E6F2" />
        <path d="M150 144h64l-16-22h-32z" fill={INK} />
        <path d="M166 122h32l-16-18z" fill={INK} />
        <circle cx="182" cy="101" r="3" fill={YELLOW} />
        <rect x="170" y="190" width="24" height="40" rx="12" fill={BG} opacity=".85" />
        <rect x="144" y="184" width="16" height="22" rx="8" fill="#8FBEDC" />
        <rect x="204" y="184" width="16" height="22" rx="8" fill="#8FBEDC" />
        <rect x="160" y="172" width="44" height="8" rx="2" fill={YELLOW} />
      </motion.g>
    </g>
  );
}

function Wheel({ cx, reduce }) {
  return (
    <g transform={`translate(${cx} 40)`}>
      <circle r="7.5" fill="#0A1428" />
      <circle r="3.2" fill={INK} />
      <motion.g animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 0.35, repeat: Infinity, ease: 'linear' }}>
        <line x1="-5.5" y1="0" x2="5.5" y2="0" stroke="#3A5680" strokeWidth="1.2" />
      </motion.g>
    </g>
  );
}

// kurir PesanLokal dengan kotak antar
function Scooter({ reduce }) {
  return (
    <motion.g
      initial={{ x: -110 }}
      animate={reduce ? { x: 150 } : { x: [-110, 150, 150, 440] }}
      transition={{ duration: T.rideOut + 0.55 - T.rideIn, delay: T.rideIn, times: [0, 0.45, 0.72, 1], ease: ['easeOut', 'linear', 'easeIn'] }}
    >
      <g transform="translate(0 182) scale(1.35)">
      <ellipse cx="31" cy="48" rx="30" ry="2.6" fill="#0A1428" opacity=".45" />
      {/* kepulan debu saat tancap gas */}
      {!reduce && [0, 1, 2].map((i) => (
        <motion.circle
          key={`d${i}`} cx={-4 - i * 7} cy={44 - i * 2} r={3 + i}
          fill={INK}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0, 1, 1.6], x: [0, -10] }}
          transition={{ duration: 0.7, delay: T.rideIn + 1.45 + i * 0.07, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}
      {/* gelembung pesanan saat kurir berhenti */}
      {!reduce && (
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.1, 1, 0.8] }}
          transition={{ duration: 0.95, delay: T.rideIn + 0.85, times: [0, 0.25, 0.8, 1] }}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom center' }}
        >
          <rect x="6" y="-26" width="52" height="17" rx="8.5" fill={INK} />
          <path d="M28 -9.5l4 5 4-5z" fill={INK} />
          <circle cx="15" cy="-17.5" r="5" fill={YELLOW} />
          <path d="M13 -18.5h4l-.4 3h-3.2z" fill={BG} />
          <text x="23" y="-14.5" fontSize="7.5" fontWeight="800" fill={BG} fontFamily="Plus Jakarta Sans, sans-serif">+1 order</text>
        </motion.g>
      )}
      <motion.g animate={reduce ? undefined : { y: [0, -1.4, 0] }} transition={{ duration: 0.3, repeat: Infinity }}>
        {/* garis kecepatan */}
        {[0, 1, 2].map((i) => (
          <motion.line
            key={i} x1={-14 - i * 6} y1={14 + i * 9} x2={-36 - i * 10} y2={14 + i * 9}
            stroke={INK} strokeWidth="1.6" strokeLinecap="round"
            animate={reduce ? { opacity: 0 } : { opacity: [0, 0.8, 0], x: [6, -6] }}
            transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
        {/* kotak antar */}
        <rect x="-2" y="2" width="24" height="20" rx="3" fill={YELLOW} />
        <path d="M10 7.5a3.6 3.6 0 0 1 3.6 3.6c0 2.6-3.6 5.6-3.6 5.6s-3.6-3-3.6-5.6A3.6 3.6 0 0 1 10 7.5z" fill={BG} />
        {/* pengendara */}
        <path d="M26 30l6-16h8l4 16z" fill={INK} />
        <circle cx="36" cy="7" r="7" fill={YELLOW} />
        <path d="M37 3.5h6.5a6 6 0 0 1-1.5 5H37z" fill="#0A1428" opacity=".8" />
        <path d="M38 18l12 6" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        {/* bodi skuter */}
        <path d="M4 34c0-6 6-9 14-9h12l6 6h10l6-14h5l-5 17c4 1 7 4 7 8H4z" fill="#E05252" />
        <path d="M50 17h6" stroke="#0A1428" strokeWidth="2.4" strokeLinecap="round" />
        <Wheel cx={10} reduce={reduce} />
        <Wheel cx={52} reduce={reduce} />
      </motion.g>
      </g>
    </motion.g>
  );
}

function Scene({ reduce }) {
  return (
    <motion.svg
      viewBox="0 0 360 290"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%] w-[min(118vw,34rem,110vh)] h-auto overflow-visible"
      initial={{ opacity: 1, y: 0 }}
      animate={reduce ? { opacity: 0 } : { opacity: [1, 1, 0], y: [0, 0, 70] }}
      transition={reduce ? { duration: 0.2 } : { duration: T.sceneOut + 0.45, times: [0, T.sceneOut / (T.sceneOut + 0.45), 1], ease: 'easeIn' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="splash-road"><rect x="-200" y="230" width="760" height="40" /></clipPath>
      </defs>
      <Backdrop reduce={reduce} />
      <Market />
      <Bunting reduce={reduce} />
      <VendorCart reduce={reduce} />
      {/* jalan dengan marka yang bergulir */}
      <motion.rect x="-200" y="230" width="760" height="38" fill="#0F1E38" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} style={{ originX: 0.5, transformBox: 'fill-box' }} />
      <rect x="-200" y="230" width="760" height="2" fill="#3A5680" />
      <g clipPath="url(#splash-road)">
        <motion.g animate={reduce ? undefined : { x: [0, -40] }} transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}>
          {Array.from({ length: 22 }, (_, i) => <rect key={i} x={-200 + i * 40} y="248" width="20" height="2.4" rx="1.2" fill={INK} opacity=".55" />)}
        </motion.g>
      </g>
      <Scooter reduce={reduce} />
    </motion.svg>
  );
}

// wordmark "pesan lokal": huruf o menjadi roda/penanda lokasi seperti logo referensi
function Wordmark({ reduce }) {
  const d0 = reduce ? 0 : T.logo;
  const letter = (i) => ({
    initial: { opacity: 0, y: reduce ? 0 : 26, scale: reduce ? 1 : 0.6 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: 'spring', stiffness: 420, damping: 18, delay: d0 + 0.05 + i * 0.05 },
  });
  const left = 'pesan'.split('');
  return (
    <h1 className="relative flex items-end font-heading font-extrabold lowercase tracking-tight text-[3.25rem] sm:text-7xl leading-none" style={{ color: INK }} aria-label="PesanLokal">
      {left.map((ch, i) => <motion.span key={`a${i}`} {...letter(i)} className="inline-block" aria-hidden="true">{ch}</motion.span>)}
      <motion.span {...letter(5)} className="inline-block w-[0.18em]" aria-hidden="true" />
      <motion.span {...letter(6)} className="inline-block" aria-hidden="true">l</motion.span>

      {/* o = roda yang menggelinding masuk, lalu pin muncul di atasnya */}
      <motion.span
        className="relative inline-block w-[0.58em] h-[0.58em] mx-[0.03em] mb-[0.1em]"
        initial={{ x: reduce ? 0 : '-2.6em', rotate: reduce ? 0 : -540, opacity: 0 }}
        animate={{ x: 0, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.75, delay: d0, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
          <circle cx="50" cy="50" r="38" fill="none" stroke={INK} strokeWidth="20" />
          <motion.circle
            cx="50" cy="50" r="17" fill={YELLOW}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14, delay: d0 + 0.7 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        </svg>
        <motion.span
          className="absolute left-1/2 bottom-full w-[0.42em] -ml-[0.06em] mb-[0.02em] origin-bottom-left"
          initial={{ scaleY: 0, rotate: 0 }}
          animate={reduce ? { scaleY: 1 } : { scaleY: 1, rotate: [0, -12, 6, 0] }}
          transition={{ scaleY: { type: 'spring', stiffness: 520, damping: 15, delay: d0 + 0.85 }, rotate: { duration: 0.9, delay: d0 + 1.05 } }}
        >
          <svg viewBox="0 0 40 44" className="w-full h-auto overflow-visible">
            <rect x="0" y="4" width="4" height="40" rx="2" fill={INK} />
            <path d="M4 4h26l-6 8 6 8H4z" fill={YELLOW} />
          </svg>
        </motion.span>
      </motion.span>

      {'kal'.split('').map((ch, i) => <motion.span key={`b${i}`} {...letter(7 + i)} className="inline-block" aria-hidden="true">{ch}</motion.span>)}
    </h1>
  );
}

// titik muat: mengecil ke kanan seperti referensi, menyala bergantian
function LoadingDots({ reduce }) {
  const sizes = [9, 8, 7, 6, 5];
  return (
    <motion.div
      className="relative mt-9 flex items-center gap-2.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: reduce ? 0 : T.dots, duration: 0.3 }}
      aria-hidden="true"
    >
      {sizes.map((s, i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{ width: s, height: s, background: INK }}
          initial={{ scale: 0 }}
          animate={reduce ? { scale: 1 } : { scale: [0, 1, 1, 1.35, 1], opacity: [0, 1, 1, 1, 0.75] }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, delay: T.dots + i * 0.08, times: [0, 0.2, 0.45, 0.6, 1], repeat: Infinity, repeatDelay: 0.1 }}
        />
      ))}
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
    const t = setTimeout(finish, reduce ? 1200 : DURATION);
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
            className="absolute inset-0 overflow-hidden"
            style={{ background: BG }}
            exit={{ y: '-100%', transition: { duration: 0.6, ease: EASE } }}
            onClick={finish}
          >
            <Clouds reduce={reduce} />
            {!reduce && <Scene reduce={reduce} />}

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
              {/* cahaya lembut di belakang logo saat roda mendarat */}
              <motion.div
                className="absolute w-[34rem] h-[34rem] max-w-[120vw] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,201,20,.16) 0%, rgba(255,201,20,0) 60%)' }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: reduce ? 0 : T.logo + 0.5, ease: 'easeOut' }}
                aria-hidden="true"
              />
              {!reduce && (
                <motion.span
                  className="absolute w-40 h-40 rounded-full border-2 border-yellow-500/60 pointer-events-none"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 0.8, 0], scale: [0.3, 2.4] }}
                  transition={{ duration: 1.1, delay: T.logo + 0.7, ease: 'easeOut' }}
                  aria-hidden="true"
                />
              )}
              <Wordmark reduce={reduce} />
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0.1 : T.logo + 0.9, duration: 0.45 }}
                className="relative mt-4 text-sm sm:text-base text-blue-300 text-center"
              >
                Etalase digital <span className="text-yellow-400 font-semibold">usaha lokal</span> di sekitarmu
              </motion.p>
              <LoadingDots reduce={reduce} />
            </div>

            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={(e) => { e.stopPropagation(); finish(); }}
              className="absolute top-5 right-5 text-xs font-semibold text-blue-200 hover:text-white border border-white/20 hover:border-white/60 px-3.5 py-2 rounded-full transition-colors"
            >
              Lewati
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
