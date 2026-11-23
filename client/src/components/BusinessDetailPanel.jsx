import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Star, Phone, Navigation, Clock, MapPin, Search, ArrowLeft, Bookmark, Radar, Send, Share2,
  MessageCircle, Check, ChevronDown, ChevronRight, Copy, Globe, BookOpen, Wallet, BadgeCheck,
  Flag, Car, Bike, Motorbike, Footprints, CircleAlert, LocateFixed, ExternalLink, CornerUpLeft, CornerUpRight,
  ArrowUp, RotateCcw, Tag, Info, UtensilsCrossed, ShoppingBag, Truck, Store, LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { REPORT_REASONS, fetchReviews, submitReview, submitReport, hasOpenLocalReport } from '../lib/feedback.js';
import { fetchRoute, fmtDistance, fmtDuration, arrivalTime } from '../lib/routing.js';
import { weeklyHours, openStatus, todayKey, distanceKm, getFavorites, toggleFavorite, formatRupiah } from '../lib/place.js';
import { PAYMENT_OPTIONS, AMENITY_OPTIONS, labelOf } from '../lib/businessForm.js';

export const ROUTE_MODES = [
  { key: 'driving', label: 'Mobil', icon: Car },
  { key: 'motorcycle', label: 'Motor', icon: Motorbike },
  { key: 'cycling', label: 'Sepeda', icon: Bike },
  { key: 'walking', label: 'Jalan kaki', icon: Footprints },
];

export const googleTravelMode = (mode) => (mode === 'walking' ? 'walking' : mode === 'cycling' ? 'bicycling' : mode === 'motorcycle' ? 'two-wheeler' : 'driving');

const SERVICE_LABELS = [
  { key: 'dine_in', label: 'Makan di tempat', icon: UtensilsCrossed },
  { key: 'takeaway', label: 'Bawa pulang', icon: ShoppingBag },
  { key: 'delivery', label: 'Pesan antar', icon: Truck },
  { key: 'pickup', label: 'Ambil di tempat', icon: Store },
];

const fmtDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

function Stars({ value, size = 13, onPick }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onPick ? 'radiogroup' : 'img'} aria-label={onPick ? 'Pilih rating' : `Rating ${Number(value).toFixed(1)} dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star size={size} className={n <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-blue-300 fill-blue-100'} />;
        return onPick ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} bintang`} onClick={() => onPick(n)} className="p-1 rounded-md hover:bg-yellow-500/10 transition-colors">
            {icon}
          </button>
        ) : <span key={n}>{icon}</span>;
      })}
    </span>
  );
}

