import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Search, PhoneCall, Megaphone, X, CheckCircle2, FileClock, Hourglass, BadgeCheck, Ban, ChevronDown, PencilLine } from 'lucide-react';
import FloatingHeader from '../components/FloatingHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ownSubmissions } from '../lib/verification.js';

const SUB_STATUS = {
  pending: { label: 'Menunggu verifikasi', cls: 'bg-yellow-500/15 text-yellow-600', icon: Hourglass },
  approved: { label: 'Disetujui · tayang', cls: 'bg-success/10 text-success', icon: BadgeCheck },
  rejected: { label: 'Ditolak — perlu perbaikan', cls: 'bg-danger/10 text-danger', icon: Ban },
};

const MY_BUSINESS = {
  name: 'Warung Nasi Bu Siti',
  category: 'Kuliner',
  latitude: -6.1985,
  longitude: 106.8125,
  status: 'approved',
};

const STATS = [
  { icon: Eye, label: 'Kunjungan minggu ini', value: 128, delta: '+18%' },
  { icon: Search, label: 'Muncul di pencarian', value: 342, delta: '+9%' },
  { icon: PhoneCall, label: 'Klik kontak', value: 37, delta: '+22%' },
];

const ownPinIcon = L.divIcon({
  className: '',
  html: `<div style="width:54px;height:54px;background:#F2771A;border:3px solid #fff;
    border-radius:50% 50% 50% 4px;transform:rotate(-45deg);
    box-shadow:0 0 0 5px rgba(255,201,20,.55), 0 6px 14px rgba(15,30,61,.35);
    display:flex;align-items:center;justify-content:center">
    <span style="transform:rotate(45deg);font-size:24px">🍜</span></div>`,
  iconSize: [54, 54],
  iconAnchor: [27, 54],
});

