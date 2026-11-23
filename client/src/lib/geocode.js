const cache = new Map();

// area/alamat manual → koordinat (Nominatim, dibatasi Indonesia); null bila tidak ketemu
export async function geocodeArea(text, { signal } = {}) {
  const key = text.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=id&accept-language=id&q=${encodeURIComponent(text.trim())}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('geocode failed');
  const [hit] = await res.json();
  const out = hit ? { label: hit.name || hit.display_name.split(',')[0], detail: hit.display_name, pos: [Number(hit.lat), Number(hit.lon)] } : null;
  cache.set(key, out);
  return out;
}
