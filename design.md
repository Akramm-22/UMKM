# Design System — PesanLokal

**Panduan Visual & UI untuk Platform Direktori Usaha Lokal**

| | |
|---|---|
| **Versi** | 1.0 |
| **Tanggal** | 10 November 2026 |
| **Dokumen induk** | [PRD-PesanLokal.md](PRD-PesanLokal.md) |

---

## 1. Filosofi Desain

> **"Terpercaya seperti bank, hangat seperti warung."**

PesanLokal menampung dua kebutuhan emosional sekaligus: **kepercayaan** (data usaha harus terasa kredibel & terverifikasi) dan **kehangatan lokal** (UMKM itu dekat, ramah, milik tetangga sendiri). Sistem warna, tipografi, dan komponen di dokumen ini dirancang untuk menyeimbangkan keduanya.

Prinsip visual:

1. **Map-first** — peta adalah panggung utama; UI lain "mengambang" di atasnya (bottom sheet, chip, kartu) dan tidak boleh menutupi peta lebih dari 40% layar dalam keadaan default.
2. **Satu sistem, empat wajah** — keempat varian peta per role memakai token & komponen yang sama, dibedakan oleh tema dan layer.
3. **Aksen itu mahal** — kuning hanya untuk hal yang benar-benar penting (CTA utama, promo, status menunggu). Jika semua disorot, tidak ada yang tersorot.
4. **Kontras dulu, estetika kemudian** — semua kombinasi teks/latar wajib lulus WCAG AA.

---

## 2. Riset & Justifikasi Warna

Palet yang dipilih: **Midnight Navy + Powder Blue + Sunflower Yellow**. Pilihan ini bukan sekadar selera — ia didukung riset psikologi warna dan sangat cocok untuk konteks UMKM:

| Temuan Riset | Implikasi untuk PesanLokal |
|--------------|---------------------------|
| **Biru adalah warna paling disukai manusia lintas budaya & gender** — studi klasik Joe Hallock (2003) menemukan ±35–42% responden memilih biru sebagai warna favorit; survei YouGov (2015) di 10 negara mengonfirmasi biru juara di semua negara yang disurvei | Basis biru (navy + powder blue) memaksimalkan daya terima visual bagi audiens seluas mungkin — penting karena pengguna kita lintas usia (Bu Siti 48 th s.d. Rafi 24 th) |
| **Navy/biru tua = kepercayaan, stabilitas, profesionalisme** — alasan mengapa bank, fintech, dan platform besar (BCA, Traveloka, PayPal, LinkedIn) memakai biru tua | Masalah inti produk kita adalah *akurasi & kepercayaan informasi* — navy memperkuat persepsi "data di sini bisa dipercaya" |
| **Kuning = optimisme, energi, keterjangkauan, dan atensi** — kuning memiliki visibilitas tertinggi di antara warna spektrum; dalam konteks Indonesia, kuning lekat dengan ekonomi rakyat (gerobak, warung, pasar) | Sunflower yellow menjadi "denyut UMKM" di dalam UI yang biru: promo, CTA, pin status — hangat tanpa murahan |
| **Powder blue = tenang, bersih, modern** — tint biru muda menurunkan kesan korporat/kaku dari navy dan membuat antarmuka terasa ringan | Sebagai warna dominan (60%), powder blue membuat peta & konten tetap "bernapas" dan tidak melelahkan mata pada sesi browsing panjang |
| **Kombinasi biru–kuning = kontras komplemen alami** dengan rasio kontras tinggi, mudah dikenali termasuk oleh penyandang buta warna merah-hijau (deuteranopia — jenis paling umum) | Palet ini aksesibel by-design untuk ±8% pria dengan buta warna merah-hijau |

**Kesimpulan:** palet usulanmu dipertahankan. Tidak perlu diganti — ini salah satu kombinasi paling aman sekaligus berkarakter untuk produk kepercayaan + UMKM.

