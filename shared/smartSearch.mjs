// Smart Search — memahami kueri bebas ("warung terdekat", "kuliner murah", "toko sembako di menteng").
// Dipakai bersama oleh klien (peta, mode demo) dan server (GET /api/businesses/search).

export const KIND_KEYS = ['makanan', 'minuman', 'jajanan', 'toko', 'jasa'];

// jenis usaha; data DB/form tidak menyimpan `kind`, jadi diturunkan dari kategori & teks
export function kindOf(b) {
  if (KIND_KEYS.includes(b.kind)) return b.kind;
  const cat = String(b.category ?? '').toLowerCase();
  if (cat === 'toko' || cat === 'jasa') return cat;
  const text = `${b.subcategory ?? ''} ${b.name ?? ''}`.toLowerCase();
  if (/kopi|teh|jus|minum|kafe|cafe|susu/.test(text)) return 'minuman';
  if (/kue|jajan|gorengan|martabak|snack|roti|camilan/.test(text)) return 'jajanan';
  return 'makanan';
}

// jenis usaha yang dikenali dari kueri; `words` dicari di nama/subkategori/menu,
// `pin` = kata spesifik yang tetap wajib cocok di teks (mis. "kopi" tidak boleh melebar ke semua minuman)
const TYPES = [
  { key: 'warung', label: 'Warung', emoji: '🍛', re: /\b(warung|warteg|warkop|kedai|lapo)\b/, cats: ['kuliner'], words: ['warung', 'warteg', 'kedai', 'kelontong'], pin: [] },
  { key: 'kuliner', label: 'Kuliner', emoji: '🍜', re: /\b(tempat makan|rumah makan|kuliner|makanan|makan|resto|restoran|lapar|laper)\b/, cats: ['kuliner'], words: [], pin: [] },
  { key: 'minuman', label: 'Minuman', emoji: '🧋', re: /\b(minuman|minum|ngopi|kopi|cafe|kafe|coffee|jus|es teh|haus)\b/, kinds: ['minuman'], words: ['kopi', 'teh', 'jus', 'minum'], pin: ['kopi', 'jus', 'es teh'] },
  { key: 'jajanan', label: 'Jajanan', emoji: '🍢', re: /\b(jajanan|jajan|camilan|cemilan|snack|gorengan|kue|martabak)\b/, kinds: ['jajanan'], words: ['gorengan', 'martabak', 'kue', 'jajan'], pin: ['gorengan', 'martabak', 'kue'] },
  { key: 'sembako', label: 'Toko sembako', emoji: '🛒', re: /\b(sembako|kelontong|beras|gas|galon|minyak goreng)\b/, cats: ['toko'], words: ['sembako', 'beras', 'gas', 'galon', 'kelontong'], pin: ['beras', 'gas', 'galon', 'minyak goreng'], strict: true },
  { key: 'toko', label: 'Toko', emoji: '🏪', re: /\b(toko|belanja|minimarket|pulsa|konter)\b/, cats: ['toko'], words: [], pin: ['pulsa'] },
  { key: 'jasa', label: 'Jasa', emoji: '🔧', re: /\b(jasa|servis|service|bengkel|laundry|londri|jahit|penjahit|permak|cukur|pangkas|potong rambut|tambal ban)\b/, cats: ['jasa'], words: ['bengkel', 'laundry', 'jahit', 'permak', 'servis', 'cukur', 'pangkas', 'tambal'], pin: ['bengkel', 'laundry', 'jahit', 'permak', 'cukur', 'pangkas', 'tambal ban'] },
];

