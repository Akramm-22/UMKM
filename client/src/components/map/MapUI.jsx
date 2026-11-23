import { useState } from 'react';
import { useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'motion/react';
import {
  LocateFixed, Plus, Minus, Layers, X, Navigation, ExternalLink, Star, Clock, MapPin, ChevronLeft, ChevronRight,
  CornerUpLeft, CornerUpRight, ArrowUp, RotateCcw, Flag, Maximize2, Route as RouteIcon, Car,
} from 'lucide-react';
import { TILE_LAYERS } from './MapLayers.jsx';
import { fmtDistance, fmtDuration, arrivalTime } from '../../lib/routing.js';
import { openStatus, distanceKm } from '../../lib/place.js';
import { ROUTE_MODES } from '../BusinessDetailPanel.jsx';

export function MapControls({ onLocate, locating, following, onFitResults, canFit }) {
  const map = useMap();
  const btn = 'w-10 h-10 flex items-center justify-center text-navy-700 hover:bg-blue-50 transition-colors';
  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col items-center gap-2">
      {canFit && (
        <button type="button" onClick={onFitResults} className="w-10 h-10 rounded-xl bg-white shadow-lg shadow-navy-900/20 flex items-center justify-center text-navy-700 hover:bg-blue-50 transition-colors" aria-label="Tampilkan semua hasil" title="Tampilkan semua hasil">
          <Maximize2 size={17} />
        </button>
      )}
      <button
        type="button"
        onClick={onLocate}
        className={`w-10 h-10 rounded-xl shadow-lg shadow-navy-900/20 flex items-center justify-center transition-colors ${following ? 'bg-info text-white' : 'bg-white text-info hover:bg-blue-50'}`}
        aria-label="Kembali ke lokasi saya"
        title="Lokasi saya"
      >
        <LocateFixed size={19} className={locating ? 'animate-pulse' : ''} />
      </button>
      <div className="bg-white rounded-xl shadow-lg shadow-navy-900/20 overflow-hidden flex flex-col divide-y divide-blue-200">
        <button type="button" onClick={() => map.zoomIn()} className={btn} aria-label="Perbesar" title="Perbesar"><Plus size={18} /></button>
        <button type="button" onClick={() => map.zoomOut()} className={btn} aria-label="Perkecil" title="Perkecil"><Minus size={18} /></button>
      </div>
    </div>
  );
}

