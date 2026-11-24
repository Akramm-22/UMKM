import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Store, User, Phone, Clock, FileText, ImagePlus, X, Check, CircleAlert, ArrowRight, ArrowLeft,
  UtensilsCrossed, Wrench, ShoppingBasket, Send, BadgeCheck, LocateFixed, Globe, AtSign, Camera, Wallet,
  ListPlus, Trash2, Eye, Lock, Copy, Sparkles, RotateCcw, Pencil, Info, Loader2, Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  CATEGORY_OPTIONS, DAYS, SERVICE_OPTIONS, PAYMENT_OPTIONS, AMENITY_OPTIONS, labelOf,
  emptyForm, validateStep, toRecord, toForm, composeAddress, compressImage,
} from '../lib/businessForm.js';

const DEFAULT_CENTER = [-6.2, 106.816666];
const LOCAL_KEY = 'pl_demo_businesses';
const CAT_ICON = { kuliner: UtensilsCrossed, jasa: Wrench, toko: ShoppingBasket };

const STEPS = [
  { title: 'Informasi Usaha', desc: 'Nama, kategori & deskripsi seperti yang tampil di peta.', icon: Store },
  { title: 'Alamat & Lokasi', desc: 'Alamat lengkap dan titik pin yang tepat.', icon: MapPin },
  { title: 'Kontak & Jam Buka', desc: 'Cara konsumen menghubungi dan kapan kamu buka.', icon: Clock },
  { title: 'Foto Usaha', desc: 'Tampak depan, kondisi tempat & produk.', icon: Camera },
  { title: 'Detail Tambahan', desc: 'Harga, layanan, pembayaran, fasilitas & menu.', icon: Sparkles },
  { title: 'Tinjau & Kirim', desc: 'Cek ulang sebelum dikirim ke admin.', icon: Eye },
];

const pickIcon = L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;background:#0F1E3D;border:3px solid #fff;border-radius:50% 50% 50% 6px;
    transform:rotate(-45deg);box-shadow:0 6px 16px rgba(15,30,61,.4);display:flex;align-items:center;justify-content:center">
    <div style="width:12px;height:12px;background:#FFC914;border-radius:50%;transform:rotate(45deg)"></div></div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

function LocationPicker({ pos, onPick }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return pos ? (
    <Marker position={pos} icon={pickIcon} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onPick([p.lat, p.lng]); } }} />
  ) : null;
}

function Recenter({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView(pos, Math.max(map.getZoom(), 17)); }, [pos, map]);
  return null;
}

