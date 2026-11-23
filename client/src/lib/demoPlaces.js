// data usaha mode demo — dipakai peta, section "Lagi rame", dan pencarian pintar
import { kindOf } from '../../../shared/smartSearch.mjs';
import { openStatus, weeklyHours, distanceKm } from './place.js';

const IMG = (id, w = 480) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

const week = (wd, sat = wd, sun = 'Tutup') => ({ mon: wd, tue: wd, wed: wd, thu: wd, fri: wd, sat, sun });

const DETAILS = {
  1: {
    subcategory: 'Warung makan', kind: 'makanan',
    description: 'Nasi uduk, nasi rames, dan lauk rumahan dimasak setiap pagi. Bisa pesan nasi kotak untuk acara.',
    open_hours: { mon: '06.00–14.00', tue: '06.00–14.00', wed: '06.00–14.00', thu: '06.00–14.00', fri: '06.00–11.30', sat: '06.00–14.00', sun: 'Tutup' },
    price_range: { min: 10000, max: 25000 },
    services: { dine_in: true, takeaway: true, delivery: false },
    payments: ['cash', 'qris'], amenities: ['parking'],
    instagram: 'instagram.com/warungbusiti',
    menu: [
      { name: 'Nasi Uduk Komplit', price: 15000, desc: 'Ayam goreng, telur balado, orek tempe' },
      { name: 'Nasi Rames', price: 13000, desc: 'Pilih 3 lauk rumahan' },
      { name: 'Nasi Kotak Acara', price: 25000, desc: 'Min. 20 kotak, pesan H-1' },
      { name: 'Es Teh Manis', price: 4000 },
    ],
  },
  2: {
    subcategory: 'Penjahit', kind: 'jasa',
    description: 'Permak celana, pasang resleting, dan jahit seragam sekolah. Bisa ditunggu untuk permak ringan.',
    open_hours: { mon: '08.00–17.00', tue: '08.00–17.00', wed: '08.00–17.00', thu: '08.00–17.00', fri: '08.00–11.30', sat: '08.00–15.00', sun: 'Tutup' },
    price_range: { min: 10000, max: 75000 },
    services: { pickup: true, delivery: false },
    payments: ['cash'], amenities: [],
    menu: [
      { name: 'Permak Celana (potong)', price: 15000 },
      { name: 'Ganti Resleting', price: 20000 },
      { name: 'Jahit Seragam Sekolah', price: 75000, desc: 'Bahan dari pelanggan' },
    ],
  },
  3: {
    subcategory: 'Toko sembako', kind: 'toko',
    description: 'Sembako lengkap, gas 3 kg, galon isi ulang, dan token listrik.',
    open_hours: { mon: '07.00–21.00', tue: '07.00–21.00', wed: '07.00–21.00', thu: '07.00–21.00', fri: '07.00–21.00', sat: '07.00–21.00', sun: '09.00–18.00' },
    services: { pickup: true, delivery: true },
    payments: ['cash', 'qris', 'transfer'], amenities: ['parking'],
    menu: [
      { name: 'Beras Premium 5 kg', price: 72000 },
      { name: 'Gas LPG 3 kg', price: 22000 },
      { name: 'Galon Isi Ulang', price: 7000 },
    ],
  },
  4: {
    subcategory: 'Warung sate', kind: 'makanan',
    description: 'Sate ayam dan sate kambing bumbu kacang, lontong, dan tongseng. Ramai selepas maghrib.',
    open_hours: '16.00–23.00',
    price_range: { min: 20000, max: 50000 },
    services: { dine_in: true, takeaway: true, delivery: true },
    payments: ['cash', 'qris', 'ewallet'], amenities: ['outdoor'],
    menu: [
      { name: 'Sate Ayam (10 tusuk)', price: 25000, desc: 'Bumbu kacang + lontong' },
      { name: 'Sate Kambing (10 tusuk)', price: 40000 },
      { name: 'Tongseng Kambing', price: 30000 },
    ],
  },
  5: {
    subcategory: 'Kedai kopi', kind: 'minuman',
    description: 'Kopi tubruk, kopi susu gula aren, dan gorengan hangat. Tersedia colokan dan wifi.',
    open_hours: '15.00–01.00',
    price_range: { min: 8000, max: 30000 },
    services: { dine_in: true, takeaway: true, delivery: false },
    payments: ['cash', 'qris'], amenities: ['wifi', 'outdoor'],
    instagram: 'instagram.com/kopikampungsenja',
    menu: [
      { name: 'Kopi Susu Gula Aren', price: 15000 },
      { name: 'Kopi Tubruk', price: 8000 },
      { name: 'Pisang Goreng (5 pcs)', price: 10000 },
    ],
  },
  6: {
    subcategory: 'Laundry', kind: 'jasa',
    description: 'Cuci kering setrika kiloan, selesai 24 jam. Express 6 jam tersedia.',
    open_hours: '07.00–21.00',
    services: { pickup: true, delivery: true },
    payments: ['cash', 'qris', 'transfer'], amenities: [],
    menu: [
      { name: 'Cuci Setrika Reguler / kg', price: 7000, desc: 'Selesai 24 jam' },
      { name: 'Express 6 Jam / kg', price: 12000 },
      { name: 'Bed Cover', price: 25000 },
    ],
  },
  8: {
    subcategory: 'Bakso & mi ayam', kind: 'makanan',
    description: 'Bakso urat, bakso beranak, dan mi ayam jamur. Kuah kaldu sapi dimasak sejak subuh.',
    open_hours: week('10.00–21.00', '10.00–22.00', '10.00–21.00'),
    price_range: { min: 12000, max: 30000 },
    services: { dine_in: true, takeaway: true, delivery: true },
    payments: ['cash', 'qris', 'ewallet'], amenities: ['parking', 'kids'],
    menu: [
      { name: 'Bakso Urat Jumbo', price: 20000 },
      { name: 'Mi Ayam Jamur', price: 15000 },
      { name: 'Es Jeruk', price: 6000 },
    ],
  },
  9: {
    subcategory: 'Minuman segar', kind: 'minuman',
    description: 'Es teh jumbo aneka rasa, jus buah segar, dan es campur. Cocok untuk siang yang panas.',
    open_hours: week('09.00–21.00', '09.00–22.00', '10.00–20.00'),
    price_range: { min: 3000, max: 15000 },
    services: { takeaway: true, delivery: true, dine_in: false },
    payments: ['cash', 'qris', 'ewallet'], amenities: [],
    menu: [
      { name: 'Es Teh Jumbo', price: 3000 },
      { name: 'Jus Alpukat', price: 12000 },
      { name: 'Es Campur', price: 10000 },
    ],
  },
  10: {
    subcategory: 'Gorengan & martabak', kind: 'jajanan',
    description: 'Martabak manis & telor, gorengan hangat, dan cireng. Mangkal tiap sore depan gang.',
    open_hours: week('15.00–23.00', '15.00–24.00', '15.00–23.00'),
    price_range: { min: 1000, max: 40000 },
    services: { takeaway: true, delivery: true },
    payments: ['cash', 'qris'], amenities: [],
    menu: [
      { name: 'Martabak Manis Keju', price: 35000 },
      { name: 'Martabak Telor', price: 30000 },
      { name: 'Gorengan (per biji)', price: 1000 },
    ],
  },
  11: {
    subcategory: 'Bengkel motor', kind: 'jasa',
    description: 'Servis ringan, ganti oli, tambal ban tubeless, dan spare part harian motor.',
    open_hours: week('08.00–18.00', '08.00–16.00'),
    price_range: { min: 10000, max: 150000 },
    services: { pickup: true, delivery: false },
    payments: ['cash', 'qris'], amenities: ['parking'],
    menu: [
      { name: 'Ganti Oli + Cek', price: 55000 },
      { name: 'Tambal Ban Tubeless', price: 15000 },
      { name: 'Servis Ringan', price: 45000 },
    ],
  },
  12: {
    subcategory: 'Konter pulsa & aksesoris', kind: 'toko',
    description: 'Pulsa, paket data, token listrik, dan aksesoris HP. Bisa bayar tagihan BPJS & PDAM.',
    open_hours: week('08.00–22.00', '08.00–22.00', '09.00–21.00'),
    price_range: { min: 5000, max: 100000 },
    services: { pickup: true, delivery: false },
    payments: ['cash', 'qris', 'ewallet', 'transfer'], amenities: [],
    menu: [
      { name: 'Paket Data 10 GB', price: 50000 },
      { name: 'Token Listrik 50rb', price: 52000 },
      { name: 'Kabel Data Type-C', price: 25000 },
    ],
  },
};

