# Setup Project — PesanLokal

**Panduan setup dari nol: React (Front-end) + Node/Express (Back-end) + PostgreSQL (Database)**

Dokumen terkait: [PRD-PesanLokal.md](PRD-PesanLokal.md) · [design.md](design.md)

---

## 0. Prasyarat

Pastikan sudah terinstall (cek lewat terminal/PowerShell):

```powershell
node -v    # minimal v18, disarankan v20 LTS
npm -v     # ikut bersama Node
git --version
psql --version   # PostgreSQL, disarankan v15+
```

Kalau belum ada:
- **Node.js** → https://nodejs.org (pilih LTS)
- **PostgreSQL** → https://www.postgresql.org/download/windows/ (catat password user `postgres` saat install!)
- **Git** → https://git-scm.com

---

## 1. Struktur Project (Monorepo Sederhana)

Kita pakai satu folder induk berisi dua aplikasi terpisah:

```
UMKM/
├── client/          ← React (Vite)
├── server/          ← Express + PostgreSQL
├── PRD-PesanLokal.md
├── design.md
└── SETUP.md
```

Buat dari folder project:

```powershell
cd "c:\Users\lapto\Documents\Akram\Project\Competition\UMKM"
```

---

## 2. Setup Front-end — React (Vite)

### 2.1 Buat project React

```powershell
npm create vite@latest client -- --template react
cd client
npm install
```

> **Kenapa Vite?** Jauh lebih cepat dari CRA (yang sudah deprecated), dan standar industri saat ini.

### 2.2 Install library yang dibutuhkan

```powershell
# Routing & HTTP
npm install react-router-dom axios

# Peta (fitur utama! lihat PRD §5.3) — Leaflet + OpenStreetMap (gratis, tanpa API key)
npm install leaflet react-leaflet

# Styling — Tailwind CSS v4
npm install tailwindcss @tailwindcss/vite

# Ikon (sesuai design.md §5: outline style)
npm install lucide-react
```

### 2.3 Konfigurasi Tailwind + warna design system

Edit `client/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // semua request /api diteruskan ke Express — tanpa masalah CORS saat dev
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
```

Ganti isi `client/src/index.css` dengan token warna dari [design.md](design.md):

```css
@import "tailwindcss";

@theme {
  /* Powder Blue — dominan 60% */
  --color-blue-50:  #F4FAFD;
  --color-blue-100: #EEF6FB;
  --color-blue-200: #DCEBF5;
  --color-blue-300: #B8D8EA;
  --color-blue-400: #8FBEDC;

  /* Midnight Navy — sekunder 30% */
  --color-navy-500: #3A5680;
  --color-navy-600: #24406B;
  --color-navy-700: #16294F;
  --color-navy-800: #0F1E3D;
  --color-navy-900: #0A1428;

  /* Sunflower Yellow — aksen 10% */
  --color-yellow-300: #FFE066;
  --color-yellow-400: #FFD23F;
  --color-yellow-500: #FFC914;
  --color-yellow-600: #E6B000;

  --font-heading: "Plus Jakarta Sans", sans-serif;
  --font-body: "Inter", sans-serif;
}
```

Tambahkan font di `client/index.html` (dalam `<head>`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
```

### 2.4 Test jalan

```powershell
npm run dev
```

Buka http://localhost:5173 — kalau halaman Vite+React muncul, front-end beres. ✅

---

## 3. Setup Back-end — Node + Express

### 3.1 Inisialisasi project

Buka terminal baru:

```powershell
cd "c:\Users\lapto\Documents\Akram\Project\Competition\UMKM"
mkdir server
cd server
npm init -y
```

### 3.2 Install dependency

```powershell
# Inti
npm install express pg dotenv cors

# Auth & keamanan (role Guest/User/Admin — PRD §4)
npm install jsonwebtoken bcrypt helmet express-rate-limit

# Dev tools (auto-restart saat file berubah)
npm install -D nodemon
```

| Package | Fungsi |
|---------|--------|
| `express` | Framework HTTP/REST API |
| `pg` | Driver PostgreSQL (node-postgres) |
| `dotenv` | Baca file `.env` (kredensial DB, secret JWT) |
| `cors` | Izinkan request dari origin lain (untuk production) |
| `jsonwebtoken` + `bcrypt` | Login (JWT) + hash password |
| `helmet` + `express-rate-limit` | Header keamanan + batasi brute-force |
| `nodemon` | Restart otomatis saat development |

### 3.3 Aktifkan ES Modules & scripts

Edit `server/package.json`, tambahkan/ubah:

```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

### 3.4 Struktur folder server

```
server/
├── src/
│   ├── index.js          ← entry point
│   ├── db.js             ← koneksi PostgreSQL (pool)
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── business.routes.js
│   │   └── admin.routes.js
│   ├── controllers/      ← logika tiap endpoint
│   ├── middlewares/
│   │   └── auth.middleware.js   ← cek JWT + role
│   └── sql/
│       └── schema.sql    ← definisi tabel
├── .env                  ← JANGAN di-commit!
├── .gitignore
└── package.json
```

```powershell
mkdir src, src\routes, src\controllers, src\middlewares, src\sql
```

### 3.5 File `.env` dan `.gitignore`

`server/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:PASSWORD_KAMU@localhost:5432/pesanlokal
JWT_SECRET=ganti-dengan-string-acak-panjang-minimal-32-karakter
```

`server/.gitignore`:

```
node_modules
.env
```

> ⚠️ `.env` berisi password & secret — **wajib** masuk `.gitignore` sebelum commit pertama.

### 3.6 Koneksi database — `src/db.js`

```js
import pg from 'pg';
import 'dotenv/config';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// helper query supaya controller tetap ringkas
export const query = (text, params) => pool.query(text, params);
```

### 3.7 Entry point — `src/index.js`

```js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import { pool } from './db.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// endpoint cek kesehatan — sekaligus tes koneksi DB
app.get('/api/health', async (_req, res) => {
  const { rows } = await pool.query('SELECT NOW() AS time');
  res.json({ status: 'ok', dbTime: rows[0].time });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server jalan di http://localhost:${PORT}`));
