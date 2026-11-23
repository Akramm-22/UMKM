// satu skema data usaha untuk form produsen → verifikasi admin → detail konsumen

export const CATEGORY_OPTIONS = [
  { key: 'kuliner', label: 'Kuliner', desc: 'Warung, kedai kopi, kue, catering', subs: ['Warung makan', 'Kedai kopi', 'Toko kue', 'Catering', 'Angkringan', 'Bakso & mi', 'Jajanan'] },
  { key: 'jasa', label: 'Jasa', desc: 'Laundry, servis, pangkas, jahit', subs: ['Laundry', 'Penjahit', 'Pangkas rambut', 'Bengkel motor', 'Servis elektronik', 'Fotokopi & cetak'] },
  { key: 'toko', label: 'Toko', desc: 'Sembako, kelontong, agen', subs: ['Toko sembako', 'Toko kelontong', 'Agen gas & galon', 'Toko pakaian', 'Toko bangunan', 'Konter pulsa'] },
];

export const DAYS = [
  { key: 'mon', label: 'Senin' }, { key: 'tue', label: 'Selasa' }, { key: 'wed', label: 'Rabu' },
  { key: 'thu', label: 'Kamis' }, { key: 'fri', label: 'Jumat' }, { key: 'sat', label: 'Sabtu' }, { key: 'sun', label: 'Minggu' },
];

// opsi layanan ala Google Maps, ditampilkan sesuai kategori
export const SERVICE_OPTIONS = {
  kuliner: [['dine_in', 'Makan di tempat'], ['takeaway', 'Bawa pulang'], ['delivery', 'Pesan antar'], ['pickup', 'Ambil di tempat']],
  jasa: [['pickup', 'Antar-jemput barang'], ['delivery', 'Layanan ke rumah'], ['takeaway', 'Bisa ditunggu']],
  toko: [['pickup', 'Ambil di toko'], ['delivery', 'Pesan antar']],
};

export const PAYMENT_OPTIONS = [
  ['cash', 'Tunai'], ['qris', 'QRIS'], ['ewallet', 'E-wallet (GoPay, OVO, DANA)'], ['transfer', 'Transfer bank'], ['debit', 'Kartu debit'],
];

export const AMENITY_OPTIONS = [
  ['wifi', 'Wi-Fi gratis'], ['parking', 'Area parkir'], ['toilet', 'Toilet'], ['prayer', 'Musala'],
  ['ac', 'Ruangan ber-AC'], ['outdoor', 'Tempat duduk luar'], ['wheelchair', 'Akses kursi roda'], ['kids', 'Ramah anak'],
];

export const labelOf = (list, key) => list.find(([k]) => k === key)?.[1] ?? key;

export const emptyForm = () => ({
  name: '',
  category: '',
  subcategory: '',
  description: '',
  established_year: '',
  phone: '',
  website: '',
  instagram: '',
  address_detail: { street: '', rt_rw: '', kelurahan: '', kecamatan: '', kota: '', provinsi: 'DKI Jakarta', postal_code: '', landmark: '' },
  latitude: null,
  longitude: null,
  open_hours: Object.fromEntries(DAYS.map((d) => [d.key, { open: d.key !== 'sun', from: '08:00', to: '17:00', allDay: false }])),
  price_min: '',
  price_max: '',
  services: {},
  payments: ['cash'],
  amenities: [],
  menu: [],
  photos: { front: null, interior: null, products: [] },
  owner_id_doc: null,
});