function Field({ label, hint, error, children, htmlFor, required }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={htmlFor} className="block text-xs font-bold text-navy-700">
          {label}{required && <span className="text-danger"> *</span>}
        </label>
        {hint && <span className="text-[10px] text-navy-500 text-right">{hint}</span>}
      </div>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-[11px] font-semibold text-danger mt-1.5" role="alert">
            <CircleAlert size={11} className="shrink-0" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const boxCls = (error) =>
  `w-full flex items-center gap-3 border rounded-xl px-4 py-3 text-sm text-navy-800 transition-colors ${
    error ? 'bg-danger/5 border-danger' : 'bg-blue-50 border-transparent focus-within:border-navy-600 focus-within:bg-white'
  }`;
const plainInput = 'w-full bg-transparent outline-none placeholder:text-navy-500/50';

function TextInput({ id, icon: Icon, error, ...props }) {
  return (
    <div className={boxCls(error)}>
      {Icon && <Icon size={16} className="text-navy-500 shrink-0" />}
      <input id={id} aria-invalid={Boolean(error)} className={plainInput} {...props} />
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border transition-colors ${active ? 'bg-navy-800 text-blue-50 border-navy-800' : 'bg-white text-navy-700 border-blue-300 hover:border-navy-600'}`}>
      {active && <Check size={12} />} {children}
    </button>
  );
}

function PhotoSlot({ label, hint, value, onChange, error, required, private: isPrivate }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      onChange(await compressImage(file));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label={label} hint={hint} error={error || err} required={required}>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" aria-label={label} />
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-blue-200 group">
          <img src={value} alt={label} className="w-full aspect-[4/3] object-cover" />
          {isPrivate && <span className="absolute top-2 left-2 flex items-center gap-1 bg-navy-800/90 text-blue-50 text-[10px] font-bold px-2 py-1 rounded-md"><Lock size={10} /> Hanya admin</span>}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button type="button" onClick={() => ref.current?.click()} className="bg-white/95 hover:bg-white text-navy-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow">Ganti</button>
            <button type="button" onClick={() => onChange(null)} className="bg-white/95 hover:bg-white text-danger p-1.5 rounded-lg shadow" aria-label={`Hapus ${label}`}><Trash2 size={13} /></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className={`w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl transition-colors ${error ? 'border-danger bg-danger/5' : 'border-blue-300 hover:border-navy-600 bg-blue-50/60'}`}>
          {busy ? <Loader2 size={20} className="animate-spin text-navy-600" /> : <span className="bg-white text-navy-700 p-2.5 rounded-xl shadow-sm"><ImagePlus size={20} /></span>}
          <span className="text-xs font-bold text-navy-700">{busy ? 'Memproses…' : 'Pilih foto'}</span>
          <span className="text-[10px] text-navy-500">JPG/PNG/WEBP · maks 8 MB</span>
        </button>
      )}
    </Field>
  );
}

const fmtRp = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;

export default function BusinessRegister() {
  const { user, becomePelaku } = useAuth();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const draftKey = `pl_business_draft_${user?.id ?? 'anon'}`;

  const [form, setForm] = useState(() => {
    if (editId) return emptyForm();
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
      return d ? { ...emptyForm(), ...d.form } : emptyForm();
    } catch {
      return emptyForm();
    }
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [restored, setRestored] = useState(() => !editId && Boolean(localStorage.getItem(draftKey)));
  const [editing, setEditing] = useState(null);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const [demoNote, setDemoNote] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');
  const [flyTo, setFlyTo] = useState(null);
  const topRef = useRef(null);

  // muat pengajuan yang ditolak untuk diperbaiki
  useEffect(() => {
    if (!editId) return;
    const local = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]').find((s) => String(s.id) === editId);
    if (local) {
      setForm(toForm(local));
      setEditing({ source: 'local', id: local.id, review: local.review });
      return;
    }
    const token = localStorage.getItem('pl_token');
    if (!token) return;
    axios.get('/api/businesses/mine', { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        const row = data.find((b) => String(b.id) === editId);
        if (row) {
          setForm(toForm(row));
          setEditing({ source: 'api', id: row.id, review: row.review_note ? { note: row.review_note } : null });
        }
      })
      .catch(() => {});
  }, [editId]);

  // draf otomatis agar isian tidak hilang saat halaman tertutup
  useEffect(() => {
    if (editing || done) return undefined;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ form, at: Date.now() }));
      } catch {
        localStorage.setItem(draftKey, JSON.stringify({ form: { ...form, photos: emptyForm().photos, owner_id_doc: null }, at: Date.now() }));
      }
    }, 600);
    return () => clearTimeout(t);
  }, [form, draftKey, editing, done]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setForm((f) => ({ ...f, address_detail: { ...f.address_detail, [k]: v } }));
  const setHours = (day, patch) => setForm((f) => ({ ...f, open_hours: { ...f.open_hours, [day]: { ...f.open_hours[day], ...patch } } }));
  const toggleIn = (k, key) => setForm((f) => ({ ...f, [k]: f[k].includes(key) ? f[k].filter((x) => x !== key) : [...f[k], key] }));

  const cat = CATEGORY_OPTIONS.find((c) => c.key === form.category);
  const pos = form.latitude != null ? [form.latitude, form.longitude] : null;

  const goTo = (n) => {
    setStep(n);
    setErrors({});
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const next = () => {
    const e = validateStep(step, form);
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector('[aria-invalid="true"], [role="alert"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    goTo(step + 1);
  };

  const resetDraft = () => {
    localStorage.removeItem(draftKey);
    setForm(emptyForm());
    setRestored(false);
    goTo(0);
  };

  const setPin = ([lat, lng]) => setForm((f) => ({ ...f, latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeoMsg('Browser tidak mendukung lokasi.');
    setGeoBusy(true);
    setGeoMsg('');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pt = [p.coords.latitude, p.coords.longitude];
        setPin(pt);
        setFlyTo(pt);
        setGeoBusy(false);
        setGeoMsg(`Akurasi GPS ±${Math.round(p.coords.accuracy)} m — geser pin bila perlu.`);
      },
      (err) => {
        setGeoBusy(false);
        setGeoMsg(err.code === 1 ? 'Izin lokasi ditolak. Klik peta untuk menandai lokasi.' : 'Lokasi belum terdeteksi. Klik peta untuk menandai lokasi.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // isi alamat dari titik pin (OpenStreetMap Nominatim, tanpa API key)
  const fillFromPin = async () => {
    if (!pos) return setGeoMsg('Tandai pin dulu di peta.');
    setGeoBusy(true);
    setGeoMsg('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos[0]}&lon=${pos[1]}&accept-language=id&addressdetails=1`);
      const { address: a = {} } = await res.json();
      // OSM Indonesia: village=kelurahan, suburb/municipality=kecamatan; di DKI city_district=kota adm. & city=provinsi
      const isDki = /jakarta/i.test(a.city ?? '') && Boolean(a.city_district);
      const rw = a.city_block?.match(/RW\s*0*(\d+)/i)?.[1];
      setForm((f) => ({
        ...f,
        address_detail: {
          ...f.address_detail,
          street: f.address_detail.street || [a.road, a.house_number].filter(Boolean).join(' No. '),
          kelurahan: a.village || a.neighbourhood || a.hamlet || f.address_detail.kelurahan,
          kecamatan: a.suburb || a.municipality || a.district || f.address_detail.kecamatan,
          kota: (isDki ? a.city_district : a.city || a.town || a.county || a.regency) || f.address_detail.kota,
          provinsi: (isDki ? 'DKI Jakarta' : a.state) || f.address_detail.provinsi,
          postal_code: a.postcode?.slice(0, 5) || f.address_detail.postal_code,
        },
      }));
      setGeoMsg(`Alamat terisi dari peta${rw ? ` (terdeteksi RW ${rw.padStart(3, '0')})` : ''} — periksa & lengkapi nomor bangunan serta RT/RW.`);
    } catch {
      setGeoMsg('Gagal mengambil alamat. Isi manual saja.');
    } finally {
      setGeoBusy(false);
    }
  };

  const copyMonday = () => setForm((f) => ({ ...f, open_hours: Object.fromEntries(DAYS.map((d) => [d.key, { ...f.open_hours.mon }])) }));

  const record = useMemo(() => (form.latitude != null && form.name ? toRecord(form) : null), [form]);

  const saveLocal = (rec) => {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
    const now = new Date().toISOString();
    const base = { ...rec, status: 'pending', owner: user?.name, owner_phone: user?.phone ?? null, submitted_at: now, review: null };
    const next = editing?.source === 'local'
      ? list.map((s) => (s.id === editing.id ? { ...s, ...base, resubmitted: (s.resubmitted ?? 0) + 1 } : s))
      : [...list, { ...base, id: Date.now() }];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  };

  const submit = async () => {
    for (let i = 0; i < 5; i += 1) {
      const e = validateStep(i, form);
      if (Object.keys(e).length) { setErrors(e); setStep(i); return; }
    }
    if (!agree) return setSubmitError('Centang pernyataan kebenaran data terlebih dahulu.');
    setSubmitError('');
    setLoading(true);
    const rec = toRecord(form);
    const token = localStorage.getItem('pl_token');
    try {
      if (!token || user?.demo) throw Object.assign(new Error('demo'), { offline: true });
      const headers = { Authorization: `Bearer ${token}` };
      if (editing?.source === 'api') await axios.put(`/api/businesses/${editing.id}`, rec, { headers });
      else await axios.post('/api/businesses', rec, { headers });
    } catch (err) {
      const status = err.response?.status;
      if (status && status < 500) {
        setSubmitError(err.response.data?.message ?? 'Data ditolak server. Periksa kembali isian.');
        setLoading(false);
        return;
      }
      try {
        saveLocal(rec);
        setDemoNote(true);
      } catch {
        setSubmitError('Penyimpanan perangkat penuh. Kurangi jumlah/ukuran foto lalu coba lagi.');
        setLoading(false);
        return;
      }
    }
    localStorage.removeItem(draftKey);
    becomePelaku();
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-blue-100 bg-dots flex items-center justify-center p-4 font-body">
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-navy-800/15 p-9 text-center">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }} className="inline-flex w-16 h-16 rounded-full bg-success/10 text-success items-center justify-center">
            <BadgeCheck size={32} />
          </motion.span>
          <h1 className="font-heading font-extrabold text-xl text-navy-800 mt-5">{editing ? 'Perbaikan Terkirim!' : 'Pengajuan Terkirim!'} 🎉</h1>
          <p className="text-sm text-navy-500 mt-2 leading-relaxed">
            <span className="font-bold text-navy-800">{form.name}</span> sedang ditinjau admin. Maksimal <span className="font-bold text-navy-800">24 jam</span> usahamu tayang di peta.
          </p>
          {demoNote && <p className="text-[11px] text-yellow-600 bg-yellow-500/10 rounded-lg px-3 py-2 mt-3">Mode demo: data tersimpan di perangkat karena server database belum terhubung.</p>}
          <div className="flex gap-2.5 mt-6">
            <Link to="/dashboard?view=usaha" className="flex-1 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-bold py-3 rounded-xl transition-colors">Ke Dashboard Usaha</Link>
            <Link to="/explore" className="flex-1 bg-blue-100 hover:bg-blue-200 text-navy-700 text-sm font-bold py-3 rounded-xl transition-colors">Lihat Peta</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const e = errors;

  return (
    <div className="min-h-screen bg-blue-100 bg-dots font-body text-navy-800 py-8 px-4" ref={topRef}>
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-lg">
            <span className="bg-navy-800 text-yellow-500 p-1.5 rounded-full"><MapPin size={16} /></span>
            PesanLokal<span className="text-yellow-500">.</span>
          </Link>
          <Link to="/dashboard?view=usaha" className="ml-auto flex items-center gap-1 text-xs font-bold text-navy-500 hover:text-navy-800 transition-colors">
            <ArrowLeft size={13} /> Kembali
          </Link>
        </motion.div>

        <div className="mt-5">
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl">
            {editing ? 'Perbaiki pengajuan' : <>Daftarkan <span className="italic text-yellow-600 underline decoration-yellow-500 decoration-4 underline-offset-4">usahamu</span></>}
          </h1>
          <p className="text-sm text-navy-500 mt-2">Isi seperti profil usaha di Google Maps. Semua data ditinjau admin ≤ 24 jam, lalu tampil persis sama di halaman detail usaha.</p>
        </div>

        {editing?.review && (
          <div className="mt-4 bg-danger/5 border border-danger/30 rounded-2xl p-4">
            <p className="text-xs font-bold text-danger flex items-center gap-1.5"><CircleAlert size={14} /> Catatan admin pada pengajuan sebelumnya</p>
            {editing.review.reasons?.length > 0 && <ul className="mt-1.5 list-disc pl-5 text-xs text-navy-700 space-y-0.5">{editing.review.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            {editing.review.note && <p className="text-xs text-navy-700 mt-1.5">“{editing.review.note}”</p>}
          </div>
        )}

        {restored && (
          <div className="mt-4 flex items-center gap-3 bg-white border border-blue-200 rounded-xl px-4 py-2.5 text-xs">
            <RotateCcw size={14} className="text-info shrink-0" />
            <span className="flex-1 text-navy-700">Draf sebelumnya dipulihkan otomatis.</span>
            <button type="button" onClick={resetDraft} className="font-bold text-danger hover:underline">Mulai dari awal</button>
            <button type="button" onClick={() => setRestored(false)} className="text-navy-500" aria-label="Tutup info draf"><X size={14} /></button>
          </div>
        )}

        {/* indikator langkah */}
        <nav aria-label="Langkah pendaftaran" className="mt-5 bg-white rounded-2xl shadow-sm border border-blue-200 p-3">
          <ol className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => i < step && goTo(i)}
                  disabled={i > step}
                  aria-current={i === step ? 'step' : undefined}
                  title={s.title}
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-colors ${
                    i < step ? 'bg-success text-white hover:brightness-110' : i === step ? 'bg-navy-800 text-yellow-500' : 'bg-blue-100 text-navy-500'
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </button>
                {i < STEPS.length - 1 && <span className={`flex-1 h-1 rounded-full ${i < step ? 'bg-success' : 'bg-blue-100'}`} />}
              </li>
            ))}
          </ol>
          <div className="flex items-center gap-2.5 mt-3 px-1">
            {(() => { const I = STEPS[step].icon; return <I size={17} className="text-navy-600" />; })()}
            <div>
              <p className="font-heading font-bold text-sm">Langkah {step + 1}/{STEPS.length} · {STEPS[step].title}</p>
              <p className="text-[11px] text-navy-500">{STEPS[step].desc}</p>
            </div>
          </div>
        </nav>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="bg-white rounded-3xl shadow-2xl shadow-navy-800/10 p-6 sm:p-8 mt-4 space-y-5">
            {/* ═══ 1. Informasi usaha ═══ */}
            {step === 0 && (
              <>
                <Field label="Nama usaha" htmlFor="f-name" required hint={`${form.name.length}/80 · tulis seperti di papan nama`} error={e.name}>
                  <TextInput id="f-name" icon={Store} value={form.name} onChange={(ev) => set('name', ev.target.value.slice(0, 80))} placeholder="cth. Warung Aceh Bang Ari" error={e.name} />
                </Field>
                <Field label="Kategori utama" required error={e.category}>
                  <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Kategori utama">
                    {CATEGORY_OPTIONS.map((c) => {
                      const active = form.category === c.key;
                      const Icon = CAT_ICON[c.key];
                      return (
                        <button key={c.key} type="button" role="radio" aria-checked={active} onClick={() => setForm((f) => ({ ...f, category: c.key, services: {} }))}
                          className={`relative text-left border rounded-xl p-3 transition-colors ${active ? 'border-navy-800 bg-navy-800 text-blue-50' : 'border-blue-200 bg-blue-50 hover:border-navy-600'}`}>
                          {active && <span className="absolute top-2 right-2 bg-yellow-500 text-navy-800 rounded-full p-0.5"><Check size={10} strokeWidth={3.5} /></span>}
                          <Icon size={18} className={active ? 'text-yellow-500' : 'text-navy-700'} />
                          <p className="font-heading font-bold text-xs mt-2">{c.label}</p>
                          <p className={`text-[10px] mt-0.5 leading-snug ${active ? 'text-blue-300' : 'text-navy-500'}`}>{c.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Jenis usaha" htmlFor="f-sub" required hint="tampil di bawah nama, seperti di Google Maps" error={e.subcategory}>
                  <TextInput id="f-sub" icon={Tag} value={form.subcategory} onChange={(ev) => set('subcategory', ev.target.value.slice(0, 40))} placeholder="cth. Warung makan Aceh" list="sub-suggest" error={e.subcategory} />
                  <datalist id="sub-suggest">{(cat?.subs ?? []).map((s) => <option key={s} value={s} />)}</datalist>
                  {cat && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {cat.subs.map((s) => <button key={s} type="button" onClick={() => set('subcategory', s)} className="text-[11px] font-semibold text-navy-600 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-full transition-colors">{s}</button>)}
                    </div>
                  )}
                </Field>
                <Field label="Deskripsi usaha" htmlFor="f-desc" required hint={`${form.description.length}/500 · min. 30`} error={e.description}>
                  <div className={`${boxCls(e.description)} items-start`}>
                    <FileText size={16} className="text-navy-500 shrink-0 mt-0.5" />
                    <textarea id="f-desc" aria-invalid={Boolean(e.description)} rows={4} value={form.description} onChange={(ev) => set('description', ev.target.value.slice(0, 500))} placeholder="Ceritakan menu andalan, keunggulan, suasana, atau layananmu…" className={`${plainInput} resize-none`} />
                  </div>
                </Field>
                <Field label="Tahun mulai berdiri" htmlFor="f-year" hint="opsional" error={e.established_year}>
                  <TextInput id="f-year" icon={Clock} inputMode="numeric" value={form.established_year} onChange={(ev) => set('established_year', ev.target.value.replace(/\D/g, '').slice(0, 4))} placeholder={`cth. ${new Date().getFullYear() - 3}`} error={e.established_year} />
                </Field>
              </>
            )}

            {/* ═══ 2. Alamat & lokasi ═══ */}
            {step === 1 && (
              <>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="text-xs font-bold text-navy-700 mr-auto">Titik lokasi di peta <span className="text-danger">*</span></p>
                    <button type="button" onClick={useMyLocation} disabled={geoBusy} className="flex items-center gap-1.5 text-[11px] font-bold text-navy-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-full transition-colors">
                      <LocateFixed size={12} /> Pakai lokasi saya
                    </button>
                    <button type="button" onClick={fillFromPin} disabled={geoBusy || !pos} className="flex items-center gap-1.5 text-[11px] font-bold text-navy-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 px-3 py-1.5 rounded-full transition-colors">
                      {geoBusy ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />} Isi alamat dari pin
                    </button>
                  </div>
                  <div className={`rounded-2xl overflow-hidden border-2 transition-colors ${e.pin ? 'border-danger' : pos ? 'border-success/60' : 'border-blue-200'}`}>
                    <MapContainer center={pos ?? DEFAULT_CENTER} zoom={pos ? 17 : 14} className="h-72 w-full">
                      <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png" attribution="&copy; Stadia Maps &copy; OpenStreetMap" />
                      <LocationPicker pos={pos} onPick={setPin} />
                      <Recenter pos={flyTo} />
                    </MapContainer>
                  </div>
                  <p className="text-[11px] text-navy-500 mt-1.5">Klik peta atau seret pin tepat ke pintu masuk usaha — titik ini dipakai konsumen untuk rute.</p>
                  {geoMsg && <p className="text-[11px] font-semibold text-info mt-1">{geoMsg}</p>}
                  {e.pin && <p role="alert" className="flex items-center gap-1 text-[11px] font-semibold text-danger mt-1"><CircleAlert size={11} /> {e.pin}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude" htmlFor="f-lat">
                    <TextInput id="f-lat" type="number" step="0.000001" value={form.latitude ?? ''} onChange={(ev) => ev.target.value !== '' && setForm((f) => ({ ...f, latitude: Number(ev.target.value), longitude: f.longitude ?? DEFAULT_CENTER[1] }))} onBlur={() => pos && setFlyTo([...pos])} placeholder="-6.236889" />
                  </Field>
                  <Field label="Longitude" htmlFor="f-lng">
                    <TextInput id="f-lng" type="number" step="0.000001" value={form.longitude ?? ''} onChange={(ev) => ev.target.value !== '' && setForm((f) => ({ ...f, longitude: Number(ev.target.value), latitude: f.latitude ?? DEFAULT_CENTER[0] }))} onBlur={() => pos && setFlyTo([...pos])} placeholder="106.847275" />
                  </Field>
                </div>
                <Field label="Nama jalan & nomor" htmlFor="f-street" required error={e.street}>
                  <TextInput id="f-street" icon={MapPin} value={form.address_detail.street} onChange={(ev) => setAddr('street', ev.target.value)} placeholder="cth. Jl. Tebet Barat Dalam V No. 1" error={e.street} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="RT/RW" htmlFor="f-rtrw" hint="opsional" error={e.rt_rw}>
                    <TextInput id="f-rtrw" value={form.address_detail.rt_rw} onChange={(ev) => setAddr('rt_rw', ev.target.value.replace(/[^\d/]/g, '').slice(0, 7))} placeholder="006/003" error={e.rt_rw} />
                  </Field>
                  <Field label="Kelurahan/Desa" htmlFor="f-kel" required error={e.kelurahan}>
                    <TextInput id="f-kel" value={form.address_detail.kelurahan} onChange={(ev) => setAddr('kelurahan', ev.target.value)} placeholder="Tebet Barat" error={e.kelurahan} />
                  </Field>
                  <Field label="Kecamatan" htmlFor="f-kec" required error={e.kecamatan}>
                    <TextInput id="f-kec" value={form.address_detail.kecamatan} onChange={(ev) => setAddr('kecamatan', ev.target.value)} placeholder="Tebet" error={e.kecamatan} />
                  </Field>
                  <Field label="Kota/Kabupaten" htmlFor="f-kota" required error={e.kota}>
                    <TextInput id="f-kota" value={form.address_detail.kota} onChange={(ev) => setAddr('kota', ev.target.value)} placeholder="Jakarta Selatan" error={e.kota} />
                  </Field>
                  <Field label="Provinsi" htmlFor="f-prov">
                    <TextInput id="f-prov" value={form.address_detail.provinsi} onChange={(ev) => setAddr('provinsi', ev.target.value)} />
                  </Field>
                  <Field label="Kode pos" htmlFor="f-pos" hint="opsional" error={e.postal_code}>
                    <TextInput id="f-pos" inputMode="numeric" value={form.address_detail.postal_code} onChange={(ev) => setAddr('postal_code', ev.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="12810" error={e.postal_code} />
                  </Field>
                </div>
                <Field label="Patokan" htmlFor="f-land" hint="opsional · bantu konsumen menemukanmu">
                  <TextInput id="f-land" icon={Info} value={form.address_detail.landmark} onChange={(ev) => setAddr('landmark', ev.target.value.slice(0, 80))} placeholder="cth. Seberang masjid, sebelah minimarket" />
                </Field>
                {form.address_detail.street && (
                  <p className="text-xs text-navy-600 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5"><span className="font-bold">Tampil sebagai:</span> {composeAddress(form.address_detail)}</p>
                )}
              </>
            )}

            {/* ═══ 3. Kontak & jam buka ═══ */}
            {step === 2 && (
              <>
                <Field label="Nomor WhatsApp / telepon usaha" htmlFor="f-phone" required hint="dipakai tombol Hubungi & WhatsApp" error={e.phone}>
                  <TextInput id="f-phone" icon={Phone} inputMode="tel" value={form.phone} onChange={(ev) => set('phone', ev.target.value.replace(/[^\d+\s-]/g, '').slice(0, 16))} placeholder="0857-7010-5855" error={e.phone} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Situs web" htmlFor="f-web" hint="opsional" error={e.website}>
                    <TextInput id="f-web" icon={Globe} value={form.website} onChange={(ev) => set('website', ev.target.value.trim())} placeholder="warungbangari.com" error={e.website} />
                  </Field>
                  <Field label="Instagram" htmlFor="f-ig" hint="opsional" error={e.instagram}>
                    <TextInput id="f-ig" icon={AtSign} value={form.instagram} onChange={(ev) => set('instagram', ev.target.value.trim())} placeholder="warungacehbangari" error={e.instagram} />
                  </Field>
                </div>
                <Field label="Jam operasional" required error={e.hours} hint="tampil sebagai “Buka · Tutup pukul …”">
                  <div className="border border-blue-200 rounded-2xl divide-y divide-blue-100 overflow-hidden">
                    {DAYS.map((d) => {
                      const h = form.open_hours[d.key];
                      return (
                        <div key={d.key} className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5 ${h.open ? 'bg-white' : 'bg-blue-50/60'}`}>
                          <label className="flex items-center gap-2 w-28 cursor-pointer">
                            <input type="checkbox" checked={h.open} onChange={(ev) => setHours(d.key, { open: ev.target.checked })} className="w-4 h-4 accent-navy-800" />
                            <span className={`text-sm font-semibold ${h.open ? 'text-navy-800' : 'text-navy-500'}`}>{d.label}</span>
                          </label>
                          {h.open ? (
                            <>
                              <label className="flex items-center gap-1.5 text-xs text-navy-600 cursor-pointer">
                                <input type="checkbox" checked={h.allDay} onChange={(ev) => setHours(d.key, { allDay: ev.target.checked })} className="w-3.5 h-3.5 accent-navy-800" /> 24 jam
                              </label>
                              {!h.allDay && (
                                <div className="flex items-center gap-1.5 ml-auto">
                                  <input type="time" aria-label={`Jam buka ${d.label}`} value={h.from} onChange={(ev) => setHours(d.key, { from: ev.target.value })} className="bg-blue-50 border border-blue-200 focus:border-navy-600 rounded-lg px-2 py-1.5 text-sm outline-none" />
                                  <span className="text-navy-500 text-xs">–</span>
                                  <input type="time" aria-label={`Jam tutup ${d.label}`} value={h.to} onChange={(ev) => setHours(d.key, { to: ev.target.value })} className="bg-blue-50 border border-blue-200 focus:border-navy-600 rounded-lg px-2 py-1.5 text-sm outline-none" />
                                </div>
                              )}
                            </>
                          ) : <span className="text-xs text-navy-500 ml-auto">Tutup</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-navy-500">Tutup lewat tengah malam? Isi saja, mis. 16:00 – 03:00.</p>
                    <button type="button" onClick={copyMonday} className="flex items-center gap-1 text-[11px] font-bold text-info hover:underline"><Copy size={11} /> Samakan dengan Senin</button>
                  </div>
                </Field>
              </>
            )}

            {/* ═══ 4. Foto ═══ */}
            {step === 3 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <PhotoSlot label="Foto tampak depan" hint="papan nama/etalase terlihat" required value={form.photos.front} onChange={(v) => set('photos', { ...form.photos, front: v })} error={e.front} />
                  <PhotoSlot label="Foto kondisi tempat usaha" hint="area dalam/tempat duduk/dapur" required value={form.photos.interior} onChange={(v) => set('photos', { ...form.photos, interior: v })} error={e.interior} />
                </div>
                <div>
                  <p className="text-xs font-bold text-navy-700 mb-1.5">Foto produk/menu <span className="font-normal text-navy-500">· opsional, maks. 3</span></p>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                      <PhotoSlot
                        key={i}
                        label={`Produk ${i + 1}`}
                        value={form.photos.products[i] ?? null}
                        onChange={(v) => {
                          const list = [...form.photos.products];
                          if (v) list[i] = v; else list.splice(i, 1);
                          set('photos', { ...form.photos, products: list.filter(Boolean) });
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="border-t border-blue-100 pt-5">
                  <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                    <Lock size={15} className="text-navy-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-navy-700 leading-relaxed">Foto KTP <b>hanya dilihat admin</b> untuk memastikan pemilik usaha asli, tidak pernah ditampilkan ke konsumen. Opsional, tetapi mempercepat verifikasi.</p>
                  </div>
                  <div className="sm:w-1/2">
                    <PhotoSlot label="Foto KTP pemilik" hint="opsional" private value={form.owner_id_doc} onChange={(v) => set('owner_id_doc', v)} />
                  </div>
                </div>
              </>
            )}

            {/* ═══ 5. Detail tambahan ═══ */}
            {step === 4 && (
              <>
                <Field label="Kisaran harga per orang" hint="opsional · tampil seperti “Rp25.000–50.000”" error={e.price}>
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput icon={Wallet} inputMode="numeric" aria-label="Harga terendah" value={form.price_min} onChange={(ev) => set('price_min', ev.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="Terendah, cth. 15000" error={e.price} />
                    <TextInput icon={Wallet} inputMode="numeric" aria-label="Harga tertinggi" value={form.price_max} onChange={(ev) => set('price_max', ev.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="Tertinggi, cth. 50000" error={e.price} />
                  </div>
                </Field>
                <Field label="Opsi layanan" hint="tampil sebagai ✓ Makan di tempat · ✓ Bawa pulang">
                  <div className="flex flex-wrap gap-2">
                    {(SERVICE_OPTIONS[form.category] ?? []).map(([k, l]) => (
                      <Chip key={k} active={Boolean(form.services[k])} onClick={() => set('services', { ...form.services, [k]: !form.services[k] })}>{l}</Chip>
                    ))}
                  </div>
                </Field>
                <Field label="Metode pembayaran" required error={e.payments}>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_OPTIONS.map(([k, l]) => <Chip key={k} active={form.payments.includes(k)} onClick={() => toggleIn('payments', k)}>{l}</Chip>)}
                  </div>
                </Field>
                <Field label="Fasilitas" hint="opsional">
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map(([k, l]) => <Chip key={k} active={form.amenities.includes(k)} onClick={() => toggleIn('amenities', k)}>{l}</Chip>)}
                  </div>
                </Field>
                <Field label={form.category === 'jasa' ? 'Daftar layanan & harga' : 'Menu / produk & harga'} hint={`${form.menu.length}/15 · opsional`} error={e.menu}>
                  <div className="space-y-2">
                    {form.menu.map((m, i) => (
                      <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2 items-start bg-blue-50 border border-blue-200 rounded-xl p-2">
                        <div className="space-y-1.5">
                          <input aria-label={`Nama item ${i + 1}`} value={m.name} onChange={(ev) => set('menu', form.menu.map((x, j) => (j === i ? { ...x, name: ev.target.value.slice(0, 60) } : x)))} placeholder="Nama item" className="w-full bg-white border border-blue-200 focus:border-navy-600 rounded-lg px-2.5 py-1.5 text-sm outline-none" />
                          <input aria-label={`Keterangan item ${i + 1}`} value={m.desc} onChange={(ev) => set('menu', form.menu.map((x, j) => (j === i ? { ...x, desc: ev.target.value.slice(0, 80) } : x)))} placeholder="Keterangan (opsional)" className="w-full bg-white border border-blue-200 focus:border-navy-600 rounded-lg px-2.5 py-1.5 text-xs outline-none" />
                        </div>
                        <input aria-label={`Harga item ${i + 1}`} inputMode="numeric" value={m.price} onChange={(ev) => set('menu', form.menu.map((x, j) => (j === i ? { ...x, price: ev.target.value.replace(/\D/g, '').slice(0, 7) } : x)))} placeholder="Harga" className="w-full bg-white border border-blue-200 focus:border-navy-600 rounded-lg px-2.5 py-1.5 text-sm outline-none" />
                        <button type="button" onClick={() => set('menu', form.menu.filter((_, j) => j !== i))} className="p-2 text-navy-500 hover:text-danger rounded-lg transition-colors" aria-label={`Hapus item ${i + 1}`}><Trash2 size={15} /></button>
                      </div>
                    ))}
                    {form.menu.length < 15 && (
                      <button type="button" onClick={() => set('menu', [...form.menu, { name: '', price: '', desc: '' }])} className="flex items-center gap-1.5 text-xs font-bold text-navy-700 border border-dashed border-blue-300 hover:border-navy-600 w-full justify-center py-2.5 rounded-xl transition-colors">
                        <ListPlus size={14} /> Tambah item
                      </button>
                    )}
                  </div>
                </Field>
              </>
            )}

            {/* ═══ 6. Tinjau ═══ */}
            {step === 5 && record && (
              <>
                {/* pratinjau seperti panel detail di peta */}
                <div className="border border-blue-200 rounded-2xl overflow-hidden">
                  <div className="relative h-40 bg-blue-100">
                    {record.photos.front && <img src={record.photos.front} alt="" className="w-full h-full object-cover" />}
                    <span className="absolute top-2 left-2 bg-white/95 text-navy-700 text-[10px] font-bold px-2 py-1 rounded-md">Pratinjau di peta</span>
                  </div>
                  <div className="p-4">
                    <p className="font-heading font-bold text-lg">{record.name}</p>
                    <p className="text-sm text-navy-500">
                      {record.subcategory}{record.price_range && ` · ${fmtRp(record.price_range.min)}–${fmtRp(record.price_range.max).replace('Rp', '')}`}
                    </p>
                    {Object.values(record.services).some(Boolean) && (
                      <p className="text-xs text-navy-700 mt-2 flex flex-wrap gap-x-2">
                        {Object.entries(record.services).filter(([, v]) => v).map(([k]) => <span key={k} className="flex items-center gap-1"><Check size={12} className="text-success" />{labelOf(SERVICE_OPTIONS[record.category], k)}</span>)}
                      </p>
                    )}
                  </div>
                </div>

                {[
                  { n: 0, title: 'Informasi Usaha', rows: [['Nama', record.name], ['Kategori', `${labelOf(CATEGORY_OPTIONS.map((c) => [c.key, c.label]), record.category)} · ${record.subcategory}`], ['Deskripsi', record.description], ['Berdiri', record.established_year]] },
                  { n: 1, title: 'Alamat & Lokasi', rows: [['Alamat', record.address], ['Patokan', record.address_detail.landmark], ['Koordinat', `${record.latitude}, ${record.longitude}`]] },
                  { n: 2, title: 'Kontak & Jam Buka', rows: [['Telepon/WA', record.phone], ['Situs web', record.website], ['Instagram', record.instagram], ['Jam buka', DAYS.map((d) => `${d.label.slice(0, 3)} ${record.open_hours[d.key]}`).join(' · ')]] },
                  { n: 3, title: 'Foto', rows: [['Tampak depan', record.photos.front ? '✓ terlampir' : null], ['Kondisi tempat', record.photos.interior ? '✓ terlampir' : null], ['Produk', record.photos.products.length ? `${record.photos.products.length} foto` : null], ['KTP (admin)', record.owner_id_doc ? '✓ terlampir' : null]] },
                  { n: 4, title: 'Detail Tambahan', rows: [['Pembayaran', record.payments.map((k) => labelOf(PAYMENT_OPTIONS, k)).join(', ')], ['Fasilitas', record.amenities.map((k) => labelOf(AMENITY_OPTIONS, k)).join(', ')], ['Menu', record.menu.length ? `${record.menu.length} item` : null]] },
                ].map((sec) => (
                  <section key={sec.title} className="border border-blue-200 rounded-2xl">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100 bg-blue-50/60">
                      <p className="font-heading font-bold text-sm">{sec.title}</p>
                      <button type="button" onClick={() => goTo(sec.n)} className="flex items-center gap-1 text-[11px] font-bold text-info hover:underline"><Pencil size={11} /> Ubah</button>
                    </div>
                    <dl className="px-4 py-2 text-sm">
                      {sec.rows.map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[7rem_1fr] gap-3 py-1.5 border-b border-blue-50 last:border-0">
                          <dt className="text-xs text-navy-500 pt-0.5">{k}</dt>
                          <dd className={v ? 'text-navy-800 break-words' : 'text-navy-500 text-xs pt-0.5'}>{v || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={agree} onChange={(ev) => setAgree(ev.target.checked)} className="mt-0.5 w-4 h-4 accent-navy-800" />
                  <span className="text-xs text-navy-600 leading-relaxed">Saya menyatakan data di atas benar, usaha ini milik saya/saya kelola, dan siap ditinjau admin sesuai <span className="font-bold text-navy-800">Syarat & Ketentuan</span>.</span>
                </label>
                <p className="flex items-center gap-1.5 text-[11px] text-navy-500"><User size={12} /> Diajukan sebagai <b className="text-navy-700">{user?.name}</b></p>
                {submitError && <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-danger bg-danger/10 rounded-lg px-3 py-2"><CircleAlert size={13} /> {submitError}</p>}
              </>
            )}

            {/* navigasi langkah */}
            <div className="flex items-center gap-2.5 pt-4 border-t border-blue-100">
              {step > 0 && (
                <button type="button" onClick={() => goTo(step - 1)} className="flex items-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-navy-700 text-sm font-heading font-bold px-4 py-3 rounded-xl transition-colors">
                  <ArrowLeft size={15} /> Sebelumnya
                </button>
              )}
              {Object.keys(errors).length > 0 && <p className="text-[11px] font-semibold text-danger">Lengkapi {Object.keys(errors).length} isian yang ditandai.</p>}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} className="ml-auto flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-heading font-bold px-5 py-3 rounded-xl transition-colors">
                  Lanjut <ArrowRight size={15} />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={loading} className="ml-auto flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-navy-800 text-sm font-heading font-bold px-5 py-3 rounded-xl shadow-lg shadow-yellow-500/25 transition-colors">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {editing ? 'Kirim Perbaikan' : 'Ajukan Pendaftaran'}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        <p className="text-[11px] text-navy-500 text-center mt-4">Isian tersimpan otomatis sebagai draf di perangkat ini.</p>
      </div>
    </div>
  );
}
