import axios from 'axios';

// cadangan lokal dipakai saat akun demo (tanpa token) atau server/DB tidak terjangkau
const REVIEWS_KEY = 'pl_local_reviews';
const REPORTS_KEY = 'pl_local_reports';

export const REPORT_REASONS = [
  { key: 'not_found', label: 'Usaha tidak ditemukan di lokasi' },
  { key: 'closed', label: 'Tutup permanen / tidak beroperasi' },
  { key: 'wrong_location', label: 'Lokasi pin salah' },
  { key: 'wrong_info', label: 'Info (jam, kontak, menu) tidak sesuai' },
  { key: 'fake', label: 'Diduga usaha fiktif' },
  { key: 'other', label: 'Lainnya' },
];

export const reasonLabel = (key) => REPORT_REASONS.find((r) => r.key === key)?.label ?? key;

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
};
const write = (key, list) => localStorage.setItem(key, JSON.stringify(list));

const authHeader = () => {
  const token = localStorage.getItem('pl_token');
  return token ? { Authorization: `Bearer ${token}` } : null;
};

export async function fetchReviews(business, { local = false } = {}) {
  const own = read(REVIEWS_KEY).filter((r) => r.business_id === business.id);
  if (local) return own;
  try {
    const { data } = await axios.get(`/api/businesses/${business.id}/reviews`);
    return [...own, ...data.map((r) => ({ ...r, source: 'api' }))];
  } catch {
    return own;
  }
}

export async function submitReview(business, user, { rating, comment }, { local = false } = {}) {
  const headers = authHeader();
  if (!local && headers) {
    const { data } = await axios.post(`/api/businesses/${business.id}/reviews`, { rating, comment }, { headers });
    return { ...data, user_name: user.name, source: 'api' };
  }
  const list = read(REVIEWS_KEY).filter((r) => !(r.business_id === business.id && r.user_id === user.id));
  const review = {
    id: `local-${Date.now()}`,
    business_id: business.id,
    business_name: business.name,
    user_id: user.id,
    user_name: user.name,
    rating,
    comment: comment?.trim() || null,
    created_at: new Date().toISOString(),
    source: 'local',
  };
  write(REVIEWS_KEY, [review, ...list]);
  return review;
}

export async function submitReport(business, user, { reason, detail }, { local = false } = {}) {
  const headers = authHeader();
  if (!local && headers) {
    const { data } = await axios.post(`/api/businesses/${business.id}/reports`, { reason, detail }, { headers });
    return { ...data, source: 'api' };
  }
  const report = {
    id: `local-${Date.now()}`,
    business_id: business.id,
    business_name: business.name,
    category: business.category,
    address: business.address ?? null,
    user_id: user.id,
    reporter_name: user.name,
    reason,
    detail: detail?.trim() || null,
    status: 'open',
    created_at: new Date().toISOString(),
    source: 'local',
  };
  write(REPORTS_KEY, [report, ...read(REPORTS_KEY)]);
  return report;
}

export async function fetchReports() {
  const local = read(REPORTS_KEY);
  const headers = authHeader();
  if (!headers) return local;
  try {
    const { data } = await axios.get('/api/admin/reports', { headers });
    return [...local, ...data.map((r) => ({ ...r, source: 'api' }))];
  } catch {
    return local;
  }
}

export async function resolveReport(report, { status, suspend = false, note = '' }) {
  if (report.source === 'api') {
    const { data } = await axios.patch(`/api/admin/reports/${report.id}`, { status, suspend, note }, { headers: authHeader() });
    return { ...report, ...data, source: 'api' };
  }
  const updated = { ...report, status, suspend, admin_note: note || null, resolved_at: new Date().toISOString() };
  write(REPORTS_KEY, read(REPORTS_KEY).map((r) => (r.id === report.id ? updated : r)));
  return updated;
}

export const fetchLocalReviews = () => read(REVIEWS_KEY);

export const hasOpenLocalReport = (businessId, userId) =>
  read(REPORTS_KEY).some((r) => r.business_id === businessId && r.user_id === userId && r.status === 'open');

// data API sudah difilter server (status approved); ini hanya untuk data demo lokal
export const suspendedLocalIds = () =>
  new Set(read(REPORTS_KEY).filter((r) => r.status === 'resolved' && r.suspend).map((r) => r.business_id));

export async function removeReview(review) {
  if (review.source === 'api') {
    await axios.delete(`/api/admin/reviews/${review.id}`, { headers: authHeader() });
    return;
  }
  write(REVIEWS_KEY, read(REVIEWS_KEY).filter((r) => r.id !== review.id));
}
