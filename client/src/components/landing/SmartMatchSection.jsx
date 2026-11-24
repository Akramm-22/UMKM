import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, animate, useReducedMotion, useInView } from 'motion/react';
import {
  Sparkles, MapPin, Wallet, Clock, Star, Bike, BadgeCheck, Heart, AlertTriangle, LocateFixed,
  ArrowRight, ArrowLeft, RotateCcw, Search, Loader2, Database, FlaskConical, X, Navigation, Check, Radar as RadarIcon,
} from 'lucide-react';
import SectionTag from './SectionTag.jsx';
import { findMatches, currentOrigin, localCandidates, rankBusinesses, cleanPrefs, DEFAULT_ORIGIN } from '../../lib/matching.js';
import { KINDS, kindOf, fmtDistance } from '../../lib/demoPlaces.js';
import { getFavorites, toggleFavorite } from '../../lib/place.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Ref: Typeform/Duolingo (satu pertanyaan per layar), Akinator (kandidat menyusut tiap jawaban),
// Hinge "Most Compatible" & Spotify Blend (reveal skor), Tinder (tumpukan kartu alternatif).

const PREFS_KEY = 'pl_match_prefs';
const DEFAULT_PREFS = { need: null, keyword: '', budget: 'bebas', maxKm: 2, mode: 'any', priorities: [] };

const STEPS = [
  {
    key: 'need', q: 'Lagi butuh apa?', sub: 'Pilih yang paling mendesak sekarang.',
    options: [
      { value: 'makan', emoji: '🍛', label: 'Makan berat', hint: 'Nasi, sate, bakso' },
      { value: 'minum', emoji: '🧋', label: 'Minum & nongkrong', hint: 'Kopi, es teh, jus' },
      { value: 'jajan', emoji: '🍢', label: 'Jajanan', hint: 'Gorengan, martabak' },
      { value: 'belanja', emoji: '🛒', label: 'Belanja kebutuhan', hint: 'Sembako, galon, pulsa' },
      { value: 'jasa', emoji: '🔧', label: 'Jasa & servis', hint: 'Laundry, jahit, bengkel' },
      { value: null, emoji: '✨', label: 'Apa saja', hint: 'Kejutkan aku' },
    ],
  },
  {
    key: 'budget', q: 'Budget-nya berapa?', sub: 'Per orang atau per item.',
    options: [
      { value: 'hemat', emoji: '🪙', label: 'Hemat', hint: '≤ Rp20rb' },
      { value: 'sedang', emoji: '💵', label: 'Sedang', hint: '≤ Rp50rb' },
      { value: 'bebas', emoji: '💎', label: 'Bebas', hint: 'Asal cocok' },
    ],
  },
  {
    key: 'maxKm', q: 'Mau sejauh apa?', sub: 'Radar menyesuaikan jangkauanmu.',
    options: [
      { value: 0.5, emoji: '🚶', label: '500 m', hint: '± 6 menit jalan' },
      { value: 1, emoji: '🚲', label: '1 km', hint: '± 5 menit sepeda' },
      { value: 2, emoji: '🛵', label: '2 km', hint: '± 6 menit motor' },
      { value: 5, emoji: '🚗', label: '5 km', hint: 'Sekalian jalan' },
    ],
  },
  {
    key: 'mode', q: 'Dapetinnya gimana?', sub: 'Kami cek layanan tiap usaha.',
    options: [
      { value: 'dine_in', emoji: '🪑', label: 'Di tempat', hint: 'Duduk santai' },
      { value: 'takeaway', emoji: '🥡', label: 'Bawa pulang', hint: 'Bungkus' },
      { value: 'delivery', emoji: '🛵', label: 'Diantar', hint: 'Pesan via WhatsApp' },
      { value: 'pickup', emoji: '🏃', label: 'Ambil sendiri', hint: 'Mampir sebentar' },
      { value: 'any', emoji: '🤷', label: 'Bebas', hint: 'Yang penting cocok' },
    ],
  },
  { key: 'extra', q: 'Ada yang wajib?', sub: 'Opsional — boleh pilih beberapa.' },
];

