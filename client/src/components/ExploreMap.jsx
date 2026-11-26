import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, ScaleControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Navigation, X, LocateFixed, List, AlertTriangle, ChevronLeft, ChevronRight, Tag, Radar, Search } from 'lucide-react';
import FloatingHeader from './FloatingHeader.jsx';
import BusinessDetailPanel, { googleTravelMode } from './BusinessDetailPanel.jsx';
import SmartSearchHints from './SmartSearchHints.jsx';
import SearchBox from './map/SearchBox.jsx';
import { BaseTiles, BusinessMarkers, RouteLayer, FitResults, CAT_STYLE } from './map/MapLayers.jsx';
import { MapControls, LayerPicker, RouteCard, NavigationOverlay, PlacePreview } from './map/MapUI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { suspendedLocalIds } from '../lib/feedback.js';
import { approvedPlaces } from '../lib/verification.js';
import { toPlace } from '../lib/businessForm.js';
import { DEMO_BUSINESSES } from '../lib/demoPlaces.js';
import { geocodeArea } from '../lib/geocode.js';
import { parseQuery, searchBusinesses, sortLabel } from '../../../shared/smartSearch.mjs';
import { fetchRoutes, fmtDistance } from '../lib/routing.js';
import { openStatus, distanceKm, getFavorites } from '../lib/place.js';

const DEFAULT_CENTER = [-6.2, 106.816666]; // Jakarta — ganti sesuai wilayah pilot

const CATEGORIES = {
  kuliner: { key: 'kuliner', ...CAT_STYLE.kuliner, accent: CAT_STYLE.kuliner.color },
  jasa: { key: 'jasa', ...CAT_STYLE.jasa, accent: CAT_STYLE.jasa.color },
  toko: { key: 'toko', ...CAT_STYLE.toko, accent: CAT_STYLE.toko.color },
};

const catOf = (key) => CATEGORIES[key] ?? { key, label: key ?? 'Usaha', emoji: '📍', accent: '#4A90D9' };

// titik biru pengguna dengan lingkar akurasi lembut
const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#2F7BD8;border:3px solid #fff;border-radius:50%;
    box-shadow:0 0 0 8px rgba(47,123,216,.2),0 2px 6px rgba(15,30,61,.35)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});
const areaIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#FFC914;border:3px solid #0F1E3D;border-radius:4px;transform:rotate(45deg)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

