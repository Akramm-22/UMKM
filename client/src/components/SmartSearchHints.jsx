import { useState } from 'react';
import { Sparkles, LocateFixed, MapPin, X, Loader2, ArrowUpDown } from 'lucide-react';
import { describe } from '../../../shared/smartSearch.mjs';

// baris "dipahami sebagai" + alternatif lokasi manual di atas daftar hasil
export default function SmartSearchHints({ search, parsed, sortedBy, originLabel, needsLocation, area, areaState, onLocate, onArea, onClearArea }) {
  const [areaText, setAreaText] = useState('');
  const q = search.trim();
  const chips = q ? describe(parsed) : [];

  const submitArea = (e) => {
    e.preventDefault();
    if (areaText.trim()) onArea(areaText.trim());
  };

  if (!q && !area && !areaState.loading && !areaState.error && !needsLocation) return null;

  return (
    <div className="px-4 py-3 border-b border-blue-200 bg-blue-50/60 space-y-2.5">
      {q && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-navy-500 flex items-center gap-1"><Sparkles size={12} className="text-yellow-600" /> Dipahami sebagai</p>
          <div className="flex flex-wrap gap-1.5 mt-2" aria-live="polite">
            {chips.length ? chips.map((c) => (
              <span key={c.key} className="text-xs font-semibold text-navy-800 bg-white border border-blue-200 px-2.5 py-1 rounded-full">{c.emoji} {c.label}</span>
            )) : <span className="text-xs text-navy-500">Pencarian teks bebas</span>}
          </div>
          <p className="text-xs text-navy-500 mt-2 flex items-center gap-1.5">
            <ArrowUpDown size={12} /> Urut {sortedBy}{sortedBy === 'jarak terdekat' ? ` ${originLabel}` : ''}
          </p>
        </div>
      )}

      {area && (
        <p className="flex items-center gap-1.5 text-xs text-navy-700">
          <MapPin size={13} className="text-info shrink-0" />
          <span className="truncate" title={area.detail}>Titik acuan: <b>{area.label}</b></span>
          <button type="button" onClick={onClearArea} className="ml-auto p-1 rounded-full hover:bg-blue-200 text-navy-500" aria-label="Hapus titik acuan area"><X size={12} /></button>
        </p>
      )}
      {areaState.loading && <p className="text-xs text-navy-500 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Mencari area…</p>}
      {areaState.error && <p className="text-xs text-danger">{areaState.error}</p>}

      {needsLocation && (
        <div className="bg-white border border-yellow-500/40 rounded-xl p-3">
          <p className="text-xs text-navy-700">Lokasimu belum aktif, jadi jarak dihitung dari titik perkiraan.</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <button type="button" onClick={onLocate} className="flex items-center gap-1 text-xs font-bold text-white bg-navy-800 hover:bg-navy-700 px-3 py-1.5 rounded-full transition-colors">
              <LocateFixed size={12} /> Izinkan lokasi
            </button>
            <span className="text-[11px] text-navy-500">atau</span>
            <form onSubmit={submitArea} className="flex-1 min-w-[10rem] flex items-center gap-1 bg-blue-50 border border-blue-200 focus-within:border-navy-500 rounded-full pl-3 pr-1 py-0.5">
              <input
                value={areaText}
                onChange={(e) => setAreaText(e.target.value.slice(0, 80))}
                placeholder="Ketik area/alamat, mis. Kemang"
                aria-label="Area atau alamat sebagai titik acuan"
                className="flex-1 min-w-0 bg-transparent outline-none text-xs py-1"
              />
              <button type="submit" disabled={!areaText.trim() || areaState.loading} className="text-[11px] font-bold text-navy-800 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 px-2.5 py-1 rounded-full transition-colors">Pakai</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
