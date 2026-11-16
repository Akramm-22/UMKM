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
