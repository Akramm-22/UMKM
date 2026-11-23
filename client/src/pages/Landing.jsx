import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from 'motion/react';
import {
  MapPin, Search, Store, ArrowRight, Star, BadgeCheck, Clock,
  Phone, ChevronRight, Globe, MessageCircle, Mail, Wallet, Send, MousePointer2,
  ChefHat, CupSoda, Wheat, Hammer, Scissors, WashingMachine, Cookie, Shirt,
  Leaf, Flame, Citrus, X, LayoutGrid, LogOut, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { DEMO_BUSINESSES, toCard } from '../lib/demoPlaces.js';
import SectionTag from '../components/landing/SectionTag.jsx';
import TrendingSection from '../components/landing/TrendingSection.jsx';
import JourneySection from '../components/landing/JourneySection.jsx';
import PhotoStory from '../components/landing/PhotoStory.jsx';
import { SUGGESTIONS } from '../../../shared/smartSearch.mjs';

const MotionLink = motion.create(Link);

const IMG = (id, w = 640) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

const PHOTOS = {
  warung: IMG('photo-1555396273-367ea4eb4db5'),          // kedai makan / food counter
  sate: IMG('photo-1529563021893-cc83c992d75d'),         // sate bakar
  nasi: IMG('photo-1512058564366-18510be2db19'),         // nasi + lauk
  kopi: IMG('photo-1509042239860-f550ce710b93'),         // kopi
  pasar: IMG('photo-1542838132-92c53300491e'),           // toko sembako / pasar
  laundry: IMG('photo-1545173168-9f1947eebb7f'),         // laundry
  mie: IMG('photo-1555126634-323283e090fa'),             // mie
  kue: IMG('photo-1578985545062-69928b1d9587'),          // kue
};

const CATEGORIES = [
  { icon: ChefHat, label: 'Warung Makan', count: 48, grad: 'from-red-400 to-red-600' },
  { icon: CupSoda, label: 'Kopi & Minuman', count: 23, grad: 'from-amber-500 to-amber-700' },
  { icon: Wheat, label: 'Sembako', count: 31, grad: 'from-emerald-500 to-emerald-700' },
  { icon: Hammer, label: 'Servis & Jasa', count: 19, grad: 'from-navy-600 to-navy-900' },
  { icon: Scissors, label: 'Pangkas Rambut', count: 12, grad: 'from-info to-navy-700' },
  { icon: WashingMachine, label: 'Laundry', count: 15, grad: 'from-sky-400 to-sky-600' },
  { icon: Cookie, label: 'Kue & Snack', count: 27, grad: 'from-pink-400 to-rose-600' },
  { icon: Shirt, label: 'Jahit', count: 8, grad: 'from-purple-500 to-purple-700' },
];

// sumber data sama dengan peta; diurutkan dari yang paling ramai
const FEATURED = DEMO_BUSINESSES.map((b) => toCard(b)).sort((a, b) => b.reviews * b.rating - a.reviews * a.rating);

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.45, ease: 'easeOut' },
};

// hero selalu di viewport awal — animate langsung agar tak bergantung IntersectionObserver
const hero = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: 'easeOut', delay },
});

