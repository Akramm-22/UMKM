import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Store, User, Phone, Clock, FileText, ImagePlus, X, Check, CircleAlert,
  ArrowRight, ArrowLeft, UtensilsCrossed, Wrench, ShoppingBasket, Send, BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_CENTER = [-6.2, 106.816666];

const CATEGORIES = [
  { key: 'Kuliner', icon: UtensilsCrossed, desc: 'Warung, kue, kopi, catering' },
  { key: 'Jasa', icon: Wrench, desc: 'Laundry, servis, pangkas, jahit' },
  { key: 'Toko', icon: ShoppingBasket, desc: 'Sembako, kelontong, agen' },
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
  return pos ? <Marker position={pos} icon={pickIcon} /> : null;
}

// kolom berlabel dengan error inline — konsisten dengan form registrasi akun
function Field({ label, hint, error, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-xs font-bold text-navy-700">{label}</label>
        {hint && <span className="text-[10px] text-navy-500">{hint}</span>}
      </div>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-[11px] font-semibold text-danger mt-1.5"
          >
            <CircleAlert size={11} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls = (error) =>
  `w-full flex items-center gap-3 border rounded-xl px-4 py-3 text-sm text-navy-800 outline-none transition-colors placeholder:text-navy-500/50 ${
    error ? 'bg-danger/5 border-danger' : 'bg-blue-50 border-transparent focus-within:border-navy-600 focus:border-navy-600 focus-within:bg-white focus:bg-white'
  }`;

// nomor section bergaya editorial
function SectionHead({ n, title, desc }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 h-8 shrink-0 rounded-full bg-navy-800 text-yellow-500 font-heading font-extrabold text-xs flex items-center justify-center">{n}</span>
      <div>
        <p className="font-heading font-bold text-sm text-navy-800">{title}</p>
        <p className="text-[11px] text-navy-500">{desc}</p>
      </div>
    </div>
  );
}

export default function BusinessRegister() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', category: '', description: '', phone: '', address: '', open_hours: '' });
  const [pos, setPos] = useState(null);
  const [photo, setPhoto] = useState(null); // preview lokal (upload file menyusul saat storage siap)
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [demoNote, setDemoNote] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const touch = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const errors = {
    name: form.name.trim().length < 3 ? 'Nama usaha minimal 3 huruf' : null,
    category: !form.category ? 'Pilih satu kategori' : null,
    phone: form.phone && !/^08\d{8,11}$/.test(form.phone.trim()) ? 'Format 08xxxxxxxxxx (10–13 digit)' : null,
    pos: !pos ? 'Tandai lokasi usahamu di peta' : null,
  };
  const showErr = (k) => (touched[k] ? errors[k] : null);
  const isValid = !errors.name && !errors.category && !errors.phone && !errors.pos;

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto({ url: URL.createObjectURL(file), name: file.name, size: (file.size / 1024).toFixed(0) });
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, category: true, phone: true, pos: true });
    if (!isValid) return;
    setLoading(true);
    const payload = { ...form, latitude: pos[0], longitude: pos[1] };
    try {
      await axios.post('/api/businesses', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pl_token')}` },
      });
    } catch {
      // server/DB belum terhubung — simpan lokal agar alur demo tetap jalan
      const saved = JSON.parse(localStorage.getItem('pl_demo_businesses') ?? '[]');
      saved.push({ ...payload, id: Date.now(), status: 'pending', owner: user?.name });
      localStorage.setItem('pl_demo_businesses', JSON.stringify(saved));
      setDemoNote(true);
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-blue-100 bg-dots flex items-center justify-center p-4 font-body">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-navy-800/15 p-9 text-center"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
            className="inline-flex w-16 h-16 rounded-full bg-success/10 text-success items-center justify-center"
          >
            <BadgeCheck size={32} />
          </motion.span>
          <h1 className="font-heading font-extrabold text-xl text-navy-800 mt-5">Pengajuan Terkirim! 🎉</h1>
          <p className="text-sm text-navy-500 mt-2 leading-relaxed">
            <span className="font-bold text-navy-800">{form.name}</span> sedang ditinjau admin.
            Maksimal <span className="font-bold text-navy-800">24 jam</span> usahamu tayang di peta.
          </p>
          {demoNote && (
            <p className="text-[11px] text-yellow-600 bg-yellow-500/10 rounded-lg px-3 py-2 mt-3">
              Mode demo: data tersimpan lokal karena server database belum terhubung.
            </p>
          )}
          <div className="flex gap-2.5 mt-6">
            <Link to="/dashboard" className="flex-1 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-bold py-3 rounded-xl transition-colors">
              Ke Dashboard Usaha
            </Link>
            <Link to="/explore" className="flex-1 bg-blue-100 hover:bg-blue-200 text-navy-700 text-sm font-bold py-3 rounded-xl transition-colors">
              Lihat Peta
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-100 bg-dots font-body text-navy-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* header */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-lg">
            <span className="bg-navy-800 text-yellow-500 p-1.5 rounded-full"><MapPin size={16} /></span>
            PesanLokal<span className="text-yellow-500">.</span>
          </Link>
          <Link to="/dashboard" className="ml-auto flex items-center gap-1 text-xs font-bold text-navy-500 hover:text-navy-800 transition-colors">
            <ArrowLeft size={13} /> Kembali
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-5">
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl">
            Daftarkan <span className="italic text-yellow-600 underline decoration-yellow-500 decoration-4 underline-offset-4">usahamu</span>
          </h1>
          <p className="text-sm text-navy-500 mt-2">
            Isi sekali, ditinjau admin ≤ 24 jam, lalu tayang di peta untuk semua tetangga. Gratis selamanya.
          </p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl shadow-2xl shadow-navy-800/10 p-6 sm:p-8 mt-6 space-y-8"
        >
          {/* 01 — pemilik */}
          <section className="space-y-4">
            <SectionHead n="01" title="Informasi Pemilik" desc="Diambil dari akunmu — hubungi admin untuk ubah." />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nama Pemilik">
                <div className={`${inputCls(null)} flex bg-blue-100/70 text-navy-500`}>
                  <User size={16} className="shrink-0" />
                  <span className="text-sm font-semibold">{user?.name ?? '—'}</span>
                </div>
              </Field>
              <Field label="Nomor WhatsApp Usaha" hint="opsional" error={showErr('phone')}>
                <div className={`${inputCls(showErr('phone'))} flex`}>
                  <Phone size={16} className="text-navy-500 shrink-0" />
                  <input
                    value={form.phone}
                    onChange={set('phone')}
                    onBlur={touch('phone')}
                    placeholder="08xxxxxxxxxx"
                    inputMode="numeric"
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </Field>
            </div>
          </section>

          {/* 02 — detail usaha */}
          <section className="space-y-4">
            <SectionHead n="02" title="Detail Usaha" desc="Nama dan kategori tampil di peta & hasil pencarian." />
            <Field label="Nama Usaha" error={showErr('name')}>
              <div className={`${inputCls(showErr('name'))} flex`}>
                <Store size={16} className="text-navy-500 shrink-0" />
                <input
                  value={form.name}
                  onChange={set('name')}
                  onBlur={touch('name')}
                  placeholder="cth. Warung Nasi Bu Siti"
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </Field>
            <Field label="Kategori" error={showErr('category')}>
              <div className="grid grid-cols-3 gap-2.5">
                {CATEGORIES.map((c) => {
                  const active = form.category === c.key;
                  return (
                    <motion.button
                      key={c.key}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setForm((f) => ({ ...f, category: c.key })); setTouched((t) => ({ ...t, category: true })); }}
                      className={`relative text-left border rounded-xl p-3 transition-colors ${
                        active ? 'border-navy-800 bg-navy-800 text-blue-50' : 'border-blue-200 bg-blue-50 hover:border-navy-600'
                      }`}
                    >
                      {active && <span className="absolute top-2 right-2 bg-yellow-500 text-navy-800 rounded-full p-0.5"><Check size={10} strokeWidth={3.5} /></span>}
                      <c.icon size={18} className={active ? 'text-yellow-500' : 'text-navy-700'} />
                      <p className="font-heading font-bold text-xs mt-2">{c.key}</p>
                      <p className={`text-[10px] mt-0.5 leading-snug ${active ? 'text-blue-300' : 'text-navy-500'}`}>{c.desc}</p>
                    </motion.button>
                  );
                })}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Jam Buka" hint="opsional">
                <div className={`${inputCls(null)} flex`}>
                  <Clock size={16} className="text-navy-500 shrink-0" />
                  <input value={form.open_hours} onChange={set('open_hours')} placeholder="cth. 06.00–21.00" className="w-full bg-transparent outline-none" />
                </div>
              </Field>
              <Field label="Alamat Singkat" hint="opsional">
                <div className={`${inputCls(null)} flex`}>
                  <MapPin size={16} className="text-navy-500 shrink-0" />
                  <input value={form.address} onChange={set('address')} placeholder="cth. Jl. Melati No. 3" className="w-full bg-transparent outline-none" />
                </div>
              </Field>
            </div>
            <Field label="Deskripsi" hint={`${form.description.length}/200 · opsional`}>
              <div className={`${inputCls(null)} flex items-start`}>
                <FileText size={16} className="text-navy-500 shrink-0 mt-0.5" />
                <textarea
                  value={form.description}
                  onChange={(e) => e.target.value.length <= 200 && set('description')(e)}
                  placeholder="Ceritakan menu andalan, keunggulan, atau layananmu…"
                  rows={3}
                  className="w-full bg-transparent outline-none resize-none"
                />
              </div>
            </Field>
          </section>

          {/* 03 — lokasi */}
          <section className="space-y-4">
            <SectionHead n="03" title="Lokasi di Peta" desc="Klik titik lokasi usahamu — ini yang dilihat konsumen." />
            <div className={`rounded-2xl overflow-hidden border-2 transition-colors ${showErr('pos') ? 'border-danger' : pos ? 'border-success/60' : 'border-blue-200'}`}>
              <MapContainer center={DEFAULT_CENTER} zoom={14} className="h-64 w-full" attributionControl={false}>
                <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png" />
                <LocationPicker pos={pos} onPick={(p) => { setPos(p); setTouched((t) => ({ ...t, pos: true })); }} />
              </MapContainer>
            </div>
            {pos ? (
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-success">
                <Check size={12} /> Lokasi ditandai: {pos[0].toFixed(5)}, {pos[1].toFixed(5)} — klik lagi untuk memindah.
              </p>
            ) : (
              showErr('pos') && <p className="flex items-center gap-1 text-[11px] font-semibold text-danger"><CircleAlert size={11} /> {errors.pos}</p>
            )}
          </section>

          {/* 04 — foto */}
          <section className="space-y-4">
            <SectionHead n="04" title="Foto Usaha" desc="Opsional — foto tempat/produk menaikkan kepercayaan pembeli." />
            {photo ? (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <img src={photo.url} alt="Pratinjau foto usaha" className="w-16 h-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{photo.name}</p>
                  <p className="text-[10px] text-navy-500">{photo.size} KB</p>
                </div>
                <button type="button" onClick={() => setPhoto(null)} className="text-navy-500 hover:text-danger p-1.5 transition-colors" aria-label="Hapus foto">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-blue-300 hover:border-navy-600 bg-blue-50/60 rounded-2xl py-8 cursor-pointer transition-colors">
                <span className="bg-white text-navy-700 p-2.5 rounded-xl shadow-sm"><ImagePlus size={20} /></span>
                <p className="text-xs font-bold">Klik untuk unggah foto</p>
                <p className="text-[10px] text-navy-500">JPG/PNG, maks 5 MB</p>
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
              </label>
            )}
          </section>

          {/* submit */}
          <div className="pt-2 border-t border-blue-100">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-navy-800 font-heading font-bold py-4 rounded-xl shadow-lg shadow-yellow-500/25 transition-colors"
            >
              {loading ? 'Mengirim…' : 'Ajukan Pendaftaran Usaha'} {!loading && <Send size={16} />}
            </motion.button>
            <p className="text-[11px] text-navy-500 text-center mt-3">
              Dengan mengajukan, kamu menyatakan data usaha benar & siap ditinjau admin sesuai <span className="font-bold text-navy-800">Syarat & Ketentuan</span>.
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
