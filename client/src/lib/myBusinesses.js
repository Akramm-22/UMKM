// data usaha milik pelaku usaha: API (akun nyata) atau penyimpanan perangkat (mode demo)
import axios from 'axios';
import { DEMO_BUSINESSES } from './demoPlaces.js';
import { reasonText } from './verification.js';

const LOCAL_KEY = 'pl_demo_businesses';
const OPS_KEY = 'pl_owner_ops';
const REVIEWS_KEY = 'pl_local_reviews';
// akun demo "Bu Siti" memiliki satu usaha contoh yang sudah tayang
const DEMO_SEED_OWNER = 'Bu Siti (Demo)';

const read = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, v) => localStorage.setItem(key, JSON.stringify(v));
const authHeader = () => {
  const token = localStorage.getItem('pl_token');
  return token ? { Authorization: `Bearer ${token}` } : null;
};

export const CATEGORY_META = {
  kuliner: { label: 'Kuliner', emoji: '🍜', color: '#F2771A' },
  jasa: { label: 'Jasa', emoji: '🔧', color: '#4A90D9' },
  toko: { label: 'Toko', emoji: '🛒', color: '#2E9E6B' },
};
export const catMeta = (c) => CATEGORY_META[String(c ?? '').toLowerCase()] ?? CATEGORY_META.toko;

const base = (r) => ({
  name: r.name,
  category: String(r.category ?? '').toLowerCase(),
  subcategory: r.subcategory ?? null,
  description: r.description ?? '',
  address: r.address ?? '',
  latitude: Number(r.latitude),
  longitude: Number(r.longitude),
  phone: r.phone ?? null,
  website: r.website ?? null,
  instagram: r.instagram ?? null,
  open_hours: r.open_hours ?? null,
  price_range: r.price_range ?? null,
  services: r.services ?? {},
  payments: r.payments ?? [],
  amenities: r.amenities ?? [],
  menu: r.menu ?? [],
  photos: r.photos ?? { front: r.photo_url ?? r.photo ?? null, interior: null, products: [] },
  photo: r.photos?.front ?? r.photo_url ?? r.photo ?? null,
});

const fromApi = (r) => ({
  ...base(r),
  key: `api-${r.id}`,
  id: r.id,
  editId: r.id,
  source: 'api',
  status: r.status,
  promo: r.promo ?? null,
  is_open: r.is_open ?? null,
  rating: r.rating != null ? Number(r.rating) : null,
  review_count: r.review_count ?? 0,
  open_reports: r.open_reports ?? 0,
  review: r.review_note ? { note: r.review_note, reasons: [], at: r.reviewed_at } : null,
  created_at: r.created_at,
  reviewed_at: r.reviewed_at ?? null,
  updated_at: r.updated_at ?? r.created_at,
});

const fromLocal = (r) => ({
  ...base(r),
  key: `local-${r.id}`,
  id: `local-${r.id}`,
  editId: r.id,
  source: 'local',
  status: r.status ?? 'pending',
  promo: r.promo ?? null,
  is_open: r.is_open ?? null,
  rating: null,
  review_count: 0,
  open_reports: 0,
  review: r.review ?? null,
  created_at: r.submitted_at ?? new Date(r.id).toISOString(),
  reviewed_at: r.review?.at ?? null,
  updated_at: r.ops_at ?? r.review?.at ?? r.submitted_at,
});

function demoSeed() {
  const d = DEMO_BUSINESSES.find((b) => b.id === 1);
  const ops = read(OPS_KEY, {})[`demo-${d.id}`] ?? {};
  return {
    ...base(d),
    key: `demo-${d.id}`,
    id: d.id,
    editId: null,
    source: 'demo',
    status: 'approved',
    promo: 'promo' in ops ? ops.promo : d.promo,
    is_open: 'is_open' in ops ? ops.is_open : d.is_open,
    rating: d.rating,
    review_count: d.reviews,
    open_reports: 0,
    review: null,
    created_at: '2026-05-04T08:00:00.000Z',
    reviewed_at: '2026-05-04T13:20:00.000Z',
    updated_at: ops.at ?? '2026-05-04T13:20:00.000Z',
  };
}

// jumlah usaha akun demo (data perangkat) — dasar halaman tujuan saat server tidak tersambung
export const demoBusinessCount = (user) =>
  read(LOCAL_KEY).filter((s) => s.owner === user.name).length + (user.name === DEMO_SEED_OWNER ? 1 : 0);

