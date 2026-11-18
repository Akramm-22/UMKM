import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, Check, CircleAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthSidePanel } from './Login.jsx';

const validators = {
  name: (v) => (v.trim().length < 3 ? 'Nama minimal 3 huruf' : null),
  phone: (v) => (!/^08\d{8,11}$/.test(v.trim()) ? 'Gunakan format 08xxxxxxxxxx (10–13 digit)' : null),
  password: (v) => (v.length < 8 ? 'Password minimal 8 karakter' : null),
  confirm: (v, f) => (v !== f.password ? 'Password tidak sama' : null),
};

// skor kekuatan password 0–4 untuk meter
const pwScore = (v) => [v.length >= 8, /[A-Z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v) || v.length >= 12].filter(Boolean).length;
const PW_LEVELS = [
  { label: 'Terlalu pendek', cls: 'bg-danger', text: 'text-danger' },
  { label: 'Lemah', cls: 'bg-danger', text: 'text-danger' },
  { label: 'Cukup', cls: 'bg-yellow-500', text: 'text-yellow-600' },
  { label: 'Kuat', cls: 'bg-success', text: 'text-success' },
  { label: 'Sangat kuat', cls: 'bg-success', text: 'text-success' },
];

// input berlabel dengan status error / valid
function Field({ label, error, valid, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-navy-700 mb-1.5">{label}</label>
      <div
        className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors ${
          error
            ? 'bg-danger/5 border-danger'
            : valid
              ? 'bg-blue-50 border-success/60'
              : 'bg-blue-50 border-transparent focus-within:border-navy-600 focus-within:bg-white'
        }`}
      >
        {children}
        {valid && !error && <Check size={15} className="text-success shrink-0" />}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-[11px] font-semibold text-danger mt-1.5"
          >
            <CircleAlert size={11} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const STEPS = ['Data Diri', 'Keamanan'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const touch = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const errOf = (k) => validators[k](form[k], form);
  const showErr = (k) => (touched[k] ? errOf(k) : null);
  const validOf = (k) => touched[k] && !errOf(k) && form[k];

  const stepFields = step === 0 ? ['name', 'phone'] : ['password', 'confirm'];
  const stepValid = stepFields.every((k) => !errOf(k));

  const next = () => {
    setTouched((t) => ({ ...t, name: true, phone: true }));
    if (!validators.name(form.name) && !validators.phone(form.phone)) setStep(1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setTouched((t) => ({ ...t, password: true, confirm: true }));
    if (!stepValid || !agree) return;
    setLoading(true);
    try {
      await register(form.name, form.phone, form.password);
      navigate('/explore');
    } catch (err) {
      setServerError(err.response?.data?.message ?? 'Server tidak terhubung — gunakan mode demo di halaman Masuk');
    } finally {
      setLoading(false);
    }
  };

  const score = pwScore(form.password);

  return (
    <div className="h-screen overflow-hidden bg-blue-100 bg-dots flex items-center justify-center p-4 font-body">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-5xl h-full max-h-[760px] bg-white rounded-[2rem] shadow-2xl shadow-navy-800/15 grid lg:grid-cols-2 overflow-hidden"
      >
        <AuthSidePanel
          title="Usahamu layak ditemukan tetangga."
          subtitle="Daftar 10 menit, diverifikasi admin ≤ 24 jam, tayang di peta — gratis selamanya untuk UMKM mikro."
        />

        {/* form kanan */}
        <div className="p-8 sm:p-10 flex flex-col justify-center overflow-y-auto no-scrollbar">
          <Link to="/" className="flex items-center justify-center gap-2 font-heading font-extrabold text-xl text-navy-800">
            <span className="bg-navy-800 text-yellow-500 p-2 rounded-full"><MapPin size={18} /></span>
            PesanLokal<span className="text-yellow-500">.</span>
          </Link>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-navy-800 text-center mt-4">Buat Akun Baru</h1>
          <p className="text-navy-500 text-sm text-center mt-1.5">Satu akun untuk mencari & mendaftarkan usaha</p>

          {/* indikator langkah */}
          <div className="flex items-center gap-2 mt-6 max-w-xs mx-auto w-full">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-colors ${
                      i < step ? 'bg-success text-white' : i === step ? 'bg-navy-800 text-yellow-500' : 'bg-blue-100 text-navy-500'
                    }`}
                  >
                    {i < step ? <Check size={13} /> : i + 1}
                  </span>
                  <span className={`text-[11px] font-bold ${i === step ? 'text-navy-800' : 'text-navy-500'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-1 bg-blue-100 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: step > i ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="h-full bg-success rounded-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6">
            <AnimatePresence mode="wait">
              {step === 0 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <Field label="Nama Lengkap" error={showErr('name')} valid={validOf('name')}>
                    <User size={17} className="text-navy-500 shrink-0" />
                    <input
                      value={form.name}
                      onChange={set('name')}
                      onBlur={touch('name')}
                      placeholder="cth. Siti Aminah"
                      autoComplete="name"
                      className="w-full outline-none text-navy-800 placeholder:text-navy-500/50 bg-transparent text-sm"
                    />
                  </Field>
                  <Field label="Nomor HP (WhatsApp aktif)" error={showErr('phone')} valid={validOf('phone')}>
                    <Phone size={17} className="text-navy-500 shrink-0" />
                    <input
                      value={form.phone}
                      onChange={set('phone')}
                      onBlur={touch('phone')}
                      placeholder="08xxxxxxxxxx"
                      inputMode="numeric"
                      autoComplete="tel"
                      className="w-full outline-none text-navy-800 placeholder:text-navy-500/50 bg-transparent text-sm"
                    />
                  </Field>
                  <motion.button
                    type="button"
                    onClick={next}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 text-blue-50 font-heading font-bold py-3.5 rounded-xl shadow-lg shadow-navy-800/20 transition-colors !mt-6"
                  >
                    Lanjut <ArrowRight size={17} />
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div>
                    <Field label="Password" error={showErr('password')} valid={validOf('password')}>
                      <Lock size={17} className="text-navy-500 shrink-0" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={set('password')}
                        onBlur={touch('password')}
                        placeholder="Min. 8 karakter"
                        autoComplete="new-password"
                        className="w-full outline-none text-navy-800 placeholder:text-navy-500/50 bg-transparent text-sm"
                      />
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="text-navy-500 hover:text-navy-800 transition-colors shrink-0" aria-label="Tampilkan password">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </Field>
                    {form.password && (
                      <div className="mt-2">
                        <div className="flex gap-1.5">
                          {[0, 1, 2, 3].map((i) => (
                            <motion.span
                              key={i}
                              animate={{ opacity: 1 }}
                              className={`h-1 flex-1 rounded-full transition-colors ${i < score ? PW_LEVELS[score].cls : 'bg-blue-200'}`}
                            />
                          ))}
                        </div>
                        <p className={`text-[10px] font-bold mt-1 ${PW_LEVELS[score].text}`}>{PW_LEVELS[score].label}</p>
                      </div>
                    )}
                  </div>
                  <Field label="Konfirmasi Password" error={showErr('confirm')} valid={validOf('confirm')}>
                    <ShieldCheck size={17} className="text-navy-500 shrink-0" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.confirm}
                      onChange={set('confirm')}
                      onBlur={touch('confirm')}
                      placeholder="Ulangi password"
                      autoComplete="new-password"
                      className="w-full outline-none text-navy-800 placeholder:text-navy-500/50 bg-transparent text-sm"
                    />
                  </Field>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={agree}
                      onClick={() => setAgree((v) => !v)}
                      className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                        agree ? 'bg-navy-800 border-navy-800 text-yellow-500' : 'border-blue-300 bg-white'
                      }`}
                    >
                      {agree && <Check size={11} strokeWidth={3.5} />}
                    </button>
                    <span className="text-[11px] text-navy-500 leading-relaxed" onClick={() => setAgree((v) => !v)}>
                      Saya setuju dengan <span className="font-bold text-navy-800">Syarat & Ketentuan</span> dan data usaha saya ditinjau admin sebelum tayang.
                    </span>
                  </label>

                  {serverError && <p className="text-danger text-xs font-semibold bg-danger/10 rounded-lg px-3 py-2.5">{serverError}</p>}

                  <div className="flex gap-2.5 !mt-6">
                    <motion.button
                      type="button"
                      onClick={() => setStep(0)}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-navy-700 font-heading font-bold text-sm px-4 py-3.5 rounded-xl transition-colors"
                    >
                      <ArrowLeft size={15} /> Kembali
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={loading || !agree}
                      whileHover={{ scale: agree ? 1.02 : 1 }}
                      whileTap={{ scale: agree ? 0.97 : 1 }}
                      className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-800 font-heading font-bold py-3.5 rounded-xl shadow-lg shadow-yellow-500/25 transition-colors"
                    >
                      {loading ? 'Memproses…' : 'Buat Akun'} <ArrowRight size={17} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <p className="text-sm text-navy-500 text-center mt-6">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-bold text-navy-800 hover:text-yellow-600 transition-colors">Masuk</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