export const DEMO_BUSINESSES = [
  { id: 1, name: 'Warung Nasi Bu Siti', category: 'kuliner', latitude: -6.1985, longitude: 106.8125, rating: 4.8, reviews: 120, is_open: true, promo: 'Diskon 10% nasi uduk', phone: '6281234567890', address: 'Jl. Melati No. 3, RT.4/RW.2, Menteng, Jakarta Pusat', photo: IMG('photo-1512058564366-18510be2db19') },
  { id: 2, name: 'Jahit Cepat Pak Anto', category: 'jasa', latitude: -6.2032, longitude: 106.8188, rating: 4.6, reviews: 45, is_open: true, promo: null, phone: '6281298765432', address: 'Jl. Kenanga No. 11, RT.1/RW.5, Menteng, Jakarta Pusat', photo: IMG('photo-1558618666-fcd25c85cd64') },
  { id: 3, name: 'Toko Sembako Berkah', category: 'toko', latitude: -6.1968, longitude: 106.8209, rating: 4.7, reviews: 89, is_open: false, promo: null, phone: '6285612345678', address: 'Jl. Mawar No. 7, RT.3/RW.1, Menteng, Jakarta Pusat', photo: IMG('photo-1542838132-92c53300491e') },
  { id: 4, name: 'Sate Ayam Bang Jali', category: 'kuliner', latitude: -6.2041, longitude: 106.8121, rating: 4.9, reviews: 210, is_open: true, promo: 'Beli 10 gratis 2', phone: '6287811223344', address: 'Jl. Anggrek No. 21, RT.6/RW.3, Menteng, Jakarta Pusat', photo: IMG('photo-1529563021893-cc83c992d75d') },
  { id: 5, name: 'Kopi Kampung Senja', category: 'kuliner', latitude: -6.2008, longitude: 106.8171, rating: 4.7, reviews: 64, is_open: true, promo: null, phone: '6281377788899', address: 'Jl. Dahlia No. 2, RT.2/RW.4, Menteng, Jakarta Pusat', photo: IMG('photo-1509042239860-f550ce710b93') },
  { id: 6, name: 'Laundry Kilat 24', category: 'jasa', latitude: -6.1953, longitude: 106.8178, rating: 4.6, reviews: 45, is_open: true, promo: 'Gratis antar 1 km', phone: '6282144556677', address: 'Jl. Flamboyan No. 9, RT.5/RW.2, Menteng, Jakarta Pusat', photo: IMG('photo-1545173168-9f1947eebb7f') },
  { id: 8, name: 'Bakso Mas Gondrong', category: 'kuliner', latitude: -6.2022, longitude: 106.8102, rating: 4.8, reviews: 156, is_open: true, promo: 'Gratis es jeruk tiap Jumat', phone: '6281211110008', address: 'Jl. Cempaka No. 5, RT.2/RW.3, Menteng, Jakarta Pusat', photo: IMG('photo-1555126634-323283e090fa') },
  { id: 9, name: 'Es Teh Jumbo Mbak Rina', category: 'kuliner', latitude: -6.1979, longitude: 106.8154, rating: 4.5, reviews: 98, is_open: true, promo: 'Beli 3 gratis 1', phone: '6281211110009', address: 'Jl. Teratai No. 14, RT.1/RW.2, Menteng, Jakarta Pusat', photo: IMG('photo-1556679343-c7306c1976bc') },
  { id: 10, name: 'Martabak & Gorengan Pak Udin', category: 'kuliner', latitude: -6.2058, longitude: 106.8163, rating: 4.7, reviews: 133, is_open: true, promo: null, phone: '6281211110010', address: 'Jl. Kamboja No. 2, RT.5/RW.4, Menteng, Jakarta Pusat', photo: IMG('photo-1578985545062-69928b1d9587') },
  { id: 11, name: 'Bengkel Motor Jaya', category: 'jasa', latitude: -6.1941, longitude: 106.8131, rating: 4.6, reviews: 72, is_open: true, promo: 'Cek rem gratis', phone: '6281211110011', address: 'Jl. Seroja No. 8, RT.3/RW.1, Menteng, Jakarta Pusat', photo: IMG('photo-1558981806-ec527fa84c39') },
  { id: 12, name: 'Konter Pulsa Arka Cell', category: 'toko', latitude: -6.2013, longitude: 106.8226, rating: 4.4, reviews: 41, is_open: true, promo: null, phone: '6281211110012', address: 'Jl. Bougenville No. 21, RT.4/RW.5, Menteng, Jakarta Pusat', photo: IMG('photo-1512499617640-c74ae3a79d37') },
].map((b) => ({ ...b, ...DETAILS[b.id] }));

