// FOSSGIS menyediakan profil OSRM terpisah per moda; server demo OSRM hanya mobil (cadangan)
const FOSSGIS = { driving: 'routed-car', motorcycle: 'routed-car', cycling: 'routed-bike', walking: 'routed-foot' };

const TURN = {
  left: 'kiri', right: 'kanan', 'slight left': 'agak ke kiri', 'slight right': 'agak ke kanan',
  'sharp left': 'tajam ke kiri', 'sharp right': 'tajam ke kanan', straight: 'lurus', uturn: 'putar balik',
};

function stepText(step) {
  const { type, modifier, exit } = step.maneuver;
  const road = step.name ? ` ke ${step.name}` : '';
  const dir = TURN[modifier] ?? '';
  switch (type) {
    case 'depart': return `Berangkat${step.name ? ` melalui ${step.name}` : ''}`;
    case 'arrive': return 'Tiba di tujuan';
    case 'roundabout':
    case 'rotary': return `Masuk bundaran, ambil jalan keluar ke-${exit ?? 1}${road}`;
    case 'continue':
    case 'new name': return `Lanjut ${dir || 'lurus'}${step.name ? ` di ${step.name}` : ''}`;
    case 'end of road': return `Di ujung jalan, belok ${dir}${road}`;
    case 'fork': return `Di persimpangan, ambil ${dir}${road}`;
    case 'merge': return `Bergabung ${dir}${road}`;
    default: return modifier === 'uturn' ? `Putar balik${road}` : modifier === 'straight' ? `Lurus${road}` : `Belok ${dir}${road}`;
  }
}

const parse = (r) => ({
  coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  km: r.distance / 1000,
  min: Math.max(1, Math.round(r.duration / 60)),
  via: r.legs?.[0]?.summary || '',
  steps: (r.legs?.[0]?.steps ?? [])
    .filter((s) => s.maneuver.type !== 'depart' || s.name)
    .map((s) => ({
      text: stepText(s),
      m: Math.round(s.distance),
      type: s.maneuver.type,
      modifier: s.maneuver.modifier,
      at: [s.maneuver.location[1], s.maneuver.location[0]],
      road: s.name || '',
    })),
});

// semua rute (utama + alternatif bila server punya); null bila tidak ada jalur
export async function fetchRoutes(from, to, mode, { signal, alternatives = true } = {}) {
  const pair = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const query = `?overview=full&geometries=geojson&steps=true${alternatives ? '&alternatives=true' : ''}`;
  const urls = [`https://routing.openstreetmap.de/${FOSSGIS[mode] ?? 'routed-car'}/route/v1/driving/${pair}${query}`];
  if (mode === 'driving' || mode === 'motorcycle') urls.push(`https://router.project-osrm.org/route/v1/driving/${pair}${query}`);

  let lastError;
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) return null;
      return data.routes.slice(0, 3).map(parse);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError;
}

export async function fetchRoute(from, to, mode, opts = {}) {
  const routes = await fetchRoutes(from, to, mode, { ...opts, alternatives: false });
  return routes?.[0] ?? null;
}

export const arrivalTime = (min, now = new Date()) =>
  new Date(now.getTime() + min * 60000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export const fmtDistance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);
export const fmtDuration = (min) => (min < 60 ? `${min} mnt` : `${Math.floor(min / 60)} j ${min % 60} mnt`);
