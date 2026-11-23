import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Storefront, Hourglass, UsersThree, Flag, Star, Users, TrendUp, TrendDown, Minus, ArrowsClockwise, Database, Flask,
  WarningOctagon, ForkKnife, Wrench, Basket, ClipboardText, ChatCircleDots, CaretRight, MapTrifold, SealCheck, Signpost as SignIcon,
} from '@phosphor-icons/react';
import { fetchOverview } from '../../lib/adminStats.js';
import { reasonLabel } from '../../lib/feedback.js';
import { Plate, Signpost, Button, StatusDot } from '../ui/Kit.jsx';
import { CountUp, StepSpark, RouteChart, Funnel, Gauge, Heatmap, SegmentRuler, PinColumns, RatingLadder, MiniMap } from './Charts.jsx';

const PERIODS = [{ d: 7, l: '7H' }, { d: 30, l: '30H' }, { d: 90, l: '90H' }];
const SERIES = [
  { key: 'submissions', label: 'Pengajuan', color: '#4A90D9' },
  { key: 'approvals', label: 'Disetujui', color: '#2E9E6B' },
  { key: 'reviews', label: 'Ulasan', color: '#E6B000' },
  { key: 'reports', label: 'Laporan', color: '#E05252' },
  { key: 'users', label: 'Pengguna baru', color: '#8B5CF6' },
];
const STATUS = [
  { key: 'approved', label: 'Tayang', color: '#2E9E6B' },
  { key: 'pending', label: 'Menunggu', color: '#FFC914', dark: true },
  { key: 'reported', label: 'Dilaporkan', color: '#E05252' },
  { key: 'rejected', label: 'Ditolak', color: '#8FBEDC', dark: true },
];
const STATUS_COLORS = Object.fromEntries(STATUS.map((s) => [s.key, s.color]));
const LABELS = { approved: 'tayang', pending: 'menunggu', reported: 'dilaporkan', rejected: 'ditolak', kuliner: 'Kuliner', jasa: 'Jasa', toko: 'Toko' };
const CAT = {
  kuliner: { label: 'Kuliner', icon: ForkKnife, color: '#F2771A' },
  jasa: { label: 'Jasa', icon: Wrench, color: '#4A90D9' },
  toko: { label: 'Toko', icon: Basket, color: '#2E9E6B' },
};

const sum = (arr, k) => arr.reduce((s, x) => s + (x[k] ?? 0), 0);
function delta(cur, prev) {
  if (!cur && !prev) return { text: '±0', tone: 'flat' };
  if (!prev) return { text: `+${cur}`, tone: 'up' };
  const p = Math.round(((cur - prev) / prev) * 100);
  return { text: `${p > 0 ? '+' : ''}${p}%`, tone: p > 0 ? 'up' : p < 0 ? 'down' : 'flat' };
}
const clock = (iso) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function Empty({ text }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 text-xs text-navy-500">
      <SignIcon size={26} weight="duotone" className="text-blue-400" />
      <p className="mt-2 max-w-[14rem]">{text}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 mt-6" aria-busy="true" aria-label="Memuat ruang kendali">
      <div className="h-28 rounded-pin bg-navy-800 animate-pulse" />
      <div className="h-32 rounded-pin bg-navy-800/90 animate-pulse" />
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 h-80 rounded-pin bg-white shadow-plate animate-pulse" />
        <div className="lg:col-span-4 h-80 rounded-pin bg-white shadow-plate animate-pulse" />
      </div>
    </div>
  );
}

