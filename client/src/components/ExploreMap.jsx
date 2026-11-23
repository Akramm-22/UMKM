import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Star, Navigation, X, LocateFixed, ExternalLink, List, AlertTriangle, Plus, Minus,
  ChevronLeft, ChevronRight, Layers, Tag, Radar,
} from 'lucide-react';
import FloatingHeader from './FloatingHeader.jsx';
import BusinessDetailPanel, { ROUTE_MODES, googleTravelMode } from './BusinessDetailPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { suspendedLocalIds } from '../lib/feedback.js';
import { approvedPlaces } from '../lib/verification.js';
import { toPlace } from '../lib/businessForm.js';
import { fetchRoute, fmtDistance, fmtDuration } from '../lib/routing.js';
import { openStatus, distanceKm, getFavorites } from '../lib/place.js';

const DEFAULT_CENTER = [-6.2, 106.816666]; // Jakarta — ganti sesuai wilayah pilot

const IMG = (id, w = 480) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

const CATEGORIES = {
  kuliner: { key: 'kuliner', label: 'Kuliner', emoji: '🍜', accent: '#F2771A' },
  jasa: { key: 'jasa', label: 'Jasa', emoji: '🔧', accent: '#4A90D9' },
  toko: { key: 'toko', label: 'Toko', emoji: '🛒', accent: '#2E9E6B' },
};

const LAYERS = {
  peta: {
    label: 'Peta',
    tiles: [{ url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }],
  },
  satelit: {
    label: 'Satelit',
    tiles: [
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Citra &copy; Esri, Maxar, Earthstar Geographics' },
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', attribution: '' },
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', attribution: '' },
    ],
  },
};

// pratinjau tile untuk tombol Lapisan, dihitung dari pusat pilot di zoom 15
const PREVIEW_TILE = (() => {
  const z = 15;
  const x = Math.floor(((DEFAULT_CENTER[1] + 180) / 360) * 2 ** z);
  const lat = (DEFAULT_CENTER[0] * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * 2 ** z);
  return {
    peta: `https://tiles.stadiamaps.com/tiles/alidade_smooth/${z}/${x}/${y}.png`,
    satelit: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  };
})();

