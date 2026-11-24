import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const ACCOUNT_TYPES = ['konsumen', 'pelaku'];

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// halaman tujuan setelah login ditentukan dari data DB (jenis akun + jumlah usaha), bukan dari sesi klien
async function profileOf(user) {
  const { password: _pw, ...safe } = user;
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM businesses WHERE owner_id = $1', [user.id]);
  const businessCount = rows[0].n;
  let accountType = ACCOUNT_TYPES.includes(user.account_type) ? user.account_type : 'konsumen';
  if (businessCount > 0 && accountType !== 'pelaku') {
    accountType = 'pelaku';
    await query("UPDATE users SET account_type = 'pelaku' WHERE id = $1", [user.id]);
  }
  const landing = user.role === 'admin' ? '/admin' : businessCount > 0 ? '/dashboard' : accountType === 'pelaku' ? '/usaha' : '/explore';
  return { ...safe, account_type: accountType, business_count: businessCount, landing };
}

router.post('/register', authLimiter, async (req, res) => {
  const { name, phone, password } = req.body;
  const accountType = ACCOUNT_TYPES.includes(req.body.account_type) ? req.body.account_type : 'konsumen';
  if (!name || !phone || !password) {
    return res.status(400).json({ message: 'Nama, nomor HP, dan password wajib diisi' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password minimal 8 karakter' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'INSERT INTO users (name, phone, password, account_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone, hash, accountType]
    );
    res.status(201).json({ token: signToken(rows[0]), user: await profileOf(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Nomor HP sudah terdaftar' });
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ message: 'Nomor HP dan password wajib diisi' });
  }
  try {
    const { rows } = await query('SELECT * FROM users WHERE phone = $1', [phone]);
    const user = rows[0];
    const valid = user && (await bcrypt.compare(password, user.password));
    if (!valid) return res.status(401).json({ message: 'Nomor HP atau password salah' });
    res.json({ token: signToken(user), user: await profileOf(user) });
  } catch {
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

// status terbaru akun (jenis akun, jumlah usaha, halaman tujuan) langsung dari DB
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Akun tidak ditemukan' });
    res.json(await profileOf(rows[0]));
  } catch {
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

export default router;