export function composeAddress(a = {}) {
  return [
    a.street,
    a.rt_rw && `RT/RW ${a.rt_rw}`,
    a.kelurahan && `Kel. ${a.kelurahan}`,
    a.kecamatan && `Kec. ${a.kecamatan}`,
    a.kota,
    [a.provinsi, a.postal_code].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ');
}

const TIME_RE = /^([01]\d|2[0-3])[.:][0-5]\d$/;
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const PHONE_RE = /^(\+?62|0)8\d{8,11}$/;
const URL_RE = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i;
const IG_RE = /^@?[A-Za-z0-9._]{1,30}$/;

export const cleanPhone = (v) => String(v ?? '').replace(/[\s-]/g, '');

// kembalikan { field: pesan } per langkah wizard
export function validateStep(step, f) {
  const e = {};
  if (step === 0) {
    if (f.name.trim().length < 3) e.name = 'Nama usaha minimal 3 karakter.';
    else if (f.name.trim().length > 80) e.name = 'Nama usaha maksimal 80 karakter.';
    if (!f.category) e.category = 'Pilih kategori usaha.';
    if (!f.subcategory.trim()) e.subcategory = 'Isi jenis usaha, mis. "Warung makan".';
    if (f.description.trim().length < 30) e.description = 'Ceritakan usahamu minimal 30 karakter.';
    const y = Number(f.established_year);
    if (f.established_year && (!Number.isInteger(y) || y < 1900 || y > new Date().getFullYear())) e.established_year = 'Tahun tidak valid.';
  }
  if (step === 1) {
    const a = f.address_detail;
    if (a.street.trim().length < 5) e.street = 'Isi nama jalan & nomor bangunan.';
    if (a.rt_rw && !/^\d{1,3}\/\d{1,3}$/.test(a.rt_rw.trim())) e.rt_rw = 'Format RT/RW: 004/002.';
    if (!a.kelurahan.trim()) e.kelurahan = 'Kelurahan/desa wajib diisi.';
    if (!a.kecamatan.trim()) e.kecamatan = 'Kecamatan wajib diisi.';
    if (!a.kota.trim()) e.kota = 'Kota/kabupaten wajib diisi.';
    if (a.postal_code && !/^\d{5}$/.test(a.postal_code)) e.postal_code = 'Kode pos 5 digit.';
    if (f.latitude == null || f.longitude == null) e.pin = 'Tandai titik lokasi usahamu di peta.';
    else if (Math.abs(f.latitude) > 90 || Math.abs(f.longitude) > 180) e.pin = 'Koordinat tidak valid.';
  }
  if (step === 2) {
    if (!PHONE_RE.test(cleanPhone(f.phone))) e.phone = 'Nomor WhatsApp/telepon aktif, format 08xxxxxxxxxx.';
    if (f.website && !URL_RE.test(f.website.trim())) e.website = 'Alamat situs tidak valid.';
    if (f.instagram && !IG_RE.test(f.instagram.trim())) e.instagram = 'Username Instagram tidak valid.';
    const open = DAYS.filter((d) => f.open_hours[d.key].open);
    if (!open.length) e.hours = 'Minimal satu hari buka.';
    for (const d of open) {
      const h = f.open_hours[d.key];
      if (h.allDay) continue;
      if (!TIME_RE.test(h.from) || !TIME_RE.test(h.to)) { e.hours = `Jam ${d.label} belum lengkap.`; break; }
      if (toMin(h.from) === toMin(h.to)) { e.hours = `Jam buka & tutup ${d.label} tidak boleh sama.`; break; }
    }
  }
  if (step === 3) {
    if (!f.photos.front) e.front = 'Foto tampak depan wajib — membantu konsumen mengenali tempatmu.';
    if (!f.photos.interior) e.interior = 'Foto kondisi tempat usaha wajib.';
  }
  if (step === 4) {
    const min = Number(f.price_min);
    const max = Number(f.price_max);
    if ((f.price_min && !f.price_max) || (!f.price_min && f.price_max)) e.price = 'Isi harga terendah & tertinggi.';
    else if (f.price_min && (min < 500 || max < min)) e.price = 'Harga tertinggi harus ≥ harga terendah (min. Rp500).';
    if (!f.payments.length) e.payments = 'Pilih minimal satu metode pembayaran.';
    const bad = f.menu.findIndex((m) => !m.name.trim() || (m.price !== '' && !(Number(m.price) >= 0)));
    if (bad >= 0) e.menu = `Item menu #${bad + 1}: nama wajib diisi & harga berupa angka.`;
  }
  return e;
}

const hoursToRecord = (oh) =>
  Object.fromEntries(DAYS.map((d) => {
    const h = oh[d.key];
    if (!h.open) return [d.key, 'Tutup'];
    if (h.allDay) return [d.key, '24 jam'];
    return [d.key, `${h.from.replace(':', '.')}–${h.to.replace(':', '.')}`];
  }));

const recordToHours = (oh) => {
  const base = emptyForm().open_hours;
  if (!oh || typeof oh !== 'object') return base;
  return Object.fromEntries(DAYS.map((d) => {
    const t = oh[d.key];
    if (!t || /tutup/i.test(t)) return [d.key, { ...base[d.key], open: false }];
    if (/24\s*jam/i.test(t)) return [d.key, { open: true, from: '00:00', to: '23:59', allDay: true }];
    const [from = '08:00', to = '17:00'] = t.split(/[–-]/).map((x) => x.trim().replace('.', ':'));
    return [d.key, { open: true, from, to, allDay: false }];
  }));
};

// data form → record tersimpan (API & lokal memakai bentuk yang sama)
export function toRecord(f) {
  const ig = f.instagram.trim().replace(/^@/, '');
  return {
    name: f.name.trim(),
    category: f.category,
    subcategory: f.subcategory.trim(),
    description: f.description.trim(),
    established_year: f.established_year ? Number(f.established_year) : null,
    phone: cleanPhone(f.phone),
    website: f.website.trim() || null,
    instagram: ig ? `instagram.com/${ig}` : null,
    address: composeAddress(f.address_detail),
    address_detail: Object.fromEntries(Object.entries(f.address_detail).map(([k, v]) => [k, String(v).trim()])),
    latitude: Number(f.latitude.toFixed(6)),
    longitude: Number(f.longitude.toFixed(6)),
    open_hours: hoursToRecord(f.open_hours),
    price_range: f.price_min ? { min: Number(f.price_min), max: Number(f.price_max) } : null,
    services: Object.fromEntries((SERVICE_OPTIONS[f.category] ?? []).map(([k]) => [k, Boolean(f.services[k])])),
    payments: f.payments,
    amenities: f.amenities,
    menu: f.menu.map((m) => ({ name: m.name.trim(), price: m.price === '' ? null : Number(m.price), desc: m.desc?.trim() || undefined })),
    photos: f.photos,
    owner_id_doc: f.owner_id_doc,
  };
}

// record tersimpan → form (untuk perbaikan setelah ditolak)
export function toForm(r) {
  const base = emptyForm();
  return {
    ...base,
    name: r.name ?? '',
    category: String(r.category ?? '').toLowerCase(),
    subcategory: r.subcategory ?? '',
    description: r.description ?? '',
    established_year: r.established_year ? String(r.established_year) : '',
    phone: r.phone ?? '',
    website: r.website ?? '',
    instagram: r.instagram ? r.instagram.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, '') : '',
    address_detail: { ...base.address_detail, ...(r.address_detail ?? { street: r.address ?? '' }) },
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    open_hours: recordToHours(typeof r.open_hours === 'string' ? Object.fromEntries(DAYS.map((d) => [d.key, r.open_hours])) : r.open_hours),
    price_min: r.price_range?.min != null ? String(r.price_range.min) : '',
    price_max: r.price_range?.max != null ? String(r.price_range.max) : '',
    services: r.services ?? {},
    payments: r.payments?.length ? r.payments : ['cash'],
    amenities: r.amenities ?? [],
    menu: (r.menu ?? []).map((m) => ({ name: m.name ?? '', price: m.price == null ? '' : String(m.price), desc: m.desc ?? '' })),
    photos: { front: r.photos?.front ?? r.photo_url ?? null, interior: r.photos?.interior ?? null, products: r.photos?.products ?? [] },
    owner_id_doc: r.owner_id_doc ?? null,
  };
}

