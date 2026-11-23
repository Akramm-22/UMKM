import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid, UtensilsCrossed, ChefHat, CupSoda, Cookie, Store, Wrench, Tag, Clock,
  Heart, Star, MapPin, ArrowRight, Flame, TrendingUp, Navigation, RotateCcw, SearchX,
} from 'lucide-react';
import { DEMO_BUSINESSES, toCard } from '../../lib/demoPlaces.js';
import { approvedPlaces } from '../../lib/verification.js';
import { suspendedLocalIds } from '../../lib/feedback.js';
import { getFavorites, toggleFavorite } from '../../lib/place.js';
import { useAuth } from '../../context/AuthContext.jsx';
import SectionTag from './SectionTag.jsx';

const KIND_FILTERS = [
  { key: 'all', label: 'Semua', icon: LayoutGrid, test: () => true },
  { key: 'kuliner', label: 'Kuliner', icon: UtensilsCrossed, test: (b) => ['makanan', 'minuman', 'jajanan'].includes(b.kind) },
  { key: 'makanan', label: 'Makanan', icon: ChefHat, test: (b) => b.kind === 'makanan' },
  { key: 'minuman', label: 'Minuman', icon: CupSoda, test: (b) => b.kind === 'minuman' },
  { key: 'jajanan', label: 'Jajanan', icon: Cookie, test: (b) => b.kind === 'jajanan' },
  { key: 'toko', label: 'Toko', icon: Store, test: (b) => b.kind === 'toko' },
  { key: 'jasa', label: 'Jasa', icon: Wrench, test: (b) => b.kind === 'jasa' },
];

const SORTS = [
  { key: 'popular', label: 'Terpopuler', icon: Flame, fn: (a, b) => b.reviews * b.rating - a.reviews * a.rating },
  { key: 'rating', label: 'Rating', icon: Star, fn: (a, b) => b.rating - a.rating || b.reviews - a.reviews },
  { key: 'near', label: 'Terdekat', icon: Navigation, fn: (a, b) => a.km - b.km },
];

const KIND_TONE = {
  makanan: 'bg-orange-100 text-orange-700',
  minuman: 'bg-amber-100 text-amber-800',
  jajanan: 'bg-pink-100 text-pink-700',
  toko: 'bg-emerald-100 text-emerald-700',
  jasa: 'bg-blue-100 text-navy-700',
};

const PAGE = 5;

function loadCards() {
  const hidden = suspendedLocalIds();
  return [...DEMO_BUSINESSES, ...approvedPlaces()]
    .filter((b) => !hidden.has(b.id) && b.photo)
    .map((b) => toCard(b));
}

function Chip({ active, onClick, icon: Icon, label, count, tone = 'navy' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={count === 0 && !active}
      className={`relative shrink-0 snap-start flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-full text-sm font-bold border transition-colors focus-visible:rounded-full disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? tone === 'yellow' ? 'border-yellow-500 text-navy-800' : 'border-navy-800 text-white'
          : 'bg-white border-blue-200 text-navy-700 hover:border-navy-500 hover:bg-blue-100/60'
      }`}
    >
      {active && (
        <motion.span
          layoutId={tone === 'yellow' ? undefined : 'trend-kind-pill'}
          className={`absolute inset-0 rounded-full ${tone === 'yellow' ? 'bg-yellow-500' : 'bg-navy-800'}`}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          aria-hidden="true"
        />
      )}
      <Icon size={15} className="relative" />
      <span className="relative">{label}</span>
      <span className={`relative min-w-6 h-6 px-1.5 rounded-full text-[11px] font-extrabold flex items-center justify-center ${
        active ? (tone === 'yellow' ? 'bg-navy-800 text-yellow-500' : 'bg-yellow-500 text-navy-800') : 'bg-blue-100 text-navy-500'
      }`}>
        {count}
      </span>
    </button>
  );
}