const PRIORITY_OPTS = [
  { value: 'open', emoji: '⏰', label: 'Buka sekarang' },
  { value: 'promo', emoji: '🏷️', label: 'Ada promo' },
  { value: 'rating', emoji: '⭐', label: 'Rating tinggi' },
  { value: 'wifi', emoji: '📶', label: 'Ada Wi-Fi' },
  { value: 'qris', emoji: '📱', label: 'Bisa QRIS' },
  { value: 'parking', emoji: '🅿️', label: 'Ada parkir' },
];

const REASON_ICONS = { match: Sparkles, distance: MapPin, budget: Wallet, open: Clock, rating: Star, mode: Bike, bonus: BadgeCheck, liked: Heart };
const FACTORS = [['relevance', 'Kebutuhan'], ['distance', 'Jarak'], ['budget', 'Budget'], ['open', 'Jam buka'], ['rating', 'Rating'], ['mode', 'Layanan']];
const SCAN_LINES = ['Membaca preferensimu…', 'Memindai usaha terverifikasi…', 'Mengecek jam buka & harga…', 'Menyusun alasan…'];

function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') };
  } catch {
    return DEFAULT_PREFS;
  }
}

function likedKinds(list, favIds) {
  const tally = {};
  list.filter((b) => favIds.includes(b.id)).forEach((b) => { const k = kindOf(b); tally[k] = (tally[k] ?? 0) + 1; });
  return Object.keys(tally).sort((a, b) => tally[b] - tally[a]).slice(0, 2);
}

const verdict = (s) => (s >= 80 ? 'Sangat cocok' : s >= 60 ? 'Cocok' : 'Lumayan');

function useCountUp(target) {
  const [n, setN] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) { setN(target); return undefined; }
    const c = animate(0, target, { duration: 1.1, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [target, reduce]);
  return n;
}

