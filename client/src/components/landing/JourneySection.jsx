import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'motion/react';
import { scrollReveal } from '../../lib/scrollReveal.js';
import {
  UserPlus, Store, ShieldCheck, MapPin, TrendingUp, CircleCheck, Clock, Gift, ArrowRight, ArrowLeft,
  Pause, Play, Camera, Eye, MessageCircle, Navigation,
} from 'lucide-react';
import SectionTag from './SectionTag.jsx';

const STEP_MS = 7000;

const STEPS = [
  {
    key: 'akun', icon: UserPlus, when: 'Hari 1', time: '± 2 menit', tone: 'bg-yellow-500 text-navy-800', bar: 'bg-yellow-500',
    title: 'Buat akun pelaku usaha',
    desc: 'Daftar sebagai pemilik usaha cukup dengan nama dan nomor HP/WhatsApp aktif. Tanpa NIB, tanpa biaya.',
    checklist: ['Nama lengkap pemilik', 'Nomor HP / WhatsApp aktif', 'Kata sandi untuk masuk dashboard'],
    result: 'Dashboard usaha pribadi langsung aktif.',
  },
  {
    key: 'profil', icon: Store, when: 'Hari 1', time: '± 8 menit · 6 langkah', tone: 'bg-navy-800 text-yellow-500', bar: 'bg-navy-800',
    title: 'Lengkapi profil usaha',
    desc: 'Wizard 6 langkah memandu dari identitas sampai menu. Draf tersimpan otomatis, jadi bisa dilanjutkan kapan saja.',
    checklist: ['Nama, kategori & cerita singkat usaha', 'Foto tampak depan, tempat & produk', 'Pin lokasi — alamat terisi otomatis', 'Jam buka, kisaran harga & layanan', 'Menu atau produk andalan'],
    result: 'Profil siap ditinjau, lengkap seperti di Google Maps.',
  },
  {
    key: 'verifikasi', icon: ShieldCheck, when: 'Hari 1–2', time: '≤ 24 jam', tone: 'bg-info text-white', bar: 'bg-info',
    title: 'Diverifikasi admin',
    desc: 'Admin mencocokkan foto, lokasi, dan kontak agar peta tetap terpercaya. Kalau ada yang kurang, kamu dapat catatan perbaikan.',
    checklist: ['Foto & titik lokasi dicocokkan', 'Nomor kontak dicek aktif', 'Catatan perbaikan bila perlu — ajukan ulang sekali klik'],
    result: 'Lencana "Terverifikasi Admin" di profilmu.',
  },
  {
    key: 'tayang', icon: MapPin, when: 'Hari 2', time: 'Langsung setelah disetujui', tone: 'bg-success text-white', bar: 'bg-success',
    title: 'Tayang di peta',
    desc: 'Pin usahamu muncul untuk konsumen di sekitar, lengkap dengan rute, tombol WhatsApp, dan telepon.',
    checklist: ['Muncul di peta radius ±2 km', 'Rute jalan kaki, motor & mobil', 'Mudah ditemukan lewat pencarian pintar'],
    result: 'Tetangga mulai menemukanmu.',
  },
  {
    key: 'tumbuh', icon: TrendingUp, when: 'Minggu 1 dst.', time: 'Berkelanjutan', tone: 'bg-purple-600 text-white', bar: 'bg-purple-600',
    title: 'Tumbuh bersama pelanggan',
    desc: 'Pasang promo, kumpulkan ulasan, dan pantau berapa orang yang melihat & membuka rute ke usahamu.',
    checklist: ['Pasang & ganti promo kapan saja', 'Kumpulkan ulasan bintang dari pembeli', 'Statistik kunjungan & klik rute'],
    result: 'Usaha makin dikenal, pelanggan makin setia.',
  },
];