export function LayerPicker({ layer, onChange }) {
  const [open, setOpen] = useState(false);
  const next = layer === 'satelit' ? 'standar' : 'satelit';
  return (
    <div className="absolute bottom-6 left-4 z-[1000] flex items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg shadow-navy-900/30 group"
        aria-label="Pilih lapisan peta"
        title="Lapisan peta"
      >
        <img src={TILE_LAYERS[next].preview} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-navy-900/80 to-transparent text-white text-[10px] font-bold pt-3 pb-1">
          <Layers size={11} /> Lapisan
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="bg-white rounded-2xl shadow-xl shadow-navy-900/25 p-2 flex gap-2" role="radiogroup" aria-label="Lapisan peta">
            {Object.entries(TILE_LAYERS).map(([key, l]) => (
              <button key={key} type="button" role="radio" aria-checked={layer === key} onClick={() => { onChange(key); setOpen(false); }} className="flex flex-col items-center gap-1">
                <span className={`block w-14 h-14 rounded-lg overflow-hidden border-2 ${layer === key ? 'border-info' : 'border-transparent'}`}>
                  <img src={l.preview} alt="" className="w-full h-full object-cover" />
                </span>
                <span className={`text-[11px] font-semibold ${layer === key ? 'text-info' : 'text-navy-700'}`}>{l.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const maneuverIcon = (s) => {
  if (!s) return ArrowUp;
  if (s.type === 'arrive') return Flag;
  if (s.modifier === 'uturn') return RotateCcw;
  if (s.modifier?.includes('left')) return CornerUpLeft;
  if (s.modifier?.includes('right')) return CornerUpRight;
  return ArrowUp;
};

const modeOf = (key) => ROUTE_MODES.find((m) => m.key === key) ?? { label: 'Mobil', icon: Car };

// kartu ringkasan rute di atas peta (gaya Waze/Google Maps): durasi, jarak, waktu tiba, rute alternatif
export function RouteCard({ route, onPickAlt, onStart, onClose, gmapsUrl, className = '' }) {
  const M = modeOf(route.mode);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className={`bg-white rounded-2xl shadow-xl shadow-navy-900/25 p-3.5 w-[min(24rem,calc(100vw-2rem))] ${className}`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-blue-100 text-navy-700 flex items-center justify-center shrink-0"><M.icon size={19} /></span>
        <div className="flex-1 min-w-0">
          <p className="leading-tight">
            <span className="font-heading font-extrabold text-xl text-success">{fmtDuration(route.min)}</span>
            <span className="text-sm text-navy-500 ml-1.5">{fmtDistance(route.km)}</span>
          </p>
          <p className="text-xs text-navy-500 mt-0.5 truncate">Tiba ± {arrivalTime(route.min)} · {M.label}{route.via ? ` · via ${route.via}` : ''}</p>
          <p className="text-[11px] text-navy-500 truncate">ke <b className="text-navy-700">{route.to}</b></p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-blue-100 text-navy-500" aria-label="Hapus rute"><X size={16} /></button>
      </div>
      {route.routes.length > 1 && (
        <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Pilihan rute">
          {route.routes.map((r, i) => (
            <button key={i} type="button" role="radio" aria-checked={i === route.active} onClick={() => onPickAlt(i)} className={`shrink-0 text-left px-3 py-1.5 rounded-xl border text-xs transition-colors ${i === route.active ? 'border-info bg-info/10 text-navy-800' : 'border-blue-200 text-navy-600 hover:border-navy-500'}`}>
              <span className="font-bold block">{fmtDuration(r.min)}</span>
              <span className="text-[10px] text-navy-500">{fmtDistance(r.km)}{i === 0 ? ' · tercepat' : ''}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={onStart} className="flex-1 flex items-center justify-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-bold py-2.5 rounded-xl transition-colors">
          <Navigation size={15} /> Mulai
        </button>
        <a href={gmapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 border border-blue-300 hover:bg-blue-50 text-navy-700 text-sm font-bold px-3.5 rounded-xl transition-colors" title="Buka di Google Maps">
          <ExternalLink size={15} /> Google Maps
        </a>
      </div>
    </motion.div>
  );
}

// mode navigasi: banner manuver atas + bilah sisa perjalanan bawah
export function NavigationOverlay({ route, step, onStep, onExit, userPos, precise, gmapsUrl }) {
  const steps = route.steps;
  const cur = steps[step];
  const next = steps[step + 1];
  const Icon = maneuverIcon(cur);
  const toManeuver = precise && cur ? distanceKm(userPos, cur.at) : (steps[step - 1]?.m ?? 0) / 1000;
  const remainingKm = Math.max(0, steps.slice(Math.max(0, step - 1)).reduce((s, x) => s + x.m, 0) / 1000) || route.km;
  const remainingMin = Math.max(1, Math.round((route.min * remainingKm) / route.km));
  const NextIcon = maneuverIcon(next);

  return (
    <>
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute top-3 inset-x-3 md:left-1/2 md:-translate-x-1/2 md:w-[28rem] z-[1250]" role="status" aria-live="polite">
        <div className="bg-success text-white rounded-2xl shadow-xl shadow-navy-900/30 px-4 py-3.5 flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Icon size={28} /></span>
          <div className="min-w-0 flex-1">
            {(precise || step > 0) && cur?.type !== 'arrive' && <p className="font-heading font-extrabold text-xl leading-none">{fmtDistance(toManeuver)}</p>}
            <p className="font-semibold text-[15px] leading-snug mt-0.5">{cur?.text ?? 'Ikuti rute'}</p>
          </div>
        </div>
        {next && (
          <div className="mx-3 bg-[#237d55] text-white/95 rounded-b-xl px-4 py-1.5 text-xs flex items-center gap-2">
            Lalu <NextIcon size={14} /> <span className="truncate">{next.text}</span>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-4 inset-x-3 md:left-1/2 md:-translate-x-1/2 md:w-[28rem] z-[1250] bg-white rounded-2xl shadow-xl shadow-navy-900/30 p-3.5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onExit} className="w-11 h-11 rounded-full bg-danger/10 text-danger hover:bg-danger/20 flex items-center justify-center shrink-0" aria-label="Keluar dari navigasi"><X size={20} /></button>
          <div className="flex-1 min-w-0 text-center">
            <p className="font-heading font-extrabold text-lg text-success leading-tight">{fmtDuration(remainingMin)}</p>
            <p className="text-xs text-navy-500">{fmtDistance(remainingKm)} · tiba ± {arrivalTime(remainingMin)}</p>
          </div>
          <a href={gmapsUrl} target="_blank" rel="noreferrer" className="w-11 h-11 rounded-full bg-blue-100 text-navy-700 hover:bg-blue-200 flex items-center justify-center shrink-0" aria-label="Lanjutkan di Google Maps" title="Navigasi suara di Google Maps"><ExternalLink size={18} /></a>
        </div>
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-blue-100">
          <button type="button" onClick={() => onStep(step - 1)} disabled={step === 0} className="flex items-center gap-1 text-xs font-bold text-navy-700 disabled:opacity-30 px-2 py-1.5 rounded-lg hover:bg-blue-50"><ChevronLeft size={15} /> Sebelumnya</button>
          <span className="text-[11px] text-navy-500">Langkah {step + 1}/{steps.length}{precise ? ' · mengikuti GPS' : ' · mode pratinjau'}</span>
          <button type="button" onClick={() => onStep(step + 1)} disabled={step >= steps.length - 1} className="flex items-center gap-1 text-xs font-bold text-navy-700 disabled:opacity-30 px-2 py-1.5 rounded-lg hover:bg-blue-50">Berikutnya <ChevronRight size={15} /></button>
        </div>
      </motion.div>
    </>
  );
}

// kartu pratinjau saat pin diketuk di HP (seperti Google Maps): ringkas, lalu "Detail" atau "Rute"
export function PlacePreview({ biz, dist, category, onDetail, onRoute, onClose }) {
  const st = openStatus(biz.open_hours, biz.is_open);
  return (
    <motion.div
      initial={{ y: '110%' }}
      animate={{ y: 0 }}
      exit={{ y: '110%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.1, bottom: 0.6 }}
      onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); else if (info.offset.y < -60) onDetail(); }}
      className="md:hidden absolute bottom-3 inset-x-3 z-[1150] bg-white rounded-3xl shadow-2xl shadow-navy-900/30 overflow-hidden"
      role="dialog"
      aria-label={`Ringkasan ${biz.name}`}
    >
      <div className="w-10 h-1.5 rounded-full bg-blue-300 mx-auto mt-2" aria-hidden="true" />
      <button type="button" onClick={onDetail} className="w-full text-left flex gap-3 px-4 pt-2 pb-3">
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-base text-navy-800 leading-tight">{biz.name}</p>
          <p className="text-xs text-navy-500 mt-1 flex items-center gap-1 flex-wrap">
            {biz.rating != null && <><span className="text-navy-800 font-semibold">{Number(biz.rating).toFixed(1).replace('.', ',')}</span><Star size={11} className="text-yellow-400 fill-yellow-400" /><span>({biz.reviews ?? 0})</span><span>·</span></>}
            <span>{biz.subcategory ?? category.label}</span>
          </p>
          <p className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
            {st && <span className={`font-semibold ${st.open ? 'text-success' : 'text-danger'}`}>{st.label}</span>}
            {st?.detail && <span className="text-navy-500 flex items-center gap-1"><Clock size={11} /> {st.detail}</span>}
          </p>
          <p className="text-xs text-navy-500 mt-1 flex items-center gap-1 truncate"><MapPin size={11} className="shrink-0" /> {fmtDistance(dist)} · {biz.address?.split(',')[0] ?? 'Alamat belum diisi'}</p>
        </div>
        {(biz.photo || biz.photo_url) && <img src={biz.photo ?? biz.photo_url} alt="" className="w-24 h-24 rounded-2xl object-cover shrink-0" />}
      </button>
      <div className="flex gap-2 px-4 pb-4">
        <button type="button" onClick={onRoute} className="flex-1 flex items-center justify-center gap-1.5 bg-navy-800 text-blue-50 text-sm font-bold py-2.5 rounded-full"><RouteIcon size={15} /> Rute</button>
        <button type="button" onClick={onDetail} className="flex-1 flex items-center justify-center gap-1.5 border border-blue-300 text-navy-700 text-sm font-bold py-2.5 rounded-full">Lihat detail</button>
        <button type="button" onClick={onClose} className="w-10 flex items-center justify-center rounded-full border border-blue-300 text-navy-500" aria-label="Tutup ringkasan"><X size={16} /></button>
      </div>
    </motion.div>
  );
}
