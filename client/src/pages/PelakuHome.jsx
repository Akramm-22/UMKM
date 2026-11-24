import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  MapPin, Plus, ArrowRight, BadgeCheck, Wallet, MessageCircle, Megaphone, ClipboardList, FileText, Hourglass, LayoutGrid,
  Camera, Phone, Clock, UtensilsCrossed, IdCard, ChevronDown, Sparkles, Store, Map as MapIcon,
} from 'lucide-react';
import ProfileMenu from '../components/ProfileMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.45, ease: 'easeOut', delay },
});

const BENEFITS = [
  { icon: MapPin, t: 'Tampil di peta sekitar', d: 'Warga di radius terdekat menemukan usahamu saat mencari kebutuhan harian.' },
  { icon: Wallet, t: 'Gratis, tanpa komisi', d: 'Tidak ada biaya pendaftaran maupun potongan dari penjualan.' },
  { icon: MessageCircle, t: 'Dihubungi langsung', d: 'Konsumen menghubungimu via WhatsApp & mendapat rute ke lokasimu.' },
  { icon: Megaphone, t: 'Promo & status buka', d: 'Pasang promo dan tandai buka/tutup kapan saja dari dashboard.' },
];

const STEPS = [
  { icon: ClipboardList, t: 'Siapkan data', d: 'Foto tempat, nomor WhatsApp aktif, alamat & jam buka.' },
  { icon: FileText, t: 'Isi formulir', d: 'Sekitar 10 menit — mirip profil usaha di Google Maps.' },
  { icon: Hourglass, t: 'Verifikasi ≤ 24 jam', d: 'Admin memeriksa kebenaran data agar konsumen percaya.' },
  { icon: LayoutGrid, t: 'Tayang & kelola', d: 'Usahamu muncul di peta; kelola dari Dashboard Pelaku Usaha.' },
];

const CHECKLIST = [
  { icon: Camera, t: 'Foto tampak depan & suasana tempat', req: true },
  { icon: Phone, t: 'Nomor WhatsApp/telepon aktif', req: true },
  { icon: MapPin, t: 'Alamat lengkap & titik lokasi di peta', req: true },
  { icon: Clock, t: 'Jam buka per hari', req: true },
  { icon: UtensilsCrossed, t: 'Menu/layanan & kisaran harga', req: false },
  { icon: IdCard, t: 'Foto KTP pemilik (hanya untuk admin)', req: false },
];

const FAQ = [
  { q: 'Berapa lama sampai usaha saya tayang?', a: 'Admin meninjau paling lama 24 jam. Status pengajuan bisa dipantau dari dashboard setelah kamu mendaftar.' },
  { q: 'Bisakah saya mendaftarkan lebih dari satu usaha?', a: 'Bisa. Setiap usaha dikelola terpisah — data, promo, status, dan ulasannya tidak tercampur.' },
  { q: 'Bagaimana jika pengajuan ditolak?', a: 'Kamu akan melihat catatan admin dan bisa memperbaiki data lalu mengajukan ulang.' },
];

