import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Search, Star, Phone, Navigation, X, LocateFixed, SlidersHorizontal, Clock, ExternalLink } from 'lucide-react';
import FloatingHeader from './FloatingHeader.jsx';

const DEFAULT_CENTER = [-6.2, 106.816666]; // Jakarta — ganti sesuai wilayah pilot

const IMG = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=320&q=70`;

const CATEGORIES = {
  kuliner: { label: 'Kuliner', emoji: '🍜', accent: '#F2771A' },
  jasa: { label: 'Jasa', emoji: '🔧', accent: '#4A90D9' },
  toko: { label: 'Toko', emoji: '🛒', accent: '#2E9E6B' },
};

const DEMO_BUSINESSES = [
  { id: 1, name: 'Warung Nasi Bu Siti', category: 'kuliner', latitude: -6.1985, longitude: 106.8125, rating: 4.8, reviews: 120, is_open: true, promo: 'Diskon 10% nasi uduk', phone: '6281234567890', address: 'Jl. Melati No. 3', photo: IMG('photo-1512058564366-18510be2db19') },
  { id: 2, name: 'Jahit Cepat Pak Anto', category: 'jasa', latitude: -6.2032, longitude: 106.8188, rating: 4.6, reviews: 45, is_open: true, promo: null, phone: '6281298765432', address: 'Jl. Kenanga No. 11', photo: IMG('photo-1558618666-fcd25c85cd64') },
  { id: 3, name: 'Toko Sembako Berkah', category: 'toko', latitude: -6.1968, longitude: 106.8209, rating: 4.7, reviews: 89, is_open: false, promo: null, phone: '6285612345678', address: 'Jl. Mawar No. 7', photo: IMG('photo-1542838132-92c53300491e') },
  { id: 4, name: 'Sate Ayam Bang Jali', category: 'kuliner', latitude: -6.2041, longitude: 106.8121, rating: 4.9, reviews: 210, is_open: true, promo: 'Beli 10 gratis 2', phone: '6287811223344', address: 'Jl. Anggrek No. 21', photo: IMG('photo-1529563021893-cc83c992d75d') },
  { id: 5, name: 'Kopi Kampung Senja', category: 'kuliner', latitude: -6.2008, longitude: 106.8171, rating: 4.7, reviews: 64, is_open: true, promo: null, phone: '6281377788899', address: 'Jl. Dahlia No. 2', photo: IMG('photo-1509042239860-f550ce710b93') },
  { id: 6, name: 'Laundry Kilat 24', category: 'jasa', latitude: -6.1953, longitude: 106.8178, rating: 4.6, reviews: 45, is_open: true, promo: 'Gratis antar 1 km', phone: '6282144556677', address: 'Jl. Flamboyan No. 9', photo: IMG('photo-1545173168-9f1947eebb7f') },
];

// pin ala Gojek: badan navy solid, emoji kategori, titik aksen warna kategori
function makePinIcon(biz, selected) {
  const cat = CATEGORIES[biz.category] ?? CATEGORIES.toko;
  const size = selected ? 48 : 38;
  const promoRing = biz.promo ? `box-shadow:0 0 0 3px #FFC914,0 5px 12px rgba(10,20,40,.35);` : `box-shadow:0 5px 12px rgba(10,20,40,.35);`;
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      <div style="width:100%;height:100%;background:#16294F;${promoRing}
        border:2.5px solid #fff;border-radius:50% 50% 50% 5px;transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);font-size:${size * 0.42}px">${cat.emoji}</span>
      </div>
      <div style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;
        background:${cat.accent};border:2px solid #fff"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], 16, { duration: 0.6 });
  }, [target, map]);
  return null;
}

// titik biru lokasi konsumen ala Google Maps
const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#4A90D9;border:3px solid #fff;border-radius:50%;
    box-shadow:0 0 0 7px rgba(74,144,217,.25),0 2px 6px rgba(15,30,61,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitRoute({ route }) {
  const map = useMap();
  useEffect(() => {
    if (route) map.fitBounds(route.coords, { padding: [70, 70] });
  }, [route, map]);
  return null;
}

function RecenterButton({ center }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo(center, 15)}
      className="absolute bottom-6 right-4 z-[1000] bg-navy-800 rounded-2xl p-3.5 shadow-lg shadow-navy-900/30 text-yellow-500 hover:bg-navy-700 transition-colors"
      aria-label="Kembali ke sekitarku"
    >
      <LocateFixed size={21} />
    </button>
  );
}

