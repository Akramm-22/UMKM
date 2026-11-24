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
  subcategory VARCHAR(60),                -- jenis usaha, tampil di bawah nama (ala Google Maps)
  description TEXT,
  established_year INT,
  photo_url   TEXT,
  photos      JSONB,                      -- { front, interior, products: [] }
  owner_id_doc TEXT,                      -- foto KTP, khusus admin; jangan pernah dikirim ke publik
  phone       VARCHAR(20),
  website     TEXT,
  instagram   TEXT,
  address     TEXT,
  address_detail JSONB,                   -- { street, rt_rw, kelurahan, kecamatan, kota, provinsi, postal_code, landmark }
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  open_hours  JSONB,                      -- { "mon": "08.00–17.00", "sun": "Tutup", ... }
  price_range JSONB,                      -- { min, max } per orang
  services    JSONB,                      -- { dine_in, takeaway, delivery, pickup }
  payments    JSONB,                      -- ["cash", "qris", ...]
  amenities   JSONB,                      -- ["wifi", "parking", ...]
  menu        JSONB,                      -- [{ name, price, desc }]
  status      business_status NOT NULL DEFAULT 'pending',
  review_note TEXT,                       -- alasan/catatan admin, ditampilkan ke pemilik
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
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

-- laporan konsumen: usaha fiktif, tutup, info salah (PRD F9, F17)
CREATE TYPE report_status AS ENUM ('open', 'resolved', 'dismissed');

CREATE TABLE reports (
  id          SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      VARCHAR(40) NOT NULL,
  detail      TEXT,
  status      report_status NOT NULL DEFAULT 'open',
  admin_note  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_reports_status ON reports (status);

-- index geospasial sederhana untuk query "usaha di sekitar"
CREATE INDEX idx_businesses_location ON businesses (latitude, longitude);
CREATE INDEX idx_businesses_status ON businesses (status);

-- migrasi untuk database yang sudah dibuat sebelum kolom verifikasi ditambahkan
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reviewed_by INT REFERENCES users(id);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subcategory VARCHAR(60);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS established_year INT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS photos JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_id_doc TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address_detail JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS price_range JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS services JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payments JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS amenities JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS menu JSONB;
-- info operasional yang dikelola pemilik dari dashboard
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS promo VARCHAR(80);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_open BOOLEAN;
-- jenis akun non-admin: menentukan halaman tujuan setelah login
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(10) NOT NULL DEFAULT 'konsumen';
