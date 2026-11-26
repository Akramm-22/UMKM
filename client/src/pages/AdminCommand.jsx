import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, CheckCircle2, Flag, X, Search, ListFilter, MapPin, Loader2, Database, FlaskConical, Maximize2,
  User, Phone, Star, Navigation, Wallet, CreditCard, Globe, CalendarDays, ExternalLink,
} from 'lucide-react';
import FloatingHeader from '../components/FloatingHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { DEMO_BUSINESSES } from '../lib/demoPlaces.js';
import { demoSubmissionList, demoDecision, localSubmissions } from '../lib/verification.js';
import { weeklyHours, openStatus } from '../lib/place.js';
import { PAYMENT_OPTIONS, labelOf } from '../lib/businessForm.js';

const STATUS_META = {
  pending: { color: '#FFC914', label: 'Menunggu', icon: Clock },
  approved: { color: '#4A90D9', label: 'Tayang', icon: CheckCircle2 },
  reported: { color: '#E05252', label: 'Dilaporkan', icon: Flag },
  rejected: { color: '#8FBEDC', label: 'Ditolak', icon: X },
};
const CAT_EMOJI = { kuliner: '🍜', jasa: '🔧', toko: '🛒' };
const TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'approved', label: 'Tayang' },
  { key: 'reported', label: 'Laporan' },
  { key: 'rejected', label: 'Ditolak' },
];

const statusIcon = (b, selected) => {
  const size = selected ? 44 : 34;
  const c = STATUS_META[b.status]?.color ?? '#8FBEDC';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${c};border:3px solid #EEF6FB;border-radius:50%;
      box-shadow:0 0 0 ${selected ? 6 : 0}px ${c}55, 0 4px 12px rgba(10,20,40,.45);
      display:flex;align-items:center;justify-content:center;font-size:${selected ? 19 : 15}px">${CAT_EMOJI[b.category] ?? '📍'}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// field detail yang sama dengan kolom database
const detailOf = (r) => ({
  description: r.description ?? null, established_year: r.established_year ?? null, website: r.website ?? null, instagram: r.instagram ?? null,
  open_hours: r.open_hours ?? null, price_range: r.price_range ?? null, payments: r.payments ?? [], promo: r.promo ?? null, is_open: r.is_open ?? null,
  photo_url: r.photo_url ?? r.photos?.front ?? r.photo ?? null,
});

// data demo saat server/DB belum tersambung: usaha tayang + pengajuan demo & lokal
function demoData() {
  const subs = demoSubmissionList().map((s) => ({
    ...detailOf(s),
    key: `demo-${s.id}`, id: s.id, source: 'demo', name: s.name, category: s.category, subcategory: s.subcategory,
    owner_name: s.owner?.name, owner_phone: s.owner?.phone, phone: s.phone, address: s.address,
    latitude: s.latitude, longitude: s.longitude, status: demoDecision(s.id)?.status ?? 'pending', created_at: s.submitted_at,
    review_note: demoDecision(s.id)?.review?.note ?? null, reviewed_at: demoDecision(s.id)?.review?.at ?? null,
  }));
  const locals = localSubmissions().map((l) => ({
    ...detailOf(l.submission),
    key: l.id, id: l.id, localId: l.localId, source: 'local', name: l.name, category: String(l.submission.category ?? '').toLowerCase(),
    subcategory: l.submission.subcategory, owner_name: l.owner, owner_phone: l.submission.owner?.phone ?? null, phone: l.submission.phone, address: l.submission.address,
    latitude: l.submission.latitude, longitude: l.submission.longitude, status: l.status, created_at: l.submission.submitted_at,
    review_note: l.submission.review?.note ?? null, reviewed_at: l.submission.review?.at ?? null,
  }));
  const seeds = DEMO_BUSINESSES.filter((b) => !subs.some((s) => s.name === b.name)).map((b) => ({
    ...detailOf(b),
    key: `seed-${b.id}`, id: b.id, source: 'seed', name: b.name, category: b.category, subcategory: b.subcategory,
    owner_name: null, phone: b.phone, address: b.address, latitude: b.latitude, longitude: b.longitude,
    status: b.id === 4 ? 'reported' : 'approved', rating: b.rating, review_count: b.reviews, open_reports: b.id === 4 ? 1 : 0,
  }));
  return [...subs, ...locals, ...seeds].filter((b) => Number.isFinite(Number(b.latitude)) && Number.isFinite(Number(b.longitude)));
}

// pusatkan peta ke seluruh usaha saat data dimuat / tombol "lihat semua"
function FitAll({ points, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [70, 70], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, map]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 16), { duration: 0.7 });
  }, [target, map]);
  return null;
}

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null);
const rp = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;
const waLink = (p) => `https://wa.me/${String(p).replace(/\D/g, '').replace(/^0/, '62')}`;