// panel kiri menutupi ±25rem peta di desktop; geser fokus agar tujuan tidak tertutup
function MapFocus({ target, route, panelOpen, sheetVh }) {
  const map = useMap();
  useEffect(() => {
    const left = panelOpen && isDesktop() ? 440 : 40;
    const bottom = panelOpen && !isDesktop() ? Math.round(window.innerHeight * (sheetVh / 100)) + 20 : 40;
    if (route) {
      map.flyToBounds(route.coords, { paddingTopLeft: [left, 90], paddingBottomRight: [70, bottom], duration: 0.6 });
    } else if (target) {
      const z = Math.max(map.getZoom(), 16);
      const pt = map.project([target.latitude, target.longitude], z).add([(40 - left) / 2, (bottom - 40) / 2]);
      map.flyTo(map.unproject(pt, z), z, { duration: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, route?.coords, panelOpen, map]);
  return null;
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
function BusinessListItem({ biz, active, distance, why, rank, onClick, onRoute, onHover }) {
  const st = openStatus(biz.open_hours, biz.is_open);
  const cat = catOf(biz.category);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => onHover(biz.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(biz.id)}
      onBlur={() => onHover(null)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`w-full text-left px-4 py-3.5 border-b border-blue-200 transition-colors cursor-pointer ${active ? 'bg-blue-100' : 'bg-white hover:bg-blue-50'}`}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-[15px] text-navy-800 truncate">
            {rank != null && <span className="text-navy-500 font-semibold mr-1">{rank}.</span>}{biz.name}
          </p>
          {biz.rating != null && (
            <p className="text-xs text-navy-500 flex items-center gap-1 mt-0.5">
              <span className="text-navy-800">{Number(biz.rating).toFixed(1).replace('.', ',')}</span>
              <Stars value={biz.rating} /> ({biz.reviews ?? 0})
            </p>
          )}
          <p className="text-xs text-navy-500 mt-0.5 truncate">
            {biz.subcategory ?? cat.label}{distance != null ? ` · ${fmtDistance(distance)}` : ''}{biz.address ? ` · ${biz.address.split(',')[0]}` : ''}
          </p>
          {st && (
            <p className="text-xs mt-0.5">
              <span className={`font-semibold ${st.open ? (st.soon ? 'text-yellow-600' : 'text-success') : 'text-danger'}`}>{st.label}</span>
              {st.detail && <span className="text-navy-500"> · {st.detail}</span>}
            </p>
          )}
          {why?.length > 0 && <p className="text-[11px] font-semibold text-success mt-0.5 truncate">✓ {why.join(' · ')}</p>}
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
  const restricted = user?.role !== 'admin';
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
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const [fitTrigger, setFitTrigger] = useState(() => (params.get('q') ? 1 : 0));
  const [area, setArea] = useState(null);
  const [areaState, setAreaState] = useState({});
  const [serverPool, setServerPool] = useState(null);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [dirIntent, setDirIntent] = useState(false);
  const [panelView, setPanelView] = useState('place');
  const [collapsed, setCollapsed] = useState(false);
  const [nearbyOf, setNearbyOf] = useState(null);
  const [flyPoint, setFlyPoint] = useState(null);
  const [layer, setLayer] = useState('standar');
  const [userPos, setUserPos] = useState(DEFAULT_CENTER);
  const [hasPreciseLocation, setHasPreciseLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeMode, setRouteMode] = useState('driving');
  const [routeError, setRouteError] = useState(null);
  const [focusStep, setFocusStep] = useState(null);
  const [navigating, setNavigating] = useState(false);
  const [navStep, setNavStep] = useState(0);
  const [mobileListOpen, setMobileListOpen] = useState(() => Boolean(params.get('q')) && !isDesktop());
  const [notice, setNotice] = useState(null);
  const routeCtrl = useRef(null);

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  const locate = useCallback((fly = false) => {
    if (!navigator.geolocation) {
      if (fly) flash('Browser ini tidak mendukung lokasi. Ketik area secara manual di kolom pencarian.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        setUserPos(pos);
        setHasPreciseLocation(true);
        setLocating(false);
        if (fly) setFlyPoint({ pos, zoom: 16 });
      },
      (err) => {
        setHasPreciseLocation(false);
        setLocating(false);
        if (fly) {
          flash(err.code === 1 ? 'Izin lokasi ditolak. Aktifkan di pengaturan browser, atau ketik area secara manual.' : 'Lokasi belum bisa dideteksi. Coba lagi di area terbuka.');
          setFlyPoint({ pos: DEFAULT_CENTER, zoom: 15 });
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => { locate(false); }, [locate]);

  useEffect(() => { setFavorites(user ? getFavorites(user.id) : []); }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('pl_token');
    // admin boleh memuat seluruh usaha sekitar; role lain hanya lewat pencarian
    if (user?.role === 'admin' && token) {
      axios
        .get('/api/businesses', { params: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1], radius: 5 }, headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (res.data.length > 0) {
            setBusinesses(res.data.map(toPlace));
            setDemoMode(false);
          }
        })
        .catch(() => {});
      return;
    }
    axios
      .get('/api/health')
      .then((res) => {
        if (res.data?.status === 'ok') {
          setBusinesses([]);
          setDemoMode(false);
        }
      })
      .catch(() => {});
  }, [user?.role]);

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
    setPreview(null);
    setCollapsed(false);
    if (biz) setParams((p) => { const n = new URLSearchParams(p); n.set('usaha', String(biz.id)); return n; }, { replace: true });
  };

  const closeDetail = () => {
    setSelected(null);
    setDirIntent(false);
    setPanelView('place');
    setParams((p) => { const n = new URLSearchParams(p); n.delete('usaha'); return n; }, { replace: true });
  };

  // HP: ketuk pin → kartu ringkas dulu (seperti Google Maps); desktop langsung panel detail
  const onMarker = (biz) => {
    if (isDesktop()) select(biz);
    else { setPreview(biz); setSelected(null); }
  };

  const getRoute = useCallback(async (biz, mode) => {
    routeCtrl.current?.abort();
    const ctrl = new AbortController();
    routeCtrl.current = ctrl;
    setRouting(true);
    setRouteError(null);
    setFocusStep(null);
    try {
      const routes = await fetchRoutes(userPos, [biz.latitude, biz.longitude], mode, { signal: ctrl.signal });
      if (!routes) {
        setRoute(null);
        setRouteError({ bizId: biz.id, message: 'Rute tidak ditemukan untuk moda ini. Coba moda lain atau buka Google Maps.' });
        return;
      }
      setRoute({ ...routes[0], routes, active: 0, to: biz.name, bizId: biz.id, dest: [biz.latitude, biz.longitude], mode });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setRoute(null);
      setRouteError({ bizId: biz.id, message: 'Layanan rute sedang tidak tersedia. Gunakan Google Maps sebagai cadangan.' });
    } finally {
      if (routeCtrl.current === ctrl) setRouting(false);
    }
  }, [userPos]);

  const pickAlt = (i) => setRoute((r) => (r ? { ...r, ...r.routes[i], active: i } : r));
  const clearRoute = () => { setRoute(null); setNavigating(false); setFocusStep(null); };

  // ganti moda → hitung ulang rute yang sedang aktif (posisi GPS saat navigasi tidak memicu hitung ulang)
  useEffect(() => {
    if (route && selected && route.bizId === selected.id && !navigating) getRoute(selected, routeMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMode]);

  // ── navigasi langkah demi langkah ──
  const startNav = () => {
    if (!route) return;
    setNavigating(true);
    setNavStep(0);
    setPreview(null);
    setMobileListOpen(false);
    setCollapsed(true);
    setFlyPoint({ pos: route.steps[0]?.at ?? route.coords[0], zoom: 17 });
  };
  const exitNav = () => { setNavigating(false); setCollapsed(false); if (route) setFlyPoint(null); };
  const goStep = (i) => {
    if (!route) return;
    const n = Math.max(0, Math.min(route.steps.length - 1, i));
    setNavStep(n);
    setFlyPoint({ pos: route.steps[n].at, zoom: 17 });
  };

  useEffect(() => {
    if (!navigating || !hasPreciseLocation || !navigator.geolocation) return undefined;
    const id = navigator.geolocation.watchPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [navigating, hasPreciseLocation]);

  // GPS: lanjut otomatis ke manuver berikutnya bila sudah dalam 30 m
  useEffect(() => {
    if (!navigating || !hasPreciseLocation || !route) return;
    const cur = route.steps[navStep];
    if (cur && navStep < route.steps.length - 1 && distanceKm(userPos, cur.at) < 0.03) {
      setNavStep(navStep + 1);
      setFlyPoint({ pos: route.steps[navStep + 1].at, zoom: 17 });
    }
  }, [userPos, navigating, hasPreciseLocation, route, navStep]);

  // ── Smart Search ──
  const parsed = useMemo(() => parseQuery(search), [search]);
  const searchOrigin = area?.pos ?? userPos;
  const anchor = nearbyOf ? [nearbyOf.latitude, nearbyOf.longitude] : searchOrigin;
  const q = search.trim();
  const sortedBy = q ? sortLabel(parsed) : 'jarak terdekat';

  // "toko sembako di kemang": area yang tidak cocok dengan alamat usaha dijadikan titik acuan jarak
  useEffect(() => {
    const text = parsed.area;
    if (!text) {
      setArea((a) => (a?.source === 'query' ? null : a));
      setAreaState({});
      return undefined;
    }
    if (businesses.some((b) => String(b.address ?? '').toLowerCase().includes(text.toLowerCase()))) return undefined;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setAreaState({ loading: true });
      try {
        const hit = await geocodeArea(text, { signal: ctrl.signal });
        if (hit) {
          setArea({ ...hit, source: 'query' });
          setAreaState({});
          setFitTrigger((n) => n + 1);
        } else setAreaState({ error: `Area "${text}" tidak ditemukan — jarak memakai lokasimu.` });
      } catch (err) {
        if (err.name !== 'AbortError') setAreaState({ error: 'Gagal mencari area. Coba lagi.' });
      }
    }, 600);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [parsed.area, businesses]);

  const applyManualArea = async (text) => {
    setAreaState({ loading: true });
    try {
      const hit = await geocodeArea(text);
      if (!hit) { setAreaState({ error: `Area "${text}" tidak ditemukan.` }); return; }
      setArea({ ...hit, source: 'manual' });
      setAreaState({});
      setFitTrigger((n) => n + 1);
    } catch {
      setAreaState({ error: 'Gagal mencari area. Coba lagi.' });
    }
  };

  // database sebagai sumber utama; mode demo memakai data lokal dengan mesin yang sama
  useEffect(() => {
    if (demoMode || !q) { setServerPool(null); return undefined; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      axios
        .get('/api/businesses/search', { params: { q, lat: searchOrigin[0], lng: searchOrigin[1] }, signal: ctrl.signal })
        .then((res) => setServerPool({ q, items: res.data.results.map(toPlace) }))
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, demoMode, searchOrigin[0], searchOrigin[1]]);

  const visible = useMemo(() => {
    // selain admin: peta kosong sampai pengguna mencari atau memilih lokasi
    if (restricted && !q && !nearbyOf) return [];
    const pool = q && serverPool?.q === q ? serverPool.items : businesses;
    const base = pool.filter((b) => {
      if (filter !== 'semua' && b.category !== filter) return false;
      if (onlyOpen && !openStatus(b.open_hours, b.is_open)?.open) return false;
      if (onlyPromo && !b.promo) return false;
      if (onlyFav && !favorites.includes(b.id)) return false;
      return !(nearbyOf && b.id === nearbyOf.id);
    });
    if (q) return searchBusinesses(base, parsed, anchor).results.map((r) => ({ biz: r.biz, dist: r.dist, why: r.why }));
    return base
      .map((b) => ({ biz: b, dist: distanceKm(anchor, [b.latitude, b.longitude]) }))
      .sort((a, b) => a.dist - b.dist);
  }, [restricted, businesses, serverPool, q, parsed, filter, onlyOpen, onlyPromo, onlyFav, favorites, nearbyOf, anchor]);

  const filtering = Boolean(q) || filter !== 'semua' || onlyOpen || onlyPromo || onlyFav || Boolean(nearbyOf);
  const resultPoints = useMemo(() => visible.slice(0, 20).map((v) => [v.biz.latitude, v.biz.longitude]), [visible]);

  const submitSearch = (text) => {
    setSearch(text);
    setNearbyOf(null);
    setPreview(null);
    if (!text.trim()) return;
    const p = parseQuery(text);
    if ((p.flags.near || sortLabel(p) === 'jarak terdekat') && !hasPreciseLocation && !area) locate(false);
    setFitTrigger((n) => n + 1);
    if (!isDesktop()) setMobileListOpen(true);
    setParams((prev) => { const n = new URLSearchParams(prev); n.set('q', text); n.delete('usaha'); return n; }, { replace: true });
  };

  const pickPlace = (biz) => {
    setSearch(biz.name);
    setMobileListOpen(false);
    select(biz);
  };

  const originLabel = nearbyOf ? `dari ${nearbyOf.name}` : area ? `dari ${area.label}` : hasPreciseLocation ? 'dari lokasimu' : 'dari titik perkiraan';
  const needsLocation = Boolean(q) && sortedBy === 'jarak terdekat' && !hasPreciseLocation && !area && !nearbyOf;

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
    restricted && !q && !nearbyOf ? (
      <div className="px-6 py-10 text-center">
        <span className="mx-auto w-12 h-12 rounded-2xl bg-blue-100 text-navy-600 flex items-center justify-center"><Search size={22} /></span>
        <p className="text-sm font-bold text-navy-800 mt-3">Cari usaha untuk menampilkannya di peta</p>
        <p className="text-xs text-navy-500 mt-1">Ketik nama usaha, jenis, atau area — lokasi yang kamu pilih akan muncul di peta.</p>
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {['warung terdekat', 'kopi', 'laundry', 'toko sembako'].map((s) => (
            <button key={s} type="button" onClick={() => submitSearch(s)} className="text-xs font-semibold text-navy-700 bg-blue-50 ring-1 ring-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors">{s}</button>
          ))}
        </div>
      </div>
    ) : (
    <>
      {!nearbyOf && (
        <SmartSearchHints
          search={search}
          parsed={parsed}
          sortedBy={sortedBy}
          originLabel={originLabel}
          needsLocation={needsLocation}
          area={area}
          areaState={areaState}
          onLocate={() => locate(true)}
          onArea={applyManualArea}
          onClearArea={() => { setArea(null); setAreaState({}); }}
        />
      )}
      {nearbyOf && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-100 border-b border-blue-200 text-sm">
          <Radar size={15} className="text-info shrink-0" />
          <span className="flex-1 min-w-0 truncate text-navy-700">Di sekitar <b>{nearbyOf.name}</b></span>
          <button type="button" onClick={() => setNearbyOf(null)} className="p-1 rounded-full hover:bg-blue-200 text-navy-500" aria-label="Hapus filter sekitar"><X size={14} /></button>
        </div>
      )}
      {visible.map(({ biz, dist, why }, i) => (
        <BusinessListItem
          key={biz.id}
          biz={biz}
          distance={dist}
          why={why}
          rank={q ? i + 1 : null}
          active={selected?.id === biz.id}
          onHover={setHoveredId}
          onClick={() => onPick(biz)}
          onRoute={(b) => { onPick(b, true); getRoute(b, routeMode); }}
        />
      ))}
      {visible.length === 0 && (
        <div className="text-center px-6 py-10">
          <p className="text-sm text-navy-700">Tidak ada usaha yang cocok dengan pencarianmu.</p>
          <p className="text-xs text-navy-500 mt-1">Coba kata lain, perluas area, atau hapus filter.</p>
          <button type="button" onClick={resetFilters} className="mt-3 text-xs font-bold text-navy-700 border border-blue-300 hover:bg-blue-50 px-4 py-2 rounded-full transition-colors">Reset pencarian</button>
        </div>
      )}
    </>
    )
  );

  const panelOpen = Boolean(selected) && !collapsed && !navigating;
  const sheetVh = panelView === 'directions' ? 50 : 72;
  const gmapsUrl = route ? `https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${route.dest[0]},${route.dest[1]}&travelmode=${googleTravelMode(route.mode)}` : '#';
  const showRouteCard = route && !navigating && !routing && (!selected || collapsed || (!isDesktop() && !panelOpen));
  const resultCount = restricted && !q && !nearbyOf ? 'Belum ada pencarian' : `${visible.length} hasil · urut ${nearbyOf ? `jarak ${originLabel}` : sortedBy}`;

  const searchBox = (variant) => (
    <SearchBox
      value={search}
      onChange={(v) => { setSearch(v); setNearbyOf(null); }}
      onSubmit={submitSearch}
      onPickPlace={pickPlace}
      pool={q && serverPool?.q === q ? serverPool.items : businesses}
      origin={searchOrigin}
      variant={variant}
      placeholder="Coba: warung terdekat, kuliner murah…"
    />
  );

  return (
    <div className="relative h-screen w-full font-body flex overflow-hidden">
      {!navigating && (
        <FloatingHeader
          label={user?.persona === 'konsumen' ? 'Personal Map' : 'Explore Map'}
          onBack={selected ? closeDetail : undefined}
        />
      )}

      {/* ── Kolom kiri desktop: pencarian + daftar hasil ── */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-white border-r border-blue-200 pt-20 z-[1050] transition-[width] duration-200 overflow-hidden ${collapsed ? 'w-0 border-r-0' : 'w-[25rem]'}`}>
        <div className="px-4 pb-3 w-[25rem]">
          {searchBox('panel')}
          <p className="text-xs text-navy-500 mt-3">{resultCount}{demoMode ? ' · mode demo' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto border-t border-blue-200 w-[25rem]">
          {resultList((b, dir) => select(b, { directions: dir }))}
        </div>
      </aside>

      {/* ── Panel detail: kiri penuh di desktop, bottom sheet di HP ── */}
      <AnimatePresence>
        {selected && !navigating && (
          <motion.div
            key="panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ '--sheet-h': `${sheetVh}vh` }}
            className={`absolute z-[1150] inset-x-0 bottom-0 h-[var(--sheet-h)] rounded-t-3xl overflow-hidden shadow-2xl shadow-navy-900/30 border-t border-blue-200 transition-[height] duration-300
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
              onClearRoute={clearRoute}
              onPickAlt={pickAlt}
              onStartNav={startNav}
              focusStep={focusStep}
              onFocusStep={(i) => { setFocusStep(i); if (route?.steps[i]) setFlyPoint({ pos: route.steps[i].at, zoom: 17 }); }}
              onViewChange={setPanelView}
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
      {!navigating && (
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-[1160] w-6 h-12 items-center justify-center bg-white border border-l-0 border-blue-200 rounded-r-lg shadow-md text-navy-600 hover:bg-blue-50 transition-[left] duration-200 ${collapsed ? 'left-0' : 'left-[25rem]'}`}
          aria-label={collapsed ? 'Tampilkan panel samping' : 'Ciutkan panel samping'}
          title={collapsed ? 'Tampilkan panel samping' : 'Ciutkan panel samping'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}

      {/* ── Peta ── */}
      <div className="relative flex-1 min-w-0">
        {!navigating && (
          <>
            {/* chip kategori melayang (desktop) */}
            <div className="hidden md:flex absolute top-4 left-10 right-44 z-[1060] gap-2 overflow-x-auto no-scrollbar pb-2" role="toolbar" aria-label="Filter peta">
              {chips.map((c) => (
                <button key={c.key} type="button" onClick={c.onClick} aria-pressed={c.active} className={chipCls(c.active)}>{c.label}</button>
              ))}
            </div>

            {/* pencarian + chip (HP) */}
            <div className="md:hidden absolute top-16 left-0 right-0 z-[1000] px-4 pt-2 space-y-2 pointer-events-none">
              <div className="pointer-events-auto">{searchBox('floating')}</div>
              <div className="pointer-events-auto flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {chips.map((c) => (
                  <button key={c.key} type="button" onClick={c.onClick} aria-pressed={c.active} className={chipCls(c.active)}>{c.label}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <MapContainer center={DEFAULT_CENTER} zoom={15} zoomControl={false} className="h-full w-full" zoomSnap={0.5} wheelPxPerZoomLevel={90}>
          <BaseTiles layer={layer} />
          <BusinessMarkers
            items={visible}
            context={filtering && !restricted ? businesses : []}
            selectedId={selected?.id ?? preview?.id}
            hoveredId={hoveredId}
            favorites={favorites}
            onSelect={onMarker}
            onHover={setHoveredId}
          />
          {selected && !visible.some((v) => v.biz.id === selected.id) && (
            <BusinessMarkers items={[{ biz: selected }]} context={[]} selectedId={selected.id} hoveredId={null} favorites={favorites} onSelect={() => {}} onHover={() => {}} />
          )}
          <RouteLayer route={route} origin={userPos} onPickAlt={pickAlt} focusStep={navigating ? navStep : focusStep} onStep={(i) => (navigating ? goStep(i) : setFocusStep(i))} />
          {area && <Marker position={area.pos} icon={areaIcon} title={`Titik acuan: ${area.label}`} />}
          <Marker position={userPos} icon={userIcon} title={hasPreciseLocation ? 'Lokasi kamu' : 'Titik perkiraan (lokasi belum diizinkan)'} zIndexOffset={1200} />
          {!navigating && <MapFocus target={selected} route={route?.bizId === selected?.id ? route : null} panelOpen={panelOpen} sheetVh={sheetVh} />}
          <FlyToPoint point={flyPoint} />
          <FitResults
            trigger={fitTrigger}
            points={area ? [...resultPoints, area.pos] : resultPoints}
            padding={{ paddingTopLeft: [isDesktop() && !collapsed ? 40 : 30, isDesktop() ? 80 : 170], paddingBottomRight: [70, 60] }}
          />
          <ScaleControl position="bottomright" imperial={false} />
          {!navigating && (
            <MapControls
              onLocate={() => locate(true)}
              locating={locating}
              following={hasPreciseLocation}
              canFit={filtering && visible.length > 0}
              onFitResults={() => setFitTrigger((n) => n + 1)}
            />
          )}
        </MapContainer>

        {!navigating && <LayerPicker layer={layer} onChange={setLayer} />}

        {!navigating && (
          <button
            type="button"
            onClick={() => setMobileListOpen(true)}
            className="md:hidden absolute bottom-6 left-24 z-[1000] flex items-center gap-1.5 bg-white text-navy-800 text-sm font-semibold px-4 py-3 rounded-full shadow-lg shadow-navy-900/25"
          >
            <List size={16} /> Daftar ({visible.length})
          </button>
        )}

        {demoMode && !navigating && !route && (
          <div className="hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-navy-800/90 text-blue-50 text-xs font-medium px-3.5 py-1.5 rounded-full shadow">
            Mode demo — database belum tersambung
          </div>
        )}

        {/* ringkasan rute saat panel ditutup/diciutkan */}
        <AnimatePresence>
          {showRouteCard && (
            <div className="absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[1100]">
              <RouteCard route={route} onPickAlt={pickAlt} onStart={startNav} onClose={clearRoute} gmapsUrl={gmapsUrl} />
            </div>
          )}
        </AnimatePresence>

        {navigating && route && (
          <NavigationOverlay route={route} step={navStep} onStep={goStep} onExit={exitNav} userPos={userPos} precise={hasPreciseLocation} gmapsUrl={gmapsUrl} />
        )}

        <AnimatePresence>
          {preview && !selected && !navigating && (
            <PlacePreview
              key={preview.id}
              biz={preview}
              dist={distanceKm(userPos, [preview.latitude, preview.longitude])}
              category={catOf(preview.category)}
              onDetail={() => select(preview)}
              onRoute={() => { select(preview, { directions: true }); getRoute(preview, routeMode); }}
              onClose={() => setPreview(null)}
            />
          )}
        </AnimatePresence>

        {!hasPreciseLocation && !navigating && (
          <div className="hidden md:flex absolute top-16 right-4 z-[1060] max-w-[16rem] items-start gap-2 bg-white rounded-xl shadow-lg shadow-navy-900/15 px-3 py-2.5 text-xs text-navy-700">
            <LocateFixed size={14} className="text-yellow-600 shrink-0 mt-0.5" />
            <span>Lokasi belum diizinkan — jarak & rute memakai titik perkiraan. <button type="button" onClick={() => locate(true)} className="font-bold text-info hover:underline">Izinkan</button> atau ketik area di pencarian.</span>
          </div>
        )}

        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              role="status"
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1300] max-w-sm bg-navy-800 text-blue-50 text-sm px-4 py-3 rounded-xl shadow-xl flex items-start gap-2"
            >
              <AlertTriangle size={15} className="text-yellow-500 shrink-0 mt-0.5" /> {notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Daftar hasil (HP) ── */}
      <AnimatePresence>
        {mobileListOpen && !navigating && (
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
              <div className="px-4 pt-3 pb-3 border-b border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading font-bold text-sm text-navy-800">{resultCount}</p>
                    {demoMode && <p className="text-[11px] text-navy-500">Mode demo — database belum tersambung</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { setMobileListOpen(false); setFitTrigger((n) => n + 1); }} className="text-xs font-bold text-info px-2.5 py-1.5 rounded-full hover:bg-blue-100">Lihat di peta</button>
                    <button type="button" onClick={() => setMobileListOpen(false)} className="p-2 rounded-full hover:bg-blue-100 text-navy-500" aria-label="Tutup daftar usaha">
                      <X size={18} />
                    </button>
                  </div>
                </div>
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
