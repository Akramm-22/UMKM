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
  steps: (r.legs?.[0]?.steps ?? [])
    .filter((s) => s.maneuver.type !== 'depart' || s.name)
    .map((s) => ({ text: stepText(s), m: Math.round(s.distance), type: s.maneuver.type, modifier: s.maneuver.modifier })),
});

export async function fetchRoute(from, to, mode, { signal } = {}) {
  const pair = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const query = '?overview=full&geometries=geojson&steps=true';
  const urls = [`https://routing.openstreetmap.de/${FOSSGIS[mode] ?? 'routed-car'}/route/v1/driving/${pair}${query}`];
  if (mode === 'driving' || mode === 'motorcycle') urls.push(`https://router.project-osrm.org/route/v1/driving/${pair}${query}`);

  let lastError;
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.[0]) return null;
      return parse(data.routes[0]);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError;
}

export const fmtDistance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);
export const fmtDuration = (min) => (min < 60 ? `${min} mnt` : `${Math.floor(min / 60)} j ${min % 60} mnt`);
