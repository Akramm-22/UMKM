import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, LayoutGrid, Radar, ShieldCheck, Building2, TriangleAlert, SlidersHorizontal,
  LogOut, Search, Bell, TrendingUp, TrendingDown, Hourglass, BadgePercent, Footprints,
  Star, Check, X, ChevronRight, UtensilsCrossed, Wrench, ShoppingBasket, Megaphone,
  Users, BadgeCheck, Flag, Map as MapIcon, Save, RotateCcw, EyeOff, Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const MONTHS = [
  { m: 'Jun', v: 14 }, { m: 'Jul', v: 22 }, { m: 'Agu', v: 19 },
  { m: 'Sep', v: 31 }, { m: 'Okt', v: 27 }, { m: 'Nov', v: 38 },
];

const CATEGORY_DIST = [
  { label: 'Kuliner', icon: UtensilsCrossed, count: 94, pct: 53, color: 'bg-yellow-500' },
  { label: 'Jasa', icon: Wrench, count: 48, pct: 27, color: 'bg-info' },
  { label: 'Toko', icon: ShoppingBasket, count: 35, pct: 20, color: 'bg-navy-600' },
];

// satu sumber data untuk semua halaman panel
const BIZ_INIT = [
  { id: 1, name: 'Warung Nasi Bu Siti', owner: 'Siti Aminah', cat: 'Kuliner', status: 'approved', rating: 4.8, views: 1240, joined: 'Mei 2026' },
  { id: 2, name: 'Kopi Kampung Senja', owner: 'Dimas P.', cat: 'Kuliner', status: 'pending', waited: '2 jam', dist: '1.2 km' },
  { id: 3, name: 'Laundry Kilat 24', owner: 'Ratna S.', cat: 'Jasa', status: 'pending', waited: '5 jam', dist: '0.8 km' },
  { id: 4, name: 'Toko Sembako Berkah', owner: 'H. Mahmud', cat: 'Toko', status: 'approved', rating: 4.7, views: 890, joined: 'Jun 2026' },
  { id: 5, name: 'Sate Ayam Bang Jali', owner: 'Jali', cat: 'Kuliner', status: 'reported', rating: 4.9, views: 2100, joined: 'Apr 2026', reason: 'Jam buka tidak sesuai kenyataan — tutup pukul 21.00, tertulis 23.00.', reporter: 'Laporan konsumen · 3 jam lalu' },
  { id: 6, name: 'Pangkas Rambut Mandiri', owner: 'Ujang', cat: 'Jasa', status: 'pending', waited: '9 jam', dist: '1.6 km' },
  { id: 7, name: 'Kue Basah Bu Imas', owner: 'Imas K.', cat: 'Kuliner', status: 'pending', waited: '14 jam', dist: '0.5 km' },
  { id: 8, name: 'Jahit Rapi Teh Euis', owner: 'Euis', cat: 'Jasa', status: 'approved', rating: 4.6, views: 410, joined: 'Agu 2026' },
];

const STATUS_META = {
  approved: { label: 'Tayang', cls: 'bg-success/10 text-success' },
  pending: { label: 'Menunggu', cls: 'bg-yellow-500/15 text-yellow-600' },
  reported: { label: 'Dilaporkan', cls: 'bg-danger/10 text-danger' },
  rejected: { label: 'Ditangguhkan', cls: 'bg-blue-200 text-navy-500' },
};

const ACTIVITIES = [
  { icon: BadgeCheck, color: 'text-success bg-success/10', text: 'Warung Nasi Bu Siti disetujui', time: '5 mnt lalu' },
  { icon: Store, color: 'text-info bg-info/10', text: 'Pendaftaran baru: Kue Basah Bu Imas', time: '1 jam lalu' },
  { icon: Flag, color: 'text-danger bg-danger/10', text: 'Sate Ayam Bang Jali dilaporkan (info jam buka)', time: '3 jam lalu' },
  { icon: Megaphone, color: 'text-yellow-600 bg-yellow-500/15', text: 'Promo baru: Diskon 10% — Warung Nasi Bu Siti', time: '6 jam lalu' },
  { icon: Users, color: 'text-navy-600 bg-blue-200/70', text: '31 pengguna baru hari ini', time: '8 jam lalu' },
];

