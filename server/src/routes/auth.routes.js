import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', authLimiter, async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ message: 'Nama, nomor HP, dan password wajib diisi' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password minimal 8 karakter' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'INSERT INTO users (name, phone, password) VALUES ($1, $2, $3) RETURNING id, name, phone, role',
      [name, phone, hash]
    );
    res.status(201).json({ token: signToken(rows[0]), user: rows[0] });
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
    const { password: _pw, ...safeUser } = user;
    res.json({ token: signToken(user), user: safeUser });
  } catch {
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
});

export default router;
