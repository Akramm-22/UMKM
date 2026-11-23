// label section bernomor ala editorial (ref: Every Sunday); `n` boleh berupa ikon
export default function SectionTag({ n, label, light = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-heading font-extrabold text-xs ${
        light ? 'border-yellow-500 text-yellow-500' : 'border-navy-800 text-navy-800'
      }`}>
        {n}
      </span>
      <span className={`text-xs font-bold uppercase tracking-widest ${light ? 'text-yellow-500' : 'text-navy-500'}`}>
        {label}
      </span>
    </div>
  );
}
