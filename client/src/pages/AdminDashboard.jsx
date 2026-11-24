import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconContext, MapPin, SquaresFour as LayoutGrid, Crosshair as Radar, ShieldCheck, Buildings as Building2, WarningOctagon as TriangleAlert,
  SlidersHorizontal, MagnifyingGlass as Search, Bell, Star, Check, X, CaretRight as ChevronRight, Megaphone,
  Users, SealCheck as BadgeCheck, Flag, FloppyDisk as Save, ArrowCounterClockwise as RotateCcw, EyeSlash as EyeOff, Storefront as Store, House as Home,
  ArrowLineLeft as PanelLeftClose, ArrowLineRight as PanelLeftOpen, ArrowLeft, ChatText as MessageSquare, Trash as Trash2,
  Eye, ForkKnife, Wrench, Basket, Hourglass, Lock,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext.jsx';
import ProfileMenu, { Avatar } from '../components/ProfileMenu.jsx';
import SubmissionReview from '../components/SubmissionReview.jsx';
import DecisionResult from '../components/DecisionResult.jsx';
import AdminOverview from '../components/admin/AdminOverview.jsx';
import {
  demoSubmission, demoDecision, localSubmissions, apiSubmissions, saveDecision, verificationLog, reasonText, waitedHours, fmtWaited,
} from '../lib/verification.js';
import { fetchReports, resolveReport, reasonLabel, fetchLocalReviews, removeReview } from '../lib/feedback.js';