export default function Landing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  // parallax lembut pada komposisi hero
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 500], [0, 70]);

  // navbar pill → kotak penuh: toggle kelas + transisi CSS 700ms easeOutQuint (pola quran.nu.or.id).
  // radius pakai 32px riil (bukan 999 yang di-clamp browser) agar seluruh durasi terlihat beranimasi
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled((s) => (s ? v > 8 : v > 24)));

  // detail usaha yang dibuka dari kartu "Lagi rame"
  const [selected, setSelected] = useState(null);

  // preview aplikasi membesar mengikuti scroll (ref: video REDSUN)
  const demoRef = useRef(null);
  const { scrollYProgress: demoProg } = useScroll({ target: demoRef, offset: ['start end', 'center center'] });
  const demoScale = useTransform(demoProg, [0, 1], [0.86, 1]);
  const demoOpacity = useTransform(demoProg, [0, 0.4, 1], [0.3, 0.75, 1]);
  const demoY = useTransform(demoProg, [0, 1], [56, 0]);

  const goSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore');
  };

  return (
    <div className="min-h-screen bg-white font-body text-navy-800 overflow-x-clip">
      {/* ═══ Navbar pill navy — selalu terlihat, area sekitarnya blur ═══ */}
      <header className="sticky top-0 z-50">
        {/* zona frosted-glass: konten yang lewat di bawah navbar jadi blur, memudar ke bawah */}
        <div
          className="absolute inset-x-0 top-0 h-24 backdrop-blur-md bg-blue-50/40 pointer-events-none [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
          aria-hidden="true"
        />
        <div
          className={`relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${scrolled ? 'px-0 pt-0' : 'px-4 pt-3'}`}
        >
        <nav
          className={`mx-auto bg-navy-800 text-blue-50 pl-6 pr-2.5 h-16 flex items-center gap-8 shadow-xl shadow-navy-900/25 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            scrolled ? 'max-w-[160rem] rounded-none' : 'max-w-6xl rounded-[32px]'
          }`}
        >
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-lg shrink-0">
            <span className="bg-yellow-500 text-navy-800 p-1.5 rounded-full"><MapPin size={17} /></span>
            PesanLokal<span className="text-yellow-500">.</span>
          </Link>
          <div className="hidden lg:flex items-center gap-7 text-sm font-semibold text-blue-300 mx-auto">
            <Link to="/explore" className="hover:text-yellow-500 transition-colors">Peta Usaha</Link>
            <a href="#kategori" className="hover:text-yellow-500 transition-colors">Kategori</a>
            <a href="#promo" className="hover:text-yellow-500 transition-colors">Lagi Rame</a>
            <a href="#daftar" className="hover:text-yellow-500 transition-colors">Untuk Pemilik Usaha</a>
          </div>
          <div className="ml-auto lg:ml-0 flex items-center gap-2">
            {!user && (
              <>
                <Link to="/login" className="text-sm font-bold text-blue-50 px-5 py-2.5 rounded-full border border-blue-300/40 hover:border-yellow-500 hover:text-yellow-500 transition-colors">
                  Masuk
                </Link>
                <MotionLink to="/register" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} className="hidden sm:block bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-sm font-heading font-bold px-5 py-2.5 rounded-full transition-colors">
                  Daftar
                </MotionLink>
              </>
            )}
            {user && user.role !== 'admin' && (
              <MotionLink to="/daftar-usaha" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-sm font-heading font-bold px-5 py-2.5 rounded-full transition-colors">
                <Store size={15} /> Daftar Usaha
              </MotionLink>
            )}
            {user && user.role === 'admin' && (
              <MotionLink to="/admin" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-sm font-heading font-bold px-5 py-2.5 rounded-full transition-colors">
                <LayoutGrid size={15} /> Dashboard
              </MotionLink>
            )}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  title={user.name}
                  aria-label="Menu profil"
                  className={`w-10 h-10 shrink-0 rounded-full bg-blue-300 text-navy-800 font-heading font-extrabold text-sm flex items-center justify-center border-2 transition-colors ${
                    profileOpen ? 'border-blue-50' : 'border-yellow-500 hover:border-blue-50'
                  }`}
                >
                  {user.name.slice(0, 1)}
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 top-13 w-56 bg-white text-navy-800 rounded-2xl shadow-xl shadow-navy-900/20 border border-blue-200 overflow-hidden"
                    >
                      <div className="px-4 py-3.5 bg-blue-50 border-b border-blue-200">
                        <p className="text-sm font-heading font-bold truncate">{user.name}</p>
                        <p className="text-[11px] text-navy-500 capitalize">{user.role === 'admin' ? 'Administrator' : user.persona === 'pelaku' ? 'Pelaku Usaha' : 'Konsumen'}</p>
                      </div>
                      <div className="p-1.5 text-sm font-semibold">
                        {user.role === 'admin' ? (
                          <Link to="/admin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                            <LayoutGrid size={15} className="text-navy-500" /> Dashboard Admin
                          </Link>
                        ) : (
                          <>
                            <Link to="/daftar-usaha" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                              <Store size={15} className="text-navy-500" /> Daftar Usaha
                            </Link>
                            <Link to="/dashboard" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                              <LayoutGrid size={15} className="text-navy-500" /> Dashboard Usaha
                            </Link>
                          </>
                        )}
                        <Link to="/explore" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                          <MapPin size={15} className="text-navy-500" /> Peta Usaha
                        </Link>
                        <button
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-danger hover:bg-danger/10 transition-colors"
                        >
                          <LogOut size={15} /> Keluar
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </nav>
        </div>
      </header>

      {/* ═══ Hero: teks + kolase foto UMKM ═══ */}
      <section className="relative overflow-hidden bg-blue-50">
        {/* gelembung dekoratif (ref: Gxap) */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* liquid shapes bermetamorfosis */}
          <div className="blob-morph absolute -top-16 -left-20 w-80 h-80 bg-blue-300/30" />
          <div className="blob-morph-slow absolute bottom-16 right-[40%] w-44 h-44 bg-yellow-500/15" />
          <span className="animate-float absolute top-16 left-[6%] w-4 h-4 rounded-full bg-blue-300/60" />
          <span className="animate-float-delay absolute top-32 right-[14%] w-6 h-6 rounded-full bg-yellow-500/25" />
          <span className="animate-float-slow absolute bottom-36 left-[22%] w-3 h-3 rounded-full bg-navy-500/20" />
          <span className="animate-float absolute top-1/2 right-[32%] w-2.5 h-2.5 rounded-full bg-blue-400/50" />
          <span className="animate-float-delay absolute bottom-44 right-[5%] w-10 h-10 rounded-full border-2 border-blue-300/70" />
          <span className="animate-float-slow absolute top-20 left-[40%] w-8 h-8 rounded-full border-2 border-yellow-500/35" />
          <span className="animate-float absolute bottom-52 left-[3%] w-5 h-5 rounded-full border-2 border-navy-500/15" />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 pt-14 lg:pt-20 pb-24 lg:pb-32 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            {/* tag seleksi ala Figma (ref: Olivia "Hello There!") */}
            <motion.div {...hero(0)} className="relative inline-block">
              <span className="inline-block border border-dashed border-navy-600 bg-white text-navy-700 text-sm font-semibold px-4 py-1.5">
                Halo Tetangga! 👋
              </span>
              {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos) => (
                <span key={pos} className={`absolute ${pos} w-2 h-2 bg-yellow-500 border border-navy-800`} />
              ))}
            </motion.div>
            <motion.h1
              {...hero(0.06)}
              className="font-heading font-extrabold text-4xl lg:text-[3.3rem] leading-[1.15] mt-5"
            >
              <span className="italic text-yellow-600 underline decoration-yellow-500 decoration-[5px] underline-offset-8">Warung sebelah,</span>
              <br />ketemu sekali cari.
            </motion.h1>
            <motion.p {...hero(0.12)} className="text-navy-500 mt-5 max-w-md leading-relaxed">
              Peta usaha lokal yang diisi langsung oleh pemiliknya — jam buka benar, lokasi tepat,
              promo asli. Tanpa komisi, tanpa perantara.
            </motion.p>

            <motion.form
              {...hero(0.18)}
              onSubmit={goSearch}
              className="mt-7 flex items-center gap-2 bg-white border border-blue-300 rounded-full p-1.5 pl-5 shadow-lg shadow-navy-800/5 max-w-md focus-within:border-navy-600 transition-colors"
            >
              <Search size={19} className="text-navy-500 shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Coba: warung terdekat, kuliner murah…"
                aria-label="Cari usaha"
                className="w-full outline-none text-navy-800 placeholder:text-navy-500/50"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                className="shrink-0 bg-yellow-500 hover:bg-yellow-400 text-navy-800 font-heading font-bold text-sm px-6 py-3 rounded-full shadow-md shadow-yellow-500/30 transition-colors"
              >
                Cari
              </motion.button>
            </motion.form>

            <motion.div {...hero(0.21)} className="mt-3 flex flex-wrap items-center gap-1.5 max-w-md">
              <Sparkles size={14} className="text-yellow-600" aria-hidden="true" />
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <Link key={s} to={`/explore?q=${encodeURIComponent(s)}`} className="text-xs font-semibold text-navy-700 bg-white border border-blue-200 hover:border-navy-500 px-2.5 py-1 rounded-full transition-colors">
                  {s}
                </Link>
              ))}
            </motion.div>

            <motion.div {...hero(0.24)} className="flex items-center gap-5 mt-8">
              <div className="flex -space-x-2.5">
                {[PHOTOS.warung, PHOTOS.kopi, PHOTOS.kue].map((p) => (
                  <img key={p} src={p} alt="" className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <p className="text-xs text-navy-500 leading-snug">
                <span className="font-bold text-navy-800">1.200+ pencarian</span> minggu ini<br />
                di satu kelurahan pilot
              </p>
              <div className="h-8 w-px bg-blue-300" />
              <p className="text-xs text-navy-500 leading-snug">
                <span className="font-bold text-navy-800 flex items-center gap-1"><Star size={12} className="text-yellow-500 fill-yellow-500" /> 4.8 rata-rata</span>
                ulasan terverifikasi
              </p>
            </motion.div>
          </div>

          {/* komposisi blob ala Broccoli: foto utama di blob kuning + elemen melayang */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
            style={{ y: heroParallax }}
            className="relative h-[26rem] hidden sm:block"
          >
            {/* blob kuning utama */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 m-auto w-full h-full" aria-hidden="true">
              <path
                fill="#FFC914"
                transform="translate(100 100) rotate(20)"
                d="M38.1,-65.1C50.4,-58.2,61.9,-50,69.3,-38.7C76.8,-27.4,80.2,-13.7,79.7,-0.3C79.2,13.1,74.7,26.2,67.2,37.4C59.7,48.6,49.2,57.9,37.2,64.4C25.2,70.9,12.6,74.6,-0.7,75.8C-14,77,-28,75.7,-40.2,69.3C-52.4,62.9,-62.8,51.4,-69.5,38.1C-76.2,24.8,-79.2,9.9,-77.6,-4.3C-76,-18.5,-69.8,-32,-60.7,-42.8C-51.6,-53.6,-39.6,-61.7,-26.9,-68.3C-14.2,-74.9,-0.8,-80,11.9,-78.3C24.6,-76.6,37.8,-72,38.1,-65.1Z"
              />
            </svg>
            {/* blob kecil powder blue di belakang */}
            <svg viewBox="0 0 200 200" className="absolute -left-6 top-2 w-32 h-32" aria-hidden="true">
              <path
                fill="#B8D8EA"
                transform="translate(100 100)"
                d="M42.8,-62.3C55.2,-54.8,64.5,-42.5,69.9,-28.6C75.3,-14.7,76.8,0.8,72.5,14.5C68.2,28.2,58.1,40.1,46,49.6C33.9,59.1,19.8,66.2,4.4,67.7C-11,69.2,-27.7,65.1,-40.9,56.1C-54.1,47.1,-63.8,33.2,-68.5,17.6C-73.2,2,-72.9,-15.3,-65.9,-29.1C-58.9,-42.9,-45.2,-53.2,-31,-60.3C-16.8,-67.4,-2.1,-71.3,11.4,-69.4C24.9,-67.5,30.4,-69.8,42.8,-62.3Z"
              />
            </svg>
            {/* foto utama bulat */}
            <img
              src={PHOTOS.nasi}
              alt="Nasi dan lauk khas warung"
              className="absolute inset-0 m-auto w-60 h-60 lg:w-64 lg:h-64 object-cover rounded-full border-[6px] border-white shadow-2xl shadow-navy-800/25"
            />
            {/* elemen makanan melayang */}
            <img src={PHOTOS.sate} alt="Sate ayam" className="animate-float absolute left-4 top-10 w-20 h-20 object-cover rounded-full border-4 border-white shadow-lg shadow-navy-800/15" />
            <img src={PHOTOS.kopi} alt="Kopi" className="animate-float-delay absolute right-6 top-20 w-16 h-16 object-cover rounded-full border-4 border-white shadow-lg shadow-navy-800/15" />
            <img src={PHOTOS.kue} alt="Kue" className="animate-float-slow absolute left-12 bottom-14 w-16 h-16 object-cover rounded-full border-4 border-white shadow-lg shadow-navy-800/15" />
            <span className="animate-float-delay absolute left-1/3 -top-1 bg-white rounded-full p-2.5 shadow-lg shadow-navy-800/10" aria-hidden="true"><Leaf size={16} className="text-success" /></span>
            <span className="animate-float absolute right-10 bottom-28 bg-white rounded-full p-2.5 shadow-lg shadow-navy-800/10" aria-hidden="true"><Flame size={16} className="text-danger" /></span>
            <span className="animate-float-slow absolute -left-2 top-1/2 bg-white rounded-full p-2.5 shadow-lg shadow-navy-800/10" aria-hidden="true"><Citrus size={16} className="text-yellow-600" /></span>
            {/* label kursor ala Figma (ref: Olivia) */}
            <div className="absolute -right-3 top-[42%] flex items-center gap-1">
              <MousePointer2 size={15} className="text-navy-800 fill-navy-800 -rotate-90" />
              <span className="bg-navy-800 text-blue-50 text-[11px] font-bold px-3 py-1.5 rounded-full rounded-tl-none shadow-lg">Warung Favorit</span>
            </div>
            <div className="absolute left-0 bottom-32 flex items-center gap-1">
              <MousePointer2 size={15} className="text-yellow-600 fill-yellow-500" />
              <span className="bg-yellow-500 text-navy-800 text-[11px] font-bold px-3 py-1.5 rounded-full rounded-tl-none shadow-lg">UMKM Lokal</span>
            </div>
            {/* kartu rating mengambang */}
            <div className="absolute right-0 bottom-2 bg-white rounded-2xl shadow-xl shadow-navy-800/15 p-3.5 flex items-center gap-3">
              <img src={PHOTOS.nasi} alt="" className="w-11 h-11 rounded-xl object-cover" />
              <div>
                <p className="font-heading font-bold text-xs">Warung Nasi Bu Siti</p>
                <p className="text-[11px] text-navy-500 flex items-center gap-1 mt-0.5">
                  <Star size={10} className="text-yellow-500 fill-yellow-500" /> 4.8 · 350 m · <span className="text-success font-bold">Buka</span>
                </p>
              </div>
            </div>
            {/* badge verifikasi */}
            <div className="absolute left-0 top-0 bg-navy-800 text-blue-50 rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
              <BadgeCheck size={13} className="text-yellow-500" /> Terverifikasi Admin
            </div>
          </motion.div>
        </div>
        {/* wave berlapis menuju section putih (ref: Gxap) */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-16 lg:h-24 block">
            <path fill="#B8D8EA" opacity="0.5" d="M0,40 C240,90 480,10 720,40 C960,70 1200,110 1440,60 L1440,120 L0,120 Z" />
            <path fill="#DCEBF5" opacity="0.8" d="M0,70 C260,100 520,30 780,55 C1040,80 1260,105 1440,85 L1440,120 L0,120 Z" />
            <path fill="#FFFFFF" d="M0,95 C280,70 560,112 840,98 C1080,86 1280,100 1440,105 L1440,120 L0,120 Z" />
          </svg>
        </div>
      </section>

      {/* ═══ Baris USP ═══ */}
      <section className="bg-white border-b border-blue-200">
        <div className="max-w-6xl mx-auto px-5 py-7 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: BadgeCheck, t: 'Terverifikasi Admin', d: 'Semua usaha ditinjau ≤ 24 jam' },
            { icon: Wallet, t: '0% Komisi', d: 'Gratis selamanya untuk UMKM mikro' },
            { icon: MapPin, t: 'Hyperlocal ≤ 2 km', d: 'Yang terdekat, bukan yang terjauh' },
            { icon: Clock, t: 'Info Selalu Akurat', d: 'Diisi langsung oleh pemilik usaha' },
          ].map((u, i) => (
            <motion.div key={u.t} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} whileHover={{ y: -3 }} className="flex items-start gap-3">
              <span className="shrink-0 bg-blue-100 text-navy-700 p-2.5 rounded-xl"><u.icon size={19} /></span>
              <div>
                <p className="font-heading font-bold text-sm">{u.t}</p>
                <p className="text-xs text-navy-500 mt-0.5">{u.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ Preview aplikasi — membesar mengikuti scroll (ref: video REDSUN) ═══ */}
      <section ref={demoRef} className="relative overflow-hidden bg-navy-900 py-20">
        <div className="blob-morph absolute -top-24 -left-20 w-80 h-80 bg-navy-700/40 pointer-events-none" aria-hidden="true" />
        <div className="blob-morph-slow absolute -bottom-28 -right-16 w-96 h-96 bg-yellow-500/8 pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-5">
          <motion.div {...reveal} className="text-center max-w-xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-500">Lihat cara kerjanya</p>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-blue-50 mt-3">
              Satu peta, <span className="italic text-yellow-500">semua usaha</span> tetanggamu
            </h2>
            <p className="text-blue-300 text-sm mt-2.5">Cari, lihat detail, lalu ikuti rutenya — semua dari satu layar.</p>
          </motion.div>

          {/* mock layar Explore */}
          <motion.div
            style={{ scale: demoScale, opacity: demoOpacity, y: demoY }}
            className="mt-12 max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl shadow-navy-900/60 ring-1 ring-white/10 overflow-hidden"
          >
            {/* chrome jendela */}
            <div className="flex items-center gap-1.5 px-5 h-10 bg-blue-100 border-b border-blue-200">
              <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
              <span className="mx-auto bg-white text-navy-500 text-[10px] font-semibold px-4 py-1 rounded-full">pesanlokal.id/explore</span>
            </div>
            <div className="grid grid-cols-[150px_1fr] sm:grid-cols-[220px_1fr] h-72 sm:h-80">
              {/* sidebar mini */}
              <div className="border-r border-blue-200 p-3 space-y-2.5 overflow-hidden">
                <div className="flex items-center gap-1.5 bg-blue-100 rounded-lg px-2.5 py-2 text-navy-500">
                  <Search size={11} /><span className="text-[10px] font-semibold">Cari warung, jasa…</span>
                </div>
                {FEATURED.slice(0, 4).map((b) => (
                  <div key={b.name} className="flex items-center gap-2">
                    <img src={b.img} alt="" className="w-9 h-9 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold truncate">{b.name}</p>
                      <p className="text-[9px] text-navy-500 flex items-center gap-0.5">
                        <Star size={8} className="text-yellow-500 fill-yellow-500" /> {b.rating} · {b.dist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* area peta mini */}
              <div className="relative bg-blue-100">
                <div className="absolute inset-0 bg-dots opacity-70" aria-hidden="true" />
                {/* jalan */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 320" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 90 q120 18 400 -10" stroke="#fff" strokeWidth="13" fill="none" />
                  <path d="M150 0 q-14 160 30 320" stroke="#fff" strokeWidth="13" fill="none" />
                  <path d="M0 230 q200 -26 400 16" stroke="#fff" strokeWidth="9" fill="none" />
                  {/* rute biru ala Google Maps */}
                  <path d="M70 265 q40 -40 85 -82 q50 -48 150 -98" stroke="#16294F" strokeWidth="7" fill="none" strokeLinecap="round" />
                  <path d="M70 265 q40 -40 85 -82 q50 -48 150 -98" stroke="#4A90D9" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
                {/* titik pengguna */}
                <span className="absolute left-[14%] bottom-[14%] w-4 h-4 bg-info border-2 border-white rounded-full shadow-md" />
                {/* pin tujuan + pin lain */}
                {[
                  { l: '74%', t: '18%', main: true },
                  { l: '38%', t: '44%' },
                  { l: '58%', t: '62%' },
                  { l: '84%', t: '52%' },
                ].map((p, i) => (
                  <span
                    key={i}
                    className={`absolute -translate-x-1/2 -translate-y-full ${p.main ? 'w-7 h-7 animate-float' : 'w-5 h-5'}`}
                    style={{ left: p.l, top: p.t }}
                  >
                    <span
                      className={`block w-full h-full border-2 border-white -rotate-45 shadow-md ${p.main ? 'bg-navy-800' : 'bg-navy-600'}`}
                      style={{ borderRadius: '50% 50% 50% 4px' }}
                    />
                  </span>
                ))}
                {/* kartu info di peta */}
                <div className="absolute right-3 bottom-3 bg-white rounded-xl shadow-lg p-2.5 flex items-center gap-2">
                  <img src={PHOTOS.sate} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  <div>
                    <p className="text-[10px] font-bold">Sate Ayam Bang Jali</p>
                    <p className="text-[9px] text-navy-500">2.1 km · ±6 menit</p>
                  </div>
                  <span className="bg-yellow-500 text-navy-800 text-[9px] font-bold px-2 py-1 rounded-md">Rute</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div {...reveal} className="text-center mt-10">
            <MotionLink
              to="/explore"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-navy-800 font-bold text-sm px-7 py-3.5 rounded-full shadow-lg shadow-yellow-500/25 transition-colors"
            >
              Coba petanya sekarang <ArrowRight size={16} />
            </MotionLink>
          </motion.div>
        </div>
      </section>

      {/* ═══ Dua ticker menyilang berlawanan arah ═══ */}
      <div className="relative my-4">
        {/* pita navy menyilang — teks berjalan ke kanan */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-navy-800 text-blue-300 overflow-hidden py-2.5 rotate-[1.5deg] scale-[1.02]" aria-hidden="true">
          <div className="animate-marquee-reverse flex gap-10 whitespace-nowrap font-heading font-semibold text-xs w-max">
            {[...Array(2)].map((_, dup) => (
              <div key={dup} className="flex gap-10">
                {['PesanLokal', 'Dari tetangga untuk tetangga', 'UMKM naik kelas', 'Belanja dekat rumah', 'Dukung usaha lokal', 'PesanLokal'].map((t, i) => (
                  <span key={`${t}-${i}`} className="flex items-center gap-10">{t} <span className="text-yellow-500">✦</span></span>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* pita kuning — teks berjalan ke kiri */}
        <div className="relative bg-yellow-500 text-navy-800 overflow-hidden py-3 border-y-2 border-navy-800 -rotate-1 scale-[1.02]">
          <div className="animate-marquee flex gap-10 whitespace-nowrap font-heading font-bold text-sm w-max">
            {[...Array(2)].map((_, dup) => (
              <div key={dup} className="flex gap-10">
                {['177 usaha sudah tayang', 'Verifikasi admin ≤ 24 jam', '0% komisi selamanya', 'Pencarian radius 2 km', 'Daftar 10 menit dari HP', '23 promo aktif minggu ini'].map((t) => (
                  <span key={t} className="flex items-center gap-10">{t} <span>✱</span></span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Kategori — grid ikon ═══ */}
      <section id="kategori" className="max-w-6xl mx-auto px-5 py-16">
        <motion.div {...reveal} className="flex items-end justify-between">
          <div>
            <SectionTag n="01" label="Kategori" />
            <h2 className="font-heading font-extrabold text-2xl mt-3">
              <span className="italic text-yellow-600">Jelajahi</span> per kategori
            </h2>
            <p className="text-navy-500 text-sm mt-1.5">Dari sarapan sampai sol sepatu — semua ada di sekitarmu.</p>
          </div>
          <Link to="/explore" className="hidden sm:flex items-center gap-1 text-sm font-bold text-navy-700 hover:text-yellow-600 transition-colors">
            Buka peta <ChevronRight size={16} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          {CATEGORIES.map((c, i) => (
            <motion.div key={c.label} {...reveal} transition={{ ...reveal.transition, delay: i * 0.03 }} whileHover={{ y: -5 }}>
              <Link
                to="/explore"
                className="group flex flex-col items-center gap-4 bg-white hover:bg-yellow-500 border border-blue-200 hover:border-yellow-500 rounded-[1.8rem] py-8 px-4 shadow-sm hover:shadow-xl hover:shadow-yellow-500/30 transition-all duration-300"
              >
                <span className="w-20 h-20 rounded-full bg-white border border-blue-200 group-hover:border-transparent group-hover:shadow-md flex items-center justify-center transition-all duration-300">
                  <c.icon size={30} strokeWidth={1.5} className="text-navy-800" />
                </span>
                <div className="text-center">
                  <p className="font-heading font-bold text-sm text-navy-800">{c.label}</p>
                  <p className="text-xs text-navy-500 group-hover:text-navy-700 mt-0.5 transition-colors">{c.count} usaha</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="sm:hidden text-center mt-6">
          <Link to="/explore" className="inline-flex items-center gap-1 text-sm font-bold text-navy-700">
            Buka peta <ChevronRight size={15} />
          </Link>
        </div>
      </section>

      {/* ═══ 02 Lagi rame — filter kategori interaktif ═══ */}
      <TrendingSection onSelect={setSelected} />

      {/* ═══ Spotlight navy: UMKM minggu ini ═══ */}
      <section className="relative overflow-hidden bg-navy-800 text-blue-50">
        {/* gelembung dekoratif di bidang navy */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <span className="animate-float absolute top-12 right-[8%] w-5 h-5 rounded-full bg-yellow-500/20" />
          <span className="animate-float-delay absolute bottom-16 left-[5%] w-8 h-8 rounded-full border-2 border-blue-400/25" />
          <span className="animate-float-slow absolute top-1/3 left-[45%] w-3 h-3 rounded-full bg-blue-300/30" />
          <span className="animate-float absolute bottom-10 right-[28%] w-4 h-4 rounded-full border-2 border-yellow-500/25" />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div {...reveal} className="relative">
            {/* liquid shape di bidang navy */}
            <div className="blob-morph absolute -top-8 -right-8 w-52 h-52 bg-yellow-500/10" aria-hidden="true" />
            <img
              src={PHOTOS.sate}
              alt="Sate Ayam Bang Jali"
              className="relative w-full h-80 object-cover rounded-3xl"
            />
            <div className="absolute -bottom-5 -right-2 sm:right-6 bg-white text-navy-800 rounded-2xl shadow-2xl p-4 w-56">
              <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-600">UMKM Minggu Ini</p>
              <p className="font-heading font-extrabold text-base mt-1">Sate Ayam Bang Jali</p>
              <p className="text-xs text-navy-500 flex items-center gap-1 mt-1">
                <Star size={11} className="text-yellow-500 fill-yellow-500" /> 4.9 (210) · 550 m
              </p>
              <Link to="/explore" className="mt-3 flex items-center justify-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-xs font-heading font-bold py-2.5 rounded-xl transition-colors">
                Lihat di Peta <ArrowRight size={13} />
              </Link>
            </div>
          </motion.div>
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }}>
            <SectionTag n="03" label="Paling Dicari" light />
            <h2 className="font-heading font-extrabold text-2xl lg:text-3xl mt-3">
              <span className="italic text-yellow-500">Jagoan lokal</span> pilihan tetangga
            </h2>
            {/* baris statistik (ref: Olivia "600+ / 50+ / 18+") */}
            <div className="flex gap-10 mt-6">
              {[
                { n: '177+', l: 'Usaha tayang' },
                { n: '23', l: 'Promo aktif' },
                { n: '4.8', l: 'Rating rata-rata' },
              ].map((s) => (
                <div key={s.l}>
                  <p className="font-heading font-extrabold text-2xl lg:text-3xl text-yellow-500">{s.n}</p>
                  <p className="text-xs text-blue-300 mt-1">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              {[
                { rank: 1, name: 'Sate Ayam Bang Jali', cat: 'Kuliner', metric: '412 kunjungan', hot: true },
                { rank: 2, name: 'Warung Nasi Bu Siti', cat: 'Kuliner', metric: '351 kunjungan' },
                { rank: 3, name: 'Laundry Kilat 24', cat: 'Jasa', metric: '289 kunjungan' },
                { rank: 4, name: 'Sembako Berkah', cat: 'Toko', metric: '244 kunjungan' },
              ].map((r) => (
                <MotionLink
                  key={r.rank}
                  to="/explore"
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors ${
                    r.hot
                      ? 'bg-yellow-500 text-navy-800 hover:bg-yellow-400'
                      : 'bg-navy-700 hover:bg-navy-600 text-blue-50'
                  }`}
                >
                  <span className={`font-heading font-extrabold text-lg w-6 ${r.hot ? 'text-navy-800' : 'text-yellow-500'}`}>{r.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm truncate">{r.name}</p>
                    <p className={`text-xs ${r.hot ? 'text-navy-700' : 'text-blue-300'}`}>{r.cat} · {r.metric}</p>
                  </div>
                  <ChevronRight size={16} className={r.hot ? 'text-navy-800' : 'text-blue-300'} />
                </MotionLink>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ 04 Perjalanan usaha — milestone interaktif + kisah pencapaian ═══ */}
      <JourneySection />

      {/* ═══ Cerita foto: scroll-driven image storytelling (4 foto) ═══ */}
      <PhotoStory />

      {/* ═══ CTA ═══ */}
      <section className="bg-blue-50 border-t border-blue-200">
        <div className="max-w-6xl mx-auto px-5 py-16">
        <motion.div {...reveal} className="relative overflow-hidden rounded-3xl">
          <img src={PHOTOS.mie} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-navy-900/80" />
          <div className="relative px-8 py-14 sm:px-14 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-blue-50">
                Usahamu layak <span className="bg-yellow-500 text-navy-800 px-2 rounded-lg">ditemukan.</span>
              </h2>
              <p className="text-blue-300 text-sm mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                <Clock size={14} /> Daftar 10 menit · Gratis selamanya untuk UMKM mikro
              </p>
            </div>
            <MotionLink
              to="/register"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="shrink-0 flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-navy-800 font-heading font-bold px-7 py-4 rounded-full shadow-lg shadow-yellow-500/25 transition-colors"
            >
              <Store size={18} /> Daftarkan Usaha
            </MotionLink>
          </div>
        </motion.div>
        </div>
      </section>

      {/* ═══ Newsletter band ═══ */}
      <section className="bg-blue-50 border-t border-blue-200">
        <div className="max-w-6xl mx-auto px-5 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="font-heading font-extrabold text-xl">Dapatkan info promo di sekitarmu</h2>
            <p className="text-navy-500 text-sm mt-1">Seminggu sekali, langsung ke email. Tanpa spam.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} className="flex w-full sm:w-auto items-center gap-2 bg-white border border-blue-300 rounded-full p-1.5 pl-4 focus-within:border-navy-600 transition-colors">
            <Mail size={17} className="text-navy-500 shrink-0" />
            <input
              type="email"
              placeholder="Alamat email kamu"
              className="w-full sm:w-56 outline-none text-sm text-navy-800 placeholder:text-navy-500/50 bg-transparent"
            />
            <button type="submit" className="shrink-0 flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-heading font-bold px-5 py-2.5 rounded-full transition-colors">
              <Send size={14} /> Langganan
            </button>
          </form>
        </div>
      </section>

      {/* ═══ Footer bidang kuning ala Broccoli ═══ */}
      <footer className="relative overflow-hidden bg-yellow-500 text-navy-800">
        {/* liquid shape di bidang kuning */}
        <div className="blob-morph-slow absolute -top-14 -right-14 w-64 h-64 bg-navy-800/10 pointer-events-none" aria-hidden="true" />
        <div className="blob-morph absolute -bottom-20 -left-10 w-56 h-56 bg-white/20 pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-5 pt-12 pb-10">
          {/* logo di tengah */}
          <div className="flex flex-col items-center gap-2">
            <span className="bg-navy-800 text-yellow-500 p-3 rounded-2xl"><MapPin size={26} /></span>
            <span className="font-heading font-extrabold text-2xl">PesanLokal</span>
            <p className="text-navy-700 text-sm">Diisi pemilik · Diverifikasi admin · Ditemukan tetangga</p>
          </div>

          {/* kolom info ringkas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-12 text-sm">
            <div>
              <p className="font-heading font-bold uppercase tracking-wide text-xs mb-3">Alamat</p>
              <p className="text-navy-700 leading-relaxed">Jakarta, Indonesia<br />Kelurahan Pilot Project</p>
            </div>
            <div>
              <p className="font-heading font-bold uppercase tracking-wide text-xs mb-3">Kontak</p>
              <p className="text-navy-700 leading-relaxed">+62 812-0000-0000<br />halo@pesanlokal.id</p>
            </div>
            <div>
              <p className="font-heading font-bold uppercase tracking-wide text-xs mb-3">Media Sosial</p>
              <div className="flex gap-2">
                {[Globe, MessageCircle, Mail, Phone].map((Icon, i) => (
                  <a key={i} href="#" className="bg-navy-800 hover:bg-navy-700 text-yellow-500 p-2 rounded-full transition-colors" aria-label="Media sosial">
                    <Icon size={14} />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="font-heading font-bold uppercase tracking-wide text-xs mb-3">Navigasi</p>
              <ul className="space-y-1.5 text-navy-700">
                <li><Link to="/explore" className="hover:text-navy-900 font-medium transition-colors">Peta Usaha</Link></li>
                <li><Link to="/register" className="hover:text-navy-900 font-medium transition-colors">Daftarkan Usaha</Link></li>
                <li><Link to="/dashboard" className="hover:text-navy-900 font-medium transition-colors">Dashboard Usaha</Link></li>
              </ul>
            </div>
          </div>
        </div>
        {/* bottom bar navy */}
        <div className="bg-navy-800 text-blue-300">
          <div className="max-w-6xl mx-auto px-5 py-4 text-xs flex flex-col sm:flex-row justify-between gap-2">
            <span>© 2026 PesanLokal — Techcomfest 2027</span>
            <div className="flex gap-5">
              <a href="#" className="hover:text-yellow-500 transition-colors">Kebijakan Privasi</a>
              <a href="#" className="hover:text-yellow-500 transition-colors">Syarat & Ketentuan</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ Modal detail usaha — dibuka dari kartu "Lagi rame" ═══ */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-[60] bg-navy-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="relative h-48">
                <img src={selected.img} alt={selected.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent" aria-hidden="true" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white text-navy-800 p-2 rounded-full shadow transition-colors"
                  aria-label="Tutup"
                >
                  <X size={16} />
                </button>
                {selected.promo && (
                  <span className="absolute top-3 left-3 bg-yellow-500 text-navy-800 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow">
                    {selected.promo}
                  </span>
                )}
                <div className="absolute bottom-3 left-4 text-white">
                  <p className="font-heading font-extrabold text-lg leading-tight">{selected.name}</p>
                  <p className="text-xs text-blue-200">{selected.cat}</p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="flex items-center gap-1 bg-blue-100 text-navy-700 font-bold px-2.5 py-1.5 rounded-lg">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" /> {selected.rating} ({selected.reviews} ulasan)
                  </span>
                  <span className="flex items-center gap-1 bg-blue-100 text-navy-700 font-semibold px-2.5 py-1.5 rounded-lg">
                    <MapPin size={12} /> {selected.dist}
                  </span>
                  <span className="flex items-center gap-1 bg-blue-100 text-navy-700 font-semibold px-2.5 py-1.5 rounded-lg">
                    <Clock size={12} /> {selected.hours}
                  </span>
                  <span className={`font-bold px-2.5 py-1.5 rounded-lg ${selected.open ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {selected.open ? 'Buka sekarang' : 'Sedang tutup'}
                  </span>
                </div>
                <p className="text-sm text-navy-500 leading-relaxed mt-4">{selected.desc}</p>
                <div className="flex gap-2 mt-5">
                  <MotionLink
                    to={`/explore?usaha=${encodeURIComponent(selected.id)}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-bold py-3 rounded-xl transition-colors"
                  >
                    <MapPin size={15} /> Lihat di Peta
                  </MotionLink>
                  <motion.a
                    href={`https://wa.me/${String(selected.phone ?? '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-sm font-bold px-5 py-3 rounded-xl transition-colors"
                  >
                    <Phone size={15} /> Hubungi
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
