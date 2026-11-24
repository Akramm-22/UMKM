import axios from 'axios';
import { composeAddress, documentsOf, toPlace } from './businessForm.js';

const LOCAL_SUBMISSIONS = 'pl_demo_businesses';
const LOG_KEY = 'pl_verification_log';
const DEMO_DECISIONS = 'pl_demo_decisions';
const IMG = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();

export const CHECKLIST = [
  { key: 'identity', label: 'Identitas pemilik sesuai data akun & dokumen' },
  { key: 'location', label: 'Pin lokasi cocok dengan alamat yang diisi' },
  { key: 'photos', label: 'Foto tampak depan & kondisi tempat asli dan relevan' },
  { key: 'info', label: 'Nama, kategori, deskripsi & jam buka wajar dan lengkap' },
  { key: 'contact', label: 'Nomor kontak valid / dapat dihubungi' },
];

export const REJECT_REASONS = [
  { key: 'photo', label: 'Foto tidak jelas atau tidak sesuai usaha' },
  { key: 'location', label: 'Pin lokasi tidak sesuai alamat' },
  { key: 'contact', label: 'Nomor kontak tidak aktif / tidak bisa dihubungi' },
  { key: 'identity', label: 'Identitas pemilik tidak sesuai' },
  { key: 'info', label: 'Nama, kategori, deskripsi, atau jam buka tidak sesuai' },
  { key: 'duplicate', label: 'Duplikat atau diduga usaha fiktif' },
];

export const reasonText = (keys = []) => keys.map((k) => REJECT_REASONS.find((r) => r.key === k)?.label ?? k);

const week = (mon, sat = mon, sun = 'Tutup') => ({ mon, tue: mon, wed: mon, thu: mon, fri: mon, sat, sun });
const addr = (street, rt_rw, kelurahan, kecamatan, kota, postal_code, landmark = '') => {
  const address_detail = { street, rt_rw, kelurahan, kecamatan, kota, provinsi: 'DKI Jakarta', postal_code, landmark };
  return { address_detail, address: composeAddress(address_detail) };
};