export default function TrendingSection({ onSelect }) {
  const { user } = useAuth();
  const favKey = user?.id ?? 'guest';
  const [cards] = useState(loadCards);
  const [kind, setKind] = useState('all');
  const [promoOnly, setPromoOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState('popular');
  const [expanded, setExpanded] = useState(false);
  const [favs, setFavs] = useState(() => getFavorites(favKey));

  // toggle promo/buka diterapkan dulu agar angka di tombol kategori jujur
  const base = useMemo(
    () => cards.filter((b) => (!promoOnly || b.promo) && (!openOnly || b.open)),
    [cards, promoOnly, openOnly]
  );
  const counts = useMemo(
    () => Object.fromEntries(KIND_FILTERS.map((f) => [f.key, base.filter(f.test).length])),
    [base]
  );
  const results = useMemo(() => {
    const test = KIND_FILTERS.find((f) => f.key === kind).test;
    return base.filter(test).sort(SORTS.find((s) => s.key === sort).fn);
  }, [base, kind, sort]);

  const shown = expanded ? results : results.slice(0, PAGE);
  const filtered = kind !== 'all' || promoOnly || openOnly;
  const reset = () => { setKind('all'); setPromoOnly(false); setOpenOnly(false); };
  const pick = (fn) => { fn(); setExpanded(false); };

  const toggleFav = (id) => setFavs(toggleFavorite(favKey, id));

  const kindLabel = KIND_FILTERS.find((f) => f.key === kind).label;

  return (
    <section id="promo" className="relative bg-blue-50 border-y border-blue-200 py-16 overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-yellow-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-5"
        >
          <div>
            <SectionTag n="02" label="Pilihan Minggu Ini" />
            <h2 className="font-heading font-extrabold text-2xl lg:text-3xl mt-3">
              <span className="italic text-yellow-600">Lagi rame</span> di sekitarmu
            </h2>
            <p className="text-navy-500 text-sm mt-1.5">Saring sesuai selera — makanan, minuman, jajanan, toko, sampai jasa harian.</p>
          </div>

          {/* urutan: segmented control */}
          <div role="radiogroup" aria-label="Urutkan" className="self-start lg:self-auto flex items-center bg-white border border-blue-200 rounded-full p-1 shadow-sm">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={sort === s.key}
                onClick={() => setSort(s.key)}
                className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors focus-visible:rounded-full ${
                  sort === s.key ? 'text-navy-800' : 'text-navy-500 hover:text-navy-800'
                }`}
              >
                {sort === s.key && (
                  <motion.span layoutId="trend-sort-pill" className="absolute inset-0 rounded-full bg-yellow-500" transition={{ type: 'spring', stiffness: 420, damping: 34 }} aria-hidden="true" />
                )}
                <s.icon size={13} className="relative" />
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* filter kategori + toggle cepat */}
        <div className="mt-7 -mx-5 px-5 lg:mx-0 lg:px-0">
          <div className="flex gap-2 overflow-x-auto lg:flex-wrap snap-x pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter kategori">
            {KIND_FILTERS.map((f) => (
              <Chip key={f.key} active={kind === f.key} onClick={() => pick(() => setKind(f.key))} icon={f.icon} label={f.label} count={counts[f.key]} />
            ))}
            <span className="shrink-0 w-px bg-blue-200 mx-1 my-1.5" aria-hidden="true" />
            <Chip tone="yellow" active={promoOnly} onClick={() => pick(() => setPromoOnly((v) => !v))} icon={Tag} label="Ada promo" count={cards.filter((b) => b.promo && (!openOnly || b.open)).length} />
            <Chip tone="yellow" active={openOnly} onClick={() => pick(() => setOpenOnly((v) => !v))} icon={Clock} label="Buka sekarang" count={cards.filter((b) => b.open && (!promoOnly || b.promo)).length} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 text-xs text-navy-500" aria-live="polite">
          <p>
            <span className="font-extrabold text-navy-800">{results.length}</span> usaha
            {kind !== 'all' && <> · <span className="font-bold text-navy-700">{kindLabel}</span></>}
            {promoOnly && ' · ada promo'}
            {openOnly && ' · buka sekarang'}
          </p>
          {filtered && (
            <button type="button" onClick={reset} className="flex items-center gap-1 font-bold text-navy-700 hover:text-yellow-600 transition-colors">
              <RotateCcw size={12} /> Reset filter
            </button>
          )}
        </div>

        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((b, i) => (
              <motion.article
                key={b.id}
                layout
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                whileHover={{ y: -8 }}
                onClick={() => onSelect(b)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(b); } }}
                tabIndex={0}
                aria-label={`Lihat detail ${b.name}`}
                className="group bg-white rounded-3xl overflow-hidden border border-blue-200 hover:border-transparent shadow-sm hover:shadow-2xl hover:shadow-navy-800/15 transition-[border-color,box-shadow] duration-300 cursor-pointer focus-visible:rounded-3xl"
              >
                <div className="relative h-44">
                  <div className="absolute inset-0 overflow-hidden">
                    <img src={b.img} alt={b.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/40 to-transparent" aria-hidden="true" />
                  </div>
                  <div className="absolute top-3.5 left-3.5 flex flex-col items-start gap-1.5">
                    {sort === 'popular' && i < 3 && !filtered && (
                      <span className="flex items-center gap-1 bg-navy-800 text-yellow-500 text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-lg">
                        <TrendingUp size={11} /> #{i + 1} terpopuler
                      </span>
                    )}
                    {b.promo && (
                      <span className="bg-yellow-500 text-navy-800 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-lg shadow-yellow-500/30">
                        {b.promo}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleFav(b.id); }}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={favs.includes(b.id) ? 'Hapus dari favorit' : 'Simpan ke favorit'}
                    aria-pressed={favs.includes(b.id)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow hover:scale-110 active:scale-90 transition-transform focus-visible:rounded-full"
                  >
                    <Heart size={15} className={favs.includes(b.id) ? 'text-danger fill-danger' : 'text-navy-700'} />
                  </button>
                  <span className="absolute -bottom-3.5 right-4 bg-white text-navy-800 text-xs font-extrabold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" /> {b.rating ?? '–'}
                    <span className="text-navy-500 font-semibold">({b.reviews})</span>
                  </span>
                </div>

                <div className="p-5 pt-6">
                  <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${KIND_TONE[b.kind]}`}>{b.cat}</span>
                  <p className="font-heading font-extrabold text-base leading-tight mt-2">{b.name}</p>
                  <p className="text-xs text-navy-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <MapPin size={11} /> {b.dist}
                    <span className="w-1 h-1 rounded-full bg-blue-300" /> <Clock size={11} /> {b.hours}
                    {b.price && <><span className="w-1 h-1 rounded-full bg-blue-300" /> {b.price}</>}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-100">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${b.open ? 'text-success' : 'text-navy-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${b.open ? 'bg-success animate-pulse' : 'bg-blue-300'}`} />
                      {b.open ? 'Buka sekarang' : 'Sedang tutup'}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-navy-700 group-hover:text-yellow-600 group-hover:gap-2 transition-all">
                      Lihat detail <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}

            {results.length === 0 && (
              <motion.div
                key="empty"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="sm:col-span-2 flex flex-col items-center justify-center text-center gap-3 bg-white border border-dashed border-blue-300 rounded-3xl p-10"
              >
                <span className="w-14 h-14 rounded-full bg-blue-100 text-navy-500 flex items-center justify-center"><SearchX size={24} /></span>
                <p className="font-heading font-extrabold">Belum ada yang cocok</p>
                <p className="text-sm text-navy-500 max-w-xs">Coba kategori lain atau matikan filter promo/buka sekarang.</p>
                <button type="button" onClick={reset} className="mt-1 flex items-center gap-1.5 bg-navy-800 text-blue-50 text-sm font-bold px-5 py-2.5 rounded-full hover:bg-navy-700 transition-colors">
                  <RotateCcw size={14} /> Reset filter
                </button>
              </motion.div>
            )}

            {/* tile CTA ke peta penuh */}
            <motion.div key="cta" layout whileHover={{ y: -8 }}>
              <Link
                to="/explore"
                className="relative h-full min-h-72 flex flex-col items-center justify-center gap-4 bg-navy-800 rounded-3xl overflow-hidden text-center p-6 shadow-sm hover:shadow-2xl hover:shadow-navy-800/30 transition-shadow duration-300"
              >
                <div className="blob-morph absolute -top-12 -right-12 w-44 h-44 bg-yellow-500/15 pointer-events-none" aria-hidden="true" />
                <div className="blob-morph-slow absolute -bottom-14 -left-10 w-40 h-40 bg-blue-400/15 pointer-events-none" aria-hidden="true" />
                <span className="relative w-14 h-14 rounded-full bg-yellow-500 text-navy-800 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <MapPin size={24} />
                </span>
                <div className="relative">
                  <p className="font-heading font-extrabold text-xl text-blue-50">172+ usaha lainnya</p>
                  <p className="text-sm text-blue-300 mt-1">menunggumu di peta</p>
                </div>
                <span className="relative flex items-center gap-2 bg-yellow-500 text-navy-800 text-sm font-heading font-bold px-6 py-3 rounded-full">
                  Buka Peta Penuh <ArrowRight size={15} />
                </span>
              </Link>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {results.length > PAGE && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 bg-white border border-blue-200 hover:border-navy-500 text-navy-800 text-sm font-bold px-6 py-3 rounded-full shadow-sm transition-colors focus-visible:rounded-full"
            >
              {expanded ? 'Tampilkan lebih sedikit' : `Lihat semua ${results.length} usaha`}
              <ArrowRight size={15} className={`transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