// baris info ala Google Maps: ikon · isi · aksi kanan opsional
function Row({ icon: Icon, children, onClick, href, action, actionLabel, onAction, tone }) {
  const body = (
    <>
      <Icon size={20} className={`shrink-0 ${tone ?? 'text-info'}`} />
      <div className="min-w-0 flex-1 text-sm text-navy-800 leading-snug">{children}</div>
    </>
  );
  const cls = 'flex items-center gap-5 px-6 py-3 text-left w-full hover:bg-blue-50 transition-colors';
  return (
    <div className="group relative flex items-center">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>{body}</a>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cls}>{body}</button>
      ) : (
        <div className={cls}>{body}</div>
      )}
      {action && (
        <button type="button" onClick={onAction} aria-label={actionLabel} title={actionLabel} className="absolute right-3 p-2 rounded-full text-navy-500 hover:bg-blue-100 hover:text-navy-800 transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}

function RoundAction({ icon: Icon, label, onClick, href, active, primary }) {
  const circle = `w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
    primary ? 'bg-navy-800 text-yellow-500 group-hover:bg-navy-700'
      : active ? 'bg-navy-800 text-blue-50' : 'bg-blue-100 text-navy-700 group-hover:bg-blue-200'
  }`;
  const inner = (
    <>
      <span className={circle}><Icon size={18} className={active && !primary ? 'fill-current' : ''} /></span>
      <span className="text-[11px] font-semibold text-navy-700 text-center leading-tight">{label}</span>
    </>
  );
  const cls = 'group flex flex-col items-center gap-1.5 w-16 py-1 rounded-xl';
  return href
    ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
    : <button type="button" onClick={onClick} aria-pressed={active} className={cls}>{inner}</button>;
}

function LoginGate({ text }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
      <p className="text-sm text-navy-700">{text}</p>
      <Link to="/login" className="mt-3 inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-navy-800 text-xs font-heading font-bold px-4 py-2.5 rounded-xl transition-colors">
        <LogIn size={14} /> Masuk dulu yuk
      </Link>
    </div>
  );
}

const stepIcon = (s) => {
  if (s.type === 'arrive') return MapPin;
  if (s.modifier === 'uturn') return RotateCcw;
  if (s.modifier?.includes('left')) return CornerUpLeft;
  if (s.modifier?.includes('right')) return CornerUpRight;
  return ArrowUp;
};

export default function BusinessDetailPanel({
  biz, category, userPos, hasPreciseLocation, local, search, onSearch,
  route, routing, routeError, routeMode, onRouteMode, onRoute, onClearRoute, onClose, onNearby, onLocate,
  onFavoritesChange, startInDirections = false, onPickAlt, onStartNav, focusStep, onFocusStep, onViewChange,
}) {
  const { user } = useAuth();
  const [view, setView] = useState(startInDirections ? 'directions' : 'place');
  const [tab, setTab] = useState('ringkasan');
  const [hoursOpen, setHoursOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const [saved, setSaved] = useState(false);
  const [estimates, setEstimates] = useState({});
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [form, setForm] = useState({ rating: 0, comment: '' });
  const [reviewState, setReviewState] = useState({ sending: false, error: '', done: false });
  const [report, setReport] = useState({ reason: '', detail: '' });
  const [reportState, setReportState] = useState({ sending: false, error: '', done: false });

  const canFeedback = user && user.role !== 'admin';
  const routeForThis = route && route.bizId === biz.id;

  useEffect(() => {
    let alive = true;
    setView(startInDirections ? 'directions' : 'place');
    setTab('ringkasan');
    setHoursOpen(false);
    setStepsOpen(true);
    setEstimates({});
    setForm({ rating: 0, comment: '' });
    setReviewState({ sending: false, error: '', done: false });
    setReport({ reason: '', detail: '' });
    setReportState({ sending: false, error: '', done: user ? hasOpenLocalReport(biz.id, user.id) : false });
    setSaved(user ? getFavorites(user.id).includes(biz.id) : false);
    setLoadingReviews(true);
    fetchReviews(biz, { local }).then((list) => {
      if (!alive) return;
      setReviews(list);
      setLoadingReviews(false);
    });
    return () => { alive = false; };
  }, [biz, local, user, startInDirections]);

  // estimasi waktu per moda untuk ikon di tampilan petunjuk arah, seperti Google Maps
  useEffect(() => {
    if (view !== 'directions') return undefined;
    const ctrl = new AbortController();
    const to = [biz.latitude, biz.longitude];
    ['driving', 'cycling', 'walking'].forEach((mode) => {
      fetchRoute(userPos, to, mode, { signal: ctrl.signal })
        .then((r) => r && setEstimates((e) => ({ ...e, [mode]: r.min, ...(mode === 'driving' ? { motorcycle: r.min } : {}) })))
        .catch(() => {});
    });
    return () => ctrl.abort();
  }, [view, biz, userPos]);

  useEffect(() => { onViewChange?.(view); }, [view, onViewChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (view !== 'place') setView('place');
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, view]);

  const flash = (text, link) => {
    setToast({ text, link });
    setTimeout(() => setToast(null), 2600);
  };

  const baseCount = Number(biz.reviews) || 0;
  const baseRating = Number(biz.rating) || 0;
  const totalCount = baseCount + reviews.length;
  const avg = totalCount ? (baseRating * baseCount + reviews.reduce((s, r) => s + r.rating, 0)) / totalCount : 0;
  const myReview = user ? reviews.find((r) => r.user_id === user.id) : null;

  const week = weeklyHours(biz.open_hours);
  const status = openStatus(biz.open_hours, biz.is_open);
  const today = todayKey();
  const phone = biz.phone ? String(biz.phone).replace(/\D/g, '').replace(/^0/, '62') : null;
  const phoneDisplay = phone ? `0${phone.replace(/^62/, '')}`.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3') : null;
  const straight = distanceKm(userPos, [biz.latitude, biz.longitude]);
  const services = biz.services ? SERVICE_LABELS.filter((s) => s.key in biz.services) : [];
  const menu = Array.isArray(biz.menu) ? biz.menu : [];
  const price = biz.price_range;
  const priceText = price ? (typeof price === 'string' ? price : `${formatRupiah(price.min)}–${formatRupiah(price.max).replace('Rp', '')}`) : null;
  const website = biz.website ?? biz.instagram ?? null;

  const gmapsPlace = `https://www.google.com/maps/search/?api=1&query=${biz.latitude},${biz.longitude}`;
  const gmapsDir = `https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${biz.latitude},${biz.longitude}&travelmode=${googleTravelMode(routeMode)}`;
  const shareUrl = `${window.location.origin}/explore?usaha=${biz.id}`;
  const shareText = `${biz.name}${biz.address ? ` — ${biz.address}` : ''}`;

  const copy = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(msg);
    } catch {
      flash('Gagal menyalin — salin manual ya');
    }
  };

  const doSave = () => {
    if (!user) return flash('Masuk untuk menyimpan tempat', '/login');
    const next = toggleFavorite(user.id, biz.id);
    const on = next.includes(biz.id);
    setSaved(on);
    onFavoritesChange?.();
    flash(on ? 'Disimpan ke favoritmu' : 'Dihapus dari favorit');
  };

  const doShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: biz.name, text: shareText, url: shareUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    copy(shareUrl, 'Tautan tempat disalin');
  };

  const sendToPhone = `https://wa.me/?text=${encodeURIComponent(`${shareText}\nRute: ${gmapsPlace}\nLihat di PesanLokal: ${shareUrl}`)}`;

  const openDirections = () => {
    setView('directions');
    onRoute(biz, routeMode);
  };

  const sendReview = async (e) => {
    e.preventDefault();
    if (!form.rating) return setReviewState({ sending: false, error: 'Pilih jumlah bintang dulu.', done: false });
    setReviewState({ sending: true, error: '', done: false });
    try {
      const savedReview = await submitReview(biz, user, form, { local: local || user.demo });
      setReviews((list) => [savedReview, ...list.filter((r) => r.user_id !== user.id)]);
      setReviewState({ sending: false, error: '', done: true });
      setForm({ rating: 0, comment: '' });
    } catch (err) {
      setReviewState({ sending: false, error: err.response?.data?.message ?? 'Ulasan gagal dikirim. Coba lagi.', done: false });
    }
  };

  const sendReport = async (e) => {
    e.preventDefault();
    if (!report.reason) return setReportState({ sending: false, error: 'Pilih alasan laporan.', done: false });
    if (report.reason === 'other' && report.detail.trim().length < 10) {
      return setReportState({ sending: false, error: 'Jelaskan masalahnya minimal 10 karakter.', done: false });
    }
    setReportState({ sending: true, error: '', done: false });
    try {
      await submitReport(biz, user, report, { local: local || user.demo });
      setReportState({ sending: false, error: '', done: true });
    } catch (err) {
      setReportState({ sending: false, error: err.response?.data?.message ?? 'Laporan gagal dikirim. Coba lagi.', done: false });
    }
  };

  const TABS = useMemo(() => [
    { key: 'ringkasan', label: 'Ringkasan' },
    { key: 'menu', label: 'Menu' },
    { key: 'ulasan', label: 'Ulasan' },
    { key: 'tentang', label: 'Tentang' },
  ], []);

  const header = (title, onBack) => (
    <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-blue-200 bg-white">
      <button type="button" onClick={onBack} className="p-2 rounded-full hover:bg-blue-100 text-navy-700 transition-colors" aria-label="Kembali ke detail tempat">
        <ArrowLeft size={19} />
      </button>
      <p className="font-heading font-bold text-sm text-navy-800 truncate flex-1">{title}</p>
      <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-blue-100 text-navy-500 transition-colors" aria-label="Tutup panel">
        <X size={18} />
      </button>
    </div>
  );

  return (
    <motion.aside
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="relative h-full bg-white flex flex-col overflow-hidden"
      aria-label={`Detail ${biz.name}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {/* ═══ TAMPILAN TEMPAT ═══ */}
        {view === 'place' && (
          <motion.div key="place" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="flex-1 overflow-y-auto">
            {/* foto + kotak pencarian mengambang */}
            <div className="relative h-48 md:h-56 bg-blue-100">
              {biz.photo || biz.photo_url ? (
                <img src={biz.photo ?? biz.photo_url} alt={`Foto ${biz.name}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">{category.emoji}</div>
              )}
              <div className="absolute top-3 inset-x-3 flex items-center gap-1 bg-white rounded-full shadow-lg shadow-navy-900/20 pl-1 pr-1.5 py-1">
                <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-blue-100 text-navy-700 transition-colors" aria-label="Kembali ke hasil pencarian">
                  <ArrowLeft size={18} />
                </button>
                <label htmlFor="panel-search" className="sr-only">Cari usaha</label>
                <input
                  id="panel-search"
                  value={search || biz.name}
                  onChange={(e) => { onSearch(e.target.value); onClose(); }}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm text-navy-800 px-1"
                />
                <Search size={17} className="text-navy-500 shrink-0 mx-1" aria-hidden="true" />
                <button type="button" onClick={() => { onSearch(''); onClose(); }} className="p-1.5 rounded-full hover:bg-blue-100 text-navy-500 transition-colors" aria-label="Hapus pencarian dan tutup">
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* identitas */}
            <div className="px-6 pt-4">
              <h2 className="font-heading font-bold text-[22px] text-navy-800 leading-tight">{biz.name}</h2>
              <div className="flex items-center gap-1.5 flex-wrap mt-1 text-sm text-navy-500">
                {totalCount > 0 ? (
                  <>
                    <span className="text-navy-800">{avg.toFixed(1).replace('.', ',')}</span>
                    <Stars value={avg} />
                    <button type="button" onClick={() => setTab('ulasan')} className="hover:underline">({totalCount.toLocaleString('id-ID')})</button>
                  </>
                ) : <span>Belum ada ulasan</span>}
                {priceText && <><span aria-hidden="true">·</span><span>{priceText}</span></>}
              </div>
              <p className="text-sm text-navy-500 mt-0.5">
                {biz.subcategory || category.label}
                {biz.promo && <span className="ml-2 inline-flex items-center gap-1 bg-yellow-300/60 text-navy-800 text-[11px] font-bold px-2 py-0.5 rounded-full align-middle"><Tag size={10} /> Promo</span>}
              </p>
            </div>

            {/* tab */}
            <div className="sticky top-0 z-10 bg-white mt-3 border-b border-blue-200 flex px-2" role="tablist" aria-label="Bagian detail usaha">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative flex-1 py-3 text-sm font-semibold transition-colors ${tab === t.key ? 'text-navy-800' : 'text-navy-500 hover:text-navy-700'}`}
                >
                  {t.label}
                  {tab === t.key && <motion.span layoutId="place-tab" className="absolute bottom-0 inset-x-4 h-[3px] bg-navy-800 rounded-t-full" />}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {tab === 'ringkasan' && (
                <motion.div key="ringkasan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  {/* tombol aksi bulat */}
                  <div className="flex justify-between px-4 pt-4 pb-3">
                    <RoundAction icon={Navigation} label="Rute" onClick={openDirections} primary />
                    <RoundAction icon={Bookmark} label={saved ? 'Tersimpan' : 'Simpan'} onClick={doSave} active={saved} />
                    <RoundAction icon={Radar} label="Sekitar" onClick={() => onNearby(biz)} />
                    <RoundAction icon={Send} label="Kirim ke HP" href={sendToPhone} />
                    <RoundAction icon={Share2} label="Bagikan" onClick={doShare} />
                  </div>

                  {phone && (
                    <div className="px-6 pb-4">
                      <a
                        href={`https://wa.me/${phone}?text=${encodeURIComponent(`Halo ${biz.name}, saya lihat usaha Anda di PesanLokal.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 bg-blue-200 hover:bg-blue-300 text-navy-800 text-sm font-semibold py-2.5 rounded-full transition-colors"
                      >
                        <MessageCircle size={16} /> Pesan via WhatsApp
                      </a>
                    </div>
                  )}

                  {biz.promo && (
                    <div className="mx-6 mb-4 flex items-start gap-2.5 bg-yellow-300/40 border border-yellow-500/40 rounded-xl px-3.5 py-2.5">
                      <Tag size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-navy-800">Promo dari pemilik</p>
                        <p className="text-sm text-navy-700">{biz.promo}</p>
                      </div>
                    </div>
                  )}

                  {biz.description && (
                    <p className="px-6 pb-4 text-sm text-navy-700 leading-relaxed line-clamp-3">
                      {biz.description}{' '}
                      <button type="button" onClick={() => setTab('tentang')} className="font-semibold text-info hover:underline">Selengkapnya</button>
                    </p>
                  )}

                  {services.length > 0 && (
                    <button type="button" onClick={() => setTab('tentang')} className="w-full flex items-center gap-3 px-6 py-3 border-t border-blue-200 hover:bg-blue-50 text-left transition-colors">
                      <div className="flex-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-navy-800">
                        {services.map((s, i) => (
                          <span key={s.key} className="flex items-center gap-1">
                            {biz.services[s.key] ? <Check size={15} className="text-success" /> : <X size={15} className="text-danger" />}
                            {s.label}{i < services.length - 1 && <span className="text-navy-500 ml-1">·</span>}
                          </span>
                        ))}
                      </div>
                      <ChevronRight size={18} className="text-navy-500" />
                    </button>
                  )}

                  {/* baris informasi */}
                  <div className="border-t border-blue-200 py-2">
                    <Row icon={MapPin} action={<Copy size={16} />} actionLabel="Salin alamat" onAction={() => copy(biz.address ?? `${biz.latitude}, ${biz.longitude}`, 'Alamat disalin')}>
                      {biz.address ?? <span className="text-navy-500">Alamat belum diisi pemilik</span>}
                      {biz.address_detail?.landmark && <span className="block text-xs text-navy-700 mt-0.5">Patokan: {biz.address_detail.landmark}</span>}
                      <span className="block text-xs text-navy-500 mt-0.5">
                        {routeForThis
                          ? `${fmtDistance(route.km)} lewat jalan · ${fmtDuration(route.min)} ${ROUTE_MODES.find((m) => m.key === route.mode)?.label.toLowerCase() ?? ''}`
                          : `± ${fmtDistance(straight)} garis lurus ${hasPreciseLocation ? 'dari lokasimu' : 'dari titik perkiraan'}`}
                      </span>
                    </Row>

                    {status ? (
                      <div>
                        <Row icon={Clock} onClick={week ? () => setHoursOpen((v) => !v) : undefined}>
                          <span className="flex items-center gap-1">
                            <span className={`font-semibold ${status.open ? (status.soon ? 'text-yellow-600' : 'text-success') : 'text-danger'}`}>{status.label}</span>
                            {status.detail && <span className="text-navy-700">· {status.detail}</span>}
                            {week && <ChevronDown size={16} className={`text-navy-500 transition-transform ${hoursOpen ? 'rotate-180' : ''}`} />}
                          </span>
                        </Row>
                        <AnimatePresence initial={false}>
                          {hoursOpen && week && (
                            <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-[4.25rem] pr-6 pb-2">
                              {week.map((d) => (
                                <li key={d.key} className={`flex justify-between py-1 text-sm ${d.key === today ? 'font-bold text-navy-800' : 'text-navy-700'}`}>
                                  <span>{d.label}</span><span>{d.text}</span>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Row icon={Clock}><span className="text-navy-500">Jam buka belum diisi pemilik</span></Row>
                    )}

                    {priceText && (
                      <Row icon={Wallet}>
                        {priceText} per orang
                        <span className="block text-xs text-navy-500 mt-0.5">Diisi oleh pemilik usaha</span>
                      </Row>
                    )}

                    <Row icon={BookOpen} onClick={() => setTab('menu')} action={<ChevronRight size={16} />} actionLabel="Lihat menu" onAction={() => setTab('menu')}>
                      {category.key === 'jasa' ? 'Daftar layanan' : 'Menu & produk'}
                      <span className="block text-xs text-navy-500 mt-0.5">{menu.length ? `${menu.length} item dari pemilik` : 'Belum diisi pemilik'}</span>
                    </Row>

                    {website && (
                      <Row icon={Globe} href={website.startsWith('http') ? website : `https://${website}`}>
                        {website.replace(/^https?:\/\/(www\.)?/, '')}
                      </Row>
                    )}

                    {phone ? (
                      <Row icon={Phone} href={`tel:+${phone}`} action={<Copy size={16} />} actionLabel="Salin nomor" onAction={() => copy(phoneDisplay, 'Nomor disalin')}>
                        {phoneDisplay}
                      </Row>
                    ) : (
                      <Row icon={Phone}><span className="text-navy-500">Kontak belum diisi pemilik</span></Row>
                    )}

                    <Row icon={LocateFixed} action={<Copy size={16} />} actionLabel="Salin koordinat" onAction={() => copy(`${biz.latitude}, ${biz.longitude}`, 'Koordinat disalin')}>
                      <span className="font-mono text-[13px]">{biz.latitude.toFixed(6)}, {biz.longitude.toFixed(6)}</span>
                    </Row>

                    <Row icon={BadgeCheck} tone="text-success">
                      Diverifikasi admin PesanLokal
                      <span className="block text-xs text-navy-500 mt-0.5">Info diisi & diperbarui langsung oleh pemilik</span>
                    </Row>

                    <Row icon={ExternalLink} href={gmapsPlace}>Buka tempat ini di Google Maps</Row>
                  </div>

                  {/* ringkasan ulasan */}
                  <div className="border-t border-blue-200 px-6 py-4">
                    <p className="font-heading font-bold text-base text-navy-800">Ringkasan ulasan</p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="font-heading text-4xl text-navy-800">{totalCount ? avg.toFixed(1).replace('.', ',') : '–'}</p>
                      <div>
                        <Stars value={avg} size={15} />
                        <p className="text-xs text-navy-500 mt-0.5">{totalCount.toLocaleString('id-ID')} ulasan</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setTab('ulasan')} className="mt-3 inline-flex items-center gap-1.5 border border-blue-300 hover:bg-blue-50 text-navy-700 text-sm font-semibold px-4 py-2 rounded-full transition-colors">
                      <Star size={15} /> Tulis ulasan
                    </button>
                  </div>

                  <div className="border-t border-blue-200 px-6 py-4 flex flex-wrap gap-2 pb-8">
                    <button type="button" onClick={() => setView('report')} className="inline-flex items-center gap-1.5 border border-blue-300 hover:border-danger hover:text-danger text-navy-700 text-sm font-semibold px-4 py-2 rounded-full transition-colors">
                      <Flag size={15} /> Laporkan masalah
                    </button>
                  </div>
                </motion.div>
              )}

              {tab === 'menu' && (
                <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="px-6 py-4 pb-8">
                  {menu.length ? (
                    <ul className="divide-y divide-blue-100">
                      {menu.map((m) => (
                        <li key={m.name} className="flex items-start justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy-800">{m.name}</p>
                            {m.desc && <p className="text-xs text-navy-500 mt-0.5">{m.desc}</p>}
                          </div>
                          {m.price != null && <p className="text-sm font-bold text-navy-800 shrink-0">{formatRupiah(m.price)}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-10">
                      <BookOpen size={28} className="mx-auto text-blue-400" />
                      <p className="text-sm text-navy-700 mt-2">Pemilik belum menambahkan menu.</p>
                      {phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm font-semibold text-info hover:underline">Tanyakan lewat WhatsApp</a>}
                    </div>
                  )}
                  <p className="text-[11px] text-navy-500 mt-4">Harga dapat berubah sewaktu-waktu sesuai kebijakan pemilik.</p>
                </motion.div>
              )}

              {tab === 'ulasan' && (
                <motion.div key="ulasan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="px-6 py-4 pb-8 space-y-4">
                  <div className="flex items-center gap-4">
                    <p className="font-heading text-5xl text-navy-800">{totalCount ? avg.toFixed(1).replace('.', ',') : '–'}</p>
                    <div>
                      <Stars value={avg} size={16} />
                      <p className="text-xs text-navy-500 mt-1">{totalCount.toLocaleString('id-ID')} ulasan</p>
                    </div>
                  </div>

                  {!user && <LoginGate text="Masuk untuk menulis ulasan tentang usaha ini." />}
                  {user?.role === 'admin' && <p className="text-xs text-navy-500">Admin memoderasi ulasan dari panel admin.</p>}
                  {canFeedback && (
                    <form onSubmit={sendReview} className="border border-blue-200 rounded-2xl p-4">
                      <p className="text-sm font-semibold text-navy-800">{myReview ? 'Perbarui ulasanmu' : 'Beri rating & ulasan'}</p>
                      <div className="mt-1"><Stars value={form.rating} size={24} onPick={(n) => setForm((f) => ({ ...f, rating: n }))} /></div>
                      <label htmlFor="review-comment" className="sr-only">Komentar</label>
                      <textarea
                        id="review-comment"
                        value={form.comment}
                        onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value.slice(0, 500) }))}
                        rows={3}
                        placeholder="Bagikan pengalamanmu: rasa, pelayanan, harga…"
                        className="w-full mt-2 bg-blue-50 border border-transparent focus:border-navy-600 focus:bg-white rounded-xl px-3 py-2.5 text-sm outline-none resize-none transition-colors"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-navy-500">{form.comment.length}/500</span>
                        <button type="submit" disabled={reviewState.sending} className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 disabled:opacity-60 text-blue-50 text-xs font-bold px-4 py-2.5 rounded-full transition-colors">
                          <Send size={13} /> {reviewState.sending ? 'Mengirim…' : 'Kirim'}
                        </button>
                      </div>
                      {reviewState.error && <p className="text-xs font-semibold text-danger mt-2">{reviewState.error}</p>}
                      {reviewState.done && <p className="flex items-center gap-1 text-xs font-semibold text-success mt-2"><Check size={13} /> Terima kasih! Ulasanmu sudah tayang.</p>}
                    </form>
                  )}

                  <div className="space-y-4">
                    {loadingReviews && [0, 1].map((i) => <div key={i} className="h-16 rounded-xl bg-blue-100 animate-pulse" />)}
                    {!loadingReviews && reviews.length === 0 && (
                      <p className="text-sm text-navy-500 text-center py-4">Belum ada ulasan tertulis. Jadilah yang pertama!</p>
                    )}
                    {!loadingReviews && reviews.map((r) => (
                      <div key={r.id} className="border-b border-blue-100 pb-4 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <span className="w-9 h-9 rounded-full bg-navy-800 text-yellow-500 font-heading font-bold text-sm flex items-center justify-center">{(r.user_name ?? '?').slice(0, 1)}</span>
                          <p className="text-sm font-semibold text-navy-800 truncate">{r.user_name}{user && r.user_id === user.id ? ' (kamu)' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5"><Stars value={r.rating} size={12} /><span className="text-xs text-navy-500">{fmtDate(r.created_at)}</span></div>
                        {r.comment && <p className="text-sm text-navy-700 mt-1.5 leading-relaxed">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {tab === 'tentang' && (
                <motion.div key="tentang" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="px-6 py-4 pb-8 space-y-5">
                  <section>
                    <p className="font-heading font-bold text-sm text-navy-800">Deskripsi</p>
                    <p className="text-sm text-navy-700 mt-1.5 leading-relaxed">{biz.description ?? 'Pemilik belum menambahkan deskripsi.'}</p>
                  </section>
                  {services.length > 0 && (
                    <section>
                      <p className="font-heading font-bold text-sm text-navy-800">Opsi layanan</p>
                      <ul className="mt-2 grid grid-cols-2 gap-2">
                        {services.map((s) => (
                          <li key={s.key} className={`flex items-center gap-2 text-sm ${biz.services[s.key] ? 'text-navy-800' : 'text-navy-500 line-through'}`}>
                            {biz.services[s.key] ? <Check size={15} className="text-success" /> : <X size={15} className="text-danger" />} {s.label}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {biz.payments?.length > 0 && (
                    <section>
                      <p className="font-heading font-bold text-sm text-navy-800">Pembayaran</p>
                      <ul className="mt-2 grid grid-cols-2 gap-2">
                        {biz.payments.map((k) => <li key={k} className="flex items-center gap-2 text-sm text-navy-800"><Check size={15} className="text-success" /> {labelOf(PAYMENT_OPTIONS, k)}</li>)}
                      </ul>
                    </section>
                  )}
                  {biz.amenities?.length > 0 && (
                    <section>
                      <p className="font-heading font-bold text-sm text-navy-800">Fasilitas</p>
                      <ul className="mt-2 grid grid-cols-2 gap-2">
                        {biz.amenities.map((k) => <li key={k} className="flex items-center gap-2 text-sm text-navy-800"><Check size={15} className="text-success" /> {labelOf(AMENITY_OPTIONS, k)}</li>)}
                      </ul>
                    </section>
                  )}
                  {biz.gallery?.length > 0 && (
                    <section>
                      <p className="font-heading font-bold text-sm text-navy-800">Foto dari pemilik</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {biz.gallery.map((g) => (
                          <a key={g.label} href={g.url} target="_blank" rel="noreferrer" className="block" title={g.label}>
                            <img src={g.url} alt={`${g.label} ${biz.name}`} className="w-full aspect-square object-cover rounded-lg hover:opacity-90 transition-opacity" loading="lazy" />
                            <span className="block text-[10px] text-navy-500 mt-0.5 truncate">{g.label}</span>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}
                  <section>
                    <p className="font-heading font-bold text-sm text-navy-800">Informasi usaha</p>
                    <dl className="mt-2 text-sm space-y-1.5">
                      <div className="flex justify-between gap-4"><dt className="text-navy-500">Kategori</dt><dd className="text-navy-800 text-right">{category.emoji} {category.label}{biz.subcategory ? ` · ${biz.subcategory}` : ''}</dd></div>
                      {biz.established_year && <div className="flex justify-between gap-4"><dt className="text-navy-500">Berdiri sejak</dt><dd className="text-navy-800">{biz.established_year}</dd></div>}
                      {priceText && <div className="flex justify-between gap-4"><dt className="text-navy-500">Kisaran harga</dt><dd className="text-navy-800">{priceText}</dd></div>}
                      <div className="flex justify-between gap-4"><dt className="text-navy-500">Status</dt><dd className="flex items-center gap-1 text-success font-semibold"><BadgeCheck size={14} /> Terverifikasi</dd></div>
                      {biz.created_at && <div className="flex justify-between gap-4"><dt className="text-navy-500">Bergabung</dt><dd className="text-navy-800">{fmtDate(biz.created_at)}</dd></div>}
                    </dl>
                  </section>
                  <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                    <Info size={16} className="text-info shrink-0 mt-0.5" />
                    <p className="text-xs text-navy-700 leading-relaxed">Semua info di halaman ini diisi langsung oleh pemilik dan ditinjau admin. Temukan yang tidak sesuai? <button type="button" onClick={() => setView('report')} className="font-bold text-danger hover:underline">Laporkan</button></p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ═══ TAMPILAN PETUNJUK ARAH ═══ */}
        {view === 'directions' && (
          <motion.div key="dir" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }} className="flex-1 flex flex-col overflow-hidden">
            <div className="shrink-0 bg-white border-b border-blue-200 px-3 pt-3 pb-4">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setView('place')} className="p-2 rounded-full hover:bg-blue-100 text-navy-700 transition-colors" aria-label="Kembali ke detail tempat">
                  <ArrowLeft size={19} />
                </button>
                <div className="flex-1 flex justify-around" role="radiogroup" aria-label="Moda transportasi">
                  {ROUTE_MODES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      role="radio"
                      aria-checked={routeMode === m.key}
                      onClick={() => onRouteMode(m.key)}
                      className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-2xl transition-colors ${routeMode === m.key ? 'bg-blue-200 text-navy-800' : 'text-navy-500 hover:bg-blue-50'}`}
                      title={m.label}
                    >
                      <m.icon size={18} />
                      <span className="text-[10px] font-bold">{estimates[m.key] ? fmtDuration(estimates[m.key]) : m.label}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-blue-100 text-navy-500 transition-colors" aria-label="Tutup panel">
                  <X size={18} />
                </button>
              </div>

              {/* asal → tujuan */}
              <div className="flex items-stretch gap-3 mt-3 pl-3 pr-2">
                <div className="flex flex-col items-center pt-3.5" aria-hidden="true">
                  <span className="w-3 h-3 rounded-full border-[3px] border-info bg-white" />
                  <span className="flex-1 border-l-2 border-dotted border-navy-500/40 my-1" />
                  <MapPin size={16} className="text-danger mb-2.5" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 border border-blue-300 rounded-lg px-3 py-2">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-navy-800">Lokasi kamu</span>
                      {!hasPreciseLocation && <span className="block text-[11px] text-yellow-600">Perkiraan — izin lokasi belum diberikan</span>}
                    </span>
                    {!hasPreciseLocation && (
                      <button type="button" onClick={onLocate} className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-info hover:underline">
                        <LocateFixed size={13} /> Pakai GPS
                      </button>
                    )}
                  </div>
                  <div className="border border-blue-300 rounded-lg px-3 py-2 text-sm text-navy-800 truncate">{biz.name}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-blue-50">
              {routing && (
                <div className="p-5 space-y-2" aria-live="polite">
                  <div className="h-5 w-32 rounded bg-blue-200 animate-pulse" />
                  <div className="h-4 w-48 rounded bg-blue-200 animate-pulse" />
                  <p className="text-xs text-navy-500">Mencari rute terbaik…</p>
                </div>
              )}

              {!routing && routeError?.bizId === biz.id && (
                <div className="m-4 bg-white border border-danger/30 rounded-xl p-4">
                  <p className="flex items-start gap-2 text-sm text-danger font-semibold"><CircleAlert size={16} className="shrink-0 mt-0.5" /> {routeError.message}</p>
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => onRoute(biz, routeMode)} className="text-xs font-bold text-navy-700 border border-blue-300 hover:bg-blue-50 px-3 py-2 rounded-full transition-colors">Coba lagi</button>
                    <a href={gmapsDir} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-50 bg-navy-800 hover:bg-navy-700 px-3 py-2 rounded-full transition-colors">Buka di Google Maps</a>
                  </div>
                </div>
              )}

              {!routing && routeForThis && (
                <div className="bg-white border-b border-blue-200">
                  {/* pilihan rute ala Google Maps: tiap opsi dengan durasi, jarak, jalan utama */}
                  <ul className="divide-y divide-blue-100" role="radiogroup" aria-label="Pilihan rute">
                    {route.routes.map((r, i) => {
                      const on = i === route.active;
                      const M = ROUTE_MODES.find((m) => m.key === route.mode)?.icon ?? Car;
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => onPickAlt?.(i)}
                            className={`w-full text-left px-5 py-3.5 flex items-start gap-4 transition-colors ${on ? 'bg-blue-50 border-l-4 border-info pl-4' : 'hover:bg-blue-50'}`}
                          >
                            <M size={21} className={`mt-1 ${on ? 'text-info' : 'text-navy-500'}`} />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm">
                                <span className={`font-heading font-bold text-lg ${on ? 'text-success' : 'text-navy-800'}`}>{fmtDuration(r.min)}</span>
                                <span className="text-navy-500 ml-1.5">({fmtDistance(r.km)})</span>
                              </span>
                              <span className="block text-xs text-navy-500 mt-0.5 truncate">
                                {r.via ? `via ${r.via}` : 'Rute jalan lokal'} · tiba ± {arrivalTime(r.min)}
                              </span>
                              {i === 0 && route.routes.length > 1 && <span className="inline-block mt-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">Tercepat</span>}
                              {i > 0 && <span className="inline-block mt-1 text-[10px] font-bold text-navy-500 bg-blue-100 px-2 py-0.5 rounded-full">Alternatif · +{Math.max(0, r.min - route.routes[0].min)} mnt</span>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {route.mode === 'motorcycle' && <p className="px-5 pb-2 text-[11px] text-navy-500">Estimasi motor memakai jalur kendaraan bermotor (profil mobil OSRM).</p>}
                  <div className="flex flex-wrap gap-2 px-5 py-3 border-t border-blue-100">
                    <button type="button" onClick={onStartNav} className="inline-flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-blue-50 text-xs font-bold px-4 py-2 rounded-full transition-colors">
                      <Navigation size={13} /> Mulai navigasi
                    </button>
                    <a href={gmapsDir} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-blue-300 hover:bg-blue-50 text-navy-700 text-xs font-bold px-4 py-2 rounded-full transition-colors">
                      <ExternalLink size={13} /> Google Maps
                    </a>
                    <a href={sendToPhone} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-blue-300 hover:bg-blue-50 text-navy-700 text-xs font-bold px-4 py-2 rounded-full transition-colors">
                      <Send size={13} /> Kirim ke HP
                    </a>
                    <button type="button" onClick={() => { onClearRoute(); setView('place'); }} className="inline-flex items-center gap-1.5 text-navy-500 hover:text-danger text-xs font-bold px-2 py-2 rounded-full transition-colors">
                      <X size={13} /> Hapus rute
                    </button>
                  </div>

                  {route.steps.length > 0 && (
                    <>
                      <button type="button" onClick={() => setStepsOpen((v) => !v)} className="w-full flex items-center justify-between px-5 py-3 border-t border-blue-200 text-sm font-semibold text-navy-700 hover:bg-blue-50 transition-colors" aria-expanded={stepsOpen}>
                        Petunjuk arah ({route.steps.length} langkah)
                        <ChevronDown size={17} className={`transition-transform ${stepsOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {stepsOpen && (
                          <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-3">
                            <li className="flex items-center gap-3 px-5 py-2.5 text-sm text-navy-800">
                              <span className="w-4 h-4 rounded-full border-[3px] border-info bg-white shrink-0" /> {hasPreciseLocation ? 'Lokasi kamu' : 'Titik perkiraan'}
                            </li>
                            {route.steps.map((s, i) => {
                              const Icon = stepIcon(s);
                              const on = i === focusStep;
                              return (
                                <li key={i}>
                                  <button type="button" onClick={() => onFocusStep?.(i)} className={`w-full text-left flex items-start gap-3 px-5 py-2.5 border-t border-blue-100 transition-colors ${on ? 'bg-yellow-300/30' : 'hover:bg-blue-50'}`} title="Tampilkan di peta">
                                    <Icon size={17} className={`shrink-0 mt-0.5 ${on ? 'text-navy-800' : 'text-navy-600'}`} />
                                    <span className="flex-1 text-sm text-navy-800">{s.text}</span>
                                    {s.m > 0 && <span className="text-xs text-navy-500 shrink-0">{fmtDistance(s.m / 1000)}</span>}
                                  </button>
                                </li>
                              );
                            })}
                          </motion.ol>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}

              <div className="p-5 text-xs text-navy-500 leading-relaxed">
                Jarak & waktu dihitung dari data jalan OpenStreetMap (OSRM) tanpa data lalu lintas langsung, jadi waktu tempuh bisa berbeda saat macet. Untuk navigasi suara, gunakan <a href={gmapsDir} target="_blank" rel="noreferrer" className="font-semibold text-info hover:underline">Google Maps</a>.
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ TAMPILAN LAPORAN ═══ */}
        {view === 'report' && (
          <motion.div key="report" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }} className="flex-1 flex flex-col overflow-hidden">
            {header('Laporkan masalah', () => setView('place'))}
            <div className="flex-1 overflow-y-auto px-6 py-4 pb-8">
              <p className="text-sm font-semibold text-navy-800">{biz.name}</p>
              <p className="text-xs text-navy-500">{biz.address}</p>
              <div className="flex items-start gap-2.5 bg-danger/5 border border-danger/20 rounded-xl p-3.5 mt-3">
                <Flag size={16} className="text-danger shrink-0 mt-0.5" />
                <p className="text-xs text-navy-700 leading-relaxed">Sudah ke lokasi tapi usahanya tidak ada, tutup, atau infonya beda? Laporanmu ditinjau admin dan membantu tetangga lain tidak tersesat.</p>
              </div>

              {!user && <div className="mt-4"><LoginGate text="Masuk untuk melaporkan usaha ini — mencegah laporan palsu." /></div>}
              {user?.role === 'admin' && <p className="text-xs text-navy-500 mt-4">Admin mengelola laporan dari panel admin.</p>}

              {canFeedback && reportState.done && (
                <div className="mt-4 text-center bg-success/5 border border-success/30 rounded-2xl p-5">
                  <BadgeCheck size={28} className="mx-auto text-success" />
                  <p className="text-sm font-bold text-navy-800 mt-2">Laporan terkirim</p>
                  <p className="text-xs text-navy-500 mt-1">Admin akan memeriksa dan menindaklanjuti laporanmu. Terima kasih sudah menjaga data tetap akurat.</p>
                  <button type="button" onClick={() => setView('place')} className="mt-3 text-xs font-bold text-navy-700 border border-blue-300 hover:bg-blue-50 px-4 py-2 rounded-full transition-colors">Kembali ke detail</button>
                </div>
              )}

              {canFeedback && !reportState.done && (
                <form onSubmit={sendReport} className="mt-4 space-y-3">
                  <fieldset>
                    <legend className="text-sm font-semibold text-navy-800 mb-2">Apa masalahnya?</legend>
                    <div className="space-y-1.5">
                      {REPORT_REASONS.map((r) => (
                        <label key={r.key} className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 cursor-pointer text-sm transition-colors ${report.reason === r.key ? 'border-navy-800 bg-blue-50' : 'border-blue-200 hover:border-navy-500'}`}>
                          <input type="radio" name="report-reason" value={r.key} checked={report.reason === r.key} onChange={() => setReport((s) => ({ ...s, reason: r.key }))} className="accent-navy-800" />
                          {r.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div>
                    <label htmlFor="report-detail" className="text-sm font-semibold text-navy-800">Detail {report.reason === 'other' ? '' : '(opsional)'}</label>
                    <textarea
                      id="report-detail"
                      value={report.detail}
                      onChange={(e) => setReport((s) => ({ ...s, detail: e.target.value.slice(0, 1000) }))}
                      rows={3}
                      placeholder="cth. Saya ke lokasi tgl 20 Nov pukul 10.00, yang ada rumah kosong."
                      className="w-full mt-1.5 bg-blue-50 border border-transparent focus:border-navy-600 focus:bg-white rounded-xl px-3 py-2.5 text-sm outline-none resize-none transition-colors"
                    />
                  </div>
                  {reportState.error && <p className="text-xs font-semibold text-danger">{reportState.error}</p>}
                  <button type="submit" disabled={reportState.sending} className="w-full flex items-center justify-center gap-1.5 bg-danger hover:brightness-110 disabled:opacity-60 text-white text-sm font-heading font-bold py-3 rounded-full transition-all">
                    <Flag size={15} /> {reportState.sending ? 'Mengirim…' : 'Kirim Laporan'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            role="status"
            className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-3 bg-navy-800 text-blue-50 text-sm px-4 py-3 rounded-xl shadow-xl"
          >
            {toast.text}
            {toast.link && <Link to={toast.link} className="text-yellow-500 font-bold text-xs shrink-0">Masuk</Link>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