---

## 3. Palet Warna & Aturan 60-30-10

### 3.1 Tiga Warna Inti

| Peran | Nama | Hex | Porsi | Penggunaan |
|-------|------|-----|-------|------------|
| **Dominan (60%)** | Powder Blue | `#DCEBF5` (base) / `#B8D8EA` (solid) | Latar halaman, permukaan kartu, area peta terang, input field | Menciptakan kanvas tenang & bersih |
| **Sekunder (30%)** | Midnight Navy | `#0F1E3D` | Navbar, header, teks utama, bottom navigation, tema gelap Command Map, footer | Struktur, bobot, kepercayaan |
| **Aksen (10%)** | Sunflower Yellow | `#FFC914` | Tombol CTA utama, badge promo, pin "menunggu verifikasi", highlight pin usaha sendiri, rating bintang | Atensi & kehangatan — gunakan hemat |

> **Catatan 60-30-10:** porsi 60% bukan berarti powder blue pekat memenuhi layar — gunakan **tint paling muda** (`#DCEBF5`, `#EEF6FB`) sebagai latar luas, dan powder blue solid (`#B8D8EA`) untuk elemen sekunder. Navy mengisi ±30% berupa teks, bar, dan panel. Kuning maksimal ±10% — idealnya hanya 1–2 elemen kuning terlihat per layar.

### 3.2 Skala Warna (Token)

```
── Powder Blue (dominan) ──────────────────────────
blue-50   #F4FAFD   latar halaman, area kosong
blue-100  #EEF6FB   latar section alternatif
blue-200  #DCEBF5   permukaan kartu, bottom sheet
blue-300  #B8D8EA   border aktif, chip terpilih, hover
blue-400  #8FBEDC   ikon sekunder, ilustrasi

── Midnight Navy (sekunder) ───────────────────────
navy-500  #3A5680   teks sekunder, ikon non-aktif
navy-600  #24406B   link, tombol sekunder
navy-700  #16294F   navbar, header
navy-800  #0F1E3D   teks utama, tema Command Map
navy-900  #0A1428   latar gelap terdalam, overlay

── Sunflower Yellow (aksen) ───────────────────────
yellow-300 #FFE066  hover CTA, latar badge lembut
yellow-400 #FFD23F  rating bintang
yellow-500 #FFC914  CTA utama, badge promo, pin pending
yellow-600 #E6B000  CTA pressed/active
```

### 3.3 Warna Semantik

| Token | Hex | Penggunaan |
|-------|-----|------------|
| `success` | `#2E9E6B` | Usaha terverifikasi ✓, toast sukses |
| `danger` | `#E05252` | Usaha dilaporkan, tolak verifikasi, error |
| `warning` | `#FFC914` | Menunggu verifikasi (pakai yellow-500, konsisten) |
| `info` | `#4A90D9` | Pin kategori default, tips, tooltip |
| `surface-light` | `#FFFFFF` | Kartu di atas latar powder blue |
| `text-primary` | `#0F1E3D` | Teks utama (navy-800) |
| `text-secondary` | `#3A5680` | Teks pendukung (navy-500) |
| `text-on-navy` | `#F4FAFD` | Teks di atas navy |
| `text-on-yellow` | `#0F1E3D` | Teks di atas kuning — **selalu navy, jangan putih** |

### 3.4 Pemetaan 60-30-10 per Layar (contoh)

```
┌──────────────────────────────────────────┐
│ ████ NAVBAR — navy-700            (30%)  │
├──────────────────────────────────────────┤
│                                          │
│   PETA — basemap tint powder blue (60%)  │
│                                          │
│        📍 pin info/kategori              │
│             📍 pin promo ← yellow (10%)  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ BOTTOM SHEET — white/blue-200      │  │
│  │ Nama Usaha (navy-800)              │  │
│  │ ⭐ 4.8 (yellow-400) · Buka         │  │
│  │ [ Hubungi — tombol yellow-500 ]    │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│ ████ BOTTOM NAV — navy-800        (30%)  │
└──────────────────────────────────────────┘
```

