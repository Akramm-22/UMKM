import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useTransform, useReducedMotion } from 'motion/react';
import { Clock, Wallet, MessageCircle, MapPin, ArrowRight, ChevronUp, ChevronDown, Flame, Navigation, Coffee, Wifi, Truck, PackageCheck } from 'lucide-react';

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
    <h2 className="font-heading font-extrabold text-[clamp(1.75rem,4.2vw,2.9rem)] text-white leading-[1.12] mt-4 text-balance">
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
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

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
  const arc = wide
    ? { open: 'ellipse(100% 118% at 0% 50%)', closed: 'ellipse(0% 0% at 0% 50%)' }
    : { open: 'ellipse(140% 100% at 50% 0%)', closed: 'ellipse(0% 0% at 50% 0%)' };
  const NoteIcon = s.note.icon;

  return (
    <section ref={ref} className="relative bg-navy-900" style={{ height: `${SLIDES.length * 100}vh` }} aria-label="Cerita usaha lokal">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* latar: versi mini foto aktif yang diperbesar → buram alami tanpa filter blur yang berat */}
        <AnimatePresence initial={false}>
          <motion.img
            key={`bg-${index}`}
            src={s.img.replace('w=1600', 'w=200&blur=80')}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-navy-900/95 via-navy-900/70 to-navy-900/35" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-dots opacity-[0.07] pointer-events-none"
          style={{ maskImage: 'linear-gradient(to left, #000, transparent 70%)', WebkitMaskImage: 'linear-gradient(to left, #000, transparent 70%)' }}
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

        {/* foto utama: bidang lengkung yang terbuka dari kiri */}
        <div className="absolute inset-x-0 top-0 h-[42%] md:inset-y-0 md:right-auto md:h-full md:w-[56%]">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={`img-${index}`}
              custom={dir}
              className="absolute inset-0 overflow-hidden"
              initial={{ clipPath: arc.closed }}
              animate={{ clipPath: arc.open }}
              exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.35 } }}
              transition={{ duration: 0.95, ease: [0.65, 0, 0.35, 1] }}
              style={{ zIndex: 2 }}
            >
              <motion.div className="absolute -inset-y-[4%] inset-x-0" style={{ y: drift }}>
                <motion.img
                  src={s.img}
                  alt={s.title}
                  initial={{ scale: reduce ? 1 : 1.25 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.4, ease: 'easeOut' }}
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-navy-900/25" aria-hidden="true" />
            </motion.div>
          </AnimatePresence>

          {/* kartu kaca di atas foto */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`note-${index}`}
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.45, delay: 0.55, ease: 'easeOut' }}
              className="hidden sm:flex absolute z-[4] left-5 md:left-10 bottom-5 md:bottom-12 items-center gap-3 rounded-2xl bg-navy-900/70 ring-1 ring-white/20 pl-2.5 pr-4 py-2.5 text-white shadow-xl shadow-navy-900/30"
            >
              <span className="w-9 h-9 rounded-xl bg-yellow-500 text-navy-900 flex items-center justify-center"><NoteIcon size={17} strokeWidth={2.4} /></span>
              <span className="leading-tight">
                <span className="block text-xs font-bold">{s.note.t}</span>
                <span className="block text-[11px] text-blue-100/80">{s.note.s}</span>
              </span>
            </motion.div>
          </AnimatePresence>

          {/* garis lengkung kuning mengikuti tepi foto */}
          <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-[3]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 -18 A100 118 0 0 1 0 118" fill="none" stroke="#FFC914" strokeOpacity=".55" strokeWidth=".35" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        {/* deskripsi di sebelah kanan foto */}
        <div className="relative z-10 h-full max-w-6xl mx-auto px-5 sm:px-8 flex items-start md:items-center pt-[calc(42svh+1rem)] md:pt-0">
          <motion.div style={{ y: textDrift }} className="w-full md:w-[42%] md:ml-auto md:pr-20 lg:pr-16">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`txt-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: dir * -24, transition: { duration: 0.25 } }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-end gap-3">
                  <motion.p
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="hidden md:block font-heading font-extrabold text-7xl leading-none select-none text-transparent"
                    style={{ WebkitTextStroke: '1.5px rgba(255,255,255,.28)' }}
                    aria-hidden="true"
                  >
                    0{index + 1}
                  </motion.p>
                  <span className="hidden md:block mb-2 font-data text-xs font-bold text-white/40">/ 0{SLIDES.length}</span>
                </div>
                <motion.span
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.05 }}
                  className="inline-flex items-center gap-1.5 md:mt-3 bg-yellow-500 text-navy-800 text-xs font-heading font-extrabold px-3 py-1.5 rounded-full shadow-lg shadow-yellow-500/25"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-navy-800" /> {s.tag}
                </motion.span>
                <RevealTitle text={s.title} dir={dir} />
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
                  className="text-sm md:text-base text-blue-100/85 leading-relaxed mt-3 md:mt-4 max-w-md line-clamp-3 md:line-clamp-none"
                >
                  {s.desc}
                </motion.p>

                <ul className="flex flex-wrap gap-2 mt-4 md:mt-5">
                  {s.chips.map((c, i) => (
                    <motion.li
                      key={c.t}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.4 + i * 0.07 }}
                      className="inline-flex items-center gap-1.5 text-[11px] md:text-xs font-semibold text-blue-50 bg-white/8 hover:bg-white/15 ring-1 ring-white/15 px-2.5 py-1.5 rounded-full transition-colors"
                    >
                      <c.icon size={13} className="text-yellow-400" /> {c.t}
                    </motion.li>
                  ))}
                </ul>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  className="flex items-center gap-3 mt-5 md:mt-7"
                >
                  <Link
                    to={`/explore?q=${encodeURIComponent(s.q)}`}
                    className="group inline-flex items-center gap-2 bg-white text-navy-900 text-sm font-bold pl-4 pr-2 py-2 rounded-full shadow-lg shadow-navy-900/30 hover:bg-yellow-500 transition-colors"
                  >
                    Cari di peta
                    <span className="w-7 h-7 rounded-full bg-navy-900 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5 group-hover:-rotate-45">
                      <ArrowRight size={14} />
                    </span>
                  </Link>
                  <div className="hidden md:flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => jump(index - 1)}
                      disabled={index === 0}
                      aria-label="Cerita sebelumnya"
                      className="w-9 h-9 rounded-full ring-1 ring-white/25 text-white flex items-center justify-center hover:bg-white/10 hover:ring-white/50 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => jump(index + 1)}
                      disabled={index === SLIDES.length - 1}
                      aria-label="Cerita berikutnya"
                      className="w-9 h-9 rounded-full ring-1 ring-white/25 text-white flex items-center justify-center hover:bg-white/10 hover:ring-white/50 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </motion.div>
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
          className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex-col items-center gap-2 text-white pointer-events-none"
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