// pengajuan demo — bentuk sama persis dengan record dari form /daftar-usaha
const DEMO_SUBMISSIONS = [
  {
    id: 2, name: 'Kopi Kampung Senja', category: 'kuliner', subcategory: 'Kedai kopi', established_year: 2023,
    description: 'Kedai kopi kecil di teras rumah. Menjual kopi tubruk, kopi susu gula aren, dan gorengan hangat. Ada colokan & wifi.',
    phone: '081377788899', website: null, instagram: 'instagram.com/kopikampungsenja',
    ...addr('Jl. Dahlia No. 2', '002/004', 'Menteng', 'Menteng', 'Jakarta Pusat', '10310', 'Depan pos ronda'),
    latitude: -6.2008, longitude: 106.8171, open_hours: week('15.00–23.00', '15.00–01.00', '15.00–23.00'),
    price_range: { min: 8000, max: 30000 }, services: { dine_in: true, takeaway: true, delivery: false, pickup: false },
    payments: ['cash', 'qris'], amenities: ['wifi', 'outdoor'],
    menu: [{ name: 'Kopi Susu Gula Aren', price: 15000 }, { name: 'Kopi Tubruk', price: 8000 }, { name: 'Pisang Goreng (5 pcs)', price: 10000 }],
    photos: { front: IMG('photo-1554118811-1e0d58224f24'), interior: IMG('photo-1453614512568-c4024d13c247'), products: [IMG('photo-1509042239860-f550ce710b93')] },
    owner_id_doc: 'demo-ktp', submitted_at: hoursAgo(2),
    owner: { name: 'Dimas Prasetyo', phone: '081377788899', since: '2026-10-02', businesses: 0, nik: '3171 •••• •••• 0021' },
  },
  {
    id: 3, name: 'Laundry Kilat 24', category: 'jasa', subcategory: 'Laundry', established_year: 2021,
    description: 'Laundry kiloan cuci kering setrika, selesai 24 jam. Express 6 jam dan antar-jemput gratis radius 1 km.',
    phone: '082144556677', website: null, instagram: null,
    ...addr('Jl. Flamboyan No. 9', '005/002', 'Menteng', 'Menteng', 'Jakarta Pusat', '10310'),
    latitude: -6.1953, longitude: 106.8178, open_hours: week('07.00–21.00', '07.00–21.00', '08.00–17.00'),
    price_range: { min: 7000, max: 25000 }, services: { pickup: true, delivery: true, takeaway: false },
    payments: ['cash', 'qris', 'transfer'], amenities: [],
    menu: [{ name: 'Cuci Setrika / kg', price: 7000, desc: 'Selesai 24 jam' }, { name: 'Express 6 Jam / kg', price: 12000 }],
    photos: { front: IMG('photo-1545173168-9f1947eebb7f'), interior: IMG('photo-1517677208171-0bc6725a3e60'), products: [] },
    owner_id_doc: 'demo-ktp', submitted_at: hoursAgo(5),
    owner: { name: 'Ratna Sari', phone: '082144556677', since: '2026-09-14', businesses: 0, nik: '3171 •••• •••• 4410' },
  },
  {
    id: 6, name: 'Pangkas Rambut Mandiri', category: 'jasa', subcategory: 'Pangkas rambut', established_year: null,
    description: 'Pangkas rambut pria dan anak. Cukur + keramas.',
    phone: '0857', website: null, instagram: null,
    ...addr('Gg. Mandiri', '', 'Menteng', '', 'Jakarta Pusat', ''),
    latitude: -6.2069, longitude: 106.8241, open_hours: null,
    price_range: null, services: {}, payments: ['cash'], amenities: [], menu: [],
    photos: { front: IMG('photo-1503951914875-452162b0f3f1'), interior: null, products: [] },
    owner_id_doc: null, submitted_at: hoursAgo(9),
    owner: { name: 'Ujang', phone: '085700001111', since: '2026-11-22', businesses: 0, nik: null },
  },
  {
    id: 7, name: 'Kue Basah Bu Imas', category: 'kuliner', subcategory: 'Toko kue', established_year: 2018,
    description: 'Kue basah tradisional: lapis, kue lumpur, nagasari, dan risoles. Terima pesanan untuk arisan dan pengajian.',
    phone: '081298001122', website: null, instagram: 'instagram.com/kuebuimas',
    ...addr('Jl. Kenari II No. 14', '001/006', 'Kenari', 'Senen', 'Jakarta Pusat', '10430', 'Gang sebelah masjid'),
    latitude: -6.1977, longitude: 106.8152, open_hours: week('05.00–10.00', '05.00–12.00'),
    price_range: { min: 2500, max: 50000 }, services: { dine_in: false, takeaway: true, delivery: true, pickup: true },
    payments: ['cash', 'qris', 'ewallet'], amenities: [],
    menu: [{ name: 'Kue Lapis', price: 3000 }, { name: 'Risoles', price: 3500 }, { name: 'Paket Arisan (20 pcs)', price: 50000 }],
    photos: { front: IMG('photo-1517433670267-08bbd4be890f'), interior: IMG('photo-1486427944299-d1955d23e34d'), products: [IMG('photo-1558961363-fa8fdf82db35')] },
    owner_id_doc: 'demo-ktp', submitted_at: hoursAgo(14),
    owner: { name: 'Imas Kurniasih', phone: '081298001122', since: '2026-06-30', businesses: 1, nik: '3171 •••• •••• 7730' },
  },
];

const readJson = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const withDocs = (s) => ({ ...s, documents: documentsOf(s) });

export const demoSubmission = (id) => {
  const s = DEMO_SUBMISSIONS.find((x) => x.id === id);
  return s ? withDocs(s) : null;
};

// keputusan atas pengajuan demo disimpan agar konsisten setelah muat ulang
export const demoDecision = (id) => readJson(DEMO_DECISIONS, {})[id] ?? null;

export const demoSubmissionList = () => DEMO_SUBMISSIONS;