const FLAGS = [
  { key: 'near', label: 'Terdekat', emoji: '📍', re: /\b(terdekat|paling dekat|dekat sini|dekat saya|dekat aku|dekat rumah|deket sini|terdeket|sekitar sini|sekitar saya|sekitarku|nearby)\b/ },
  { key: 'open', label: 'Buka sekarang', emoji: '🕒', re: /\b(yang buka|lagi buka|masih buka|buka sekarang|buka skrg|sedang buka|buka)\b/ },
  { key: 'cheap', label: 'Murah', emoji: '💸', re: /\b(murah|murmer|hemat|terjangkau|ekonomis|kantong pelajar|ramah kantong)\b/ },
  { key: 'promo', label: 'Ada promo', emoji: '🏷️', re: /\b(promo|diskon|potongan|gratis)\b/ },
  { key: 'top', label: 'Rating terbaik', emoji: '⭐', re: /\b(terbaik|terenak|paling enak|enak|rekomendasi|rekomen|populer|terlaris|favorit|rating tinggi)\b/ },
  { key: 'delivery', label: 'Bisa diantar', emoji: '🛵', re: /\b(diantar|antar|delivery|pesan antar)\b/ },
  { key: 'dine_in', label: 'Makan di tempat', emoji: '🪑', re: /\b(makan di tempat|dine in|bisa nongkrong|nongkrong)\b/ },
  { key: 'wifi', label: 'Ada Wi-Fi', emoji: '📶', re: /\b(wifi|wi-fi)\b/ },
  { key: 'qris', label: 'Bisa QRIS', emoji: '📱', re: /\b(qris|cashless|non tunai)\b/ },
  { key: 'parking', label: 'Ada parkir', emoji: '🅿️', re: /\b(parkir|parkiran)\b/ },
];

const STOP = new Set(['yang', 'di', 'ke', 'dan', 'atau', 'ini', 'itu', 'saya', 'aku', 'gue', 'gw', 'mau', 'cari', 'carikan', 'ada', 'tempat', 'dong', 'deh', 'nih', 'yg', 'dgn', 'dengan', 'untuk', 'buat', 'apa', 'mana', 'tolong', 'sekarang', 'skrg', 'lagi', 'sedang', 'paling', 'sini', 'aja', 'saja', 'banget', 'bgt', 'sih', 'tuh', 'harga', 'usaha', 'umkm', 'bisa', 'punya', 'pakai', 'pake', 'terima', 'juga', 'tapi', 'enak']);

const CHEAP_CAP = 20000;

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s.,-]/gu, ' ').replace(/\s+/g, ' ').trim();

// "di bawah 25rb", "maks 30 ribu", "< 20000", "15k"
function priceCap(q) {
  const m = q.match(/(?:di ?bawah|dibawah|maks(?:imal)?|max|kurang dari|<|budget|bujet|harga)\s*(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|000)?/);
  if (!m) return null;
  const n = Number(m[1].replace(/[.,]/g, ''));
  const v = m[2] || n < 1000 ? n * 1000 : n;
  return Number.isFinite(v) && v > 0 ? { cap: v, text: m[0] } : null;
}