// pratinjau mini tiap tahap — gambaran layar yang akan ditemui pemilik usaha
function Preview({ step }) {
  const frame = 'relative bg-white rounded-2xl border border-blue-200 shadow-lg shadow-navy-800/10 p-4 text-[11px]';
  if (step === 'akun') return (
    <div className={frame}>
      <p className="font-heading font-extrabold text-sm">Daftar Pelaku Usaha</p>
      {['Nama lengkap', 'Nomor WhatsApp', 'Kata sandi'].map((l, i) => (
        <div key={l} className="mt-2.5">
          <p className="text-navy-500 font-semibold">{l}</p>
          <div className="h-8 mt-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 flex items-center text-navy-700 font-semibold">{['Siti Aminah', '0812-3456-7890', '••••••••'][i]}</div>
        </div>
      ))}
      <div className="mt-3 h-8 rounded-lg bg-yellow-500 flex items-center justify-center font-bold text-navy-800">Buat Akun</div>
    </div>
  );
  if (step === 'profil') return (
    <div className={frame}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5, 6].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= 3 ? 'bg-navy-800' : 'bg-blue-200'}`} />)}
      </div>
      <p className="font-heading font-extrabold text-sm mt-3">Langkah 3 · Lokasi</p>
      <div className="relative h-24 mt-2 rounded-xl bg-blue-100 overflow-hidden bg-dots">
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full w-7 h-7 rounded-full rounded-bl-none -rotate-45 bg-navy-800 border-2 border-white shadow" />
      </div>
      <p className="mt-2 text-navy-700 font-semibold flex items-center gap-1"><MapPin size={11} /> Jl. Melati No. 3, Menteng</p>
      <div className="mt-2 flex gap-1.5">
        {[0, 1, 2].map((n) => <span key={n} className="w-10 h-10 rounded-lg bg-blue-50 border border-dashed border-blue-300 flex items-center justify-center text-navy-500"><Camera size={13} /></span>)}
      </div>
    </div>
  );
  if (step === 'verifikasi') return (
    <div className={frame}>
      <p className="font-heading font-extrabold text-sm">Status pengajuan</p>
      {[
        { t: 'Diterima', d: '08.12', ok: true },
        { t: 'Foto & lokasi dicek', d: '13.40', ok: true },
        { t: 'Disetujui admin', d: 'Besok 02.05', ok: true, hl: true },
      ].map((s) => (
        <div key={s.t} className={`mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-2 ${s.hl ? 'bg-success/10 text-success' : 'bg-blue-50 text-navy-700'}`}>
          <CircleCheck size={13} /> <span className="flex-1 font-bold">{s.t}</span> <span className="text-navy-500">{s.d}</span>
        </div>
      ))}
      <span className="mt-3 inline-flex items-center gap-1 bg-navy-800 text-yellow-500 font-bold px-2.5 py-1 rounded-full"><ShieldCheck size={11} /> Terverifikasi Admin</span>
    </div>
  );
  if (step === 'tayang') return (
    <div className={`${frame} p-0 overflow-hidden`}>
      <div className="relative h-28 bg-blue-100 bg-dots">
        <svg viewBox="0 0 200 110" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <path d="M20 95 q40 -30 70 -40 q40 -14 80 -40" stroke="#16294F" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="1 7" />
        </svg>
        <span className="absolute left-[18%] bottom-2 w-3.5 h-3.5 rounded-full bg-info border-2 border-white shadow" />
        <span className="absolute right-[12%] top-1 w-8 h-8 rounded-full rounded-bl-none -rotate-45 bg-navy-800 border-2 border-white shadow flex items-center justify-center"><span className="rotate-45 text-sm">🍜</span></span>
      </div>
      <div className="p-3">
        <p className="font-heading font-extrabold text-sm">Warung Nasi Bu Siti</p>
        <p className="text-navy-500 mt-0.5">★ 4,8 · 350 m · <span className="text-success font-bold">Buka</span></p>
        <div className="mt-2 grid grid-cols-3 gap-1.5 font-bold">
          <span className="bg-navy-800 text-blue-50 rounded-lg py-1.5 text-center">Rute</span>
          <span className="bg-yellow-500 text-navy-800 rounded-lg py-1.5 text-center">WhatsApp</span>
          <span className="bg-blue-100 text-navy-700 rounded-lg py-1.5 text-center">Telepon</span>
        </div>
      </div>
    </div>
  );
  return (
    <div className={frame}>
      <p className="font-heading font-extrabold text-sm">Statistik 7 hari</p>
      <div className="mt-3 flex items-end gap-1.5 h-20">
        {[30, 42, 38, 55, 61, 74, 88].map((h, i) => (
          <motion.span key={i} className="flex-1 rounded-t-md bg-purple-500/80" initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.5, delay: i * 0.05 }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[{ i: Eye, v: '412', l: 'dilihat' }, { i: Navigation, v: '96', l: 'rute' }, { i: MessageCircle, v: '28', l: 'chat' }].map((s) => (
          <div key={s.l} className="bg-blue-50 rounded-lg p-1.5 text-center">
            <s.i size={11} className="mx-auto text-purple-600" />
            <p className="font-extrabold text-navy-800 mt-0.5">{s.v}</p>
            <p className="text-navy-500">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JourneySection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const ref = useRef(null);
  const tabs = useRef([]);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const playing = inView && !paused && !userPaused && !reduce;

  // putar otomatis per tahap; berhenti saat kursor/fokus di dalam atau pengguna menekan jeda
  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, active]);

  const go = (i, focus = false) => {
    const n = (i + STEPS.length) % STEPS.length;
    setActive(n);
    if (focus) tabs.current[n]?.focus();
  };

  const onKey = (e) => {
    const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (k) { e.preventDefault(); setUserPaused(true); go(active + k, true); }
    if (e.key === 'Home') { e.preventDefault(); go(0, true); }
    if (e.key === 'End') { e.preventDefault(); go(STEPS.length - 1, true); }
  };

  const step = STEPS[active];

  return (
    <section id="daftar" className="relative py-16 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto px-5">
        <motion.div
          {...scrollReveal(0.3)}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
        >
          <div className="max-w-xl">
            <SectionTag n="04" label="Untuk Pemilik Usaha" />
            <h2 className="font-heading font-extrabold text-2xl lg:text-3xl mt-3">
              Perjalanan usaha: <span className="italic text-yellow-600">dari daftar sampai ramai</span>
            </h2>
            <p className="text-navy-500 text-sm mt-2">Lima tahap yang jelas — apa yang perlu disiapkan, berapa lama, dan apa yang kamu dapat di setiap tahap.</p>
          </div>
          <div className="flex gap-6">
            {[{ v: '10 mnt', l: 'waktu daftar' }, { v: '≤ 24 jam', l: 'verifikasi' }, { v: 'Rp0', l: 'biaya' }].map((s) => (
              <div key={s.l}>
                <p className="font-heading font-extrabold text-xl text-navy-800">{s.v}</p>
                <p className="text-xs text-navy-500">{s.l}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div
          ref={ref}
          className="grid lg:grid-cols-12 gap-6 mt-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* daftar tahap (tablist) */}
          <div role="tablist" aria-label="Tahapan perjalanan usaha" aria-orientation="vertical" onKeyDown={onKey} className="lg:col-span-5 flex lg:flex-col gap-2 overflow-x-auto snap-x -mx-5 px-5 lg:mx-0 lg:px-0 pb-2 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STEPS.map((s, i) => {
              const on = i === active;
              const done = i < active;
              return (
                <button
                  key={s.key}
                  ref={(el) => { tabs.current[i] = el; }}
                  type="button"
                  role="tab"
                  id={`journey-tab-${s.key}`}
                  aria-selected={on}
                  aria-controls="journey-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => { setUserPaused(true); go(i); }}
                  className={`relative shrink-0 snap-start w-60 lg:w-full text-left rounded-2xl border p-3.5 overflow-hidden transition-all focus-visible:rounded-2xl ${
                    on ? 'bg-white border-navy-800 shadow-xl shadow-navy-800/10' : 'bg-white/70 border-blue-200 hover:border-navy-500 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-colors ${on ? s.tone : done ? 'bg-success/15 text-success' : 'bg-blue-100 text-navy-500'}`}>
                      {done ? <CircleCheck size={19} /> : <s.icon size={19} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-navy-500">Tahap {i + 1} · {s.when}</p>
                      <p className={`font-heading font-extrabold text-sm truncate ${on ? 'text-navy-800' : 'text-navy-700'}`}>{s.title}</p>
                    </div>
                    <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-navy-500 shrink-0"><Clock size={11} /> {s.time.split(' · ')[0]}</span>
                  </div>
                  {/* progres auto-play tahap aktif */}
                  {on && (
                    <span className="absolute left-0 bottom-0 h-1 w-full bg-blue-100" aria-hidden="true">
                      <motion.span
                        key={`${active}-${playing}`}
                        className={`block h-full ${s.bar}`}
                        initial={{ width: playing ? '0%' : '100%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: playing ? STEP_MS / 1000 : 0, ease: 'linear' }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* detail tahap aktif */}
          <div id="journey-panel" role="tabpanel" aria-labelledby={`journey-tab-${step.key}`} className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative bg-white border border-blue-200 rounded-3xl p-5 sm:p-7 shadow-sm overflow-hidden"
              >
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-50 pointer-events-none" aria-hidden="true" />
                <div className="relative grid sm:grid-cols-5 gap-6">
                  <div className="sm:col-span-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full ${step.tone}`}>
                        <step.icon size={12} /> Tahap {active + 1} dari {STEPS.length}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-navy-700 bg-blue-100 px-2.5 py-1 rounded-full">
                        <Clock size={11} /> {step.time}
                      </span>
                    </div>
                    <h3 className="font-heading font-extrabold text-xl mt-3">{step.title}</h3>
                    <p className="text-sm text-navy-500 leading-relaxed mt-2">{step.desc}</p>

                    <p className="text-xs font-extrabold uppercase tracking-wider text-navy-700 mt-5">Yang perlu disiapkan</p>
                    <ul className="mt-2 space-y-2">
                      {step.checklist.map((c, i) => (
                        <motion.li key={c} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="flex items-start gap-2 text-sm text-navy-700">
                          <CircleCheck size={16} className="text-success shrink-0 mt-0.5" /> {c}
                        </motion.li>
                      ))}
                    </ul>

                    <div className="mt-5 flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3">
                      <Gift size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                      <p className="text-sm"><span className="font-bold">Hasilnya:</span> {step.result}</p>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex flex-col justify-center">
                    <Preview step={step.key} />
                  </div>
                </div>

                <div className="relative flex items-center justify-between gap-3 mt-6 pt-5 border-t border-blue-100">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => { setUserPaused(true); go(active - 1); }} aria-label="Tahap sebelumnya" className="w-10 h-10 rounded-full border border-blue-200 hover:border-navy-500 flex items-center justify-center text-navy-700 transition-colors focus-visible:rounded-full">
                      <ArrowLeft size={16} />
                    </button>
                    <button type="button" onClick={() => { setUserPaused(true); go(active + 1); }} aria-label="Tahap berikutnya" className="w-10 h-10 rounded-full border border-blue-200 hover:border-navy-500 flex items-center justify-center text-navy-700 transition-colors focus-visible:rounded-full">
                      <ArrowRight size={16} />
                    </button>
                    {!reduce && (
                      <button type="button" onClick={() => setUserPaused((v) => !v)} aria-label={userPaused ? 'Putar otomatis' : 'Jeda putar otomatis'} className="w-10 h-10 rounded-full text-navy-500 hover:text-navy-800 flex items-center justify-center transition-colors focus-visible:rounded-full">
                        {userPaused ? <Play size={15} /> : <Pause size={15} />}
                      </button>
                    )}
                  </div>
                  <Link to="/register" className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-heading font-bold px-5 py-2.5 rounded-full shadow-lg shadow-navy-800/20 transition-colors">
                    <Store size={16} /> Mulai sekarang
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