const timeAgo = (iso) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} mnt lalu`;
  if (m < 1440) return `${Math.round(m / 60)} jam lalu`;
  return `${Math.round(m / 1440)} hari lalu`;
};

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
].map((b) => {
  if (b.status !== 'pending') return b;
  const decided = demoDecision(b.id);
  return { ...b, status: decided?.status ?? 'pending', source: 'demo', submission: demoSubmission(b.id) };
});

const STATUS_META = {
  approved: { label: 'Tayang', cls: 'bg-success/10 text-success', color: '#2E9E6B', icon: BadgeCheck },
  pending: { label: 'Menunggu', cls: 'bg-yellow-500/15 text-yellow-600', color: '#E6B000', icon: Hourglass },
  reported: { label: 'Dilaporkan', cls: 'bg-danger/10 text-danger', color: '#E05252', icon: Flag },
  rejected: { label: 'Ditangguhkan', cls: 'bg-blue-200 text-navy-500', color: '#5B7A99', icon: EyeOff },
};

const CAT_META = {
  Kuliner: { icon: ForkKnife, color: '#F2771A' },
  Jasa: { icon: Wrench, color: '#4A90D9' },
  Toko: { icon: Basket, color: '#2E9E6B' },
};

const ACTIVITIES = [
  { icon: BadgeCheck, color: 'text-success bg-success/10', text: 'Warung Nasi Bu Siti disetujui', time: '5 mnt lalu' },
  { icon: Store, color: 'text-info bg-info/10', text: 'Pendaftaran baru: Kue Basah Bu Imas', time: '1 jam lalu' },
  { icon: Flag, color: 'text-danger bg-danger/10', text: 'Sate Ayam Bang Jali dilaporkan (info jam buka)', time: '3 jam lalu' },
  { icon: Megaphone, color: 'text-yellow-600 bg-yellow-500/15', text: 'Promo baru: Diskon 10% — Warung Nasi Bu Siti', time: '6 jam lalu' },
  { icon: Users, color: 'text-navy-600 bg-blue-200/70', text: '31 pengguna baru hari ini', time: '8 jam lalu' },
];

const SETTINGS_KEY = 'pl_admin_settings';
const SLA_HOURS = 24;
const SETTINGS_DEFAULT = {
  strict: true, autoPub: false, reviewMod: false,
  reportFirst: true, autoHide: false,
  email: true, notifNew: true, notifReport: true,
  sla: SLA_HOURS,
};
function loadSettings() {
  try {
    const s = { ...SETTINGS_DEFAULT, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
    delete s.radius;
    return { ...s, sla: SLA_HOURS };
  } catch {
    return SETTINGS_DEFAULT;
  }
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

// baris & kelompok halaman pengaturan
function SettingRow({ icon: Icon, color, title, desc, children, htmlFor }) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-3 px-5 py-4">
      <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}><Icon size={18} /></span>
      <div className="min-w-0 flex-1 basis-48">
        <label htmlFor={htmlFor} className="block text-[13px] font-bold">{title}</label>
        <p className="text-[11px] text-navy-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <div className="shrink-0 ml-auto">{children}</div>
    </div>
  );
}

function SettingSection({ icon: Icon, title, sub, delay, children }) {
  return (
    <motion.section {...rise(delay)} className="bg-white border border-blue-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-blue-100 bg-blue-50/60">
        <Icon size={16} className="text-navy-600" />
        <div>
          <p className="font-heading font-bold text-sm leading-tight">{title}</p>
          <p className="text-[10px] text-navy-500">{sub}</p>
        </div>
      </div>
      <div className="divide-y divide-blue-100">{children}</div>
    </motion.section>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState('ringkasan');
  const [biz, setBiz] = useState(BIZ_INIT);
  const [decided, setDecided] = useState({ approved: 0, rejected: 0 });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('semua');
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [savedSettings, setSavedSettings] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reportTab, setReportTab] = useState('open');
  const [notes, setNotes] = useState({});
  const [busyReport, setBusyReport] = useState(null);
  const [reviewId, setReviewId] = useState(null);
  const [log, setLog] = useState(() => verificationLog());
  const [result, setResult] = useState(null);
  const [statsKey, setStatsKey] = useState(0);

  // gabungkan pengajuan nyata (API) & dari form lokal ke antrean demo
  useEffect(() => {
    const merge = (extra) => setBiz((list) => [...list.filter((b) => !extra.some((x) => x.id === b.id)), ...extra]);
    merge(localSubmissions());
    apiSubmissions().then((rows) => rows.length && merge(rows));
  }, []);

  const loadFeedback = useCallback(() => {
    fetchReports().then(setReports);
    setReviews(fetchLocalReviews());
  }, []);

  // laporan dari tab konsumen di browser yang sama ikut masuk tanpa reload
  useEffect(() => {
    loadFeedback();
    const onStorage = (e) => {
      if (e.key === 'pl_local_reports' || e.key === 'pl_local_reviews') loadFeedback();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadFeedback]);

  const openReports = reports.filter((r) => r.status === 'open');
  const activityFeed = [
    ...openReports.slice(0, 3).map((r) => ({
      icon: Flag,
      color: 'text-danger bg-danger/10',
      text: `Laporan konsumen: ${r.business_name} — ${reasonLabel(r.reason)}`,
      time: timeAgo(r.created_at),
      key: `report-${r.id}`,
    })),
    ...ACTIVITIES,
  ];

  const actOnReport = async (r, status, suspend = false) => {
    setBusyReport(r.id);
    try {
      const updated = await resolveReport(r, { status, suspend, note: notes[r.id] ?? '' });
      setReports((list) => list.map((x) => (x.id === r.id ? updated : x)));
      if (suspend) setBiz((list) => list.map((b) => (b.name === r.business_name ? { ...b, status: 'rejected' } : b)));
      setStatsKey((n) => n + 1);
    } finally {
      setBusyReport(null);
    }
  };

  const deleteReview = async (rv) => {
    await removeReview(rv);
    setReviews((list) => list.filter((x) => x.id !== rv.id));
    setStatsKey((n) => n + 1);
  };

  const pending = biz
    .filter((b) => b.status === 'pending')
    .sort((a, b) => new Date(a.submission?.submitted_at ?? 0) - new Date(b.submission?.submitted_at ?? 0));
  const reported = biz.filter((b) => b.status === 'reported');
  const reviewing = pending.find((b) => b.id === reviewId) ?? null;

  const setStatus = (id, status, isDecision = false) => {
    setBiz((list) => list.map((b) => (b.id === id ? { ...b, status } : b)));
    if (isDecision) setDecided((d) => (status === 'approved' ? { ...d, approved: d.approved + 1 } : { ...d, rejected: d.rejected + 1 }));
  };

  const decide = async (item, decision) => {
    const entry = await saveDecision(item, decision);
    setStatus(item.id, decision.status, true);
    setLog((l) => [entry, ...l]);
    setReviewId(null);
    setResult({ entry, item });
    setStatsKey((n) => n + 1);
  };

  const saveSettings = () => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* penyimpanan penuh/diblokir */ }
    setSavedSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };
  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';

  const NAV = [
    { key: 'ringkasan', icon: LayoutGrid, label: 'Ringkasan' },
    { key: 'peta', icon: Radar, label: 'Peta Komando', to: '/admin/peta' },
    { key: 'verifikasi', icon: ShieldCheck, label: 'Verifikasi', badge: pending.length },
    { key: 'usaha', icon: Building2, label: 'Daftar Usaha' },
    { key: 'laporan', icon: TriangleAlert, label: 'Laporan', badge: reported.length + openReports.length },
    { key: 'pengaturan', icon: SlidersHorizontal, label: 'Pengaturan' },
  ];

  const TITLES = {
    ringkasan: { h: `${greet}, ${user?.name?.split(' ')[0] ?? 'Admin'}`, p: 'Pantau kesehatan ekosistem UMKM-mu — semua angka dihitung dari data sistem.' },
    verifikasi: { h: 'Verifikasi Pendaftaran', p: `${pending.length} usaha menunggu tinjauanmu — jaga SLA ≤ ${settings.sla} jam.` },
    usaha: { h: 'Daftar Usaha', p: `${biz.length} usaha terdaftar di wilayahmu.` },
    laporan: { h: 'Laporan & Ulasan', p: reported.length + openReports.length ? `${reported.length + openReports.length} laporan butuh tindak lanjut.` : 'Tidak ada laporan aktif.' },
    pengaturan: { h: 'Pengaturan Panel', p: 'Atur verifikasi, moderasi, dan notifikasi sesuai kebutuhanmu.' },
  };

  const filtered = biz.filter((b) => {
    const okFilter = filter === 'semua' || b.status === filter;
    const q = query.trim().toLowerCase();
    const okQuery = !q || b.name.toLowerCase().includes(q) || b.owner.toLowerCase().includes(q);
    return okFilter && okQuery;
  });

  // baris antrean verifikasi — keputusan hanya lewat panel tinjauan
  const QueueRow = ({ b, detail = false }) => {
    const sub = b.submission;
    const waited = sub ? waitedHours(sub.submitted_at) : null;
    const over = waited != null && waited > settings.sla;
    const docs = sub?.documents ?? [];
    const docsOk = docs.filter((d) => d.url || d.kind === 'ktp').length;
    return (
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
            {b.owner} · {b.cat}
            {waited != null ? <> · <span className={over ? 'text-danger font-bold' : ''}>menunggu {fmtWaited(waited)}</span></> : b.waited ? ` · menunggu ${b.waited}` : ''}
          </p>
          {detail && sub && (
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] mt-1">
              <span className={docsOk === docs.length ? 'text-success font-semibold' : 'text-yellow-600 font-semibold'}>Dokumen {docsOk}/{docs.length}</span>
              {sub.address && <span className="text-navy-500 truncate max-w-[16rem]">{sub.address}</span>}
            </p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setReviewId(b.id)}
          disabled={!sub}
          className="ml-auto flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 disabled:opacity-50 text-blue-50 text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors"
        >
          <Search size={12} /> Tinjau Detail
        </motion.button>
      </motion.div>
    );
  };

  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
    <div className="h-screen flex flex-col lg:flex-row bg-blue-50 font-body text-navy-800 overflow-hidden">
      {/* ═══ Header mobile: logo + chip navigasi ═══ */}
      <div className="lg:hidden shrink-0 bg-navy-800 text-blue-300 px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-base text-blue-50">
            <span className="bg-yellow-500 text-navy-800 p-1.5 rounded-full"><MapPin size={14} /></span>
            PesanLokal<span className="text-yellow-500">.</span>
          </Link>
          <span className="text-[9px] font-bold uppercase tracking-widest text-navy-500 mt-0.5">Admin</span>
          <ProfileMenu className="ml-auto" logoutTo="/login" />
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
      <aside className={`hidden lg:flex flex-col shrink-0 bg-navy-800 text-blue-300 m-3 rounded-3xl p-5 relative overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-60'}`}>
        <div className="blob-morph absolute -top-16 -right-16 w-48 h-48 bg-yellow-500/10 pointer-events-none" aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-lg text-blue-50 min-w-0">
            <span className="bg-yellow-500 text-navy-800 p-1.5 rounded-full shrink-0"><MapPin size={16} /></span>
            {!sidebarCollapsed && <span className="truncate">PesanLokal<span className="text-yellow-500">.</span></span>}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="ml-auto rounded-lg p-2 text-blue-300 hover:bg-navy-700 hover:text-blue-50 transition-colors"
            aria-label={sidebarCollapsed ? 'Buka sidebar' : 'Ringkas sidebar'}
            title={sidebarCollapsed ? 'Buka sidebar' : 'Ringkas sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        {!sidebarCollapsed && <p className="relative text-[10px] font-bold uppercase tracking-widest text-navy-500 mt-1.5 ml-0.5">Panel Admin</p>}

        <nav className="relative mt-8 space-y-1.5">
          {NAV.map((n) => {
            const active = view === n.key;
            if (n.to) {
              return (
                <Link
                  key={n.key}
                  to={n.to}
                  className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-navy-700/70 hover:text-blue-50 ${sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                  title={sidebarCollapsed ? n.label : undefined}
                >
                  <n.icon size={17} /> {!sidebarCollapsed && n.label}
                </Link>
              );
            }
            return (
              <button
                key={n.key}
                type="button"
                onClick={() => setView(n.key)}
                className={`relative w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active ? 'text-navy-800' : 'hover:bg-navy-700/70 hover:text-blue-50'
                } ${sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                title={sidebarCollapsed ? n.label : undefined}
              >
                {active && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 bg-yellow-500 rounded-xl shadow-lg shadow-yellow-500/20" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className={`relative flex items-center w-full ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <n.icon size={17} />
                  {!sidebarCollapsed && n.label}
                  {n.badge && !sidebarCollapsed ? (
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
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`} title={sidebarCollapsed ? user?.name : undefined}>
            {user && <Avatar user={user} size={36} />}
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-blue-50 truncate">{user?.name ?? 'Admin Demo'}</p>
                <p className="text-[10px] text-navy-500">Administrator</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ Konten utama ═══ */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-5 py-6">
          {/* topbar */}
          <motion.div {...rise(0)} className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1">
              {view !== 'ringkasan' && (
                <button
                  type="button"
                  onClick={() => setView('ringkasan')}
                  className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-navy-600 hover:text-navy-900 bg-white border border-blue-200 hover:border-navy-500 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ArrowLeft size={13} /> Kembali ke Ringkasan
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-navy-500 font-semibold mb-1">
                <Home size={12} />
                <span>Admin</span>
                <ChevronRight size={12} />
                <span className="text-navy-700">{NAV.find((n) => n.key === view)?.label ?? 'Ringkasan'}</span>
              </div>
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
                      {activityFeed.slice(0, 4).map((a) => (
                        <div key={a.text} className="flex items-start gap-2.5">
                          <span className={`shrink-0 p-1.5 rounded-lg ${a.color}`}><a.icon size={12} /></span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold leading-snug">{a.text}</p>
                            <p className="text-[10px] text-navy-500">{a.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ProfileMenu className="hidden lg:block" logoutTo="/login" />
          </motion.div>


          {/* ═══ RINGKASAN ═══ */}
          {view === 'ringkasan' && (
            <AdminOverview
              sla={settings.sla}
              refreshKey={statsKey}
              onOpenQueue={() => setView('verifikasi')}
              queue={(
                <div className="space-y-2">
                  <p className="text-[11px] text-navy-500 -mt-2 mb-2">
                    {pending.length} menunggu · sesi ini: <span className="text-success font-bold">{decided.approved} disetujui</span>
                    {decided.rejected > 0 && <> · <span className="text-danger font-bold">{decided.rejected} ditolak</span></>}
                  </p>
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
              )}
            />
          )}

          {/* ═══ VERIFIKASI ═══ */}
          {view === 'verifikasi' && (
            <>
            <motion.div {...rise(0.05)} className="bg-white border border-blue-200 rounded-2xl p-5 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-bold text-sm">Semua Antrean ({pending.length})</p>
                  <p className="text-[11px] text-navy-500 mt-0.5">Diurutkan dari pengajuan terlama. Periksa formulir & dokumen sebelum memutuskan.</p>
                </div>
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

            {/* riwayat keputusan — jejak audit verifikasi */}
            <motion.div {...rise(0.1)} className="bg-white border border-blue-200 rounded-2xl p-5 mt-4 mb-8">
              <div className="flex items-center justify-between">
                <p className="font-heading font-bold text-sm">Riwayat Keputusan ({log.length})</p>
                <span className="text-[11px] text-navy-500">
                  <span className="text-success font-bold">{log.filter((l) => l.status === 'approved').length} disetujui</span> ·{' '}
                  <span className="text-danger font-bold">{log.filter((l) => l.status === 'rejected').length} ditolak</span>
                </span>
              </div>
              <div className="mt-3 divide-y divide-blue-100">
                {log.slice(0, 20).map((l) => (
                  <div key={l.id} className="py-3 flex items-start gap-3">
                    <span className={`shrink-0 p-2 rounded-xl ${l.status === 'approved' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {l.status === 'approved' ? <BadgeCheck size={14} /> : <X size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold">
                        {l.name} <span className="font-normal text-navy-500">· {l.owner}</span>
                      </p>
                      <p className="text-[11px] text-navy-500 mt-0.5">
                        {l.status === 'approved' ? 'Disetujui' : 'Ditolak'} oleh {l.admin ?? 'Admin'} · {timeAgo(l.at)}
                        {l.checklist && ` · checklist ${Object.values(l.checklist).filter(Boolean).length}/5`}
                      </p>
                      {l.reasons?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {reasonText(l.reasons).map((r) => <span key={r} className="bg-danger/10 text-danger text-[10px] font-bold px-2 py-0.5 rounded-md">{r}</span>)}
                        </div>
                      )}
                      {l.note && <p className="text-xs text-navy-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-1.5">“{l.note}”</p>}
                    </div>
                  </div>
                ))}
                {log.length === 0 && <p className="text-center text-xs text-navy-500 py-6">Belum ada keputusan verifikasi.</p>}
              </div>
            </motion.div>
            </>
          )}

          {/* ═══ DAFTAR USAHA ═══ */}
          {view === 'usaha' && (
            <div className="mt-6 mb-8 space-y-4">
              {/* ringkasan status sekaligus filter */}
              <motion.div {...rise(0.05)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5" role="radiogroup" aria-label="Filter status usaha">
                {['semua', 'approved', 'pending', 'reported', 'rejected'].map((f) => {
                  const m = f === 'semua' ? { label: 'Semua usaha', icon: Building2, color: '#0F2A4A' } : STATUS_META[f];
                  const count = f === 'semua' ? biz.length : biz.filter((b) => b.status === f).length;
                  const pct = biz.length ? (count / biz.length) * 100 : 0;
                  const active = filter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setFilter(f)}
                      className={`group relative text-left rounded-2xl p-3.5 border transition-all overflow-hidden ${active ? 'bg-navy-800 border-navy-800 text-white shadow-lg shadow-navy-800/20' : 'bg-white border-blue-200 hover:border-navy-500/40 hover:-translate-y-0.5'}`}
                    >
                      <span className="flex items-center justify-between">
                        <span
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:-rotate-6"
                          style={{ background: active ? 'rgba(255,255,255,.1)' : `${m.color}18`, color: active ? (f === 'semua' ? '#FFC914' : m.color) : m.color }}
                        >
                          <m.icon size={17} />
                        </span>
                        <span className={`font-data font-bold text-xl ${active ? 'text-white' : 'text-navy-800'}`}>{count}</span>
                      </span>
                      <span className={`block text-[11px] font-bold mt-2.5 ${active ? 'text-blue-200' : 'text-navy-600'}`}>{m.label}</span>
                      <span className={`block h-1 rounded-full mt-2 overflow-hidden ${active ? 'bg-white/10' : 'bg-blue-100'}`}>
                        <motion.span className="block h-full rounded-full" style={{ background: f === 'semua' ? '#FFC914' : m.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                      </span>
                    </button>
                  );
                })}
              </motion.div>

              <motion.div {...rise(0.1)} className="bg-white border border-blue-200 rounded-2xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-blue-100">
                  <p className="font-heading font-bold text-sm">
                    {filter === 'semua' ? 'Semua usaha' : STATUS_META[filter].label}
                    <span className="ml-2 font-data text-[11px] font-bold text-navy-500 bg-blue-100 px-1.5 py-0.5 rounded-md">{filtered.length}</span>
                  </p>
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-600 bg-blue-50 border border-blue-200 hover:border-danger hover:text-danger pl-2.5 pr-2 py-1 rounded-full transition-colors">
                      <Search size={11} /> “{query}” <X size={11} />
                    </button>
                  )}
                </div>

                {/* kepala kolom (desktop) */}
                <div className="hidden md:grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-4 px-5 py-2.5 bg-blue-50/70 text-[10px] font-bold uppercase tracking-wider text-navy-500">
                  <span>Usaha</span><span>Kategori</span><span>Kinerja</span><span>Status</span><span className="text-right">Aksi</span>
                </div>

                <div className="divide-y divide-blue-100">
                  <AnimatePresence initial={false}>
                    {filtered.map((b, i) => {
                      const cat = CAT_META[String(b.cat ?? '').replace(/^./, (c) => c.toUpperCase())] ?? { icon: Store, color: '#4A6B8A' };
                      const st = STATUS_META[b.status];
                      return (
                        <motion.div
                          key={b.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}
                          exit={{ opacity: 0 }}
                          className="group grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-x-4 gap-y-2.5 px-4 sm:px-5 py-3.5 hover:bg-blue-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="relative w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-heading font-extrabold text-base shadow-sm" style={{ background: `linear-gradient(135deg, ${cat.color}2e, ${cat.color}10)`, color: cat.color }}>
                              {b.name.slice(0, 1)}
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-white ring-1 ring-blue-200 flex items-center justify-center"><cat.icon size={11} /></span>
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold truncate group-hover:text-navy-900">{b.name}</p>
                              <p className="text-[11px] text-navy-500 truncate">{b.owner}{b.joined ? ` · sejak ${b.joined}` : b.waited ? ` · diajukan ${b.waited} lalu` : ''}</p>
                              {b.status === 'reported' && b.reason && (
                                <p className="text-[10px] text-danger mt-1 truncate" title={b.reason}><Flag size={10} className="inline -mt-0.5 mr-1" />{b.reason}</p>
                              )}
                            </div>
                          </div>

                          <span className="hidden md:inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${cat.color}14`, color: cat.color }}>
                            <cat.icon size={13} /> {b.cat}
                          </span>

                          <div className="hidden md:block text-[11px]">
                            {b.rating ? (
                              <>
                                <p className="flex items-center gap-1 font-bold text-navy-800"><Star size={12} weight="fill" className="text-yellow-500" /> <span className="font-data">{Number(b.rating).toFixed(1)}</span></p>
                                {b.views != null && <p className="flex items-center gap-1 text-navy-500 mt-0.5"><Eye size={12} /> <span className="font-data">{b.views.toLocaleString('id-ID')}</span> dilihat</p>}
                              </>
                            ) : (
                              <span className="text-navy-500/70 italic">Belum tayang</span>
                            )}
                          </div>

                          <span className={`justify-self-end md:justify-self-start inline-flex w-fit items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${st.cls}`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.label}
                          </span>

                          <div className="col-span-2 md:col-span-1 flex justify-end gap-1.5">
                            {b.status === 'approved' && (
                              <button onClick={() => setStatus(b.id, 'rejected')} className="flex items-center gap-1.5 text-[11px] font-bold text-navy-600 bg-white hover:text-danger border border-blue-200 hover:border-danger hover:bg-danger/5 px-3 py-1.5 rounded-lg transition-colors">
                                <EyeOff size={13} /> Tangguhkan
                              </button>
                            )}
                            {b.status === 'rejected' && (
                              <button onClick={() => setStatus(b.id, 'approved')} className="flex items-center gap-1.5 text-[11px] font-bold text-navy-600 bg-white hover:text-success border border-blue-200 hover:border-success hover:bg-success/5 px-3 py-1.5 rounded-lg transition-colors">
                                <RotateCcw size={13} /> Pulihkan
                              </button>
                            )}
                            {b.status === 'pending' && (
                              <button onClick={() => setView('verifikasi')} className="flex items-center gap-1.5 text-[11px] font-bold text-navy-800 bg-yellow-500/15 hover:bg-yellow-500/30 px-3 py-1.5 rounded-lg transition-colors">
                                <ShieldCheck size={13} /> Ke verifikasi
                              </button>
                            )}
                            {b.status === 'reported' && (
                              <button onClick={() => setView('laporan')} className="flex items-center gap-1.5 text-[11px] font-bold text-danger bg-danger/10 hover:bg-danger/15 px-3 py-1.5 rounded-lg transition-colors">
                                <TriangleAlert size={13} /> Lihat laporan
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {filtered.length === 0 && (
                    <div className="text-center py-14">
                      <span className="mx-auto w-12 h-12 rounded-2xl bg-blue-100 text-navy-500 flex items-center justify-center"><Search size={22} /></span>
                      <p className="text-sm font-bold mt-3">Tidak ada usaha yang cocok</p>
                      <p className="text-xs text-navy-500 mt-1">{query ? `Coba kata kunci lain selain “${query}” atau ubah filter.` : 'Belum ada usaha dengan status ini.'}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* ═══ LAPORAN ═══ */}
          {view === 'laporan' && (() => {
            const TABS = [
              { k: 'open', l: 'Perlu ditinjau', icon: Flag, color: '#E05252' },
              { k: 'resolved', l: 'Ditindaklanjuti', icon: BadgeCheck, color: '#2E9E6B' },
              { k: 'dismissed', l: 'Tidak terbukti', icon: X, color: '#5B7A99' },
            ];
            const shown = reports.filter((r) => r.status === reportTab);
            return (
            <div className="mt-6 mb-8 space-y-4">
              {/* tab status laporan + jumlah ulasan */}
              <motion.div {...rise(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {TABS.map((t) => {
                  const count = reports.filter((r) => r.status === t.k).length;
                  const active = reportTab === t.k;
                  return (
                    <button
                      key={t.k}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setReportTab(t.k)}
                      className={`group text-left rounded-2xl p-3.5 border transition-all ${active ? 'bg-navy-800 border-navy-800 text-white shadow-lg shadow-navy-800/20' : 'bg-white border-blue-200 hover:border-navy-500/40 hover:-translate-y-0.5'}`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:-rotate-6" style={{ background: active ? 'rgba(255,255,255,.1)' : `${t.color}18`, color: active && t.k === 'dismissed' ? '#8FBEDC' : t.color }}>
                          <t.icon size={17} />
                        </span>
                        <span className={`font-data font-bold text-xl ${active ? 'text-white' : 'text-navy-800'}`}>{count}</span>
                      </span>
                      <span className={`block text-[11px] font-bold mt-2.5 ${active ? 'text-blue-200' : 'text-navy-600'}`}>{t.l}</span>
                    </button>
                  );
                })}
                <div className="rounded-2xl p-3.5 border border-blue-200 bg-white">
                  <span className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-info/10 text-info"><MessageSquare size={17} /></span>
                    <span className="font-data font-bold text-xl text-navy-800">{reviews.length}</span>
                  </span>
                  <span className="block text-[11px] font-bold mt-2.5 text-navy-600">Ulasan terbaru</span>
                </div>
              </motion.div>

              <div className="grid lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-8 space-y-4">
                  {/* laporan konsumen dari halaman peta */}
                  <motion.div {...rise(0.1)} className="bg-white border border-blue-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-blue-100">
                      <p className="font-heading font-bold text-sm flex items-center gap-2">
                        <Flag size={15} className="text-danger" /> Laporan Konsumen
                        <span className="font-data text-[11px] font-bold text-navy-500 bg-blue-100 px-1.5 py-0.5 rounded-md">{shown.length}</span>
                      </p>
                      <span className="text-[11px] text-navy-500">{TABS.find((t) => t.k === reportTab)?.l}</span>
                    </div>

                    <div className="p-3 sm:p-4 space-y-3">
                      <AnimatePresence initial={false}>
                        {shown.map((r) => {
                          const open = r.status === 'open';
                          return (
                            <motion.article
                              key={r.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 40 }}
                              className={`relative rounded-xl border overflow-hidden ${open ? 'border-danger/25 bg-white' : 'border-blue-200 bg-blue-50/50'}`}
                            >
                              {open && <span className="absolute left-0 inset-y-0 w-1 bg-danger" aria-hidden="true" />}
                              <div className="p-4 pl-5">
                                <div className="flex flex-wrap items-start gap-3">
                                  <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${open ? 'bg-danger/10 text-danger' : 'bg-blue-100 text-navy-500'}`}><TriangleAlert size={18} /></span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <p className="text-sm font-heading font-bold">{r.business_name}</p>
                                      <span className="bg-danger/10 text-danger text-[10px] font-bold px-2 py-0.5 rounded-full">{reasonLabel(r.reason)}</span>
                                    </div>
                                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-navy-500 mt-1">
                                      <span className="flex items-center gap-1"><Users size={12} /> {r.reporter_name}</span>
                                      <span>{timeAgo(r.created_at)}</span>
                                      {r.address && <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /><span className="truncate max-w-[18rem]">{r.address}</span></span>}
                                    </p>
                                  </div>
                                  {!open && (
                                    <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${r.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-blue-200 text-navy-500'}`}>
                                      {r.status === 'resolved' ? <BadgeCheck size={12} /> : <X size={12} />}
                                      {r.status === 'resolved' ? (r.suspend ? 'Usaha ditangguhkan' : 'Ditindaklanjuti') : 'Tidak terbukti'}
                                    </span>
                                  )}
                                </div>

                                {r.detail && (
                                  <blockquote className="text-xs text-navy-700 bg-blue-50 border-l-2 border-blue-300 rounded-r-lg px-3 py-2 mt-3 sm:ml-[3.25rem] leading-relaxed">“{r.detail}”</blockquote>
                                )}
                                {!open && (r.admin_note || r.resolved_at) && (
                                  <p className="text-[11px] text-navy-500 mt-2.5 sm:ml-[3.25rem]">
                                    <span className="font-semibold text-navy-600">Catatan admin</span>{r.resolved_at ? ` · ${timeAgo(r.resolved_at)}` : ''}{r.admin_note ? ` — ${r.admin_note}` : ''}
                                  </p>
                                )}
                              </div>

                              {open && (
                                <div className="border-t border-blue-100 bg-blue-50/60 px-4 pl-5 py-3 space-y-2.5">
                                  <label htmlFor={`note-${r.id}`} className="sr-only">Catatan admin</label>
                                  <div className="flex items-center gap-2 bg-white border border-blue-200 focus-within:border-navy-600 rounded-lg px-3 transition-colors">
                                    <MessageSquare size={13} className="text-navy-500 shrink-0" />
                                    <input
                                      id={`note-${r.id}`}
                                      value={notes[r.id] ?? ''}
                                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                                      placeholder="Catatan tindak lanjut (opsional), cth. sudah dicek via telepon"
                                      className="w-full bg-transparent py-2 text-xs outline-none"
                                    />
                                  </div>
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button disabled={busyReport === r.id} onClick={() => actOnReport(r, 'dismissed')} className="flex items-center gap-1.5 bg-white border border-blue-200 hover:border-navy-500 disabled:opacity-60 text-navy-600 text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors">
                                      <X size={13} /> Tidak Terbukti
                                    </button>
                                    <button disabled={busyReport === r.id} onClick={() => actOnReport(r, 'resolved')} className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-blue-50 text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors">
                                      <Check size={13} /> Tandai Ditindaklanjuti
                                    </button>
                                    <button disabled={busyReport === r.id} onClick={() => actOnReport(r, 'resolved', true)} className="flex items-center gap-1.5 bg-danger hover:brightness-110 disabled:opacity-60 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg transition-all">
                                      <EyeOff size={13} /> Tangguhkan Usaha
                                    </button>
                                  </div>
                                </div>
                              )}
                            </motion.article>
                          );
                        })}
                      </AnimatePresence>
                      {shown.length === 0 && (
                        <div className="text-center py-10">
                          <span className="mx-auto w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center"><ShieldCheck size={22} /></span>
                          <p className="text-sm font-bold mt-3">{reportTab === 'open' ? 'Tidak ada laporan menunggu' : 'Belum ada laporan di sini'}</p>
                          <p className="text-xs text-navy-500 mt-1">{reportTab === 'open' ? 'Laporan konsumen dari peta akan muncul di sini.' : 'Laporan yang sudah diputuskan akan tercatat di tab ini.'}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* usaha berstatus dilaporkan */}
                  {reported.length > 0 && (
                    <motion.div {...rise(0.15)} className="bg-white border border-blue-200 rounded-2xl overflow-hidden">
                      <p className="font-heading font-bold text-sm flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-blue-100">
                        <TriangleAlert size={15} className="text-danger" /> Usaha Berstatus Dilaporkan
                        <span className="font-data text-[11px] font-bold text-navy-500 bg-blue-100 px-1.5 py-0.5 rounded-md">{reported.length}</span>
                      </p>
                      <div className="divide-y divide-blue-100">
                        <AnimatePresence>
                          {reported.map((b) => (
                            <motion.div key={b.id} layout exit={{ opacity: 0, x: 40 }} className="p-4 sm:px-5">
                              <div className="flex items-start gap-3">
                                <span className="shrink-0 w-10 h-10 rounded-xl bg-danger/10 text-danger font-heading font-extrabold flex items-center justify-center">{b.name.slice(0, 1)}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-heading font-bold">{b.name}</p>
                                  <p className="text-[11px] text-navy-500 mt-0.5">{b.owner} · {b.cat} · {b.reporter}</p>
                                  <blockquote className="text-xs text-navy-700 bg-blue-50 border-l-2 border-danger/50 rounded-r-lg px-3 py-2 mt-2.5 leading-relaxed">“{b.reason}”</blockquote>
                                  <div className="flex flex-wrap justify-end gap-2 mt-3">
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setStatus(b.id, 'rejected')} className="flex items-center gap-1.5 bg-white border border-blue-200 hover:border-danger hover:text-danger text-navy-600 text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors">
                                      <EyeOff size={13} /> Tangguhkan Usaha
                                    </motion.button>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setStatus(b.id, 'approved')} className="flex items-center gap-1.5 bg-success hover:brightness-110 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg transition-all">
                                      <Check size={13} /> Abaikan Laporan
                                    </motion.button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* moderasi ulasan konsumen */}
                <motion.aside {...rise(0.15)} className="lg:col-span-4 lg:sticky lg:top-4 bg-white border border-blue-200 rounded-2xl overflow-hidden">
                  <p className="font-heading font-bold text-sm flex items-center gap-2 px-4 py-3.5 border-b border-blue-100">
                    <MessageSquare size={15} className="text-info" /> Ulasan Terbaru
                    <span className="font-data text-[11px] font-bold text-navy-500 bg-blue-100 px-1.5 py-0.5 rounded-md">{reviews.length}</span>
                  </p>
                  <div className="max-h-[34rem] overflow-y-auto divide-y divide-blue-100">
                    {reviews.map((rv) => (
                      <div key={rv.id} className="group px-4 py-3.5 hover:bg-blue-50/60 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <span className="w-8 h-8 shrink-0 rounded-full bg-navy-800 text-yellow-500 font-heading font-bold text-xs flex items-center justify-center">{(rv.user_name ?? '?').slice(0, 1)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{rv.user_name}</p>
                            <p className="text-[10px] text-navy-500 truncate">untuk {rv.business_name} · {timeAgo(rv.created_at)}</p>
                          </div>
                          <button onClick={() => deleteReview(rv)} className="shrink-0 p-1.5 rounded-lg text-navy-500 hover:text-danger hover:bg-danger/10 transition-colors" aria-label={`Hapus ulasan ${rv.user_name}`} title="Hapus ulasan">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex gap-0.5 mt-2 ml-[2.625rem]" aria-label={`Rating ${rv.rating} dari 5`}>
                          {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} weight="fill" className={i <= rv.rating ? 'text-yellow-500' : 'text-blue-200'} />)}
                        </div>
                        {rv.comment && <p className="text-xs text-navy-700 mt-1.5 ml-[2.625rem] leading-relaxed">{rv.comment}</p>}
                      </div>
                    ))}
                    {reviews.length === 0 && (
                      <div className="text-center py-10 px-4">
                        <span className="mx-auto w-11 h-11 rounded-2xl bg-info/10 text-info flex items-center justify-center"><MessageSquare size={20} /></span>
                        <p className="text-xs font-bold mt-3">Belum ada ulasan baru</p>
                        <p className="text-[11px] text-navy-500 mt-0.5">Ulasan konsumen akan muncul di sini untuk dimoderasi.</p>
                      </div>
                    )}
                  </div>
                </motion.aside>
              </div>
            </div>
            );
          })()}

          {/* ═══ PENGATURAN ═══ */}
          {view === 'pengaturan' && (() => {
            const set = (patch) => setSettings((s) => ({ ...s, ...patch }));
            const flip = (k) => set({ [k]: !settings[k] });
            const Row = SettingRow;
            const Section = SettingSection;
            const GROUPS = [
              {
                icon: ShieldCheck, title: 'Verifikasi', sub: 'Aturan saat usaha baru mendaftar',
                items: [
                  { k: 'strict', icon: ShieldCheck, color: '#2E9E6B', t: 'Mode ketat', d: 'Wajibkan foto tempat usaha & nomor HP aktif saat mendaftar.' },
                  { k: 'autoPub', icon: BadgeCheck, color: '#4A90D9', t: 'Auto-publikasi', d: 'Usaha dari pemilik yang sudah terverifikasi langsung tayang tanpa antre.' },
                ],
              },
              {
                icon: TriangleAlert, title: 'Moderasi', sub: 'Laporan & ulasan dari konsumen',
                items: [
                  { k: 'reportFirst', icon: Flag, color: '#E05252', t: 'Prioritaskan laporan', d: 'Laporan konsumen yang belum ditinjau selalu tampil paling atas.' },
                  { k: 'autoHide', icon: EyeOff, color: '#5B7A99', t: 'Sembunyikan otomatis', d: 'Usaha yang dilaporkan 3 kali atau lebih disembunyikan sementara dari peta.' },
                  { k: 'reviewMod', icon: MessageSquare, color: '#8B5CF6', t: 'Moderasi ulasan', d: 'Ulasan baru ditinjau admin dulu sebelum tampil ke publik.' },
                ],
              },
              {
                icon: Bell, title: 'Notifikasi', sub: 'Kabar yang dikirim ke admin',
                items: [
                  { k: 'notifNew', icon: Store, color: '#F2771A', t: 'Pendaftaran baru', d: 'Tampilkan notifikasi saat ada usaha baru mendaftar.' },
                  { k: 'notifReport', icon: Megaphone, color: '#E6B000', t: 'Laporan baru', d: 'Tampilkan notifikasi saat konsumen mengirim laporan.' },
                  { k: 'email', icon: Bell, color: '#4A90D9', t: 'Ringkasan email harian', d: 'Kirim ringkasan antrean & laporan ke email admin tiap pagi.' },
                ],
              },
            ];
            const ALL = GROUPS.flatMap((g) => g.items);
            const activeCount = ALL.filter((it) => settings[it.k]).length;
            return (
              <div className="mt-6 mb-8 grid lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-8 space-y-4">
                  {GROUPS.map((g, gi) => (
                    <Section key={g.title} icon={g.icon} title={g.title} sub={g.sub} delay={0.05 + gi * 0.05}>
                      {g.items.map((it) => (
                        <Row key={it.k} icon={it.icon} color={it.color} title={it.t} desc={it.d}>
                          <Toggle on={!!settings[it.k]} onClick={() => flip(it.k)} />
                        </Row>
                      ))}
                      {g.title === 'Verifikasi' && (
                        <Row icon={Hourglass} color="#E6B000" title="Target SLA verifikasi" desc="Batas waktu standar untuk meninjau pendaftaran baru. Antrean yang lewat batas ditandai merah.">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 ring-1 ring-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold text-navy-800">
                            <Lock size={13} className="text-navy-500" /> <span className="font-data">{SLA_HOURS}</span> jam
                          </span>
                        </Row>
                      )}
                    </Section>
                  ))}
                </div>

                {/* ringkasan kebijakan + simpan */}
                <motion.aside {...rise(0.1)} className="lg:col-span-4 lg:sticky lg:top-4 bg-navy-800 text-blue-100 rounded-2xl p-5 relative overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 bg-contour-dark opacity-60" aria-hidden="true" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <p className="font-data text-[10px] font-bold tracking-[0.2em] text-yellow-400">RINGKASAN</p>
                      <span className="font-data text-[11px] text-blue-300"><span className="text-white font-bold">{activeCount}</span>/{ALL.length} aktif</span>
                    </div>
                    <ul className="mt-4 space-y-2.5">
                      {ALL.map((it) => (
                        <li key={it.k} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-blue-300 truncate">{it.t}</span>
                          <span className={`shrink-0 flex items-center gap-1.5 font-bold ${settings[it.k] ? 'text-white' : 'text-blue-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${settings[it.k] ? 'bg-success' : 'bg-blue-400/50'}`} />
                            {settings[it.k] ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between gap-3 text-xs pt-2.5 border-t border-white/10">
                        <span className="text-blue-300">Target SLA</span>
                        <span className="font-data font-bold text-white">{SLA_HOURS} jam · tetap</span>
                      </li>
                    </ul>

                    <div className="mt-5 pt-4 border-t border-dashed border-white/15">
                      <p className={`flex items-center gap-1.5 text-[11px] ${saved ? 'text-emerald-300' : dirty ? 'text-yellow-400' : 'text-blue-300'}`} aria-live="polite">
                        {saved ? <><BadgeCheck size={13} /> Pengaturan tersimpan</> : dirty ? <><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" /> Ada perubahan belum disimpan</> : <><Check size={13} /> Semua perubahan tersimpan</>}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={saveSettings}
                          disabled={!dirty}
                          className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-900 text-xs font-bold px-4 py-2.5 rounded-xl shadow-key active:translate-y-[2px] transition-colors"
                        >
                          <Save size={15} /> Simpan
                        </motion.button>
                        <button
                          type="button"
                          onClick={() => setSettings(savedSettings)}
                          disabled={!dirty}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-200 hover:text-white bg-white/5 hover:bg-white/10 ring-1 ring-white/10 disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-2.5 rounded-xl transition-colors"
                        >
                          <RotateCcw size={14} /> Batalkan
                        </button>
                      </div>
                      <button type="button" onClick={() => setSettings(SETTINGS_DEFAULT)} className="mt-3 text-[11px] text-blue-400 hover:text-blue-200 underline underline-offset-2">
                        Kembalikan ke bawaan
                      </button>
                    </div>
                  </div>
                </motion.aside>
              </div>
            );
          })()}
        </div>
      </main>

      <AnimatePresence>
        {reviewing && (
          <SubmissionReview
            key="review"
            item={reviewing}
            sla={settings.sla}
            adminName={user?.name}
            onClose={() => setReviewId(null)}
            onDecide={decide}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <DecisionResult
            key="decision"
            result={result}
            nextCount={pending.length}
            onNext={() => { setResult(null); setReviewId(pending[0]?.id ?? null); }}
            onClose={() => setResult(null)}
          />
        )}
      </AnimatePresence>
    </div>
    </IconContext.Provider>
  );
}