---

## 4. Tipografi

| Level | Font | Ukuran / Berat | Penggunaan |
|-------|------|----------------|------------|
| Display | **Plus Jakarta Sans** | 32px / ExtraBold | Judul landing, angka statistik besar |
| H1 | Plus Jakarta Sans | 24px / Bold | Judul halaman |
| H2 | Plus Jakarta Sans | 20px / Bold | Judul section, nama usaha di detail |
| H3 | Plus Jakarta Sans | 16px / SemiBold | Judul kartu, nama usaha di list |
| Body | **Inter** | 14–16px / Regular | Teks umum, deskripsi |
| Caption | Inter | 12px / Medium | Label chip, jarak ("350 m"), timestamp |

- **Plus Jakarta Sans** dipilih karena karakternya modern-geometris, gratis (Google Fonts), dan **dibuat oleh desainer Indonesia** — selaras dengan identitas produk lokal.
- Ukuran teks minimum **12px**; body untuk pengguna seperti Bu Siti default **16px**.
- Line-height 1.5 untuk body, 1.2 untuk heading.

---

## 5. Fondasi Visual Lain

| Aspek | Aturan |
|-------|--------|
| **Radius** | Kartu & bottom sheet: 16px · Tombol & input: 12px · Chip: full (pill) · Pin callout: 12px |
| **Shadow** | Lembut & berwarna: `0 4px 16px rgba(15,30,61,0.10)` — bayangan bernuansa navy, bukan hitam pekat |
| **Spacing** | Skala 4px (4, 8, 12, 16, 24, 32, 48) |
| **Ikon** | Outline 1.5px (mis. Lucide/Phosphor), sudut membulat; terisi (filled) hanya untuk state aktif |
| **Target sentuh** | Minimum 44×44px |
| **Motion** | Durasi 150–250ms, easing `ease-out`; bottom sheet spring ringan; pin promo ber-*pulse* 2 detik sekali |

---

## 6. Komponen Inti

### 6.1 Tombol

| Varian | Latar | Teks | Penggunaan |
|--------|-------|------|------------|
| Primary | `yellow-500` | `navy-800` | CTA utama: "Daftarkan Usaha", "Hubungi via WA" |
| Secondary | `navy-700` | `blue-50` | Aksi penting kedua: "Lihat Rute" |
| Outline | transparan, border `navy-600` | `navy-600` | Aksi netral: "Batal", filter |
| Ghost | transparan | `navy-500` | Aksi minor di dalam kartu |

### 6.2 Pin Peta (sistem pin terpadu)

Semua pin memakai satu anatomi: **lingkaran berisi ikon kategori + ekor runcing + ring status**.

| Kondisi | Tampilan |
|---------|----------|
| Default (per kategori) | Lingkaran `info`/warna kategori, ikon putih (kuliner 🍜 oranye, jasa 🔧 biru, toko 🛒 teal, dst.) |
| Terverifikasi | Ring tipis `success` + check badge mini |
| Sedang promo | Ring `yellow-500` + animasi pulse |
| Favorit (konsumen) | Pin berbentuk hati `danger` lembut |
| Usaha sendiri (pelaku usaha) | Pin 1.5× lebih besar, glow kuning |
| Menunggu verifikasi (admin) | Pin `yellow-500` |
| Dilaporkan (admin) | Pin `danger` |
| Terpilih/aktif | Membesar 1.3× + callout nama usaha |

### 6.3 Kartu Usaha (bottom sheet & list)

```
┌─────────────────────────────────────┐
│ [foto 72×72, r12]  Warung Bu Siti   │  ← H3 navy-800
│                    ⭐ 4.8 (120) · 350 m
│                    🟢 Buka · Kuliner │  ← caption
│                    ┌──────────────┐ │
│                    │ PROMO 10% ✨ │ │  ← badge yellow-300
│                    └──────────────┘ │
│ [ Hubungi ]  [ Rute ]  [ ♡ ]        │
└─────────────────────────────────────┘
```

