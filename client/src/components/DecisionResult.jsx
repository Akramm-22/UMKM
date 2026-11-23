import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Check, X, MapPin, Clock, UserCheck, ArrowRight, MessageSquareWarning, ListChecks } from 'lucide-react';
import { reasonText } from '../lib/verification.js';

const placeId = (item) => (item.source === 'local' ? `local-${item.localId}` : item.source === 'api' ? item.apiId : `sub-${item.id}`);

// pop-up hasil keputusan verifikasi: status jelas + ringkasan apa yang terjadi selanjutnya
export default function DecisionResult({ result, nextCount, onNext, onClose }) {
  const { entry, item } = result;
  const ok = entry.status === 'approved';
  const photo = item.submission?.photos?.front ?? item.submission?.photo_url;
  const at = new Date(entry.at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[1600] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-navy-900/55 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        aria-describedby="decision-desc"
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* kepala berwarna sesuai keputusan */}
        <div className={`relative px-6 pt-8 pb-6 text-center ${ok ? 'bg-gradient-to-b from-success/15 to-white' : 'bg-gradient-to-b from-danger/12 to-white'}`}>
          <div className="relative mx-auto w-20 h-20">
            <motion.span
              className={`absolute inset-0 rounded-full ${ok ? 'bg-success/25' : 'bg-danger/20'}`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1.35, 1.2], opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.1, delay: 0.15 }}
              aria-hidden="true"
            />
            <motion.span
              className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg ${ok ? 'bg-success shadow-success/40' : 'bg-danger shadow-danger/40'}`}
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.05 }}
            >
              {ok ? <Check size={40} strokeWidth={3} /> : <X size={40} strokeWidth={3} />}
            </motion.span>
          </div>
          <span className={`inline-flex items-center gap-1.5 mt-5 text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${ok ? 'bg-success/15 text-success' : 'bg-danger/10 text-danger'}`}>
            Status: {ok ? 'Disetujui · Tayang' : 'Ditolak · Perlu perbaikan'}
          </span>
          <h2 id="decision-title" className="font-heading font-extrabold text-xl text-navy-800 mt-3">
            {ok ? 'Pengajuan berhasil diverifikasi' : 'Pengajuan telah ditolak'}
          </h2>
          <p id="decision-desc" className="text-sm text-navy-500 mt-1.5 leading-relaxed">
            {ok
              ? 'Usaha ini sekarang tampil di peta konsumen dan dapat ditemukan lewat pencarian.'
              : 'Catatan perbaikan sudah dikirim ke pemilik. Mereka bisa memperbaiki data lalu mengajukan ulang.'}
          </p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* ringkasan usaha */}
          <div className="flex items-center gap-3 rounded-2xl border border-blue-200 p-3">
            {photo ? <img src={photo} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" /> : <span className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><MapPin size={18} className="text-navy-500" /></span>}
            <div className="min-w-0 flex-1">
              <p className="font-heading font-bold text-sm text-navy-800 truncate">{entry.name}</p>
              <p className="text-xs text-navy-500 truncate">Pemilik: {entry.owner ?? '—'}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-blue-50 px-3 py-2">
              <dt className="flex items-center gap-1 text-navy-500"><Clock size={12} /> Diputuskan</dt>
              <dd className="font-semibold text-navy-800 mt-0.5">{at}</dd>
            </div>
            <div className="rounded-xl bg-blue-50 px-3 py-2">
              <dt className="flex items-center gap-1 text-navy-500"><UserCheck size={12} /> Oleh</dt>
              <dd className="font-semibold text-navy-800 mt-0.5 truncate">{entry.admin ?? 'Admin'}</dd>
            </div>
          </dl>

          {ok ? (
            <p className="flex items-start gap-2 text-xs text-navy-700 bg-success/5 border border-success/20 rounded-xl px-3 py-2.5">
              <ListChecks size={14} className="text-success shrink-0 mt-0.5" /> Seluruh checklist pemeriksaan terpenuhi dan tercatat di riwayat verifikasi.
            </p>
          ) : (
            <div className="text-xs bg-danger/5 border border-danger/20 rounded-xl px-3 py-2.5">
              <p className="flex items-center gap-1.5 font-bold text-danger"><MessageSquareWarning size={13} /> Alasan penolakan</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {reasonText(entry.reasons).map((r) => <li key={r} className="bg-white border border-danger/20 text-navy-700 px-2 py-0.5 rounded-full">{r}</li>)}
              </ul>
              {entry.note && <p className="text-navy-700 mt-2 leading-relaxed">“{entry.note}”</p>}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            {ok ? (
              <Link to={`/explore?usaha=${encodeURIComponent(placeId(item))}`} className="flex-1 flex items-center justify-center gap-1.5 border border-blue-300 hover:bg-blue-50 text-navy-700 text-sm font-bold py-2.5 rounded-xl transition-colors">
                <MapPin size={15} /> Lihat di peta
              </Link>
            ) : (
              <button type="button" onClick={onClose} className="flex-1 border border-blue-300 hover:bg-blue-50 text-navy-700 text-sm font-bold py-2.5 rounded-xl transition-colors">Tutup</button>
            )}
            {nextCount > 0 ? (
              <button type="button" autoFocus onClick={onNext} className="flex-1 flex items-center justify-center gap-1.5 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-bold py-2.5 rounded-xl transition-colors">
                Tinjau berikutnya ({nextCount}) <ArrowRight size={15} />
              </button>
            ) : (
              <button type="button" autoFocus onClick={onClose} className="flex-1 bg-navy-800 hover:bg-navy-700 text-blue-50 text-sm font-bold py-2.5 rounded-xl transition-colors">
                {ok ? 'Selesai' : 'Kembali ke antrean'}
              </button>
            )}
          </div>
          {nextCount === 0 && <p className="text-center text-[11px] text-navy-500">Antrean verifikasi sudah kosong. 🎉</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
