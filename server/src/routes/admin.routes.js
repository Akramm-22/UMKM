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