### 6.4 Chip Filter (melayang di atas peta)

- Pill, latar putih, border `blue-300`, teks `navy-600`.
- State terpilih: latar `navy-700`, teks putih.
- Berderet horizontal-scroll di bawah search bar: `Semua · Kuliner · Jasa · Toko · Buka Sekarang · Promo`.

---

## 7. Spesifikasi Peta per Role

> Keempat varian = **satu komponen peta** + tema & layer berbeda. Jangan membuat empat implementasi.

### 7.1 Guest — *Explore Map* 🔍

**Mood:** terbuka, mengundang, tanpa friksi.

| Elemen | Spesifikasi |
|--------|-------------|
| Basemap | Terang, desaturasi, tint powder blue (jalan `#FFFFFF`, area `#EEF6FB`, air `#B8D8EA`, taman hijau pudar) |
| Search bar | Mengambang atas, putih, radius 12, ikon kaca pembesar navy |
| Pin | Pin kategori standar; tanpa personalisasi |
| Interaksi | Tap pin → bottom sheet preview (foto, rating, jarak, status buka) |
| Gerbang login | Saat Guest tap ♡ / "Tulis Ulasan" → modal lembut "Masuk dulu yuk" dengan CTA kuning — **tidak pernah** memblokir eksplorasi |
| FAB | "📍 Sekitarku" (recenter), putih dengan ikon navy |

### 7.2 User Konsumen — *Personal Map* ❤️

**Mood:** milikku, hangat, relevan.

| Elemen | Spesifikasi |
|--------|-------------|
| Basemap | Sama dengan Explore Map |
| Pin tambahan | Favorit = pin hati; usaha berpromo = ring kuning pulse |
| Layer promo | Toggle "✨ Promo di sekitarku" — menyorot hanya pin promo, pin lain memudar 40% |
| Chip filter | + chip personal: `Favoritku`, `Pernah Kuulas` |
| Bottom sheet | + tombol ♡ aktif, riwayat ulasanku, tombol "Lapor info salah" |
| Avatar | Pojok kanan atas, membuka profil & daftar favorit |

### 7.3 User Pelaku Usaha — *Business Map* 📊

**Mood:** dashboard komandan usaha — bangga melihat usahanya "hidup" di peta.

| Elemen | Spesifikasi |
|--------|-------------|
| Basemap | Terang, namun area di luar radius jangkauan diberi overlay navy 15% — usaha terasa "punya wilayah" |
| Pin usaha sendiri | 1.5× ukuran normal, glow `yellow-500`, label nama selalu tampil |
| Radius jangkauan | Lingkaran isi `blue-300` 20%, garis putus navy — menunjukkan area pengguna yang melihat usahanya |
| Heatmap penonton | Toggle: gradasi powder blue → kuning menunjukkan asal lokasi pengunjung halaman |
| Panel statistik | Kartu mengambang bawah: 👁 kunjungan minggu ini · 🔍 muncul di pencarian · 📞 klik kontak — angka besar Plus Jakarta Sans ExtraBold navy |
| Aksi cepat | FAB kuning "➕ Pasang Promo"; status verifikasi tampil sebagai banner tipis di atas (kuning = menunggu, hijau = tayang) |

### 7.4 Admin — *Command Map* 🌙

**Mood:** pusat kendali — gelap, fokus, efisien.

