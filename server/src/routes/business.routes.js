import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/businesses?lat=-6.2&lng=106.8&radius=2  (radius dalam km)
router.get('/', async (req, res) => {
  const { lat, lng, radius = 2 } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ message: 'Parameter lat dan lng wajiwajib diisi' });
  }
  try {
    // haversine via SQL untuk hitung jarak dari titik pengguna
    const { rows } = await query(
      `SELECT *,
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

// daftarkan usaha baru — status awal pending (PRD F10)
router.post('/', requireAuth, async (req, res) => {
  const { name, category, description, phone, address, latitude, longitude, open_hours } = req.body;
  if (!name || !category || latitude == null || longitude == null) {
    return res.status(400).json({ message: 'Nama, kategori, dan lokasi wajib diisi' });
  }
  try {
    const { rows } = await query(
      `INSERT INTO businesses (owner_id, name, category, description, phone, address, latitude, longitude, open_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, name, category, description ?? null, phone ?? null, address ?? null, latitude, longitude, open_hours ?? null]
    );
    res.status(201).json(rows[0]);
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

export default router;
