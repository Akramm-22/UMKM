import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { parseBusiness, WRITABLE, toParams, PUBLIC_COLUMNS } from '../validators/business.js';
import { parseQuery, searchBusinesses, describe } from '../../../shared/smartSearch.mjs';

const router = Router();

// GET /api/businesses?lat=-6.2&lng=106.8&radius=2  (radius dalam km)
router.get('/', async (req, res) => {
  const { lat, lng, radius = 2 } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ message: 'Parameter lat dan lng wajib diisi' });
  }
  try {
    // haversine via SQL untuk hitung jarak dari titik pengguna
    const { rows } = await query(
      `SELECT ${PUBLIC_COLUMNS},
         (6371 * acos(
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         )) AS distance_km
       FROM businesses
       WHERE status = 'approved'
       ORDER BY distance_km
       LIMIT 50`,
      [lat, lng]
    );
    res.json(rows.filter((r) => r.distance_km <= Number(radius)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Smart Search: GET /api/businesses/search?q=warung terdekat&lat=-6.2&lng=106.8
router.get('/search', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ message: 'Lokasi (lat, lng) tidak valid' });
  }
  const parsed = parseQuery(String(req.query.q ?? '').slice(0, 100));
  const radius = Math.min(25, Math.max(1, Number(req.query.radius) || 10));
  try {
    const { rows } = await query(
      `SELECT * FROM (
         SELECT ${PUBLIC_COLUMNS},
           (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM reviews r WHERE r.business_id = b.id) AS rating,
           (SELECT COUNT(*) FROM reviews r WHERE r.business_id = b.id)::int AS reviews,
           (6371 * acos(LEAST(1,
             cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) +
             sin(radians($1)) * sin(radians(latitude))
           ))) AS distance_km
         FROM businesses b
         WHERE status = 'approved'
       ) t
       WHERE distance_km <= $3
       ORDER BY distance_km
       LIMIT 500`,
      [lat, lng, radius]
    );
    const { results, sortedBy, areaMatchedByAddress } = searchBusinesses(rows, parsed, [lat, lng], { limit: 100 });
    res.json({
      parsed: { ...parsed, chips: describe(parsed), sortedBy, areaMatchedByAddress },
      results: results.map((r) => ({ ...r.biz, distance_km: r.dist, why: r.why })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// daftarkan usaha baru — status awal pending (PRD F10)
router.post('/', requireAuth, async (req, res) => {
  const { errors, values } = parseBusiness(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const cols = ['owner_id', ...WRITABLE];
    const { rows } = await query(
      `INSERT INTO businesses (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id, status, created_at`,
      [req.user.id, ...toParams(values)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// perbaiki & ajukan ulang — hanya pemilik, kembali ke antrean verifikasi
router.put('/:id', requireAuth, async (req, res) => {
  const { errors, values } = parseBusiness(req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  try {
    const sets = WRITABLE.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const n = WRITABLE.length;
    const { rows } = await query(
      `UPDATE businesses SET ${sets}, status = 'pending', review_note = NULL, reviewed_at = NULL, reviewed_by = NULL, updated_at = NOW()
       WHERE id = $${n + 1} AND owner_id = $${n + 2} AND status IN ('pending', 'rejected') RETURNING id, status, updated_at`,
      [...toParams(values), req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Pengajuan tidak ditemukan atau tidak bisa diubah' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// usaha milik user yang sedang login (Business Dashboard)
router.get('/mine', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM businesses WHERE owner_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

const REPORT_REASONS = ['not_found', 'closed', 'wrong_location', 'wrong_info', 'fake', 'other'];

// ulasan publik untuk satu usaha (PRD F3, F7)
router.get('/:id/reviews', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user_name
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.business_id = $1 ORDER BY r.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// satu ulasan per user per usaha — kirim ulang = perbarui ulasan
router.post('/:id/reviews', requireAuth, async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 500) : null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating harus 1–5' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO reviews (business_id, user_id, rating, comment) VALUES ($1,$2,$3,$4)
       ON CONFLICT (business_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING *`,
      [req.params.id, req.user.id, rating, comment]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// laporan konsumen → masuk antrean admin (PRD F9)
router.post('/:id/reports', requireAuth, async (req, res) => {
  const { reason } = req.body;
  const detail = typeof req.body.detail === 'string' ? req.body.detail.trim().slice(0, 1000) : null;
  if (!REPORT_REASONS.includes(reason)) {
    return res.status(400).json({ message: 'Alasan laporan tidak valid' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO reports (business_id, user_id, reason, detail) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, req.user.id, reason, detail]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
