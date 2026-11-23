// validasi & sanitasi data usaha — aturan sama dengan form klien (client/src/lib/businessForm.js)

const CATEGORIES = ['kuliner', 'jasa', 'toko'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SERVICES = ['dine_in', 'takeaway', 'delivery', 'pickup'];
const PAYMENTS = ['cash', 'qris', 'ewallet', 'transfer', 'debit'];
const AMENITIES = ['wifi', 'parking', 'toilet', 'prayer', 'ac', 'outdoor', 'wheelchair', 'kids'];
const PHONE_RE = /^(\+?62|0)8\d{8,11}$/;
const HOURS_RE = /^(Tutup|24 jam|([01]\d|2[0-3])[.:][0-5]\d\s?[–-]\s?([01]\d|2[0-3])[.:][0-5]\d)$/;
const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = 2_000_000;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const image = (v) => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') throw new Error('Format foto tidak valid');
  if (/^https:\/\//.test(v) && v.length < 1000) return v;
  if (!IMAGE_RE.test(v) || v.length > MAX_IMAGE_CHARS) throw new Error('Foto harus JPG/PNG/WEBP dan maksimal ±1,5 MB setelah kompresi');
  return v;
};

export function parseBusiness(body = {}) {
  const errors = [];
  const name = str(body.name, 80);
  const category = str(body.category, 20).toLowerCase();
  const subcategory = str(body.subcategory, 40);
  const description = str(body.description, 500);
  const phone = str(body.phone, 16).replace(/[\s-]/g, '');
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (name.length < 3) errors.push('Nama usaha minimal 3 karakter');
  if (!CATEGORIES.includes(category)) errors.push('Kategori tidak valid');
  if (!subcategory) errors.push('Jenis usaha wajib diisi');
  if (description.length < 30) errors.push('Deskripsi minimal 30 karakter');
  if (!PHONE_RE.test(phone)) errors.push('Nomor telepon/WhatsApp tidak valid');
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) errors.push('Titik lokasi tidak valid');

  const a = body.address_detail ?? {};
  const address_detail = {
    street: str(a.street, 120), rt_rw: str(a.rt_rw, 7), kelurahan: str(a.kelurahan, 60), kecamatan: str(a.kecamatan, 60),
    kota: str(a.kota, 60), provinsi: str(a.provinsi, 60), postal_code: str(a.postal_code, 5), landmark: str(a.landmark, 80),
  };
  if (address_detail.street.length < 5 || !address_detail.kelurahan || !address_detail.kecamatan || !address_detail.kota) {
    errors.push('Alamat (jalan, kelurahan, kecamatan, kota) wajib lengkap');
  }
  if (address_detail.postal_code && !/^\d{5}$/.test(address_detail.postal_code)) errors.push('Kode pos harus 5 digit');

  const oh = body.open_hours ?? {};
  const open_hours = Object.fromEntries(DAYS.map((d) => [d, str(oh[d], 20) || 'Tutup']));
  if (Object.values(open_hours).some((v) => !HOURS_RE.test(v))) errors.push('Format jam buka tidak valid');
  if (Object.values(open_hours).every((v) => v === 'Tutup')) errors.push('Minimal satu hari buka');

  let price_range = null;
  if (body.price_range) {
    const min = Number(body.price_range.min);
    const max = Number(body.price_range.max);
    if (!(min >= 500 && max >= min && max <= 10_000_000)) errors.push('Kisaran harga tidak valid');
    else price_range = { min, max };
  }

  const services = Object.fromEntries(SERVICES.filter((k) => body.services && k in body.services).map((k) => [k, Boolean(body.services[k])]));
  const payments = Array.isArray(body.payments) ? [...new Set(body.payments.filter((p) => PAYMENTS.includes(p)))] : [];
  if (!payments.length) errors.push('Minimal satu metode pembayaran');
  const amenities = Array.isArray(body.amenities) ? [...new Set(body.amenities.filter((p) => AMENITIES.includes(p)))] : [];
  const menu = (Array.isArray(body.menu) ? body.menu : []).slice(0, 15).map((m) => ({
    name: str(m?.name, 60),
    price: m?.price == null || m.price === '' ? null : Number(m.price),
    desc: str(m?.desc, 80) || undefined,
  }));
  if (menu.some((m) => !m.name || (m.price != null && !(m.price >= 0)))) errors.push('Item menu tidak valid');

  const year = body.established_year ? Number(body.established_year) : null;
  if (year != null && !(Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear())) errors.push('Tahun berdiri tidak valid');

  const website = str(body.website, 200) || null;
  const instagram = str(body.instagram, 120) || null;

  let photos;
  let owner_id_doc;
  try {
    const p = body.photos ?? {};
    photos = { front: image(p.front), interior: image(p.interior), products: (Array.isArray(p.products) ? p.products : []).slice(0, 3).map(image).filter(Boolean) };
    owner_id_doc = image(body.owner_id_doc);
  } catch (err) {
    errors.push(err.message);
  }
  if (photos && (!photos.front || !photos.interior)) errors.push('Foto tampak depan & kondisi tempat wajib diunggah');

  const address = [
    address_detail.street, address_detail.rt_rw && `RT/RW ${address_detail.rt_rw}`,
    address_detail.kelurahan && `Kel. ${address_detail.kelurahan}`, address_detail.kecamatan && `Kec. ${address_detail.kecamatan}`,
    address_detail.kota, [address_detail.provinsi, address_detail.postal_code].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ');

  return {
    errors,
    values: {
      name, category, subcategory, description, established_year: year, phone, website, instagram,
      address, address_detail, latitude, longitude, open_hours, price_range, services, payments, amenities, menu,
      photos, photo_url: photos?.front ?? null, owner_id_doc,
    },
  };
}

// urutan kolom untuk INSERT/UPDATE; JSONB dikirim sebagai string JSON
export const WRITABLE = [
  'name', 'category', 'subcategory', 'description', 'established_year', 'phone', 'website', 'instagram',
  'address', 'address_detail', 'latitude', 'longitude', 'open_hours', 'price_range', 'services', 'payments',
  'amenities', 'menu', 'photos', 'photo_url', 'owner_id_doc',
];
const JSON_COLS = new Set(['address_detail', 'open_hours', 'price_range', 'services', 'payments', 'amenities', 'menu', 'photos']);
export const toParams = (v) => WRITABLE.map((k) => (JSON_COLS.has(k) && v[k] != null ? JSON.stringify(v[k]) : v[k]));

// kolom publik — owner_id_doc (KTP) sengaja tidak disertakan
export const PUBLIC_COLUMNS = `id, owner_id, name, category, subcategory, description, established_year, photo_url, photos,
  phone, website, instagram, address, address_detail, latitude, longitude, open_hours, price_range, services,
  payments, amenities, menu, status, created_at, updated_at`;
