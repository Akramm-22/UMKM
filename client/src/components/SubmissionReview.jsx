import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X, Store, User, MapPin, FileImage, ClipboardCheck, Clock, Phone,
  Tag, FileText, ExternalLink, Check, CircleAlert, TriangleAlert, IdCard, ImageOff, ZoomIn,
  BadgeCheck, Ban, CalendarDays, Hourglass, ShieldCheck, Globe, AtSign, Sparkles, Lock,
} from 'lucide-react';
import { CHECKLIST, REJECT_REASONS, waitedHours, fmtWaited } from '../lib/verification.js';
import { weeklyHours } from '../lib/place.js';
import { CATEGORY_OPTIONS, SERVICE_OPTIONS, PAYMENT_OPTIONS, AMENITY_OPTIONS, labelOf } from '../lib/businessForm.js';

const rupiah = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;

const PILOT_CENTER = [-6.2, 106.816666];

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:34px;height:34px;background:#FFC914;border:3px solid #0F1E3D;border-radius:50% 50% 50% 6px;
    transform:rotate(-45deg);box-shadow:0 6px 14px rgba(15,30,61,.35)"></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

const fmtDateTime = (iso) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const distanceKm = ([a, b], [c, d]) => {
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

// pemeriksaan otomatis untuk membantu admin; keputusan tetap manual
function autoFindings(s) {
  const out = [];
  const phoneOk = /^(\+?62|0)8\d{8,11}$/.test(String(s.phone ?? '').replace(/[\s-]/g, ''));
  if (!s.phone) out.push({ level: 'warn', text: 'Nomor WhatsApp usaha tidak diisi.' });
  else if (!phoneOk) out.push({ level: 'error', text: `Format nomor "${s.phone}" tidak valid.` });
  if (!s.address || s.address.trim().length < 15) out.push({ level: 'warn', text: 'Alamat terlalu singkat — sulit dicocokkan dengan pin.' });
  else if (s.address_detail && (!s.address_detail.kecamatan || !s.address_detail.kelurahan)) out.push({ level: 'warn', text: 'Kelurahan/kecamatan belum diisi.' });
  if (!s.open_hours || (typeof s.open_hours === 'string' && !s.open_hours.trim())) out.push({ level: 'warn', text: 'Jam buka belum diisi.' });
  if (!s.description || s.description.trim().length < 30) out.push({ level: 'warn', text: 'Deskripsi kurang dari 30 karakter.' });
  if (!s.subcategory) out.push({ level: 'warn', text: 'Jenis usaha (subkategori) belum diisi.' });
  const missing = (s.documents ?? []).filter((d) => d.required && !d.url);
  if (missing.length) out.push({ level: 'error', text: `Foto wajib belum dilampirkan: ${missing.map((d) => d.type).join(', ')}.` });
  if (!(s.documents ?? []).some((d) => d.private && (d.url || d.kind === 'ktp'))) out.push({ level: 'info', text: 'KTP pemilik tidak dilampirkan — cocokkan identitas lewat telepon.' });
  if (s.latitude != null && distanceKm(PILOT_CENTER, [s.latitude, s.longitude]) > 5) out.push({ level: 'error', text: 'Lokasi berada di luar radius wilayah pilot (> 5 km).' });
  if (s.owner?.since && (Date.now() - new Date(s.owner.since).getTime()) / 86400e3 < 3) out.push({ level: 'info', text: 'Akun pemilik baru dibuat < 3 hari lalu.' });
  if (!out.length) out.push({ level: 'ok', text: 'Tidak ada temuan otomatis. Tetap periksa manual.' });
  return out;
}

function Section({ icon: Icon, title, children, aside }) {
  return (
    <section className="bg-white border border-blue-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-blue-100 bg-blue-50/60">
        <Icon size={15} className="text-navy-600" />
        <p className="font-heading font-bold text-sm flex-1">{title}</p>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ label, children, empty }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 border-b border-blue-100 last:border-0 text-sm">
      <dt className="text-navy-500 text-xs pt-0.5">{label}</dt>
      <dd className={empty ? 'text-danger text-xs font-semibold pt-0.5' : 'text-navy-800 break-words'}>{empty ? 'Tidak diisi' : children}</dd>
    </div>
  );
}

