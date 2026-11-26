import jwt from 'jsonwebtoken';

// token boleh kosong; bila ada & valid, req.user terisi (dipakai untuk membedakan admin di rute publik)
export function optionalAuth(req, _res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Login dibutuhkan' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Sesi tidak valid, silakan login ulang' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang boleh mengakses' });
  }
  next();
}