// record (lokal/API/demo) → bentuk yang dipakai peta & panel detail konsumen
export function toPlace(r) {
  const photos = r.photos ?? {};
  const gallery = [
    photos.front && { url: photos.front, label: 'Tampak depan' },
    photos.interior && { url: photos.interior, label: 'Suasana tempat' },
    ...(photos.products ?? []).map((url, i) => ({ url, label: `Produk ${i + 1}` })),
  ].filter(Boolean);
  return {
    ...r,
    category: String(r.category ?? '').toLowerCase(),
    photo: r.photo ?? photos.front ?? r.photo_url ?? null,
    gallery: r.gallery ?? gallery,
    rating: r.rating ?? null,
    reviews: r.reviews ?? 0,
  };
}

// daftar dokumen yang diperiksa admin — sumber sama dengan isian foto produsen
export function documentsOf(r) {
  const p = r.photos ?? {};
  const products = p.products ?? [];
  return [
    { type: 'Foto tampak depan', url: p.front ?? r.photo_url ?? null, required: true },
    { type: 'Foto kondisi tempat', url: p.interior ?? null, required: true },
    ...(products.length ? products.map((url, i) => ({ type: `Foto produk ${i + 1}`, url })) : [{ type: 'Foto produk', url: null }]),
    r.owner_id_doc === 'demo-ktp'
      ? { type: 'KTP pemilik', kind: 'ktp', private: true }
      : { type: 'KTP pemilik', url: r.owner_id_doc ?? null, private: true },
  ];
}

// kompres foto di browser agar ringan disimpan & dikirim (maks ±1280px, JPEG)
export function compressImage(file, maxSide = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Format foto harus JPG, PNG, atau WEBP.'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Ukuran foto maksimal 8 MB.'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak bisa dibaca.')); };
    img.src = url;
  });
}
