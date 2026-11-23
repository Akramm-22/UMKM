import { useEffect, useMemo, useState } from 'react';
import { Marker, Polyline, Tooltip, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { fmtDistance, fmtDuration } from '../../lib/routing.js';
import { openStatus } from '../../lib/place.js';

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const STADIA = `&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ${OSM}`;

// Stadia gratis di localhost; untuk domain produksi daftarkan domain/API key di stadiamaps.com
export const TILE_LAYERS = {
  standar: {
    label: 'Standar',
    tiles: [{ url: 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', attribution: STADIA }],
    preview: 'https://tiles.stadiamaps.com/tiles/osm_bright/15/26106/16949.png',
  },
  minimal: {
    label: 'Minimal',
    tiles: [{ url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', attribution: STADIA }],
    preview: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/15/26106/16949.png',
  },
  osm: {
    label: 'OSM',
    tiles: [{ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: OSM }],
    preview: 'https://tile.openstreetmap.org/15/26106/16949.png',
  },
  satelit: {
    label: 'Satelit',
    tiles: [
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Citra &copy; Esri, Maxar, Earthstar Geographics' },
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', attribution: '' },
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', attribution: '' },
    ],
    preview: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/16949/26106',
  },
};

export function BaseTiles({ layer }) {
  return TILE_LAYERS[layer].tiles.map((t) => (
    <TileLayer key={t.url} url={t.url} attribution={t.attribution} subdomains={t.subdomains ?? 'abc'} maxZoom={20} maxNativeZoom={19} />
  ));
}

export const CAT_STYLE = {
  kuliner: { color: '#F2771A', emoji: '🍜', label: 'Kuliner' },
  jasa: { color: '#4A90D9', emoji: '🔧', label: 'Jasa' },
  toko: { color: '#2E9E6B', emoji: '🛒', label: 'Toko' },
};
const styleOf = (cat) => CAT_STYLE[cat] ?? { color: '#4A90D9', emoji: '📍', label: 'Usaha' };
const esc = (s) => String(s ?? '').replace(/[<>&"]/g, '');

const iconCache = new Map();
const cached = (key, make) => {
  if (!iconCache.has(key)) iconCache.set(key, make());
  return iconCache.get(key);
};

// pin tetes ala Google Maps: warna kategori, emoji, titik status buka, label nama saat zoom dekat
function pinIcon(biz, { selected, hovered, favorite, showLabel, open }) {
  const st = styleOf(biz.category);
  const key = `${biz.id}|${selected}|${hovered}|${favorite}|${showLabel}|${open}`;
  return cached(key, () => {
    const s = selected ? 46 : hovered ? 40 : 34;
    const fill = selected ? '#16294F' : st.color;
    const ring = selected ? '#FFC914' : '#fff';
    const dot = open === true ? '#2E9E6B' : open === false ? '#E05252' : null;
    const label = showLabel || selected || hovered
      ? `<span class="pl-pin-label${selected ? ' is-sel' : ''}">${esc(biz.name.length > 22 ? `${biz.name.slice(0, 21)}…` : biz.name)}</span>`
      : '';
    return L.divIcon({
      className: 'pl-pin',
      html: `<div class="pl-pin-wrap${selected ? ' is-sel' : ''}" aria-hidden="true" style="width:${s}px;height:${s * 1.25}px">
        <svg viewBox="0 0 40 50" width="${s}" height="${s * 1.25}" aria-hidden="true">
          <path d="M20 49c-1-6-17-17-17-30a17 17 0 1 1 34 0c0 13-16 24-17 30z" fill="${fill}" stroke="${ring}" stroke-width="${selected ? 3 : 2.5}"/>
          <circle cx="20" cy="19" r="11.5" fill="#fff"/>
        </svg>
        <span class="pl-pin-emoji" style="font-size:${s * 0.36}px;top:${s * 0.2}px">${st.emoji}</span>
        ${dot ? `<span class="pl-pin-dot" style="background:${dot}"></span>` : ''}
        ${favorite ? '<span class="pl-pin-fav">♥</span>' : ''}
        ${label}
      </div>`,
      iconSize: [s, s * 1.25],
      iconAnchor: [s / 2, s * 1.25],
      tooltipAnchor: [0, -s * 1.15],
    });
  });
}

const dotIcon = (cat) => cached(`dot|${cat}`, () => L.divIcon({
  className: '',
  html: `<span style="display:block;width:11px;height:11px;border-radius:50%;background:${styleOf(cat).color};border:2px solid #fff;box-shadow:0 1px 3px rgba(15,30,61,.35);opacity:.75"></span>`,
  iconSize: [11, 11],
  iconAnchor: [5.5, 5.5],
}));

const clusterIcon = (n) => cached(`cl|${n}`, () => {
  const s = n < 10 ? 38 : 46;
  return L.divIcon({
    className: '',
    html: `<div class="pl-cluster" aria-hidden="true" style="width:${s}px;height:${s}px">${n}</div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  });
});

export function useZoom() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  return zoom;
}

// pengelompokan sederhana berbasis jarak piksel agar peta tidak padat saat zoom jauh
function cluster(map, items, zoom, px = 52) {
  if (zoom >= 16) return items.map((it) => ({ items: [it] }));
  const groups = [];
  items.forEach((it) => {
    const p = map.project([it.biz.latitude, it.biz.longitude], zoom);
    const g = groups.find((x) => x.p.distanceTo(p) < px);
    if (g) g.items.push(it);
    else groups.push({ p, items: [it] });
  });
  return groups;
}

function MiniTip({ biz, dist }) {
  const st = openStatus(biz.open_hours, biz.is_open);
  return (
    <div className="w-52">
      <div className="flex gap-2.5">
        {(biz.photo || biz.photo_url) && <img src={biz.photo ?? biz.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
        <div className="min-w-0">
          <p className="font-heading font-bold text-[13px] text-navy-800 leading-tight truncate">{biz.name}</p>
          <p className="text-[11px] text-navy-500 mt-0.5 truncate">
            {biz.rating != null && <>★ {Number(biz.rating).toFixed(1).replace('.', ',')} · </>}{biz.subcategory ?? styleOf(biz.category).label}
          </p>
          <p className="text-[11px] mt-0.5">
            {st && <span className={st.open ? 'text-success font-semibold' : 'text-danger font-semibold'}>{st.label}</span>}
            {dist != null && <span className="text-navy-500"> · {fmtDistance(dist)}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

export function BusinessMarkers({ items, context, selectedId, hoveredId, favorites, onSelect, onHover }) {
  const map = useMap();
  const zoom = useZoom();
  const groups = useMemo(() => cluster(map, items, zoom), [map, items, zoom]);
  const showLabels = zoom >= 17 || (zoom >= 16 && items.length <= 12);
  const ids = useMemo(() => new Set(items.map((i) => i.biz.id)), [items]);

  return (
    <>
      {/* usaha di luar hasil pencarian tetap terlihat samar sebagai konteks */}
      {zoom >= 14 && context.filter((b) => !ids.has(b.id)).map((b) => (
        <Marker key={`ctx-${b.id}`} position={[b.latitude, b.longitude]} icon={dotIcon(b.category)} eventHandlers={{ click: () => onSelect(b) }} title={b.name} zIndexOffset={-500} />
      ))}
      {groups.map((g) => {
        if (g.items.length > 1 && !g.items.some((i) => i.biz.id === selectedId)) {
          const bounds = L.latLngBounds(g.items.map((i) => [i.biz.latitude, i.biz.longitude]));
          return (
            <Marker
              key={`cl-${g.items.map((i) => i.biz.id).join('-')}`}
              position={bounds.getCenter()}
              icon={clusterIcon(g.items.length)}
              title={`${g.items.length} usaha — klik untuk memperbesar`}
              eventHandlers={{ click: () => map.flyToBounds(bounds.pad(0.4), { maxZoom: 17, duration: 0.5 }) }}
            />
          );
        }
        return g.items.map(({ biz, dist }) => {
          const st = openStatus(biz.open_hours, biz.is_open);
          return (
            <Marker
              key={biz.id}
              position={[biz.latitude, biz.longitude]}
              icon={pinIcon(biz, { selected: biz.id === selectedId, hovered: biz.id === hoveredId, favorite: favorites.includes(biz.id), showLabel: showLabels, open: st ? st.open : null })}
              zIndexOffset={biz.id === selectedId ? 1000 : biz.id === hoveredId ? 800 : 0}
              eventHandlers={{ click: () => onSelect(biz), mouseover: () => onHover(biz.id), mouseout: () => onHover(null) }}
              title={biz.name}
              alt={biz.name}
              keyboard
            >
              {biz.id !== selectedId && (
                <Tooltip direction="top" opacity={1} className="pl-tip">
                  <MiniTip biz={biz} dist={dist} />
                </Tooltip>
              )}
            </Marker>
          );
        });
      })}
    </>
  );
}

const MODE_STYLE = {
  driving: { color: '#2F7BD8', dash: null },
  motorcycle: { color: '#2F7BD8', dash: null },
  cycling: { color: '#2E9E6B', dash: null },
  walking: { color: '#2F7BD8', dash: '1 11' },
};

const labelIcon = (text, sub, active) => L.divIcon({
  className: '',
  html: `<div class="pl-route-label${active ? ' is-active' : ''}"><b>${esc(text)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const stepIcon = (focused) => L.divIcon({
  className: '',
  html: `<span class="pl-step${focused ? ' is-focus' : ''}"></span>`,
  iconSize: [focused ? 18 : 10, focused ? 18 : 10],
  iconAnchor: [focused ? 9 : 5, focused ? 9 : 5],
});

const destIcon = L.divIcon({
  className: '',
  html: '<div class="pl-dest"><svg viewBox="0 0 24 24" width="14" height="14" fill="#fff"><path d="M5 3v18h2v-7h11l-2-4 2-4H7V3z"/></svg></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// rute utama tebal dengan garis tepi, alternatif abu-biru yang bisa diklik, label durasi, titik manuver
export function RouteLayer({ route, origin, onPickAlt, focusStep, onStep }) {
  const zoom = useZoom();
  if (!route) return null;
  const st = MODE_STYLE[route.mode] ?? MODE_STYLE.driving;
  const alts = route.routes.map((r, i) => ({ r, i })).filter(({ i }) => i !== route.active);
  const mid = (coords, f) => coords[Math.floor(coords.length * f)] ?? coords[0];
  const end = route.coords[route.coords.length - 1];
  const start = route.coords[0];

  return (
    <>
      {alts.map(({ r, i }) => (
        <Polyline key={`alt-c-${i}`} positions={r.coords} pathOptions={{ color: '#6D84A3', weight: 9, opacity: 0.55, lineCap: 'round' }} eventHandlers={{ click: () => onPickAlt(i) }} />
      ))}
      {alts.map(({ r, i }) => (
        <Polyline key={`alt-${i}`} positions={r.coords} pathOptions={{ color: '#BCD0E6', weight: 6, opacity: 1, lineCap: 'round', dashArray: st.dash }} eventHandlers={{ click: () => onPickAlt(i) }} />
      ))}
      <Polyline positions={route.coords} pathOptions={{ color: '#0F1E3D', weight: 11, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} interactive={false} />
      <Polyline positions={route.coords} pathOptions={{ color: st.color, weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round', dashArray: st.dash }} interactive={false} />

      {/* sambungan jalan kaki dari titik jalan terdekat ke lokasi sebenarnya */}
      <Polyline positions={[origin, start]} pathOptions={{ color: '#6D84A3', weight: 3, dashArray: '2 6', opacity: 0.9 }} interactive={false} />
      <Polyline positions={[end, route.dest]} pathOptions={{ color: '#6D84A3', weight: 3, dashArray: '2 6', opacity: 0.9 }} interactive={false} />
      <Marker position={end} icon={destIcon} interactive={false} zIndexOffset={900} />

      {zoom >= 15 && route.steps.map((s, i) => (
        <Marker key={`st-${i}`} position={s.at} icon={stepIcon(i === focusStep)} zIndexOffset={i === focusStep ? 950 : 500} eventHandlers={{ click: () => onStep?.(i) }} title={s.text} />
      ))}

      <Marker position={mid(route.coords, 0.5)} icon={labelIcon(fmtDuration(route.min), fmtDistance(route.km), true)} interactive={false} zIndexOffset={1100} />
      {alts.map(({ r, i }) => {
        const diff = r.min - route.min;
        return (
          <Marker
            key={`lbl-${i}`}
            position={mid(r.coords, 0.62)}
            icon={labelIcon(fmtDuration(r.min), diff > 0 ? `+${diff} mnt` : diff < 0 ? `${diff} mnt` : 'sama cepat', false)}
            eventHandlers={{ click: () => onPickAlt(i) }}
            zIndexOffset={1000}
            title="Pilih rute ini"
          />
        );
      })}
    </>
  );
}

// perbesar/geser peta agar semua hasil pencarian terlihat (dipicu saat kueri dikirim)
export function FitResults({ trigger, points, padding }) {
  const map = useMap();
  useEffect(() => {
    if (!trigger || !points.length) return;
    if (points.length === 1) map.flyTo(points[0], 16, { duration: 0.6 });
    else map.flyToBounds(L.latLngBounds(points), { ...padding, maxZoom: 17, duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
}