// isian pemilik untuk mode demo — kolom tambahan muncul hanya jika pemilik mengisinya
const DEMO_DETAILS = {
  1: {
    description: 'Nasi uduk, nasi rames, dan lauk rumahan dimasak setiap pagi. Bisa pesan nasi kotak untuk acara.',
    open_hours: { mon: '06.00–14.00', tue: '06.00–14.00', wed: '06.00–14.00', thu: '06.00–14.00', fri: '06.00–11.30', sat: '06.00–14.00', sun: 'Tutup' },
    price_range: { min: 10000, max: 25000 },
    services: { dine_in: true, takeaway: true, delivery: false },
    instagram: 'instagram.com/warungbusiti',
    menu: [
      { name: 'Nasi Uduk Komplit', price: 15000, desc: 'Ayam goreng, telur balado, orek tempe' },
      { name: 'Nasi Rames', price: 13000, desc: 'Pilih 3 lauk rumahan' },
      { name: 'Nasi Kotak Acara', price: 25000, desc: 'Min. 20 kotak, pesan H-1' },
      { name: 'Es Teh Manis', price: 4000 },
    ],
  },
  2: {
    description: 'Permak celana, pasang resleting, dan jahit seragam sekolah. Bisa ditunggu untuk permak ringan.',
    open_hours: { mon: '08.00–17.00', tue: '08.00–17.00', wed: '08.00–17.00', thu: '08.00–17.00', fri: '08.00–11.30', sat: '08.00–15.00', sun: 'Tutup' },
    price_range: { min: 10000, max: 75000 },
    services: { pickup: true, delivery: false },
    menu: [
      { name: 'Permak Celana (potong)', price: 15000 },
      { name: 'Ganti Resleting', price: 20000 },
      { name: 'Jahit Seragam Sekolah', price: 75000, desc: 'Bahan dari pelanggan' },
    ],
  },
  3: {
    description: 'Sembako lengkap, gas 3 kg, galon isi ulang, dan token listrik.',
    open_hours: { mon: '07.00–21.00', tue: '07.00–21.00', wed: '07.00–21.00', thu: '07.00–21.00', fri: '07.00–21.00', sat: '07.00–21.00', sun: '09.00–18.00' },
    services: { pickup: true, delivery: true },
    menu: [
      { name: 'Beras Premium 5 kg', price: 72000 },
      { name: 'Gas LPG 3 kg', price: 22000 },
      { name: 'Galon Isi Ulang', price: 7000 },
    ],
  },
  4: {
    description: 'Sate ayam dan sate kambing bumbu kacang, lontong, dan tongseng. Ramai selepas maghrib.',
    open_hours: '16.00–23.00',
    price_range: { min: 20000, max: 50000 },
    services: { dine_in: true, takeaway: true, delivery: true },
    menu: [
      { name: 'Sate Ayam (10 tusuk)', price: 25000, desc: 'Bumbu kacang + lontong' },
      { name: 'Sate Kambing (10 tusuk)', price: 40000 },
      { name: 'Tongseng Kambing', price: 30000 },
    ],
  },
  5: {
    description: 'Kopi tubruk, kopi susu gula aren, dan gorengan hangat. Tersedia colokan dan wifi.',
    open_hours: '15.00–01.00',
    price_range: { min: 8000, max: 30000 },
    services: { dine_in: true, takeaway: true, delivery: false },
    instagram: 'instagram.com/kopikampungsenja',
    menu: [
      { name: 'Kopi Susu Gula Aren', price: 15000 },
      { name: 'Kopi Tubruk', price: 8000 },
      { name: 'Pisang Goreng (5 pcs)', price: 10000 },
    ],
  },
  6: {
    description: 'Cuci kering setrika kiloan, selesai 24 jam. Express 6 jam tersedia.',
    open_hours: '07.00–21.00',
    services: { pickup: true, delivery: true },
    menu: [
      { name: 'Cuci Setrika Reguler / kg', price: 7000, desc: 'Selesai 24 jam' },
      { name: 'Express 6 Jam / kg', price: 12000 },
      { name: 'Bed Cover', price: 25000 },
    ],
  },
};

const DEMO_BUSINESSES = [
  { id: 1, name: 'Warung Nasi Bu Siti', category: 'kuliner', latitude: -6.1985, longitude: 106.8125, rating: 4.8, reviews: 120, is_open: true, promo: 'Diskon 10% nasi uduk', phone: '6281234567890', address: 'Jl. Melati No. 3, RT.4/RW.2, Menteng, Jakarta Pusat', photo: IMG('photo-1512058564366-18510be2db19') },
  { id: 2, name: 'Jahit Cepat Pak Anto', category: 'jasa', latitude: -6.2032, longitude: 106.8188, rating: 4.6, reviews: 45, is_open: true, promo: null, phone: '6281298765432', address: 'Jl. Kenanga No. 11, RT.1/RW.5, Menteng, Jakarta Pusat', photo: IMG('photo-1558618666-fcd25c85cd64') },
  { id: 3, name: 'Toko Sembako Berkah', category: 'toko', latitude: -6.1968, longitude: 106.8209, rating: 4.7, reviews: 89, is_open: false, promo: null, phone: '6285612345678', address: 'Jl. Mawar No. 7, RT.3/RW.1, Menteng, Jakarta Pusat', photo: IMG('photo-1542838132-92c53300491e') },
  { id: 4, name: 'Sate Ayam Bang Jali', category: 'kuliner', latitude: -6.2041, longitude: 106.8121, rating: 4.9, reviews: 210, is_open: true, promo: 'Beli 10 gratis 2', phone: '6287811223344', address: 'Jl. Anggrek No. 21, RT.6/RW.3, Menteng, Jakarta Pusat', photo: IMG('photo-1529563021893-cc83c992d75d') },
  { id: 5, name: 'Kopi Kampung Senja', category: 'kuliner', latitude: -6.2008, longitude: 106.8171, rating: 4.7, reviews: 64, is_open: true, promo: null, phone: '6281377788899', address: 'Jl. Dahlia No. 2, RT.2/RW.4, Menteng, Jakarta Pusat', photo: IMG('photo-1509042239860-f550ce710b93') },
  { id: 6, name: 'Laundry Kilat 24', category: 'jasa', latitude: -6.1953, longitude: 106.8178, rating: 4.6, reviews: 45, is_open: true, promo: 'Gratis antar 1 km', phone: '6282144556677', address: 'Jl. Flamboyan No. 9, RT.5/RW.2, Menteng, Jakarta Pusat', photo: IMG('photo-1545173168-9f1947eebb7f') },
].map((b) => ({ ...b, ...DEMO_DETAILS[b.id] }));