| Elemen | Spesifikasi |
|--------|-------------|
| Basemap | **Dark mode** navy: latar `navy-900`, jalan `navy-700`, air `navy-800`, label teks `blue-400` |
| Pin status | 🟡 `yellow-500` menunggu verifikasi · 🔵 `info` tayang · 🔴 `danger` dilaporkan |
| Clustering | Lingkaran navy berisi angka putih; pecah saat zoom |
| Panel kiri (desktop) | Antrian verifikasi: daftar usaha pending terurut terlama; klik item → peta terbang ke pin |
| Aksi dari pin | Klik pin pending → side panel: data usaha + foto + tombol `Setujui` (success) / `Tolak + alasan` (danger) |
| Statistik atas | Bar ringkas: `⏳ 12 menunggu · ✅ 148 tayang · 🚩 3 dilaporkan` |
| Filter | Toggle per status & kategori; "hanya wilayah X" |

---

## 8. Aksesibilitas & Kontras

| Kombinasi | Rasio | Status |
|-----------|-------|--------|
| `navy-800` di atas putih | ≈ 15.4 : 1 | ✅ AAA |
| `navy-800` di atas `blue-50` | ≈ 14.5 : 1 | ✅ AAA |
| `navy-800` di atas `yellow-500` (CTA) | ≈ 9.6 : 1 | ✅ AAA |
| `blue-50` di atas `navy-700` (navbar) | ≈ 12.8 : 1 | ✅ AAA |
| `navy-500` di atas putih (teks sekunder) | ≈ 7.2 : 1 | ✅ AA |
| ⚠️ Putih di atas `yellow-500` | ≈ 1.6 : 1 | ❌ **Dilarang** |
| ⚠️ `yellow-500` di atas `blue-200` | ≈ 1.9 : 1 | ❌ Jangan untuk teks — hanya elemen grafis ber-outline |

Aturan tambahan:
- Status **tidak boleh** dikomunikasikan lewat warna saja — selalu sertai ikon/label (✓ Terverifikasi, ⏳ Menunggu).
- Fokus keyboard terlihat: outline 2px `yellow-500` offset 2px.
- Semua gambar usaha wajib `alt text` (nama usaha).

---

## 9. Do & Don't

| ✅ Do | ❌ Don't |
|-------|---------|
| Satu CTA kuning per layar | Dua tombol kuning bersaing di layar yang sama |
| Teks navy di atas kuning | Teks putih di atas kuning |
| Latar luas pakai tint muda (`blue-50/100/200`) | Powder blue solid memenuhi seluruh layar |
| Navy untuk teks & struktur | Navy pekat sebagai latar konten panjang di mode terang |
| Pin status admin konsisten (kuning/biru/merah) | Menambah warna pin baru tanpa memperbarui dokumen ini |
| Bayangan lembut bernuansa navy | Drop shadow hitam keras |
| Pulse halus hanya pada pin promo | Semua pin beranimasi bersamaan |

---

## 10. Referensi Implementasi

```css
:root {
  /* Powder Blue — dominan 60% */
  --blue-50:  #F4FAFD;
  --blue-100: #EEF6FB;
  --blue-200: #DCEBF5;
  --blue-300: #B8D8EA;
  --blue-400: #8FBEDC;

  /* Midnight Navy — sekunder 30% */
  --navy-500: #3A5680;
  --navy-600: #24406B;
  --navy-700: #16294F;
  --navy-800: #0F1E3D;
  --navy-900: #0A1428;

  /* Sunflower Yellow — aksen 10% */
  --yellow-300: #FFE066;
  --yellow-400: #FFD23F;
  --yellow-500: #FFC914;
  --yellow-600: #E6B000;

  /* Semantik */
  --success: #2E9E6B;
  --danger:  #E05252;
  --warning: var(--yellow-500);
  --info:    #4A90D9;

  --radius-card: 16px;
  --radius-control: 12px;
  --shadow-card: 0 4px 16px rgba(15, 30, 61, 0.10);
  --font-heading: "Plus Jakarta Sans", sans-serif;
  --font-body: "Inter", sans-serif;
}
```

---

*Design system ini adalah living document — setiap komponen/warna baru wajib didaftarkan di sini sebelum dipakai di produk.*