// panel detail usaha yang dipilih (hanya informasi; verifikasi tetap di dashboard)
function DetailPanel({ b, onClose }) {
  const m = STATUS_META[b.status] ?? STATUS_META.rejected;
  const week = weeklyHours(b.open_hours);
  const live = openStatus(b.open_hours, b.is_open);
  const today = week ? week[(new Date().getDay() + 6) % 7] : null;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = [
    { icon: User, label: 'Pemilik', value: b.owner_name ? `${b.owner_name}${b.owner_phone ? ` · ${b.owner_phone}` : ''}` : null },
    { icon: Phone, label: 'Kontak usaha', value: b.phone, href: b.phone ? waLink(b.phone) : null },
    { icon: MapPin, label: 'Alamat', value: b.address },
    { icon: Navigation, label: 'Koordinat', value: `${Number(b.latitude).toFixed(5)}, ${Number(b.longitude).toFixed(5)}` },
    { icon: Clock, label: 'Jam buka hari ini', value: today ? `${today.text}${live ? ` · ${live.label}` : ''}` : null },
    { icon: Wallet, label: 'Kisaran harga', value: b.price_range ? `${rp(b.price_range.min)} – ${rp(b.price_range.max)}` : null },
    { icon: CreditCard, label: 'Pembayaran', value: b.payments?.length ? b.payments.map((p) => labelOf(PAYMENT_OPTIONS, p)).join(', ') : null },
    { icon: Globe, label: 'Situs / Instagram', value: [b.website, b.instagram].filter(Boolean).join(' · ') || null },
    { icon: CalendarDays, label: 'Terdaftar', value: [fmtDate(b.created_at), b.established_year && `berdiri ${b.established_year}`].filter(Boolean).join(' · ') || null },
  ].filter((r) => r.value);

  return (
    <motion.aside
      role="dialog"
      aria-label={`Detail ${b.name}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="absolute z-[1150] right-4 left-4 bottom-4 max-h-[70vh] md:left-auto md:top-32 md:max-h-none md:w-[23rem] flex flex-col bg-navy-800 border border-navy-600 rounded-2xl shadow-2xl overflow-hidden"
    >
      <div className="relative h-32 shrink-0 bg-navy-700">
        {b.photo_url
          ? <img src={b.photo_url} alt="" className="w-full h-full object-cover" />
          : <span className="w-full h-full flex items-center justify-center text-4xl" style={{ background: `${m.color}22` }}>{CAT_EMOJI[b.category] ?? '📍'}</span>}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-800 via-navy-800/30 to-transparent" />
        <button type="button" onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-navy-900/70 text-blue-50 hover:bg-navy-900 flex items-center justify-center" aria-label="Tutup detail"><X size={16} /></button>
        <span className="absolute left-4 bottom-2 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-navy-900" style={{ background: m.color }}>
          <m.icon size={11} /> {m.label}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <h3 className="font-heading font-bold text-blue-50 text-lg leading-snug mt-2">{b.name}</h3>
        <p className="text-blue-300 text-xs mt-0.5">{CAT_EMOJI[b.category] ?? '📍'} {b.subcategory ?? b.category} · <span className="capitalize">{b.category}</span></p>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-navy-700 rounded-xl p-2.5">
            <p className="flex items-center gap-1 text-sm font-bold text-blue-50"><Star size={13} className="text-yellow-500 fill-yellow-500" />{b.rating ? Number(b.rating).toFixed(1) : '—'}</p>
            <p className="text-[10px] text-blue-300">{b.review_count ?? 0} ulasan</p>
          </div>
          <div className="bg-navy-700 rounded-xl p-2.5">
            <p className={`text-sm font-bold ${b.open_reports ? 'text-red-300' : 'text-blue-50'}`}>{b.open_reports ?? 0}</p>
            <p className="text-[10px] text-blue-300">laporan terbuka</p>
          </div>
          <div className="bg-navy-700 rounded-xl p-2.5">
            <p className={`text-sm font-bold ${live?.open ? 'text-emerald-300' : 'text-blue-50'}`}>{live ? live.label : '—'}</p>
            <p className="text-[10px] text-blue-300">status buka</p>
          </div>
        </div>

        {b.promo && <p className="mt-3 text-xs font-semibold text-navy-900 bg-yellow-500 rounded-lg px-3 py-1.5">✨ {b.promo}</p>}
        {b.description && <p className="mt-3 text-xs text-blue-200 leading-relaxed">{b.description}</p>}

        <dl className="mt-3 divide-y divide-navy-600 border-y border-navy-600">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-3 py-2.5">
              <r.icon size={14} className="shrink-0 mt-0.5 text-blue-300" />
              <div className="min-w-0">
                <dt className="text-[10px] text-blue-300">{r.label}</dt>
                <dd className="text-xs text-blue-50 break-words">
                  {r.href ? <a href={r.href} target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 hover:underline underline-offset-2">{r.value}</a> : r.value}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        {b.review_note && (
          <p className="mt-3 text-[11px] text-blue-200 bg-navy-700 rounded-lg px-3 py-2">
            <span className="font-bold text-blue-50">Catatan admin{b.reviewed_at ? ` · ${fmtDate(b.reviewed_at)}` : ''}:</span> “{b.review_note}”
          </p>
        )}

        <Link to="/admin" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 hover:text-blue-50"><ExternalLink size={13} /> Kelola di dashboard admin</Link>
      </div>
    </motion.aside>
  );
}

export default function AdminCommand() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [source, setSource] = useState('loading');
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [fitKey, setFitKey] = useState(0);

  // admin melihat seluruh usaha terdaftar langsung dari database
  const load = useCallback(async () => {
    const token = localStorage.getItem('pl_token');
    if (token && !user?.demo) {
      try {
        const { data } = await axios.get('/api/admin/businesses/map', { headers: { Authorization: `Bearer ${token}` } });
        setBusinesses(data.map((b) => ({ ...b, key: `api-${b.id}`, apiId: b.id, source: 'api', category: String(b.category ?? '').toLowerCase(), latitude: Number(b.latitude), longitude: Number(b.longitude) })));
        setSource('database');
        setFitKey((n) => n + 1);
        return;
      } catch {
        // jatuh ke mode demo bila server/DB tidak tersedia
      }
    }
    setBusinesses(demoData());
    setSource('demo');
    setFitKey((n) => n + 1);
  }, [user?.demo]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(
    () => businesses.reduce((acc, b) => ({ ...acc, [b.status]: (acc[b.status] ?? 0) + 1, all: acc.all + 1 }), { all: 0 }),
    [businesses]
  );
  const closeDetail = useCallback(() => setSelected(null), []);
  const visible = businesses.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [b.name, b.owner_name, b.category, b.subcategory, b.address].some((v) => String(v ?? '').toLowerCase().includes(q));
  });
  const points = useMemo(() => visible.map((b) => [b.latitude, b.longitude]), [visible]);

  const pick = (b) => {
    setSelected(b);
    setPanelOpen(false);
  };

  const listPanel = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading font-bold text-blue-50 text-sm flex items-center gap-2">
          <MapPin size={15} className="text-yellow-500" /> Usaha Terdaftar <span className="font-data text-blue-300">({visible.length})</span>
        </h2>
        <button type="button" onClick={() => setPanelOpen(false)} className="md:hidden text-blue-300 hover:text-blue-50 p-2 -m-2 rounded-lg" aria-label="Tutup daftar"><X size={16} /></button>
      </div>
      <div className="mt-3 flex items-center gap-2 bg-navy-700 border border-navy-600 focus-within:border-blue-400 rounded-xl px-3 py-2 transition-colors">
        <Search size={14} className="text-blue-300 shrink-0" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, pemilik, alamat…" className="w-full bg-transparent outline-none text-xs text-blue-50 placeholder:text-blue-300/70" aria-label="Cari usaha" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Hapus pencarian"><X size={13} className="text-blue-300" /></button>}
      </div>
      <div className="flex gap-1 mt-3 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filter status">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={statusFilter === t.key} onClick={() => setStatusFilter(t.key)} className={`shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors ${statusFilter === t.key ? 'bg-yellow-500 text-navy-800' : 'text-blue-200 hover:bg-navy-700'}`}>
            {t.label} <span className="font-data opacity-70">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="space-y-2 mt-3">
        {source === 'loading' && <p className="text-blue-300 text-xs flex items-center gap-2 p-3"><Loader2 size={14} className="animate-spin" /> Memuat data usaha…</p>}
        {source !== 'loading' && visible.length === 0 && <p className="text-blue-300 text-xs bg-navy-700 rounded-xl p-3">Tidak ada usaha yang cocok.</p>}
        {visible.map((b) => {
          const m = STATUS_META[b.status] ?? STATUS_META.rejected;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => pick(b)}
              className={`w-full text-left rounded-xl p-3 border transition-all ${selected?.key === b.key ? 'bg-navy-600 border-yellow-500' : 'bg-navy-700 border-navy-600 hover:border-blue-400'}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm" style={{ background: `${m.color}22` }}>{CAT_EMOJI[b.category] ?? '📍'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-blue-50 text-sm font-semibold truncate">{b.name}</span>
                  <span className="block text-blue-300 text-[11px] truncate">{b.subcategory ?? b.category}{b.owner_name ? ` · ${b.owner_name}` : ''}</span>
                </span>
                <span className="shrink-0 w-2.5 h-2.5 rounded-full mt-1.5" style={{ background: m.color }} title={m.label} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="relative h-screen w-full font-body bg-navy-900">
      <FloatingHeader label="Command Map · Admin" backTo="/admin" onBack={selected ? () => setSelected(null) : undefined} />

      {/* bar statistik atas */}
      <div className="absolute top-4 right-[4.5rem] z-[1100] hidden lg:flex items-center gap-4 bg-navy-800/95 border border-navy-600 text-blue-50 text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg">
        <span className="font-data text-blue-300">{counts.all} usaha</span>
        <span className="w-px h-4 bg-navy-600" />
        {['pending', 'approved', 'reported', 'rejected'].map((s) => (
          <span key={s} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_META[s].color }} /> {counts[s] ?? 0} {STATUS_META[s].label.toLowerCase()}</span>
        ))}
        <span className="w-px h-4 bg-navy-600" />
        <span className={`flex items-center gap-1 ${source === 'database' ? 'text-emerald-300' : 'text-blue-300'}`}>
          {source === 'database' ? <><Database size={12} /> Database</> : <><FlaskConical size={12} /> Mode demo</>}
        </span>
      </div>

      <button type="button" onClick={() => setFitKey((n) => n + 1)} className="absolute top-20 right-4 z-[1100] flex items-center gap-1.5 bg-navy-800/95 border border-navy-600 text-blue-50 text-xs font-bold px-3 py-2 rounded-xl shadow-lg hover:bg-navy-700" title="Tampilkan seluruh usaha">
        <Maximize2 size={14} /> Lihat semua
      </button>

      <button type="button" onClick={() => setPanelOpen((v) => !v)} className="md:hidden absolute left-4 top-20 z-[1100] flex items-center gap-1.5 bg-navy-800 text-blue-50 text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
        <ListFilter size={14} /> Daftar ({visible.length})
      </button>

      <MapContainer center={[-6.1995, 106.816]} zoom={15} zoomControl={false} className="h-full w-full">
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitAll points={points} trigger={fitKey} />
        <FlyTo target={selected} />
        {visible.map((b) => (
          <Marker
            key={b.key}
            position={[b.latitude, b.longitude]}
            icon={statusIcon(b, selected?.key === b.key)}
            title={`${b.name} — ${STATUS_META[b.status]?.label ?? b.status}`}
            zIndexOffset={selected?.key === b.key ? 1000 : 0}
            eventHandlers={{ click: () => pick(b) }}
          />
        ))}
      </MapContainer>

      {/* daftar usaha: kiri di desktop, laci di HP */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
        className={`absolute left-4 top-20 bottom-4 z-[1000] w-[min(20rem,calc(100vw-2rem))] bg-navy-800/95 border border-navy-600 rounded-2xl p-4 overflow-y-auto transition-all ${panelOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 md:translate-x-0 md:opacity-100'}`}
      >
        {listPanel}
      </motion.aside>

      <AnimatePresence mode="wait">
        {selected && <DetailPanel key={selected.key} b={selected} onClose={closeDetail} />}
      </AnimatePresence>
    </div>
  );
}