// ── radar sekitar: titik usaha diproyeksikan dari lat/lng relatif ke posisi pengguna ──
function Radar({ origin, maxKm, pins, scanning }) {
  const R = maxKm * 1.25;
  const kmX = 111.32 * Math.cos((origin[0] * Math.PI) / 180);
  const place = (b) => {
    let x = ((b.longitude - origin[1]) * kmX) / R;
    let y = ((b.latitude - origin[0]) * 110.57) / R;
    const d = Math.hypot(x, y);
    if (d > 0.9) { x *= 0.9 / d; y *= 0.9 / d; }
    return { left: `${50 + x * 50}%`, top: `${50 - y * 50}%`, out: d > 0.9 };
  };
  return (
    <div className="relative aspect-square w-full max-w-sm mx-auto rounded-full bg-navy-900 ring-1 ring-blue-400/20 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(74,144,217,.18)_1px,transparent_1px)] [background-size:18px_18px]" aria-hidden="true" />
      {[maxKm / 2, maxKm].map((km) => (
        <div key={km} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-blue-400/30 transition-all duration-500" style={{ width: `${(km / R) * 100}%`, height: `${(km / R) * 100}%` }}>
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-navy-900 px-1.5 text-[9px] font-bold text-blue-300">{fmtDistance(km)}</span>
        </div>
      ))}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-400/10" aria-hidden="true" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400/10" aria-hidden="true" />
      {/* sapuan sonar */}
      <motion.div
        className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(255,201,20,.32),rgba(255,201,20,0)_22%,transparent_100%)]"
        animate={{ rotate: 360 }}
        transition={{ duration: scanning ? 1.4 : 5, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      />
      {pins.map((p) => {
        const pos = place(p.b);
        const on = p.state !== 'dim' && !pos.out;
        return (
          <motion.div
            key={p.b.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            initial={false}
            animate={{ left: pos.left, top: pos.top, opacity: on ? 1 : 0.28, scale: p.state === 'top' ? 1.25 : on ? 1 : 0.8 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            style={{ zIndex: p.state === 'top' ? 3 : on ? 2 : 1 }}
            title={p.b.name}
          >
            {p.state === 'top' && <span className="absolute inset-0 rounded-full bg-yellow-500 animate-ping opacity-60" aria-hidden="true" />}
            <span className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg ${p.state === 'top' ? 'bg-yellow-500 ring-2 ring-white' : on ? 'bg-white' : 'bg-blue-300 grayscale'}`}>
              {KINDS[kindOf(p.b)].emoji}
            </span>
            {p.rank && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-navy-800 text-yellow-500 text-[9px] font-extrabold flex items-center justify-center ring-1 ring-white">{p.rank}</span>}
          </motion.div>
        );
      })}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-info border-2 border-white shadow-[0_0_0_8px_rgba(74,144,217,.25)]" aria-label="Lokasimu" />
    </div>
  );
}

function FactorBars({ parts }) {
  if (!parts) return null;
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
      {FACTORS.map(([k, label], i) => (
        <div key={k}>
          <div className="flex justify-between text-[10px] font-bold text-blue-300"><span>{label}</span><span className="text-blue-50">{Math.round((parts[k] ?? 0) * 100)}</span></div>
          <div className="h-1.5 rounded-full bg-navy-700 mt-1 overflow-hidden">
            <motion.div className="h-full rounded-full bg-yellow-500" initial={{ width: 0 }} animate={{ width: `${(parts[k] ?? 0) * 100}%` }} transition={{ duration: 0.7, delay: 0.3 + i * 0.06 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TopMatch({ r, needEmoji, fav, onFav }) {
  const b = r.business;
  const n = useCountUp(r.score);
  const kind = KINDS[kindOf(b)];
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: 'easeOut' }} className="relative overflow-hidden bg-navy-800 text-blue-50 rounded-[1.75rem] p-5 sm:p-6">
      <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[radial-gradient(circle,rgba(255,201,20,.22),transparent_65%)] pointer-events-none" aria-hidden="true" />
      <p className="relative text-[11px] font-extrabold uppercase tracking-widest text-yellow-500 flex items-center gap-1.5"><Sparkles size={12} /> Match terbaikmu</p>
      <div className="relative flex items-center gap-5 mt-4">
        {/* dua lingkaran bertumpuk ala Spotify Blend: kamu × usaha */}
        <div className="relative flex shrink-0" aria-hidden="true">
          <motion.span initial={{ x: 14 }} animate={{ x: 0 }} transition={{ duration: 0.6 }} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-yellow-500 ring-4 ring-navy-800 flex items-center justify-center text-3xl">{needEmoji}</motion.span>
          <motion.img initial={{ x: -14 }} animate={{ x: 0 }} transition={{ duration: 0.6 }} src={b.photo} alt="" className="-ml-5 w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-navy-800 bg-navy-700" />
          <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-danger flex items-center justify-center shadow-lg"><Heart size={14} className="fill-danger" /></span>
        </div>
        <div className="min-w-0">
          <p className="font-heading font-extrabold text-5xl sm:text-6xl leading-none text-yellow-500" aria-label={`Skor ${r.score} dari 100`}>{n}<span className="text-2xl">%</span></p>
          <p className="text-xs font-bold text-blue-300 mt-1">{verdict(r.score)} untukmu</p>
        </div>
      </div>
      <div className="relative mt-5">
        <p className="font-heading font-extrabold text-xl leading-tight">{b.name}</p>
        <p className="text-xs text-blue-300 mt-1">{kind.emoji} {b.subcategory ?? kind.label} · {fmtDistance(r.distanceKm)}{b.rating ? ` · ★ ${b.rating}` : ''}</p>
      </div>
      <p className="relative text-[11px] font-extrabold uppercase tracking-widest text-blue-300 mt-5">Kenapa cocok</p>
      <ul className="relative mt-2 flex flex-wrap gap-2">
        {r.reasons.map((x, i) => {
          const Icon = REASON_ICONS[x.icon] ?? Sparkles;
          return (
            <motion.li key={x.text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }} className="flex items-center gap-1.5 bg-navy-700 rounded-full pl-1.5 pr-3 py-1 text-xs">
              <span className="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center"><Icon size={11} /></span>{x.text}
            </motion.li>
          );
        })}
        {r.caveats.slice(0, 1).map((t) => (
          <li key={t} className="flex items-center gap-1.5 bg-yellow-500/15 text-yellow-500 rounded-full pl-1.5 pr-3 py-1 text-xs">
            <span className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center"><AlertTriangle size={11} /></span>{t}
          </li>
        ))}
      </ul>
      <div className="relative mt-5 pt-5 border-t border-navy-700"><FactorBars parts={r.parts} /></div>
      <div className="relative flex gap-2 mt-5">
        <Link to={`/explore?usaha=${encodeURIComponent(b.id)}`} className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-sm font-heading font-extrabold py-3 rounded-xl transition-colors">
          <Navigation size={15} /> Rute ke sana
        </Link>
        {b.phone && (
          <a href={`https://wa.me/${String(b.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-sm font-bold px-4 rounded-xl transition-colors">WhatsApp</a>
        )}
        <button type="button" onClick={onFav} aria-pressed={fav} aria-label={fav ? 'Hapus dari favorit' : 'Simpan ke favorit'} className="w-12 rounded-xl bg-navy-700 hover:bg-navy-600 flex items-center justify-center transition-colors">
          <Heart size={17} className={fav ? 'text-danger fill-danger' : 'text-blue-50'} />
        </button>
      </div>
    </motion.div>
  );
}

// tumpukan kartu alternatif: geser kanan = simpan, geser kiri = lewati
function SwipeStack({ items, favs, onFav, onReset }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(0);
  const rest = items.slice(idx, idx + 3);
  const act = (d) => {
    const r = items[idx];
    if (!r) return;
    if (d > 0 && !favs.includes(r.business.id)) onFav(r.business.id);
    setDir(d);
    setIdx((i) => i + 1);
  };
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-widest text-navy-500">Alternatif lain</p>
        <p className="text-xs text-navy-500">{Math.min(idx + 1, items.length)}/{items.length}</p>
      </div>
      <div className="relative h-56 mt-3">
        <AnimatePresence custom={dir}>
          {rest.length ? rest.map((r, i) => {
            const b = r.business;
            const top = i === 0;
            return (
              <motion.div
                key={b.id}
                custom={dir}
                drag={top ? 'x' : false}
                dragSnapToOrigin
                onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 110) act(Math.sign(info.offset.x)); }}
                initial={{ scale: 0.9, y: 24, opacity: 0 }}
                animate={{ scale: 1 - i * 0.05, y: i * 12, opacity: 1 - i * 0.25, rotate: 0 }}
                exit={(d) => ({ x: d * 380, rotate: d * 14, opacity: 0, transition: { duration: 0.3 } })}
                whileDrag={{ rotate: 0, cursor: 'grabbing' }}
                style={{ zIndex: 10 - i }}
                className={`absolute inset-x-0 top-0 bg-white border border-blue-200 rounded-3xl p-4 shadow-xl shadow-navy-800/10 ${top ? 'cursor-grab touch-pan-y' : 'pointer-events-none'}`}
              >
                <div className="flex gap-3.5">
                  <img src={b.photo} alt="" draggable="false" loading="lazy" decoding="async" className="w-20 h-20 rounded-2xl object-cover bg-blue-100 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-heading font-extrabold leading-tight truncate">{b.name}</p>
                      <span className="shrink-0 bg-navy-800 text-yellow-500 text-xs font-extrabold px-2 py-0.5 rounded-full">{r.score}%</span>
                    </div>
                    <p className="text-xs text-navy-500 mt-0.5">{KINDS[kindOf(b)].emoji} {b.subcategory ?? KINDS[kindOf(b)].label} · {fmtDistance(r.distanceKm)}</p>
                    <ul className="mt-2 space-y-1">
                      {r.reasons.slice(0, 2).map((x) => <li key={x.text} className="text-xs text-navy-700 flex items-start gap-1.5"><Check size={13} className="text-success shrink-0 mt-px" />{x.text}</li>)}
                      {r.caveats.slice(0, 1).map((t) => <li key={t} className="text-xs text-navy-500 flex items-start gap-1.5"><AlertTriangle size={12} className="text-yellow-600 shrink-0 mt-px" />{t}</li>)}
                    </ul>
                  </div>
                </div>
                {top && <p className="text-[10px] text-navy-500 text-center mt-3">← geser untuk lewati · geser untuk simpan →</p>}
              </motion.div>
            );
          }) : (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center text-center border border-dashed border-blue-300 rounded-3xl p-6">
              <p className="font-heading font-extrabold">Sudah dilihat semua</p>
              <p className="text-xs text-navy-500 mt-1">Yang kamu simpan ada di favorit peta.</p>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => { setDir(0); setIdx(0); }} className="text-xs font-bold px-4 py-2 rounded-full border border-blue-200 hover:border-navy-500">Ulangi</button>
                <button type="button" onClick={onReset} className="text-xs font-bold px-4 py-2 rounded-full bg-navy-800 text-blue-50">Ubah jawaban</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {rest.length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button type="button" onClick={() => act(-1)} aria-label="Lewati" className="w-12 h-12 rounded-full bg-white border border-blue-200 shadow-md text-navy-500 hover:text-danger hover:border-danger flex items-center justify-center transition-colors focus-visible:rounded-full"><X size={20} /></button>
          <Link to={`/explore?usaha=${encodeURIComponent(rest[0].business.id)}`} aria-label="Lihat di peta" className="w-10 h-10 rounded-full bg-white border border-blue-200 shadow-md text-navy-700 hover:border-navy-500 flex items-center justify-center transition-colors"><MapPin size={16} /></Link>
          <button type="button" onClick={() => act(1)} aria-label="Simpan ke favorit" className="w-12 h-12 rounded-full bg-yellow-500 shadow-md shadow-yellow-500/30 text-navy-800 hover:bg-yellow-400 flex items-center justify-center transition-colors focus-visible:rounded-full"><Heart size={20} /></button>
        </div>
      )}
    </div>
  );
}

export default function SmartMatchSection() {
  const { user } = useAuth();
  const favKey = user?.id ?? 'guest';
  const reduce = useReducedMotion();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [step, setStep] = useState(0);
  const [back, setBack] = useState(false);
  const [phase, setPhase] = useState('quiz');
  const [out, setOut] = useState({ results: [], source: null });
  const [origin, setOrigin] = useState({ origin: DEFAULT_ORIGIN, precise: false });
  const [locating, setLocating] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const [favs, setFavs] = useState(() => getFavorites(favKey));
  const [candidates] = useState(localCandidates);
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef);
  const advancing = useRef(false);

  useEffect(() => { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }, [prefs]);

  useEffect(() => {
    if (phase !== 'loading') return undefined;
    const t = setInterval(() => setScanLine((i) => (i + 1) % SCAN_LINES.length), 450);
    return () => clearInterval(t);
  }, [phase]);

  // kandidat yang masih cocok, dihitung ulang setiap jawaban berubah (efek "menyusut")
  const live = useMemo(
    () => rankBusinesses(candidates, cleanPrefs(prefs), origin.origin, { limit: 50 }).filter((r) => r.distanceKm <= prefs.maxKm * 1.5),
    [candidates, prefs, origin]
  );
  const liveIds = useMemo(() => new Set(live.map((r) => r.business.id)), [live]);

  const pins = phase === 'results'
    ? candidates.map((b) => {
      const i = out.results.findIndex((r) => r.business.id === b.id);
      return { b, state: i === 0 ? 'top' : i > 0 ? 'match' : 'dim', rank: i >= 0 ? i + 1 : null };
    })
    : candidates.map((b) => ({ b, state: liveIds.has(b.id) ? 'match' : 'dim' }));

  const go = (n) => { setBack(n < step); setStep(Math.max(0, Math.min(STEPS.length - 1, n))); };
  const choose = (key, value) => {
    if (advancing.current) return;
    advancing.current = true;
    setPrefs((p) => ({ ...p, [key]: value }));
    setTimeout(() => { advancing.current = false; go(step + 1); }, reduce ? 0 : 260);
  };
  const togglePriority = (k) => setPrefs((p) => ({ ...p, priorities: p.priorities.includes(k) ? p.priorities.filter((x) => x !== k) : [...p.priorities, k] }));
  const toggleFav = (id) => setFavs(toggleFavorite(favKey, id));

  const locate = async () => {
    setLocating(true);
    setOrigin(await currentOrigin());
    setLocating(false);
  };

  const run = async (override) => {
    const p = override ?? prefs;
    setPhase('loading');
    const started = Date.now();
    const res = await findMatches({ ...p, likedKinds: likedKinds(candidates, favs) }, origin.origin);
    await new Promise((r) => setTimeout(r, Math.max(0, 1500 - (Date.now() - started))));
    setOut(res);
    setPhase('results');
  };

  const widen = () => {
    const next = { ...prefs, maxKm: prefs.maxKm < 5 ? [0.5, 1, 2, 5][[0.5, 1, 2, 5].indexOf(prefs.maxKm) + 1] : 5, budget: 'bebas' };
    setPrefs(next);
    run(next);
  };

  const restart = () => { setPhase('quiz'); setBack(true); setStep(0); };

  const onKey = (e) => {
    if (phase !== 'quiz' || ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const s = STEPS[step];
    const n = Number(e.key);
    if (s.options && n >= 1 && n <= s.options.length) { e.preventDefault(); choose(s.key, s.options[n - 1].value); }
  };
  const onKeyRef = useRef(onKey);
  useEffect(() => { onKeyRef.current = onKey; });

  // pintasan angka aktif hanya saat section terlihat
  useEffect(() => {
    if (!inView) return undefined;
    const h = (e) => onKeyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [inView]);

  const S = STEPS[step];
  const answer = (key) => {
    const s = STEPS.find((x) => x.key === key);
    return s.options.find((o) => o.value === prefs[key]);
  };
  const needEmoji = answer('need')?.emoji ?? '✨';
  const [top, ...others] = out.results;

  return (
    <section ref={sectionRef} id="smart-match" className="relative py-16 scroll-mt-24 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff_0%,#F2F8FC_100%)] pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-xl">
            <SectionTag n={<Sparkles size={15} />} label="Smart Matching" />
            <h2 className="font-heading font-extrabold text-2xl lg:text-3xl mt-3">
              Jawab 5 pertanyaan, <span className="italic text-yellow-600">temukan jodoh warungmu.</span>
            </h2>
            <p className="text-navy-500 text-sm mt-2">Radar menyaring usaha terverifikasi di sekitarmu setiap kali kamu menjawab — lalu menjelaskan kenapa hasilnya cocok.</p>
          </div>
          <p className="text-xs text-navy-500 flex items-center gap-1.5"><BadgeCheck size={14} className="text-success" /> Tanpa iklan berbayar · skor transparan</p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-6 mt-8 items-start">
          {/* ── radar + profil selera ── */}
          <div className="lg:col-span-5 relative bg-navy-800 text-blue-50 rounded-[2rem] p-5 sm:p-6 overflow-hidden lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-yellow-500 flex items-center gap-1.5"><RadarIcon size={13} /> Radar sekitar</p>
              <button type="button" onClick={locate} disabled={locating} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-300 hover:text-yellow-500 disabled:opacity-60 transition-colors">
                {locating ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />} {origin.precise ? 'Lokasimu' : 'Pakai lokasiku'}
              </button>
            </div>
            <div className="mt-4"><Radar origin={origin.origin} maxKm={prefs.maxKm} pins={pins} scanning={phase === 'loading'} /></div>
            <div className="mt-5 flex items-baseline gap-2" aria-live="polite">
              <AnimatePresence mode="popLayout">
                <motion.span key={phase === 'results' ? `r${out.results.length}` : live.length} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="font-heading font-extrabold text-4xl text-yellow-500">
                  {phase === 'results' ? out.results.length : live.length}
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-blue-300">
                {phase === 'results' ? 'rekomendasi terpilih' : <>dari {candidates.length} usaha masih cocok</>}
              </span>
            </div>
            <p className="text-[11px] text-blue-300/80 mt-0.5">{origin.precise ? 'Dari lokasimu saat ini' : 'Area pilot: Menteng, Jakarta Pusat'}</p>

            <div className="mt-5 pt-5 border-t border-navy-700">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-blue-300">Profil seleramu</p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {STEPS.slice(0, 4).map((s, i) => {
                  const a = answer(s.key);
                  return (
                    <button key={s.key} type="button" onClick={() => { setPhase('quiz'); go(i); }} className="flex items-center gap-1 bg-navy-700 hover:bg-navy-600 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors" title={`Ubah: ${s.q}`}>
                      <span>{a?.emoji ?? '·'}</span> {a?.label ?? '—'}
                    </button>
                  );
                })}
                {prefs.priorities.map((k) => {
                  const o = PRIORITY_OPTS.find((x) => x.value === k);
                  return <span key={k} className="flex items-center gap-1 bg-yellow-500/15 text-yellow-500 rounded-full px-2.5 py-1 text-xs font-semibold">{o.emoji} {o.label}</span>;
                })}
                {prefs.keyword && <span className="flex items-center gap-1 bg-blue-400/15 text-blue-200 rounded-full px-2.5 py-1 text-xs font-semibold"><Search size={11} /> {prefs.keyword}</span>}
              </div>
            </div>
          </div>

          {/* ── konsol kuis / hasil ── */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {phase === 'quiz' && (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="bg-white border border-blue-200 rounded-[2rem] p-5 sm:p-7 shadow-xl shadow-navy-800/5"
                >
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    {STEPS.map((s, i) => (
                      <span key={s.key} className="h-1.5 flex-1 rounded-full bg-blue-100 overflow-hidden">
                        <motion.span className="block h-full bg-navy-800" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 text-xs font-bold text-navy-500">
                    <span>Pertanyaan {step + 1} dari {STEPS.length}</span>
                    <span className="hidden sm:inline">Tekan angka 1–{S.options?.length ?? 6} untuk memilih</span>
                  </div>

                  <AnimatePresence mode="wait" custom={back}>
                    <motion.div
                      key={S.key}
                      custom={back}
                      initial={{ opacity: 0, x: back ? -40 : 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: back ? 40 : -40 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="mt-4 min-h-[19rem]"
                    >
                      <h3 className="font-heading font-extrabold text-2xl sm:text-3xl">{S.q}</h3>
                      <p className="text-sm text-navy-500 mt-1">{S.sub}</p>

                      {S.options ? (
                        <div role="radiogroup" aria-label={S.q} className={`grid gap-2.5 mt-5 ${S.options.length > 4 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
                          {S.options.map((o, i) => {
                            const on = prefs[S.key] === o.value;
                            return (
                              <motion.button
                                key={String(o.value)}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => choose(S.key, o.value)}
                                whileHover={{ y: -3 }}
                                whileTap={{ scale: 0.96 }}
                                className={`group relative text-left rounded-2xl border-2 p-3.5 transition-colors focus-visible:rounded-2xl ${on ? 'border-navy-800 bg-navy-800 text-white' : 'border-blue-200 bg-white hover:border-navy-500'}`}
                              >
                                <span className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-md text-[10px] font-extrabold flex items-center justify-center ${on ? 'bg-yellow-500 text-navy-800' : 'bg-blue-100 text-navy-500'}`}>{i + 1}</span>
                                <span className="text-3xl block transition-transform group-hover:scale-110 origin-left">{o.emoji}</span>
                                <span className="font-heading font-extrabold text-sm block mt-2">{o.label}</span>
                                <span className={`text-[11px] block mt-0.5 ${on ? 'text-blue-200' : 'text-navy-500'}`}>{o.hint}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-5">
                          <div role="group" aria-label="Prioritas" className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {PRIORITY_OPTS.map((o) => {
                              const on = prefs.priorities.includes(o.value);
                              return (
                                <button key={o.value} type="button" role="checkbox" aria-checked={on} onClick={() => togglePriority(o.value)} className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition-colors focus-visible:rounded-2xl ${on ? 'border-yellow-500 bg-yellow-500/15 text-navy-800' : 'border-blue-200 hover:border-navy-500 text-navy-700'}`}>
                                  <span className="text-lg">{o.emoji}</span> {o.label}
                                  {on && <Check size={14} className="ml-auto text-navy-800" />}
                                </button>
                              );
                            })}
                          </div>
                          <label className="mt-4 flex items-center gap-2 bg-blue-50 border-2 border-blue-200 focus-within:border-navy-500 rounded-2xl px-4 py-3 transition-colors">
                            <Search size={16} className="text-navy-500" />
                            <input
                              value={prefs.keyword}
                              onChange={(e) => setPrefs((p) => ({ ...p, keyword: e.target.value.slice(0, 40) }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }}
                              placeholder="Lagi pengin sesuatu? mis. bakso, kopi susu, tambal ban"
                              aria-label="Kata kunci (opsional)"
                              className="flex-1 bg-transparent outline-none text-sm placeholder:text-navy-500/70"
                            />
                          </label>
                          <motion.button
                            type="button"
                            onClick={() => run()}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="mt-5 w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-navy-800 font-heading font-extrabold text-base py-4 rounded-2xl shadow-lg shadow-yellow-500/30 transition-colors"
                          >
                            <Sparkles size={18} /> Temukan {live.length ? `dari ${live.length} kandidat` : 'yang cocok'}
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-blue-100">
                    <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="flex items-center gap-1.5 text-sm font-bold text-navy-700 disabled:opacity-30 hover:text-navy-900 transition-colors">
                      <ArrowLeft size={15} /> Kembali
                    </button>
                    {step < STEPS.length - 1 ? (
                      <button type="button" onClick={() => go(step + 1)} className="flex items-center gap-1.5 text-sm font-bold text-navy-500 hover:text-navy-800 transition-colors">
                        Lewati <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button type="button" onClick={() => { setPrefs(DEFAULT_PREFS); go(0); }} className="flex items-center gap-1.5 text-sm font-bold text-navy-500 hover:text-navy-800 transition-colors">
                        <RotateCcw size={14} /> Mulai ulang
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {phase === 'loading' && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white border border-blue-200 rounded-[2rem] p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[26rem]">
                  <div className="relative w-24 h-24">
                    <span className="absolute inset-0 rounded-full bg-yellow-500/30 animate-ping" />
                    <span className="relative w-24 h-24 rounded-full bg-yellow-500 flex items-center justify-center text-4xl">{needEmoji}</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p key={scanLine} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="font-heading font-extrabold text-lg mt-6">{SCAN_LINES[scanLine]}</motion.p>
                  </AnimatePresence>
                  <p className="text-sm text-navy-500 mt-1">Mencocokkan {live.length || candidates.length} usaha dengan 6 faktor</p>
                </motion.div>
              )}

              {phase === 'results' && (
                <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-center justify-between text-xs text-navy-500">
                    <button type="button" onClick={restart} className="flex items-center gap-1.5 font-bold text-navy-700 hover:text-yellow-600 transition-colors"><ArrowLeft size={14} /> Ubah jawaban</button>
                    <span className="flex items-center gap-1 font-semibold" title={out.source === 'server' ? 'Dihitung server dari database' : 'Database tidak terjangkau — dihitung dari data contoh'}>
                      {out.source === 'server' ? <><Database size={12} /> Data langsung</> : <><FlaskConical size={12} /> Mode demo</>}
                    </span>
                  </div>
                  {top ? (
                    <>
                      <TopMatch r={top} needEmoji={needEmoji} fav={favs.includes(top.business.id)} onFav={() => toggleFav(top.business.id)} />
                      {others.length > 0 && <SwipeStack key={out.results.map((r) => r.business.id).join()} items={others} favs={favs} onFav={toggleFav} onReset={restart} />}
                    </>
                  ) : (
                    <div className="bg-white border border-dashed border-blue-300 rounded-[2rem] p-10 flex flex-col items-center text-center">
                      <span className="text-5xl">🔭</span>
                      <p className="font-heading font-extrabold text-lg mt-3">Radar belum menemukan yang pas</p>
                      <p className="text-sm text-navy-500 mt-1 max-w-sm">Coba perluas jangkauan atau longgarkan budget — biasanya langsung ketemu.</p>
                      <div className="flex gap-2 mt-5">
                        <button type="button" onClick={widen} className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-sm font-bold px-5 py-2.5 rounded-full transition-colors"><RadarIcon size={15} /> Perluas pencarian</button>
                        <button type="button" onClick={restart} className="text-sm font-bold px-5 py-2.5 rounded-full border border-blue-200 hover:border-navy-500 transition-colors">Ubah jawaban</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
