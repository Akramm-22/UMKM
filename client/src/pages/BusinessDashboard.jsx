import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye, Search, PhoneCall, Megaphone, X, CheckCircle2, Hourglass, BadgeCheck, Ban, PencilLine, Plus, Home, RadioTower, Store,
  MessageSquare, LifeBuoy, MapPin, ArrowRight, Star, Trash2, Phone, Globe, AtSign, Wallet, ChevronRight, Sparkles,
  Loader2, AlertTriangle, Lightbulb, FileClock, MoreHorizontal, ExternalLink, Info, ChevronDown,
} from 'lucide-react';
import ProfileMenu from '../components/ProfileMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { weeklyHours, openStatus } from '../lib/place.js';
import { PAYMENT_OPTIONS, AMENITY_OPTIONS, labelOf } from '../lib/businessForm.js';
import {
  fetchMyBusinesses, updateOps, removeBusiness, fetchOwnerReviews, activityOf, completeness, catMeta, reviewReasons,
} from '../lib/myBusinesses.js';

const STATUS = {
  approved: { label: 'Tayang', cls: 'bg-success/10 text-success', dot: 'bg-success', icon: BadgeCheck },
  pending: { label: 'Menunggu verifikasi', cls: 'bg-yellow-500/15 text-yellow-600', dot: 'bg-yellow-500', icon: Hourglass },
  rejected: { label: 'Perlu perbaikan', cls: 'bg-danger/10 text-danger', dot: 'bg-danger', icon: Ban },
  reported: { label: 'Ditinjau ulang', cls: 'bg-danger/10 text-danger', dot: 'bg-danger', icon: AlertTriangle },
};
const statusOf = (s) => STATUS[s] ?? STATUS.pending;

const VIEWS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'update', label: 'Update', icon: RadioTower },
  { key: 'usaha', label: 'Manajemen Usaha', icon: Store },
  { key: 'ulasan', label: 'Ulasan', icon: MessageSquare },
  { key: 'panduan', label: 'Panduan', icon: LifeBuoy },
];

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut', delay },
});

const ago = (iso) => {
  if (!iso) return '';
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} mnt lalu`;
  if (m < 1440) return `${Math.round(m / 60)} jam lalu`;
  if (m < 43200) return `${Math.round(m / 1440)} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// angka performa (estimasi) berbeda per usaha — analitik kunjungan belum dicatat server
function perf(b) {
  const seed = String(b.key).split('').reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7);
  return [
    { icon: Eye, label: 'Kunjungan minggu ini', value: 60 + (seed % 140), delta: `+${4 + (seed % 19)}%` },
    { icon: Search, label: 'Muncul di pencarian', value: 180 + (seed % 260), delta: `+${2 + (seed % 11)}%` },
    { icon: PhoneCall, label: 'Klik kontak', value: 12 + (seed % 40), delta: `+${5 + (seed % 23)}%` },
  ];
}

const pinIcon = (b) => {
  const m = catMeta(b.category);
  return L.divIcon({
    className: '',
    html: `<div style="width:54px;height:54px;background:${m.color};border:3px solid #fff;
      border-radius:50% 50% 50% 4px;transform:rotate(-45deg);
      box-shadow:0 0 0 5px rgba(255,201,20,.55), 0 6px 14px rgba(15,30,61,.35);
      display:flex;align-items:center;justify-content:center">
      <span style="transform:rotate(45deg);font-size:24px">${m.emoji}</span></div>`,
    iconSize: [54, 54],
    iconAnchor: [27, 54],
  });
};

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, 15, { duration: 0.8 }); }, [center, map]);
  return null;
}

function StatusBadge({ status, className = '' }) {
  const m = statusOf(status);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${m.cls} ${className}`}>
      <m.icon size={11} /> {m.label}
    </span>
  );
}

function Cover({ b, className = '' }) {
  const m = catMeta(b.category);
  return b.photo ? (
    <img src={b.photo} alt="" loading="lazy" decoding="async" className={`object-cover ${className}`} />
  ) : (
    <span className={`flex items-center justify-center text-2xl ${className}`} style={{ background: `linear-gradient(135deg, ${m.color}33, ${m.color}10)` }} aria-hidden="true">{m.emoji}</span>
  );
}

function OpenToggle({ b, busy, onToggle }) {
  const live = openStatus(b.open_hours, b.is_open);
  const on = b.is_open ?? live?.open ?? false;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy || b.status !== 'approved'}
      onClick={() => onToggle(!on)}
      title={b.status !== 'approved' ? 'Bisa diatur setelah usaha tayang' : on ? 'Tandai tutup sementara' : 'Tandai buka'}
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold pl-1 pr-2.5 py-1 rounded-full ring-1 transition-colors disabled:opacity-50 ${on ? 'bg-success/10 text-success ring-success/30' : 'bg-blue-100 text-navy-500 ring-blue-200'}`}
    >
      <span className={`w-7 h-4 rounded-full p-0.5 transition-colors ${on ? 'bg-success' : 'bg-blue-300'}`}>
        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`block w-3 h-3 bg-white rounded-full ${on ? 'ml-auto' : ''}`} />
      </span>
      {busy ? <Loader2 size={11} className="animate-spin" /> : on ? 'Buka' : 'Tutup'}
    </button>
  );
}

