const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_LABELS = { mon: 'Senin', tue: 'Selasa', wed: 'Rabu', thu: 'Kamis', fri: 'Jumat', sat: 'Sabtu', sun: 'Minggu' };
const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const toMin = (t) => {
  const [h, m = '0'] = t.trim().split(/[.:]/);
  return Number(h) * 60 + Number(m);
};

// "06.00–14.00" → [360, 840]; tutup lewat tengah malam dibiarkan > 1440
function parseRange(text) {
  if (!text) return null;
  if (/tutup/i.test(text)) return 'closed';
  if (/24\s*jam/i.test(text)) return [0, 1440];
  const m = text.match(/(\d{1,2}[.:]\d{2})\s*[–-]\s*(\d{1,2}[.:]\d{2})/);
  if (!m) return null;
  const open = toMin(m[1]);
  let close = toMin(m[2]);
  if (close <= open) close += 1440;
  return [open, close];
}

// open_hours: JSONB per hari dari DB, atau teks "HH.MM–HH.MM" untuk setiap hari
export function weeklyHours(hours) {
  if (!hours) return null;
  let obj = hours;
  if (typeof hours === 'string') {
    try {
      obj = JSON.parse(hours);
    } catch {
      obj = Object.fromEntries(WEEK.map((d) => [d, hours]));
    }
  }
  return WEEK.map((d) => ({ key: d, label: DAY_LABELS[d], text: obj[d] ?? 'Tutup' }));
}

const fmt = (min) => `${String(Math.floor((min % 1440) / 60)).padStart(2, '0')}.${String(min % 60).padStart(2, '0')}`;

export function openStatus(hours, fallbackOpen, now = new Date()) {
  const week = weeklyHours(hours);
  if (!week) return fallbackOpen == null ? null : { open: Boolean(fallbackOpen), label: fallbackOpen ? 'Buka' : 'Tutup', detail: '' };
  const byKey = Object.fromEntries(week.map((d) => [d.key, d.text]));
  const today = DAY_KEYS[now.getDay()];
  const yesterday = DAY_KEYS[(now.getDay() + 6) % 7];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const y = parseRange(byKey[yesterday]);
  if (Array.isArray(y) && y[1] > 1440 && nowMin < y[1] - 1440) {
    return { open: true, label: 'Buka', detail: `Tutup pukul ${fmt(y[1])}` };
  }
  const t = parseRange(byKey[today]);
  if (Array.isArray(t)) {
    if (nowMin >= t[0] && nowMin < t[1]) {
      const soon = t[1] - nowMin <= 60;
      return { open: true, soon, label: soon ? 'Segera tutup' : 'Buka', detail: `Tutup pukul ${fmt(t[1])}` };
    }
    if (nowMin < t[0]) return { open: false, label: 'Tutup', detail: `Buka pukul ${fmt(t[0])}` };
  }
  for (let i = 1; i <= 7; i += 1) {
    const key = DAY_KEYS[(now.getDay() + i) % 7];
    const r = parseRange(byKey[key]);
    if (Array.isArray(r)) return { open: false, label: 'Tutup', detail: `Buka ${i === 1 ? 'besok' : DAY_LABELS[key]} pukul ${fmt(r[0])}` };
  }
  return { open: false, label: 'Tutup', detail: '' };
}

export const todayKey = (now = new Date()) => DAY_KEYS[now.getDay()];

export function distanceKm([lat1, lon1], [lat2, lon2]) {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const favKey = (userId) => `pl_favorites_${userId}`;
export const getFavorites = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(favKey(userId)) ?? '[]');
  } catch {
    return [];
  }
};
export function toggleFavorite(userId, bizId) {
  const list = getFavorites(userId);
  const next = list.includes(bizId) ? list.filter((id) => id !== bizId) : [...list, bizId];
  localStorage.setItem(favKey(userId), JSON.stringify(next));
  return next;
}

export const formatRupiah = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;
