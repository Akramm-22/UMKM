import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, animate, useInView, useReducedMotion } from 'motion/react';

const nf = new Intl.NumberFormat('id-ID');
const fmtDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

export function CountUp({ value, decimals = 0, duration = 1.2, suffix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  const [go, setGo] = useState(false);
  // cadangan bila IntersectionObserver tidak terpicu (mis. dalam iframe/tab latar)
  useEffect(() => { const t = setTimeout(() => setGo(true), 900); return () => clearTimeout(t); }, []);
  const start = inView || go;
  useEffect(() => {
    if (!start) return undefined;
    if (reduce) { setN(value); return undefined; }
    const c = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setN, onComplete: () => setN(value) });
    const safety = setTimeout(() => setN(value), duration * 1000 + 300);
    return () => { c.stop(); clearTimeout(safety); };
  }, [value, start, reduce, duration]);
  const text = decimals ? n.toFixed(decimals).replace('.', ',') : nf.format(Math.round(n));
  return <span ref={ref} className="font-data">{text}{suffix}</span>;
}

// garis tren mini bergaya tangga (step): hitungan harian, bukan kurva tebakan
export function StepSpark({ values, color = '#FFC914', height = 26 }) {
  const max = Math.max(1, ...values);
  const w = 100;
  const n = Math.max(1, values.length);
  let d = '';
  values.forEach((v, i) => {
    const y = height - 2 - (v / max) * (height - 5);
    d += `${i === 0 ? 'M' : 'L'}${(i / n) * w},${y} L${((i + 1) / n) * w},${y} `;
  });
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden="true">
      <motion.path d={d || `M0,${height - 2} L${w},${height - 2}`} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
    </svg>
  );
}

