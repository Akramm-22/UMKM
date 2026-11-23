import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X, Clock, MapPin, TrendingUp, ArrowUpLeft } from 'lucide-react';
import { suggest, SUGGESTIONS } from '../../../../shared/smartSearch.mjs';
import { fmtDistance } from '../../lib/routing.js';

const RECENT_KEY = 'pl_recent_searches';
const EMOJI = { kuliner: '🍜', jasa: '🔧', toko: '🛒' };

export function readRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
export function pushRecent(text) {
  const t = text.trim();
  if (!t) return;
  const next = [t, ...readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

// tebalkan bagian yang belum diketik, seperti autocomplete Google Maps
function Highlight({ text, typed }) {
  const i = text.toLowerCase().indexOf(typed.toLowerCase().trim());
  if (!typed.trim() || i !== 0) return <span className="font-semibold">{text}</span>;
  return <span>{text.slice(0, typed.trim().length)}<b className="font-bold">{text.slice(typed.trim().length)}</b></span>;
}

export default function SearchBox({ value, onChange, onSubmit, onPickPlace, pool, origin, placeholder, variant = 'panel', onFocus, autoFocus = false }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState(readRecent);
  const [debounced, setDebounced] = useState(value);
  const wrap = useRef(null);
  const input = useRef(null);
  const listId = useId();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 120);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const close = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const sugg = useMemo(() => (debounced.trim() ? suggest(debounced, pool, origin) : null), [debounced, pool, origin]);

  const items = useMemo(() => {
    if (!sugg) {
      return [
        ...recent.map((t) => ({ kind: 'recent', text: t })),
        ...SUGGESTIONS.filter((s) => !recent.some((r) => r.toLowerCase() === s.toLowerCase())).slice(0, 5).map((t) => ({ kind: 'popular', text: t })),
      ];
    }
    return [
      ...sugg.places.map((p) => ({ kind: 'place', ...p })),
      ...sugg.queries.map((q) => ({ kind: 'query', ...q })),
    ];
  }, [sugg, recent]);

  const commit = (text) => {
    pushRecent(text);
    setRecent(readRecent());
    setOpen(false);
    setActive(-1);
    input.current?.blur();
    onSubmit(text);
  };

  const pick = (item) => {
    if (item.kind === 'place') {
      pushRecent(item.biz.name);
      setRecent(readRecent());
      setOpen(false);
      onPickPlace(item.biz);
      return;
    }
    onChange(item.text);
    commit(item.text);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && items[active]) pick(items[active]);
      else if (value.trim()) commit(value);
    } else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };

  const removeRecent = (t) => {
    const next = readRecent().filter((x) => x !== t);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setRecent(next);
  };

  const shell = variant === 'floating'
    ? 'bg-white rounded-full px-4 py-3 shadow-lg shadow-navy-800/15'
    : 'bg-white rounded-full shadow-md shadow-navy-900/10 border border-blue-200 px-4 py-2.5 focus-within:border-navy-600';
  const showList = open && items.length > 0;
  const firstQuery = items.findIndex((x) => x.kind === 'query');
  const firstPopular = items.findIndex((x) => x.kind === 'popular');

  return (
    <div ref={wrap} className="relative">
      <div className={`flex items-center gap-2 transition-colors ${shell} ${showList ? 'rounded-b-none rounded-t-3xl' : ''}`}>
        <Search size={17} className="text-navy-500 shrink-0" aria-hidden="true" />
        <input
          ref={input}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Cari usaha, kategori, atau menu"
          autoFocus={autoFocus}
          enterKeyHint="search"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => { setOpen(true); onFocus?.(); }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="w-full outline-none text-sm text-navy-800 placeholder:text-navy-500/60 bg-transparent"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); onSubmit(''); input.current?.focus(); }} className="text-navy-500 hover:text-navy-800" aria-label="Hapus pencarian">
            <X size={16} />
          </button>
        )}
      </div>

      {showList && (
        <ul id={listId} role="listbox" aria-label="Saran pencarian" className="absolute left-0 right-0 top-full z-[1300] bg-white rounded-b-3xl shadow-xl shadow-navy-900/20 border border-t-0 border-blue-200 py-1.5 max-h-[60vh] overflow-y-auto">
          {items.map((it, i) => {
            const sel = i === active;
            const base = `flex items-center gap-3 px-4 py-2.5 cursor-pointer ${sel ? 'bg-blue-100' : 'hover:bg-blue-50'}`;
            const header = (i === 0 && it.kind === 'recent' && 'Terakhir dicari')
              || (i === firstPopular && 'Pencarian populer')
              || (i === 0 && it.kind === 'place' && 'Tempat')
              || (i === firstQuery && 'Pencarian');
            return (
              <li key={`${it.kind}-${it.text ?? it.biz.id}`} role="presentation">
                {header && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-navy-500">{header}</p>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={sel}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => pick(it)}
                  onMouseEnter={() => setActive(i)}
                  className={base}
                >
                  {it.kind === 'place' ? (
                    <>
                      <span className="w-8 h-8 rounded-full bg-navy-800 text-sm flex items-center justify-center shrink-0">{EMOJI[it.biz.category] ?? '📍'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-navy-800 truncate"><Highlight text={it.biz.name} typed={value} /></span>
                        <span className="block text-xs text-navy-500 truncate">{it.biz.subcategory ?? it.biz.category} · {it.biz.address?.split(',')[0] ?? ''}</span>
                      </span>
                      <span className="text-[11px] text-navy-500 shrink-0">{fmtDistance(it.dist)}</span>
                    </>
                  ) : it.kind === 'query' ? (
                    <>
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-navy-700 flex items-center justify-center shrink-0"><Search size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-navy-800 truncate"><Highlight text={it.text} typed={value} /></span>
                        <span className="block text-[11px] text-navy-500 truncate">{it.chips.map((c) => `${c.emoji} ${c.label}`).join('  ·  ')}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-navy-500 shrink-0">{it.count} tempat</span>
                    </>
                  ) : (
                    <>
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-navy-500 flex items-center justify-center shrink-0">
                        {it.kind === 'recent' ? <Clock size={15} /> : <TrendingUp size={15} />}
                      </span>
                      <span className="flex-1 text-sm text-navy-800 truncate">{it.text}</span>
                      {it.kind === 'recent' ? (
                        <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); removeRecent(it.text); }} className="p-1 rounded-full text-navy-500 hover:bg-blue-200" aria-label={`Hapus "${it.text}" dari riwayat`}>
                          <X size={13} />
                        </button>
                      ) : <ArrowUpLeft size={14} className="text-navy-500" aria-hidden="true" />}
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {sugg && (
            <li role="presentation" className="px-4 pt-2 pb-1.5 text-[11px] text-navy-500 flex items-center gap-1.5 border-t border-blue-100 mt-1">
              <MapPin size={12} /> Tekan Enter untuk mencari &ldquo;{value.trim()}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
