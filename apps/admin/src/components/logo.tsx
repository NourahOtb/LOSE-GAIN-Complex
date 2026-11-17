/** LOSE | GAIN lockup with widely spaced COMPLEX, set in type. */
export function Logo({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <div className={`inline-flex flex-col items-center ${className}`} aria-label="LOSE | GAIN Complex" role="img">
      <div className="flex items-center" style={{ fontSize: size, gap: size * 0.42 }}>
        <span className="font-light tracking-wide">LOSE</span>
        <span className="block w-px bg-current" style={{ height: size * 1.15 }} />
        <span className="font-bold tracking-wide">GAIN</span>
      </div>
      <span className="font-normal" style={{ fontSize: size * 0.42, letterSpacing: size * 0.44, marginLeft: size * 0.44, marginTop: 2 }}>
        COMPLEX
      </span>
    </div>
  );
}