function BusinessListItem({ biz, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl overflow-hidden border transition-all ${
        active ? 'border-navy-800 shadow-md shadow-navy-800/15' : 'border-blue-200 hover:border-navy-500'
      } bg-white`}
    >
      <div className="flex gap-3 p-2.5">
        <img src={biz.photo} alt={biz.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="font-heading font-bold text-sm text-navy-800 truncate">{biz.name}</p>
          <p className="text-xs text-navy-500 flex items-center gap-1 mt-1">
            <Star size={11} className="text-yellow-500 fill-yellow-500" /> {biz.rating} ({biz.reviews}) ·{' '}
            <span className={biz.is_open ? 'text-success font-semibold' : 'text-danger font-semibold'}>
              {biz.is_open ? 'Buka' : 'Tutup'}
            </span>
          </p>
          {biz.promo ? (
            <span className="inline-block mt-1.5 bg-yellow-500 text-navy-800 text-[10px] font-bold px-2 py-0.5 rounded-md truncate max-w-full">
              {biz.promo}
            </span>
          ) : (
            <p className="text-[11px] text-navy-500 mt-1.5 truncate">{biz.address}</p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ExploreMap() {
  const [businesses, setBusinesses] = useState(DEMO_BUSINESSES);
  const [demoMode, setDemoMode] = useState(true);
  const [filter, setFilter] = useState('semua');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [userPos, setUserPos] = useState(DEFAULT_CENTER);
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const mapRef = useRef(null);

  // pakai lokasi asli konsumen bila diizinkan; selain itu tetap di pusat demo
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { timeout: 5000 }
    );
  }, []);

  // rute jalan sungguhan via OSRM (gratis, tanpa API key)
  const getRoute = async (biz) => {
    setRouting(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${userPos[1]},${userPos[0]};${biz.longitude},${biz.latitude}?overview=full&geometries=geojson`;
      const { data } = await axios.get(url);
      const r = data.routes[0];
      setRoute({
        coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        km: (r.distance / 1000).toFixed(1),
        min: Math.max(1, Math.round(r.duration / 60)),
        to: biz.name,
      });
    } catch {
      // OSRM tidak terjangkau → buka Google Maps sebagai cadangan
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${biz.latitude},${biz.longitude}`, '_blank');
    } finally {
      setRouting(false);
    }
  };

  useEffect(() => {
    axios
      .get('/api/businesses', { params: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], radius: 5 } })
      .then((res) => {
        if (res.data.length > 0) {
          setBusinesses(res.data);
          setDemoMode(false);
        }
      })
      .catch(() => {});
  }, []);

  const visible = useMemo(
    () =>
      businesses.filter((b) => {
        const matchCat = filter === 'semua' || b.category === filter;
        const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
        const matchOpen = !onlyOpen || b.is_open;
        return matchCat && matchSearch && matchOpen;
      }),
    [businesses, filter, search, onlyOpen]
  );

  const chips = [
    { key: 'semua', label: 'Semua' },
    ...Object.entries(CATEGORIES).map(([key, c]) => ({ key, label: `${c.emoji} ${c.label}` })),
  ];

  return (
    <div className="relative h-screen w-full font-body flex">
      <FloatingHeader label="Explore Map" />

      {/* ── Sidebar daftar usaha (desktop) ── */}
      <aside className="hidden md:flex flex-col w-[21rem] shrink-0 bg-white border-r border-blue-200 pt-20 z-[1050]">
        <div className="px-4">
          <div className="flex items-center gap-2 bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 focus-within:border-navy-600 transition-colors">
            <Search size={17} className="text-navy-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari di sekitarmu…"
              className="w-full outline-none text-sm text-navy-800 placeholder:text-navy-500/60 bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-navy-500" aria-label="Hapus">
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filter === c.key ? 'bg-navy-800 text-blue-50 border-navy-800' : 'bg-white text-navy-600 border-blue-300 hover:bg-blue-100'
                }`}
              >
                {c.label}
              </button>
            ))}
            <button
              onClick={() => setOnlyOpen((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                onlyOpen ? 'bg-success text-white border-success' : 'bg-white text-navy-600 border-blue-300 hover:bg-blue-100'
              }`}
            >
              <SlidersHorizontal size={11} /> Buka skrg
            </button>
          </div>
          <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mt-4 mb-2">
            {visible.length} usaha ditemukan
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {visible.map((b) => (
            <BusinessListItem key={b.id} biz={b} active={selected?.id === b.id} onClick={() => setSelected(b)} />
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-navy-500 bg-white border border-blue-200 rounded-xl p-4 text-center">
              Tidak ada usaha yang cocok 😕
            </p>
          )}
        </div>
      </aside>

      {/* ── Peta ── */}
      <div className="relative flex-1">
        {/* search mobile */}
        <div className="md:hidden absolute top-16 left-0 right-0 z-[1000] p-4 space-y-2.5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-lg shadow-navy-800/10">
            <Search size={18} className="text-navy-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari warung, jasa, toko…"
              className="w-full outline-none text-sm text-navy-800 placeholder:text-navy-500/60 bg-transparent"
            />
          </div>
          <div className="pointer-events-auto flex gap-1.5 overflow-x-auto pb-1">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  filter === c.key ? 'bg-navy-800 text-blue-50 border-navy-800' : 'bg-white text-navy-600 border-blue-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {demoMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-navy-800/90 text-blue-50 text-xs font-medium px-3.5 py-1.5 rounded-full shadow">
            Mode demo — database belum tersambung
          </div>
        )}

        <MapContainer center={DEFAULT_CENTER} zoom={15} zoomControl={false} className="h-full w-full" ref={mapRef}>
          {/* Stadia Alidade Smooth — basemap bersih ala Google Maps (gratis utk dev/localhost) */}
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {visible.map((biz) => (
            <Marker
              key={biz.id}
              position={[biz.latitude, biz.longitude]}
              icon={makePinIcon(biz, selected?.id === biz.id)}
              eventHandlers={{ click: () => setSelected(biz) }}
            />
          ))}
          {/* lokasi konsumen */}
          <Marker position={userPos} icon={userIcon} />
          {/* rute ala Google Maps: casing navy + garis biru */}
          {route && (
            <>
              <Polyline positions={route.coords} pathOptions={{ color: '#16294F', weight: 8, opacity: 0.85, lineCap: 'round' }} />
              <Polyline positions={route.coords} pathOptions={{ color: '#4A90D9', weight: 4.5, opacity: 1, lineCap: 'round' }} />
              <FitRoute route={route} />
            </>
          )}
          <FlyTo target={route ? null : selected} />
          <RecenterButton center={userPos} />
        </MapContainer>

        {/* panel info rute */}
        {route && (
          <div className="absolute top-16 md:top-5 left-1/2 -translate-x-1/2 z-[1100] bg-navy-800 text-blue-50 rounded-2xl shadow-xl shadow-navy-900/30 pl-5 pr-3 py-3 flex items-center gap-4">
            <Navigation size={18} className="text-yellow-500 shrink-0" />
            <div className="text-sm">
              <p className="font-heading font-bold leading-tight">{route.km} km · ±{route.min} menit</p>
              <p className="text-[11px] text-blue-300">Menuju {route.to}</p>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${selected?.latitude},${selected?.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="bg-navy-700 hover:bg-navy-600 p-2 rounded-xl transition-colors"
              aria-label="Buka di Google Maps"
              title="Buka di Google Maps"
            >
              <ExternalLink size={15} />
            </a>
            <button onClick={() => setRoute(null)} className="bg-yellow-500 hover:bg-yellow-400 text-navy-800 p-2 rounded-xl transition-colors" aria-label="Tutup rute">
              <X size={15} />
            </button>
          </div>
        )}

        {/* ── Bottom sheet detail ── */}
        {selected && (
          <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4">
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-2xl shadow-navy-900/25 border border-blue-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <img src={selected.photo} alt={selected.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div>
                    <h2 className="font-heading font-bold text-lg text-navy-800">{selected.name}</h2>
                    <p className="text-sm text-navy-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-navy-800">{selected.rating}</span>
                      <span>({selected.reviews})</span>
                      <span>·</span>
                      <span className={selected.is_open ? 'text-success font-semibold' : 'text-danger font-semibold'}>
                        {selected.is_open ? 'Buka' : 'Tutup'}
                      </span>
                    </p>
                    <p className="text-xs text-navy-500 mt-1">{selected.address}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-navy-500 hover:text-navy-800 p-1" aria-label="Tutup">
                  <X size={20} />
                </button>
              </div>

              {selected.promo && (
                <div className="mt-3 inline-block bg-yellow-500 text-navy-800 text-xs font-bold px-3 py-1.5 rounded-lg">
                  ✨ PROMO: {selected.promo}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <a
                  href={`https://wa.me/${selected.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-navy-800 font-heading font-bold py-3 rounded-xl transition-colors"
                >
                  <Phone size={18} /> Hubungi
                </a>
                <button
                  onClick={() => getRoute(selected)}
                  disabled={routing}
                  className="flex-1 flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-blue-50 font-heading font-bold py-3 rounded-xl transition-colors"
                >
                  {routing ? <Clock size={18} className="animate-pulse" /> : <Navigation size={18} />}
                  {routing ? 'Mencari rute…' : 'Rute ke Sini'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