function KtpPreview({ owner }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-info/30 to-blue-200 p-3 flex flex-col text-[9px] text-navy-800 font-mono">
      <p className="font-bold text-center text-[10px]">PROVINSI DKI JAKARTA</p>
      <div className="flex gap-2 mt-1.5 flex-1">
        <div className="flex-1 space-y-0.5">
          <p>NIK : {owner.nik ?? '—'}</p>
          <p>Nama: {owner.name}</p>
          <p className="text-navy-500">Data sensitif disamarkan</p>
        </div>
        <div className="w-10 h-12 bg-navy-500/30 rounded flex items-center justify-center"><User size={16} /></div>
      </div>
    </div>
  );
}

export default function SubmissionReview({ item, onClose, onDecide, sla, adminName }) {
  const s = item.submission;
  const [checks, setChecks] = useState({});
  const [mode, setMode] = useState('review');
  const [reasons, setReasons] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setChecks({});
    setMode('review');
    setReasons([]);
    setNote('');
    setError('');
    setLightbox(null);
  }, [item.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (lightbox) setLightbox(null);
      else if (mode !== 'review') setMode('review');
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, mode, onClose]);

  const findings = useMemo(() => autoFindings(s), [s]);
  const waited = waitedHours(s.submitted_at);
  const overSla = waited > sla;
  const doneCount = CHECKLIST.filter((c) => checks[c.key]).length;
  const allChecked = doneCount === CHECKLIST.length;
  const hours = weeklyHours(s.open_hours);
  const docs = s.documents ?? [];

  const submit = async (status) => {
    setError('');
    if (status === 'approved' && !allChecked) return setError('Lengkapi seluruh checklist pemeriksaan sebelum menyetujui.');
    if (status === 'rejected') {
      if (!reasons.length) return setError('Pilih minimal satu alasan penolakan.');
      if (note.trim().length < 15) return setError('Tulis catatan perbaikan minimal 15 karakter agar produsen tahu apa yang harus diperbaiki.');
    }
    setBusy(true);
    try {
      await onDecide(item, { status, reasons: status === 'rejected' ? reasons : [], note, checklist: checks, admin: adminName });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Keputusan gagal disimpan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-[1400] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-navy-900/50" onClick={onClose} aria-hidden="true" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Tinjau pengajuan ${item.name}`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-3xl h-full bg-blue-50 shadow-2xl flex flex-col"
      >
        {/* header */}
        <div className="shrink-0 bg-white border-b border-blue-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-navy-500">Tinjau Pengajuan</p>
              <h2 className="font-heading font-extrabold text-xl truncate mt-0.5">{item.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                <span className="bg-yellow-500/15 text-yellow-600 font-bold px-2 py-0.5 rounded-md">Menunggu verifikasi</span>
                <span className="flex items-center gap-1 text-navy-500"><CalendarDays size={12} /> Diajukan {fmtDateTime(s.submitted_at)}</span>
                <span className={`flex items-center gap-1 font-bold ${overSla ? 'text-danger' : 'text-navy-700'}`}>
                  <Hourglass size={12} /> Menunggu {fmtWaited(waited)}{overSla ? ` · lewat SLA ${sla} jam` : ` · sisa ${Math.max(1, Math.round(sla - waited))} jam`}
                </span>
                {item.source === 'local' && <span className="bg-blue-200 text-navy-600 font-bold px-2 py-0.5 rounded-md">Dari form (lokal)</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-blue-100 text-navy-500" aria-label="Tutup panel tinjauan"><X size={18} /></button>
          </div>
        </div>

        {/* isi */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* temuan otomatis */}
          <div className="bg-white border border-blue-200 rounded-2xl p-4">
            <p className="font-heading font-bold text-sm flex items-center gap-2"><ShieldCheck size={15} className="text-info" /> Temuan otomatis</p>
            <ul className="mt-2.5 space-y-1.5">
              {findings.map((f) => (
                <li key={f.text} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                  f.level === 'error' ? 'bg-danger/10 text-danger' : f.level === 'warn' ? 'bg-yellow-500/15 text-navy-800' : f.level === 'ok' ? 'bg-success/10 text-success' : 'bg-blue-100 text-navy-700'
                }`}>
                  {f.level === 'ok' ? <Check size={14} className="shrink-0" /> : f.level === 'error' ? <CircleAlert size={14} className="shrink-0" /> : <TriangleAlert size={14} className="shrink-0" />}
                  <span className="font-semibold">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Section icon={Store} title="Informasi Usaha">
              <dl>
                <Field label="Nama usaha">{s.name}</Field>
                <Field label="Kategori">
                  <span className="inline-flex items-center gap-1"><Tag size={12} className="text-navy-500" /> {labelOf(CATEGORY_OPTIONS.map((c) => [c.key, c.label]), String(s.category).toLowerCase())}</span>
                </Field>
                <Field label="Jenis usaha" empty={!s.subcategory}>{s.subcategory}</Field>
                <Field label="Deskripsi" empty={!s.description}>{s.description}</Field>
                <Field label="Berdiri sejak" empty={!s.established_year}>{s.established_year}</Field>
              </dl>
            </Section>

            <Section icon={Phone} title="Kontak & Jam Buka">
              <dl>
                <Field label="WhatsApp/telepon" empty={!s.phone}>
                  <a href={`https://wa.me/${String(s.phone).replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-info hover:underline">
                    <Phone size={12} /> {s.phone}
                  </a>
                </Field>
                {(s.website || s.instagram) && (
                  <Field label="Situs & sosial">
                    <span className="flex flex-col gap-0.5">
                      {s.website && <a href={s.website.startsWith('http') ? s.website : `https://${s.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-info hover:underline"><Globe size={12} /> {s.website}</a>}
                      {s.instagram && <a href={`https://${s.instagram.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-info hover:underline"><AtSign size={12} /> {s.instagram.replace(/^.*instagram\.com\//, '@')}</a>}
                    </span>
                  </Field>
                )}
                <Field label="Jam buka" empty={!hours}>
                  {hours && (
                    <ul className="space-y-0.5 text-xs">
                      {typeof s.open_hours === 'string'
                        ? <li>Setiap hari · {s.open_hours}</li>
                        : hours.map((h) => <li key={h.key} className="flex justify-between gap-3"><span className="text-navy-500">{h.label}</span><span>{h.text}</span></li>)}
                    </ul>
                  )}
                </Field>
              </dl>
            </Section>

            <Section icon={User} title="Identitas Produsen">
              <dl>
                <Field label="Nama pemilik">{s.owner?.name}</Field>
                <Field label="No. HP akun" empty={!s.owner?.phone}>{s.owner?.phone}</Field>
                <Field label="NIK (KTP)" empty={!s.owner?.nik}><span className="font-mono text-xs">{s.owner?.nik}</span></Field>
                <Field label="Akun dibuat" empty={!s.owner?.since}>{s.owner?.since && fmtDate(s.owner.since)}</Field>
                <Field label="Usaha lain" empty={s.owner?.businesses == null}>{s.owner?.businesses ? `${s.owner.businesses} usaha sudah tayang` : 'Belum ada — pengajuan pertama'}</Field>
              </dl>
            </Section>
          </div>

          <Section
            icon={MapPin}
            title="Alamat & Lokasi"
            aside={s.latitude != null && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-info hover:underline">
                Cek di Google Maps <ExternalLink size={11} />
              </a>
            )}
          >
            <dl className="mb-3">
              <Field label="Alamat lengkap" empty={!s.address}>{s.address}</Field>
              {s.address_detail && (
                <>
                  <Field label="Jalan & nomor" empty={!s.address_detail.street}>{s.address_detail.street}</Field>
                  <Field label="RT/RW" empty={!s.address_detail.rt_rw}>{s.address_detail.rt_rw}</Field>
                  <Field label="Kelurahan / Kec." empty={!s.address_detail.kelurahan && !s.address_detail.kecamatan}>{[s.address_detail.kelurahan, s.address_detail.kecamatan].filter(Boolean).join(' / ')}</Field>
                  <Field label="Kota / Provinsi">{[s.address_detail.kota, s.address_detail.provinsi, s.address_detail.postal_code].filter(Boolean).join(', ')}</Field>
                  {s.address_detail.landmark && <Field label="Patokan">{s.address_detail.landmark}</Field>}
                </>
              )}
              <Field label="Koordinat pin"><span className="font-mono text-xs">{s.latitude?.toFixed(6)}, {s.longitude?.toFixed(6)}</span></Field>
              <Field label="Jarak dari pusat">{distanceKm(PILOT_CENTER, [s.latitude, s.longitude]).toFixed(2)} km dari pusat wilayah pilot</Field>
            </dl>
            <div className="h-56 rounded-xl overflow-hidden border border-blue-200">
              <MapContainer key={item.id} center={[s.latitude, s.longitude]} zoom={17} scrollWheelZoom={false} className="h-full w-full">
                <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png" attribution='&copy; Stadia Maps &copy; OpenStreetMap' />
                <Marker position={[s.latitude, s.longitude]} icon={pinIcon} />
              </MapContainer>
            </div>
          </Section>

          <Section icon={FileImage} title={`Dokumen & Foto (${docs.filter((d) => d.url || d.kind === 'ktp').length}/${docs.length})`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {docs.map((d) => {
                const has = d.url || d.kind === 'ktp';
                return (
                  <figure key={d.type} className={`rounded-xl overflow-hidden border ${has ? 'border-blue-200' : 'border-dashed border-danger/50'}`}>
                    {d.url ? (
                      <button type="button" onClick={() => setLightbox(d)} className="relative block w-full aspect-[4/3] group" aria-label={`Perbesar ${d.type}`}>
                        <img src={d.url} alt={d.type} className="w-full h-full object-cover" />
                        {d.private && <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-navy-800/90 text-blue-50 text-[10px] font-bold px-1.5 py-0.5 rounded"><Lock size={10} /> Rahasia</span>}
                        <span className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/40 flex items-center justify-center transition-colors">
                          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </button>
                    ) : d.kind === 'ktp' ? (
                      <button type="button" onClick={() => setLightbox(d)} className="block w-full aspect-[4/3]" aria-label="Perbesar KTP pemilik"><KtpPreview owner={s.owner} /></button>
                    ) : (
                      <div className="w-full aspect-[4/3] bg-danger/5 flex flex-col items-center justify-center text-danger">
                        <ImageOff size={20} />
                        <span className="text-[11px] font-bold mt-1">Tidak dilampirkan</span>
                      </div>
                    )}
                    <figcaption className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold bg-white">
                      {d.private ? <IdCard size={12} className="text-navy-500" /> : <FileText size={12} className="text-navy-500" />}
                      <span className="flex-1 truncate">{d.type}{d.required && <span className="text-danger"> *</span>}</span>
                      {has ? <Check size={12} className="text-success" /> : <X size={12} className={d.required ? 'text-danger' : 'text-navy-500'} />}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            <p className="text-[11px] text-navy-500 mt-2.5">* wajib dari produsen. KTP hanya terlihat oleh admin dan tidak pernah ditampilkan ke konsumen.</p>
          </Section>

          <Section icon={Sparkles} title="Detail Tambahan">
            <dl>
              <Field label="Kisaran harga" empty={!s.price_range}>{s.price_range && `${rupiah(s.price_range.min)}–${rupiah(s.price_range.max).replace('Rp', '')} per orang`}</Field>
              <Field label="Opsi layanan" empty={!s.services || !Object.keys(s.services).length}>
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {Object.entries(s.services ?? {}).map(([k, v]) => (
                    <span key={k} className={`flex items-center gap-1 ${v ? '' : 'text-navy-500 line-through'}`}>
                      {v ? <Check size={12} className="text-success" /> : <X size={12} />} {labelOf(SERVICE_OPTIONS[String(s.category).toLowerCase()] ?? [], k)}
                    </span>
                  ))}
                </span>
              </Field>
              <Field label="Pembayaran" empty={!s.payments?.length}>{s.payments?.map((k) => labelOf(PAYMENT_OPTIONS, k)).join(', ')}</Field>
              <Field label="Fasilitas" empty={!s.amenities?.length}>{s.amenities?.map((k) => labelOf(AMENITY_OPTIONS, k)).join(', ')}</Field>
              <Field label={`Menu (${s.menu?.length ?? 0})`} empty={!s.menu?.length}>
                <ul className="space-y-1 text-xs">
                  {s.menu?.map((m) => (
                    <li key={m.name} className="flex justify-between gap-3">
                      <span>{m.name}{m.desc && <span className="text-navy-500"> · {m.desc}</span>}</span>
                      <span className="font-semibold shrink-0">{m.price != null ? rupiah(m.price) : '—'}</span>
                    </li>
                  ))}
                </ul>
              </Field>
            </dl>
          </Section>

          <Section icon={ClipboardCheck} title="Checklist Pemeriksaan" aside={<span className={`text-[11px] font-bold ${allChecked ? 'text-success' : 'text-navy-500'}`}>{doneCount}/{CHECKLIST.length}</span>}>
            <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden mb-3">
              <motion.div animate={{ width: `${(doneCount / CHECKLIST.length) * 100}%` }} className={`h-full rounded-full ${allChecked ? 'bg-success' : 'bg-yellow-500'}`} />
            </div>
            <div className="space-y-1.5">
              {CHECKLIST.map((c) => (
                <label key={c.key} className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 cursor-pointer text-sm transition-colors ${checks[c.key] ? 'border-success/50 bg-success/5' : 'border-blue-200 hover:border-navy-500 bg-white'}`}>
                  <input type="checkbox" checked={!!checks[c.key]} onChange={(e) => setChecks((v) => ({ ...v, [c.key]: e.target.checked }))} className="w-4 h-4 accent-success" />
                  {c.label}
                </label>
              ))}
            </div>
          </Section>

          {/* form penolakan */}
          <AnimatePresence>
            {mode === 'reject' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} id="reject-form">
                <Section icon={Ban} title="Alasan Penolakan">
                  <p className="text-xs text-navy-500 mb-2.5">Alasan & catatan ini dikirim ke produsen agar ia tahu bagian mana yang perlu diperbaiki sebelum mengajukan ulang.</p>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {REJECT_REASONS.map((r) => (
                      <label key={r.key} className={`flex items-center gap-2.5 border rounded-xl px-3 py-2.5 cursor-pointer text-sm transition-colors ${reasons.includes(r.key) ? 'border-danger bg-danger/5' : 'border-blue-200 hover:border-navy-500 bg-white'}`}>
                        <input
                          type="checkbox"
                          checked={reasons.includes(r.key)}
                          onChange={(e) => setReasons((v) => (e.target.checked ? [...v, r.key] : v.filter((k) => k !== r.key)))}
                          className="w-4 h-4 accent-danger"
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                  <label htmlFor="reject-note" className="block text-xs font-bold text-navy-800 mt-3">Catatan perbaikan untuk produsen</label>
                  <textarea
                    id="reject-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 600))}
                    rows={4}
                    placeholder="cth. Foto tempat usaha buram dan pin berada 300 m dari alamat. Unggah foto tampak depan yang jelas lalu geser pin ke depan rumah."
                    className="w-full mt-1.5 bg-white border border-blue-200 focus:border-navy-600 rounded-xl px-3 py-2.5 text-sm outline-none resize-none transition-colors"
                  />
                  <p className="text-[11px] text-navy-500 text-right">{note.length}/600</p>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* footer keputusan */}
        <div className="shrink-0 bg-white border-t border-blue-200 px-5 py-3.5">
          {error && <p className="flex items-start gap-1.5 text-xs font-semibold text-danger mb-2.5"><CircleAlert size={14} className="shrink-0 mt-0.5" /> {error}</p>}
          {mode === 'review' && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-navy-500 mr-auto flex items-center gap-1.5">
                <Clock size={13} /> {allChecked ? 'Pemeriksaan lengkap — siap diputuskan.' : `Centang checklist (${doneCount}/${CHECKLIST.length}) untuk menyetujui.`}
              </p>
              <button type="button" onClick={() => { setMode('reject'); setError(''); setTimeout(() => document.getElementById('reject-note')?.focus(), 250); }} className="flex items-center gap-1.5 bg-white border border-blue-300 hover:border-danger hover:text-danger text-navy-700 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
                <X size={15} /> Tolak…
              </button>
              <button type="button" onClick={() => submit('approved')} disabled={busy} aria-disabled={!allChecked} className={`flex items-center gap-1.5 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all ${allChecked ? 'bg-success hover:brightness-110' : 'bg-success/40 cursor-not-allowed'}`}>
                <BadgeCheck size={15} /> {busy ? 'Menyimpan…' : 'Setujui & Tayangkan'}
              </button>
            </div>
          )}
          {mode === 'reject' && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-navy-500 mr-auto">{reasons.length} alasan dipilih</p>
              <button type="button" onClick={() => { setMode('review'); setError(''); }} className="text-sm font-bold text-navy-600 hover:text-navy-900 px-4 py-2.5 rounded-xl transition-colors">Batal</button>
              <button type="button" onClick={() => submit('rejected')} disabled={busy} className="flex items-center gap-1.5 bg-danger hover:brightness-110 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all">
                <Ban size={15} /> {busy ? 'Menyimpan…' : 'Kirim Penolakan'}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* pratinjau dokumen */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1500] bg-navy-900/90 flex flex-col items-center justify-center p-6" onClick={() => setLightbox(null)}>
            <button type="button" onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Tutup pratinjau"><X size={20} /></button>
            <div onClick={(e) => e.stopPropagation()} className="max-w-3xl w-full">
              {lightbox.kind === 'ktp' ? (
                <div className="aspect-[1.6] max-w-lg mx-auto rounded-2xl overflow-hidden"><KtpPreview owner={s.owner} /></div>
              ) : (
                <img src={lightbox.url.startsWith('http') ? lightbox.url.replace(/w=\d+/, 'w=1600') : lightbox.url} alt={lightbox.type} className="max-h-[80vh] mx-auto rounded-xl object-contain" />
              )}
              <p className="text-center text-blue-50 text-sm font-semibold mt-3">{lightbox.type} · {item.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
