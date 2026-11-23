import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// antrian verifikasi: usaha berstatus pending, terlama dulu, lengkap dengan data pemilik
router.get('/businesses/pending', async (_req, res) => {
  const { rows } = await query(
    `SELECT b.*, u.name AS owner_name, u.phone AS owner_phone, u.created_at AS owner_since,
            (SELECT COUNT(*)::int FROM businesses x WHERE x.owner_id = b.owner_id AND x.status = 'approved') AS owner_business_count
     FROM businesses b JOIN users u ON u.id = b.owner_id
     WHERE b.status = 'pending' ORDER BY b.created_at ASC`
  );
  res.json(rows);
});

router.patch('/businesses/:id/status', async (req, res) => {
  const { status } = req.body;
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 1000) : null;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status harus approved atau rejected' });
  }
  if (status === 'rejected' && !reason) {
    return res.status(400).json({ message: 'Alasan penolakan wajib diisi agar produsen tahu yang harus diperbaiki' });
  }
  const { rows } = await query(
    `UPDATE businesses SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [status, reason, req.user.id, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Usaha tidak ditemukan' });
  res.json(rows[0]);
});

router.get('/stats', async (_req, res) => {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS total FROM businesses GROUP BY status`
  );
  res.json(Object.fromEntries(rows.map((r) => [r.status, r.total])));
});

// ringkasan dashboard: semua angka dihitung langsung dari tabel, deret harian `days` hari terakhir
router.get('/overview', async (req, res) => {
  const days = Math.min(400, Math.max(7, Number(req.query.days) || 30));
  try {
    const [users, status, cats, series, reviews, ratingDist, reports, reasons, recent, ages, points] = await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
           COUNT(*) FILTER (WHERE role = 'user' AND id IN (SELECT owner_id FROM businesses))::int AS producers,
           COUNT(*) FILTER (WHERE role = 'user' AND id NOT IN (SELECT owner_id FROM businesses))::int AS consumers,
           COUNT(*) FILTER (WHERE created_at >= NOW() - make_interval(days => $1))::int AS new_users
         FROM users`,
        [days]
      ),
      query(`SELECT status, COUNT(*)::int AS total FROM businesses GROUP BY status`),
      query(`SELECT LOWER(category) AS category, COUNT(*)::int AS total FROM businesses WHERE status = 'approved' GROUP BY 1 ORDER BY 2 DESC`),
      query(
        `WITH d AS (SELECT generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, '1 day')::date AS day)
         SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
           (SELECT COUNT(*)::int FROM businesses b WHERE b.created_at::date = d.day) AS submissions,
           (SELECT COUNT(*)::int FROM businesses b WHERE b.status = 'approved' AND b.reviewed_at::date = d.day) AS approvals,
           (SELECT COUNT(*)::int FROM users u WHERE u.created_at::date = d.day) AS users,
           (SELECT COUNT(*)::int FROM reviews r WHERE r.created_at::date = d.day) AS reviews,
           (SELECT COUNT(*)::int FROM reports p WHERE p.created_at::date = d.day) AS reports
         FROM d ORDER BY d.day`,
        [days]
      ),
      query(`SELECT COUNT(*)::int AS total, COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::float AS avg FROM reviews`),
      query(`SELECT rating, COUNT(*)::int AS total FROM reviews GROUP BY rating`),
      query(`SELECT status, COUNT(*)::int AS total FROM reports GROUP BY status`),
      query(`SELECT reason, COUNT(*)::int AS total FROM reports GROUP BY reason ORDER BY 2 DESC`),
      query(
        `(SELECT 'submission' AS type, b.name AS title, b.status::text AS meta, b.created_at AS at FROM businesses b ORDER BY b.created_at DESC LIMIT 6)
         UNION ALL
         (SELECT 'review', b.name, r.rating::text, r.created_at FROM reviews r JOIN businesses b ON b.id = r.business_id ORDER BY r.created_at DESC LIMIT 6)
         UNION ALL
         (SELECT 'report', b.name, p.reason, p.created_at FROM reports p JOIN businesses b ON b.id = p.business_id ORDER BY p.created_at DESC LIMIT 6)
         ORDER BY at DESC LIMIT 10`
      ),
      query(`SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600, 1)::float AS hours FROM businesses WHERE status = 'pending'`),
      query(`SELECT latitude AS lat, longitude AS lng, status::text AS status, LOWER(category) AS category FROM businesses ORDER BY created_at DESC LIMIT 500`),
    ]);
    const toMap = (rows, key) => Object.fromEntries(rows.map((r) => [r[key], r.total]));
    res.json({
      source: 'database',
      generatedAt: new Date().toISOString(),
      days,
      users: users.rows[0],
      businesses: toMap(status.rows, 'status'),
      categories: cats.rows,
      series: series.rows,
      reviews: { ...reviews.rows[0], dist: toMap(ratingDist.rows, 'rating') },
      reports: { ...toMap(reports.rows, 'status'), reasons: reasons.rows },
      recent: recent.rows,
      pendingAges: ages.rows.map((r) => r.hours),
      points: points.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// laporan konsumen untuk ditinjau admin (PRD F17)
router.get('/reports', async (req, res) => {
  const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
  const { rows } = await query(
    `SELECT r.*, b.name AS business_name, b.category, b.address, b.status AS business_status,
            u.name AS reporter_name
     FROM reports r
     JOIN businesses b ON b.id = r.business_id
     JOIN users u ON u.id = r.user_id
     WHERE r.status = $1 ORDER BY r.created_at ASC`,
    [status]
  );
  res.json(rows);
});

// tindak lanjut: dismissed = laporan tidak terbukti; resolved + suspend = usaha ditangguhkan
router.patch('/reports/:id', async (req, res) => {
  const { status, suspend, note } = req.body;
  if (!['resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ message: 'Status harus resolved atau dismissed' });
  }
  const { rows } = await query(
    `UPDATE reports SET status = $1, admin_note = $2, resolved_at = NOW() WHERE id = $3 RETURNING *`,
    [status, typeof note === 'string' ? note.slice(0, 500) : null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Laporan tidak ditemukan' });
  if (status === 'resolved' && suspend) {
    await query(`UPDATE businesses SET status = 'rejected', updated_at = NOW() WHERE id = $1`, [rows[0].business_id]);
  }
  res.json(rows[0]);
});

// moderasi ulasan melanggar (PRD F17)
router.delete('/reviews/:id', async (req, res) => {
  const { rowCount } = await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ message: 'Ulasan tidak ditemukan' });
  res.status(204).end();
});

export default router;