export default function AdminOverview({ refreshKey, queue, onOpenQueue, sla = 24 }) {
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [hidden, setHidden] = useState({});
  const [btn, setBtn] = useState('idle');

  const load = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, status: s.data ? 'refreshing' : 'loading', error: null }));
    setBtn('loading');
    try {
      const data = await fetchOverview(days);
      setState({ status: 'ready', data, error: null });
      setBtn('success');
      setTimeout(() => setBtn('idle'), 1200);
    } catch (err) {
      setState((s) => ({ status: s.data ? 'ready' : 'error', data: s.data, error: err.response?.data?.message ?? err.message ?? 'Gagal memuat data' }));
      setBtn('idle');
    }
  }, [days]);

  useEffect(() => { load(); }, [load, refreshKey]);

  // data selalu segar: muat ulang berkala & saat tab kembali aktif
  useEffect(() => {
    const t = setInterval(() => load(true), 60000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const v = useMemo(() => {
    const d = state.data;
    if (!d) return null;
    const half = Math.floor(d.series.length / 2);
    const prev = d.series.slice(0, half);
    const cur = d.series.slice(half);
    const k = (key) => ({ cur: sum(cur, key), prev: sum(prev, key), spark: cur.map((x) => x[key]) });
    return { d, cur, k };
  }, [state.data]);

  if (state.status === 'loading') return <Skeleton />;
  if (state.status === 'error') {
    return (
      <Plate className="mt-6 text-center py-12">
        <WarningOctagon size={34} weight="duotone" className="mx-auto text-danger" />
        <p className="font-heading font-extrabold mt-3">Ruang kendali gagal memuat data</p>
        <p className="text-xs text-navy-500 mt-1 max-w-sm mx-auto">{state.error}. Pastikan server & database berjalan, lalu coba lagi.</p>
        <Button className="mt-4" icon={ArrowsClockwise} onClick={() => load()}>Coba lagi</Button>
      </Plate>
    );
  }

  const { d, cur, k } = v;
  const b = d.businesses;
  const totalBiz = Object.values(b).reduce((s, x) => s + x, 0);
  const reviewed = (b.approved ?? 0) + (b.rejected ?? 0) + (b.reported ?? 0);
  const approvalRate = totalBiz ? Math.round(((b.approved ?? 0) / totalBiz) * 100) : 0;
  const ages = d.pendingAges ?? [];
  const within = ages.filter((h) => h <= sla).length;
  const slaPct = ages.length ? (within / ages.length) * 100 : 100;
  const updated = new Date(d.generatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const isDb = d.source === 'database';

  const BOARD = [
    { code: 'U1', icon: Storefront, label: 'Usaha tayang', value: b.approved ?? 0, k: k('approvals'), note: 'disetujui', color: '#2E9E6B' },
    { code: 'U2', icon: Hourglass, label: 'Menunggu verifikasi', value: b.pending ?? 0, k: k('submissions'), note: 'pengajuan', color: '#FFC914', invert: true },
    { code: 'P1', icon: UsersThree, label: 'Produsen', value: d.users.producers ?? 0, k: k('submissions'), note: 'pengajuan', color: '#4A90D9' },
    { code: 'P2', icon: Users, label: 'Konsumen', value: d.users.consumers ?? 0, k: k('users'), note: 'pengguna baru', color: '#8B5CF6' },
    { code: 'L1', icon: Flag, label: 'Laporan terbuka', value: d.reports.open ?? 0, k: k('reports'), note: 'laporan', color: '#E05252', invert: true },
    { code: 'R1', icon: Star, label: 'Ulasan', value: d.reviews.total ?? 0, k: k('reviews'), note: 'ulasan', color: '#E6B000' },
  ];

  const series = SERIES.filter((s) => isDb || s.key !== 'users');
  const activeSeries = series.filter((s) => !hidden[s.key]);
  const anyActivity = activeSeries.some((s) => cur.some((x) => x[s.key] > 0));
  const heat = cur.map((x) => {
    const parts = series.map((s) => [s.label.toLowerCase(), x[s.key]]).filter(([, n]) => n);
    return { day: x.day, total: parts.reduce((s, [, n]) => s + n, 0), detail: parts.map(([l, n]) => `${n} ${l}`).join(', ') };
  });
  const statusData = STATUS.map((s) => ({ ...s, value: b[s.key] ?? 0 })).filter((s) => s.value > 0);
  const catData = d.categories.map((c) => {
    const m = CAT[c.category] ?? { label: c.category, icon: Storefront, color: '#4A90D9' };
    return { label: m.label, value: c.total, color: m.color, icon: <m.icon size={13} weight="duotone" /> };
  });
  const reportTotal = (d.reports.open ?? 0) + (d.reports.resolved ?? 0) + (d.reports.dismissed ?? 0);
  const buckets = [
    { l: '< 6 jam', n: ages.filter((h) => h < 6).length },
    { l: '6–12 jam', n: ages.filter((h) => h >= 6 && h < 12).length },
    { l: `12–${sla} jam`, n: ages.filter((h) => h >= 12 && h <= sla).length },
    { l: `> ${sla} jam`, n: ages.filter((h) => h > sla).length, late: true },
  ];

  return (
    <div className="mt-6 pb-10 space-y-4">
      {/* ═══ Bilah komando ═══ */}
      <Plate tone="sign" contour className="!p-0">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-5 sm:p-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <span className="font-data font-bold tracking-[0.2em] text-yellow-400">RUANG KENDALI</span>
              <span className="flex items-center gap-1.5 text-blue-200">
                {isDb ? <><StatusDot pulse /> <Database size={13} weight="duotone" /> Data langsung dari database</> : <><StatusDot color="#8FBEDC" /> <Flask size={13} weight="duotone" /> Mode demo · data tersimpan di browser</>}
              </span>
              <span className="font-data text-blue-300">upd {updated}</span>
            </div>
            <p className="font-heading font-extrabold text-xl sm:text-2xl mt-2 leading-snug">
              <span className="font-data text-yellow-400"><CountUp value={b.pending ?? 0} /></span> pengajuan menunggu,{' '}
              <span className="font-data text-yellow-400"><CountUp value={d.reports.open ?? 0} /></span> laporan terbuka,{' '}
              <span className="text-blue-300 font-bold">tingkat tayang</span> <span className="font-data text-yellow-400"><CountUp value={approvalRate} suffix="%" /></span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-navy-900/70 ring-1 ring-white/10 rounded-xl p-1" role="radiogroup" aria-label="Periode data">
              {PERIODS.map((p) => (
                <button key={p.d} type="button" role="radio" aria-checked={days === p.d} onClick={() => setDays(p.d)} className="relative w-12 py-1.5 text-xs font-data font-bold rounded-lg" title={`${p.d} hari terakhir`}>
                  {days === p.d && <motion.span layoutId="period-pill" className="absolute inset-0 bg-yellow-500 rounded-lg shadow-key" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className={`relative ${days === p.d ? 'text-navy-900' : 'text-blue-200'}`}>{p.l}</span>
                </button>
              ))}
            </div>
            <Button variant="glass" size="icon" state={btn} icon={ArrowsClockwise} onClick={() => load()} aria-label="Muat ulang data" title="Muat ulang" />
          </div>
        </div>

        {/* papan keberangkatan: satu pelat, sel dipisah garis jalur */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 border-t border-white/10">
          {BOARD.map((s, i) => {
            const dl = delta(s.k.cur, s.k.prev);
            const good = s.invert ? dl.tone === 'down' : dl.tone === 'up';
            const bad = s.invert ? dl.tone === 'up' : dl.tone === 'down';
            const DI = dl.tone === 'up' ? TrendUp : dl.tone === 'down' ? TrendDown : Minus;
            return (
              <motion.div
                key={s.code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="group relative p-4 sm:p-5 border-white/10 border-dashed [&:not(:last-child)]:border-r hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] text-blue-300">
                    <s.icon size={15} weight="duotone" style={{ color: s.color }} className="transition-transform group-hover:scale-125 group-hover:-rotate-6" />
                    <span className="font-data text-blue-400">{s.code}</span>
                  </span>
                  <span className={`flex items-center gap-0.5 font-data text-[10px] font-bold px-1.5 py-0.5 rounded ${good ? 'bg-success/20 text-emerald-300' : bad ? 'bg-danger/20 text-red-300' : 'bg-white/10 text-blue-300'}`}>
                    <DI size={11} weight="bold" /> {dl.text}
                  </span>
                </div>
                <p className="font-data font-bold text-3xl text-white mt-3 leading-none"><CountUp value={s.value} /></p>
                <p className="text-xs text-blue-200 mt-1.5">{s.label}</p>
                <div className="mt-2 opacity-80 group-hover:opacity-100 transition-opacity"><StepSpark values={s.k.spark} color={s.color} /></div>
                <p className="text-[10px] text-blue-400 font-data">{s.k.cur} {s.note} / {days}h</p>
              </motion.div>
            );
          })}
        </div>
      </Plate>

      {/* ═══ A: arus aktivitas + SLA ═══ */}
      <div className="grid lg:grid-cols-12 gap-4">
        <Plate className="lg:col-span-8" delay={0.2}>
          <Signpost code="A1" title="Arus Aktivitas" sub={`Hitungan harian · ${days} hari · arahkan kursor untuk detail`} />
          <div className="flex flex-wrap gap-1.5 mt-4" role="group" aria-label="Tampilkan seri">
            {series.map((s) => (
              <button key={s.key} type="button" aria-pressed={!hidden[s.key]} onClick={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))} className={`flex items-center gap-1.5 text-[11px] font-semibold pl-2 pr-2.5 py-1 rounded-md ring-1 transition-all active:scale-95 ${hidden[s.key] ? 'ring-blue-200 text-navy-500 opacity-60 line-through' : 'ring-navy-800/10 bg-blue-50 text-navy-800'}`}>
                <span className="w-3 h-1 rounded-full" style={{ background: s.color }} /> {s.label}
                <b className="font-data">{sum(cur, s.key)}</b>
              </button>
            ))}
          </div>
          <div className="mt-3">
            {anyActivity
              ? <RouteChart labels={cur.map((x) => x.day)} series={activeSeries.map((s) => ({ ...s, values: cur.map((x) => x[s.key]) }))} />
              : <Empty text={`Belum ada aktivitas tercatat dalam ${days} hari terakhir.`} />}
          </div>
        </Plate>

        <Plate className="lg:col-span-4" delay={0.26}>
          <Signpost code="A2" title="Ketepatan SLA" sub={`Antrean yang masih ≤ ${sla} jam`} />
          <div className="mt-4">
            <Gauge value={slaPct} label={ages.length ? `${within} dari ${ages.length} pengajuan tepat waktu` : 'Antrean kosong'} sub={ages.length ? `terlama ${Math.round(Math.max(...ages))} jam` : null} />
          </div>
          <ul className="grid grid-cols-4 gap-1.5 mt-5">
            {buckets.map((x) => (
              <li key={x.l} className={`rounded-lg px-2 py-2 text-center ring-1 ${x.late && x.n ? 'bg-danger/10 ring-danger/30 text-danger' : 'bg-blue-50 ring-navy-800/5 text-navy-700'}`}>
                <p className="font-data font-bold text-base leading-none">{x.n}</p>
                <p className="text-[9px] mt-1 leading-tight">{x.l}</p>
              </li>
            ))}
          </ul>
        </Plate>
      </div>

      {/* ═══ B: corong + kalender ═══ */}
      <div className="grid lg:grid-cols-12 gap-4">
        <Plate className="lg:col-span-5" delay={0.32}>
          <Signpost code="B1" title="Corong Verifikasi" sub="Dari pengajuan sampai tayang di peta" />
          <div className="mt-5">
            {totalBiz ? (
              <Funnel stages={[
                { key: 'all', label: 'Semua pengajuan', value: totalBiz, color: '#16294F', note: 'total terdaftar' },
                { key: 'rev', label: 'Sudah ditinjau', value: reviewed, color: '#4A90D9' },
                { key: 'ok', label: 'Tayang di peta', value: b.approved ?? 0, color: '#2E9E6B' },
              ]} />
            ) : <Empty text="Belum ada pengajuan usaha." />}
          </div>
        </Plate>

        <Plate className="lg:col-span-7" delay={0.38}>
          <Signpost code="B2" title="Kalender Aktivitas" sub="Semakin kuning, semakin ramai hari itu" />
          <div className="mt-5">{heat.some((h) => h.total) ? <Heatmap days={heat} /> : <Empty text="Belum ada aktivitas di periode ini." />}</div>
        </Plate>
      </div>

      {/* ═══ C: sebaran + komposisi ═══ */}
      <div className="grid lg:grid-cols-12 gap-4">
        <Plate className="lg:col-span-5" delay={0.44}>
          <Signpost code="C1" title="Sebaran Usaha" sub="Posisi sesuai koordinat tersimpan" right={<Link to="/admin/peta" className="flex items-center gap-1 text-[11px] font-bold text-navy-700 hover:text-yellow-600"><MapTrifold size={14} weight="duotone" /> Peta komando</Link>} />
          <div className="mt-4">{d.points?.length ? <MiniMap points={d.points} colors={STATUS_COLORS} labels={LABELS} /> : <Empty text="Belum ada titik usaha." />}</div>
          <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-navy-600">
            {STATUS.map((s) => <span key={s.key} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full rounded-bl-none -rotate-45" style={{ background: s.color }} /> {s.label}</span>)}
          </div>
        </Plate>

        <div className="lg:col-span-7 grid gap-4">
          <Plate delay={0.5}>
            <Signpost code="C2" title="Komposisi Status" sub={`${totalBiz} usaha terdaftar`} />
            <div className="mt-4">{statusData.length ? <SegmentRuler data={statusData} /> : <Empty text="Belum ada usaha." />}</div>
          </Plate>
          <div className="grid sm:grid-cols-2 gap-4">
            <Plate delay={0.56}>
              <Signpost code="C3" title="Kategori Tayang" sub={`${b.approved ?? 0} usaha`} />
              <div className="mt-4">{catData.length ? <PinColumns data={catData} /> : <Empty text="Belum ada usaha tayang." />}</div>
            </Plate>
            <Plate delay={0.62}>
              <Signpost code="C4" title="Rating Konsumen" sub={`${d.reviews.total} ulasan`} right={d.reviews.total > 0 && <span className="font-data font-bold text-lg flex items-center gap-1"><CountUp value={Number(d.reviews.avg)} decimals={1} /><Star size={15} weight="fill" className="text-yellow-500" /></span>} />
              <div className="mt-4">{d.reviews.total ? <RatingLadder dist={d.reviews.dist} total={d.reviews.total} /> : <Empty text="Belum ada ulasan dari konsumen." />}</div>
            </Plate>
          </div>
        </div>
      </div>

      {/* ═══ D: laporan + antrean + log ═══ */}
      <div className="grid lg:grid-cols-12 gap-4">
        <Plate className="lg:col-span-4" delay={0.66}>
          <Signpost code="D1" title="Laporan Konsumen" sub={`${reportTotal} laporan tercatat`} />
          {reportTotal ? (
            <>
              <div className="grid grid-cols-3 gap-1.5 mt-4">
                {[['Terbuka', d.reports.open, 'text-danger bg-danger/10'], ['Selesai', d.reports.resolved, 'text-success bg-success/10'], ['Ditolak', d.reports.dismissed, 'text-navy-600 bg-blue-100']].map(([l, n, c]) => (
                  <div key={l} className={`rounded-lg px-2.5 py-2 ${c}`}>
                    <p className="font-data font-bold text-lg leading-none"><CountUp value={n ?? 0} /></p>
                    <p className="text-[10px] font-semibold mt-1">{l}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {(d.reports.reasons ?? []).map((r) => (
                  <li key={r.reason} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 truncate text-navy-700">{reasonLabel(r.reason)}</span>
                    <span className="flex gap-0.5" aria-hidden="true">{Array.from({ length: Math.min(r.total, 10) }).map((_, i) => <span key={i} className="w-1.5 h-3 rounded-sm bg-danger/70" />)}</span>
                    <span className="font-data font-bold w-5 text-right">{r.total}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <Empty text="Belum ada laporan — ekosistem aman." />}
        </Plate>

        <Plate className="lg:col-span-5" delay={0.72}>
          <Signpost code="D2" title="Antrean Verifikasi" sub="Pengajuan terlama di atas" right={<button type="button" onClick={onOpenQueue} className="flex items-center gap-0.5 text-[11px] font-bold text-navy-700 hover:text-yellow-600">Semua <CaretRight size={12} weight="bold" /></button>} />
          <div className="mt-4">{queue}</div>
        </Plate>

        <Plate className="lg:col-span-3" delay={0.78}>
          <Signpost code="D3" title="Log Sistem" sub="Kejadian terbaru" />
          <ol className="relative mt-4 ml-2 border-l-2 border-dashed border-navy-800/15 space-y-3.5">
            <AnimatePresence initial={false}>
              {d.recent.map((a, i) => {
                const m = {
                  submission: { icon: ClipboardText, color: '#4A90D9', text: a.title, sub: `pengajuan · ${LABELS[a.meta] ?? a.meta}` },
                  review: { icon: ChatCircleDots, color: '#E6B000', text: a.title, sub: `ulasan ${a.meta}★` },
                  report: { icon: Flag, color: '#E05252', text: a.title, sub: `laporan · ${reasonLabel(a.meta)}` },
                }[a.type];
                return (
                  <motion.li key={`${a.type}-${a.title}-${a.at}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.05 }} className="relative pl-5">
                    <span className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-white ring-2 flex items-center justify-center" style={{ '--tw-ring-color': m.color }}>
                      <m.icon size={11} weight="duotone" style={{ color: m.color }} />
                    </span>
                    <p className="text-xs font-semibold leading-snug truncate">{m.text}</p>
                    <p className="text-[10px] text-navy-500 truncate">{m.sub}</p>
                    <p className="text-[10px] font-data text-navy-500">{clock(a.at)}</p>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
          {!d.recent.length && <Empty text="Belum ada kejadian." />}
          <p className="flex items-center gap-1 text-[10px] text-navy-500 mt-4"><SealCheck size={12} weight="duotone" className="text-success" /> Semua angka dihitung dari data sistem</p>
        </Plate>
      </div>

      {state.status === 'refreshing' && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-navy-900 text-blue-50 text-xs font-data px-3 py-2 rounded-lg shadow-xl">
          <ArrowsClockwise size={13} className="animate-spin" /> memperbarui…
        </div>
      )}
    </div>
  );
}
