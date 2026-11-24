import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useTransform, useReducedMotion } from 'motion/react';
import { Clock, Wallet, MessageCircle, MapPin, Flame, Navigation, Coffee, Wifi, Truck, PackageCheck } from 'lucide-react';

const IMG = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

const SLIDES = [
  {
    img: IMG('photo-1512058564366-18510be2db19'),
    tag: 'Warung Makan Rumahan',
    title: 'Masakan Hangat dari Dapur Tetangga',
    desc: 'Nasi uduk, sayur asem, dan lauk yang dimasak tiap pagi. Temukan warung makan rumahan di sekitarmu — jam buka & harga diisi langsung oleh pemiliknya.',
    q: 'warung makan',
    chips: [{ icon: Clock, t: 'Buka sejak pagi' }, { icon: Wallet, t: 'Harga terjangkau' }, { icon: MessageCircle, t: 'Pesan via WhatsApp' }],
    note: { icon: Flame, t: 'Masih hangat', s: 'Lauk dimasak tiap pagi' },
  },
  {
    img: IMG('photo-1529563021893-cc83c992d75d'),
    tag: 'Jajanan Malam',
    title: 'Aroma Sate yang Memanggil Pulang',
    desc: 'Dari sate arang sampai martabak, kuliner malam favorit warga kini mudah dicari. Lihat yang masih buka dan ikuti rutenya dari satu layar.',
    q: 'sate',
    chips: [{ icon: Clock, t: 'Status buka real-time' }, { icon: Navigation, t: 'Rute langsung' }, { icon: Flame, t: 'Kuliner malam' }],
    note: { icon: Navigation, t: 'Ikuti rutenya', s: 'Petunjuk arah dari lokasimu' },
  },
  {
    img: IMG('photo-1509042239860-f550ce710b93'),
    tag: 'Kedai Kopi Lokal',
    title: 'Secangkir Cerita di Kedai Sebelah',
    desc: 'Kopi tubruk, es kopi susu gula aren, dan tempat nongkrong yang ramah kantong. Dukung barista lokal tanpa harus jauh-jauh ke mal.',
    q: 'kopi',
    chips: [{ icon: Coffee, t: 'Racikan barista lokal' }, { icon: Wifi, t: 'Nyaman nongkrong' }, { icon: Wallet, t: 'Ramah kantong' }],
    note: { icon: Coffee, t: 'Dukung barista lokal', s: 'Ulasan jujur dari warga' },
  },
  {
    img: IMG('photo-1542838132-92c53300491e'),
    tag: 'Toko Sembako & Kebutuhan',
    title: 'Belanja Harian, Cukup Jalan Kaki',
    desc: 'Beras, gas, galon, sampai sayur segar — toko kelontong terdekat lengkap dengan kontak WhatsApp untuk pesan antar.',
    q: 'sembako',
    chips: [{ icon: MapPin, t: 'Dekat rumah' }, { icon: Truck, t: 'Bisa pesan antar' }, { icon: PackageCheck, t: 'Stok harian' }],
    note: { icon: Truck, t: 'Pesan antar', s: 'Hubungi langsung pemilik toko' },
  },
];


