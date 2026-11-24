import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { pool } from './db.js';
import businessRoutes from './routes/business.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
// foto usaha dikirim sebagai data URL terkompresi dari browser
app.use(express.json({ limit: '12mb' }));

// endpoint cek kesehatan — sekaligus tes koneksi DB
app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', dbTime: rows[0].time });
  } catch (err) {
    res.status(500).json({ status: 'db-error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

// migrasi ringan & idempoten untuk kolom yang dikelola pemilik dari dashboard
pool
  .query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS promo VARCHAR(80);
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_open BOOLEAN;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(10) NOT NULL DEFAULT 'konsumen';
    UPDATE users SET account_type = 'pelaku' WHERE account_type <> 'pelaku' AND id IN (SELECT owner_id FROM businesses);`)
  .catch((err) => console.warn('⚠️ Migrasi kolom dashboard dilewati:', err.message));

app.listen(PORT, () => console.log(`✅ Server jalan di http://localhost:${PORT}`));
