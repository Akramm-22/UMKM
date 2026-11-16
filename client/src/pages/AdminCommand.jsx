import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle2, Flag, Check, X } from 'lucide-react';
import FloatingHeader from '../components/FloatingHeader.jsx';

const INITIAL = [
  { id: 1, name: 'Warung Nasi Bu Siti', category: 'Kuliner', owner: 'Siti Aminah', latitude: -6.1985, longitude: 106.8125, status: 'approved' },
  { id: 2, name: 'Kopi Kampung Senja', category: 'Kuliner', owner: 'Dimas P.', latitude: -6.2015, longitude: 106.8162, status: 'pending' },
  { id: 3, name: 'Laundry Kilat 24', category: 'Jasa', owner: 'Ratna S.', latitude: -6.1953, longitude: 106.8178, status: 'pending' },
  { id: 4, name: 'Toko Sembako Berkah', category: 'Toko', owner: 'H. Mahmud', latitude: -6.1968, longitude: 106.8209, status: 'approved' },
  { id: 5, name: 'Sate Ayam Bang Jali', category: 'Kuliner', owner: 'Jali', latitude: -6.2041, longitude: 106.8121, status: 'reported' },
];

const STATUS_META = {
  pending: { color: '#FFC914', label: 'Menunggu', icon: Clock },
  approved: { color: '#4A90D9', label: 'Tayang', icon: CheckCircle2 },
  reported: { color: '#E05252', label: 'Dilaporkan', icon: Flag },
};

const statusIcon = (status, selected) => {
  const size = selected ? 42 : 32;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${STATUS_META[status].color};
      border:2.5px solid #EEF6FB;border-radius:50%;box-shadow:0 0 12px ${STATUS_META[status].color}88;
      display:flex;align-items:center;justify-content:center"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export default function AdminCommand() {
  const [businesses, setBusinesses] = useState(INITIAL);
  const [selected, setSelected] = useState(null);

  const counts = useMemo(
    () => businesses.reduce((acc, b) => ({ ...acc, [b.status]: (acc[b.status] ?? 0) + 1 }), {}),
    [businesses]
  );
  const pending = businesses.filter((b) => b.status === 'pending');

  const setStatus = (id, status) => {
    setBusinesses((list) => list.map((b) => (b.id === id ? { ...b, status } : b)));
    setSelected(null);
  };

  return (
    <div className="relative h-screen w-full font-body bg-navy-900">
      <FloatingHeader label="Command Map · Admin" />

      {/* bar statistik atas */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] hidden sm:flex items-center gap-4 bg-navy-800/95 border border-navy-600 text-blue-50 text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> {counts.pending ?? 0} menunggu</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-info" /> {counts.approved ?? 0} tayang</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger" /> {counts.reported ?? 0} dilaporkan</span>
      </div>

      <MapContainer center={[-6.1995, 106.8160]} zoom={15} zoomControl={false} className="h-full w-full">
        {/* basemap terang yang sama dengan peta lain */}
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {businesses.map((b) => (
          <Marker
            key={b.id}
            position={[b.latitude, b.longitude]}
            icon={statusIcon(b.status, selected?.id === b.id)}
            eventHandlers={{ click: () => setSelected(b) }}
          />
        ))}
      </MapContainer>

      {/* panel antrian verifikasi */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
        className="absolute left-4 top-20 bottom-4 z-[1000] w-72 bg-navy-800/95 backdrop-blur border border-navy-600 rounded-2xl p-4 overflow-y-auto"
      >
        <h2 className="font-heading font-bold text-blue-50 text-sm flex items-center gap-2">
          <Clock size={15} className="text-yellow-500" /> Antrian Verifikasi ({pending.length})
        </h2>
        <div className="space-y-2 mt-3">
          {pending.length === 0 && (
            <p className="text-blue-300 text-xs bg-navy-700 rounded-xl p-3">🎉 Semua usaha sudah ditinjau!</p>
          )}
          {pending.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className={`w-full text-left rounded-xl p-3 border transition-all ${
                selected?.id === b.id
                  ? 'bg-navy-600 border-yellow-500'
                  : 'bg-navy-700 border-navy-600 hover:border-blue-400'
              }`}
            >
              <p className="text-blue-50 text-sm font-semibold">{b.name}</p>
              <p className="text-blue-300 text-[11px] mt-0.5">{b.category} · {b.owner}</p>
            </button>
          ))}
        </div>
      </motion.aside>

      {/* panel aksi */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute bottom-4 right-4 z-[1100] w-80 bg-navy-800 border border-navy-600 rounded-2xl p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${STATUS_META[selected.status].color}22`, color: STATUS_META[selected.status].color }}
                >
                  {STATUS_META[selected.status].label}
                </span>
                <h3 className="font-heading font-bold text-blue-50 mt-1.5">{selected.name}</h3>
                <p className="text-blue-300 text-xs mt-0.5">{selected.category} · Pemilik: {selected.owner}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-blue-300 hover:text-blue-50" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              {selected.status !== 'approved' && (
                <button
                  onClick={() => setStatus(selected.id, 'approved')}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-success hover:brightness-110 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
                >
                  <Check size={16} /> Setujui
                </button>
              )}
              <button
                onClick={() => setStatus(selected.id, 'rejected')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-danger hover:brightness-110 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
              >
                <X size={16} /> Tolak
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