// judul muncul per kata dari balik garis
function RevealTitle({ text, dir }) {
  return (
    <h2 className="font-heading font-extrabold text-[clamp(1.85rem,3.4vw,3.1rem)] text-white leading-[1.1] tracking-tight mt-5 text-balance">
      {text.split(' ').map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden align-bottom pb-[0.08em] mr-[0.25em]">
          <motion.span
            className="inline-block"
            initial={{ y: dir > 0 ? '105%' : '-105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 + i * 0.045, ease: [0.16, 1, 0.3, 1] }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

export default function PhotoStory() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // progres di dalam segmen foto aktif (0→1) untuk cincin penanda & parallax
  const local = useTransform(scrollYProgress, (p) => {
    const x = p * SLIDES.length;
    return Math.min(1, Math.max(0, x - Math.min(SLIDES.length - 1, Math.floor(x))));
  });
  const ring = useTransform(local, [0, 1], [0, 1]);
  const drift = useTransform(local, [0, 1], reduce ? ['0%', '0%'] : ['-3%', '3%']);
  const textDrift = useTransform(local, [0, 1], reduce ? [0, 0] : [14, -14]);

  // muat semua foto lebih awal agar pergantian tidak berkedip
  useEffect(() => {
    SLIDES.forEach((sl) => {
      new Image().src = sl.img;
      new Image().src = sl.img.replace('w=1600', 'w=200&blur=80');
    });
  }, []);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = Math.min(SLIDES.length - 1, Math.max(0, Math.floor(p * SLIDES.length * 0.999)));
    if (next === index) return;
    setDir(next > index ? 1 : -1);
    setIndex(next);
  });

  // klik penanda tahap → gulir ke segmen foto tersebut
  const jump = (i) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    const target = top + (span * (i + 0.5)) / SLIDES.length;
    window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
  };

  const s = SLIDES[index];
  const NoteIcon = s.note.icon;

  return (
    <section ref={ref} className="relative bg-navy-900" style={{ height: `${SLIDES.length * 100}vh` }} aria-label="Cerita usaha lokal">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* latar navy: gradasi + cahaya lembut; foto aktif hanya memberi rona warna tipis */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_45%,#1D3563_0%,#0F1E3D_45%,#0A1428_100%)]" aria-hidden="true" />
        <AnimatePresence initial={false}>
          <motion.img
            key={`bg-${index}`}
            src={s.img.replace('w=1600', 'w=200&blur=80')}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity"
          />
        </AnimatePresence>
        <div className="absolute -top-1/3 left-[8%] w-[60vmax] h-[60vmax] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(74,144,217,.22) 0%, rgba(74,144,217,0) 60%)' }} aria-hidden="true" />
        <div className="absolute -bottom-1/3 -right-[10%] w-[55vmax] h-[55vmax] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,201,20,.10) 0%, rgba(255,201,20,0) 60%)' }} aria-hidden="true" />
        <div
          className="absolute inset-0 bg-dots opacity-[0.06] pointer-events-none"
          style={{ maskImage: 'radial-gradient(ellipse at 70% 50%, #000, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse at 70% 50%, #000, transparent 70%)' }}
          aria-hidden="true"
        />

        {/* progres ala story (HP) */}
        <div className="md:hidden absolute top-[4.75rem] inset-x-4 z-30 flex gap-1.5" aria-hidden="true">
          {SLIDES.map((sl, i) => (
            <span key={sl.tag} className="relative flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
              {i < index && <span className="absolute inset-0 bg-yellow-500" />}
              {i === index && <motion.span className="absolute inset-y-0 left-0 bg-yellow-500 origin-left w-full" style={{ scaleX: ring }} />}
            </span>
          ))}
        </div>

        {/* komposisi dua kolom: foto bulat + deskripsi */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-5 sm:px-8 md:pr-24 lg:pr-28 flex flex-col items-center md:grid md:grid-cols-[1.25fr_1fr] md:items-center gap-8 md:gap-12 lg:gap-16 pt-[6.5rem] md:pt-0">
          <div className="relative w-full flex justify-center">
            <div className="relative w-[min(86vw,42svh,26rem)] sm:w-[min(70vw,48svh,32rem)] md:w-full md:max-w-[min(80vh,46rem)] aspect-square">
              {/* glow lembut di sekeliling foto (gradien, foto tetap tajam) */}
              <motion.span
                key={`glow-${index}`}
                className="absolute -inset-[22%] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(74,144,217,.30) 0%, rgba(74,144,217,.12) 40%, rgba(10,20,40,0) 68%)' }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                aria-hidden="true"
              />
              {/* cincin putus-putus yang berputar pelan + titik orbit */}
              <motion.svg
                viewBox="0 0 100 100"
                className="absolute -inset-[9%] w-[118%] h-[118%] pointer-events-none"
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                aria-hidden="true"
              >
                <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth=".35" strokeDasharray="1.2 2.4" />
                <circle cx="50" cy="1" r="1.3" fill="#FFC914" />
              </motion.svg>

              {/* riak cahaya yang memancar setiap foto berganti */}
              {!reduce && [0, 1].map((r) => (
                <motion.span
                  key={`ripple-${index}-${r}`}
                  className={`absolute inset-0 rounded-full pointer-events-none border ${r ? 'border-blue-300/50' : 'border-white/60'}`}
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{ scale: [1, 1.32], opacity: [0.8, 0] }}
                  transition={{ duration: 1.1, delay: 0.35 + r * 0.18, ease: 'easeOut' }}
                  aria-hidden="true"
                />
              ))}

              <div className="absolute inset-0 rounded-full overflow-hidden ring-4 ring-navy-900/80 shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] bg-navy-800">
                <AnimatePresence initial={false} custom={dir}>
                  <motion.div
                    key={`img-${index}`}
                    custom={dir}
                    className="absolute inset-0"
                    variants={{
                      // foto baru terbuka seperti portal dari sisi arah gulir
                      enter: (d) => ({ clipPath: `circle(0% at 50% ${d > 0 ? 100 : 0}%)`, zIndex: 2 }),
                      center: { clipPath: `circle(150% at 50% ${dir > 0 ? 100 : 0}%)`, zIndex: 2, transition: { duration: 1, ease: [0.76, 0, 0.24, 1] } },
                      // foto lama mengecil, berputar, dan memudar ke belakang
                      exit: (d) => ({ scale: 0.82, rotate: d * 14, opacity: 0, zIndex: 1, transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] } }),
                    }}
                    initial={reduce ? false : 'enter'}
                    animate="center"
                    exit="exit"
                  >
                    <motion.div className="absolute -inset-[6%]" style={{ y: drift }}>
                      <motion.img
                        src={s.img}
                        alt={s.title}
                        initial={{ scale: reduce ? 1 : 1.4, rotate: reduce ? 0 : dir * -18 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full h-full object-cover object-center"
                      />
                    </motion.div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_55%,rgba(10,20,40,.45)_100%)]" aria-hidden="true" />
                    {/* kilau cahaya menyapu sekali setelah foto terbuka */}
                    {!reduce && (
                      <motion.span
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: 'linear-gradient(115deg, transparent 38%, rgba(255,255,255,.32) 50%, transparent 62%)' }}
                        initial={{ x: '-120%' }}
                        animate={{ x: '120%' }}
                        transition={{ duration: 1, delay: 0.65, ease: [0.4, 0, 0.2, 1] }}
                        aria-hidden="true"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* keterangan singkat menempel di tepi bawah foto */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`note-${index}`}
                  initial={{ opacity: 0, y: 14, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
                  className="absolute z-[3] left-1/2 -translate-x-1/2 md:left-[2%] md:translate-x-0 bottom-[2%] md:bottom-[8%] flex items-center gap-2.5 rounded-2xl bg-white text-navy-800 pl-2 pr-3.5 py-2 shadow-xl shadow-black/30 whitespace-nowrap"
                >
                  <span className="w-8 h-8 shrink-0 rounded-xl bg-navy-800 text-yellow-400 flex items-center justify-center"><NoteIcon size={15} strokeWidth={2.4} /></span>
                  <span className="leading-tight">
                    <span className="block text-xs font-bold">{s.note.t}</span>
                    <span className="block text-[10px] text-navy-500">{s.note.s}</span>
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* deskripsi */}
          <motion.div style={{ y: textDrift }} className="w-full max-w-md md:max-w-[28rem] text-center md:text-left">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`txt-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: dir * -24, transition: { duration: 0.25 } }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <motion.span
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.05 }}
                    className="inline-flex items-center gap-1.5 bg-yellow-500 text-navy-800 text-xs font-heading font-extrabold px-3 py-1.5 rounded-full shadow-lg shadow-yellow-500/25"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-navy-800" /> {s.tag}
                  </motion.span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="hidden md:block h-px flex-1 max-w-[6rem] bg-gradient-to-r from-white/40 to-transparent origin-left"
                    aria-hidden="true"
                  />
                </div>
                <RevealTitle text={s.title} dir={dir} />
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="block w-12 h-1 rounded-full bg-blue-300/40 mt-5 mx-auto md:mx-0 origin-left"
                  aria-hidden="true"
                />
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
                  className="text-[15px] md:text-base text-blue-100/80 leading-7 mt-5 line-clamp-4 md:line-clamp-none"
                >
                  {s.desc}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* penanda tahap vertikal (desktop, sisi kanan) */}
        <nav aria-label="Pilih foto" className="hidden md:flex absolute z-20 right-6 lg:right-8 top-1/2 -translate-y-1/2 flex-col items-center">
          <span className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-0.5 bg-white/15 rounded-full" aria-hidden="true">
            <motion.span className="absolute inset-0 bg-yellow-500 rounded-full origin-top" style={{ scaleY: scrollYProgress }} />
          </span>
          {SLIDES.map((sl, i) => {
            const active = i === index;
            return (
              <button
                key={sl.tag}
                type="button"
                onClick={() => jump(i)}
                aria-label={`Foto ${i + 1}: ${sl.tag}`}
                aria-current={active ? 'step' : undefined}
                className="group relative my-5 focus-visible:rounded-full"
              >
                {/* label muncul saat diarahkan */}
                <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-white/95 text-navy-800 text-[11px] font-bold px-2.5 py-1 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 transition-all duration-200 shadow-lg">
                  {sl.tag}
                </span>
                <motion.span
                  animate={{ scale: active ? 1 : 0.72 }}
                  whileHover={{ scale: active ? 1.06 : 0.85 }}
                  className={`relative flex w-10 h-10 rounded-full items-center justify-center font-heading font-extrabold text-sm transition-colors ${
                    active ? 'bg-white text-navy-800' : i < index ? 'bg-yellow-500 text-navy-800' : 'bg-white/20 text-white/70'
                  }`}
                >
                  {active && (
                    <svg className="absolute -inset-1.5 w-[calc(100%+0.75rem)] h-[calc(100%+0.75rem)] -rotate-90" viewBox="0 0 52 52" aria-hidden="true">
                      <circle cx="26" cy="26" r="24" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
                      <motion.circle cx="26" cy="26" r="24" fill="none" stroke="#FFC914" strokeWidth="3" strokeLinecap="round" style={{ pathLength: ring }} />
                    </svg>
                  )}
                  {i + 1}
                </motion.span>
              </button>
            );
          })}
        </nav>

        {/* petunjuk gulir */}
        <motion.div
          animate={{ opacity: index === SLIDES.length - 1 ? 0 : 0.8 }}
          className="hidden lg:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-1.5 text-white pointer-events-none"
          aria-hidden="true"
        >
          <span className="w-5 h-8 rounded-full border-2 border-white/60 flex justify-center pt-1.5">
            <motion.span
              className="w-1 h-1.5 rounded-full bg-yellow-400"
              animate={reduce ? undefined : { y: [0, 8, 0], opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase">Gulir untuk cerita berikutnya</span>
        </motion.div>
      </div>
    </section>
  );
}
