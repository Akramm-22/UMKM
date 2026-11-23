import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconContext, MapPin, SquaresFour as LayoutGrid, Crosshair as Radar, ShieldCheck, Buildings as Building2, WarningOctagon as TriangleAlert,
  SlidersHorizontal, MagnifyingGlass as Search, Bell, Star, Check, X, CaretRight as ChevronRight, Megaphone,
  Users, SealCheck as BadgeCheck, Flag, FloppyDisk as Save, ArrowCounterClockwise as RotateCcw, EyeSlash as EyeOff, Storefront as Store, House as Home,
  ArrowLineLeft as PanelLeftClose, ArrowLineRight as PanelLeftOpen, ArrowLeft, ChatText as MessageSquare, Trash as Trash2,
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
  const { user } = useAuth();
  const [view, setView] = useState('ringkasan');
  const [biz, setBiz] = useState(BIZ_INIT);
  const [decided, setDecided] = useState({ approved: 0, rejected: 0 });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('semua');
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settings, setSettings] = useState({ email: true, autoPub: false, strict: true, sla: 24, radius: 2 });
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
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

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
    ringkasan: { h: `${greet}, ${user?.name?.split(' ')[0] ?? 'Admin'} 🛡️`, p: 'Pantau kesehatan ekosistem UMKM-mu — semua angka dihitung dari data sistem.' },
    verifikasi: { h: 'Verifikasi Pendaftaran', p: `${pending.length} usaha menunggu tinjauanmu — jaga SLA ≤ ${settings.sla} jam.` },
    usaha: { h: 'Daftar Usaha', p: `${biz.length} usaha terdaftar di wilayahmu.` },
    laporan: { h: 'Laporan & Ulasan', p: reported.length + openReports.length ? `${reported.length + openReports.length} laporan butuh tindak lanjut.` : 'Tidak ada laporan aktif.' },
    pengaturan: { h: 'Pengaturan Panel', p: 'Atur kebijakan verifikasi dan notifikasi.' },
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
              {/* laporan konsumen dari halaman peta */}
              <motion.div {...rise(0.05)} className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading font-bold text-sm mr-auto flex items-center gap-2"><Flag size={15} className="text-danger" /> Laporan Konsumen</p>
                  {[
                    { k: 'open', l: 'Perlu ditinjau' },
                    { k: 'resolved', l: 'Ditindaklanjuti' },
                    { k: 'dismissed', l: 'Tidak terbukti' },
                  ].map((t) => (
                    <button
                      key={t.k}
                      onClick={() => setReportTab(t.k)}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors ${reportTab === t.k ? 'bg-navy-800 text-yellow-500' : 'bg-blue-100 text-navy-500 hover:bg-blue-200'}`}
                    >
                      {t.l} ({reports.filter((r) => r.status === t.k).length})
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  <AnimatePresence initial={false}>
                    {reports.filter((r) => r.status === reportTab).map((r) => (
                      <motion.div
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        className={`border rounded-xl p-4 ${r.status === 'open' ? 'border-danger/30 bg-danger/[0.03]' : 'border-blue-200 bg-blue-50/50'}`}
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <span className="shrink-0 bg-danger/10 text-danger p-2 rounded-xl"><TriangleAlert size={16} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-heading font-bold">{r.business_name}</p>
                            <p className="text-[11px] text-navy-500 mt-0.5">
                              Dilaporkan {r.reporter_name} · {timeAgo(r.created_at)}{r.address ? ` · ${r.address}` : ''}
                            </p>
                            <span className="inline-block mt-2 bg-danger/10 text-danger text-[11px] font-bold px-2 py-0.5 rounded-md">{reasonLabel(r.reason)}</span>
                            {r.detail && <p className="text-xs text-navy-700 bg-white border border-blue-200 rounded-lg px-3 py-2 mt-2 leading-relaxed">“{r.detail}”</p>}
                            {r.status !== 'open' && (
                              <p className="text-[11px] text-navy-500 mt-2">
                                {r.status === 'resolved' ? (r.suspend ? 'Usaha ditangguhkan' : 'Ditindaklanjuti') : 'Laporan tidak terbukti'}
                                {r.resolved_at ? ` · ${timeAgo(r.resolved_at)}` : ''}{r.admin_note ? ` — ${r.admin_note}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        {r.status === 'open' && (
                          <div className="mt-3 sm:pl-11 space-y-2">
                            <label htmlFor={`note-${r.id}`} className="sr-only">Catatan admin</label>
                            <input
                              id={`note-${r.id}`}
                              value={notes[r.id] ?? ''}
                              onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                              placeholder="Catatan tindak lanjut (opsional), cth. sudah dicek via telepon"
                              className="w-full bg-white border border-blue-200 focus:border-navy-600 rounded-lg px-3 py-2 text-xs outline-none transition-colors"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button disabled={busyReport === r.id} onClick={() => actOnReport(r, 'resolved', true)} className="flex items-center gap-1.5 bg-danger hover:brightness-110 disabled:opacity-60 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg transition-all">
                                <EyeOff size={12} /> Tangguhkan Usaha
                              </button>
                              <button disabled={busyReport === r.id} onClick={() => actOnReport(r, 'resolved')} className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-blue-50 text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors">
                                <Check size={12} /> Tandai Ditindaklanjuti
                              </button>
                              <button disabled={busyReport === r.id} onClick={() => actOnReport(r, 'dismissed')} className="flex items-center gap-1.5 bg-white border border-blue-200 hover:border-navy-500 disabled:opacity-60 text-navy-600 text-[11px] font-bold px-3.5 py-2 rounded-lg transition-colors">
                                <X size={12} /> Tidak Terbukti
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {reports.filter((r) => r.status === reportTab).length === 0 && (
                    <p className="text-center text-xs text-navy-500 py-8">
                      {reportTab === 'open' ? 'Belum ada laporan konsumen yang menunggu.' : 'Belum ada laporan di kategori ini.'}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* moderasi ulasan konsumen */}
              <motion.div {...rise(0.1)} className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5">
                <p className="font-heading font-bold text-sm flex items-center gap-2"><MessageSquare size={15} className="text-info" /> Ulasan Terbaru ({reviews.length})</p>
                <div className="mt-3 divide-y divide-blue-100">
                  {reviews.map((rv) => (
                    <div key={rv.id} className="flex items-start gap-3 py-3">
                      <span className="w-8 h-8 shrink-0 rounded-full bg-navy-800 text-yellow-500 font-heading font-bold text-xs flex items-center justify-center">{(rv.user_name ?? '?').slice(0, 1)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold">{rv.user_name} <span className="font-normal text-navy-500">→ {rv.business_name}</span></p>
                        <p className="flex items-center gap-1 text-[11px] text-navy-500 mt-0.5">
                          <Star size={11} className="text-yellow-500 fill-yellow-500" /> {rv.rating} · {timeAgo(rv.created_at)}
                        </p>
                        {rv.comment && <p className="text-xs text-navy-700 mt-1.5 leading-relaxed">{rv.comment}</p>}
                      </div>
                      <button onClick={() => deleteReview(rv)} className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-navy-500 hover:text-danger border border-blue-200 hover:border-danger px-2.5 py-1.5 rounded-lg transition-colors" aria-label={`Hapus ulasan ${rv.user_name}`}>
                        <Trash2 size={12} /> Hapus
                      </button>
                    </div>
                  ))}
                  {reviews.length === 0 && <p className="text-center text-xs text-navy-500 py-6">Belum ada ulasan baru dari konsumen.</p>}
                </div>
              </motion.div>

              {reported.length > 0 && <p className="font-heading font-bold text-sm pt-2">Usaha Berstatus Dilaporkan</p>}
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
              {reported.length === 0 && openReports.length === 0 && (
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
