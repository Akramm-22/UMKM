import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  ShieldCheck, BadgeCheck, Flag, Star, Clock, Lock, MapPin, Camera, Phone, Check, EyeOff, HandCoins, UserCheck,
} from 'lucide-react';
import SectionTag from './SectionTag.jsx';

// Ref: Airbnb AirCover & Gojek "Aman Bersama" (konten), bento grid Linear/Vercel (tata letak + spotlight kursor)
function Tile({ className = '', children, delay = 0 }) {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      onMouseMove={onMove}
      className={`group relative overflow-hidden rounded-3xl bg-navy-900/70 ring-1 ring-white/10 hover:ring-yellow-500/40 p-6 transition-[box-shadow] duration-300 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(380px_circle_at_var(--x)_var(--y),rgba(255,201,20,.10),transparent_60%)]" aria-hidden="true" />
      <div className="relative h-full flex flex-col">{children}</div>
    </motion.div>
  );
}

function Head({ icon: Icon, title, text }) {
  return (
    <div>
      <span className="w-10 h-10 rounded-xl bg-yellow-500/15 text-yellow-500 flex items-center justify-center"><Icon size={19} /></span>
      <h3 className="font-heading font-extrabold text-lg mt-4">{title}</h3>
      <p className="text-sm text-blue-300 leading-relaxed mt-1.5">{text}</p>
    </div>
  );
}

// simulasi meja verifikasi admin: centang muncul satu per satu lalu stempel
function VerifyDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const checks = [
    { icon: Camera, t: 'Foto tampak depan & produk cocok' },
    { icon: MapPin, t: 'Pin lokasi sesuai alamat' },
    { icon: Phone, t: 'Nomor WhatsApp aktif' },
    { icon: UserCheck, t: 'Identitas pemilik dicek' },
  ];
  return (
    <div ref={ref} className="relative mt-6 flex-1 rounded-2xl bg-navy-800 ring-1 ring-white/10 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <img src="https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=160&q=70" alt="" className="w-12 h-12 rounded-xl object-cover" />
        <div className="min-w-0">
          <p className="font-heading font-bold text-sm truncate">Warung Nasi Bu Siti</p>
          <p className="text-[11px] text-blue-300">Pengajuan baru · ditinjau admin</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {checks.map((c, i) => (
          <motion.li
            key={c.t}
            initial={{ opacity: 0.35 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 0.3 + i * 0.35 }}
            className="flex items-center gap-2.5 text-sm"
          >
            <motion.span
              initial={{ scale: 0.6, backgroundColor: 'rgba(255,255,255,.08)' }}
              animate={inView ? { scale: 1, backgroundColor: '#2E9E6B' } : {}}
              transition={{ delay: 0.3 + i * 0.35, type: 'spring', stiffness: 400, damping: 18 }}
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            >
              <Check size={13} className="text-white" />
            </motion.span>
            <c.icon size={14} className="text-blue-300 shrink-0" />
            <span className="text-blue-100">{c.t}</span>
          </motion.li>
        ))}
      </ul>
      <motion.div
        initial={{ opacity: 0, scale: 1.8, rotate: -24 }}
        animate={inView ? { opacity: 1, scale: 1, rotate: -12 } : {}}
        transition={{ delay: 1.9, type: 'spring', stiffness: 260, damping: 16 }}
        className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 border-[3px] border-success text-success rounded-xl px-3 py-1.5 font-heading font-extrabold text-xs sm:text-sm tracking-widest bg-navy-800/90"
      >
        TERVERIFIKASI
      </motion.div>
    </div>
  );
}

export default function TrustSection() {
  return (
    <section id="terpercaya" className="relative overflow-hidden bg-navy-800 text-blue-50">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[48rem] h-[24rem] rounded-full bg-[radial-gradient(closest-side,rgba(74,144,217,.18),transparent)] pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-5 py-16">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="max-w-2xl">
          <SectionTag n="03" label="Kenapa Bisa Dipercaya" light />
          <h2 className="font-heading font-extrabold text-2xl lg:text-3xl mt-3">
            Setiap pin di peta <span className="italic text-yellow-500">sudah dicek manusia.</span>
          </h2>
          <p className="text-blue-300 text-sm mt-2">Bukan direktori asal comot. Ini cara PesanLokal menjaga info usaha tetap akurat, adil, dan aman — untuk pembeli maupun pemilik.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4 mt-10">
          <Tile className="sm:col-span-2 lg:col-span-3 lg:row-span-2">
            <Head icon={ShieldCheck} title="Diverifikasi admin, bukan bot" text="Setiap usaha baru ditinjau satu per satu sebelum tayang — maksimal 24 jam. Data yang meragukan dikembalikan ke pemilik dengan catatan perbaikan." />
            <VerifyDemo />
          </Tile>

          <Tile className="lg:col-span-3" delay={0.05}>
            <div className="flex items-start gap-5">
              <div className="flex-1">
                <Head icon={BadgeCheck} title="Lencana yang bisa kamu cek" text="Lencana Terverifikasi hanya muncul pada usaha yang lolos tinjauan admin. Tanpa lencana, berarti belum tayang." />
              </div>
              <motion.div whileHover={{ rotate: -6, scale: 1.05 }} className="hidden sm:flex shrink-0 mt-2 w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-navy-800 flex-col items-center justify-center shadow-[0_0_0_8px_rgba(255,201,20,.12)]">
                <BadgeCheck size={34} />
                <span className="text-[10px] font-extrabold tracking-wider mt-1">TERVERIFIKASI</span>
              </motion.div>
            </div>
          </Tile>

          <Tile className="lg:col-span-3" delay={0.1}>
            <Head icon={Flag} title="Info salah? Laporkan dalam 2 ketukan" text="Usaha tutup, pindah, atau fiktif bisa langsung dilaporkan dari halaman detail. Admin menindaklanjuti dan bisa menurunkan pin sementara." />
            <div className="flex flex-wrap gap-1.5 mt-4" aria-hidden="true">
              {['Tidak ditemukan', 'Sudah tutup', 'Lokasi salah', 'Info tidak sesuai'].map((r, i) => (
                <span key={r} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${i === 1 ? 'bg-danger/20 text-red-300 ring-1 ring-danger/40' : 'bg-white/5 text-blue-200 ring-1 ring-white/10'}`}>{r}</span>
              ))}
            </div>
          </Tile>

          <Tile className="lg:col-span-2" delay={0.05}>
            <Head icon={Star} title="Ulasan dari akun asli" text="Hanya pengguna yang masuk yang bisa memberi bintang — satu akun, satu ulasan per usaha." />
            <div className="mt-4 rounded-2xl bg-navy-800 ring-1 ring-white/10 p-3" aria-hidden="true">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-yellow-500 text-navy-800 text-xs font-extrabold flex items-center justify-center">R</span>
                <span className="text-xs font-semibold">Rafi</span>
                <span className="ml-auto flex">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={11} className="text-yellow-400 fill-yellow-400" />)}</span>
              </div>
              <p className="text-[11px] text-blue-200 mt-2 leading-relaxed">"Lauknya rumahan banget, porsi pas buat sarapan."</p>
            </div>
          </Tile>

          <Tile className="lg:col-span-2" delay={0.1}>
            <Head icon={Clock} title="Langsung dari pemiliknya" text="Jam buka, harga, dan menu diisi & diperbarui sendiri oleh pemilik usaha — bukan hasil tebakan." />
            <div className="mt-4 space-y-1.5" aria-hidden="true">
              {[['Sen–Kam', '06.00–14.00'], ['Jumat', '06.00–11.30'], ['Minggu', 'Tutup']].map(([d, h]) => (
                <div key={d} className="flex justify-between text-xs rounded-lg bg-navy-800 px-3 py-1.5 ring-1 ring-white/5">
                  <span className="text-blue-300">{d}</span><span className={h === 'Tutup' ? 'text-red-300 font-semibold' : 'text-blue-50 font-semibold'}>{h}</span>
                </div>
              ))}
            </div>
          </Tile>

          <Tile className="sm:col-span-2 lg:col-span-2" delay={0.15}>
            <Head icon={HandCoins} title="Urutan tidak bisa dibeli" text="Tidak ada iklan berbayar dan 0% komisi. Hasil pencarian diurutkan dari relevansi, jarak, dan kelengkapan info." />
            <div className="mt-auto pt-4 flex items-baseline gap-2">
              <span className="font-heading font-extrabold text-4xl text-yellow-500">0%</span>
              <span className="text-xs text-blue-300">komisi · selamanya untuk UMKM mikro</span>
            </div>
          </Tile>

          <Tile className="sm:col-span-2 lg:col-span-6" delay={0.1}>
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <span className="w-12 h-12 rounded-2xl bg-yellow-500/15 text-yellow-500 flex items-center justify-center shrink-0"><Lock size={22} /></span>
              <div className="flex-1">
                <h3 className="font-heading font-extrabold text-lg">Data pribadi pemilik tetap privat</h3>
                <p className="text-sm text-blue-300 mt-1">Foto KTP hanya dipakai admin untuk verifikasi dan tidak pernah ditampilkan ke publik. Yang tampil hanya info usaha yang dipilih pemilik.</p>
              </div>
              <div className="flex gap-2 text-xs" aria-hidden="true">
                <span className="flex items-center gap-1.5 bg-success/15 text-emerald-300 px-3 py-1.5 rounded-full ring-1 ring-success/30"><Check size={13} /> Info usaha publik</span>
                <span className="flex items-center gap-1.5 bg-white/5 text-blue-200 px-3 py-1.5 rounded-full ring-1 ring-white/10"><EyeOff size={13} /> KTP hanya admin</span>
              </div>
            </div>
          </Tile>
        </div>
      </div>
    </section>
  );
}