// grafik aktivitas: area bertingkat dengan mistar skala & kolom sorot
export function RouteChart({ labels, series, height = 230 }) {
  const gid = useId();
  const box = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = height;
  const pad = { l: 34, r: 8, t: 14, b: 28 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const nice = Math.max(4, Math.ceil(max / 4) * 4);
  const n = labels.length;
  const bw = (W - pad.l - pad.r) / n;
  const x = (i) => pad.l + i * bw;
  const y = (v) => pad.t + (1 - v / nice) * (H - pad.t - pad.b);
  const step = Math.max(1, Math.ceil(n / 7));

  const onMove = (e) => {
    const r = box.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - pad.l) / bw))));
  };

  return (
    <div className="relative" ref={box} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} role="img" aria-label="Grafik aktivitas harian">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity=".22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0, nice / 2, nice].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#0F1E3D" strokeOpacity={t ? 0.08 : 0.3} strokeDasharray={t ? '2 5' : undefined} />
            <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" fill="#3A5680" fontSize="10" fontFamily="JetBrains Mono, monospace">{t}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <line key={`t-${l}`} x1={x(i)} x2={x(i)} y1={H - pad.b} y2={H - pad.b + (i % step === 0 ? 6 : 3)} stroke="#0F1E3D" strokeOpacity=".35" />
        ))}
        {labels.map((l, i) => i % step === 0 && (
          <text key={l} x={x(i) + bw / 2} y={H - 6} textAnchor="middle" fill="#3A5680" fontSize="10" fontFamily="JetBrains Mono, monospace">{fmtDay(l)}</text>
        ))}
        {hover != null && <rect x={x(hover)} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="#FFC914" fillOpacity=".16" rx="3" />}
        {series.map((s, si) => {
          let d = '';
          s.values.forEach((v, i) => { d += `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)} L${x(i + 1)},${y(v)} `; });
          return (
            <g key={s.key}>
              <motion.path d={`${d} L${x(n)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${gid}-${s.key})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 + si * 0.1 }} />
              <motion.path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, delay: si * 0.12, ease: 'easeInOut' }} />
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-40 bg-navy-900 text-blue-50 rounded-lg px-3 py-2 shadow-xl text-xs ring-1 ring-white/10"
          style={{ left: `${((x(hover) + bw / 2) / W) * 100}%`, transform: `translateX(${x(hover) / W > 0.62 ? 'calc(-100% - 14px)' : '14px'})` }}
        >
          <p className="font-data text-yellow-400">{fmtDay(labels[hover])}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-0.5 rounded-full" style={{ background: s.color }} />
              <span className="flex-1 text-blue-200">{s.label}</span>
              <b className="font-data">{s.values[hover]}</b>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// corong verifikasi: lebar pita sebanding jumlah, disambung aliran trapesium
export function Funnel({ stages }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  const [active, setActive] = useState(null);
  return (
    <div>
      {stages.map((s, i) => {
        const w = Math.max(10, (s.value / max) * 100);
        const next = stages[i + 1];
        const nw = next ? Math.max(10, (next.value / max) * 100) : 0;
        const prev = stages[i - 1];
        const rate = prev?.value ? Math.round((s.value / prev.value) * 100) : null;
        return (
          <div key={s.key} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 h-10">
                <motion.div
                  className="absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-lg flex items-center justify-center"
                  style={{ background: s.color }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${w}%`, opacity: active == null || active === i ? 1 : 0.45 }}
                  transition={{ width: { duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] } }}
                >
                  <span className={`font-data text-sm font-bold ${s.dark ? 'text-navy-900' : 'text-white'}`}>{s.value}</span>
                </motion.div>
              </div>
              <div className="w-36 shrink-0">
                <p className="text-xs font-bold text-navy-800 leading-tight">{s.label}</p>
                <p className="text-[10px] text-navy-500 font-data">{rate != null ? `${rate}% dari tahap sebelumnya` : s.note}</p>
              </div>
            </div>
            {next && (
              <div className="pr-[9.75rem]">
                <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-3" aria-hidden="true">
                  <path d={`M${50 - w / 2} 0 L${50 + w / 2} 0 L${50 + nw / 2} 10 L${50 - nw / 2} 10 Z`} fill={s.color} fillOpacity=".18" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const polar = (a, r) => [100 + r * Math.cos(((a - 90) * Math.PI) / 180), 100 + r * Math.sin(((a - 90) * Math.PI) / 180)];
const arc = (from, to, r) => {
  const [x0, y0] = polar(from, r);
  const [x1, y1] = polar(to, r);
  return `M${x0} ${y0} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

// spidometer: jarum menunjuk persentase (mis. antrean yang masih dalam SLA)
export function Gauge({ value, label, sub }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 80 ? '#2E9E6B' : pct >= 50 ? '#E6B000' : '#E05252';
  return (
    <div className="relative w-full max-w-[15rem] mx-auto">
      <svg viewBox="0 0 200 170" className="w-full" role="img" aria-label={`${label}: ${Math.round(pct)}%`}>
        <path d={arc(-120, 120, 78)} stroke="#EEF6FB" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={arc(-120, -40, 78)} stroke="#E05252" strokeOpacity=".22" strokeWidth="14" fill="none" />
        <path d={arc(-40, 40, 78)} stroke="#E6B000" strokeOpacity=".22" strokeWidth="14" fill="none" />
        <path d={arc(40, 120, 78)} stroke="#2E9E6B" strokeOpacity=".22" strokeWidth="14" fill="none" />
        <motion.path d={arc(-120, 120, 78)} stroke={color} strokeWidth="14" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(0.001, pct / 100) }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
        {Array.from({ length: 13 }).map((_, i) => {
          const a = -120 + i * 20;
          const [x1, y1] = polar(a, 61);
          const [x2, y2] = polar(a, i % 3 === 0 ? 52 : 56);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0F1E3D" strokeOpacity=".35" strokeWidth="1.5" />;
        })}
        <motion.g initial={{ rotate: -120 }} animate={{ rotate: -120 + (pct / 100) * 240 }} transition={{ type: 'spring', stiffness: 60, damping: 12, delay: 0.2 }} style={{ transformOrigin: '100px 100px', transformBox: 'view-box' }}>
          <path d="M100 40 L104 100 L96 100 Z" fill="#0F1E3D" />
        </motion.g>
        <circle cx="100" cy="100" r="8" fill="#0F1E3D" />
        <circle cx="100" cy="100" r="3" fill="#FFC914" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="font-heading font-extrabold text-3xl leading-none" style={{ color }}><CountUp value={pct} suffix="%" /></p>
        <p className="text-[11px] font-semibold text-navy-600 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-navy-500 font-data">{sub}</p>}
      </div>
    </div>
  );
}

// kalender panas: satu kotak per hari, intensitas = total aktivitas
export function Heatmap({ days }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.total));
  const first = days[0] ? new Date(`${days[0].day}T00:00:00`) : new Date();
  const lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...days];
  const shade = (v) => (v === 0 ? '#EEF6FB' : `rgba(255, 201, 20, ${0.3 + (v / max) * 0.7})`);
  return (
    <div>
      <div className="flex gap-3">
        <div className="grid grid-rows-7 gap-1 text-[9px] font-data text-navy-500" aria-hidden="true">
          {['Sen', '', 'Rab', '', 'Jum', '', 'Min'].map((d, i) => <span key={i} className="flex items-center">{d}</span>)}
        </div>
        <div className="flex-1 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto no-scrollbar" style={{ gridAutoColumns: 'minmax(12px, 30px)' }}>
          {cells.map((c, i) => (c ? (
            <motion.button
              key={c.day}
              type="button"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.005 }}
              whileHover={{ scale: 1.2 }}
              onMouseEnter={() => setHover(c)}
              onFocus={() => setHover(c)}
              onMouseLeave={() => setHover(null)}
              onBlur={() => setHover(null)}
              className={`w-full aspect-square rounded-[5px] ${c.total ? 'ring-1 ring-navy-800/15' : ''}`}
              style={{ background: shade(c.total) }}
              aria-label={`${fmtDay(c.day)}: ${c.total} aktivitas`}
            />
          ) : <span key={`p-${i}`} className="w-full aspect-square" />))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 min-h-5 text-[11px]">
        <p className="text-navy-600 font-data">{hover ? `${fmtDay(hover.day)} · ${hover.total} aktivitas${hover.detail ? ` (${hover.detail})` : ''}` : 'Arahkan ke kotak untuk detail harian'}</p>
        <span className="flex items-center gap-1 text-[10px] text-navy-500">sepi {[0, 0.34, 0.67, 1].map((v) => <span key={v} className="w-2.5 h-2.5 rounded-[3px]" style={{ background: shade(v * max) }} />)} ramai</span>
      </div>
    </div>
  );
}

// penggaris komposisi: satu batang 100% bersegmen + skala, lebih mudah dibandingkan daripada donat
export function SegmentRuler({ data }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="flex h-9 rounded-lg overflow-hidden ring-1 ring-navy-800/10">
        {data.map((d, i) => (
          <motion.button
            key={d.key}
            type="button"
            initial={{ flexGrow: 0 }}
            animate={{ flexGrow: d.value, opacity: active == null || active === i ? 1 : 0.4 }}
            transition={{ flexGrow: { duration: 0.9, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] } }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="basis-0 min-w-[6px] flex items-center justify-center font-data text-xs font-bold"
            style={{ background: d.color, color: d.dark ? '#0A1428' : '#fff' }}
            aria-label={`${d.label}: ${d.value}`}
          >
            {total && d.value / total > 0.08 ? d.value : ''}
          </motion.button>
        ))}
      </div>
      <div className="h-2 mt-1 bg-ruler" aria-hidden="true" />
      <div className="flex justify-between font-data text-[9px] text-navy-500" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3">
        {data.map((d, i) => (
          <li key={d.key} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className={`flex items-center gap-2 text-xs rounded-md px-1.5 py-1 transition-colors ${active === i ? 'bg-blue-100' : ''}`}>
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className="flex-1 text-navy-700 truncate">{d.label}</span>
            <span className="font-data font-bold">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// kolom berujung pin peta untuk kategori
export function PinColumns({ data, height = 150 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-around gap-4" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="group flex-1 max-w-20 h-full flex flex-col items-center justify-end">
          <motion.div className="w-full flex flex-col items-center" initial={{ height: 0 }} animate={{ height: `${Math.max(14, (d.value / max) * 80)}%` }} transition={{ duration: 0.9, delay: 0.2 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}>
            <span className="relative z-10 -mb-2 w-10 h-10 shrink-0 rounded-full rounded-bl-none -rotate-45 flex items-center justify-center shadow-md ring-2 ring-white transition-transform group-hover:-translate-y-1" style={{ background: d.color }}>
              <span className="rotate-45 font-data text-xs font-bold text-white">{d.value}</span>
            </span>
            <span className="flex-1 w-1.5" style={{ background: `repeating-linear-gradient(180deg, ${d.color} 0 6px, transparent 6px 10px)` }} />
          </motion.div>
          <span className="mt-2 text-[11px] font-semibold text-navy-600 flex items-center gap-1">{d.icon}{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// tangga rating 5→1
export function RatingLadder({ dist, total }) {
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map((r) => dist?.[r] ?? 0));
  return (
    <ul className="space-y-2">
      {[5, 4, 3, 2, 1].map((r, i) => {
        const v = dist?.[r] ?? 0;
        const color = r >= 4 ? '#2E9E6B' : r === 3 ? '#E6B000' : '#E05252';
        return (
          <li key={r} className="flex items-center gap-3 text-xs">
            <span className="w-6 font-data text-navy-600">{r}★</span>
            <div className="flex-1 h-2.5 rounded-full bg-blue-100 overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${(v / max) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.07 }} />
            </div>
            <span className="w-16 text-right font-data text-navy-700">{v}<span className="text-navy-500"> · {total ? Math.round((v / total) * 100) : 0}%</span></span>
          </li>
        );
      })}
    </ul>
  );
}

// peta mini sebaran usaha di atas kontur (proyeksi lat/lng sederhana)
export function MiniMap({ points, colors, labels }) {
  const [hover, setHover] = useState(null);
  const box = useMemo(() => {
    if (!points.length) return null;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const pad = 0.002;
    return { minLat: Math.min(...lats) - pad, maxLat: Math.max(...lats) + pad, minLng: Math.min(...lngs) - pad, maxLng: Math.max(...lngs) + pad };
  }, [points]);
  if (!box) return null;
  const pos = (p) => ({ left: `${((p.lng - box.minLng) / (box.maxLng - box.minLng)) * 100}%`, top: `${((box.maxLat - p.lat) / (box.maxLat - box.minLat)) * 100}%` });
  return (
    <div className="relative aspect-[4/3] rounded-xl bg-blue-50 bg-contour ring-1 ring-navy-800/10 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-5 52 C 20 46, 35 60, 55 50 S 90 30, 105 36" stroke="#fff" strokeWidth="3.5" fill="none" />
        <path d="M38 -5 C 42 20, 30 45, 44 80" stroke="#fff" strokeWidth="3" fill="none" />
        <path d="M-5 52 C 20 46, 35 60, 55 50 S 90 30, 105 36" stroke="#0F1E3D" strokeOpacity=".25" strokeWidth=".6" strokeDasharray="2 2" fill="none" className="animate-dash" />
      </svg>
      {points.map((p, i) => (
        <motion.button
          key={`${p.lat}-${p.lng}-${i}`}
          type="button"
          className="absolute -translate-x-1/2 -translate-y-full"
          style={pos(p)}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 400, damping: 18 }}
          onMouseEnter={() => setHover(p)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(p)}
          onBlur={() => setHover(null)}
          aria-label={`${labels?.[p.category] ?? p.category} · ${labels?.[p.status] ?? p.status}`}
        >
          {p.status === 'pending' && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full animate-ping" style={{ background: `${colors[p.status]}55` }} />}
          <span className="relative block w-4 h-4 rounded-full rounded-bl-none -rotate-45 ring-2 ring-white shadow" style={{ background: colors[p.status] ?? '#4A90D9' }} />
        </motion.button>
      ))}
      {hover && (
        <p className="absolute left-2 bottom-2 bg-navy-900 text-blue-50 text-[10px] font-data px-2 py-1 rounded-md">
          {labels?.[hover.category] ?? hover.category} · {labels?.[hover.status] ?? hover.status} · {hover.lat.toFixed(4)}, {hover.lng.toFixed(4)}
        </p>
      )}
    </div>
  );
}
