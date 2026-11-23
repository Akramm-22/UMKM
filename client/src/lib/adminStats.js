import axios from 'axios';
import { DEMO_BUSINESSES } from './demoPlaces.js';
import { demoSubmissionList, demoDecision, localSubmissions } from './verification.js';
import { suspendedLocalIds } from './feedback.js';

const readJson = (key) => {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { return []; }
};

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

function emptySeries(days) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({ day: dayKey(d), submissions: 0, approvals: 0, users: 0, reviews: 0, reports: 0 });
  }
  return out;
}

// mode demo (akun tanpa token / DB belum tersambung): hitung dari data yang benar-benar tersimpan di aplikasi
function localOverview(days) {
  const suspended = suspendedLocalIds();
  const reviews = readJson('pl_local_reviews');
  const reports = readJson('pl_local_reports');

  const subs = [
    ...demoSubmissionList().map((s) => {
      const d = demoDecision(s.id);
      return { name: s.name, category: s.category, owner: s.owner?.name, status: d?.status ?? 'pending', created: s.submitted_at, reviewed: d?.review?.at ?? null, lat: s.latitude, lng: s.longitude };
    }),
    ...localSubmissions().map((s) => ({ name: s.name, category: s.submission.category, owner: s.owner, status: s.status, created: s.submission.submitted_at, reviewed: s.submission.review?.at ?? null, lat: s.submission.latitude, lng: s.submission.longitude })),
  ];
  // usaha demo yang juga sedang diajukan ulang dihitung sekali (pakai status pengajuannya)
  const subNames = new Set(subs.map((s) => s.name));
  const listed = DEMO_BUSINESSES.filter((b) => !subNames.has(b.name)).map((b) => ({
    name: b.name, category: b.category, status: suspended.has(b.id) ? 'rejected' : 'approved', created: null, reviewed: null, lat: b.latitude, lng: b.longitude,
  }));
  const all = [...listed, ...subs];

  const businesses = {};
  all.forEach((b) => { businesses[b.status] = (businesses[b.status] ?? 0) + 1; });
  const catCount = {};
  all.filter((b) => b.status === 'approved').forEach((b) => { const c = String(b.category).toLowerCase(); catCount[c] = (catCount[c] ?? 0) + 1; });

  const series = emptySeries(days);
  const idx = Object.fromEntries(series.map((s, i) => [s.day, i]));
  const bump = (iso, key) => { if (!iso) return; const i = idx[dayKey(iso)]; if (i != null) series[i][key] += 1; };
  subs.forEach((s) => { bump(s.created, 'submissions'); if (s.status === 'approved') bump(s.reviewed, 'approvals'); });
  reviews.forEach((r) => bump(r.created_at, 'reviews'));
  reports.forEach((r) => bump(r.created_at, 'reports'));

  const consumers = new Set([-1, ...reviews.map((r) => r.user_id), ...reports.map((r) => r.user_id)]);
  const producers = new Set(['demo-pelaku', ...subs.map((s) => s.owner).filter(Boolean)]);

  const dist = {};
  reviews.forEach((r) => { dist[r.rating] = (dist[r.rating] ?? 0) + 1; });
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const repStatus = {};
  const reasons = {};
  reports.forEach((r) => { repStatus[r.status] = (repStatus[r.status] ?? 0) + 1; reasons[r.reason] = (reasons[r.reason] ?? 0) + 1; });

  const recent = [
    ...subs.map((s) => ({ type: 'submission', title: s.name, meta: s.status, at: s.created })),
    ...reviews.map((r) => ({ type: 'review', title: r.business_name, meta: String(r.rating), at: r.created_at })),
    ...reports.map((r) => ({ type: 'report', title: r.business_name, meta: r.reason, at: r.created_at })),
  ].filter((x) => x.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);

  return {
    source: 'local',
    generatedAt: new Date().toISOString(),
    days,
    users: { admins: 1, producers: producers.size, consumers: consumers.size, new_users: 0 },
    businesses,
    categories: Object.entries(catCount).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
    series,
    reviews: { total: reviews.length, avg, dist },
    reports: { ...repStatus, reasons: Object.entries(reasons).map(([reason, total]) => ({ reason, total })).sort((a, b) => b.total - a.total) },
    recent,
    pendingAges: subs.filter((s) => s.status === 'pending' && s.created).map((s) => (Date.now() - new Date(s.created).getTime()) / 3600e3),
    points: all.filter((b) => Number.isFinite(Number(b.lat))).map((b) => ({ lat: Number(b.lat), lng: Number(b.lng), status: b.status, category: String(b.category).toLowerCase() })),
  };
}

// memuat 2× periode agar bisa dibandingkan dengan periode sebelumnya
export async function fetchOverview(days) {
  const token = localStorage.getItem('pl_token');
  if (!token) return localOverview(days * 2);
  const { data } = await axios.get('/api/admin/overview', { params: { days: days * 2 }, headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
  return data;
}
