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
app.listen(PORT, () => console.log(`✅ Server jalan di http://localhost:${PORT}`));