// pengajuan dari form /daftar-usaha yang tersimpan lokal saat server/DB belum tersambung
export function localSubmissions() {
  return readJson(LOCAL_SUBMISSIONS).map((s) => ({
    id: `local-${s.id}`,
    localId: s.id,
    name: s.name,
    owner: s.owner ?? 'Pemilik',
    cat: s.subcategory || s.category,
    status: s.status ?? 'pending',
    source: 'local',
    submission: withDocs({
      ...s,
      submitted_at: s.submitted_at ?? new Date(s.id).toISOString(),
      owner: { name: s.owner ?? 'Pemilik', phone: s.owner_phone ?? null, since: null, businesses: null, nik: null },
    }),
  }));
}

const authHeader = () => {
  const token = localStorage.getItem('pl_token');
  return token ? { Authorization: `Bearer ${token}` } : null;
};

export async function apiSubmissions() {
  const headers = authHeader();
  if (!headers) return [];
  try {
    const { data } = await axios.get('/api/admin/businesses/pending', { headers });
    return data.map((b) => ({
      id: `api-${b.id}`,
      apiId: b.id,
      name: b.name,
      owner: b.owner_name,
      cat: b.subcategory || b.category,
      status: 'pending',
      source: 'api',
      submission: withDocs({
        ...b,
        submitted_at: b.created_at,
        owner: { name: b.owner_name, phone: b.owner_phone, since: b.owner_since ?? null, businesses: b.owner_business_count ?? null, nik: null },
      }),
    }));
  } catch {
    return [];
  }
}

export async function saveDecision(item, decision) {
  const entry = {
    id: `${item.id}-${Date.now()}`,
    bizId: item.id,
    name: item.name,
    owner: item.owner,
    status: decision.status,
    reasons: decision.reasons ?? [],
    note: decision.note?.trim() || null,
    checklist: decision.checklist,
    admin: decision.admin,
    at: new Date().toISOString(),
  };
  const review = { reasons: reasonText(entry.reasons), note: entry.note, at: entry.at };

  if (item.source === 'api') {
    await axios.patch(
      `/api/admin/businesses/${item.apiId}/status`,
      { status: decision.status, reason: [...review.reasons, entry.note].filter(Boolean).join(' — ') || null },
      { headers: authHeader() }
    );
  }
  if (item.source === 'local') {
    const list = readJson(LOCAL_SUBMISSIONS).map((s) => (s.id === item.localId ? { ...s, status: decision.status, review } : s));
    localStorage.setItem(LOCAL_SUBMISSIONS, JSON.stringify(list));
  }
  if (item.source === 'demo') {
    localStorage.setItem(DEMO_DECISIONS, JSON.stringify({ ...readJson(DEMO_DECISIONS, {}), [item.id]: { status: decision.status, review } }));
  }

  localStorage.setItem(LOG_KEY, JSON.stringify([entry, ...readJson(LOG_KEY)].slice(0, 100)));
  return entry;
}

// usaha yang sudah disetujui admin (lokal & demo) → tampil di peta konsumen
export function approvedPlaces() {
  const decisions = readJson(DEMO_DECISIONS, {});
  const strip = ({ owner_id_doc, owner, owner_phone, documents, review, ...pub }) => pub;
  return [
    ...readJson(LOCAL_SUBMISSIONS).filter((s) => s.status === 'approved').map((s) => ({ ...strip(s), id: `local-${s.id}` })),
    ...DEMO_SUBMISSIONS.filter((s) => decisions[s.id]?.status === 'approved').map((s) => ({ ...strip(s), id: `sub-${s.id}` })),
  ].map((s) => toPlace({ ...s, is_open: s.is_open ?? null, promo: s.promo ?? null, created_at: s.submitted_at }));
}

export const verificationLog = () => readJson(LOG_KEY);

export const ownSubmissions = (ownerName) => readJson(LOCAL_SUBMISSIONS).filter((s) => s.owner === ownerName);

export function waitedHours(iso) {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600e3);
}

export const fmtWaited = (h) => (h < 1 ? `${Math.max(1, Math.round(h * 60))} mnt` : h < 48 ? `${Math.round(h)} jam` : `${Math.round(h / 24)} hari`);