// sparkline mini untuk kartu statistik
function Spark({ points, up = true }) {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * 64},${24 - (p / Math.max(...points)) * 22}`).join(' ');
  return (
    <svg viewBox="0 0 64 26" className="w-16 h-6" aria-hidden="true">
      <path d={d} fill="none" stroke={up ? '#2E9E6B' : '#E05252'} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut', delay },
});

// saklar untuk halaman pengaturan
function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`w-10 h-6 shrink-0 rounded-full p-0.5 transition-colors ${on ? 'bg-success' : 'bg-blue-300'}`}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`block w-5 h-5 bg-white rounded-full shadow ${on ? 'ml-auto' : ''}`} />
    </button>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('ringkasan');
  const [biz, setBiz] = useState(BIZ_INIT);
  const [decided, setDecided] = useState({ approved: 0, rejected: 0 });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('semua');
  const [notifOpen, setNotifOpen] = useState(false);
  const [settings, setSettings] = useState({ email: true, autoPub: false, strict: true, sla: 24, radius: 2 });
  const [saved, setSaved] = useState(false);

  const maxV = useMemo(() => Math.max(...MONTHS.map((m) => m.v)), []);
  const pending = biz.filter((b) => b.status === 'pending');
  const reported = biz.filter((b) => b.status === 'reported');

  const setStatus = (id, status, isDecision = false) => {
    setBiz((list) => list.map((b) => (b.id === id ? { ...b, status } : b)));
    if (isDecision) setDecided((d) => (status === 'approved' ? { ...d, approved: d.approved + 1 } : { ...d, rejected: d.rejected + 1 }));
  };

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const saveSettings = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const STATS = [
    { icon: Building2, label: 'Total Usaha Tayang', val: 174 + biz.filter((b) => b.status === 'approved').length, delta: '+12 minggu ini', up: true, spark: [8, 11, 10, 14, 13, 17, 19], grad: 'from-navy-700 to-navy-900 text-yellow-400' },
    { icon: Hourglass, label: 'Menunggu Verifikasi', val: pending.length, delta: `SLA ≤ ${settings.sla} jam`, up: pending.length < 5, spark: [6, 5, 7, 4, 5, 3, Math.max(pending.length, 1)], grad: 'from-yellow-400 to-yellow-600 text-navy-800' },
    { icon: BadgePercent, label: 'Promo Aktif', val: 23, delta: '+5 vs minggu lalu', up: true, spark: [12, 14, 13, 17, 16, 20, 23], grad: 'from-info to-navy-600 text-white' },
    { icon: Footprints, label: 'Kunjungan Peta', val: '12.4k', delta: '-3% hari ini', up: false, spark: [30, 34, 31, 36, 33, 29, 28], grad: 'from-blue-300 to-blue-400 text-navy-800' },
  ];

  const NAV = [
    { key: 'ringkasan', icon: LayoutGrid, label: 'Ringkasan' },
    { key: 'peta', icon: Radar, label: 'Peta Komando', to: '/admin/peta' },
    { key: 'verifikasi', icon: ShieldCheck, label: 'Verifikasi', badge: pending.length },
    { key: 'usaha', icon: Building2, label: 'Daftar Usaha' },
    { key: 'laporan', icon: TriangleAlert, label: 'Laporan', badge: reported.length },
    { key: 'pengaturan', icon: SlidersHorizontal, label: 'Pengaturan' },
  ];

  const TITLES = {
    ringkasan: { h: `Selamat pagi, ${user?.name?.split(' ')[0] ?? 'Admin'} 🛡️`, p: 'Pantau kesehatan ekosistem UMKM-mu hari ini.' },
    verifikasi: { h: 'Verifikasi Pendaftaran', p: `${pending.length} usaha menunggu tinjauanmu — jaga SLA ≤ ${settings.sla} jam.` },
    usaha: { h: 'Daftar Usaha', p: `${biz.length} usaha terdaftar di wilayahmu.` },
    laporan: { h: 'Laporan Masuk', p: reported.length ? `${reported.length} laporan butuh tindak lanjut.` : 'Tidak ada laporan aktif.' },
    pengaturan: { h: 'Pengaturan Panel', p: 'Atur kebijakan verifikasi dan notifikasi.' },
  };

  const filtered = biz.filter((b) => {
    const okFilter = filter === 'semua' || b.status === filter;
    const q = query.trim().toLowerCase();
    const okQuery = !q || b.name.toLowerCase().includes(q) || b.owner.toLowerCase().includes(q);
    return okFilter && okQuery;
  });

  // baris antrean verifikasi — dipakai di ringkasan & halaman verifikasi
  const QueueRow = ({ b, detail = false }) => (
    <motion.div
      layout
      exit={{ opacity: 0, x: 40, height: 0, marginTop: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-3"
    >
      <span className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-yellow-400 font-heading font-extrabold text-sm flex items-center justify-center shadow-sm">
        {b.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-xs font-bold truncate">{b.name}</p>
        <p className="text-[10px] text-navy-500 truncate">
          {b.owner} · {b.cat} · menunggu {b.waited}{detail && b.dist ? ` · ${b.dist} dari pusat` : ''}
        </p>
      </div>
      <div className="flex gap-2 ml-auto">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setStatus(b.id, 'approved', true)}
          className="flex items-center gap-1 bg-success hover:brightness-110 text-white text-[11px] font-bold px-3 py-2 rounded-lg transition-all"
        >
          <Check size={12} /> Setujui
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setStatus(b.id, 'rejected', true)}
          className="flex items-center gap-1 bg-white border border-blue-200 hover:border-danger hover:text-danger text-navy-500 text-[11px] font-bold px-3 py-2 rounded-lg transition-colors"
        >
          <X size={12} /> Tolak
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-blue-50 font-body text-navy-800 overflow-hidden">
      {/* ═══ Header mobile: logo + chip navigasi ═══ */}
      <div className="lg:hidden shrink-0 bg-navy-800 text-blue-300 px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-base text-blue-50">
            <span className="bg-yellow-500 text-navy-800 p-1.5 rounded-full"><MapPin size={14} /></span>
            PesanLokal<span className="text-yellow-500">.</span>
          </Link>
          <span className="text-[9px] font-bold uppercase tracking-widest text-navy-500 mt-0.5">Admin</span>
          <button onClick={doLogout} className="ml-auto text-navy-500 hover:text-danger transition-colors p-1.5" aria-label="Keluar">
            <LogOut size={16} />
          </button>
        </div>
        <nav className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar">
          {NAV.map((n) => {
            const active = view === n.key;
            if (n.to) {
              return (
                <Link key={n.key} to={n.to} className="shrink-0 flex items-center gap-1.5 bg-navy-700 text-blue-300 text-xs font-bold px-3.5 py-2 rounded-full">
                  <n.icon size={13} /> {n.label}
                </Link>
              );
            }
            return (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full transition-colors ${
                  active ? 'bg-yellow-500 text-navy-800' : 'bg-navy-700 text-blue-300'
                }`}
              >
                <n.icon size={13} /> {n.label}
                {n.badge ? (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${active ? 'bg-navy-800 text-yellow-500' : 'bg-yellow-500 text-navy-800'}`}>{n.badge}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ═══ Sidebar navy ═══ */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-navy-800 text-blue-300 m-3 rounded-3xl p-5 relative overflow-hidden">
        <div className="blob-morph absolute -top-16 -right-16 w-48 h-48 bg-yellow-500/10 pointer-events-none" aria-hidden="true" />
        <Link to="/" className="relative flex items-center gap-2 font-heading font-extrabold text-lg text-blue-50">
          <span className="bg-yellow-500 text-navy-800 p-1.5 rounded-full"><MapPin size={16} /></span>
          PesanLokal<span className="text-yellow-500">.</span>
        </Link>
        <p className="relative text-[10px] font-bold uppercase tracking-widest text-navy-500 mt-1.5 ml-0.5">Panel Admin</p>

        <nav className="relative mt-8 space-y-1.5">
          {NAV.map((n) => {
            const active = view === n.key;
            if (n.to) {
              return (
                <Link key={n.key} to={n.to} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-navy-700/70 hover:text-blue-50">
                  <n.icon size={17} /> {n.label}
                </Link>
              );
            }
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => setView(n.key)}
                className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active ? 'text-navy-800' : 'hover:bg-navy-700/70 hover:text-blue-50'
                }`}
              >
                {active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 bg-yellow-500 rounded-xl shadow-lg shadow-yellow-500/20" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className="relative flex items-center gap-3 w-full">
                  <n.icon size={17} />
                  {n.label}
                  {n.badge ? (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-navy-800 text-yellow-500' : 'bg-yellow-500 text-navy-800'}`}>
                      {n.badge}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="relative mt-auto pt-4 border-t border-navy-600">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-blue-300 text-navy-800 font-heading font-extrabold text-sm flex items-center justify-center">
              {(user?.name ?? 'Admin').slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-blue-50 truncate">{user?.name ?? 'Admin Demo'}</p>
              <p className="text-[10px] text-navy-500">Administrator</p>
            </div>
            <button onClick={doLogout} className="text-navy-500 hover:text-danger transition-colors" aria-label="Keluar">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ═══ Konten utama ═══ */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-6">
          {/* topbar */}
          <motion.div {...rise(0)} className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-heading font-extrabold text-lg sm:text-xl truncate">{TITLES[view].h}</h1>
              <p className="text-xs text-navy-500 mt-0.5">{TITLES[view].p}</p>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); setView('usaha'); }}
              className="order-last sm:order-none w-full sm:w-64 sm:ml-auto flex items-center gap-2 bg-white border border-blue-200 rounded-full pl-4 pr-2 py-2 focus-within:border-navy-600 transition-colors"
            >
              <Search size={15} className="text-navy-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (e.target.value) setView('usaha'); }}
                placeholder="Cari usaha, pemilik…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-navy-500/60"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-navy-500 hover:text-danger" aria-label="Hapus pencarian"><X size={13} /></button>
              )}
            </form>
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className={`relative border p-2.5 rounded-full transition-colors ${notifOpen ? 'bg-navy-800 border-navy-800 text-yellow-500' : 'bg-white border-blue-200 hover:bg-blue-100'}`}
                aria-label="Notifikasi"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white" />
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-12 z-30 w-80 bg-white border border-blue-200 rounded-2xl shadow-xl shadow-navy-800/10 p-4"
                  >
                    <p className="font-heading font-bold text-xs">Notifikasi</p>
                    <div className="mt-3 space-y-3">
                      {ACTIVITIES.slice(0, 4).map((a) => (
                        <div key={a.text} className="flex items-start gap-2.5">
                          <span className={`shrink-0 p-1.5 rounded-lg ${a.color}`}><a.icon size={12} /></span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold leading-sung">{a.text}</p>
                            <p className="text-[10px] text-navy-500">{a.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ═══ RINGKASAN ═══ */}
          {view === 'ringkasan' && (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                {STATS.map((s, i) => (
                  <motion.div key={s.label} {...rise(0.05 + i * 0.06)} whileHover={{ y: -4 }} className="bg-white border border-blue-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <span className={`bg-gradient-to-br ${s.grad} p-2.5 rounded-xl shadow-md`}><s.icon size={16} /></span>
                      <Spark points={s.spark} up={s.up} />
                    </div>
                    <p className="font-heading font-extrabold text-2xl mt-3">{s.val}</p>
                    <p className="text-[11px] font-semibold text-navy-500 mt-0.5">{s.label}</p>
                    <p className={`flex items-center gap-1 text-[10px] font-bold mt-2 ${s.up ? 'text-success' : 'text-danger'}`}>
                      {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {s.delta}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="grid lg:grid-cols-5 gap-4 mt-4">
                {/* grafik pendaftaran */}
                <motion.div {...rise(0.3)} className="lg:col-span-3 bg-white border border-blue-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading font-bold text-sm">Pendaftaran Usaha</p>
                      <p className="text-[11px] text-navy-500 mt-0.5">6 bulan terakhir</p>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-success bg-success/10 px-2 py-1 rounded-lg">
                      <TrendingUp size={11} /> +41%
                    </span>
                  </div>
                  <div className="flex items-end justify-between gap-3 h-40 mt-5">
                    {MONTHS.map((m, i) => (
                      <div key={m.m} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group">
                        <span className="text-[10px] font-bold text-navy-700 opacity-0 group-hover:opacity-100 transition-opacity">{m.v}</span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(m.v / maxV) * 78}%` }}
                          transition={{ duration: 0.6, delay: 0.4 + i * 0.07, ease: 'easeOut' }}
                          className={`w-full rounded-t-lg ${i === MONTHS.length - 1 ? 'bg-yellow-500 shadow-lg shadow-yellow-500/30' : 'bg-blue-300 group-hover:bg-navy-600'} transition-colors`}
                        />
                        <span className={`text-[10px] font-semibold ${i === MONTHS.length - 1 ? 'text-navy-800 font-bold' : 'text-navy-500'}`}>{m.m}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* distribusi kategori */}
                <motion.div {...rise(0.36)} className="lg:col-span-2 bg-navy-800 text-blue-50 rounded-2xl p-5 relative overflow-hidden">
                  <div className="blob-morph-slow absolute -bottom-16 -right-12 w-44 h-44 bg-yellow-500/10 pointer-events-none" aria-hidden="true" />
                  <p className="relative font-heading font-bold text-sm">Distribusi Kategori</p>
                  <p className="relative text-[11px] text-blue-300 mt-0.5">{174 + biz.filter((b) => b.status === 'approved').length} usaha tayang</p>
                  <div className="relative space-y-4 mt-5">
                    {CATEGORY_DIST.map((c, i) => (
                      <div key={c.label}>
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <c.icon size={13} className="text-yellow-500" /> {c.label}
                          <span className="ml-auto font-bold">{c.count}</span>
                          <span className="text-blue-300 text-[10px]">({c.pct}%)</span>
                        </div>
                        <div className="h-2 bg-navy-700 rounded-full mt-1.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${c.pct}%` }}
                            transition={{ duration: 0.7, delay: 0.5 + i * 0.12, ease: 'easeOut' }}
                            className={`h-full rounded-full ${c.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/admin/peta" className="relative mt-6 flex items-center justify-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-xs font-bold py-2.5 rounded-xl transition-colors">
                    <MapIcon size={14} /> Buka Peta Komando <ChevronRight size={13} />
                  </Link>
                </motion.div>
              </div>

              <div className="grid lg:grid-cols-5 gap-4 mt-4 pb-8">
                {/* antrean verifikasi ringkas */}
                <motion.div {...rise(0.42)} className="lg:col-span-3 bg-white border border-blue-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading font-bold text-sm">Antrean Verifikasi</p>
                      <p className="text-[11px] text-navy-500 mt-0.5">
                        {pending.length} menunggu · sesi ini: <span className="text-success font-bold">{decided.approved} disetujui</span>
                        {decided.rejected > 0 && <> · <span className="text-danger font-bold">{decided.rejected} ditolak</span></>}
                      </p>
                    </div>
                    <button onClick={() => setView('verifikasi')} className="flex items-center gap-0.5 text-[11px] font-bold text-navy-700 hover:text-yellow-600 transition-colors">
                      Lihat semua <ChevronRight size={13} />
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <AnimatePresence>
                      {pending.slice(0, 3).map((b) => <QueueRow key={b.id} b={b} />)}
                    </AnimatePresence>
                    {pending.length === 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                        <BadgeCheck size={28} className="mx-auto text-success" />
                        <p className="text-xs font-bold mt-2">Antrean bersih! 🎉</p>
                        <p className="text-[11px] text-navy-500 mt-0.5">Semua pendaftaran sudah ditinjau.</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* aktivitas terbaru */}
                <motion.div {...rise(0.48)} className="lg:col-span-2 bg-white border border-blue-200 rounded-2xl p-5">
                  <p className="font-heading font-bold text-sm">Aktivitas Terbaru</p>
                  <div className="mt-4 space-y-4">
                    {ACTIVITIES.map((a, i) => (
                      <motion.div key={a.text} {...rise(0.55 + i * 0.06)} className="flex items-start gap-3">
                        <span className={`shrink-0 p-2 rounded-xl ${a.color}`}><a.icon size={14} /></span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-snug">{a.text}</p>
                          <p className="text-[10px] text-navy-500 mt-0.5">{a.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </>
          )}

          {/* ═══ VERIFIKASI ═══ */}
          {view === 'verifikasi' && (
            <motion.div {...rise(0.05)} className="bg-white border border-blue-200 rounded-2xl p-5 mt-6 mb-8">
              <div className="flex items-center justify-between">
                <p className="font-heading font-bold text-sm">Semua Antrean ({pending.length})</p>
                <span className="bg-yellow-500/15 text-yellow-600 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide">SLA ≤ {settings.sla} jam</span>
              </div>
              <div className="mt-4 space-y-2">
                <AnimatePresence>
                  {pending.map((b) => <QueueRow key={b.id} b={b} detail />)}
                </AnimatePresence>
                {pending.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                    <BadgeCheck size={32} className="mx-auto text-success" />
                    <p className="text-sm font-bold mt-2.5">Antrean bersih! 🎉</p>
                    <p className="text-xs text-navy-500 mt-1">Semua pendaftaran sudah ditinjau. Kerja bagus.</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ DAFTAR USAHA ═══ */}
          {view === 'usaha' && (
            <motion.div {...rise(0.05)} className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 mt-6 mb-8">
              <div className="flex flex-wrap items-center gap-2">
                {['semua', 'approved', 'pending', 'reported', 'rejected'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                      filter === f ? 'bg-navy-800 text-yellow-500' : 'bg-blue-100 text-navy-500 hover:bg-blue-200'
                    }`}
                  >
                    {f === 'semua' ? `Semua (${biz.length})` : `${STATUS_META[f].label} (${biz.filter((b) => b.status === f).length})`}
                  </button>
                ))}
              </div>
              <div className="mt-4 divide-y divide-blue-100">
                <AnimatePresence>
                  {filtered.map((b) => (
                    <motion.div key={b.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-yellow-400 font-heading font-extrabold flex items-center justify-center shadow-sm">
                        {b.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{b.name}</p>
                        <p className="text-[10px] text-navy-500 truncate">
                          {b.owner} · {b.cat}{b.joined ? ` · sejak ${b.joined}` : ''}
                        </p>
                      </div>
                      {b.rating && (
                        <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold">
                          <Star size={11} className="text-yellow-500 fill-yellow-500" /> {b.rating}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${STATUS_META[b.status].cls}`}>{STATUS_META[b.status].label}</span>
                      {b.status === 'approved' && (
                        <button onClick={() => setStatus(b.id, 'rejected')} className="flex items-center gap-1 text-[10px] font-bold text-navy-500 hover:text-danger border border-blue-200 hover:border-danger px-2.5 py-1.5 rounded-lg transition-colors">
                          <EyeOff size={11} /> Tangguhkan
                        </button>
                      )}
                      {b.status === 'rejected' && (
                        <button onClick={() => setStatus(b.id, 'approved')} className="flex items-center gap-1 text-[10px] font-bold text-navy-500 hover:text-success border border-blue-200 hover:border-success px-2.5 py-1.5 rounded-lg transition-colors">
                          <RotateCcw size={11} /> Pulihkan
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filtered.length === 0 && (
                  <p className="text-center text-xs text-navy-500 py-10">Tidak ada usaha yang cocok{query ? ` dengan “${query}”` : ''}.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ LAPORAN ═══ */}
          {view === 'laporan' && (
            <div className="mt-6 mb-8 space-y-4">
              <AnimatePresence>
                {reported.map((b) => (
                  <motion.div
                    key={b.id}
                    layout
                    {...rise(0.05)}
                    exit={{ opacity: 0, x: 40 }}
                    className="bg-white border-l-4 border-danger border-y border-r border-y-blue-200 border-r-blue-200 rounded-2xl p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 bg-danger/10 text-danger p-2.5 rounded-xl"><TriangleAlert size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-heading font-bold">{b.name}</p>
                        <p className="text-[11px] text-navy-500 mt-0.5">{b.owner} · {b.cat} · {b.reporter}</p>
                        <p className="text-xs text-navy-700 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 mt-3 leading-relaxed">“{b.reason}”</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 sm:pl-12">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setStatus(b.id, 'approved')}
                        className="flex items-center gap-1.5 bg-success hover:brightness-110 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg transition-all"
                      >
                        <Check size={12} /> Abaikan Laporan
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setStatus(b.id, 'rejected')}
                        className="flex items-center gap-1.5 bg-white border border-blue-200 hover:border-danger hover:text-danger text-navy-500 text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors"
                      >
                        <EyeOff size={12} /> Tangguhkan Usaha
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {reported.length === 0 && (
                <motion.div {...rise(0.05)} className="bg-white border border-blue-200 rounded-2xl text-center py-14">
                  <ShieldCheck size={32} className="mx-auto text-success" />
                  <p className="text-sm font-bold mt-2.5">Semua aman! 🛡️</p>
                  <p className="text-xs text-navy-500 mt-1">Tidak ada laporan yang menunggu tindak lanjut.</p>
                </motion.div>
              )}
            </div>
          )}

          {/* ═══ PENGATURAN ═══ */}
          {view === 'pengaturan' && (
            <motion.div {...rise(0.05)} className="max-w-xl mt-6 mb-8 space-y-4">
              <div className="bg-white border border-blue-200 rounded-2xl p-5">
                <p className="font-heading font-bold text-sm">Verifikasi</p>
                <div className="mt-4 space-y-4">
                  <label className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold">Mode ketat</p>
                      <p className="text-[11px] text-navy-500 mt-0.5">Wajibkan foto tempat usaha & nomor HP aktif saat mendaftar.</p>
                    </div>
                    <Toggle on={settings.strict} onClick={() => setSettings((s) => ({ ...s, strict: !s.strict }))} />
                  </label>
                  <label className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold">Auto-publikasi</p>
                      <p className="text-[11px] text-navy-500 mt-0.5">Usaha dari pemilik terverifikasi langsung tayang tanpa antre.</p>
                    </div>
                    <Toggle on={settings.autoPub} onClick={() => setSettings((s) => ({ ...s, autoPub: !s.autoPub }))} />
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold">Target SLA verifikasi</p>
                      <p className="text-[11px] text-navy-500 mt-0.5">Batas waktu tinjauan pendaftaran baru.</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min="1" max="72" value={settings.sla}
                        onChange={(e) => setSettings((s) => ({ ...s, sla: +e.target.value }))}
                        className="w-16 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center outline-none focus:border-navy-600"
                      />
                      <span className="text-[11px] font-semibold text-navy-500">jam</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-blue-200 rounded-2xl p-5">
                <p className="font-heading font-bold text-sm">Peta & Notifikasi</p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold">Radius pencarian default</p>
                      <p className="text-[11px] text-navy-500 mt-0.5">Jangkauan awal peta konsumen.</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min="1" max="10" value={settings.radius}
                        onChange={(e) => setSettings((s) => ({ ...s, radius: +e.target.value }))}
                        className="w-16 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center outline-none focus:border-navy-600"
                      />
                      <span className="text-[11px] font-semibold text-navy-500">km</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold">Email pendaftaran baru</p>
                      <p className="text-[11px] text-navy-500 mt-0.5">Kirim ringkasan antrean ke email admin tiap pagi.</p>
                    </div>
                    <Toggle on={settings.email} onClick={() => setSettings((s) => ({ ...s, email: !s.email }))} />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={saveSettings}
                  className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-blue-50 text-xs font-bold px-5 py-3 rounded-xl transition-colors"
                >
                  <Save size={14} /> Simpan Pengaturan
                </motion.button>
                <AnimatePresence>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[11px] font-bold text-success"
                    >
                      <BadgeCheck size={13} /> Tersimpan!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