function Empty({ icon: Icon = Store, title, text, action }) {
  return (
    <div className="text-center py-14 px-6">
      <span className="mx-auto w-14 h-14 rounded-2xl bg-blue-100 text-navy-500 flex items-center justify-center"><Icon size={24} /></span>
      <p className="font-heading font-bold mt-3">{title}</p>
      <p className="text-xs text-navy-500 mt-1 max-w-sm mx-auto">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function AddButton({ className = '', label = 'Tambah Usaha' }) {
  return (
    <Link
      to="/daftar-usaha"
      className={`group inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-navy-900 text-sm font-heading font-bold pl-3 pr-4 py-2.5 rounded-xl shadow-lg shadow-yellow-500/25 active:translate-y-px transition-colors ${className}`}
    >
      <span className="w-6 h-6 rounded-lg bg-navy-900 text-yellow-400 flex items-center justify-center transition-transform group-hover:rotate-90"><Plus size={14} strokeWidth={3} /></span>
      {label}
    </Link>
  );
}

/* ═══════════════ panel detail usaha ═══════════════ */
function DetailDrawer({ b, onClose, onUpdate, onDelete }) {
  const [tab, setTab] = useState('info');
  const m = catMeta(b.category);
  const week = weeklyHours(b.open_hours);
  const comp = completeness(b);
  const photos = [b.photos?.front, b.photos?.interior, ...(b.photos?.products ?? [])].filter(Boolean);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[1300] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" className="absolute inset-0 bg-navy-900/45" onClick={onClose} aria-label="Tutup detail" />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detail ${b.name}`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
      >
        <div className="relative h-44 shrink-0">
          <Cover b={b} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent" />
          <button type="button" onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-navy-800 flex items-center justify-center hover:bg-white" aria-label="Tutup"><X size={18} /></button>
          <div className="absolute left-5 bottom-4 right-5 text-white">
            <StatusBadge status={b.status} className="!bg-white/90" />
            <h2 className="font-heading font-extrabold text-xl mt-1.5 leading-tight">{b.name}</h2>
            <p className="text-xs text-blue-100">{m.emoji} {b.subcategory ?? m.label}</p>
          </div>
        </div>

        <div className="flex gap-1 px-4 pt-3 border-b border-blue-100" role="tablist">
          {[['info', 'Info'], ['jam', 'Jam & Layanan'], ['menu', 'Menu'], ['foto', `Foto (${photos.length})`]].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`relative px-3 py-2 text-xs font-bold transition-colors ${tab === k ? 'text-navy-900' : 'text-navy-500 hover:text-navy-800'}`}>
              {l}
              {tab === k && <motion.span layoutId="drawer-tab" className="absolute inset-x-2 -bottom-px h-0.5 bg-yellow-500 rounded-full" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm" data-lenis-prevent>
          {b.status === 'rejected' && b.review && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-3.5">
              <p className="text-xs font-bold text-danger flex items-center gap-1.5"><AlertTriangle size={13} /> Catatan dari admin</p>
              {reviewReasons(b.review).length > 0 && <ul className="mt-1.5 list-disc pl-4 text-xs text-navy-700 space-y-0.5">{reviewReasons(b.review).map((r) => <li key={r}>{r}</li>)}</ul>}
              {b.review.note && <p className="text-xs text-navy-700 mt-1.5">“{b.review.note}”</p>}
            </div>
          )}

          {tab === 'info' && (
            <>
              {b.description && <p className="text-navy-700 leading-relaxed">{b.description}</p>}
              <dl className="space-y-2.5">
                {[
                  [MapPin, 'Alamat', b.address],
                  [Phone, 'Telepon/WA', b.phone],
                  [AtSign, 'Instagram', b.instagram],
                  [Globe, 'Situs', b.website],
                  [Wallet, 'Kisaran harga', b.price_range ? `Rp${Number(b.price_range.min).toLocaleString('id-ID')} – Rp${Number(b.price_range.max).toLocaleString('id-ID')}` : null],
                  [Megaphone, 'Promo aktif', b.promo],
                ].filter(([, , v]) => v).map(([Icon, l, v]) => (
                  <div key={l} className="flex gap-3">
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-blue-50 text-navy-600 flex items-center justify-center"><Icon size={15} /></span>
                    <div className="min-w-0"><dt className="text-[11px] text-navy-500">{l}</dt><dd className="text-xs font-semibold text-navy-800 break-words">{v}</dd></div>
                  </div>
                ))}
              </dl>
              <div className="bg-blue-50 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs font-bold"><span>Kelengkapan profil</span><span className="font-data">{comp.pct}%</span></div>
                <div className="h-1.5 bg-blue-200 rounded-full mt-2 overflow-hidden"><motion.div className="h-full bg-success rounded-full" initial={{ width: 0 }} animate={{ width: `${comp.pct}%` }} transition={{ duration: 0.7 }} /></div>
                <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
                  {comp.items.map((i) => (
                    <li key={i.key} className={`flex items-center gap-1.5 text-[11px] ${i.ok ? 'text-navy-700' : 'text-navy-500'}`}>
                      {i.ok ? <CheckCircle2 size={12} className="text-success shrink-0" /> : <span className="w-3 h-3 rounded-full border-2 border-blue-300 shrink-0" />}{i.label}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {tab === 'jam' && (
            <>
              {week ? (
                <ul className="divide-y divide-blue-100 border border-blue-100 rounded-xl">
                  {week.map((d) => <li key={d.key} className="flex justify-between px-3.5 py-2 text-xs"><span className="text-navy-500">{d.label}</span><span className={`font-semibold ${/tutup/i.test(d.text) ? 'text-danger' : 'text-navy-800'}`}>{d.text}</span></li>)}
                </ul>
              ) : <p className="text-xs text-navy-500">Jam buka belum diisi.</p>}
              {b.payments?.length > 0 && (
                <div><p className="text-xs font-bold mb-1.5">Pembayaran</p><div className="flex flex-wrap gap-1.5">{b.payments.map((p) => <span key={p} className="text-[11px] bg-blue-50 ring-1 ring-blue-200 px-2 py-1 rounded-lg">{labelOf(PAYMENT_OPTIONS, p)}</span>)}</div></div>
              )}
              {b.amenities?.length > 0 && (
                <div><p className="text-xs font-bold mb-1.5">Fasilitas</p><div className="flex flex-wrap gap-1.5">{b.amenities.map((p) => <span key={p} className="text-[11px] bg-blue-50 ring-1 ring-blue-200 px-2 py-1 rounded-lg">{labelOf(AMENITY_OPTIONS, p)}</span>)}</div></div>
              )}
            </>
          )}

          {tab === 'menu' && (b.menu?.length ? (
            <ul className="divide-y divide-blue-100 border border-blue-100 rounded-xl">
              {b.menu.map((it, i) => (
                <li key={`${it.name}-${i}`} className="flex justify-between gap-3 px-3.5 py-2.5">
                  <span className="min-w-0"><span className="block text-xs font-semibold">{it.name}</span>{it.desc && <span className="block text-[11px] text-navy-500">{it.desc}</span>}</span>
                  <span className="text-xs font-data font-bold shrink-0">{it.price != null ? `Rp${Number(it.price).toLocaleString('id-ID')}` : '—'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-navy-500">Belum ada menu/layanan. Tambahkan lewat Edit agar konsumen tahu harga.</p>)}

          {tab === 'foto' && (photos.length ? (
            <div className="grid grid-cols-2 gap-2">{photos.map((p, i) => <img key={i} src={p} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover rounded-xl" />)}</div>
          ) : <p className="text-xs text-navy-500">Belum ada foto.</p>)}
        </div>

        <div className="border-t border-blue-100 p-4 flex flex-wrap gap-2">
          {b.editId != null ? (
            <Link to={`/daftar-usaha?edit=${b.editId}`} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-blue-50 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
              <PencilLine size={14} /> {b.status === 'rejected' ? 'Perbaiki & ajukan ulang' : 'Edit data'}
            </Link>
          ) : (
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-100 text-navy-500 text-xs font-bold px-4 py-2.5 rounded-xl" title="Data contoh akun demo">
              <Info size={14} /> Data contoh tidak dapat diedit
            </span>
          )}
          {b.status === 'approved' && (
            <button type="button" onClick={() => onUpdate(b)} className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-900 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors">
              <RadioTower size={14} /> Update
            </button>
          )}
          {b.source !== 'demo' && (
            <button type="button" onClick={() => onDelete(b)} className="inline-flex items-center gap-1.5 text-danger hover:bg-danger/10 ring-1 ring-danger/30 text-xs font-bold px-3 py-2.5 rounded-xl transition-colors" aria-label={`Hapus ${b.name}`}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function ConfirmDelete({ b, busy, onCancel, onConfirm }) {
  return (
    <motion.div className="fixed inset-0 z-[1400] bg-navy-900/50 flex items-center justify-center p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div role="alertdialog" aria-modal="true" aria-label="Hapus usaha" initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <span className="w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center"><Trash2 size={22} /></span>
        <h3 className="font-heading font-bold text-lg mt-3">Hapus “{b.name}”?</h3>
        <p className="text-xs text-navy-500 mt-1.5 leading-relaxed">Usaha akan dihapus permanen dari akunmu dan dari peta, termasuk ulasan & laporannya. Tindakan ini tidak bisa dibatalkan.</p>
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onCancel} disabled={busy} className="flex-1 bg-blue-100 hover:bg-blue-200 text-navy-700 text-sm font-bold py-2.5 rounded-xl transition-colors">Batal</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-danger hover:brightness-110 text-white text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Hapus
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PromoModal({ b, onClose, onSave }) {
  const [text, setText] = useState(b.promo ?? '');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave(text.trim() || null);
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <motion.div className="fixed inset-0 z-[1400] bg-navy-900/50 flex items-center justify-center p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form role="dialog" aria-modal="true" aria-label="Pasang promo" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.22 }} onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg text-navy-800">Pasang Promo ✨</h3>
          <button type="button" onClick={onClose} className="text-navy-500 hover:text-navy-800" aria-label="Tutup"><X size={20} /></button>
        </div>
        <p className="text-xs text-navy-500 mt-1">Untuk <span className="font-bold text-navy-700">{b.name}</span> · tampil di peta konsumen.</p>
        <input
          autoFocus
          maxLength={80}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Contoh: "Beli 2 gratis 1 sampai Minggu"'
          className="w-full mt-4 border border-blue-300 rounded-xl px-4 py-3 outline-none focus:border-navy-600 focus:ring-2 focus:ring-blue-200 text-navy-800 transition-all"
        />
        <p className="text-[10px] text-navy-500 text-right mt-1 font-data">{text.length}/80</p>
        <div className="flex gap-2 mt-3">
          {b.promo && (
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onSave(null); onClose(); } finally { setBusy(false); } }} className="px-4 bg-blue-100 hover:bg-blue-200 text-navy-700 text-sm font-bold rounded-xl transition-colors">Hapus promo</button>
          )}
          <button type="submit" disabled={busy} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 font-heading font-bold py-3 rounded-xl transition-colors disabled:opacity-60">
            {busy && <Loader2 size={15} className="animate-spin" />} Tayangkan Promo
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ═══════════════ halaman ═══════════════ */
export default function BusinessDashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((v) => v.key === params.get('view')) ? params.get('view') : 'home';
  const [list, setList] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [detail, setDetail] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [promoFor, setPromoFor] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('semua');
  const [q, setQ] = useState('');
  const [revBiz, setRevBiz] = useState('semua');

  const go = useCallback((v, extra = {}) => {
    const next = new URLSearchParams(params);
    next.set('view', v);
    Object.entries(extra).forEach(([k, val]) => (val == null ? next.delete(k) : next.set(k, val)));
    setParams(next, { replace: false });
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, [params, setParams]);

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? 'ready' : 'loading'));
    try {
      const data = await fetchMyBusinesses(user);
      setList(data);
      setState('ready');
      setError('');
      fetchOwnerReviews(data).then(setReviews).catch(() => setReviews([]));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Gagal memuat data usaha. Periksa koneksi server.');
      setState('error');
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const flash = (text, tone = 'ok') => {
    setToast({ text, tone, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  };

  const patch = async (b, p, msg) => {
    setBusyKey(b.key);
    try {
      const next = await updateOps(b, p);
      setList((l) => l.map((x) => (x.key === b.key ? { ...x, ...next, updated_at: new Date().toISOString() } : x)));
      setDetail((d) => (d?.key === b.key ? { ...d, ...next } : d));
      flash(msg);
    } catch (err) {
      flash(err.response?.data?.message ?? 'Gagal menyimpan perubahan', 'err');
      throw err;
    } finally {
      setBusyKey(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await removeBusiness(toDelete);
      setList((l) => l.filter((x) => x.key !== toDelete.key));
      setDetail(null);
      flash(`${toDelete.name} dihapus`);
      setToDelete(null);
    } catch (err) {
      flash(err.response?.data?.message ?? err.message ?? 'Gagal menghapus', 'err');
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => ({
    semua: list.length,
    approved: list.filter((b) => b.status === 'approved').length,
    pending: list.filter((b) => b.status === 'pending').length,
    rejected: list.filter((b) => b.status === 'rejected' || b.status === 'reported').length,
  }), [list]);

  const live = list.filter((b) => b.status === 'approved');
  const selKey = params.get('biz');
  const selected = live.find((b) => b.key === selKey) ?? live[0] ?? null;
  const nameWords = (user?.name ?? 'Kamu').replace(/\(.*?\)/g, '').trim().split(/\s+/);
  const firstName = ['bu', 'ibu', 'pak', 'bapak', 'mas', 'mbak'].includes(nameWords[0]?.toLowerCase()) ? nameWords.slice(0, 2).join(' ') : nameWords[0];
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';

  const shown = list.filter((b) => {
    const okF = filter === 'semua' || b.status === filter || (filter === 'rejected' && b.status === 'reported');
    const s = q.trim().toLowerCase();
    return okF && (!s || b.name.toLowerCase().includes(s) || (b.subcategory ?? '').toLowerCase().includes(s) || (b.address ?? '').toLowerCase().includes(s));
  });

  const avgRating = (() => {
    const rs = reviews.map((r) => Number(r.rating)).filter(Boolean);
    if (rs.length) return (rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(1);
    const withR = live.filter((b) => b.rating);
    return withR.length ? (withR.reduce((a, b) => a + b.rating, 0) / withR.length).toFixed(1) : null;
  })();

  const openUpdate = (b) => { setDetail(null); go('update', { biz: b.key }); };

  /* ─── kartu usaha ─── */
  const bizCard = (b, i) => {
    const m = catMeta(b.category);
    return (
      <motion.article
        key={b.key}
        layout
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04 } }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="group bg-white border border-blue-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-navy-800/10 hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
      >
        <button type="button" onClick={() => setDetail(b)} className="relative h-36 overflow-hidden text-left" aria-label={`Lihat detail ${b.name}`}>
          <Cover b={b} className="w-full h-full transition-transform duration-700 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-navy-900/60 via-transparent to-transparent" />
          <StatusBadge status={b.status} className="absolute top-3 left-3 !bg-white/95 shadow" />
          {b.promo && <span className="absolute top-3 right-3 bg-yellow-500 text-navy-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">✨ Promo</span>}
          <span className="absolute left-3 bottom-2.5 text-white text-[11px] font-semibold">{m.emoji} {b.subcategory ?? m.label}</span>
        </button>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-heading font-bold text-[15px] leading-snug">{b.name}</h3>
          <p className="text-[11px] text-navy-500 mt-1 line-clamp-1 flex items-center gap-1"><MapPin size={11} className="shrink-0" />{b.address || 'Alamat belum diisi'}</p>
          <div className="flex items-center gap-3 mt-2.5 text-[11px]">
            {b.rating ? <span className="flex items-center gap-1 font-bold"><Star size={12} className="text-yellow-500 fill-yellow-500" />{Number(b.rating).toFixed(1)} <span className="font-normal text-navy-500">({b.review_count})</span></span> : <span className="text-navy-500">Belum ada ulasan</span>}
            {b.open_reports > 0 && <span className="text-danger font-bold flex items-center gap-1"><AlertTriangle size={11} />{b.open_reports} laporan</span>}
          </div>
          {b.status === 'rejected' && b.review?.note && (
            <p className="mt-2.5 text-[11px] text-danger bg-danger/5 rounded-lg px-2.5 py-1.5 line-clamp-2">“{b.review.note}”</p>
          )}
          {b.status === 'pending' && <p className="mt-2.5 text-[11px] text-yellow-700 bg-yellow-500/10 rounded-lg px-2.5 py-1.5">Admin meninjau maks. 24 jam · diajukan {ago(b.created_at)}</p>}
          <div className="mt-auto pt-3.5 flex items-center gap-2">
            <OpenToggle b={b} busy={busyKey === b.key} onToggle={(v) => patch(b, { is_open: v }, v ? `${b.name} ditandai buka` : `${b.name} ditandai tutup`).catch(() => {})} />
            <div className="ml-auto flex items-center gap-1">
              {b.status === 'rejected' && b.editId != null ? (
                <Link to={`/daftar-usaha?edit=${b.editId}`} className="inline-flex items-center gap-1 bg-navy-800 hover:bg-navy-700 text-blue-50 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"><PencilLine size={12} /> Perbaiki</Link>
              ) : b.status === 'approved' ? (
                <button type="button" onClick={() => openUpdate(b)} className="inline-flex items-center gap-1 bg-yellow-500/20 hover:bg-yellow-500/35 text-navy-900 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"><RadioTower size={12} /> Update</button>
              ) : null}
              <button type="button" onClick={() => setDetail(b)} className="w-8 h-8 rounded-lg ring-1 ring-blue-200 text-navy-600 hover:bg-blue-50 flex items-center justify-center transition-colors" aria-label={`Kelola ${b.name}`} title="Detail & kelola"><MoreHorizontal size={15} /></button>
            </div>
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-blue-50 font-body text-navy-800 overflow-hidden">
      {/* ═══ header HP ═══ */}
      <div className="lg:hidden shrink-0 bg-navy-800 text-blue-300 px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-base text-blue-50">
            <span className="bg-yellow-500 text-navy-800 p-1.5 rounded-full"><MapPin size={14} /></span>
            PesanLokal<span className="text-yellow-500">.</span>
          </Link>
          <span className="text-[9px] font-bold uppercase tracking-widest text-navy-500 mt-0.5">Usaha</span>
          <ProfileMenu className="ml-auto" logoutTo="/login" />
        </div>
        <nav className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar" aria-label="Menu dashboard">
          {VIEWS.map((n) => (
            <button key={n.key} type="button" onClick={() => go(n.key)} aria-current={view === n.key ? 'page' : undefined} className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full transition-colors ${view === n.key ? 'bg-yellow-500 text-navy-800' : 'bg-navy-700 text-blue-300'}`}>
              <n.icon size={13} /> {n.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══ sidebar desktop ═══ */}
      <aside className="hidden lg:flex flex-col shrink-0 w-64 bg-navy-800 text-blue-300 m-3 rounded-3xl p-5 relative overflow-hidden">
        <div className="blob-morph absolute -top-16 -right-16 w-48 h-48 bg-yellow-500/10 pointer-events-none" aria-hidden="true" />
        <Link to="/" className="relative flex items-center gap-2 font-heading font-extrabold text-lg text-blue-50">
          <span className="bg-yellow-500 text-navy-800 p-1.5 rounded-full"><MapPin size={16} /></span>
          PesanLokal<span className="text-yellow-500">.</span>
        </Link>
        <p className="relative text-[10px] font-bold uppercase tracking-widest text-navy-500 mt-1.5 ml-0.5">Dashboard Pelaku Usaha</p>

        <nav className="relative mt-8 space-y-1.5" aria-label="Menu dashboard">
          {VIEWS.map((n) => {
            const active = view === n.key;
            const badge = n.key === 'usaha' ? counts.rejected : null;
            return (
              <button key={n.key} type="button" onClick={() => go(n.key)} aria-current={active ? 'page' : undefined} className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${active ? 'text-navy-800' : 'hover:bg-navy-700/70 hover:text-blue-50'}`}>
                {active && <motion.span layoutId="biz-nav-pill" className="absolute inset-0 bg-yellow-500 rounded-xl shadow-lg shadow-yellow-500/20" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative flex items-center gap-3 w-full">
                  <n.icon size={17} /> {n.label}
                  {badge ? <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-navy-800 text-yellow-500' : 'bg-danger text-white'}`}>{badge}</span> : null}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="relative mt-6">
          <AddButton className="w-full justify-center" />
        </div>

        <div className="relative mt-auto pt-4 border-t border-navy-600 space-y-1">
          <Link to="/explore" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs font-semibold hover:bg-navy-700/70 hover:text-blue-50 transition-colors"><MapPin size={14} /> Lihat peta konsumen</Link>
          <div className="flex items-center gap-2.5 px-2 pt-2">
            <ProfileMenu logoutTo="/login" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-50 truncate">{user?.name}</p>
              <p className="text-[10px] text-navy-500">{list.length} usaha dikelola</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ konten ═══ */}
      <main className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-4 sm:px-6 py-6 ${view === 'update' ? 'max-w-7xl' : 'max-w-6xl'}`}>
          {/* topbar */}
          <motion.div {...rise(0)} className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="hidden sm:flex items-center gap-1.5 text-[11px] text-navy-500 font-semibold mb-1">
                <Home size={12} /> Usaha <ChevronRight size={12} /> <span className="text-navy-700">{VIEWS.find((v) => v.key === view)?.label}</span>
              </p>
              <h1 className="font-heading font-extrabold text-xl sm:text-2xl truncate">
                {view === 'home' ? `${greet}, ${firstName}` : VIEWS.find((v) => v.key === view)?.label}
              </h1>
              <p className="text-xs text-navy-500 mt-0.5">
                {{
                  home: 'Ringkasan semua usahamu dalam satu tempat.',
                  update: 'Pantau jangkauan, pasang promo, dan atur status buka usaha yang sudah tayang.',
                  usaha: 'Tambah, lihat detail, edit, dan kelola setiap usaha milikmu.',
                  ulasan: 'Apa kata konsumen tentang usahamu.',
                  panduan: 'Langkah & tips agar usahamu cepat tayang dan ramai dikunjungi.',
                }[view]}
              </p>
            </div>
            {view !== 'update' && <AddButton className="hidden sm:inline-flex lg:hidden xl:inline-flex" />}
          </motion.div>

          {state === 'loading' && (
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-busy="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-white border border-blue-200 animate-pulse" />)}
              <div className="sm:col-span-2 lg:col-span-4 h-64 rounded-2xl bg-white border border-blue-200 animate-pulse" />
            </div>
          )}

          {state === 'error' && (
            <div className="mt-6 bg-white border border-blue-200 rounded-2xl">
              <Empty icon={AlertTriangle} title="Data usaha gagal dimuat" text={error} action={<button type="button" onClick={load} className="bg-navy-800 text-blue-50 text-xs font-bold px-4 py-2.5 rounded-xl">Coba lagi</button>} />
            </div>
          )}

          {state === 'ready' && (
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                {/* ═══ HOME ═══ */}
                {view === 'home' && (
                  <div className="mt-6 space-y-4 pb-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { k: 'semua', label: 'Total usaha', value: counts.semua, icon: Store, color: '#16294F' },
                        { k: 'approved', label: 'Tayang di peta', value: counts.approved, icon: BadgeCheck, color: '#2E9E6B' },
                        { k: 'pending', label: 'Menunggu verifikasi', value: counts.pending, icon: Hourglass, color: '#E6B000' },
                        { k: 'rejected', label: 'Perlu perbaikan', value: counts.rejected, icon: Ban, color: '#E05252' },
                      ].map((c, i) => (
                        <motion.button
                          key={c.k}
                          type="button"
                          {...rise(0.04 * i)}
                          onClick={() => { setFilter(c.k); go('usaha'); }}
                          className="group text-left bg-white border border-blue-200 rounded-2xl p-4 hover:border-navy-500/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy-800/5 transition-all"
                        >
                          <span className="flex items-center justify-between">
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:-rotate-6" style={{ background: `${c.color}14`, color: c.color }}><c.icon size={18} /></span>
                            <ChevronRight size={15} className="text-navy-500/50 transition-transform group-hover:translate-x-0.5" />
                          </span>
                          <p className="font-data font-bold text-2xl mt-3">{c.value}</p>
                          <p className="text-[11px] text-navy-500 font-semibold">{c.label}</p>
                        </motion.button>
                      ))}
                    </div>

                    {list.length === 0 ? (
                      <motion.div {...rise(0.15)} className="bg-white border border-blue-200 rounded-2xl">
                        <Empty title="Belum ada usaha terdaftar" text="Daftarkan usaha pertamamu. Setelah diverifikasi admin (≤ 24 jam), usahamu tampil di peta konsumen." action={<AddButton label="Daftarkan usaha pertama" />} />
                      </motion.div>
                    ) : (
                      <div className="grid lg:grid-cols-12 gap-4">
                        {/* usaha saya */}
                        <motion.section {...rise(0.12)} className="lg:col-span-7 bg-white border border-blue-200 rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between px-5 py-3.5 border-b border-blue-100">
                            <p className="font-heading font-bold text-sm">Usaha kamu</p>
                            <button type="button" onClick={() => go('usaha')} className="text-[11px] font-bold text-navy-600 hover:text-navy-900 flex items-center gap-1">Kelola semua <ArrowRight size={12} /></button>
                          </div>
                          <ul className="divide-y divide-blue-100">
                            {list.slice(0, 4).map((b) => (
                              <li key={b.key} className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50/60 transition-colors">
                                <Cover b={b} className="w-11 h-11 rounded-xl shrink-0" />
                                <button type="button" onClick={() => setDetail(b)} className="min-w-0 flex-1 text-left">
                                  <p className="text-sm font-bold truncate">{b.name}</p>
                                  <p className="text-[11px] text-navy-500 truncate">{b.subcategory ?? catMeta(b.category).label} · diperbarui {ago(b.updated_at)}</p>
                                </button>
                                <StatusBadge status={b.status} className="hidden sm:inline-flex" />
                                <span className={`sm:hidden w-2 h-2 rounded-full ${statusOf(b.status).dot}`} aria-label={statusOf(b.status).label} />
                              </li>
                            ))}
                          </ul>
                        </motion.section>

                        {/* aktivitas */}
                        <motion.section {...rise(0.16)} className="lg:col-span-5 bg-white border border-blue-200 rounded-2xl overflow-hidden">
                          <p className="font-heading font-bold text-sm px-5 py-3.5 border-b border-blue-100 flex items-center gap-2"><FileClock size={15} className="text-navy-600" /> Aktivitas terbaru</p>
                          <ol className="px-5 py-4 space-y-4">
                            {activityOf(list).map((ev) => {
                              const meta = {
                                submitted: { icon: FileClock, cls: 'bg-blue-100 text-navy-600', t: 'diajukan untuk verifikasi' },
                                approved: { icon: BadgeCheck, cls: 'bg-success/10 text-success', t: 'disetujui & tayang di peta' },
                                rejected: { icon: Ban, cls: 'bg-danger/10 text-danger', t: 'perlu perbaikan' },
                                promo: { icon: Megaphone, cls: 'bg-yellow-500/15 text-yellow-600', t: `promo: “${ev.biz.promo}”` },
                              }[ev.type];
                              return (
                                <li key={ev.key} className="flex gap-3">
                                  <span className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${meta.cls}`}><meta.icon size={14} /></span>
                                  <div className="min-w-0">
                                    <p className="text-xs"><span className="font-bold">{ev.biz.name}</span> {meta.t}</p>
                                    {ev.type === 'rejected' && ev.note && <p className="text-[11px] text-navy-500 mt-0.5 line-clamp-2">“{ev.note}”</p>}
                                    <p className="text-[10px] text-navy-500 mt-0.5">{ago(ev.at)}</p>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </motion.section>

                        {/* kelengkapan profil */}
                        {(() => {
                          const target = [...list].sort((a, b) => completeness(a).pct - completeness(b).pct)[0];
                          const comp = completeness(target);
                          return (
                            <motion.section {...rise(0.2)} className="lg:col-span-7 bg-white border border-blue-200 rounded-2xl p-5">
                              <div className="flex items-start gap-4">
                                <div className="relative w-16 h-16 shrink-0">
                                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#DCEBF5" strokeWidth="4" /><motion.circle cx="18" cy="18" r="15.5" fill="none" stroke="#2E9E6B" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray="100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 100 - comp.pct }} transition={{ duration: 0.9 }} /></svg>
                                  <span className="absolute inset-0 flex items-center justify-center font-data font-bold text-sm">{comp.pct}%</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-heading font-bold text-sm">Lengkapi profil {target.name}</p>
                                  <p className="text-[11px] text-navy-500 mt-0.5">Profil lengkap lebih dipercaya konsumen dan lebih sering muncul di pencarian.</p>
                                  <ul className="flex flex-wrap gap-1.5 mt-2.5">
                                    {comp.items.filter((i) => !i.ok).map((i) => <li key={i.key} className="text-[11px] bg-blue-50 ring-1 ring-blue-200 px-2 py-1 rounded-lg">+ {i.label}</li>)}
                                    {comp.pct === 100 && <li className="text-[11px] text-success font-bold">Semua sudah lengkap 🎉</li>}
                                  </ul>
                                </div>
                                {target.editId != null && comp.pct < 100 && (
                                  <Link to={`/daftar-usaha?edit=${target.editId}`} className="hidden sm:inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-navy-700 ring-1 ring-blue-200 hover:bg-blue-50 px-3 py-2 rounded-lg"><PencilLine size={12} /> Lengkapi</Link>
                                )}
                              </div>
                            </motion.section>
                          );
                        })()}

                        {/* aksi cepat */}
                        <motion.section {...rise(0.24)} className="lg:col-span-5 bg-navy-800 text-blue-100 rounded-2xl p-5 relative overflow-hidden">
                          <div className="pointer-events-none absolute inset-0 bg-contour-dark opacity-60" aria-hidden="true" />
                          <p className="relative font-heading font-bold text-sm text-white">Aksi cepat</p>
                          <div className="relative grid grid-cols-2 gap-2 mt-3">
                            {[
                              { icon: Plus, t: 'Tambah usaha', to: '/daftar-usaha' },
                              { icon: Megaphone, t: 'Pasang promo', on: () => selected && setPromoFor(selected), off: !selected },
                              { icon: RadioTower, t: 'Buka Update', on: () => go('update') },
                              { icon: MessageSquare, t: `Ulasan (${reviews.length})`, on: () => go('ulasan') },
                            ].map((a) => {
                              const cls = 'flex items-center gap-2 bg-white/5 hover:bg-white/10 ring-1 ring-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-40';
                              return a.to
                                ? <Link key={a.t} to={a.to} className={cls}><a.icon size={14} className="text-yellow-400" /> {a.t}</Link>
                                : <button key={a.t} type="button" disabled={a.off} onClick={a.on} className={cls}><a.icon size={14} className="text-yellow-400" /> {a.t}</button>;
                            })}
                          </div>
                          {avgRating && <p className="relative mt-3 text-[11px] text-blue-300 flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400" /> Rata-rata rating usahamu <span className="font-data font-bold text-white">{avgRating}</span></p>}
                        </motion.section>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ UPDATE (peta usaha) ═══ */}
                {view === 'update' && (
                  <div className="mt-5 pb-6">
                    {!selected ? (
                      <div className="bg-white border border-blue-200 rounded-2xl">
                        <Empty icon={RadioTower} title="Belum ada usaha yang tayang" text="Menu Update aktif setelah minimal satu usahamu disetujui admin. Pantau statusnya di Manajemen Usaha." action={<button type="button" onClick={() => go('usaha')} className="bg-navy-800 text-blue-50 text-xs font-bold px-4 py-2.5 rounded-xl">Ke Manajemen Usaha</button>} />
                      </div>
                    ) : (
                      <>
                        {live.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3" role="tablist" aria-label="Pilih usaha">
                            {live.map((b) => (
                              <button key={b.key} type="button" role="tab" aria-selected={b.key === selected.key} onClick={() => go('update', { biz: b.key })} className={`shrink-0 flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-xs font-bold ring-1 transition-colors ${b.key === selected.key ? 'bg-navy-800 text-white ring-navy-800' : 'bg-white text-navy-600 ring-blue-200 hover:ring-navy-500/40'}`}>
                                <Cover b={b} className="w-7 h-7 rounded-full" /> {b.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="relative h-[calc(100svh-13rem)] lg:h-[calc(100vh-11rem)] min-h-[560px] rounded-3xl overflow-hidden border border-blue-200 shadow-xl shadow-navy-800/10">
                          <div className="absolute top-4 right-4 z-[1100] flex items-center gap-2">
                            <span className="hidden sm:flex items-center gap-1.5 bg-success/95 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow"><CheckCircle2 size={15} /> Usaha Tayang</span>
                            <Link to={`/explore?q=${encodeURIComponent(selected.name)}`} className="flex items-center gap-1.5 bg-white text-navy-800 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow hover:bg-blue-50"><ExternalLink size={14} /> Lihat sebagai konsumen</Link>
                          </div>
                          <MapContainer center={[selected.latitude, selected.longitude]} zoom={15} zoomControl={false} className="h-full w-full">
                            <TileLayer
                              url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <FlyTo center={[selected.latitude, selected.longitude]} />
                            <Circle center={[selected.latitude, selected.longitude]} radius={2000} pathOptions={{ color: '#24406B', weight: 2, dashArray: '8 8', fillColor: '#B8D8EA', fillOpacity: 0.2 }} />
                            <Marker position={[selected.latitude, selected.longitude]} icon={pinIcon(selected)} />
                          </MapContainer>

                          <motion.div key={selected.key} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }} className="absolute bottom-0 left-0 right-0 z-[1000] p-3 sm:p-4">
                            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl shadow-navy-800/20 p-4 sm:p-5 max-h-[60svh] overflow-y-auto">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h2 className="font-heading font-extrabold text-lg text-navy-800">{selected.name}</h2>
                                  <p className="text-xs text-navy-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    {catMeta(selected.category).label} · Radius jangkauan 2 km
                                    {selected.promo && <span className="bg-yellow-300 text-navy-800 font-semibold px-2 py-0.5 rounded">✨ {selected.promo}</span>}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <OpenToggle b={selected} busy={busyKey === selected.key} onToggle={(v) => patch(selected, { is_open: v }, v ? 'Usaha ditandai buka' : 'Usaha ditandai tutup sementara').catch(() => {})} />
                                  <button type="button" onClick={() => setPromoFor(selected)} className="shrink-0 flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-sm font-heading font-bold px-4 py-2.5 rounded-xl transition-colors">
                                    <Megaphone size={16} /> {selected.promo ? 'Ubah Promo' : 'Pasang Promo'}
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
                                {perf(selected).map((s) => (
                                  <div key={s.label} className="bg-blue-100 rounded-xl p-3 sm:p-3.5">
                                    <s.icon size={17} className="text-navy-600" />
                                    <p className="font-heading font-extrabold text-xl sm:text-2xl text-navy-800 mt-1.5">{s.value}</p>
                                    <p className="text-[10px] sm:text-[11px] text-navy-500 leading-tight mt-0.5">{s.label}</p>
                                    <p className="text-[11px] font-bold text-success mt-1">{s.delta}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
                                <div className="bg-white border border-blue-200 rounded-xl px-3.5 py-3">
                                  <p className="text-[11px] font-bold text-navy-700 flex items-center gap-1.5"><Lightbulb size={12} className="text-yellow-600" /> Insight Hari Ini</p>
                                  <p className="text-[11px] text-navy-500 mt-1">Puncak kunjungan terjadi pukul 12.00–13.00. Pertimbangkan promo jam makan siang.</p>
                                </div>
                                <div className="bg-white border border-blue-200 rounded-xl px-3.5 py-3">
                                  <p className="text-[11px] font-bold text-navy-700 flex items-center gap-1.5"><Sparkles size={12} className="text-yellow-600" /> Aksi Cepat</p>
                                  <p className="text-[11px] text-navy-500 mt-1">Perbarui jam buka dan foto menu agar rasio klik kontak tetap naik.</p>
                                </div>
                              </div>
                              <p className="text-[10px] text-navy-500 mt-2.5">Angka kunjungan, pencarian & klik kontak adalah estimasi.</p>
                            </div>
                          </motion.div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ═══ MANAJEMEN USAHA ═══ */}
                {view === 'usaha' && (
                  <div className="mt-6 pb-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex bg-white ring-1 ring-blue-200 rounded-xl p-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filter status">
                        {[['semua', 'Semua'], ['approved', 'Tayang'], ['pending', 'Menunggu'], ['rejected', 'Perlu perbaikan']].map(([k, l]) => (
                          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={`relative shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg ${filter === k ? 'text-navy-900' : 'text-navy-500 hover:text-navy-800'}`}>
                            {filter === k && <motion.span layoutId="biz-filter" className="absolute inset-0 bg-yellow-500 rounded-lg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                            <span className="relative">{l} <span className="font-data">({counts[k]})</span></span>
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 bg-white ring-1 ring-blue-200 focus-within:ring-navy-600 rounded-xl px-3 py-2 flex-1 min-w-[12rem] sm:max-w-xs transition-shadow">
                        <Search size={14} className="text-navy-500" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, jenis, alamat…" className="w-full bg-transparent text-xs outline-none" aria-label="Cari usaha" />
                        {q && <button type="button" onClick={() => setQ('')} aria-label="Hapus pencarian"><X size={13} className="text-navy-500" /></button>}
                      </label>
                      <AddButton className="sm:hidden xl:hidden w-full justify-center" />
                    </div>

                    {shown.length === 0 ? (
                      <div className="mt-4 bg-white border border-blue-200 rounded-2xl">
                        {list.length === 0
                          ? <Empty title="Belum ada usaha" text="Tambahkan usaha pertamamu — kamu bisa mengelola lebih dari satu usaha dalam satu akun." action={<AddButton />} />
                          : <Empty icon={Search} title="Tidak ada usaha yang cocok" text="Ubah filter atau kata kunci pencarian." />}
                      </div>
                    ) : (
                      <motion.div layout className="mt-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        <AnimatePresence>
                          {shown.map((b, i) => bizCard(b, i))}
                        </AnimatePresence>
                        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Link to="/daftar-usaha" className="group h-full min-h-[16rem] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 hover:border-yellow-500 hover:bg-yellow-500/5 text-navy-500 hover:text-navy-800 transition-colors">
                            <span className="w-12 h-12 rounded-2xl bg-blue-100 group-hover:bg-yellow-500 group-hover:text-navy-900 flex items-center justify-center transition-colors"><Plus size={22} /></span>
                            <span className="text-sm font-bold">Tambah usaha baru</span>
                            <span className="text-[11px]">Kelola beberapa usaha dalam satu akun</span>
                          </Link>
                        </motion.div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ═══ ULASAN ═══ */}
                {view === 'ulasan' && (
                  <div className="mt-6 pb-8 grid lg:grid-cols-12 gap-4 items-start">
                    <section className="lg:col-span-4 bg-white border border-blue-200 rounded-2xl p-5">
                      <p className="font-heading font-bold text-sm">Ringkasan rating</p>
                      <p className="font-data font-bold text-4xl mt-3">{avgRating ?? '—'}</p>
                      <div className="flex gap-0.5 mt-1">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} className={avgRating && s <= Math.round(avgRating) ? 'text-yellow-500 fill-yellow-500' : 'text-blue-200 fill-blue-200'} />)}</div>
                      <p className="text-[11px] text-navy-500 mt-1">{reviews.length} ulasan terbaru</p>
                      <ul className="mt-4 space-y-2">
                        {[5, 4, 3, 2, 1].map((s) => {
                          const n = reviews.filter((r) => Number(r.rating) === s).length;
                          return (
                            <li key={s} className="flex items-center gap-2 text-[11px]">
                              <span className="w-3 font-data">{s}</span><Star size={10} className="text-yellow-500 fill-yellow-500" />
                              <span className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden"><motion.span className="block h-full bg-yellow-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} transition={{ duration: 0.6 }} /></span>
                              <span className="w-5 text-right font-data text-navy-500">{n}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                    <section className="lg:col-span-8 bg-white border border-blue-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-blue-100">
                        <p className="font-heading font-bold text-sm mr-auto">Ulasan konsumen</p>
                        <div className="relative">
                          <select value={revBiz} onChange={(e) => setRevBiz(e.target.value)} className="appearance-none bg-blue-50 ring-1 ring-blue-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold outline-none" aria-label="Filter usaha">
                            <option value="semua">Semua usaha</option>
                            {live.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
                          </select>
                          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-navy-500" />
                        </div>
                      </div>
                      {(() => {
                        const rs = reviews.filter((r) => revBiz === 'semua' || r.bizKey === revBiz);
                        if (!rs.length) return <Empty icon={MessageSquare} title="Belum ada ulasan" text="Ulasan konsumen untuk usahamu yang tayang akan muncul di sini." />;
                        return (
                          <ul className="divide-y divide-blue-100">
                            {rs.map((r) => (
                              <li key={`${r.bizKey}-${r.id}`} className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-8 h-8 rounded-full bg-navy-800 text-yellow-500 font-heading font-bold text-xs flex items-center justify-center">{(r.user_name ?? '?').slice(0, 1)}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold truncate">{r.user_name}</p>
                                    <p className="text-[10px] text-navy-500 truncate">untuk {r.business_name} · {ago(r.created_at)}</p>
                                  </div>
                                  <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} size={11} className={s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-blue-200 fill-blue-200'} />)}</span>
                                </div>
                                {r.comment && <p className="text-xs text-navy-700 mt-2 ml-[2.625rem] leading-relaxed">{r.comment}</p>}
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </section>
                  </div>
                )}

                {/* ═══ PANDUAN ═══ */}
                {view === 'panduan' && (
                  <div className="mt-6 pb-8 grid lg:grid-cols-12 gap-4 items-start">
                    <section className="lg:col-span-7 bg-white border border-blue-200 rounded-2xl p-5">
                      <p className="font-heading font-bold text-sm">Alur usaha sampai tayang</p>
                      <ol className="mt-4 relative border-l-2 border-dashed border-blue-200 ml-3 space-y-5">
                        {[
                          { icon: Plus, t: 'Tambah usaha', d: 'Isi profil seperti Google Maps: kategori, alamat & titik peta, kontak, jam buka, foto, menu.' },
                          { icon: Hourglass, t: 'Verifikasi admin ≤ 24 jam', d: 'Admin mengecek kebenaran data & foto. Statusnya terlihat di Manajemen Usaha.' },
                          { icon: PencilLine, t: 'Perbaiki bila diminta', d: 'Jika perlu perbaikan, baca catatan admin lalu ajukan ulang dari tombol Perbaiki.' },
                          { icon: BadgeCheck, t: 'Tayang di peta', d: 'Konsumen di sekitar bisa menemukan usahamu, melihat rute, dan menghubungimu.' },
                          { icon: RadioTower, t: 'Update rutin', d: 'Pasang promo dan atur status buka/tutup dari menu Update — langsung tampil tanpa verifikasi ulang.' },
                        ].map((s, i) => (
                          <motion.li key={s.t} {...rise(0.05 * i)} className="pl-6 relative">
                            <span className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-navy-800 text-yellow-400 flex items-center justify-center ring-4 ring-white"><s.icon size={14} /></span>
                            <p className="text-sm font-bold">{s.t}</p>
                            <p className="text-xs text-navy-500 mt-0.5 leading-relaxed">{s.d}</p>
                          </motion.li>
                        ))}
                      </ol>
                    </section>
                    <section className="lg:col-span-5 space-y-3">
                      {[
                        { q: 'Bisakah saya punya lebih dari satu usaha?', a: 'Bisa. Tambahkan sebanyak yang kamu kelola — setiap usaha punya data, status, promo, dan ulasan masing-masing.' },
                        { q: 'Apakah mengedit data usaha yang sudah tayang perlu verifikasi?', a: 'Ya, perubahan data utama (alamat, kontak, foto, menu) ditinjau ulang admin. Promo & status buka/tutup tidak perlu.' },
                        { q: 'Mengapa usaha saya perlu perbaikan?', a: 'Lihat catatan admin di detail usaha. Biasanya karena foto kurang jelas, alamat tidak lengkap, atau titik peta tidak sesuai.' },
                        { q: 'Apakah ada biaya?', a: 'Tidak. PesanLokal gratis untuk UMKM dan tanpa komisi.' },
                      ].map((f) => (
                        <details key={f.q} className="group bg-white border border-blue-200 rounded-2xl px-5 py-3.5 open:shadow-md transition-shadow">
                          <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-bold">
                            {f.q}<ChevronDown size={16} className="shrink-0 text-navy-500 transition-transform group-open:rotate-180" />
                          </summary>
                          <p className="text-xs text-navy-500 mt-2 leading-relaxed">{f.a}</p>
                        </details>
                      ))}
                      <div className="bg-navy-800 text-blue-100 rounded-2xl p-5">
                        <p className="font-heading font-bold text-sm text-white flex items-center gap-2"><LifeBuoy size={15} className="text-yellow-400" /> Butuh bantuan?</p>
                        <p className="text-xs mt-1.5">Hubungi admin wilayah lewat WhatsApp untuk pertanyaan verifikasi.</p>
                        <a href="https://wa.me/6281200000000" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-900 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"><Phone size={13} /> Chat admin</a>
                      </div>
                    </section>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      <AnimatePresence>
        {detail && <DetailDrawer key="detail" b={detail} onClose={() => setDetail(null)} onUpdate={openUpdate} onDelete={(b) => setToDelete(b)} />}
      </AnimatePresence>
      <AnimatePresence>
        {toDelete && <ConfirmDelete key="del" b={toDelete} busy={deleting} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />}
      </AnimatePresence>
      <AnimatePresence>
        {promoFor && (
          <PromoModal
            key="promo"
            b={promoFor}
            onClose={() => setPromoFor(null)}
            onSave={(text) => patch(promoFor, { promo: text }, text ? 'Promo ditayangkan' : 'Promo dihapus')}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-[1500] flex items-center gap-2 text-xs font-bold px-4 py-3 rounded-xl shadow-xl ${toast.tone === 'err' ? 'bg-danger text-white' : 'bg-navy-800 text-white'}`}
          >
            {toast.tone === 'err' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} className="text-success" />} {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
