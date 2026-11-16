import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// antrian verifikasi: usaha berstatus pending, terlama dulu
router.get('/businesses/pending', async (_req, res) => {
  const { rows } = await query(
    `SELECT b.*, u.name AS owner_name, u.phone AS owner_phone
     FROM businesses b JOIN users u ON u.id = b.owner_id
     WHERE b.status = 'pending' ORDER BY b.created_at ASC`
  );
  res.json(rows);
});

router.patch('/businesses/:id/status', async (req, res) => {
  const { status, reason } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status harus approved atau rejected' });
  }
  const { rows } = await query(
    'UPDATE businesses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: 'Usaha tidak ditemukan' });
  res.json({ ...rows[0], reason: reason ?? null });
});

router.get('/stats', async (_req, res) => {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS total FROM businesses GROUP BY status`
  );
  res.json(Object.fromEntries(rows.map((r) => [r.status, r.total])));
});

export default router;