export default function BusinessDashboard() {
  const { user } = useAuth();
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoText, setPromoText] = useState('');
  const [activePromo, setActivePromo] = useState('Diskon 10% nasi uduk');
  const [subs, setSubs] = useState(() => (user ? ownSubmissions(user.name) : []));
  const [subsOpen, setSubsOpen] = useState(true);

  // pengajuan dari server (review_note = alasan admin) digabung dengan pengajuan mode demo
  useEffect(() => {
    const token = localStorage.getItem('pl_token');
    if (!token) return;
    axios.get('/api/businesses/mine', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setSubs((local) => [
        ...data.map((b) => ({ ...b, review: b.review_note ? { note: b.review_note, reasons: [], at: b.reviewed_at } : null })),
        ...local,
      ]))
      .catch(() => {});
  }, []);

  const savePromo = (e) => {
    e.preventDefault();
    if (promoText.trim()) setActivePromo(promoText.trim());
    setPromoText('');
    setPromoOpen(false);
  };

  return (
    <div className="relative h-screen w-full font-body">
      <FloatingHeader label="Business Map · Pelaku Usaha" />

      {/* banner status verifikasi */}
      <div className="absolute top-20 right-4 z-[1100] hidden sm:flex items-center gap-1.5 bg-success/95 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow">
        <CheckCircle2 size={15} /> Usaha Tayang
      </div>

      {subs.length > 0 && (
        <div className="absolute top-20 left-4 right-4 sm:right-auto sm:w-80 z-[1100] bg-white rounded-2xl shadow-xl shadow-navy-900/20 border border-blue-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setSubsOpen((v) => !v)}
            aria-expanded={subsOpen}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-blue-50 transition-colors"
          >
            <FileClock size={16} className="text-navy-600" />
            <span className="font-heading font-bold text-sm flex-1 text-left">Status Pengajuan ({subs.length})</span>
            {subs.some((s) => s.status === 'rejected') && <span className="w-2 h-2 rounded-full bg-danger" aria-label="Ada pengajuan ditolak" />}
            <ChevronDown size={16} className={`text-navy-500 transition-transform ${subsOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {subsOpen && (
              <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-blue-100 max-h-[45vh] overflow-y-auto divide-y divide-blue-100">
                {subs.map((s) => {
                  const meta = SUB_STATUS[s.status] ?? SUB_STATUS.pending;
                  return (
                    <li key={s.id} className="px-4 py-3">
                      <p className="text-sm font-bold text-navy-800">{s.name}</p>
                      <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${meta.cls}`}>
                        <meta.icon size={11} /> {meta.label}
                      </span>
                      {s.status === 'rejected' && s.review && (
                        <div className="mt-2 bg-danger/5 border border-danger/20 rounded-xl p-3">
                          <p className="text-[11px] font-bold text-danger">Catatan dari admin</p>
                          {s.review.reasons?.length > 0 && (
                            <ul className="mt-1 list-disc pl-4 text-xs text-navy-700 space-y-0.5">
                              {s.review.reasons.map((r) => <li key={r}>{r}</li>)}
                            </ul>
                          )}
                          {s.review.note && <p className="text-xs text-navy-700 mt-1.5 leading-relaxed">“{s.review.note}”</p>}
                          <Link to={`/daftar-usaha?edit=${s.id}`} className="mt-2.5 inline-flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-blue-50 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                            <PencilLine size={12} /> Perbaiki & ajukan ulang
                          </Link>
                        </div>
                      )}
                      {s.status === 'pending' && <p className="text-[11px] text-navy-500 mt-1">Admin meninjau maks. 24 jam sejak diajukan.</p>}
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}

      <MapContainer center={[MY_BUSINESS.latitude, MY_BUSINESS.longitude]} zoom={15} zoomControl={false} className="h-full w-full">
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {/* radius jangkauan 2 km */}
        <Circle
          center={[MY_BUSINESS.latitude, MY_BUSINESS.longitude]}
          radius={2000}
          pathOptions={{ color: '#24406B', weight: 2, dashArray: '8 8', fillColor: '#B8D8EA', fillOpacity: 0.2 }}
        />
        <Marker position={[MY_BUSINESS.latitude, MY_BUSINESS.longitude]} icon={ownPinIcon} />
      </MapContainer>

      {/* panel statistik mengambang */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        className="absolute bottom-0 left-0 right-0 z-[1000] p-4"
      >
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl shadow-navy-800/20 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading font-extrabold text-lg text-navy-800">{MY_BUSINESS.name}</h2>
              <p className="text-xs text-navy-500 mt-0.5">
                {MY_BUSINESS.category} · Radius jangkauan 2 km
                {activePromo && <span className="ml-2 bg-yellow-300 text-navy-800 font-semibold px-2 py-0.5 rounded">✨ {activePromo}</span>}
              </p>
            </div>
            <button
              onClick={() => setPromoOpen(true)}
              className="shrink-0 flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-sm font-heading font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Megaphone size={16} /> Pasang Promo
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-blue-100 rounded-xl p-3.5">
                <s.icon size={17} className="text-navy-600" />
                <p className="font-heading font-extrabold text-2xl text-navy-800 mt-1.5">{s.value}</p>
                <p className="text-[11px] text-navy-500 leading-tight mt-0.5">{s.label}</p>
                <p className="text-[11px] font-bold text-success mt-1">{s.delta}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-2.5">
            <div className="bg-white border border-blue-200 rounded-xl px-3.5 py-3">
              <p className="text-[11px] font-bold text-navy-700">Insight Hari Ini</p>
              <p className="text-[11px] text-navy-500 mt-1">Puncak kunjungan terjadi pukul 12.00–13.00. Pertimbangkan promo jam makan siang.</p>
            </div>
            <div className="bg-white border border-blue-200 rounded-xl px-3.5 py-3">
              <p className="text-[11px] font-bold text-navy-700">Aksi Cepat</p>
              <p className="text-[11px] text-navy-500 mt-1">Perbarui jam buka dan foto menu agar rasio klik kontak tetap naik.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* modal pasang promo */}
      {promoOpen && (
        <div className="absolute inset-0 z-[1200] bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-5">
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            onSubmit={savePromo}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-navy-800">Pasang Promo ✨</h3>
              <button type="button" onClick={() => setPromoOpen(false)} className="text-navy-500 hover:text-navy-800" aria-label="Tutup">
                <X size={20} />
              </button>
            </div>
            <input
              autoFocus
              value={promoText}
              onChange={(e) => setPromoText(e.target.value)}
              placeholder='Contoh: "Beli 2 gratis 1 sampai Minggu"'
              className="w-full mt-4 border border-blue-300 rounded-xl px-4 py-3 outline-none focus:border-navy-600 focus:ring-2 focus:ring-blue-200 text-navy-800 transition-all"
            />
            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-navy-800 font-heading font-bold py-3 rounded-xl mt-4 transition-colors"
            >
              Tayangkan Promo
            </button>
          </motion.form>
        </div>
      )}
    </div>
  );
}