export async function fetchMyBusinesses(user) {
  if (!user) return [];
  const local = read(LOCAL_KEY).filter((s) => s.owner === user.name).map(fromLocal);
  const headers = authHeader();
  let api = [];
  if (headers && !user.demo) {
    const { data } = await axios.get('/api/businesses/mine', { headers });
    api = data.map(fromApi);
  }
  const seed = user.demo && user.name === DEMO_SEED_OWNER ? [demoSeed()] : [];
  return [...api, ...local, ...seed].sort((a, b) => new Date(b.updated_at ?? 0) - new Date(a.updated_at ?? 0));
}

// promo & status buka: info harian, tidak perlu verifikasi ulang
export async function updateOps(biz, patch) {
  const next = { promo: 'promo' in patch ? patch.promo : biz.promo, is_open: 'is_open' in patch ? patch.is_open : biz.is_open };
  if (biz.source === 'api') {
    await axios.patch(`/api/businesses/${biz.id}/ops`, next, { headers: authHeader() });
  } else if (biz.source === 'local') {
    const at = new Date().toISOString();
    write(LOCAL_KEY, read(LOCAL_KEY).map((s) => (s.id === biz.editId ? { ...s, ...next, ops_at: at } : s)));
  } else {
    write(OPS_KEY, { ...read(OPS_KEY, {}), [biz.key]: { ...next, at: new Date().toISOString() } });
  }
  return { ...biz, ...next };
}

export async function removeBusiness(biz) {
  if (biz.source === 'api') await axios.delete(`/api/businesses/${biz.id}`, { headers: authHeader() });
  else if (biz.source === 'local') write(LOCAL_KEY, read(LOCAL_KEY).filter((s) => s.id !== biz.editId));
  else throw new Error('Usaha contoh tidak dapat dihapus');
}

// ulasan untuk semua usaha milik pengguna
export async function fetchOwnerReviews(list) {
  const local = read(REVIEWS_KEY);
  const out = [];
  for (const b of list) {
    local.filter((r) => r.business_id === b.id || (r.business_name === b.name && b.status === 'approved'))
      .forEach((r) => out.push({ ...r, bizKey: b.key, business_name: b.name }));
  }
  const apiBiz = list.filter((b) => b.source === 'api' && b.status === 'approved');
  const results = await Promise.allSettled(apiBiz.map((b) => axios.get(`/api/businesses/${b.id}/reviews`).then(({ data }) => data.map((r) => ({ ...r, bizKey: b.key, business_name: b.name })))));
  results.forEach((r) => { if (r.status === 'fulfilled') out.push(...r.value); });
  const seen = new Set();
  return out
    .filter((r) => (seen.has(`${r.bizKey}-${r.id}`) ? false : seen.add(`${r.bizKey}-${r.id}`)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// kejadian untuk linimasa aktivitas di Home
export function activityOf(list) {
  const ev = [];
  for (const b of list) {
    if (b.created_at) ev.push({ key: `${b.key}-c`, type: 'submitted', biz: b, at: b.created_at });
    if (b.reviewed_at && b.status !== 'pending') {
      ev.push({ key: `${b.key}-r`, type: b.status === 'rejected' ? 'rejected' : 'approved', biz: b, at: b.reviewed_at, note: b.review?.note, reasons: b.review?.reasons });
    }
    if (b.promo && b.updated_at && b.updated_at !== b.reviewed_at) ev.push({ key: `${b.key}-p`, type: 'promo', biz: b, at: b.updated_at });
  }
  return ev.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
}

// kelengkapan profil — saran perbaikan yang bisa ditindaklanjuti
export function completeness(b) {
  const items = [
    { key: 'photo', label: 'Foto tampak depan & suasana', ok: Boolean(b.photos?.front && b.photos?.interior) },
    { key: 'products', label: 'Foto produk', ok: (b.photos?.products?.length ?? 0) > 0 },
    { key: 'menu', label: 'Daftar menu/layanan & harga', ok: (b.menu?.length ?? 0) > 0 },
    { key: 'price', label: 'Kisaran harga', ok: Boolean(b.price_range) },
    { key: 'hours', label: 'Jam buka', ok: Boolean(b.open_hours) },
    { key: 'social', label: 'Instagram / situs', ok: Boolean(b.instagram || b.website) },
  ];
  return { items, pct: Math.round((items.filter((i) => i.ok).length / items.length) * 100) };
}

export const reviewReasons = (r) => (r?.reasons?.length ? reasonText(r.reasons) : []);