```

---

## 4. Setup Database — PostgreSQL

### 4.1 Buat database

```powershell
# login sebagai postgres (masukkan password instalasi)
psql -U postgres

# di dalam psql:
CREATE DATABASE pesanlokal;
\q
```

### 4.2 Schema awal — `server/src/sql/schema.sql`

Sesuai PRD: 3 role (guest tidak butuh tabel), usaha dengan status verifikasi, ulasan, favorit.

```sql
-- role disimpan di users; 'guest' tidak perlu akun
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE business_status AS ENUM ('pending', 'approved', 'rejected', 'reported');

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(20) UNIQUE NOT NULL,
  password    TEXT NOT NULL,              -- hash bcrypt, bukan plaintext!
  role        user_role NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE businesses (
  id          SERIAL PRIMARY KEY,
  owner_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  category    VARCHAR(50) NOT NULL,
  description TEXT,
  photo_url   TEXT,
  phone       VARCHAR(20),
  address     TEXT,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  open_hours  JSONB,                      -- { "mon": "08:00-17:00", ... }
  status      business_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reviews (
  id          SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (business_id, user_id)           -- 1 ulasan per user per usaha (PRD F7)
);

CREATE TABLE favorites (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, business_id)
);

-- index geospasial sederhana untuk query "usaha di sekitar"
CREATE INDEX idx_businesses_location ON businesses (latitude, longitude);
CREATE INDEX idx_businesses_status ON businesses (status);
```

### 4.3 Jalankan schema

```powershell
psql -U postgres -d pesanlokal -f src\sql\schema.sql
```

---

## 5. Merangkai Semuanya (Front ↔ Back ↔ DB)

### 5.1 Alur request

```
React (5173)
   │  axios.get('/api/businesses?lat=..&lng=..')
   ▼
Vite proxy ──► Express (5000)
                  │  SELECT ... FROM businesses WHERE status='approved'
                  ▼
              PostgreSQL (5432)
```

- Saat **development**: Vite proxy (langkah 2.3) meneruskan `/api/*` ke port 5000 → tidak ada masalah CORS, cukup tulis `axios.get('/api/...')` tanpa base URL.
- Saat **production**: React di-build (`npm run build`) lalu hasil `dist/` disajikan Express sebagai static files, atau deploy terpisah (Vercel + Railway/Render).

### 5.2 Contoh endpoint pertama — usaha di sekitar

`server/src/routes/business.routes.js`:

```js
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/businesses?lat=-6.2&lng=106.8&radius=2  (radius dalam km)
router.get('/', async (req, res) => {
  const { lat, lng, radius = 2 } = req.query;
  // rumus haversine sederhana via SQL
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
  res.json(rows.filter(r => r.distance_km <= radius));
});

export default router;
```

Daftarkan di `src/index.js` (sebelum `app.listen`):

```js
import businessRoutes from './routes/business.routes.js';
app.use('/api/businesses', businessRoutes);
```

### 5.3 Contoh konsumsi dari React

`client/src/App.jsx` (tes koneksi):

```jsx
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    axios.get('/api/health').then(res => setHealth(res.data));
  }, []);

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h1 className="font-heading font-extrabold text-2xl text-navy-800">
          PesanLokal 📍
        </h1>
        <p className="text-navy-500 mt-2">
          Status server: {health ? `✅ ${health.status}` : '⏳ menghubungkan...'}
        </p>
      </div>
    </div>
  );
}
```

### 5.4 Jalankan keduanya sekaligus

Terminal 1:
```powershell
cd server
npm run dev     # Express di :5000
```

Terminal 2:
```powershell
cd client
npm run dev     # React di :5173
```

Buka http://localhost:5173 → jika muncul "Status server: ✅ ok", berarti **React → Express → PostgreSQL sudah terhubung penuh**. 🎉

> **Opsional — satu perintah untuk dua server:** buat `package.json` di root lalu:
> ```powershell
> npm init -y
> npm install -D concurrently
> ```
> Tambahkan script:
> ```json
> "scripts": {
>   "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\""
> }
> ```
> Lalu cukup `npm run dev` dari root.

---

## 6. Checklist Verifikasi Setup

- [ ] `node -v` ≥ 18 dan `psql --version` jalan
- [ ] `client/` jalan di :5173 (halaman React tampil)
- [ ] Database `pesanlokal` dibuat & `schema.sql` sukses dieksekusi
- [ ] `server/` jalan di :5000 dan `/api/health` mengembalikan waktu DB
- [ ] React menampilkan "Status server: ✅ ok" (proxy bekerja)
- [ ] `.env` sudah ada di `.gitignore` **sebelum** `git init`/commit pertama

## 7. Langkah Selanjutnya

1. **Auth**: endpoint register/login (bcrypt + JWT) + middleware cek role `user`/`admin`.
2. **Peta**: komponen `<MapContainer>` react-leaflet sebagai layar utama — implementasikan 4 varian per role sesuai [design.md §7](design.md).
3. **CRUD usaha**: wizard pendaftaran usaha (PRD F10) + antrian verifikasi admin (F16).
4. Seed data dummy beberapa usaha di sekitar lokasimu untuk demo.