const catOf = (key) => CATEGORIES[key] ?? { key, label: key ?? 'Usaha', emoji: '📍', accent: '#4A90D9' };

// pin ala Gojek: badan navy solid, emoji kategori, titik aksen; hati untuk favorit (design.md §6.2)
function makePinIcon(biz, selected, favorite) {
  const cat = catOf(biz.category);
  const size = selected ? 48 : 38;
  const ring = biz.promo ? 'box-shadow:0 0 0 3px #FFC914,0 5px 12px rgba(10,20,40,.35);' : 'box-shadow:0 5px 12px rgba(10,20,40,.35);';
  const badge = favorite
    ? `<div style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#E05252;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px">♥</div>`
    : `<div style="position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;background:${cat.accent};border:2px solid #fff"></div>`;
  const label = selected
    ? `<div style="position:absolute;left:50%;top:${size + 4}px;transform:translateX(-50%);white-space:nowrap;font:700 12px Inter,sans-serif;color:#0F1E3D;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff">${biz.name.replace(/[<>&]/g, '')}</div>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      <div style="width:100%;height:100%;background:#16294F;${ring}
        border:2.5px solid #fff;border-radius:50% 50% 50% 5px;transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);font-size:${size * 0.42}px">${cat.emoji}</span>
      </div>${badge}${label}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#4A90D9;border:3px solid #fff;border-radius:50%;
    box-shadow:0 0 0 7px rgba(74,144,217,.25),0 2px 6px rgba(15,30,61,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

// panel kiri menutupi ±25rem peta di desktop; geser fokus agar tujuan tidak tertutup
function MapFocus({ target, route, panelOpen }) {
  const map = useMap();
  useEffect(() => {
    const left = panelOpen && isDesktop() ? 440 : 40;
    const bottom = panelOpen && !isDesktop() ? Math.round(window.innerHeight * 0.6) : 40;
    if (route) {
      map.fitBounds(route.coords, { paddingTopLeft: [left, 80], paddingBottomRight: [80, bottom] });
    } else if (target) {
      const pt = map.project([target.latitude, target.longitude], 16).subtract([(left - 40) / 2, (bottom - 40) / 2]);
      map.flyTo(map.unproject(pt, 16), 16, { duration: 0.6 });
    }
  }, [target, route, panelOpen, map]);
  return null;
}

function MapControls({ onLocate }) {
  const map = useMap();
  const btn = 'w-10 h-10 flex items-center justify-center text-navy-700 hover:bg-blue-50 transition-colors';
  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-center gap-2">
      <button type="button" onClick={onLocate} className="w-10 h-10 rounded-lg bg-white shadow-lg shadow-navy-900/20 flex items-center justify-center text-info hover:bg-blue-50 transition-colors" aria-label="Lokasi saya" title="Lokasi saya">
        <LocateFixed size={19} />
      </button>
      <div className="bg-white rounded-lg shadow-lg shadow-navy-900/20 overflow-hidden flex flex-col divide-y divide-blue-200">
        <button type="button" onClick={() => map.zoomIn()} className={btn} aria-label="Perbesar" title="Perbesar"><Plus size={18} /></button>
        <button type="button" onClick={() => map.zoomOut()} className={btn} aria-label="Perkecil" title="Perkecil"><Minus size={18} /></button>
      </div>
    </div>
  );
}

function FlyToPoint({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo(point.pos, point.zoom ?? 16, { duration: 0.6 });
  }, [point, map]);
  return null;
}

function Stars({ value }) {
  return (
    <span className="inline-flex" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={11} className={n <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-blue-300 fill-blue-100'} />)}
    </span>
  );
}

// kartu hasil ala daftar Google Maps: teks kiri, foto kanan, tombol rute
function BusinessListItem({ biz, active, distance, onClick, onRoute }) {
  const st = openStatus(biz.open_hours, biz.is_open);
  const cat = catOf(biz.category);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`w-full text-left px-4 py-3.5 border-b border-blue-200 transition-colors cursor-pointer ${active ? 'bg-blue-100' : 'bg-white hover:bg-blue-50'}`}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-[15px] text-navy-800 truncate">{biz.name}</p>
          {biz.rating != null && (
            <p className="text-xs text-navy-500 flex items-center gap-1 mt-0.5">
              <span className="text-navy-800">{Number(biz.rating).toFixed(1).replace('.', ',')}</span>
              <Stars value={biz.rating} /> ({biz.reviews})
            </p>
          )}
          <p className="text-xs text-navy-500 mt-0.5 truncate">
            {cat.label}{distance != null ? ` · ${fmtDistance(distance)}` : ''}{biz.address ? ` · ${biz.address.split(',')[0]}` : ''}
          </p>
          {st && (
            <p className="text-xs mt-0.5">
              <span className={`font-semibold ${st.open ? (st.soon ? 'text-yellow-600' : 'text-success') : 'text-danger'}`}>{st.label}</span>
              {st.detail && <span className="text-navy-500"> · {st.detail}</span>}
            </p>
          )}
          {biz.promo && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-navy-800 bg-yellow-300/60 px-2 py-0.5 rounded-full">
              <Tag size={10} /> {biz.promo}
            </p>
          )}
        </div>
        {(biz.photo || biz.photo_url) && (
          <img src={biz.photo ?? biz.photo_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" loading="lazy" />
        )}
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRoute(biz); }}
        className="mt-2.5 inline-flex items-center gap-1.5 border border-blue-300 hover:bg-blue-100 text-info text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
      >
        <Navigation size={12} /> Petunjuk Arah
      </button>
    </div>
  );
}

export default function ExploreMap() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [businesses, setBusinesses] = useState(() => {
    const hidden = suspendedLocalIds();
    return [...DEMO_BUSINESSES, ...approvedPlaces()].filter((b) => !hidden.has(b.id));
  });
  const [demoMode, setDemoMode] = useState(true);
  const [filter, setFilter] = useState('semua');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [favorites, setFavorites] = useState(() => (user ? getFavorites(user.id) : []));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [dirIntent, setDirIntent] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [nearbyOf, setNearbyOf] = useState(null);
  const [flyPoint, setFlyPoint] = useState(null);
  const [layer, setLayer] = useState('peta');
  const [userPos, setUserPos] = useState(DEFAULT_CENTER);
  const [hasPreciseLocation, setHasPreciseLocation] = useState(false);
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeMode, setRouteMode] = useState('driving');
  const [routeError, setRouteError] = useState(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const routeCtrl = useRef(null);

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  const locate = useCallback((fly = false) => {
    if (!navigator.geolocation) {
      flash('Browser ini tidak mendukung lokasi. Rute memakai titik perkiraan.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setUserPos(pos);
        setHasPreciseLocation(true);
        if (fly) setFlyPoint({ pos, zoom: 16 });
      },
      (err) => {
        setHasPreciseLocation(false);
        if (fly) {
          flash(err.code === 1 ? 'Izin lokasi ditolak. Aktifkan di pengaturan browser agar rute akurat.' : 'Lokasi belum bisa dideteksi. Coba lagi di area terbuka.');
          setFlyPoint({ pos: DEFAULT_CENTER, zoom: 15 });
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => { locate(false); }, [locate]);

  useEffect(() => { setFavorites(user ? getFavorites(user.id) : []); }, [user]);

  useEffect(() => {
    axios
      .get('/api/businesses', { params: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], radius: 5 } })
      .then((res) => {
        if (res.data.length > 0) {
          setBusinesses(res.data.map(toPlace));
          setDemoMode(false);
        }
      })
      .catch(() => {});
  }, []);

  // tautan bagikan /explore?usaha=ID langsung membuka detail tempat
  useEffect(() => {
    const id = params.get('usaha');
    if (!id) return;
    const biz = businesses.find((b) => String(b.id) === id);
    if (biz) setSelected(biz);
  }, [params, businesses]);

  const select = (biz, { directions = false } = {}) => {
    setDirIntent(directions);
    setSelected(biz);
    setCollapsed(false);
    if (biz) setParams({ usaha: String(biz.id) }, { replace: true });
  };

  const closeDetail = () => {
    setSelected(null);
    setDirIntent(false);
    setParams({}, { replace: true });
  };

  const getRoute = useCallback(async (biz, mode) => {
    routeCtrl.current?.abort();
    const ctrl = new AbortController();
    routeCtrl.current = ctrl;
    setRouting(true);
    setRouteError(null);
    try {
      const r = await fetchRoute(userPos, [biz.latitude, biz.longitude], mode, { signal: ctrl.signal });
      if (!r) {
        setRoute(null);
        setRouteError({ bizId: biz.id, message: 'Rute tidak ditemukan untuk moda ini. Coba moda lain atau buka Google Maps.' });
        return;
      }
      setRoute({ ...r, to: biz.name, bizId: biz.id, dest: [biz.latitude, biz.longitude], mode });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setRoute(null);
      setRouteError({ bizId: biz.id, message: 'Layanan rute sedang tidak tersedia. Gunakan Google Maps sebagai cadangan.' });
    } finally {
      if (routeCtrl.current === ctrl) setRouting(false);
    }
  }, [userPos]);

  // ganti moda atau posisi GPS berubah → hitung ulang rute yang sedang aktif
  useEffect(() => {
    if (route && selected && route.bizId === selected.id) {
      getRoute(selected, routeMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMode, userPos]);

  const anchor = nearbyOf ? [nearbyOf.latitude, nearbyOf.longitude] : userPos;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return businesses
      .filter((b) => {
        if (filter !== 'semua' && b.category !== filter) return false;
        if (q && ![b.name, b.subcategory, b.address, b.description, catOf(b.category).label, ...(b.menu ?? []).map((m) => m.name)]
          .some((v) => v && String(v).toLowerCase().includes(q))) return false;
        if (onlyOpen && !openStatus(b.open_hours, b.is_open)?.open) return false;
        if (onlyPromo && !b.promo) return false;
        if (onlyFav && !favorites.includes(b.id)) return false;
        return !(nearbyOf && b.id === nearbyOf.id);
      })
      .map((b) => ({ biz: b, dist: distanceKm(anchor, [b.latitude, b.longitude]) }))
      .sort((a, b) => a.dist - b.dist);
  }, [businesses, filter, search, onlyOpen, onlyPromo, onlyFav, favorites, nearbyOf, anchor]);

  const showNearby = (biz) => {
    setNearbyOf(biz);
    setFilter('semua');
    setSearch('');
    closeDetail();
    setFlyPoint({ pos: [biz.latitude, biz.longitude], zoom: 16 });
    if (!isDesktop()) setMobileListOpen(true);
  };

  const chips = [
    { key: 'semua', label: 'Semua', active: filter === 'semua' && !onlyOpen && !onlyPromo && !onlyFav, onClick: () => { setFilter('semua'); setOnlyOpen(false); setOnlyPromo(false); setOnlyFav(false); } },
    ...Object.values(CATEGORIES).map((c) => ({ key: c.key, label: `${c.emoji} ${c.label}`, active: filter === c.key, onClick: () => setFilter((f) => (f === c.key ? 'semua' : c.key)) })),
    { key: 'open', label: '🕒 Buka sekarang', active: onlyOpen, onClick: () => setOnlyOpen((v) => !v) },
    { key: 'promo', label: '✨ Promo', active: onlyPromo, onClick: () => setOnlyPromo((v) => !v) },
    ...(user ? [{ key: 'fav', label: '♥ Favoritku', active: onlyFav, onClick: () => setOnlyFav((v) => !v) }] : []),
  ];

  const chipCls = (active) => `shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold shadow-md shadow-navy-900/10 transition-colors ${
    active ? 'bg-navy-800 text-blue-50' : 'bg-white text-navy-700 hover:bg-blue-50'
  }`;

  const resetFilters = () => { setFilter('semua'); setOnlyOpen(false); setOnlyPromo(false); setOnlyFav(false); setSearch(''); setNearbyOf(null); };

  const resultList = (onPick) => (
    <>
      {nearbyOf && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-100 border-b border-blue-200 text-sm">
          <Radar size={15} className="text-info shrink-0" />
          <span className="flex-1 min-w-0 truncate text-navy-700">Di sekitar <b>{nearbyOf.name}</b></span>
          <button type="button" onClick={() => setNearbyOf(null)} className="p-1 rounded-full hover:bg-blue-200 text-navy-500" aria-label="Hapus filter sekitar"><X size={14} /></button>
        </div>
      )}
      {visible.map(({ biz, dist }) => (
        <BusinessListItem
          key={biz.id}
          biz={biz}
          distance={dist}
          active={selected?.id === biz.id}
          onClick={() => onPick(biz)}
          onRoute={(b) => { onPick(b, true); getRoute(b, routeMode); }}
        />
      ))}
      {visible.length === 0 && (
        <div className="text-center px-6 py-10">
          <p className="text-sm text-navy-700">Tidak ada usaha yang cocok dengan pencarianmu.</p>
          <button type="button" onClick={resetFilters} className="mt-3 text-xs font-bold text-navy-700 border border-blue-300 hover:bg-blue-50 px-4 py-2 rounded-full transition-colors">Reset filter</button>
        </div>
      )}
    </>
  );

  const panelOpen = Boolean(selected) && !collapsed;
  const routeLabel = route ? ROUTE_MODES.find((m) => m.key === route.mode)?.label : '';

  return (
    <div className="relative h-screen w-full font-body flex overflow-hidden">
      <FloatingHeader
        label={user?.persona === 'konsumen' ? 'Personal Map' : 'Explore Map'}
        onBack={selected ? closeDetail : undefined}
      />

      {/* ── Kolom kiri desktop: daftar hasil ── */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-white border-r border-blue-200 pt-20 z-[1050] transition-[width] duration-200 overflow-hidden ${collapsed ? 'w-0 border-r-0' : 'w-[25rem]'}`}>
        <div className="px-4 pb-3 w-[25rem]">
          <div className="flex items-center gap-2 bg-white rounded-full shadow-md shadow-navy-900/10 border border-blue-200 px-4 py-2.5 focus-within:border-navy-600 transition-colors">
            <label htmlFor="list-search" className="sr-only">Cari usaha</label>
            <input
              id="list-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setNearbyOf(null); }}
              placeholder="Cari warung, jasa, menu…"
              className="w-full outline-none text-sm text-navy-800 placeholder:text-navy-500/60 bg-transparent"
            />
            {search ? (
              <button type="button" onClick={() => setSearch('')} className="text-navy-500 hover:text-navy-800" aria-label="Hapus pencarian"><X size={16} /></button>
            ) : <Search size={17} className="text-navy-500 shrink-0" aria-hidden="true" />}
          </div>
          <p className="text-xs text-navy-500 mt-3">
            {visible.length} hasil{nearbyOf ? '' : ' · diurutkan dari yang terdekat'}{demoMode ? ' · mode demo' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto border-t border-blue-200 w-[25rem]">
          {resultList((b, dir) => select(b, { directions: dir }))}
        </div>
      </aside>

      {/* ── Panel detail: kiri penuh di desktop, bottom sheet di HP ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-[1150] inset-x-0 bottom-0 h-[72vh] rounded-t-3xl overflow-hidden shadow-2xl shadow-navy-900/30 border-t border-blue-200
              md:inset-x-auto md:left-0 md:top-0 md:h-auto md:w-[25rem] md:rounded-none md:border-t-0 md:border-r md:shadow-xl md:transition-transform md:duration-200
              ${collapsed ? 'md:-translate-x-full' : ''}`}
          >
            <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-20 w-10 h-1.5 rounded-full bg-white/80 shadow" aria-hidden="true" />
            <BusinessDetailPanel
              biz={selected}
              category={catOf(selected.category)}
              userPos={userPos}
              hasPreciseLocation={hasPreciseLocation}
              local={demoMode}
              search={search}
              onSearch={setSearch}
              route={route}
              routing={routing}
              routeError={routeError}
              routeMode={routeMode}
              onRouteMode={setRouteMode}
              onRoute={(biz, mode) => getRoute(biz, mode ?? routeMode)}
              onClearRoute={() => setRoute(null)}
              onClose={closeDetail}
              onNearby={showNearby}
              onLocate={() => locate(true)}
              onFavoritesChange={() => user && setFavorites(getFavorites(user.id))}
              startInDirections={dirIntent}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* tombol ciutkan panel ala Google Maps */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-[1160] w-6 h-12 items-center justify-center bg-white border border-l-0 border-blue-200 rounded-r-lg shadow-md text-navy-600 hover:bg-blue-50 transition-[left] duration-200 ${collapsed ? 'left-0' : 'left-[25rem]'}`}
        aria-label={collapsed ? 'Tampilkan panel samping' : 'Ciutkan panel samping'}
        title={collapsed ? 'Tampilkan panel samping' : 'Ciutkan panel samping'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* ── Peta ── */}
      <div className="relative flex-1 min-w-0">
        {/* chip kategori melayang (desktop) */}
        <div className="hidden md:flex absolute top-4 left-10 right-44 z-[1060] gap-2 overflow-x-auto no-scrollbar pb-2" role="toolbar" aria-label="Filter peta">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={c.onClick} aria-pressed={c.active} className={chipCls(c.active)}>{c.label}</button>
          ))}
        </div>

        {/* pencarian + chip (HP) */}
        <div className="md:hidden absolute top-16 left-0 right-0 z-[1000] px-4 pt-2 space-y-2 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow-lg shadow-navy-800/15">
            <Search size={18} className="text-navy-500 shrink-0" aria-hidden="true" />
            <label htmlFor="mobile-search" className="sr-only">Cari usaha</label>
            <input
              id="mobile-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setNearbyOf(null); }}
              onFocus={() => setMobileListOpen(true)}
              placeholder="Cari warung, jasa, menu…"
              className="w-full outline-none text-sm text-navy-800 placeholder:text-navy-500/60 bg-transparent"
            />
            {search && <button type="button" onClick={() => setSearch('')} className="text-navy-500" aria-label="Hapus pencarian"><X size={16} /></button>}
          </div>
          <div className="pointer-events-auto flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {chips.map((c) => (
              <button key={c.key} type="button" onClick={c.onClick} aria-pressed={c.active} className={chipCls(c.active)}>{c.label}</button>
            ))}
          </div>
        </div>

        <MapContainer center={DEFAULT_CENTER} zoom={15} zoomControl={false} className="h-full w-full">
          {LAYERS[layer].tiles.map((t) => <TileLayer key={t.url} url={t.url} attribution={t.attribution} />)}
          {visible.map(({ biz }) => (
            <Marker
              key={biz.id}
              position={[biz.latitude, biz.longitude]}
              icon={makePinIcon(biz, selected?.id === biz.id, favorites.includes(biz.id))}
              eventHandlers={{ click: () => select(biz) }}
              title={biz.name}
              alt={biz.name}
              keyboard
            />
          ))}
          {selected && !visible.some((v) => v.biz.id === selected.id) && (
            <Marker position={[selected.latitude, selected.longitude]} icon={makePinIcon(selected, true, favorites.includes(selected.id))} title={selected.name} />
          )}
          <Marker position={userPos} icon={userIcon} title="Lokasi kamu" />
          {route && (
            <>
              <Polyline positions={route.coords} pathOptions={{ color: '#16294F', weight: 9, opacity: 0.8, lineCap: 'round' }} />
              <Polyline
                positions={route.coords}
                pathOptions={{ color: '#4A90D9', weight: 5.5, opacity: 1, lineCap: 'round', dashArray: route.mode === 'walking' ? '1 10' : null }}
              />
            </>
          )}
          <MapFocus target={selected} route={route?.bizId === selected?.id ? route : null} panelOpen={panelOpen} />
          <FlyToPoint point={flyPoint} />
          <MapControls onLocate={() => locate(true)} />
        </MapContainer>

        {/* tombol Lapisan */}
        <button
          type="button"
          onClick={() => setLayer((l) => (l === 'peta' ? 'satelit' : 'peta'))}
          className="absolute bottom-6 left-4 z-[1000] w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg shadow-navy-900/30 group"
          aria-label={`Ganti ke tampilan ${LAYERS[layer === 'peta' ? 'satelit' : 'peta'].label}`}
          title={`Tampilan ${LAYERS[layer === 'peta' ? 'satelit' : 'peta'].label}`}
        >
          <img src={PREVIEW_TILE[layer === 'peta' ? 'satelit' : 'peta']} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-navy-900/80 to-transparent text-white text-[10px] font-bold pt-3 pb-1">
            <Layers size={11} /> {LAYERS[layer === 'peta' ? 'satelit' : 'peta'].label}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileListOpen(true)}
          className="md:hidden absolute bottom-6 left-24 z-[1000] flex items-center gap-1.5 bg-white text-navy-800 text-sm font-semibold px-4 py-3 rounded-full shadow-lg shadow-navy-900/25"
        >
          <List size={16} /> Daftar ({visible.length})
        </button>

        {demoMode && (
          <div className="hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-navy-800/90 text-blue-50 text-xs font-medium px-3.5 py-1.5 rounded-full shadow">
            Mode demo — database belum tersambung
          </div>
        )}

        {/* ringkasan rute saat panel ditutup/diciutkan */}
        {route && !panelOpen && (
          <div className="absolute top-36 md:top-16 left-1/2 -translate-x-1/2 z-[1100] bg-white rounded-2xl shadow-xl shadow-navy-900/25 pl-4 pr-2 py-2.5 flex items-center gap-3 max-w-[calc(100%-2rem)]">
            <Navigation size={18} className="text-info shrink-0" />
            <div className="text-sm min-w-0">
              <p className="font-heading font-bold text-success leading-tight">{fmtDuration(route.min)} <span className="text-navy-500 font-normal">({fmtDistance(route.km)})</span></p>
              <p className="text-[11px] text-navy-500 truncate">{routeLabel} · ke {route.to}</p>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${route.dest[0]},${route.dest[1]}&travelmode=${googleTravelMode(route.mode)}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-full hover:bg-blue-100 text-navy-700 transition-colors"
              aria-label="Buka rute di Google Maps"
              title="Buka di Google Maps"
            >
              <ExternalLink size={16} />
            </a>
            <button type="button" onClick={() => setRoute(null)} className="p-2 rounded-full hover:bg-blue-100 text-navy-500 transition-colors" aria-label="Hapus rute">
              <X size={16} />
            </button>
          </div>
        )}

        {!hasPreciseLocation && (
          <div className="hidden md:flex absolute top-16 right-4 z-[1060] max-w-[16rem] items-start gap-2 bg-white rounded-xl shadow-lg shadow-navy-900/15 px-3 py-2.5 text-xs text-navy-700">
            <LocateFixed size={14} className="text-yellow-600 shrink-0 mt-0.5" />
            <span>Lokasi belum diizinkan — jarak & rute memakai titik perkiraan. <button type="button" onClick={() => locate(true)} className="font-bold text-info hover:underline">Izinkan</button></span>
          </div>
        )}

        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              role="status"
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1200] max-w-sm bg-navy-800 text-blue-50 text-sm px-4 py-3 rounded-xl shadow-xl flex items-start gap-2"
            >
              <AlertTriangle size={15} className="text-yellow-500 shrink-0 mt-0.5" /> {notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Daftar hasil (HP) ── */}
      <AnimatePresence>
        {mobileListOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden absolute inset-0 z-[1200] bg-navy-900/45"
            onClick={() => setMobileListOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[78vh] flex flex-col bg-white rounded-t-3xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-blue-200">
                <div>
                  <p className="font-heading font-bold text-sm text-navy-800">{visible.length} hasil terdekat</p>
                  {demoMode && <p className="text-[11px] text-navy-500">Mode demo — database belum tersambung</p>}
                </div>
                <button type="button" onClick={() => setMobileListOpen(false)} className="p-2 rounded-full hover:bg-blue-100 text-navy-500" aria-label="Tutup daftar usaha">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto">
                {resultList((b, dir) => { select(b, { directions: dir }); setMobileListOpen(false); })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