export const KINDS = {
  makanan: { label: 'Makanan', emoji: '🍛' },
  minuman: { label: 'Minuman', emoji: '🧋' },
  jajanan: { label: 'Jajanan', emoji: '🍢' },
  toko: { label: 'Toko', emoji: '🛒' },
  jasa: { label: 'Jasa', emoji: '🔧' },
};

export { kindOf };

export const PILOT_CENTER = [-6.2, 106.816666];

export const fmtDistance = (km) => (km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)} m` : `${km.toFixed(1).replace('.', ',')} km`);

const short = (n) => (n >= 1000 ? `${Math.round(n / 1000)}rb` : String(n));

// bentuk ringkas untuk kartu landing ("Lagi rame", modal, pratinjau)
export function toCard(b, origin = PILOT_CENTER, now = new Date()) {
  const kind = kindOf(b);
  const status = openStatus(b.open_hours, b.is_open, now);
  const week = weeklyHours(b.open_hours);
  const km = distanceKm(origin, [Number(b.latitude), Number(b.longitude)]);
  const pr = b.price_range;
  return {
    id: b.id,
    img: b.photo,
    name: b.name,
    kind,
    category: b.category,
    cat: b.subcategory ?? KINDS[kind].label,
    rating: b.rating,
    reviews: b.reviews ?? 0,
    km,
    dist: fmtDistance(km),
    promo: b.promo,
    open: Boolean(status?.open),
    openDetail: status?.detail ?? '',
    hours: week ? week[(now.getDay() + 6) % 7].text : '—',
    price: pr ? `Rp${short(pr.min)}–${short(pr.max)}` : null,
    desc: b.description,
    phone: b.phone,
  };
}