// area manual: "di menteng", "daerah kemang", "sekitar stasiun gondangdia", "dekat pasar baru"
function areaOf(q) {
  const m = q.match(/\b(?:di|daerah|kawasan|area|wilayah|sekitar|dekat|deket)\s+((?!sini\b|saya\b|aku\b|rumah\b|sekitar\b)[\p{L}\p{N} .'-]{3,40})$/u);
  return m ? m[1].trim() : null;
}

export function parseQuery(raw) {
  let q = ` ${norm(raw)} `;
  const out = { raw: String(raw ?? '').trim(), types: [], flags: {}, cap: null, area: null, terms: [] };
  if (!q.trim()) return out;

  const price = priceCap(q);
  if (price) { out.cap = price.cap; q = q.replace(price.text, ' '); }

  // flag dulu: "makan di tempat" jangan sampai terbaca sebagai area "tempat"
  for (const f of FLAGS) {
    if (f.re.test(q)) { out.flags[f.key] = true; q = q.replace(f.re, ' '); }
  }
  if (out.flags.cheap && !out.cap) out.cap = CHEAP_CAP;

  const area = areaOf(q.trim());
  if (area && !TYPES.some((t) => t.re.test(` ${area} `))) { out.area = area; q = q.replace(new RegExp(`\\b\\S+\\s+${area.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), ' '); }

  for (const t of TYPES) {
    const m = q.match(t.re);
    if (m) {
      out.types.push(t.key);
      // kata spesifik (mis. "sembako", "kopi") tetap dipakai untuk mencocokkan teks
      if (t.pin.includes(m[1])) out.terms.push(m[1]);
      q = q.replace(t.re, ' ');
    }
  }
  if (out.types.includes('sembako')) out.types = out.types.filter((k) => k !== 'toko');
  if (/\b(dekat|deket)\b/.test(q)) { out.flags.near = true; q = q.replace(/\b(dekat|deket)\b/g, ' '); }

  out.terms.push(...q.split(' ').map((w) => w.replace(/nya$/, '')).filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w)));
  out.terms = [...new Set(out.terms)];
  return out;
}

// label ringkas "dipahami sebagai" untuk ditampilkan di bawah kolom pencarian
export function describe(p) {
  const chips = [];
  p.types.forEach((k) => { const t = TYPES.find((x) => x.key === k); chips.push({ key: `t-${k}`, emoji: t.emoji, label: t.label }); });
  p.terms.filter((w) => !p.types.some((k) => TYPES.find((t) => t.key === k).pin.includes(w))).forEach((w) => chips.push({ key: `q-${w}`, emoji: '🔎', label: `"${w}"` }));
  FLAGS.forEach((f) => { if (p.flags[f.key]) chips.push({ key: f.key, emoji: f.emoji, label: f.key === 'cheap' && p.cap ? `≤ Rp${p.cap / 1000}rb` : f.label }); });
  if (p.cap && !p.flags.cheap) chips.push({ key: 'cap', emoji: '💸', label: `≤ Rp${p.cap / 1000}rb` });
  if (p.area) chips.push({ key: 'area', emoji: '📌', label: `Area: ${p.area}` });
  return chips;
}

export function sortLabel(p) {
  if (p.flags.cheap || (p.cap && !p.flags.near)) return 'harga termurah';
  if (p.flags.top && !p.flags.near) return 'rating tertinggi';
  if (p.flags.near) return 'jarak terdekat';
  return 'paling relevan';
}

export function distanceKm([lat1, lon1], [lat2, lon2]) {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const toMin = (t) => { const [h, m = '0'] = t.trim().split(/[.:]/); return Number(h) * 60 + Number(m); };

export function isOpenNow(hours, fallback, now = new Date()) {
  if (!hours) return fallback ?? null;
  let byDay = hours;
  if (typeof hours === 'string') {
    try { byDay = JSON.parse(hours); } catch { byDay = Object.fromEntries(DAY_KEYS.map((d) => [d, hours])); }
  }
  const mins = now.getHours() * 60 + now.getMinutes();
  const check = (text, offset) => {
    if (!text || /tutup/i.test(text)) return false;
    if (/24\s*jam/i.test(text)) return true;
    const m = text.match(/(\d{1,2}[.:]\d{2})\s*[–-]\s*(\d{1,2}[.:]\d{2})/);
    if (!m) return false;
    const open = toMin(m[1]);
    let close = toMin(m[2]);
    if (close <= open) close += 1440;
    const t = mins + offset;
    return t >= open && t < close;
  };
  return check(byDay[DAY_KEYS[now.getDay()]], 0) || check(byDay[DAY_KEYS[(now.getDay() + 6) % 7]], 1440);
}

// toleransi salah ketik 1 huruf untuk kata ≥ 5 huruf ("sembakoo", "lundry")
function near1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue; }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else { i += 1; j += 1; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function termHit(term, fields) {
  for (const [field, text] of fields) {
    if (!text) continue;
    if (text.includes(term)) return field;
    if (term.length >= 5 && text.split(/\s+/).some((w) => w.length >= 4 && near1(term, w))) return field;
  }
  return null;
}

const FIELD_W = { name: 4, sub: 3, menu: 2, desc: 1, addr: 1 };

export function searchBusinesses(list, p, origin, { now = new Date(), limit = 200 } = {}) {
  const types = p.types.map((k) => TYPES.find((t) => t.key === k));
  const rawNorm = norm(p.raw);
  const area = p.area ? norm(p.area) : null;
  const areaHits = area ? list.filter((b) => norm(b.address).includes(area) || norm(b.address_detail?.kelurahan ?? '').includes(area)) : [];

  const rows = [];
  for (const b of list) {
    const lat = Number(b.latitude);
    const lng = Number(b.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const cat = String(b.category ?? '').toLowerCase();
    const kind = kindOf(b);
    const menu = (b.menu ?? []).map((m) => norm(m.name)).join(' | ');
    const fields = [['name', norm(b.name)], ['sub', norm(b.subcategory)], ['menu', menu], ['desc', norm(b.description)], ['addr', norm(b.address)]];
    const why = [];
    let score = 0;

    if (types.length) {
      const typeOk = types.some((t) => {
        const wordHit = t.words.some((w) => termHit(w, fields.slice(0, 3)));
        if (t.strict) return wordHit;
        return wordHit || (t.cats ?? []).includes(cat) || (t.kinds ?? []).includes(kind);
      });
      if (!typeOk) continue;
      score += 2;
    }

    let termsOk = true;
    for (const term of p.terms) {
      const f = termHit(term, fields);
      if (!f) { termsOk = false; break; }
      score += FIELD_W[f];
      if (f === 'menu') {
        const m = (b.menu ?? []).find((x) => norm(x.name).includes(term));
        if (m) why.push(`Menu: ${m.name}${m.price ? ` · Rp${Number(m.price).toLocaleString('id-ID')}` : ''}`);
      }
    }
    if (!termsOk) continue;

    const open = isOpenNow(b.open_hours, b.is_open, now);
    if (p.flags.open && open !== true) continue;
    if (p.flags.promo && !b.promo) continue;
    const pr = b.price_range;
    if (p.cap) {
      if (!pr || pr.min == null || Number(pr.min) > p.cap) continue;
      why.push(`Mulai Rp${Number(pr.min).toLocaleString('id-ID')}`);
    }
    if (p.flags.delivery && !b.services?.delivery) continue;
    if (p.flags.dine_in && !b.services?.dine_in) continue;
    if (p.flags.wifi && !(b.amenities ?? []).includes('wifi')) continue;
    if (p.flags.qris && !(b.payments ?? []).includes('qris')) continue;
    if (p.flags.parking && !(b.amenities ?? []).includes('parking')) continue;
    if (areaHits.length && !areaHits.includes(b)) continue;

    const dist = distanceKm(origin, [lat, lng]);
    const rating = Number(b.rating) || 0;
    if (p.flags.top && rating) why.push(`Rating ${rating.toFixed(1).replace('.', ',')}`);
    // nama usaha diketik langsung → selalu teratas (seperti Google Maps)
    const nameExact = rawNorm.length >= 3 && fields[0][1].includes(rawNorm);
    if (nameExact) score += 50;
    const quality = [b.photo || b.photo_url, b.open_hours, b.phone, b.address, b.description, (b.menu ?? []).length].filter(Boolean).length / 6;
    const blended = score + 6 / (1 + dist * 1.5) + quality * 2 + (rating ? (rating - 3) : 0) + (open ? 1 : 0);
    rows.push({ biz: b, dist, open, score: blended, nameExact, why });
  }

  const by = sortLabel(p);
  const cmp = {
    'harga termurah': (a, b) => Number(a.biz.price_range.min) - Number(b.biz.price_range.min) || a.dist - b.dist,
    'rating tertinggi': (a, b) => (Number(b.biz.rating) || 0) - (Number(a.biz.rating) || 0) || a.dist - b.dist,
    'paling relevan': (a, b) => b.score - a.score || a.dist - b.dist,
    'jarak terdekat': (a, b) => a.dist - b.dist,
  }[by];
  const sorted = rows.sort((a, b) => Number(b.nameExact) - Number(a.nameExact) || cmp(a, b));
  return { results: sorted.slice(0, limit), sortedBy: by, areaMatchedByAddress: areaHits.length > 0 };
}

export const SUGGESTIONS = ['Warung terdekat', 'Tempat makan terdekat', 'Toko sembako terdekat', 'Tempat makan yang buka sekarang', 'Kuliner murah', 'Kopi ada wifi', 'Laundry bisa antar'];

// kata dasar untuk pelengkapan otomatis ("war" → "warung terdekat")
const COMPLETE_WORDS = ['warung', 'tempat makan', 'kuliner', 'kopi', 'minuman', 'jajanan', 'martabak', 'gorengan', 'bakso', 'sate', 'nasi uduk', 'toko sembako', 'toko', 'galon', 'pulsa', 'laundry', 'bengkel', 'jahit', 'pangkas rambut', 'jasa'];
const COMPLETE_TAILS = ['terdekat', 'yang buka sekarang', 'murah', 'ada promo'];

// saran saat mengetik: kueri lengkap (dengan jumlah hasil nyata) + tempat yang namanya cocok
export function suggest(input, list, origin, { now = new Date(), max = 5 } = {}) {
  const q = norm(input);
  if (!q) return { queries: [], places: [] };
  const words = q.split(' ');
  const last = words[words.length - 1];
  const head = words.slice(0, -1).join(' ');
  const cands = new Set();

  COMPLETE_WORDS.filter((w) => w.startsWith(q) || (head && w.startsWith(last))).forEach((w) => {
    const base = head && !w.startsWith(q) ? `${head} ${w}` : w;
    cands.add(base);
    COMPLETE_TAILS.forEach((t) => cands.add(`${base} ${t}`));
  });
  const p0 = parseQuery(q);
  const typing = last.length < 3 || (!COMPLETE_WORDS.includes(last) && COMPLETE_WORDS.some((w) => w.split(' ').some((x) => x !== last && x.startsWith(last))));
  if ((p0.types.length || p0.terms.length) && !typing) {
    COMPLETE_TAILS.filter((t) => !q.includes(t) && (t.startsWith(last) || !COMPLETE_TAILS.some((x) => x.startsWith(last)))).forEach((t) => cands.add(`${q} ${t}`));
    COMPLETE_TAILS.filter((t) => t.startsWith(last) && last.length >= 2).forEach((t) => cands.add(`${head} ${t}`.trim()));
  }
  SUGGESTIONS.map(norm).filter((s) => s.includes(q)).forEach((s) => cands.add(s));

  const queries = [];
  for (const text of cands) {
    if (text === q) continue;
    const p = parseQuery(text);
    if (p.types.length > 1) continue;
    const n = searchBusinesses(list, p, origin, { now }).results.length;
    if (n) queries.push({ text, count: n, chips: describe(p) });
    if (queries.length >= max) break;
  }

  const places = list
    .map((b) => {
      const name = norm(b.name);
      const rank = name.startsWith(q) ? 0 : name.split(' ').some((w) => w.startsWith(last) && q.length >= 2) && name.includes(head) ? 1 : name.includes(q) && q.length >= 4 ? 2 : 9;
      return { b, rank };
    })
    .filter((x) => x.rank < 9)
    .sort((a, b) => a.rank - b.rank || distanceKm(origin, [a.b.latitude, a.b.longitude]) - distanceKm(origin, [b.b.latitude, b.b.longitude]))
    .slice(0, 4)
    .map((x) => ({ biz: x.b, dist: distanceKm(origin, [Number(x.b.latitude), Number(x.b.longitude)]) }));

  return { queries, places };
}
