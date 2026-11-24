// arah gulir global: elemen yang muncul kembali saat gulir ke atas masuk dari atas, saat ke bawah dari bawah
// nilai awal -1 → saat halaman pertama dibuka elemen masuk dari bawah
let dir = -1;
let lastY = typeof window !== 'undefined' ? window.scrollY : 0;
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (Math.abs(y - lastY) > 2) dir = y > lastY ? 1 : -1;
    lastY = y;
  }, { passive: true });
}

const hidden = () => ({ opacity: 0, y: dir > 0 ? -32 : 32, scale: 0.98, transition: { duration: 0.3 } });

export const scrollReveal = (amount = 0.2, delay = 0) => ({
  variants: {
    // saat keluar layar, posisi disiapkan di sisi tempat elemen akan masuk lagi
    hidden,
    shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] } },
  },
  initial: 'hidden',
  whileInView: 'shown',
  viewport: { once: false, amount },
});