// Home Pelaku Usaha: untuk akun pelaku yang belum memiliki usaha terdaftar
export default function PelakuHome() {
  const { user, refreshProfile } = useAuth();
  const [count, setCount] = useState(null);

  // jumlah usaha diambil ulang dari server, bukan dari sesi tersimpan
  useEffect(() => {
    refreshProfile().then((p) => setCount(p?.business_count ?? null)).catch(() => setCount(null));
  }, [refreshProfile]);

  const name = (user?.name ?? '').replace(/\(.*?\)/g, '').trim() || 'Pelaku Usaha';
  const owns = count > 0;
  const cta = owns ? { to: '/dashboard', label: 'Dashboard', Icon: LayoutGrid } : { to: '/daftar-usaha', label: 'Daftar Usaha', Icon: Plus };

  return (
    <div className="min-h-screen bg-blue-50 font-body text-navy-800">
      {/* header */}
      <header className="sticky top-0 z-40 bg-navy-800 text-blue-50">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 font-heading font-extrabold text-lg">
            <span className="bg-yellow-500 text-navy-800 p-1.5 rounded-full"><MapPin size={16} /></span>
            PesanLokal<span className="text-yellow-500">.</span>
          </Link>
          <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-navy-500">Pelaku Usaha</span>
          <nav className="ml-auto flex items-center gap-1.5 sm:gap-3 text-sm font-semibold text-blue-300">
            <Link to="/explore" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-yellow-500 transition-colors"><MapIcon size={15} /> Peta</Link>
            {owns && <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg hover:text-yellow-500 transition-colors"><LayoutGrid size={15} /> Dashboard</Link>}
            <ProfileMenu logoutTo="/login" />
          </nav>
        </div>
      </header>

      {/* sudah punya usaha → arahkan ke dashboard */}
      {count > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-success/10 border-b border-success/20">
          <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
            <BadgeCheck size={18} className="text-success" />
            <span>Kamu sudah memiliki <b>{count} usaha</b> terdaftar.</span>
            <Link to="/dashboard" className="ml-auto inline-flex items-center gap-1.5 bg-navy-800 text-blue-50 text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-navy-700">Buka Dashboard <ArrowRight size={13} /></Link>
          </div>
        </motion.div>
      )}

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="blob-morph absolute -top-24 -right-24 w-96 h-96 bg-yellow-500/15 pointer-events-none" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-5 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 bg-yellow-500/20 text-navy-800 text-xs font-bold px-3 py-1.5 rounded-full"><Sparkles size={13} className="text-yellow-600" /> Selamat datang, {name}</span>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl leading-tight mt-4">
              Bawa usahamu ke <span className="relative inline-block">peta warga<span className="absolute left-0 right-0 bottom-1 h-3 bg-yellow-500/50 -z-10 rounded" /></span> sekitar.
            </h1>
            <p className="text-navy-500 mt-4 max-w-lg leading-relaxed">
              Akunmu sudah siap sebagai Pelaku Usaha. Langkah berikutnya: daftarkan usaha pertamamu. Setelah diverifikasi admin, usahamu tampil di peta dan bisa kamu kelola dari dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
              <Link to={cta.to} className="group inline-flex items-center gap-2.5 bg-yellow-500 hover:bg-yellow-400 text-navy-900 font-heading font-bold pl-3 pr-5 py-3.5 rounded-2xl shadow-xl shadow-yellow-500/30 active:translate-y-px transition-colors">
                <span className="w-8 h-8 rounded-xl bg-navy-900 text-yellow-400 flex items-center justify-center transition-transform group-hover:rotate-90"><cta.Icon size={17} strokeWidth={3} /></span>
                {cta.label}
              </Link>
              <a href="#alur" className="inline-flex items-center gap-1.5 text-sm font-bold text-navy-700 hover:text-navy-900 px-4 py-3.5 rounded-2xl ring-1 ring-blue-200 hover:bg-white transition-colors">Pelajari alurnya <ChevronDown size={15} /></a>
            </div>
            <p className="text-[11px] text-navy-500 mt-4 flex items-center gap-1.5"><Clock size={12} /> ± 10 menit mengisi · verifikasi ≤ 24 jam · gratis</p>
          </motion.div>

          {/* pratinjau kartu usaha di peta */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative" aria-hidden="true">
            <div className="relative aspect-[4/3] rounded-3xl bg-blue-100 bg-dots overflow-hidden ring-1 ring-blue-200 shadow-2xl shadow-navy-800/10">
              <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full">
                <path d="M-10 90 C 90 70, 180 130, 410 100" stroke="#fff" strokeWidth="16" fill="none" />
                <path d="M-10 210 C 120 240, 260 180, 410 220" stroke="#fff" strokeWidth="12" fill="none" />
                <path d="M130 -10 C 150 100, 110 200, 150 310" stroke="#fff" strokeWidth="12" fill="none" />
                <circle cx="230" cy="150" r="90" fill="#B8D8EA" fillOpacity=".35" stroke="#24406B" strokeDasharray="6 6" />
              </svg>
              {[[18, 30, '🍜'], [72, 22, '☕'], [26, 72, '🔧'], [80, 70, '🛒']].map(([x, y, e], i) => (
                <motion.span key={i} className="absolute w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-base" style={{ left: `${x}%`, top: `${y}%` }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 300, damping: 15 }}>{e}</motion.span>
              ))}
              <motion.div className="absolute left-[57.5%] top-[50%] -translate-x-1/2 -translate-y-full" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, type: 'spring', stiffness: 260, damping: 14 }}>
                <div className="w-14 h-14 bg-yellow-500 border-4 border-white -rotate-45 shadow-xl flex items-center justify-center" style={{ borderRadius: '50% 50% 50% 6px' }}>
                  <Store size={20} className="rotate-45 text-navy-900" />
                </div>
              </motion.div>
            </div>
            <motion.div className="absolute -bottom-5 left-4 right-4 sm:left-8 sm:right-auto sm:w-72 bg-white rounded-2xl shadow-xl shadow-navy-800/15 p-4 flex items-center gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <span className="w-11 h-11 rounded-xl bg-yellow-500/20 flex items-center justify-center"><Store size={20} className="text-navy-800" /></span>
              <div className="min-w-0">
                <p className="text-sm font-bold">Usahamu di sini</p>
                <p className="text-[11px] text-navy-500">Terlihat oleh warga dalam radius 2 km</p>
              </div>
              <span className="ml-auto text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded-full">Buka</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* manfaat */}
      <section className="max-w-6xl mx-auto px-5 pt-8 pb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BENEFITS.map((b, i) => (
            <motion.div key={b.t} {...rise(i * 0.06)} className="group bg-white border border-blue-200 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-navy-800/5 transition-all">
              <span className="w-10 h-10 rounded-xl bg-navy-800 text-yellow-400 flex items-center justify-center transition-transform group-hover:-rotate-6"><b.icon size={18} /></span>
              <p className="font-heading font-bold mt-3">{b.t}</p>
              <p className="text-xs text-navy-500 mt-1 leading-relaxed">{b.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* alur + checklist */}
      <section id="alur" className="max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-12 gap-5 items-start scroll-mt-20">
        <motion.div {...rise()} className="lg:col-span-7 bg-white border border-blue-200 rounded-3xl p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-navy-500">Alur pendaftaran</p>
          <h2 className="font-heading font-extrabold text-xl mt-1">4 langkah sampai usahamu tayang</h2>
          <ol className="mt-6 grid sm:grid-cols-2 gap-4">
            {STEPS.map((s, i) => (
              <motion.li key={s.t} {...rise(i * 0.07)} className="relative bg-blue-50 rounded-2xl p-4">
                <span className="absolute top-3 right-4 font-heading font-extrabold text-3xl text-navy-800/10">0{i + 1}</span>
                <span className="w-9 h-9 rounded-xl bg-yellow-500 text-navy-900 flex items-center justify-center"><s.icon size={17} /></span>
                <p className="text-sm font-bold mt-3">{s.t}</p>
                <p className="text-xs text-navy-500 mt-1 leading-relaxed">{s.d}</p>
              </motion.li>
            ))}
          </ol>
        </motion.div>

        <motion.div {...rise(0.1)} className="lg:col-span-5 bg-navy-800 text-blue-100 rounded-3xl p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-contour-dark opacity-60" aria-hidden="true" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-400">Siapkan dulu</p>
            <h2 className="font-heading font-extrabold text-xl text-white mt-1">Yang perlu disiapkan</h2>
            <ul className="mt-5 space-y-3">
              {CHECKLIST.map((c) => (
                <li key={c.t} className="flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-white/10 flex items-center justify-center"><c.icon size={15} className="text-yellow-400" /></span>
                  <span className="flex-1">{c.t}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.req ? 'bg-yellow-500 text-navy-900' : 'bg-white/10 text-blue-200'}`}>{c.req ? 'Wajib' : 'Opsional'}</span>
                </li>
              ))}
            </ul>
            <Link to={cta.to} className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-navy-900 text-sm font-heading font-bold py-3 rounded-xl transition-colors">
              <cta.Icon size={16} strokeWidth={3} /> {cta.label}
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 pb-28 sm:pb-16">
        <h2 className="font-heading font-extrabold text-xl text-center">Pertanyaan umum</h2>
        <div className="mt-5 space-y-3">
          {FAQ.map((f, i) => (
            <motion.details key={f.q} {...rise(i * 0.05)} className="group bg-white border border-blue-200 rounded-2xl px-5 py-4 open:shadow-md transition-shadow">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-bold">
                {f.q}<ChevronDown size={16} className="shrink-0 text-navy-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="text-xs text-navy-500 mt-2 leading-relaxed">{f.a}</p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* CTA melekat di HP */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-gradient-to-t from-blue-50 via-blue-50/95 to-transparent">
        <Link to={cta.to} className="w-full inline-flex items-center justify-center gap-2 bg-yellow-500 text-navy-900 font-heading font-bold py-3.5 rounded-2xl shadow-xl shadow-yellow-500/30">
          <cta.Icon size={17} strokeWidth={3} /> {cta.label}
        </Link>
      </div>
    </div>
  );
}
