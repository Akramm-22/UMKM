import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useTransform } from 'motion/react';

const IMG = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

const SLIDES = [
  {
    img: IMG('photo-1512058564366-18510be2db19'),
    tag: 'Warung Makan Rumahan',
    title: 'Masakan Hangat dari Dapur Tetangga',
    desc: 'Nasi uduk, sayur asem, dan lauk yang dimasak tiap pagi. Temukan warung makan rumahan di sekitarmu — jam buka & harga diisi langsung oleh pemiliknya.',
  },
  {
    img: IMG('photo-1529563021893-cc83c992d75d'),
    tag: 'Jajanan Malam',
    title: 'Aroma Sate yang Memanggil Pulang',
    desc: 'Dari sate arang sampai martabak, kuliner malam favorit warga kini mudah dicari. Lihat yang masih buka dan ikuti rutenya dari satu layar.',
  },
  {
    img: IMG('photo-1509042239860-f550ce710b93'),
    tag: 'Kedai Kopi Lokal',
    title: 'Secangkir Cerita di Kedai Sebelah',
    desc: 'Kopi tubruk, es kopi susu gula aren, dan tempat nongkrong yang ramah kantong. Dukung barista lokal tanpa harus jauh-jauh ke mal.',
  },
  {
    img: IMG('photo-1542838132-92c53300491e'),
    tag: 'Toko Sembako & Kebutuhan',
    title: 'Belanja Harian, Cukup Jalan Kaki',
    desc: 'Beras, gas, galon, sampai sayur segar — toko kelontong terdekat lengkap dengan kontak WhatsApp untuk pesan antar.',
  },
];

// scroll-driven storytelling: section dipin, tiap ±100vh scroll mengganti satu foto & deskripsinya
export default function PhotoStory() {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const fill = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
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
    window.scrollTo({ top: top + (span * (i + 0.5)) / SLIDES.length, behavior: 'smooth' });
  };

  const s = SLIDES[index];
  const arc = wide
    ? { open: 'ellipse(100% 118% at 0% 50%)', closed: 'ellipse(0% 0% at 0% 50%)' }
    : { open: 'ellipse(140% 100% at 50% 0%)', closed: 'ellipse(0% 0% at 50% 0%)' };

  return (
    <section ref={ref} className="relative bg-navy-900" style={{ height: `${SLIDES.length * 100}vh` }} aria-label="Cerita usaha lokal">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* latar: foto aktif diburamkan penuh layar */}
        <AnimatePresence initial={false}>
          <motion.img
            key={`bg-${index}`}
            src={s.img}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full object-cover blur-2xl"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-l from-navy-900/90 via-navy-900/65 to-navy-900/30" aria-hidden="true" />

        {/* foto utama: bidang lengkung yang terbuka dari kiri (cermin referensi) */}
        <div className="absolute inset-x-0 top-0 h-[42%] md:inset-y-0 md:right-auto md:h-full md:w-[56%]">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={`img-${index}`}
              custom={dir}
              className="absolute inset-0"
              initial={{ clipPath: arc.closed }}
              animate={{ clipPath: arc.open }}
              exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.35 } }}
              transition={{ duration: 0.95, ease: [0.65, 0, 0.35, 1] }}
              style={{ zIndex: 2 }}
            >
              <motion.img
                src={s.img}
                alt={s.title}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/40 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-navy-900/20" aria-hidden="true" />
            </motion.div>
          </AnimatePresence>
          {/* garis lengkung kuning mengikuti tepi foto */}
          <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none z-[3]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 -18 A100 118 0 0 1 0 118" fill="none" stroke="#FFC914" strokeOpacity=".55" strokeWidth=".35" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        {/* deskripsi di sebelah kanan foto */}
        <div className="relative z-10 h-full max-w-6xl mx-auto px-5 flex items-start md:items-center pt-[calc(42svh+1.25rem)] md:pt-0">
          <div className="w-full md:w-[40%] md:ml-auto md:pr-16">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`txt-${index}`}
                initial={{ opacity: 0, y: dir * 36 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: dir * -36 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <p className="hidden md:block font-heading font-extrabold text-6xl md:text-7xl text-white/15 leading-none select-none" aria-hidden="true">0{index + 1}</p>
                <span className="inline-block mt-2 bg-yellow-500 text-navy-800 text-xs font-heading font-extrabold px-3 py-1.5 rounded-md shadow-lg shadow-yellow-500/20">
                  {s.tag}
                </span>
                <h2 className="font-heading font-extrabold text-3xl md:text-4xl lg:text-[2.75rem] text-white leading-tight mt-4">{s.title}</h2>
                <p className="text-sm md:text-base text-blue-100/90 leading-relaxed mt-4 max-w-md">{s.desc}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* penanda tahap vertikal (desktop, sisi kanan) / horizontal (HP) */}
        <nav aria-label="Pilih foto" className="absolute z-20 right-4 md:right-8 bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 flex md:flex-col items-center gap-3 md:gap-0">
          <span className="hidden md:block absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-0.5 bg-white/15 rounded-full" aria-hidden="true">
            <motion.span className="absolute inset-x-0 top-0 bg-yellow-500 rounded-full" style={{ height: fill }} />
          </span>
          {SLIDES.map((sl, i) => (
            <button
              key={sl.tag}
              type="button"
              onClick={() => jump(i)}
              aria-label={`Foto ${i + 1}: ${sl.tag}`}
              aria-current={i === index ? 'step' : undefined}
              className="relative md:my-5 focus-visible:rounded-full"
            >
              <motion.span
                animate={{ scale: i === index ? 1 : 0.72 }}
                className={`flex w-10 h-10 rounded-full items-center justify-center font-heading font-extrabold text-sm transition-colors ${
                  i === index ? 'bg-white text-navy-800 shadow-[0_0_0_6px_rgba(255,255,255,.18)]' : i < index ? 'bg-yellow-500 text-navy-800' : 'bg-white/20 text-white/70 backdrop-blur-sm'
                }`}
              >
                {i + 1}
              </motion.span>
            </button>
          ))}
        </nav>

        {/* petunjuk gulir */}
        <motion.p
          animate={{ opacity: index === SLIDES.length - 1 ? 0 : 0.7 }}
          className="hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-[11px] font-semibold tracking-widest uppercase text-white"
        >
          Gulir untuk melihat cerita berikutnya
        </motion.p>
      </div>
    </section>
  );
}
