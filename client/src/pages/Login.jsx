import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Phone, Lock, Eye, EyeOff, ArrowRight, Users, Store, ShieldCheck } from 'lucide-react';
import { useAuth, DUMMY_ACCOUNTS } from '../context/AuthContext.jsx';
import BackButton from '../components/BackButton.jsx';

const IMG = (id, w = 640) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

const DEMO_ROLES = [
  { key: 'konsumen', icon: Users, label: 'Konsumen', to: '/explore' },
  { key: 'pelaku', icon: Store, label: 'Pelaku Usaha', to: '/dashboard' },
  { key: 'admin', icon: ShieldCheck, label: 'Admin', to: '/admin' },
];

// panel kiri — ilustrasi flat ala referensi, dipakai juga oleh halaman Register
export function AuthSidePanel({ title, subtitle }) {
  return (
    <div className="relative hidden lg:flex flex-col bg-blue-100 bg-dots rounded-3xl m-3 p-9 overflow-hidden">
      <div className="blob-morph absolute -top-16 -right-16 w-64 h-64 bg-yellow-500/25 pointer-events-none" aria-hidden="true" />
      <div className="blob-morph-slow absolute -bottom-20 -left-16 w-72 h-72 bg-blue-300/40 pointer-events-none" aria-hidden="true" />

      <h2 className="relative font-heading font-extrabold text-2xl xl:text-3xl text-navy-800 leading-snug">{title}</h2>
      <p className="relative text-navy-500 mt-2.5 text-sm leading-relaxed max-w-xs">{subtitle}</p>

      {/* ilustrasi: orang berjalan memegang HP + pin lokasi besar */}
      <div className="relative flex-1 min-h-0 mt-4 flex items-end justify-center">
        {/* skyline kota */}
        <svg viewBox="0 0 400 120" className="absolute bottom-0 inset-x-0 w-full" aria-hidden="true">
          <rect x="10" y="40" width="52" height="80" rx="4" fill="#B8D8EA" opacity="0.55" />
          <rect x="72" y="18" width="62" height="102" rx="4" fill="#B8D8EA" opacity="0.4" />
          <rect x="258" y="30" width="58" height="90" rx="4" fill="#B8D8EA" opacity="0.5" />
          <rect x="326" y="55" width="62" height="65" rx="4" fill="#B8D8EA" opacity="0.4" />
          {[0, 1, 2].map((r) =>
            [0, 1].map((c) => (
              <rect key={`${r}-${c}`} x={84 + c * 22} y={32 + r * 24} width="12" height="12" rx="2" fill="#EEF6FB" />
            ))
          )}
          <rect x="0" y="116" width="400" height="4" rx="2" fill="#8FBEDC" opacity="0.6" />
        </svg>

        {/* karakter flat berjalan sambil menatap HP — pin & makanan di atas HP */}
        <div className="relative">
          {/* klaster pin lokasi + foto makanan, tepat di atas HP */}
          <div className="absolute -top-10 left-[78%] -translate-x-1/2 z-10 flex items-end gap-2" aria-hidden="true">
            <img src={IMG('photo-1529563021893-cc83c992d75d', 160)} alt="Sate" className="animate-float-delay w-12 h-12 object-cover rounded-full border-4 border-white shadow-lg mb-1" />
            <div className="animate-float">
              <div
                className="w-16 h-16 bg-navy-800 border-4 border-white -rotate-45 shadow-2xl shadow-navy-800/40 flex items-center justify-center"
                style={{ borderRadius: '50% 50% 50% 8px' }}
              >
                <div className="w-6 h-6 bg-yellow-500 rounded-full rotate-45" />
              </div>
            </div>
            <img src={IMG('photo-1512058564366-18510be2db19', 160)} alt="Nasi" className="animate-float-slow w-10 h-10 object-cover rounded-full border-4 border-white shadow-lg mb-1" />
          </div>

          <svg viewBox="0 0 220 240" className="relative w-56 xl:w-64 drop-shadow-xl" aria-hidden="true">
            {/* kepala menunduk menatap HP */}
            <circle cx="128" cy="50" r="17" fill="#F2BC94" />
            <path d="M111 50 q-2 -20 17 -20 q17 0 19 14 q1 6 -5 8 q-1 -11 -14 -11 q-14 0 -15 13 z" fill="#0F1E3D" />
            <path d="M111 50 q0 8 5 12 l4 -8 q-5 0 -9 -4 z" fill="#0F1E3D" />
            {/* badan kaos kuning condong ke depan */}
            <path d="M110 64 q17 -8 33 0 l-2 56 q-17 7 -34 0 z" fill="#FFC914" />
            {/* lengan depan memegang HP */}
            <path d="M134 76 q12 6 18 16" stroke="#FFC914" strokeWidth="13" fill="none" strokeLinecap="round" />
            <path d="M152 92 q8 4 14 6" stroke="#F2BC94" strokeWidth="9" fill="none" strokeLinecap="round" />
            {/* HP */}
            <rect x="162" y="80" width="13" height="22" rx="3.5" fill="#16294F" transform="rotate(18 168 91)" />
            <rect x="164.5" y="83" width="8" height="13" rx="1.5" fill="#4A90D9" transform="rotate(18 168 91)" />
            <circle cx="166" cy="99" r="5.5" fill="#F2BC94" />
            {/* lengan belakang */}
            <path d="M116 78 q-6 16 2 28" stroke="#FFC914" strokeWidth="12" fill="none" strokeLinecap="round" />
            <circle cx="119" cy="109" r="5.5" fill="#F2BC94" />
            {/* kaki melangkah lebar */}
            <path d="M119 118 q-16 36 -42 80" stroke="#16294F" strokeWidth="15" fill="none" strokeLinecap="round" />
            <path d="M130 118 q18 34 28 84" stroke="#16294F" strokeWidth="15" fill="none" strokeLinecap="round" />
            {/* sepatu */}
            <ellipse cx="72" cy="203" rx="13" ry="6" fill="#fff" stroke="#0F1E3D" strokeWidth="2.5" />
            <ellipse cx="162" cy="207" rx="13" ry="6" fill="#fff" stroke="#0F1E3D" strokeWidth="2.5" />
          </svg>
        </div>
      </div>

      <div className="relative flex items-center gap-6 mt-5 pt-5 border-t border-blue-300/60">
        {[
          { n: '177+', l: 'Usaha tayang' },
          { n: '0%', l: 'Komisi' },
          { n: '4.8', l: 'Rating' },
        ].map((s) => (
          <div key={s.l}>
            <p className="font-heading font-extrabold text-xl text-navy-800">{s.n}</p>
            <p className="text-[11px] text-navy-500">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(phone, password);
      navigate(u.landing ?? (u.role === 'admin' ? '/admin' : '/explore'), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Nomor HP atau password salah — coba akun uji di bawah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh overflow-hidden bg-blue-100 bg-dots flex items-center justify-center p-3 sm:p-4 font-body">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-5xl h-full max-h-[760px] bg-white rounded-[2rem] shadow-2xl shadow-navy-800/15 grid lg:grid-cols-2 overflow-hidden"
      >
        <AuthSidePanel
          title="Promosikan usahamu, temukan warung sekitar."
          subtitle="Satu peta untuk semua usaha lokal — informasi akurat langsung dari pemiliknya."
        />

        {/* form kanan */}
        <div className="p-6 sm:p-10 flex flex-col [justify-content:safe_center] overflow-y-auto no-scrollbar">
          <BackButton fallback="/" variant="ghost" className="self-start -ml-2 -mt-2 mb-2" />
          <Link to="/" className="flex items-center justify-center gap-2 font-heading font-extrabold text-xl text-navy-800">
            <span className="bg-navy-800 text-yellow-500 p-2 rounded-full"><MapPin size={18} /></span>
            <span>PesanLokal<span className="text-yellow-500">.</span></span>
          </Link>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-navy-800 text-center mt-5">Selamat Datang 👋</h1>
          <p className="text-navy-500 text-sm text-center mt-1.5">Silakan masuk ke akunmu</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label htmlFor="login-phone" className="block text-xs font-bold text-navy-700">Nomor HP</label>
            <div className="flex items-center gap-3 bg-blue-50 border border-transparent focus-within:border-navy-600 focus-within:bg-white rounded-xl px-4 py-3.5 transition-colors">
              <Phone size={18} className="text-navy-500 shrink-0" />
              <input
                id="login-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nomor HP"
                autoComplete="tel"
                className="w-full outline-none text-navy-800 placeholder:text-navy-500/60 bg-transparent text-sm"
              />
            </div>

            <label htmlFor="login-password" className="block text-xs font-bold text-navy-700">Password</label>
            <div className="flex items-center gap-3 bg-blue-50 border border-transparent focus-within:border-navy-600 focus-within:bg-white rounded-xl px-4 py-3.5 transition-colors">
              <Lock size={18} className="text-navy-500 shrink-0" />
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full outline-none text-navy-800 placeholder:text-navy-500/60 bg-transparent text-sm"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="text-navy-500 hover:text-navy-800 transition-colors p-2 -m-2 rounded-lg" aria-label="Tampilkan password">
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <div className="text-right">
              <a href="#" className="text-xs font-semibold text-navy-500 hover:text-navy-800 transition-colors">Lupa Password?</a>
            </div>

            {error && <p className="text-danger text-sm bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-navy-800 font-heading font-bold py-3.5 rounded-xl shadow-lg shadow-yellow-500/25 transition-colors"
            >
              {loading ? 'Memproses…' : 'Masuk'} <ArrowRight size={17} />
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-blue-200" />
            <span className="text-xs text-navy-500 font-medium">akun uji per role — klik untuk isi otomatis</span>
            <div className="flex-1 h-px bg-blue-200" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DEMO_ROLES.map((r) => {
              const acc = DUMMY_ACCOUNTS.find((a) => a.label === r.label);
              const selected = phone === acc.phone;
              return (
                <motion.button
                  key={r.key}
                  type="button"
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setPhone(acc.phone); setPassword(acc.password); setError(null); }}
                  className={`flex flex-col items-center gap-1 border rounded-xl py-3 px-1 text-xs font-semibold transition-colors ${
                    selected ? 'border-navy-800 bg-navy-800 text-blue-50' : 'border-blue-200 hover:border-navy-600 text-navy-700'
                  }`}
                >
                  <r.icon size={17} className={selected ? 'text-yellow-500' : ''} />
                  {r.label}
                  <span className={`text-[10px] font-normal ${selected ? 'text-blue-300' : 'text-navy-500'}`}>{acc.phone}</span>
                </motion.button>
              );
            })}
          </div>

          <p className="text-sm text-navy-500 text-center mt-6">
            Belum punya akun?{' '}
            <Link to="/register" className="font-bold text-navy-800 hover:text-yellow-600 transition-colors">Daftar gratis</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
